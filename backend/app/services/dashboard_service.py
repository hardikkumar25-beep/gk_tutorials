from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.student import Student
from app.models.teacher import Teacher
from app.models.batch import Batch
from app.models.academic_session import AcademicSession
from app.models.student_enrollment import StudentEnrollment
from app.models.online_class import OnlineClass


def get_dashboard_summary(db: Session):

    current_session = db.scalar(select(AcademicSession).where(AcademicSession.is_current.is_(True)))

    active_students = db.scalar(select(func.count(Student.id)).where(Student.status == "active")) or 0
    active_teachers = db.scalar(select(func.count(Teacher.id)).where(Teacher.is_active.is_(True))) or 0
    active_batches = db.scalar(select(func.count(Batch.id)).where( Batch.is_active.is_(True))) or 0
    admissions_this_session = 0
    recent_admissions = []
    if current_session:
        admissions_this_session = db.scalar(
            select(func.count(StudentEnrollment.id)).where(
                StudentEnrollment.academic_session_id == current_session.id,
                StudentEnrollment.status == "active",
            )
        ) or 0

        admission_rows = db.execute(
            select(
                Student.full_name,
                Student.student_code,
                StudentEnrollment.class_number,
                StudentEnrollment.stream,
                StudentEnrollment.admission_date,
            )
            .join(
                StudentEnrollment,
                StudentEnrollment.student_id == Student.id,
            )
            .where(
                StudentEnrollment.academic_session_id == current_session.id
            )
            .order_by(
                StudentEnrollment.admission_date.desc(),
                StudentEnrollment.created_at.desc(),
            )
            .limit(5)
        ).all()

        recent_admissions = [
            {
                "student_name": row.full_name,
                "student_code": row.student_code,
                "class_number": row.class_number,
                "stream": row.stream,
                "admission_date": row.admission_date,
            }
            for row in admission_rows
        ]
    online_class = db.scalar(
        select(OnlineClass).where(OnlineClass.id == 1)
    )

    return {
        "active_students": active_students,
        "active_teachers": active_teachers,
        "active_batches": active_batches,
        "admissions_this_session": admissions_this_session,
        "recent_admissions": recent_admissions,
        "academic_session": (
            current_session.name if current_session else None
        ),
        "online_class_published": (
            online_class.is_published if online_class else False
        ),
        "online_class_title": (
            online_class.title
            if online_class and online_class.is_published
            else None
        ),
    }