from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class MongoBaseModel(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)

class HotelModel(MongoBaseModel):
    name: str
    address: str
    phone: str
    region: str
    password: str = ""          # bcrypt hash stored here
    created_at: datetime = Field(default_factory=datetime.utcnow)

class NgoModel(MongoBaseModel):
    name: str
    phone: str
    password: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)

class LockedByModel(BaseModel):
    ngo_id: Optional[str] = None
    volunteer_id: Optional[str] = None

class LocationModel(BaseModel):
    lat: float
    lng: float

class VolunteerModel(MongoBaseModel):
    name: str
    phone: str
    password: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)

class FoodModel(MongoBaseModel):
    hotel_id: str
    title: str
    quantity: str
    description: str
    status: str = "available"   # available | locked | picked | expired
    region: str = ""
    locked_by: Optional[LockedByModel] = None
    otp_code: Optional[str] = None
    location: Optional[LocationModel] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expiry_hours: float = 6.0   # user-supplied, max 6
    expires_at: Optional[datetime] = None
