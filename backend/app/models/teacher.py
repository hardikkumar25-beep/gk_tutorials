from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

class Teacher(Base):
    __tablename__ = "teachers"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100),nullable=False,unique=True,index=True,)
    batches: Mapped[list["Batch"]] = relationship(back_populates="teacher",)
    is_active: Mapped[bool] = mapped_column(Boolean,default=True,nullable=False,)

