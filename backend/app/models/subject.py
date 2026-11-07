from datetime import date, datetime
from typing import List
from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Boolean, func,UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column,relationship
from app.db.base import Base

from student_enrollment import StudentEnrollment,enrollment_subjects

class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(primary_key=True)
    subject_name: Mapped[str] = mapped_column(String(100))
    class_number: Mapped[int] = mapped_column(Integer, nullable=False)
    stream: Mapped[str | None] = mapped_column(String(30), nullable=True)
    is_active: Mapped[bool]=mapped_column(Boolean,default=True)

    __table_args__ = (UniqueConstraint("subject_name", "class_number","stream",name="uq_subject_class_stream"),)

    enrollments: Mapped[list["StudentEnrollment"]] = relationship(secondary=enrollment_subjects,back_populates="subjects")