"""
Food service — all DB operations for food listings.

Key improvements over v2:
  1. MongoDB $lookup aggregation replaces every N+1 manual enrichment loop.
  2. expiry_hours stored on each listing (max 6h, user-chosen); expires_at
     is computed at insert time.  APScheduler (see scheduler.py) flips status
     to "expired" when that timestamp is crossed.
"""
import random
from datetime import datetime, timedelta
from bson import ObjectId
from fastapi import HTTPException
from app.config.database import get_db
from app.models.base_models import FoodModel


# ── helpers ───────────────────────────────────────────────────────────────────

def _oid(s: str) -> ObjectId:
    try:
        return ObjectId(s)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid id: {s}")


def _stringify(doc: dict) -> dict:
    """Add string 'id' from '_id' ObjectId in-place and return doc."""
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
    return doc


# ── $lookup pipelines ─────────────────────────────────────────────────────────

def _pipeline_with_hotel(match: dict) -> list:
    """
    Aggregate foods with hotel info joined via $lookup.
    Replaces the N+1 pattern: for f in foods: find_one(hotel_id).
    """
    return [
        {"$match": match},
        {
            "$addFields": {
                "hotel_oid": {"$toObjectId": "$hotel_id"}
            }
        },
        {
            "$lookup": {
                "from":         "hotels",
                "localField":   "hotel_oid",
                "foreignField": "_id",
                "as":           "_hotel",
            }
        },
        {"$unwind": {"path": "$_hotel", "preserveNullAndEmptyArrays": True}},
        {
            "$addFields": {
                "hotel_name":    "$_hotel.name",
                "hotel_address": "$_hotel.address",
                "hotel_phone":   "$_hotel.phone",
            }
        },
        {"$project": {"_hotel": 0, "hotel_oid": 0}},
    ]


def _pipeline_hotel_foods(match: dict) -> list:
    """
    Aggregate a hotel's own foods, joining NGO + Volunteer info via $lookup.
    Replaces the triple N+1 in get_foods_by_hotel.
    """
    return [
        {"$match": match},
        # ── join hotel (for completeness) ──────────────────────────────────
        {"$addFields": {"hotel_oid": {"$toObjectId": "$hotel_id"}}},
        {
            "$lookup": {
                "from":         "hotels",
                "localField":   "hotel_oid",
                "foreignField": "_id",
                "as":           "_hotel",
            }
        },
        {"$unwind": {"path": "$_hotel", "preserveNullAndEmptyArrays": True}},
        # ── join NGO ────────────────────────────────────────────────────────
        {
            "$addFields": {
                "ngo_oid": {
                    "$cond": [
                        {"$ifNull": ["$locked_by.ngo_id", False]},
                        {"$toObjectId": "$locked_by.ngo_id"},
                        None,
                    ]
                }
            }
        },
        {
            "$lookup": {
                "from":         "ngos",
                "localField":   "ngo_oid",
                "foreignField": "_id",
                "as":           "_ngo",
            }
        },
        {"$unwind": {"path": "$_ngo", "preserveNullAndEmptyArrays": True}},
        # ── join Volunteer ──────────────────────────────────────────────────
        {
            "$addFields": {
                "vol_oid": {
                    "$cond": [
                        {"$ifNull": ["$locked_by.volunteer_id", False]},
                        {"$toObjectId": "$locked_by.volunteer_id"},
                        None,
                    ]
                }
            }
        },
        {
            "$lookup": {
                "from":         "volunteers",
                "localField":   "vol_oid",
                "foreignField": "_id",
                "as":           "_vol",
            }
        },
        {"$unwind": {"path": "$_vol", "preserveNullAndEmptyArrays": True}},
        # ── shape output ────────────────────────────────────────────────────
        {
            "$addFields": {
                "hotel_name":      "$_hotel.name",
                "hotel_address":   "$_hotel.address",
                "hotel_phone":     "$_hotel.phone",
                "ngo_name":        "$_ngo.name",
                "ngo_phone":       "$_ngo.phone",
                "volunteer_name":  "$_vol.name",
                "volunteer_phone": "$_vol.phone",
            }
        },
        {"$project": {"_hotel": 0, "hotel_oid": 0, "_ngo": 0, "ngo_oid": 0, "_vol": 0, "vol_oid": 0}},
    ]


# ── service functions ─────────────────────────────────────────────────────────

async def add_food_listing(food_data: dict) -> dict:
    db = get_db()

    # Grab hotel's region
    hotel = await db["hotels"].find_one({"_id": _oid(food_data["hotel_id"])})
    food_data["region"] = hotel.get("region", "Unknown") if hotel else "Unknown"

    # Compute expires_at from user-chosen expiry_hours (already validated ≤6 in schema)
    expiry_hours = float(food_data.get("expiry_hours", 6.0))
    food_data["expires_at"] = datetime.utcnow() + timedelta(hours=expiry_hours)

    food = FoodModel(**food_data)
    food_dict = food.dict(by_alias=True, exclude_none=True)
    food_dict["expiry_hours"] = expiry_hours          # persist even if not on model directly
    food_dict["expires_at"]   = food_data["expires_at"]
    if "_id" in food_dict and food_dict["_id"] is None:
        del food_dict["_id"]

    result = await db["foods"].insert_one(food_dict)
    created = await db["foods"].find_one({"_id": result.inserted_id})
    return _stringify(created) if created else {}


async def get_all_available_food() -> list:
    db = get_db()
    pipeline = _pipeline_with_hotel({"status": "available"})
    foods = await db["foods"].aggregate(pipeline).to_list(length=100)
    return [_stringify(f) for f in foods]


async def get_foods_by_hotel(hotel_id: str) -> list:
    db = get_db()
    pipeline = _pipeline_hotel_foods({"hotel_id": hotel_id})
    foods = await db["foods"].aggregate(pipeline).to_list(length=100)
    return [_stringify(f) for f in foods]


async def get_foods_by_region(region: str) -> list:
    db = get_db()
    pipeline = _pipeline_with_hotel({"status": "available", "region": region})
    foods = await db["foods"].aggregate(pipeline).to_list(length=100)
    return [_stringify(f) for f in foods]


async def get_foods_by_volunteer(volunteer_id: str) -> list:
    db = get_db()
    pipeline = _pipeline_with_hotel({"locked_by.volunteer_id": volunteer_id})
    foods = await db["foods"].aggregate(pipeline).to_list(length=100)
    return [_stringify(f) for f in foods]


async def lock_food(food_id: str, ngo_id: str) -> dict:
    db = get_db()
    food = await db["foods"].find_one({"_id": _oid(food_id)})
    if not food:
        raise HTTPException(status_code=404, detail="Food listing not found")
    if food.get("status") != "available":
        raise HTTPException(status_code=400, detail="Food is not available for pickup")

    otp_code = str(random.randint(1000, 9999))
    await db["foods"].update_one(
        {"_id": _oid(food_id)},
        {"$set": {
            "status":    "locked",
            "otp_code":  otp_code,
            "locked_by": {"ngo_id": ngo_id, "volunteer_id": None},
        }}
    )
    updated = await db["foods"].find_one({"_id": _oid(food_id)})
    updated["otp_code"] = otp_code
    return _stringify(updated)


async def verify_pickup_otp(food_id: str, otp_code: str) -> dict:
    db = get_db()
    food = await db["foods"].find_one({"_id": _oid(food_id)})
    if not food:
        raise HTTPException(status_code=404, detail="Food listing not found")
    if food.get("status") != "locked":
        raise HTTPException(status_code=400, detail="Food is not locked")
    if food.get("otp_code") != otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP code")

    await db["foods"].update_one(
        {"_id": _oid(food_id)},
        {"$set": {"status": "picked", "picked_at": datetime.utcnow()}}
    )
    updated = await db["foods"].find_one({"_id": _oid(food_id)})
    return _stringify(updated)


async def claim_food_as_volunteer(food_id: str, volunteer_id: str) -> dict:
    db = get_db()
    food = await db["foods"].find_one({"_id": _oid(food_id)})
    if not food:
        raise HTTPException(status_code=404, detail="Food listing not found")
    if food.get("status") != "available":
        raise HTTPException(status_code=400, detail="Food is not available — it may have already been claimed.")

    otp_code = str(random.randint(1000, 9999))
    await db["foods"].update_one(
        {"_id": _oid(food_id)},
        {"$set": {
            "status":    "locked",
            "otp_code":  otp_code,
            "locked_by": {"ngo_id": None, "volunteer_id": volunteer_id},
        }}
    )
    updated = await db["foods"].find_one({"_id": _oid(food_id)})
    updated["otp_code"] = otp_code
    return _stringify(updated)


# ── expiry job (called by APScheduler) ───────────────────────────────────────

async def expire_stale_listings() -> int:
    """
    Mark all 'available' listings whose expires_at ≤ now as 'expired'.
    Returns the number of documents updated.
    """
    db = get_db()
    result = await db["foods"].update_many(
        {
            "status":     "available",
            "expires_at": {"$lte": datetime.utcnow()},
        },
        {"$set": {"status": "expired"}}
    )
    return result.modified_count
