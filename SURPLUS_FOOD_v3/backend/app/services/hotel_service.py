from app.config.database import get_db
from app.models.base_models import HotelModel
from app.core.security import hash_password
from bson import ObjectId
from fastapi import HTTPException

PUNE_REGIONS = [
    "Shivajinagar", "Kothrud", "Deccan / FC Road", "Aundh", "Baner", "Wakad",
    "Hinjewadi", "Koregaon Park", "Kalyani Nagar", "Viman Nagar",
    "Hadapsar", "Magarpatta", "Katraj", "Kondhwa", "Bibwewadi", "Warje",
    "Karve Nagar", "Balewadi"
]

async def create_hotel(hotel_data: dict) -> dict:
    if hotel_data.get("region") not in PUNE_REGIONS:
        raise HTTPException(status_code=400, detail="Invalid region. Please select a valid Pune region.")

    db = get_db()

    # Duplicate phone guard
    if await db["hotels"].find_one({"phone": hotel_data["phone"]}):
        raise HTTPException(status_code=400, detail="A hotel with this phone number already exists.")

    # Hash password before storing
    hotel_data["password"] = hash_password(hotel_data["password"])

    hotel = HotelModel(**hotel_data)
    hotel_dict = hotel.dict(by_alias=True, exclude_none=True)
    if "_id" in hotel_dict and hotel_dict["_id"] is None:
        del hotel_dict["_id"]

    result = await db["hotels"].insert_one(hotel_dict)
    created_hotel = await db["hotels"].find_one({"_id": result.inserted_id})
    if created_hotel:
        created_hotel["id"] = str(created_hotel["_id"])
        created_hotel.pop("password", None)   # never return hash to client
    return created_hotel

async def get_hotel_by_id(hotel_id: str) -> dict:
    db = get_db()
    hotel = await db["hotels"].find_one({"_id": ObjectId(hotel_id)})
    if hotel:
        hotel["id"] = str(hotel["_id"])
        hotel.pop("password", None)
    return hotel
