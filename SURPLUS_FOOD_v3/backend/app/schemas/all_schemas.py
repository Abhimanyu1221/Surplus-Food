from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from app.models.base_models import LocationModel, LockedByModel

# --- HOTEL SCHEMAS ---
class HotelCreate(BaseModel):
    name: str
    address: str
    phone: str
    region: str
    password: str

class HotelResponse(BaseModel):
    id: str
    name: str
    address: str
    phone: str
    region: str
    created_at: datetime

# --- NGO SCHEMAS ---
class NgoCreate(BaseModel):
    name: str
    phone: str
    password: str

class NgoResponse(BaseModel):
    id: str
    name: str
    phone: str
    created_at: datetime

# --- VOLUNTEER SCHEMAS ---
class VolunteerCreate(BaseModel):
    name: str
    phone: str
    password: str

class VolunteerResponse(BaseModel):
    id: str
    name: str
    phone: str
    created_at: datetime

# --- FOOD SCHEMAS ---
class FoodCreate(BaseModel):
    hotel_id: str
    title: str
    quantity: str
    description: str
    location: Optional[LocationModel] = None
    expiry_hours: float = Field(
        default=6.0,
        ge=0.5,
        le=6.0,
        description="Hours before this listing auto-expires (0.5–6, default 6).",
    )

    @validator("expiry_hours")
    def cap_at_six(cls, v):
        if v > 6:
            raise ValueError("expiry_hours must not exceed 6.")
        return round(v, 2)


class FoodResponse(BaseModel):
    id: str
    hotel_id: str
    title: str
    quantity: str
    description: str
    status: str
    region: str = "Unknown"
    location: Optional[LocationModel] = None
    locked_by: Optional[LockedByModel] = None
    created_at: datetime
    expiry_hours: Optional[float] = None
    expires_at: Optional[datetime] = None

    # Extended context fields — populated by service layer / $lookup
    hotel_name: Optional[str] = None
    hotel_address: Optional[str] = None
    hotel_phone: Optional[str] = None
    ngo_name: Optional[str] = None
    ngo_phone: Optional[str] = None
    volunteer_name: Optional[str] = None
    volunteer_phone: Optional[str] = None

class LockFoodResponse(FoodResponse):
    otp_code: Optional[str] = None

class LockFoodRequest(BaseModel):
    ngo_id: str

class ClaimFoodRequest(BaseModel):
    """Used by volunteers to claim food independently (no NGO)."""
    volunteer_id: str

class VerifyOtpRequest(BaseModel):
    otp_code: str
