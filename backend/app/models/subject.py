from datetime import date, datetime
from typing import List
from sqlalchemy import Column,Table,Date, DateTime, ForeignKey, Integer, String, Boolean, func,UniqueConstraint,CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column,relationship
from app.db.base import Base

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.student_enrollment import StudentEnrollment

enrollment_subjects = Table(
    "enrollment_subjects",
    Base.metadata,
    Column("enrollment_id", ForeignKey("student_enrollments.id", ondelete="CASCADE"), primary_key=True),
    Column("subject_id", ForeignKey("subjects.id", ondelete="CASCADE"), primary_key=True),)

class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(primary_key=True)
    subject_name: Mapped[str] = mapped_column(String(100))
    class_number: Mapped[int] = mapped_column(Integer, nullable=False)
    stream: Mapped[str | None] = mapped_column(String(30), nullable=True)
    is_active: Mapped[bool]=mapped_column(Boolean,default=True)

    __table_args__ = (CheckConstraint("class_number IN (9, 10, 11, 12)",name="ck_subject_valid_class",),
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
                            name="ck_subject_valid_stream",),
                            UniqueConstraint("subject_name", "class_number","stream",name="uq_subject_class_stream",postgresql_nulls_not_distinct=True,),)

    enrollments: Mapped[list["StudentEnrollment"]] = relationship(secondary=enrollment_subjects,back_populates="subjects")