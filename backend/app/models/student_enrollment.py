from datetime import date, datetime
from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column,relationship
from app.db.base import Base

from student import Student
from academic_session import AcademicSession

class StudentEnrollment(Base):
    __tablename__ = "student_enrollment"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"))
    academic_session_id: Mapped[int] = mapped_column(ForeignKey("academic_sessions.id"))
    class_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    stream: Mapped[str | None] = mapped_column(String(30), nullable=True)
    admission_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    student: Mapped[Student] = relationship(back_populates="enrollments")
    academic_session:Mapped[AcademicSession]=relationship(back_populates="studentenrolls")