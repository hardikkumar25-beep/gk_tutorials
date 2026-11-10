from hashlib import sha256

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.api.deps import get_db
from app.core.security import hash_password
from app.db.base import Base
from app.main import app
from app.models.refresh_token import RefreshToken
from app.models.user import User


def test_refresh_rotation_reuse_detection_and_logout():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(
        bind=engine,
        tables=[User.__table__, RefreshToken.__table__],
    )
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    db = TestingSession()
    user = User(
        full_name="Auth Test User",
        email="auth-test@example.com",
        hashed_password=hash_password("test-password"),
        is_active=True,
    )
    db.add(user)
    db.commit()
    user_id = user.id
    db.close()

    def override_get_db():
        session = TestingSession()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as client:
            login = client.post(
                "/api/v1/auth/login",
                json={"email": "auth-test@example.com", "password": "test-password"},
            )
            assert login.status_code == 200
            assert login.json()["access_token"]
            assert "httponly" in login.headers.get("set-cookie", "").lower()

            old_refresh = client.cookies.get("gkt_refresh_token")
            csrf = login.json()["csrf_token"]
            assert old_refresh and csrf

            csrf_response = client.get("/api/v1/auth/csrf")
            assert csrf_response.status_code == 200
            assert csrf_response.json()["csrf_token"] == csrf

            invalid_csrf = client.post(
                "/api/v1/auth/refresh",
                headers={"X-CSRF-Token": "incorrect"},
            )
            assert invalid_csrf.status_code == 403

            check = TestingSession()
            stored = check.scalar(
                select(RefreshToken).where(
                    RefreshToken.user_id == user_id
                )
            )
            assert stored is not None
            assert stored.token_hash != old_refresh
            check.close()

            refreshed = client.post(
                "/api/v1/auth/refresh",
                headers={"X-CSRF-Token": csrf},
            )
            assert refreshed.status_code == 200
            assert refreshed.json()["access_token"] != login.json()["access_token"]
            new_refresh = client.cookies.get("gkt_refresh_token")
            new_csrf = refreshed.json()["csrf_token"]
            assert new_refresh and new_refresh != old_refresh
            assert new_csrf and new_csrf != csrf

            # Replaying a rotated token must revoke the complete token family.
            client.cookies.set("gkt_refresh_token", old_refresh, path="/api/v1/auth")
            replay = client.post(
                "/api/v1/auth/refresh",
                headers={"X-CSRF-Token": csrf},
            )
            assert replay.status_code == 401

            client.cookies.set("gkt_refresh_token", new_refresh, path="/api/v1/auth")
            still_revoked = client.post(
                "/api/v1/auth/refresh",
                headers={"X-CSRF-Token": new_csrf},
            )
            assert still_revoked.status_code == 401

            # A fresh login creates a new family; logout revokes that family.
            second_login = client.post(
                "/api/v1/auth/login",
                json={"email": "auth-test@example.com", "password": "test-password"},
            )
            assert second_login.status_code == 200
            logout_csrf = second_login.json()["csrf_token"]
            logout_refresh = client.cookies.get("gkt_refresh_token")
            check = TestingSession()
            logout_hash = sha256(logout_refresh.encode("utf-8")).hexdigest()
            logout_family = check.scalar(
                select(RefreshToken.family_id).where(
                    RefreshToken.token_hash == logout_hash
                )
            )
            check.close()

            logout = client.post(
                "/api/v1/auth/logout",
                headers={"X-CSRF-Token": logout_csrf},
            )
            assert logout.status_code == 204

            check = TestingSession()
            family_tokens = check.scalars(
                select(RefreshToken).where(
                    RefreshToken.family_id == logout_family
                )
            ).all()
            assert family_tokens
            assert all(token.revoked_at is not None for token in family_tokens)
            check.close()
    finally:
        app.dependency_overrides.pop(get_db, None)
        Base.metadata.drop_all(
            bind=engine,
            tables=[RefreshToken.__table__, User.__table__],
        )
        engine.dispose()
