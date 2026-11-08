from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.subject import Subject

SUBJECT_CATALOGUE = [
    # Class 9
    ("Mathematics", 9, None),
    ("Social Science", 9, None),
    ("Science", 9, None),
    ("English", 9, None),

    # Class 10
    ("Mathematics", 10, None),
    ("Social Science", 10, None),
    ("Science", 10, None),
    ("English", 10, None),

    # Class 11 Commerce
    ("Mathematics", 11, "Commerce"),
    ("Business Studies", 11, "Commerce"),
    ("Accountancy", 11, "Commerce"),
    ("English", 11, "Commerce"),
    ("Economics", 11, "Commerce"),
    ("Informatics Practices", 11, "Commerce"),

    # Class 12 Commerce
    ("Mathematics", 12, "Commerce"),
    ("Business Studies", 12, "Commerce"),
    ("Accountancy", 12, "Commerce"),
    ("English", 12, "Commerce"),
    ("Economics", 12, "Commerce"),
    ("Informatics Practices", 12, "Commerce"),

    # Class 11 Science
    ("Physics", 11, "Science"),
    ("Chemistry", 11, "Science"),
    ("Biology", 11, "Science"),
    ("English", 11, "Science"),
    ("Mathematics", 11, "Science"),
    ("Computer Science", 11, "Science"),

    # Class 12 Science
    ("Physics", 12, "Science"),
    ("Chemistry", 12, "Science"),
    ("Biology", 12, "Science"),
    ("English", 12, "Science"),
    ("Mathematics", 12, "Science"),
    ("Computer Science", 12, "Science"),
]


def seed_subjects():
    db = SessionLocal()
    created_count = 0
    skipped_count = 0
    try:
        for subject_name, class_number, stream in SUBJECT_CATALOGUE:
            existing_subject = db.scalar(
                select(Subject).where(
                    Subject.subject_name == subject_name,
                    Subject.class_number == class_number,
                    Subject.stream.is_not_distinct_from(stream),
                )
            )

            if existing_subject:
                skipped_count += 1
                continue

            new_subject = Subject(
                subject_name=subject_name,
                class_number=class_number,
                stream=stream,
                is_active=True,
            )

            db.add(new_subject)
            created_count += 1

        db.commit()
        print("\nSubject catalogue seeded successfully.")
        print(f"Created: {created_count}")
        print(f"Skipped existing: {skipped_count}")
        print(f"Total catalogue entries: {len(SUBJECT_CATALOGUE)}")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()

if __name__ == "__main__":
    seed_subjects()
