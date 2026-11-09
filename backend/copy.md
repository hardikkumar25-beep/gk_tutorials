backend/app/schemas/student.py


from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


ClassNumber = Literal[9, 10, 11, 12]
Stream = Literal["Science", "Commerce"]


class StudentCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    date_of_birth: date | None = None
    gender: str | None = Field(default=None, max_length=30)
    email: EmailStr | None = None

    student_phone: str | None = Field(default=None, max_length=20)
    mother_phone: str | None = Field(default=None, max_length=20)
    father_phone: str | None = Field(default=None, max_length=20)

    address: str | None = None
    school_name: str | None = Field(default=None, max_length=180)
    school_address: str | None = None
    referral_source: str | None = Field(default=None, max_length=150)

    model_config = ConfigDict(str_strip_whitespace=True,extra="forbid",)

    @model_validator(mode="after")
    def validate_student(self):
        if self.date_of_birth and self.date_of_birth > date.today():
            raise ValueError("Date of birth cannot be in the future.")

        if not any([self.student_phone,self.mother_phone,self.father_phone,]):
            raise ValueError( "At least one student or parent contact number is required.")
        return self


class AdmissionCreate(BaseModel):
    student: StudentCreate
    academic_session_id: int = Field(gt=0)
    class_number: ClassNumber
    stream: Stream | None = None
    subject_ids: list[int] = Field(min_length=1)

    admission_date: date = Field(default_factory=date.today)

    model_config = ConfigDict(extra="forbid")

    @model_validator(mode="after")
    def validate_admission(self):
        if self.class_number in (9, 10) and self.stream is not None:
            raise ValueError("Classes 9 and 10 must not have a stream.")

        if self.class_number in (11, 12) and self.stream is None:
            raise ValueError(
                "Classes 11 and 12 require Science or Commerce stream."
            )

        if len(self.subject_ids) != len(set(self.subject_ids)):
            raise ValueError("Duplicate subject IDs are not allowed.")

        if self.admission_date > date.today():
            raise ValueError("Admission date cannot be in the future.")

        return self


class StudentResponse(BaseModel):
    id: int
    student_code: str
    full_name: str
    date_of_birth: date | None
    gender: str | None
    email: EmailStr | None
    student_phone: str | None
    mother_phone: str | None
    father_phone: str | None
    address: str | None
    school_name: str | None
    school_address: str | None
    referral_source: str | None
    status: str

    model_config = ConfigDict(from_attributes=True)

class SubjectResponse(BaseModel):
    id: int
    subject_name: str
    class_number: int
    stream: str | None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

class EnrollmentResponse(BaseModel):
    id: int
    academic_session_id: int
    class_number: int
    stream: str | None
    admission_date: date
    status: str
    subjects: list["SubjectResponse"]

    model_config = ConfigDict(from_attributes=True)

class StudentProfileResponse(StudentResponse):
    enrollments: list[EnrollmentResponse]


class StudentListResponse(BaseModel):
    total: int
    items: list[StudentProfileResponse]


class StudentUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    date_of_birth: date | None = None
    gender: str | None = Field(default=None, max_length=30)
    email: EmailStr | None = None

    student_phone: str | None = Field(default=None, max_length=20)
    mother_phone: str | None = Field(default=None, max_length=20)
    father_phone: str | None = Field(default=None, max_length=20)

    address: str | None = None
    school_name: str | None = Field(default=None, max_length=180)
    school_address: str | None = None
    referral_source: str | None = Field(default=None, max_length=150)

    model_config = ConfigDict(str_strip_whitespace=True,extra="forbid",)

    @model_validator(mode="after")
    def validate_update(self):
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided.")

        if self.date_of_birth and self.date_of_birth > date.today():
            raise ValueError("Date of birth cannot be in the future.")
        return self



backend/app/schemas/subject.py

from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

ClassNumber = Literal[9, 10, 11, 12]
Stream = Literal["Science", "Commerce"]

class SubjectCreate(BaseModel):
    subject_name: str = Field(min_length=2, max_length=100)
    class_number: ClassNumber
    stream: Stream | None = None

    model_config = ConfigDict(str_strip_whitespace=True,extra="forbid",)

    @model_validator(mode="after")
    def validate_class_and_stream(self):
        if self.class_number in (9, 10) and self.stream is not None:
            raise ValueError("Classes 9 and 10 cannot have a stream.")

        if self.class_number in (11, 12) and self.stream is None:
            raise ValueError("Classes 11 and 12 require a stream.")
        return self

class SubjectUpdate(BaseModel):
    subject_name: str | None = Field(default=None,min_length=2,max_length=100,)
    class_number: ClassNumber | None = None
    stream: Stream | None = None

    model_config = ConfigDict(str_strip_whitespace=True,extra="forbid",)

    @model_validator(mode="after")
    def validate_update(self):
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided.")
        return self

class SubjectResponse(BaseModel):
    id: int
    subject_name: str
    class_number: int
    stream: str | None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


backend/app/services/student_service.py

from datetime import datetime
from uuid import uuid4

from sqlalchemy import func, or_, select,and_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.models.student import Student
from app.models.student_enrollment import StudentEnrollment
from app.models.subject import Subject
from app.models.academic_session import AcademicSession

from app.schemas.student import AdmissionCreate
def generate_student_code(db: Session, student: Student) -> str:
    """Generate a permanent student code, e.g. GK-2026-0001."""

    if student.id is not None:
        if not student.student_code:
            raise ValueError("Existing student has no student code.")
        return student.student_code
    student.student_code = f"T-{uuid4().hex[:16]}"

    db.add(student)
    db.flush()
    current_year = datetime.now().year
    student.student_code = f"GK-{current_year}-{student.id:04d}"

    return student.student_code

def validate_admission(db: Session,admission: AdmissionCreate,) -> list[Subject]:
    academic_session = db.get(AcademicSession,admission.academic_session_id,)
    if academic_session is None:
        raise LookupError("Academic session not found.")

    if not academic_session.is_current:
        raise ValueError("Admissions can only be created in the current academic session.")

    subjects = list(db.scalars(select(Subject).where(Subject.id.in_(admission.subject_ids),Subject.is_active.is_(True),)).all())

    if len(subjects) != len(admission.subject_ids):raise ValueError("One or more selected subjects do not exist or are inactive.")

    for subject in subjects:
        if subject.class_number != admission.class_number:
            raise ValueError(
                f"{subject.subject_name} is not available for "
                f"Class {admission.class_number}.")
        if subject.stream != admission.stream:
            raise ValueError(f"{subject.subject_name} does not match the selected stream.")
    return subjects

def create_admission(db: Session,admission: AdmissionCreate,) -> Student:
    """
    Create student + enrolment + subject associations.

    Does not commit. The API endpoint owns commit/rollback.
    """

    subjects = validate_admission(db, admission)

    student = Student(
        full_name=admission.student.full_name,
        date_of_birth=admission.student.date_of_birth,
        gender=admission.student.gender,
        email=str(admission.student.email) if admission.student.email else None,
        student_phone=admission.student.student_phone,
        mother_phone=admission.student.mother_phone,
        father_phone=admission.student.father_phone,
        address=admission.student.address,
        school_name=admission.student.school_name,
        school_address=admission.student.school_address,
        referral_source=admission.student.referral_source,
        status="active",
    )

    generate_student_code(db, student)

    enrollment = StudentEnrollment(
        student_id=student.id,
        academic_session_id=admission.academic_session_id,
        class_number=admission.class_number,
        stream=admission.stream,
        admission_date=admission.admission_date,
        status="active",
        subjects=subjects,
    )

    db.add(enrollment)
    db.flush()

    return student


def get_student_by_id(db: Session, student_id: int) -> Student | None:
    statement = (
        select(Student)
        .options(
            selectinload(Student.enrollments)
            .selectinload(StudentEnrollment.subjects),
        )
        .where(Student.id == student_id)
    )

    return db.scalars(statement).unique().one_or_none()


def search_students(
    db: Session,
    search: str | None = None,
    class_number: int | None = None,
    stream: str | None = None,
    academic_session_id: int | None = None,
    status: str | None = None,
    skip: int = 0,
    limit: int = 20,
) -> tuple[list[Student], int]:

    statement = select(Student).options(
        selectinload(Student.enrollments)
        .selectinload(StudentEnrollment.subjects),
    )

    if search:
        term = f"%{search.strip()}%"
        statement = statement.where(
            or_(
                Student.full_name.ilike(term),
                Student.student_code.ilike(term),
                Student.student_phone.ilike(term),
                Student.mother_phone.ilike(term),
                Student.father_phone.ilike(term),
            )
        )

    enrollment_filters = []

    if class_number is not None:
        enrollment_filters.append(
            StudentEnrollment.class_number == class_number
        )

    if stream is not None:
        enrollment_filters.append(
            StudentEnrollment.stream == stream
        )

    if academic_session_id is not None:
        enrollment_filters.append(
            StudentEnrollment.academic_session_id == academic_session_id
        )

    if status is not None:
        enrollment_filters.append(
            StudentEnrollment.status == status
        )

    if enrollment_filters:
        statement = statement.where(
            Student.enrollments.any(and_(*enrollment_filters))
        )

    count_statement = (
        select(func.count())
        .select_from(statement.order_by(None).subquery())
    )

    total = db.scalar(count_statement) or 0

    students = db.scalars(
        statement
        .order_by(Student.full_name.asc())
        .offset(skip)
        .limit(limit)
    ).unique().all()

    return students, total


def update_student(db: Session,student_id: int,updates,) -> Student:
    """Update personal details without modifying academic history."""
    student = db.get(Student, student_id)
    if student is None:
        raise LookupError("Student not found.")
    data = updates.model_dump(exclude_unset=True)
    if "full_name" in data:
        if data["full_name"] is None or not data["full_name"].strip():
            raise ValueError("Student name cannot be empty.")
    contact_fields = ["student_phone","mother_phone","father_phone",]
    final_contacts = {
        field: data.get(field, getattr(student, field))
        for field in contact_fields}
    if not any(final_contacts.values()):
        raise ValueError("At least one student or parent contact number is required.")

    for field, value in data.items():
        if field == "email" and value is not None:
            value = str(value)
        setattr(student, field, value)
    db.flush()
    return student


def deactivate_student(db: Session,student_id: int,) -> Student:
    """
    Deactivate a student and cancel their active enrolments.
    Historical records and subject associations are preserved.
    """

    student = get_student_by_id(db, student_id)

    if student is None:
        raise LookupError("Student not found.")

    if student.status == "inactive":
        raise ValueError("Student is already inactive.")

    student.status = "inactive"

    for enrollment in student.enrollments:
        if enrollment.status == "active":
            enrollment.status = "cancelled"

    db.flush()

    return student

def cancel_student_enrollment(db: Session,student_id: int,enrollment_id: int,) -> Student:
    """
    Cancel one academic enrolment without deleting historical records
    or deactivating the student's overall profile.
    """

    student = get_student_by_id(db, student_id)
    if student is None:
        raise LookupError("Student not found.")
    enrollment = db.scalar(
        select(StudentEnrollment).where(
            StudentEnrollment.id == enrollment_id,
            StudentEnrollment.student_id == student_id,
        )
    )
    if enrollment is None:
        raise LookupError("Enrolment not found for this student.")

    if enrollment.status != "active":
        raise ValueError("This enrolment is not active.")

    enrollment.status = "cancelled"

    db.flush()

    return student


backend/app/services/subject_service.py


from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.subject import Subject, enrollment_subjects
from app.schemas.subject import SubjectCreate, SubjectUpdate


def validate_class_stream(class_number: int, stream: str | None) -> None:
    """Validate whether a stream is applicable to the selected class."""
    if class_number not in (9, 10, 11, 12):
        raise ValueError("Class must be 9, 10, 11, or 12.")
    if class_number in (9, 10) and stream is not None:
        raise ValueError("Classes 9 and 10 cannot have a stream.")
    if class_number in (11, 12) and stream not in ("Science", "Commerce"):
        raise ValueError("Classes 11 and 12 require either Science or Commerce.")

def create_subject(db: Session, subject_data: SubjectCreate) -> Subject:
    """Create a new subject."""
    validate_class_stream(subject_data.class_number,subject_data.stream,)
    existing_subject = db.scalar(select(Subject).where(Subject.subject_name == subject_data.subject_name,Subject.class_number == subject_data.class_number,Subject.stream.is_not_distinct_from(subject_data.stream),))

    if existing_subject:
        raise ValueError(
            f"{subject_data.subject_name} already exists "
            f"for Class {subject_data.class_number}.")

    new_subject = Subject(
        subject_name=subject_data.subject_name,
        class_number=subject_data.class_number,
        stream=subject_data.stream,
        is_active=True,
    )
    db.add(new_subject)
    try:
        db.flush()
    except IntegrityError as exc:
        raise ValueError(
            "Could not create subject. A duplicate or constraint violation occurred."
        ) from exc
    return new_subject


def get_subject_by_id(db: Session, subject_id: int) -> Subject | None:
    """Retrieve a subject using its ID."""
    return db.get(Subject, subject_id)


def get_subjects(db: Session,class_number: int | None = None,stream: str | None = None,is_active: bool | None = True) -> list[Subject]:
    """Retrieve subjects with optional filters."""

    if class_number is not None:
        if class_number not in (9, 10, 11, 12):
            raise ValueError("Invalid class number.")

        if class_number in (9, 10) and stream is not None:
            raise ValueError("Classes 9 and 10 cannot have a stream.")

        if class_number in (11, 12) and stream not in (
            None,
            "Science",
            "Commerce",
        ):
            raise ValueError("Invalid stream.")

    elif stream is not None:
        if stream not in ("Science", "Commerce"):
            raise ValueError("Invalid stream.")

    query = select(Subject)

    if class_number is not None:
        query = query.where(Subject.class_number == class_number)

    if stream is not None:
        query = query.where(Subject.stream == stream)

    if is_active is not None:
        query = query.where(Subject.is_active == is_active)

    query = query.order_by(
        Subject.class_number,
        Subject.stream,
        Subject.subject_name,
    )

    return list(db.scalars(query).all())


def update_subject(db: Session,subject_id: int,subject_data: SubjectUpdate,) -> Subject:
    """Update an existing subject."""
    subject = db.get(Subject, subject_id)

    if subject is None:
        raise ValueError("Subject not found.")

    updates = subject_data.model_dump(exclude_unset=True)

    if "subject_name" in updates and updates["subject_name"] is None:
        raise ValueError("Subject name cannot be null.")

    if "class_number" in updates and updates["class_number"] is None:
        raise ValueError("Class number cannot be null.")

    new_name = updates.get("subject_name", subject.subject_name)
    new_class = updates.get("class_number", subject.class_number)
    new_stream = updates.get("stream", subject.stream)

    validate_class_stream(new_class, new_stream)
    duplicate_subject = db.scalar(
        select(Subject).where(
            Subject.subject_name == new_name,
            Subject.class_number == new_class,
            Subject.stream.is_not_distinct_from(new_stream),
            Subject.id != subject_id,
        ))

    if duplicate_subject:
        raise ValueError("Another subject with the same name, class, and stream already exists.")

    applicability_changed = (
        new_class != subject.class_number
        or new_stream != subject.stream
    )

    if applicability_changed:
        existing_enrollment = db.scalar(
            select(enrollment_subjects.c.enrollment_id)
            .where(enrollment_subjects.c.subject_id == subject_id)
            .limit(1)
        )

        if existing_enrollment is not None:
            raise ValueError(
                "Cannot change the class or stream of a subject "
                "already assigned to student enrollments."
            )

    subject.subject_name = new_name
    subject.class_number = new_class
    subject.stream = new_stream

    try:
        db.flush()
    except IntegrityError as exc:
        raise ValueError(
            "Could not update subject because of a database constraint."
        ) from exc

    return subject


def deactivate_subject(db: Session, subject_id: int) -> Subject:
    """Deactivate a subject without deleting its history."""

    subject = db.get(Subject, subject_id)

    if subject is None:
        raise ValueError("Subject not found.")

    if not subject.is_active:
        return subject

    subject.is_active = False
    db.flush()

    return subject


Your main API router file, where student and subject endpoints are registered.

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
from app.schemas.student import AdmissionCreate,StudentProfileResponse,StudentListResponse,StudentUpdate
from app.services.student_service import create_admission,get_student_by_id,search_students,update_student,deactivate_student,cancel_student_enrollment
from app.services.academic_session_service import get_current_academic_session
from app.schemas.academic_session import AcademicSessionResponse



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

backend/app/api/deps.py or whichever file contains your authentication dependencies.
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired login. Please sign in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload.get("sub", ""))
    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise unauthorized

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise unauthorized
    return user