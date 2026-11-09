from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.academic_session import AcademicSession
from app.models.teacher import Teacher
from app.models.subject import Subject
from app.models.batch import Batch,BatchSubject,BatchSchedule
from app.schemas.batch import BatchCreate, BatchUpdate


def validate_class_stream(class_number: int,stream: str | None,) -> None:
    if class_number not in (9, 10, 11, 12):
        raise ValueError("Invalid class number.")

    if class_number in (9, 10) and stream is not None:
        raise ValueError("Classes 9 and 10 cannot have a stream.")

    if class_number in (11, 12) and stream not in (
        "Science",
        "Commerce",
    ):
        raise ValueError(
            "Classes 11 and 12 require Science or Commerce stream."
        )


def validate_session(db: Session, session_id: int) -> None:
    session = db.get(AcademicSession, session_id)

    if session is None:
        raise LookupError("Academic session not found.")


def validate_teacher(db: Session,teacher_id: int | None,) -> None:
    if teacher_id is None:
        return

    teacher = db.get(Teacher, teacher_id)

    if teacher is None:
        raise LookupError("Teacher not found.")

    if not teacher.is_active:
        raise ValueError("Cannot assign an inactive teacher.")


def validate_subjects(db: Session,class_number: int,stream: str | None,batch_subjects,) -> list[Subject]:
    subject_ids = [item.subject_id for item in batch_subjects]

    if len(subject_ids) != len(set(subject_ids)):
        raise ValueError("Duplicate subjects are not allowed.")

    subjects = list(
        db.scalars(
            select(Subject).where(
                Subject.id.in_(subject_ids),
                Subject.is_active.is_(True),
            )
        ).all()
    )

    if len(subjects) != len(subject_ids):
        raise ValueError(
            "One or more subjects do not exist or are inactive."
        )

    for subject in subjects:
        if subject.class_number != class_number:
            raise ValueError(
                f"{subject.subject_name} does not belong to "
                f"Class {class_number}."
            )

        if subject.stream != stream:
            raise ValueError(
                f"{subject.subject_name} does not match "
                f"the batch stream."
            )

    return subjects


def flatten_schedules(batch_subjects):
    schedules = []

    for batch_subject in batch_subjects:
        for schedule in batch_subject.schedules:
            schedules.append({
                "day_of_week": schedule.day_of_week,
                "start_time": schedule.start_time,
                "end_time": schedule.end_time,
            })

    return schedules


def validate_schedule_conflicts(
db: Session,
    schedules: list[dict],
    teacher_id: int | None,
    exclude_batch_id: int | None = None,
) -> None:
    """
    Check schedule overlaps within this batch and
    against other active batches assigned to the same teacher.
    """

    # Check overlaps within the proposed batch.
    for index, first in enumerate(schedules):
        for second in schedules[index + 1:]:
            if first["day_of_week"] != second["day_of_week"]:
                continue

            overlaps = (
                first["start_time"] < second["end_time"]
                and second["start_time"] < first["end_time"]
            )

            if overlaps:
                raise ValueError(
                    "Two subjects in this batch have overlapping schedules."
                )

    if teacher_id is None:
        return
    query = (
        select(BatchSchedule)
        .join(BatchSubject, BatchSchedule.batch_subject_id == BatchSubject.id)
        .join(Batch, BatchSubject.batch_id == Batch.id)
        .where(
            Batch.teacher_id == teacher_id,
            Batch.is_active.is_(True),
        )
    )

    if exclude_batch_id is not None:
        query = query.where(Batch.id != exclude_batch_id)

    existing_schedules = list(db.scalars(query).all())

    for proposed in schedules:
        for existing in existing_schedules:
            if proposed["day_of_week"] != existing.day_of_week:
                continue

            overlaps = (
                proposed["start_time"] < existing.end_time
                and existing.start_time < proposed["end_time"]
            )

            if overlaps:
                raise ValueError(
                    "This teacher is already assigned to another batch "
                    "during the selected time."
                )


def build_batch_subjects(batch, subject_data) -> None:
    for item in subject_data:
        batch_subject = BatchSubject(
            subject_id=item.subject_id,
        )

        for schedule_data in item.schedules:
            batch_subject.schedules.append(
                BatchSchedule(
                    day_of_week=schedule_data.day_of_week,
                    start_time=schedule_data.start_time,
                    end_time=schedule_data.end_time,
                )
            )

        batch.batch_subjects.append(batch_subject)


def create_batch(db: Session, data: BatchCreate) -> Batch:
    validate_class_stream(data.class_number, data.stream)
    validate_session(db, data.academic_session_id)
    validate_teacher(db, data.teacher_id)

    validate_subjects(
        db,
        data.class_number,
        data.stream,
        data.batch_subjects,
    )

    schedules = [
        {
            "day_of_week": schedule.day_of_week,
            "start_time": schedule.start_time,
            "end_time": schedule.end_time,
        }
        for item in data.batch_subjects
        for schedule in item.schedules
    ]

    validate_schedule_conflicts(
        db,
        schedules,
        data.teacher_id,
    )

    batch = Batch(
        name=data.name,
        class_number=data.class_number,
        stream=data.stream,
        academic_session_id=data.academic_session_id,
        teacher_id=data.teacher_id,
        capacity=data.capacity,
        is_active=True,
    )

    db.add(batch)
    db.flush()

    build_batch_subjects(batch, data.batch_subjects)

    db.flush()

    return batch


def batch_query():
    return select(Batch).options(
        selectinload(Batch.teacher),
        selectinload(Batch.batch_subjects)
        .selectinload(BatchSubject.subject),
        selectinload(Batch.batch_subjects)
        .selectinload(BatchSubject.schedules),
    )


def get_batch_by_id(db: Session, batch_id: int) -> Batch | None:
    query = batch_query().where(Batch.id == batch_id)

    return db.scalars(query).unique().one_or_none()


def get_batches(
    db: Session,
    class_number: int | None = None,
    stream: str | None = None,
    academic_session_id: int | None = None,
    teacher_id: int | None = None,
    is_active: bool | None = True,
) -> list[Batch]:
    query = batch_query()

    if class_number is not None:
        query = query.where(Batch.class_number == class_number)

    if stream is not None:
        query = query.where(Batch.stream == stream)

    if academic_session_id is not None:
        query = query.where(
            Batch.academic_session_id == academic_session_id
        )

    if teacher_id is not None:
        query = query.where(Batch.teacher_id == teacher_id)

    if is_active is not None:
        query = query.where(Batch.is_active == is_active)

    query = query.order_by(
        Batch.class_number,
        Batch.name,
    )

    return list(db.scalars(query).unique().all())


def update_batch(
    db: Session,
    batch_id: int,
    data: BatchUpdate,
) -> Batch:
    batch = get_batch_by_id(db, batch_id)

    if batch is None:
        raise LookupError("Batch not found.")

    if not batch.is_active:
        raise ValueError("Cannot update an inactive batch.")

    updates = data.model_dump(exclude_unset=True)

    new_class = updates.get("class_number", batch.class_number)
    new_stream = updates.get("stream", batch.stream)
    new_teacher_id = updates.get("teacher_id", batch.teacher_id)
    new_session_id = updates.get(
        "academic_session_id",
        batch.academic_session_id,
    )

    validate_class_stream(new_class, new_stream)
    validate_session(db, new_session_id)
    validate_teacher(db, new_teacher_id)

    new_subject_data = updates.get("batch_subjects")

    if new_subject_data is not None:
        validate_subjects(
            db,
            new_class,
            new_stream,
            new_subject_data,
        )

        schedules = [
            {
                "day_of_week": schedule.day_of_week,
                "start_time": schedule.start_time,
                "end_time": schedule.end_time,
            }
            for item in new_subject_data
            for schedule in item.schedules
        ]
    else:
        schedules = flatten_schedules(batch.batch_subjects)

        subject_ids = [
            item.subject_id for item in batch.batch_subjects
        ]

        subjects = list(
            db.scalars(
                select(Subject).where(
                    Subject.id.in_(subject_ids),
                    Subject.is_active.is_(True),
                )
            ).all()
        )

        if len(subjects) != len(subject_ids):
            raise ValueError(
                "This batch contains an inactive subject. "
                "Update its subject configuration before changing the batch."
            )

        for subject in subjects:
            if (
                subject.class_number != new_class
                or subject.stream != new_stream
            ):
                raise ValueError(
                    "Changing the batch class or stream requires "
                    "updating its subjects as well."
                )

    validate_schedule_conflicts(
        db,
        schedules,
        new_teacher_id,
        exclude_batch_id=batch_id,
    )

    for field in (
        "name",
        "class_number",
        "stream",
        "academic_session_id",
        "teacher_id",
        "capacity",
    ):
        if field in updates:
            setattr(batch, field, updates[field])

    if new_subject_data is not None:
        batch.batch_subjects.clear()
        db.flush()

        build_batch_subjects(batch, new_subject_data)

    db.flush()

    return batch


def deactivate_batch(db: Session, batch_id: int) -> Batch:
    batch = db.get(Batch, batch_id)

    if batch is None:
        raise LookupError("Batch not found.")

    if not batch.is_active:
        raise ValueError("Batch is already inactive.")

    batch.is_active = False

    db.flush()

    return batch