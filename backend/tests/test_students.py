
from datetime import date
from uuid import uuid4

import pytest
from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.student import Student
from app.models.student_enrollment import StudentEnrollment
from app.models.academic_session import AcademicSession
from app.schemas.student import StudentUpdate
from app.services.student_service import (
    update_student,
    deactivate_student,
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
def test_student(db):
    student = Student(
        student_code=f"TEST-{uuid4().hex[:12]}",
        full_name="Test Student",
        student_phone="9999999999",
        status="active",
    )

    db.add(student)
    db.flush()

    return student


def test_update_student_phone(db, test_student):
    updates = StudentUpdate(
        student_phone="8888888888",
    )

    updated = update_student(db, test_student.id, updates)

    assert updated.student_phone == "8888888888"
    assert updated.full_name == "Test Student"


def test_update_student_name(db, test_student):
    updates = StudentUpdate(
        full_name="Updated Student",
    )

    updated = update_student(db, test_student.id, updates)

    assert updated.full_name == "Updated Student"


def test_update_rejects_empty_contact_details(db, test_student):
    updates = StudentUpdate(
        student_phone=None,
    )

    with pytest.raises(ValueError, match="contact number"):
        update_student(db, test_student.id, updates)


def test_update_rejects_nonexistent_student(db):
    updates = StudentUpdate(full_name="Nobody")

    with pytest.raises(LookupError, match="Student not found"):
        update_student(db, 999999, updates)


def test_deactivate_student(db, test_student):
    academic_session = db.scalar(
        select(AcademicSession).where(
            AcademicSession.is_current.is_(True)
        )
    )
    if academic_session is None:
        pytest.skip("No current academic session available.")

    enrollment = StudentEnrollment(
        student_id=test_student.id,
        academic_session_id=academic_session.id,
        class_number=9,
        stream=None,
        admission_date=date.today(),
        status="active",
    )

    db.add(enrollment)
    db.flush()

    deactivated = deactivate_student(db, test_student.id)

    assert deactivated.status == "inactive"
    assert enrollment.status == "cancelled"

    # The historical enrolment must still exist.
    assert enrollment.id is not None


def test_deactivate_nonexistent_student(db):
    with pytest.raises(LookupError, match="Student not found"):
        deactivate_student(db, 999999)


def test_deactivate_already_inactive_student(db, test_student):
    test_student.status = "inactive"
    db.flush()

    with pytest.raises(ValueError, match="already inactive"):
        deactivate_student(db, test_student.id)
