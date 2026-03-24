from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import Base, engine
from app.api.auth import auth_router
from app.api.users import users_router
from app.api.maintenance import maintenance_router
from app.api.fitness import fitness_router
from app.api.branding import branding_router
from app.api.planner import planner_router

# Create uncreated tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="MetroFlow Application Layer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(users_router, prefix="/users", tags=["users"])
app.include_router(maintenance_router, prefix="/maintenance", tags=["maintenance"])
app.include_router(fitness_router, prefix="/fitness", tags=["fitness"])
app.include_router(branding_router, prefix="/branding", tags=["branding"])
app.include_router(planner_router, prefix="/planner", tags=["planner"])

@app.get("/")
def read_root():
    return {"message": "MetroFlow Application Backend is running"}
