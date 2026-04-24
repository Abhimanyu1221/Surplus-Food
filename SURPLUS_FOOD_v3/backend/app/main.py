from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config.database import connect_to_mongo, close_mongo_connection
from app.routes import hotel_routes, ngo_routes, food_routes, auth_routes, volunteer_routes
from app.scheduler import start_scheduler, stop_scheduler

app = FastAPI(
    title="Surplus Food Redistribution API",
    description="API for connecting hotels with NGOs/volunteers for surplus food pickup",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(hotel_routes.router)
app.include_router(ngo_routes.router)
app.include_router(food_routes.router)
app.include_router(volunteer_routes.router)


@app.on_event("startup")
async def startup():
    await connect_to_mongo()
    start_scheduler()          # ← APScheduler: auto-expire food listings


@app.on_event("shutdown")
async def shutdown():
    stop_scheduler()
    await close_mongo_connection()


@app.get("/")
def read_root():
    return {"message": "Surplus Food Redistribution API v2.0 — JWT + bcrypt + APScheduler"}
