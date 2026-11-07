from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

ClassNumber = Literal[9, 10, 11, 12]
Stream = Literal["Science", "Commerce"]

class SubjectCreate(BaseModel):
    subject_name: str = Field(min_length=2, max_length=100)
    class_number: ClassNumber
    stream: Stream | None = None

    model_config = ConfigDict(str_strip_whitespace=True,extra="forbid",)

    @model_validator(mode="after")
    def validate_class_and_stream(self):
        if self.class_number in (9, 10) and self.stream is not None:
            raise ValueError("Classes 9 and 10 cannot have a stream.")

        if self.class_number in (11, 12) and self.stream is None:
            raise ValueError("Classes 11 and 12 require a stream.")
        return self

class SubjectUpdate(BaseModel):
    subject_name: str | None = Field(default=None,min_length=2,max_length=100,)
    class_number: ClassNumber | None = None
    stream: Stream | None = None

    model_config = ConfigDict(str_strip_whitespace=True,extra="forbid",)

    @model_validator(mode="after")
    def validate_update(self):
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided.")
        return self

class SubjectResponse(BaseModel):
    id: int
    subject_name: str
    class_number: int
    stream: str | None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
