from sqlalchemy import select
from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import User


def main():
    db = SessionLocal()
    try:
        email = settings.admin_email.lower()
        existing = db.scalar(select(User).where(User.email == email))
        if existing:
            print(f"Admin account already exists: {email}")
            return
        admin = User(
            full_name=settings.admin_name,
            email=email,
            hashed_password=hash_password(settings.admin_password),
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print(f"Created admin account: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
