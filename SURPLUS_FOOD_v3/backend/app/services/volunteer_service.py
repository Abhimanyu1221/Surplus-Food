from app.config.database import get_db
from app.models.base_models import VolunteerModel
from app.core.security import hash_password
from fastapi import HTTPException

async def create_volunteer(data: dict) -> dict:
    db = get_db()

    if await db["volunteers"].find_one({"phone": data["phone"]}):
        raise HTTPException(status_code=400, detail="A volunteer with this phone number already exists.")

    data["password"] = hash_password(data["password"])

    volunteer = VolunteerModel(**data)
    volunteer_dict = volunteer.dict(by_alias=True, exclude_none=True)
    if "_id" in volunteer_dict and volunteer_dict["_id"] is None:
        del volunteer_dict["_id"]

    result = await db["volunteers"].insert_one(volunteer_dict)
    created = await db["volunteers"].find_one({"_id": result.inserted_id})
    if created:
        created["id"] = str(created["_id"])
        created.pop("password", None)
    return created
