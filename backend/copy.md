backend/app/models/student.py

class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_code: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(150), index=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    student_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    mother_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    father_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    school_name: Mapped[str | None] = mapped_column(String(180), nullable=True)
    school_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    referral_source: Mapped[str | None] = mapped_column(String(150), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    enrollments: Mapped[list["StudentEnrollment"]] = relationship(back_populates="student")

backend/app/models/teacher.py

class Teacher(Base):
    __tablename__ = "teachers"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100),nullable=False,unique=True,index=True,)
    batches: Mapped[list["Batch"]] = relationship(back_populates="teacher",)
    is_active: Mapped[bool] = mapped_column(Boolean,default=True,nullable=False,)

backend/app/models/batch.py

class Batch(Base):
    __tablename__ = "batches"

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(String(100),nullable=False,)

    class_number: Mapped[int] = mapped_column(Integer,nullable=False,)
    stream: Mapped[str | None] = mapped_column(String(20),nullable=True,)
    academic_session_id: Mapped[int] = mapped_column(ForeignKey("academic_sessions.id"),nullable=False,)
    teacher_id: Mapped[int | None] = mapped_column(ForeignKey("teachers.id"),nullable=True,)
    capacity: Mapped[int] = mapped_column(Integer,nullable=False,)
    is_active: Mapped[bool] = mapped_column(Boolean,default=True,nullable=False,)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),server_default=func.now(),nullable=False,)

    academic_session = relationship("AcademicSession")
    teacher = relationship("Teacher", back_populates="batches")

    batch_subjects = relationship("BatchSubject",back_populates="batch",cascade="all, delete-orphan",)
    __table_args__ = (
        CheckConstraint(
            "capacity > 0",
            name="ck_batch_capacity_positive",
        ),
        CheckConstraint(
            "class_number >= 9 AND class_number <= 12",
            name="ck_batch_valid_class",
        ),
        UniqueConstraint(
            "name",
            "academic_session_id",
            name="uq_batch_name_session",
        ),
    )

from sqlalchemy import (
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class BatchSubject(Base):
    __tablename__ = "batch_subjects"

    id: Mapped[int] = mapped_column(primary_key=True)
    batch_id: Mapped[int] = mapped_column(ForeignKey("batches.id", ondelete="CASCADE"), nullable=False,)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), nullable=False,)
    batch = relationship("Batch",back_populates="batch_subjects",)

    subject = relationship("Subject")

    schedules = relationship(
        "BatchSchedule",
        back_populates="batch_subject",
        cascade="all, delete-orphan",
        order_by="BatchSchedule.day_of_week",
    )

    __table_args__ = (
        UniqueConstraint(
            "batch_id",
            "subject_id",
            name="uq_batch_subject",
        ),
    )

from datetime import time

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Integer,
    Time,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class BatchSchedule(Base):
    __tablename__ = "batch_schedules"

    id: Mapped[int] = mapped_column(primary_key=True)

    batch_subject_id: Mapped[int] = mapped_column(ForeignKey("batch_subjects.id", ondelete="CASCADE"),nullable=False,)

    day_of_week: Mapped[int] = mapped_column(Integer,nullable=False,)
    start_time: Mapped[time] = mapped_column(Time,nullable=False,)
    end_time: Mapped[time] = mapped_column(Time,nullable=False,)
    
    batch_subject = relationship("BatchSubject",back_populates="schedules",)

    __table_args__ = (
        CheckConstraint(
            "day_of_week >= 0 AND day_of_week <= 6",
            name="ck_batch_schedule_valid_day",
        ),
        CheckConstraint(
            "end_time > start_time",
            name="ck_batch_schedule_valid_time",
        ),
        UniqueConstraint(
            "batch_subject_id",
            "day_of_week",
            "start_time",
            "end_time",
            name="uq_batch_schedule_exact_duplicate",
        ),
    )

backend/app/models/academic_session.py

class AcademicSession(Base):
    __tablename__ = "academic_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(20), unique=True, index=True)  # e.g. 2026-27
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    student_enrollments:Mapped[list["StudentEnrollment"]]=relationship(back_populates="academic_session")

    __table_args__ = (CheckConstraint("end_date > start_date", name="check_end_date_after_start_date"),
                      Index("uq_idx_only_one_current_session",
                            "is_current",
                            unique=True,
                            postgresql_where="is_current IS TRUE",))
    

backend/app/models/online_class.py

class OnlineClass(Base):
    __tablename__ = "online_classes"
    id: Mapped[int] = mapped_column(Integer,primary_key=True,default=1,)
    title: Mapped[str] = mapped_column(String(150),nullable=False,)
    url: Mapped[str] = mapped_column(String(500),nullable=False,)
    is_published: Mapped[bool] = mapped_column(Boolean,default=False,nullable=False,)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),server_default=func.now(),onupdate=func.now(),nullable=False,)