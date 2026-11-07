from datetime import date
from sqlalchemy import update
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.academic_session import AcademicSession 

def create_academic_session(db: Session,name: str,start_date: date,end_date: date,is_current: bool = False) -> AcademicSession:
    if start_date >= end_date:
        raise ValueError("The end_date must be strictly later than the start_date.")
    existing_session = db.query(AcademicSession).filter(AcademicSession.session_name == name).first()
    if existing_session:
        raise ValueError(f"An academic session with the name '{name}' already exists.")
    if is_current:
        db.execute(update(AcademicSession).where(AcademicSession.is_current == True).values(is_current=False))

    new_session = AcademicSession(
        session_name=name,
        start_date=start_date,
        end_date=end_date,
        is_current=is_current)
    db.add(new_session)
    
    try:
        db.flush()
    except IntegrityError as e:
        db.rollback()
        raise ValueError("Database integrity error: A constraint violation occurred.") from e
    return new_session

def set_current_academic_session(db: Session,session_id:int):
    req_session=db.query(AcademicSession).filter(AcademicSession.id == session_id).first()
    if not req_session:
        raise ValueError(f"The academic sessionyou searched for does not exist.")
    db.execute(update(AcademicSession).where(AcademicSession.is_current == True).values(is_current=False))
    new_session = AcademicSession(id=session_id)
    db.add(new_session)
    try:
        db.flush()
    except IntegrityError as e:
        db.rollback()
        raise ValueError("Database integrity error: A constraint violation occurred.") from e
    return new_session

    

