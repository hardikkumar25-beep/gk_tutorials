from datetime import datetime, timedelta, timezone
from hashlib import sha256
import hmac
import secrets
import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import create_access_token, verify_password
from app.db.session import get_db
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse
from app.schemas.subject import SubjectResponse,SubjectCreate,SubjectUpdate
from app.services.subject_service import create_subject,get_subjects,get_subject_by_id,update_subject,deactivate_subject
from app.schemas.student import AdmissionCreate,StudentProfileResponse,StudentListResponse,StudentUpdate
from app.services.student_service import create_admission,get_student_by_id,search_students,update_student,deactivate_student,cancel_student_enrollment
from app.services.academic_session_service import get_current_academic_session
from app.schemas.academic_session import AcademicSessionResponse
from app.schemas.teacher import TeacherCreate,TeacherUpdate,TeacherResponse
from app.schemas.batch import BatchCreate,BatchUpdate,BatchResponse
from app.services.teacher_service import create_teacher,get_teachers,update_teacher,deactivate_teacher
from app.services.batch_service import create_batch,get_batches,get_batch_by_id,update_batch,deactivate_batch
from app.schemas.online_class import OnlineClassUpdate,OnlineClassResponse
from app.services.online_class_service import get_online_class,get_public_online_class,update_online_class
from app.schemas.dashboard import DashboardSummary
from app.services.dashboard_service import get_dashboard_summary

api_router = APIRouter()

# Authentication
REFRESH_COOKIE = "gkt_refresh_token"

def _require_trusted_origin(request: Request) -> None:
    origin = request.headers.get("origin")
    if not origin or origin not in settings.cors_origins:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Untrusted or missing request origin",
        )


def _hash_refresh_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


def _csrf_for_refresh_token(raw_token: str) -> str:
    return hmac.new(
        settings.secret_key.encode("utf-8"),
        f"gkt-csrf:{raw_token}".encode("utf-8"),
        "sha256",
    ).hexdigest()


def _set_auth_cookie(response: Response, refresh_token: str) -> None:
    response.headers["Cache-Control"] = "no-store"
    response.set_cookie(
        REFRESH_COOKIE,
        refresh_token,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        path="/api/v1/auth",
    )


def _clear_auth_cookie(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"
    response.delete_cookie(
        REFRESH_COOKIE,
        path="/api/v1/auth",
        secure=settings.auth_cookie_secure,
        httponly=True,
        samesite=settings.auth_cookie_samesite,
    )


def _require_csrf(request: Request, raw_token: str) -> None:
    csrf_header = request.headers.get("X-CSRF-Token")
    origin = request.headers.get("origin")
    expected = _csrf_for_refresh_token(raw_token)

    if (
        not origin
        or origin not in settings.cors_origins
        or not csrf_header
        or not hmac.compare_digest(expected, csrf_header)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF validation failed",
        )


def _new_refresh_session(db: Session, user_id: int, family_id: str | None = None) -> str:
    raw_token = secrets.token_urlsafe(48)
    db.add(
        RefreshToken(
            user_id=user_id,
            token_hash=_hash_refresh_token(raw_token),
            family_id=family_id or str(uuid.uuid4()),
            expires_at=datetime.now(timezone.utc)
            + timedelta(days=settings.refresh_token_expire_days),
        )
    )
    return raw_token


@api_router.post("/auth/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    _require_trusted_origin(request)
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account is inactive")

    refresh_token = _new_refresh_session(db, user.id)
    db.commit()
    _set_auth_cookie(response, refresh_token)
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        csrf_token=_csrf_for_refresh_token(refresh_token),
    )


@api_router.get("/auth/csrf")
def get_csrf_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    response.headers["Cache-Control"] = "no-store"
    origin = request.headers.get("origin")
    if origin and origin not in settings.cors_origins:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Untrusted request origin")
    raw_token = request.cookies.get(REFRESH_COOKIE)
    if not raw_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh session is missing")

    stored = db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == _hash_refresh_token(raw_token))
    )
    if stored is None or stored.revoked_at is not None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh session is invalid")

    expires_at = stored.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh session has expired")

    user = db.get(User, stored.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account is unavailable")

    return {"csrf_token": _csrf_for_refresh_token(raw_token)}


@api_router.post("/auth/refresh", response_model=TokenResponse)
def refresh_session(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    raw_token = request.cookies.get(REFRESH_COOKIE)
    if not raw_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh session is missing")
    _require_csrf(request, raw_token)

    token_hash = _hash_refresh_token(raw_token)
    stored = db.scalar(
        select(RefreshToken)
        .where(RefreshToken.token_hash == token_hash)
        .with_for_update()
    )
    if stored is None:
        _clear_auth_cookie(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh session is invalid")

    now = datetime.now(timezone.utc)
    expires_at = stored.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if stored.revoked_at is not None:
        db.execute(
            update(RefreshToken)
            .where(RefreshToken.family_id == stored.family_id)
            .values(revoked_at=now)
        )
        db.commit()
        _clear_auth_cookie(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token reuse detected; sign in again")

    if expires_at <= now:
        stored.revoked_at = now
        db.commit()
        _clear_auth_cookie(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh session has expired")

    user = db.get(User, stored.user_id)
    if user is None or not user.is_active:
        db.execute(
            update(RefreshToken)
            .where(RefreshToken.family_id == stored.family_id)
            .values(revoked_at=now)
        )
        db.commit()
        _clear_auth_cookie(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account is unavailable")

    new_raw_token = secrets.token_urlsafe(48)
    new_hash = _hash_refresh_token(new_raw_token)
    stored.revoked_at = now
    stored.replaced_by_token_hash = new_hash
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=new_hash,
            family_id=stored.family_id,
            expires_at=now + timedelta(days=settings.refresh_token_expire_days),
        )
    )
    db.commit()

    _set_auth_cookie(response, new_raw_token)
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        csrf_token=_csrf_for_refresh_token(new_raw_token),
    )


@api_router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    raw_token = request.cookies.get(REFRESH_COOKIE)
    if raw_token:
        _require_csrf(request, raw_token)
        stored = db.scalar(
            select(RefreshToken).where(RefreshToken.token_hash == _hash_refresh_token(raw_token))
        )
        if stored is not None:
            now = datetime.now(timezone.utc)
            db.execute(
                update(RefreshToken)
                .where(RefreshToken.family_id == stored.family_id)
                .values(revoked_at=now)
            )
            db.commit()
    _clear_auth_cookie(response)


@api_router.get("/auth/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user

#Subject
def handle_subject_error(db: Session, exc: ValueError):
    db.rollback()
    message = str(exc)
    lowered_message = message.lower()
    if "not found" in lowered_message:
        error_status = status.HTTP_404_NOT_FOUND
    elif "already exists" in lowered_message or "duplicate" in lowered_message:
        error_status = status.HTTP_409_CONFLICT
    else:
        error_status = status.HTTP_400_BAD_REQUEST
    raise HTTPException(status_code=error_status,detail=message,)

@api_router.post("/subjects",response_model=SubjectResponse,status_code=status.HTTP_201_CREATED,)
def create_subject_endpoint(payload:SubjectCreate,db:Session=Depends(get_db),current_user:User=Depends(get_current_user)):
    try:
        subject=create_subject(db,payload)
        db.commit()
        db.refresh(subject)
        return subject
    except ValueError as e:
        handle_subject_error(db,e)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,detail="A subject with these details already exists.",)

@api_router.get("/subjects",response_model=list[SubjectResponse])
def list_all_subjects(class_number: int | None = Query(default=None, ge=9, le=12),stream: Literal["Science", "Commerce"] | None = None,is_active: bool | None = True,db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),):
    try:
        return get_subjects(db,class_number,stream,is_active)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail=str(e))

@api_router.get("/subjects/{subject_id}",response_model=SubjectResponse,)
def get_subject_endpoint(subject_id: int,db: Session = Depends(get_db),current_user: User = Depends(get_current_user),):
    subject = get_subject_by_id(db, subject_id)

    if subject is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="Subject not found.",)
    return subject

@api_router.patch("/subjects/{subject_id}",response_model=SubjectResponse,)
def update_subject_endpoint(subject_id: int,payload: SubjectUpdate,db: Session = Depends(get_db),current_user: User = Depends(get_current_user),):
    try:
        subject = update_subject(db=db,subject_id=subject_id,subject_data=payload,)
        db.commit()
        db.refresh(subject)
        return subject
    except ValueError as exc:
        handle_subject_error(db, exc)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,detail="Could not update subject because of a database constraint.",)

@api_router.patch("/subjects/{subject_id}/deactivate",response_model=SubjectResponse,)
def deactivate_subject_endpoint(subject_id: int,db: Session = Depends(get_db),current_user: User = Depends(get_current_user),):
    try:
        subject = deactivate_subject(db=db,subject_id=subject_id,)
        db.commit()
        db.refresh(subject)
        return subject
    except ValueError as exc:
        handle_subject_error(db, exc)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,detail="Could not deactivate subject.",)

#student

@api_router.post("/students/admissions",response_model=StudentProfileResponse,status_code=status.HTTP_201_CREATED,)
def admit_student(admission: AdmissionCreate,db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    try:
        student = create_admission(db, admission)
        db.commit()
        profile = get_student_by_id(db, student.id)
        if profile is None:
            raise HTTPException(status_code=500,detail="Admission was saved, but the student profile could not be loaded.",)
        return profile

    except LookupError as exc:
        db.rollback()
        raise HTTPException(status_code=404,detail=str(exc),)
    except ValueError as exc:
        db.rollback()
        raise HTTPException( status_code=422,detail=str(exc),)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409,detail=("Admission conflicts with an existing database record. ""Check whether this student is already enrolled in this session."),)
    except Exception:
        db.rollback()
        raise


@api_router.get("/students",response_model=StudentListResponse,)
def list_students(
    search: str | None = Query(default=None, max_length=150),
    class_number: int | None = Query(default=None, ge=9, le=12),
    stream: str | None = Query(default=None),
    academic_session_id: int | None = Query(default=None, gt=0),
    enrollment_status: str | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if stream not in (None, "Science", "Commerce"):
        raise HTTPException(status_code=422,detail="Stream must be Science or Commerce.",)

    if enrollment_status not in (None, "active", "inactive", "cancelled"):
        raise HTTPException( status_code=422,detail="Invalid enrolment status.",)

    students, total = search_students(
        db=db,
        search=search,
        class_number=class_number,
        stream=stream,
        academic_session_id=academic_session_id,
        status=enrollment_status,
        skip=skip,
        limit=limit,
    )

    return {
        "total": total,
        "items": students,
    }


@api_router.get("/students/{student_id}",response_model=StudentProfileResponse,)
def student_profile(student_id: int,db: Session = Depends(get_db),current_user: User = Depends(get_current_user),):
    student = get_student_by_id(db, student_id)

    if student is None:
        raise HTTPException(status_code=404,detail="Student not found.",)

    return student


@api_router.patch("/students/{student_id}",response_model=StudentProfileResponse,)
def edit_student(student_id: int,updates: StudentUpdate,db: Session = Depends(get_db),current_user: User = Depends(get_current_user),):    
    try:
        update_student(db, student_id, updates)
        db.commit()

        profile = get_student_by_id(db, student_id)

        return profile

    except LookupError as exc:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(exc))

    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=422, detail=str(exc))

    except Exception:
        db.rollback()
        raise


@api_router.patch("/students/{student_id}/deactivate",response_model=StudentProfileResponse,)
def deactivate_student_endpoint(student_id: int,db: Session = Depends(get_db),current_user: User = Depends(get_current_user),):
    try:
        deactivate_student(db, student_id)
        db.commit()

        profile = get_student_by_id(db, student_id)

        return profile

    except LookupError as exc:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(exc))

    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc))

    except Exception:
        db.rollback()
        raise

@api_router.patch(
    "/students/{student_id}/enrollments/{enrollment_id}/cancel",
    response_model=StudentProfileResponse,
)
def cancel_student_enrollment_endpoint(student_id: int,enrollment_id: int,db: Session = Depends(get_db),current_user: User = Depends(get_current_user),):
    try:
        cancel_student_enrollment(db,student_id,enrollment_id,)

        db.commit()

        profile = get_student_by_id(db, student_id)

        return profile

    except LookupError as exc:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(exc))

    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc))

    except Exception:
        db.rollback()
        raise
# Academic Sessions

@api_router.get("/academic-sessions/current",response_model=AcademicSessionResponse,)
def get_current_session_endpoint(db: Session = Depends(get_db),current_user: User = Depends(get_current_user),):
    session = get_current_academic_session(db)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="No current academic session found.",)
    return session

# TEACHERS

@api_router.post("/teachers",response_model=TeacherResponse,status_code=status.HTTP_201_CREATED,)
def create_teacher_endpoint(payload: TeacherCreate,db: Session = Depends(get_db),current_user: User = Depends(get_current_user),):
    try:
        teacher = create_teacher(db, payload)
        db.commit()
        db.refresh(teacher)
        return teacher

    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc))

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Could not create teacher because of a database conflict.",
        )


@api_router.get("/teachers",response_model=list[TeacherResponse],)
def list_teachers_endpoint(is_active: bool | None = True,db: Session = Depends(get_db),current_user: User = Depends(get_current_user),):
    return get_teachers(db, is_active)


@api_router.patch("/teachers/{teacher_id}",response_model=TeacherResponse,)
def update_teacher_endpoint(teacher_id: int,payload: TeacherUpdate,db: Session = Depends(get_db),current_user: User = Depends(get_current_user),):
    try:
        teacher = update_teacher(db, teacher_id, payload)
        db.commit()
        db.refresh(teacher)
        return teacher

    except LookupError as exc:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(exc))

    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc))

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Could not update teacher.",
        )


@api_router.patch("/teachers/{teacher_id}/deactivate",response_model=TeacherResponse,)
def deactivate_teacher_endpoint(teacher_id: int,db: Session = Depends(get_db),current_user: User = Depends(get_current_user),):
    try:
        teacher = deactivate_teacher(db, teacher_id)
        db.commit()
        db.refresh(teacher)
        return teacher

    except LookupError as exc:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(exc))

    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc))

# BATCHES

@api_router.post("/batches",response_model=BatchResponse,status_code=status.HTTP_201_CREATED,)
def create_batch_endpoint(payload: BatchCreate,db: Session = Depends(get_db),current_user: User = Depends(get_current_user),):
    try:
        batch = create_batch(db, payload)
        db.commit()

        result = get_batch_by_id(db, batch.id)

        return result

    except LookupError as exc:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(exc))

    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=422, detail=str(exc))

    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409,detail="Batch conflicts with an existing database record.",)


@api_router.get("/batches",response_model=list[BatchResponse],)
def list_batches_endpoint(
    class_number: int | None = Query(default=None, ge=9, le=12),
    stream: Literal["Science", "Commerce"] | None = None,
    academic_session_id: int | None = Query(default=None, gt=0),
    teacher_id: int | None = Query(default=None, gt=0),
    is_active: bool | None = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if class_number in (9, 10) and stream is not None:
        raise HTTPException(
            status_code=422,
            detail="Classes 9 and 10 cannot have a stream.",
        )

    return get_batches(
        db=db,
        class_number=class_number,
        stream=stream,
        academic_session_id=academic_session_id,
        teacher_id=teacher_id,
        is_active=is_active,
    )


@api_router.get("/batches/{batch_id}",response_model=BatchResponse,)
def batch_details_endpoint(batch_id: int,db: Session = Depends(get_db),current_user: User = Depends(get_current_user),):
    batch = get_batch_by_id(db, batch_id)

    if batch is None:
        raise HTTPException(status_code=404,detail="Batch not found.",)

    return batch


@api_router.patch("/batches/{batch_id}",response_model=BatchResponse,)
def update_batch_endpoint(batch_id: int,payload: BatchUpdate,db: Session = Depends(get_db),current_user: User = Depends(get_current_user),):
    try:
        batch = update_batch(db, batch_id, payload)
        db.commit()

        return get_batch_by_id(db, batch.id)

    except LookupError as exc:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(exc))

    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=422, detail=str(exc))

    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409,detail="Could not update batch because of a database conflict.",)

@api_router.patch("/batches/{batch_id}/deactivate",response_model=BatchResponse,)
def deactivate_batch_endpoint(batch_id: int,db: Session = Depends(get_db),current_user: User = Depends(get_current_user),):
    try:
        batch = deactivate_batch(db, batch_id)
        db.commit()

        return get_batch_by_id(db, batch.id)

    except LookupError as exc:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(exc))

    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc))

# ADMIN: View current online class configuration
@api_router.get("/online-class",response_model=OnlineClassResponse | None,)
def get_online_class_endpoint(db: Session = Depends(get_db),current_user: User = Depends(get_current_user),):
    return get_online_class(db)


# ADMIN
@api_router.put("/online-class",response_model=OnlineClassResponse,)
def update_online_class_endpoint(payload: OnlineClassUpdate,db: Session = Depends(get_db),current_user: User = Depends(get_current_user),):
    online_class = update_online_class(db, payload)
    db.commit()
    db.refresh(online_class)

    return online_class


# PUBLIC
@api_router.get("/public/online-class",response_model=OnlineClassResponse | None,)
def get_public_online_class_endpoint(db: Session = Depends(get_db),):
    return get_public_online_class(db)

# ADMIN: Dashboard summary
@api_router.get("/dashboard/summary",response_model=DashboardSummary,)
def dashboard_summary_endpoint(db: Session = Depends(get_db),current_user: User = Depends(get_current_user),):
    return get_dashboard_summary(db)