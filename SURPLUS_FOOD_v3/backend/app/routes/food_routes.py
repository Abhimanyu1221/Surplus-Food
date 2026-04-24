from fastapi import APIRouter, HTTPException
from typing import List
from app.schemas.all_schemas import (
    FoodCreate, FoodResponse, LockFoodRequest, VerifyOtpRequest,
    LockFoodResponse, ClaimFoodRequest
)
from app.services.food_service import (
    add_food_listing,
    get_all_available_food,
    get_foods_by_hotel,
    lock_food,
    verify_pickup_otp,
    claim_food_as_volunteer,
    get_foods_by_volunteer,
    get_foods_by_region,
)

router = APIRouter(prefix="/foods", tags=["Foods"])

@router.post("/add", response_model=FoodResponse)
async def add_food(food_data: FoodCreate):
    return await add_food_listing(food_data.dict())

@router.get("", response_model=List[FoodResponse])
async def list_available_foods():
    return await get_all_available_food()

@router.get("/hotel/{hotel_id}", response_model=List[FoodResponse])
async def list_hotel_foods(hotel_id: str):
    return await get_foods_by_hotel(hotel_id)

@router.get("/by-region/{region}", response_model=List[FoodResponse])
async def list_available_foods_by_region(region: str):
    """NGO/Volunteer sees available foods grouped by region."""
    return await get_foods_by_region(region)

@router.post("/{food_id}/lock", response_model=LockFoodResponse)
async def lock_food_for_pickup(food_id: str, request: LockFoodRequest):
    """NGO locks a food listing for pickup."""
    return await lock_food(food_id, request.ngo_id)

@router.post("/{food_id}/claim", response_model=LockFoodResponse)
async def claim_food_for_volunteer(food_id: str, request: ClaimFoodRequest):
    """Volunteer claims a food listing independently (no NGO required)."""
    return await claim_food_as_volunteer(food_id, request.volunteer_id)

@router.post("/{food_id}/verify-otp", response_model=FoodResponse)
async def verify_otp(food_id: str, request: VerifyOtpRequest):
    return await verify_pickup_otp(food_id, request.otp_code)

@router.get("/volunteer/{volunteer_id}", response_model=List[FoodResponse])
async def list_volunteer_foods(volunteer_id: str):
    """All food listings claimed by a specific volunteer."""
    return await get_foods_by_volunteer(volunteer_id)
