from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.online_class import OnlineClass
from app.schemas.online_class import OnlineClassUpdate


def get_online_class(db: Session):
    return db.scalar(select(OnlineClass).where(OnlineClass.id == 1))


def get_public_online_class(db: Session):
    online_class = get_online_class(db)

    if not online_class or not online_class.is_published:
        return None

    return online_class


def update_online_class(db: Session, data: OnlineClassUpdate,):
    online_class = get_online_class(db)

    if online_class is None:
        online_class = OnlineClass(
            id=1,
            title=data.title,
            url=str(data.url),
            is_published=data.is_published,
        )

        db.add(online_class)
    else:
        online_class.title = data.title
        online_class.url = str(data.url)
        online_class.is_published = data.is_published

    db.flush()
    db.refresh(online_class)

    return online_class