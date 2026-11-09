from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.teacher import Teacher
from app.models.batch import Batch
from app.schemas.teacher import TeacherCreate, TeacherUpdate


def create_teacher(db: Session, data: TeacherCreate) -> Teacher:
    name = data.name.strip()

    existing = db.scalar(
        select(Teacher).where(
            func.lower(Teacher.name) == name.lower()
        )
    )

    if existing:
        raise ValueError("A teacher with this name already exists.")

    teacher = Teacher(
        name=name,
        is_active=True,
    )

    db.add(teacher)
    db.flush()

    return teacher


def get_teachers(
    db: Session,
    is_active: bool | None = True,
) -> list[Teacher]:
    query = select(Teacher)

    if is_active is not None:
        query = query.where(Teacher.is_active == is_active)

    return list(
        db.scalars(query.order_by(Teacher.name.asc())).all()
    )


def get_teacher_by_id(db: Session, teacher_id: int) -> Teacher | None:
    return db.get(Teacher, teacher_id)


def update_teacher(
    db: Session,
    teacher_id: int,
    data: TeacherUpdate,
) -> Teacher:
    teacher = db.get(Teacher, teacher_id)

    if teacher is None:
        raise LookupError("Teacher not found.")

    if not teacher.is_active:
        raise ValueError("Cannot update an inactive teacher.")

    name = data.name.strip()

    duplicate = db.scalar(
        select(Teacher).where(
            func.lower(Teacher.name) == name.lower(),
            Teacher.id != teacher_id,
        )
    )

    if duplicate:
        raise ValueError("A teacher with this name already exists.")

    teacher.name = name

    db.flush()

    return teacher


def deactivate_teacher(db: Session, teacher_id: int) -> Teacher:
    teacher = db.get(Teacher, teacher_id)

    if teacher is None:
        raise LookupError("Teacher not found.")

    if not teacher.is_active:
        raise ValueError("Teacher is already inactive.")

    active_batch = db.scalar(
        select(Batch.id).where(
            Batch.teacher_id == teacher_id,
            Batch.is_active.is_(True),
        ).limit(1)
    )

    if active_batch is not None:
        raise ValueError(
            "This teacher is assigned to an active batch. "
            "Reassign or remove the teacher from those batches first."
        )

    teacher.is_active = False

    db.flush()

    return teacher