from datetime import date, datetime
from pydantic import BaseModel, ConfigDict

class AcademicSessionResponse(BaseModel):
    id: int
    name: str
    start_date: date
    end_date: date
    is_current: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)