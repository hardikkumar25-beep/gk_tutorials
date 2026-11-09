from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class OnlineClass(Base):
    __tablename__ = "online_classes"
    id: Mapped[int] = mapped_column(Integer,primary_key=True,default=1,)
    title: Mapped[str] = mapped_column(String(150),nullable=False,)
    url: Mapped[str] = mapped_column(String(500),nullable=False,)
    is_published: Mapped[bool] = mapped_column(Boolean,default=False,nullable=False,)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),server_default=func.now(),onupdate=func.now(),nullable=False,)