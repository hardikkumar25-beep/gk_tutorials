
from datetime import date

import pytest
from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.academic_session import AcademicSession
from app.models.student import Student
from app.models.student_enrollment import StudentEnrollment
from app.models.subject import Subject
from app.schemas.student import AdmissionCreate, StudentCreate
from app.services.student_service import (
    create_admission,
    get_student_by_id,
)


@pytest.fixture
def db():
    session = SessionLocal()

    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def current_session(db):
    session = db.scalar(
        select(AcademicSession).where(
            AcademicSession.is_current.is_(True)
        )
    )

    if session is None:
        pytest.fail(
            "No current academic session exists. "
            "Create one before running admission tests."
        )

    return session


@pytest.fixture
def class_9_subjects(db):
    subjects = db.scalars(
        select(Subject).where(
            Subject.class_number == 9,
            Subject.stream.is_(None),
            Subject.is_active.is_(True),
        )
    ).all()

    if not subjects:
        pytest.fail(
            "No active Class 9 subjects found. "
            "Run the subject seed script first."
        )

    return subjects


def make_admission(session_id, subject_ids):
    return AdmissionCreate(
        student=StudentCreate(
            full_name="Test Student",
            date_of_birth=date(2010, 5, 15),
            gender="Male",
            email=None,
            student_phone="9999999999",
            mother_phone="8888888888",
            father_phone=None,
            address="Test Address",
            school_name="Test School",
            school_address="Test School Address",
            referral_source="Friend",
        ),
        academic_session_id=session_id,
        class_number=9,
        stream=None,
        subject_ids=subject_ids,
        admission_date=date.today(),
    )


def test_successful_admission(db, current_session, class_9_subjects):
    selected_subjects = class_9_subjects[:2]
    subject_ids = [subject.id for subject in selected_subjects]

    admission = make_admission(
        current_session.id,
        subject_ids,
    )

    student = create_admission(db, admission)

    assert student.id is not None
    assert student.student_code.startswith("GK-")
    assert student.full_name == "Test Student"

    enrollment = db.scalar(
        select(StudentEnrollment).where(
            StudentEnrollment.student_id == student.id
        )
    )

    assert enrollment is not None
    assert enrollment.academic_session_id == current_session.id
    assert enrollment.class_number == 9
    assert enrollment.stream is None
    assert enrollment.status == "active"

    assert {s.id for s in enrollment.subjects} == set(subject_ids)

    profile = get_student_by_id(db, student.id)

    assert profile is not None
    assert profile.student_code == student.student_code
    assert len(profile.enrollments) == 1

    db.rollback()


def test_admission_rejects_nonexistent_subject(
    db,
    current_session,
):
    admission = make_admission(
        current_session.id,
        [999999],
    )

    with pytest.raises(ValueError, match="subjects"):
        create_admission(db, admission)

    # No student should have been inserted.
    assert db.scalar(
        select(Student).where(
            Student.full_name == "Test Student"
        )
    ) is None


def test_admission_rejects_subject_from_wrong_class(
    db,
    current_session,
):
    wrong_subject = db.scalar(
        select(Subject).where(
            Subject.class_number == 10,
            Subject.stream.is_(None),
            Subject.is_active.is_(True),
        )
    )

    if wrong_subject is None:
        pytest.skip("No active Class 10 subject available for this test.")

    admission = make_admission(
        current_session.id,
        [wrong_subject.id],
    )

    with pytest.raises(ValueError, match="not available"):
        create_admission(db, admission)

    assert db.scalar(
        select(Student).where(
            Student.full_name == "Test Student"
        )
    ) is None


def test_admission_rejects_non_current_session(
    db,
    class_9_subjects,
):
    non_current_session = db.scalar(
        select(AcademicSession).where(
            AcademicSession.is_current.is_(False)
        )
    )

    if non_current_session is None:
        pytest.skip("No non-current academic session available.")

    admission = make_admission(
        non_current_session.id,
        [class_9_subjects[0].id],
    )

    with pytest.raises(ValueError, match="current academic session"):
        create_admission(db, admission)

    assert db.scalar(
        select(Student).where(
            Student.full_name == "Test Student"
        )
    ) is None


def test_student_profile_returns_none_for_missing_student(db):
    student = get_student_by_id(db, 999999)

    assert student is None
