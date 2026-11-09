from datetime import time
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


ClassNumber = Literal[9, 10, 11, 12]
Stream = Literal["Science", "Commerce"]

DayOfWeek = Literal[0, 1, 2, 3, 4, 5, 6]


class BatchScheduleCreate(BaseModel):
    day_of_week: DayOfWeek
    start_time: time
    end_time: time

    model_config = ConfigDict(extra="forbid")

    @model_validator(mode="after")
    def validate_time(self):
        if self.end_time <= self.start_time:
            raise ValueError("End time must be later than start time.")
        return self


class BatchSubjectCreate(BaseModel):
    subject_id: int = Field(gt=0)
    schedules: list[BatchScheduleCreate] = Field(min_length=1)

    model_config = ConfigDict(extra="forbid")


class BatchCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    class_number: ClassNumber
    stream: Stream | None = None

    academic_session_id: int = Field(gt=0)
    teacher_id: int | None = Field(default=None, gt=0)
    capacity: int = Field(gt=0)

    batch_subjects: list[BatchSubjectCreate] = Field(min_length=1)

    model_config = ConfigDict(
        str_strip_whitespace=True,
        extra="forbid",
    )

    @model_validator(mode="after")
    def validate_batch(self):
        if self.class_number in (9, 10) and self.stream is not None:
            raise ValueError("Classes 9 and 10 cannot have a stream.")

        if self.class_number in (11, 12) and self.stream is None:
            raise ValueError(
                "Classes 11 and 12 require Science or Commerce stream."
            )

        subject_ids = [item.subject_id for item in self.batch_subjects]

        if len(subject_ids) != len(set(subject_ids)):
            raise ValueError("Duplicate subjects are not allowed in a batch.")

        return self


class BatchUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    class_number: ClassNumber | None = None
    stream: Stream | None = None

    academic_session_id: int | None = Field(default=None, gt=0)
    teacher_id: int | None = Field(default=None, gt=0)
    capacity: int | None = Field(default=None, gt=0)

    batch_subjects: list[BatchSubjectCreate] | None = None

    model_config = ConfigDict(
        str_strip_whitespace=True,
        extra="forbid",
    )

    @model_validator(mode="after")
    def validate_update(self):
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided.")

        if "name" in self.model_fields_set and self.name is None:
            raise ValueError("Batch name cannot be null.")

        if "class_number" in self.model_fields_set and self.class_number is None:
            raise ValueError("Class number cannot be null.")

        if "academic_session_id" in self.model_fields_set and self.academic_session_id is None:
            raise ValueError("Academic session cannot be null.")

        if "capacity" in self.model_fields_set and self.capacity is None:
            raise ValueError("Capacity cannot be null.")

        if "batch_subjects" in self.model_fields_set:
            if not self.batch_subjects:
                raise ValueError("A batch must have at least one subject.")

            subject_ids = [
                item.subject_id for item in self.batch_subjects
            ]

            if len(subject_ids) != len(set(subject_ids)):
                raise ValueError("Duplicate subjects are not allowed.")

        return self


class BatchScheduleResponse(BaseModel):
    id: int
    day_of_week: int
    start_time: time
    end_time: time

    model_config = ConfigDict(from_attributes=True)


class BatchSubjectResponse(BaseModel):
    id: int
    subject_id: int
    subject: "SubjectResponse"
    schedules: list[BatchScheduleResponse]

    model_config = ConfigDict(from_attributes=True)


class SubjectResponse(BaseModel):
    id: int
    subject_name: str
    class_number: int
    stream: str | None

    model_config = ConfigDict(from_attributes=True)


class BatchResponse(BaseModel):
    id: int
    name: str
    class_number: int
    stream: str | None
    academic_session_id: int
    teacher_id: int | None
    teacher: "TeacherResponse | None"
    capacity: int
    is_active: bool
    batch_subjects: list[BatchSubjectResponse]

    model_config = ConfigDict(from_attributes=True)


class TeacherResponse(BaseModel):
    id: int
    name: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)