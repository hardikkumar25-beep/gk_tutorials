
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.subject import Subject, enrollment_subjects
from app.schemas.subject import SubjectCreate, SubjectUpdate


def validate_class_stream(class_number: int, stream: str | None) -> None:
    """Validate whether a stream is applicable to the selected class."""
    if class_number not in (9, 10, 11, 12):
        raise ValueError("Class must be 9, 10, 11, or 12.")
    if class_number in (9, 10) and stream is not None:
        raise ValueError("Classes 9 and 10 cannot have a stream.")
    if class_number in (11, 12) and stream not in ("Science", "Commerce"):
        raise ValueError("Classes 11 and 12 require either Science or Commerce.")

def create_subject(db: Session, subject_data: SubjectCreate) -> Subject:
    """Create a new subject."""
    validate_class_stream(subject_data.class_number,subject_data.stream,)
    existing_subject = db.scalar(select(Subject).where(Subject.subject_name == subject_data.subject_name,Subject.class_number == subject_data.class_number,Subject.stream.is_not_distinct_from(subject_data.stream),))

    if existing_subject:
        raise ValueError(
            f"{subject_data.subject_name} already exists "
            f"for Class {subject_data.class_number}.")

    new_subject = Subject(
        subject_name=subject_data.subject_name,
        class_number=subject_data.class_number,
        stream=subject_data.stream,
        is_active=True,
    )
    db.add(new_subject)
    try:
        db.flush()
    except IntegrityError as exc:
        raise ValueError(
            "Could not create subject. A duplicate or constraint violation occurred."
        ) from exc
    return new_subject


def get_subject_by_id(db: Session, subject_id: int) -> Subject | None:
    """Retrieve a subject using its ID."""
    return db.get(Subject, subject_id)


def get_subjects(db: Session,class_number: int | None = None,stream: str | None = None,is_active: bool | None = True) -> list[Subject]:
    """Retrieve subjects with optional filters."""

    if class_number is not None:
        if class_number not in (9, 10, 11, 12):
            raise ValueError("Invalid class number.")

        if class_number in (9, 10) and stream is not None:
            raise ValueError("Classes 9 and 10 cannot have a stream.")

        if class_number in (11, 12) and stream not in (
            None,
            "Science",
            "Commerce",
        ):
            raise ValueError("Invalid stream.")

    elif stream is not None:
        if stream not in ("Science", "Commerce"):
            raise ValueError("Invalid stream.")

    query = select(Subject)

    if class_number is not None:
        query = query.where(Subject.class_number == class_number)

    if stream is not None:
        query = query.where(Subject.stream == stream)

    if is_active is not None:
        query = query.where(Subject.is_active == is_active)

    query = query.order_by(
        Subject.class_number,
        Subject.stream,
        Subject.subject_name,
    )

    return list(db.scalars(query).all())


def update_subject(db: Session,subject_id: int,subject_data: SubjectUpdate,) -> Subject:
    """Update an existing subject."""
    subject = db.get(Subject, subject_id)

    if subject is None:
        raise ValueError("Subject not found.")

    updates = subject_data.model_dump(exclude_unset=True)

    if "subject_name" in updates and updates["subject_name"] is None:
        raise ValueError("Subject name cannot be null.")

    if "class_number" in updates and updates["class_number"] is None:
        raise ValueError("Class number cannot be null.")

    new_name = updates.get("subject_name", subject.subject_name)
    new_class = updates.get("class_number", subject.class_number)
    new_stream = updates.get("stream", subject.stream)

    validate_class_stream(new_class, new_stream)
    duplicate_subject = db.scalar(
        select(Subject).where(
            Subject.subject_name == new_name,
            Subject.class_number == new_class,
            Subject.stream.is_not_distinct_from(new_stream),
            Subject.id != subject_id,
        ))

    if duplicate_subject:
        raise ValueError("Another subject with the same name, class, and stream already exists.")

    applicability_changed = (
        new_class != subject.class_number
        or new_stream != subject.stream
    )

    if applicability_changed:
        existing_enrollment = db.scalar(
            select(enrollment_subjects.c.enrollment_id)
            .where(enrollment_subjects.c.subject_id == subject_id)
            .limit(1)
        )

        if existing_enrollment is not None:
            raise ValueError(
                "Cannot change the class or stream of a subject "
                "already assigned to student enrollments."
            )

    subject.subject_name = new_name
    subject.class_number = new_class
    subject.stream = new_stream

    try:
        db.flush()
    except IntegrityError as exc:
        raise ValueError(
            "Could not update subject because of a database constraint."
        ) from exc

    return subject


def deactivate_subject(db: Session, subject_id: int) -> Subject:
    """Deactivate a subject without deleting its history."""

    subject = db.get(Subject, subject_id)

    if subject is None:
        raise ValueError("Subject not found.")

    if not subject.is_active:
        return subject

    subject.is_active = False
    db.flush()

    return subject
