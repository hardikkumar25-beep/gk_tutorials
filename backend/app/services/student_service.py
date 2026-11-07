from datetime import datetime
from uuid import uuid4
from sqlalchemy.orm import Session
from app.models.student import Student

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


