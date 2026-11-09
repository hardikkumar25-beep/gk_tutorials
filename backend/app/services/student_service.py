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

