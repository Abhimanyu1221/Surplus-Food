from fastapi import APIRouter, HTTPException
from app.schemas.auth_schemas import LoginRequest, LoginResponse
from app.config.database import get_db
from app.core.security import verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])

ROLE_COLLECTION = {
    "hotel":     "hotels",
    "ngo":       "ngos",
    "volunteer": "volunteers",
}


@router.post("/login", response_model=LoginResponse)
async def login(credentials: LoginRequest):
    db = get_db()

    collection_name = ROLE_COLLECTION.get(credentials.role)
    if not collection_name:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'hotel', 'ngo', or 'volunteer'.")

    user = await db[collection_name].find_one({"phone": credentials.phone})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid phone number or password.")

    # Support plain-text passwords for legacy accounts (no 'password' field stored).
    # New registrations always store a bcrypt hash.
    stored_password = user.get("password", "")
    if stored_password.startswith("$2"):
        # bcrypt hash — verify properly
        if not verify_password(credentials.password, stored_password):
            raise HTTPException(status_code=401, detail="Invalid phone number or password.")
    else:
        # Legacy plain-text fallback (remove once all accounts migrated)
        if credentials.password != stored_password:
            raise HTTPException(status_code=401, detail="Invalid phone number or password.")

    token = create_access_token({"sub": str(user["_id"]), "role": credentials.role})

    return {
        "id":           str(user["_id"]),
        "name":         user["name"],
        "phone":        user["phone"],
        "role":         credentials.role,
        "address":      user.get("address"),
        "access_token": token,
        "token_type":   "bearer",
    }
