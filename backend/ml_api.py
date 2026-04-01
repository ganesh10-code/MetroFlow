import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.database import Base, engine
from app.api.auth import auth_router
from app.api.users import users_router
from app.api.maintenance import maintenance_router
from app.api.fitness import fitness_router
from app.api.branding import branding_router
from app.api.planner import planner_router
from ml.planner_engine import generate_plan


# Create tables (resilient to external changes)
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Postgres constraint check failed (this is normal if Ganesh is updating schemas): {e}")

app = FastAPI(title="MetroFlow Application Layer")



# 🔥 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:5174", 
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 🔥 Routers
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(users_router, prefix="/users", tags=["users"])
app.include_router(maintenance_router, prefix="/maintenance", tags=["maintenance"])
app.include_router(fitness_router, prefix="/fitness", tags=["fitness"])
app.include_router(branding_router, prefix="/branding", tags=["branding"])
app.include_router(planner_router, prefix="/planner", tags=["planner"])


# ✅ Root
@app.get("/")
def root():
    return {
        "message": "MetroFlow AI Backend Running",
        "endpoints": {
            "/trains": "Get master train data",
            "/daily_data": "Get latest daily data",
            "/generate_plan": "Generate maintenance plan"
        }
    }


# ✅ 1. Get Master Train Data
@app.get("/trains")
def get_trains():
    try:
        query = text("SELECT * FROM master_train_data")
        df = pd.read_sql(query, engine)
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ✅ 2. Get Daily Data (LATEST DAY ONLY)
@app.get("/daily_data")
def get_daily_data(limit: int = 50):
    try:
        query = text("""
            SELECT *
            FROM train_daily_profile
            WHERE date = (SELECT MAX(date) FROM train_daily_profile)
            LIMIT :limit
        """)

        df = pd.read_sql(query, engine, params={"limit": limit})
        return df.to_dict(orient="records")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ✅ 3. Generate Plan
@app.get("/generate_plan")
def get_plan():
    try:
        plan = generate_plan()
        return {
            "message": "Plan generated successfully",
            "data": plan.to_dict(orient="records")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))