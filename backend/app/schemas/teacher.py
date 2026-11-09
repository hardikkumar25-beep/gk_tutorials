from pydantic import BaseModel, ConfigDict, Field


class TeacherCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)

    model_config = ConfigDict(
        str_strip_whitespace=True,
        extra="forbid",
    )


class TeacherUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=100)

    model_config = ConfigDict(
        str_strip_whitespace=True,
        extra="forbid",
    )


class TeacherResponse(BaseModel):
    id: int
    name: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)