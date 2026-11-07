from datetime import date, datetime
from sqlalchemy import Table, Column, Date, DateTime, ForeignKey, Integer, String, Text, func,UniqueConstraint,CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column,relationship
from app.db.base import Base

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.student import Student
    from app.models.academic_session import AcademicSession
    from app.models.subject import Subject

class StudentEnrollment(Base):
    __tablename__ = "student_enrollments"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"))
    academic_session_id: Mapped[int] = mapped_column(ForeignKey("academic_sessions.id"))
    class_number: Mapped[int] = mapped_column(Integer, nullable=False)
    stream: Mapped[str | None] = mapped_column(String(30), nullable=True)
    admission_date: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(30), nullable=False,default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("student_id", "academic_session_id", name="uq_student_academic_session"),
                      CheckConstraint("class_number IN (9, 10, 11, 12)",name="ck_enrollment_valid_class",),
                      CheckConstraint("""
                        (
                            class_number IN (9, 10)
                            AND stream IS NULL
                        )
                        OR
                        (
                            class_number IN (11, 12)
                            AND stream IN ('Science', 'Commerce')
                        )""",
                        name="ck_enrollment_valid_stream",),)

    student: Mapped["Student"] = relationship(back_populates="enrollments")
    academic_session:Mapped["AcademicSession"]=relationship(back_populates="student_enrollments")
    subjects: Mapped[list["Subject"]] = relationship(secondary="enrollment_subjects",back_populates="enrollments")