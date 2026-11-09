from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator
from urllib.parse import urlparse


class OnlineClassUpdate(BaseModel):
    model_config = ConfigDict(
        str_strip_whitespace=True,
        extra="forbid",
    )

    title: str = Field(min_length=2, max_length=150)
    youtube_url: HttpUrl
    is_published: bool = False

    @field_validator("youtube_url")
    @classmethod
    def validate_youtube_url(cls, value):
        allowed_hosts = {
            "youtube.com",
            "www.youtube.com",
            "m.youtube.com",
            "youtu.be",
            "www.youtu.be",
        }

        parsed = urlparse(str(value))

        if parsed.hostname not in allowed_hosts:
            raise ValueError("Please enter a valid YouTube URL.")

        return value


class OnlineClassResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    youtube_url: str
    is_published: bool
    updated_at: object