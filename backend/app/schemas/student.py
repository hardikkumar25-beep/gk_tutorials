
from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


ClassNumber = Literal[9, 10, 11, 12]
Stream = Literal["Science", "Commerce"]


class StudentCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    date_of_birth: date | None = None
    gender: str | None = Field(default=None, max_length=30)
    email: EmailStr | None = None

    student_phone: str | None = Field(default=None, max_length=20)
    mother_phone: str | None = Field(default=None, max_length=20)
    father_phone: str | None = Field(default=None, max_length=20)

    address: str | None = None
    school_name: str | None = Field(default=None, max_length=180)
    school_address: str | None = None
    referral_source: str | None = Field(default=None, max_length=150)

    model_config = ConfigDict(str_strip_whitespace=True,extra="forbid",)

    @model_validator(mode="after")
    def validate_student(self):
        if self.date_of_birth and self.date_of_birth > date.today():
            raise ValueError("Date of birth cannot be in the future.")

        if not any([self.student_phone,self.mother_phone,self.father_phone,]):
            raise ValueError( "At least one student or parent contact number is required.")
        return self


class AdmissionCreate(BaseModel):
    student: StudentCreate
    academic_session_id: int = Field(gt=0)
    class_number: ClassNumber
    stream: Stream | None = None
    subject_ids: list[int] = Field(min_length=1)

    admission_date: date = Field(default_factory=date.today)

    model_config = ConfigDict(extra="forbid")

    @model_validator(mode="after")
    def validate_admission(self):
        if self.class_number in (9, 10) and self.stream is not None:
            raise ValueError("Classes 9 and 10 must not have a stream.")

        if self.class_number in (11, 12) and self.stream is None:
            raise ValueError(
                "Classes 11 and 12 require Science or Commerce stream."
            )

        if len(self.subject_ids) != len(set(self.subject_ids)):
            raise ValueError("Duplicate subject IDs are not allowed.")

        if self.admission_date > date.today():
            raise ValueError("Admission date cannot be in the future.")

        return self


class StudentResponse(BaseModel):
    id: int
    student_code: str
    full_name: str
    date_of_birth: date | None
    gender: str | None
    email: EmailStr | None
    student_phone: str | None
    mother_phone: str | None
    father_phone: str | None
    address: str | None
    school_name: str | None
    school_address: str | None
    referral_source: str | None
    status: str

    model_config = ConfigDict(from_attributes=True)

class SubjectResponse(BaseModel):
    id: int
    subject_name: str
    class_number: int
    stream: str | None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

class EnrollmentResponse(BaseModel):
    id: int
    academic_session_id: int
    class_number: int
    stream: str | None
    admission_date: date
    status: str
    subjects: list["SubjectResponse"]

    model_config = ConfigDict(from_attributes=True)

class StudentProfileResponse(StudentResponse):
    enrollments: list[EnrollmentResponse]


class StudentListResponse(BaseModel):
    total: int
    items: list[StudentProfileResponse]
