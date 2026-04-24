from fastapi import APIRouter
from app.schemas.all_schemas import HotelCreate, HotelResponse
from app.services.hotel_service import create_hotel, get_hotel_by_id

router = APIRouter(prefix="/hotels", tags=["Hotels"])

@router.post("/register", response_model=HotelResponse)
async def register_hotel(hotel_data: HotelCreate):
    return await create_hotel(hotel_data.dict())

@router.get("/{hotel_id}", response_model=HotelResponse)
async def get_hotel(hotel_id: str):
    return await get_hotel_by_id(hotel_id)
