
from datetime import date

from app.db.session import SessionLocal
from app.services.academic_session_service import (
    create_academic_session,
    get_current_academic_session,
    set_current_academic_session,
)


def test_academic_session_service():
    db = SessionLocal()

    try:
        print("\n--- Academic Session Service Tests ---")

        # 1. Create the first academic session as current.
        session_1 = create_academic_session(
            db=db,
            name="TEST-2026-2027",
            start_date=date(2026, 4, 1),
            end_date=date(2027, 3, 31),
            is_current=True,
        )

        print(f"PASS: Created session {session_1.name}")
        session_1_id = session_1.id

        # 2. Create another session as non-current.
        session_2 = create_academic_session(
            db=db,
            name="TEST-2027-2028",
            start_date=date(2027, 4, 1),
            end_date=date(2028, 3, 31),
            is_current=False,
        )

        print(f"PASS: Created session {session_2.name}")
        session_2_id = session_2.id

        # 3. Retrieve the current session.
        current_session = get_current_academic_session(db)

        assert current_session is not None
        assert current_session.id == session_1_id

        print("PASS: Retrieved the correct current session")

        # 4. Switch the current session.
        updated_session = set_current_academic_session(
            db=db,
            session_id=session_2_id,
        )

        assert updated_session.is_current is True

        print("PASS: Successfully switched the current session")

        # 5. Verify the current session changed.
        current_session = get_current_academic_session(db)

        assert current_session is not None
        assert current_session.id == session_2_id

        print("PASS: New current session verified")

        # 6. Verify duplicate session names are rejected.
        try:
            create_academic_session(
                db=db,
                name="TEST-2026-2027",
                start_date=date(2028, 4, 1),
                end_date=date(2029, 3, 31),
            )
            raise AssertionError("Duplicate session name was accepted.")

        except ValueError:
            print("PASS: Duplicate session name rejected")

        # 7. Verify invalid dates are rejected.
        try:
            create_academic_session(
                db=db,
                name="TEST-INVALID-DATES",
                start_date=date(2028, 4, 1),
                end_date=date(2028, 3, 31),
            )
            raise AssertionError("Invalid session dates were accepted.")

        except ValueError:
            print("PASS: Invalid session dates rejected")

        # 8. Verify nonexistent session IDs are rejected.
        try:
            set_current_academic_session(
                db=db,
                session_id=-999,
            )
            raise AssertionError("Nonexistent session ID was accepted.")

        except ValueError:
            print("PASS: Nonexistent session ID rejected")

        print("\nALL TESTS PASSED")

    except Exception:
        db.rollback()
        raise

    finally:
        # Remove all test changes, including session switches.
        db.rollback()
        db.close()


if __name__ == "__main__":
    test_academic_session_service()
