from datetime import date

from pydantic import BaseModel, ConfigDict


class RecentAdmission(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    student_name: str
    student_code: str
    class_number: int
    stream: str | None
    admission_date: date


class DashboardSummary(BaseModel):
    active_students: int
    active_teachers: int
    active_batches: int

    admissions_this_session: int
    recent_admissions: list[RecentAdmission]

    academic_session: str | None

    online_class_published: bool
    online_class_title: str | None