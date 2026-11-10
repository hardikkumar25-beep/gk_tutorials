from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    csrf_token: str


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr

    model_config = {"from_attributes": True}
