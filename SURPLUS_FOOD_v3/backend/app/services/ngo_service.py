from app.config.database import get_db
from app.models.base_models import NgoModel
from app.core.security import hash_password
from bson import ObjectId
from fastapi import HTTPException

async def create_ngo(ngo_data: dict) -> dict:
    db = get_db()

    if await db["ngos"].find_one({"phone": ngo_data["phone"]}):
        raise HTTPException(status_code=400, detail="An NGO with this phone number already exists.")

    ngo_data["password"] = hash_password(ngo_data["password"])

    ngo = NgoModel(**ngo_data)
    ngo_dict = ngo.dict(by_alias=True, exclude_none=True)
    if "_id" in ngo_dict and ngo_dict["_id"] is None:
        del ngo_dict["_id"]

    result = await db["ngos"].insert_one(ngo_dict)
    created_ngo = await db["ngos"].find_one({"_id": result.inserted_id})
    if created_ngo:
        created_ngo["id"] = str(created_ngo["_id"])
        created_ngo.pop("password", None)
    return created_ngo
