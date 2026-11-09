from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.api.deps import get_current_user
from app.core.security import create_access_token, verify_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse
from app.schemas.subject import SubjectResponse,SubjectCreate,SubjectUpdate
from app.services.subject_service import create_subject,get_subjects,get_subject_by_id,update_subject,deactivate_subject
from app.schemas.student import AdmissionCreate,StudentProfileResponse,StudentListResponse
from app.services.student_service import create_admission,get_student_by_id,search_students


api_router = APIRouter()

#Auth
@api_router.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account is inactive")
    return TokenResponse(access_token=create_access_token(str(user.id)))


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
def student_profile(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = get_student_by_id(db, student_id)

    if student is None:
        raise HTTPException(status_code=404,detail="Student not found.",)

    return student



