from datetime import date
from sqlalchemy import update,select 
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.academic_session import AcademicSession 

def create_academic_session(db: Session,name: str,start_date: date,end_date: date,is_current: bool = False) -> AcademicSession:
    if start_date >= end_date:
        raise ValueError("The end_date must be strictly later than the start_date.")
    existing_session = db.scalar(select(AcademicSession).where(AcademicSession.name == name))
    if existing_session:
        raise ValueError(f"An academic session with the name '{name}' already exists.")
    if is_current:
        db.execute(update(AcademicSession).where(AcademicSession.is_current.is_(True)).values(is_current=False))

    new_session = AcademicSession(
        name=name,
        start_date=start_date,
        end_date=end_date,
        is_current=is_current)
    db.add(new_session)
    
    try:
        db.flush()
    except IntegrityError as e:
        raise ValueError("Database integrity error: A constraint violation occurred.") from e
    return new_session

def get_current_academic_session(db:Session)->AcademicSession | None:
    return db.scalar(select(AcademicSession).where(AcademicSession.is_current.is_(True)))

def set_current_academic_session(db: Session,session_id:int)-> AcademicSession:
    req_session=db.get(AcademicSession,session_id)
    if req_session is None:
        raise ValueError(f"The academic sessionyou searched for does not exist.")
    if req_session.is_current:
        return req_session
    db.execute(update(AcademicSession).where(AcademicSession.is_current.is_(True)).values(is_current=False))
    req_session.is_current = True
    try:
        db.flush()
    except IntegrityError as e:
        raise ValueError("Database integrity error: A constraint violation occurred.") from e
    return req_session

    

