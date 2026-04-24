from fastapi import APIRouter
from app.schemas.all_schemas import NgoCreate, NgoResponse
from app.services.ngo_service import create_ngo

router = APIRouter(prefix="/ngos", tags=["NGOs"])

@router.post("/register", response_model=NgoResponse)
async def register_ngo(ngo_data: NgoCreate):
    return await create_ngo(ngo_data.dict())
