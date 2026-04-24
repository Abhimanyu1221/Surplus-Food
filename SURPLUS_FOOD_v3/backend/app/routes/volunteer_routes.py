from fastapi import APIRouter
from app.schemas.all_schemas import VolunteerCreate, VolunteerResponse
from app.services.volunteer_service import create_volunteer

router = APIRouter(prefix="/volunteers", tags=["Volunteers"])

@router.post("/register", response_model=VolunteerResponse)
async def register_volunteer(volunteer_data: VolunteerCreate):
    return await create_volunteer(volunteer_data.dict())
