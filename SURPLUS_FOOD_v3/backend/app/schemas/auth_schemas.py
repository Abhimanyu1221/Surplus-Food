from pydantic import BaseModel
from typing import Optional


class LoginRequest(BaseModel):
    phone: str
    password: str
    role: str  # "hotel" | "ngo" | "volunteer"


class LoginResponse(BaseModel):
    id: str
    name: str
    phone: str
    role: str
    address: Optional[str] = None  # Only for hotel
    access_token: str
    token_type: str = "bearer"
