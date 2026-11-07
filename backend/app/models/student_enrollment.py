from datetime import date, datetime
from sqlalchemy import Table, Column, Date, DateTime, ForeignKey, Integer, String, Text, func,UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column,relationship
from app.db.base import Base

from student import Student
from academic_session import AcademicSession
from subject import Subject

enrollment_subjects = Table(
    "enrollment_subjects",
    Base.metadata,
    Column("enrollment_id", ForeignKey("student_enrollments.id", ondelete="CASCADE"), primary_key=True),
    Column("subject_id", ForeignKey("subjects.id", ondelete="CASCADE"), primary_key=True),)

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

    __table_args__ = (UniqueConstraint("student_id", "academic_session_id", name="uq_student_academic_session"),)

    student: Mapped[Student] = relationship(back_populates="enrollments")
    academic_session:Mapped[AcademicSession]=relationship(back_populates="student_enrollments")
    subjects: Mapped[list[Subject]] = relationship(secondary=enrollment_subjects,back_populates="enrollments")