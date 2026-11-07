from datetime import date, datetime
from typing import List
from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column,relationship
from app.db.base import Base

from student_enrollment import StudentEnrollment

class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(primary_key=True)
    enrollment_id: Mapped[int] = mapped_column(ForeignKey("student_enrollment.id"))
    subject_name: Mapped[str] = mapped_column(String(100))

    enrollment: Mapped[StudentEnrollment] = relationship(back_populates="subjects")