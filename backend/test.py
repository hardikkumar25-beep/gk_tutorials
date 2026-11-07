
from app.db.session import SessionLocal
from app.models.student import Student
from app.services.student_service import generate_student_code

db = SessionLocal()

try:
    student = Student(
        full_name="Test Student",
        status="active"
    )

    code = generate_student_code(db, student)

    print("Generated code:", code)
    print("Student ID:", student.id)
    print("Student code in object:", student.student_code)

    db.rollback()

except Exception:
    db.rollback()
    raise

finally:
    db.close()
