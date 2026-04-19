import sys
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from contextlib import asynccontextmanager


from app.core.database import engine
from app.core.security import get_password_hash

from app.api.auth import auth_router
from app.api.users import users_router
from app.api.maintenance import maintenance_router
from app.api.fitness import fitness_router
from app.api.branding import branding_router
from app.api.planner import planner_router
from app.api.operational import operational_router
from app.api.cleaning import cleaning_router
from app.api.analytics import analytics_router
from app.api.ai_insights import ai_router
from app.api.admin_analytics import admin_analytics_router
from app.services.kafka_consumer_store import start_event_consumer, stop_event_consumer, ensure_events_log_table

# 🔥 Add project root (MetroFlow) to Python path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(BASE_DIR)

# 🔥 ML + Pipeline
from pipeline.real_feature_pipeline import generate_real_daily_features, ensure_log_tables
from ml.train_model import train_model
from scripts.daily_data_generator import generate_daily_data

from pipeline.synthetic_feature_pipeline import create_schema_if_needed, load_synthetic_features, load_data


@asynccontextmanager
async def lifespan(app: FastAPI):

    print("🚀 MetroFlow Starting...")
    consumer_started = False

    try:
        # ============================================================
        # 1️⃣ Schema + Tables
        # ============================================================
        print("📄 Ensuring schema...")
        create_schema_if_needed()
        ensure_log_tables()

        # ============================================================
        # 2️⃣ Load STATIC DATA (VERY IMPORTANT)
        # ============================================================
        print("📦 Loading static datasets...")
        load_data()   # 🔥 YOU MISSED THIS

        # ============================================================
        # 3️⃣ Users Table + Seed
        # ============================================================
        print("👤 Checking users table...")

        with engine.begin() as conn:

            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'users'
                );
            """))

            if not result.scalar():
                print("⚠️ Users table missing → creating...")

                conn.execute(text("""
                    CREATE TABLE users (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR,
                        username VARCHAR UNIQUE,
                        hashed_password VARCHAR,
                        role VARCHAR,
                        is_active BOOLEAN DEFAULT TRUE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """))

            result = conn.execute(text("SELECT COUNT(*) FROM users"))
            count = result.scalar()

            if count == 0:
                print("⚠️ Users table empty → inserting default users...")

                users = [
                    ("System Admin", "admin", "admin123", "ADMIN"),
                    ("Lead Planner", "planner", "planner123", "PLANNER"),
                    ("Maintenance Chief", "maintenance", "maintenance123", "MAINTENANCE"),
                    ("Fitness Inspector", "fitness", "fitness123", "FITNESS"),
                    ("Branding Manager", "branding", "branding123", "BRANDING"),
                    ("Cleaning Supervisor", "cleaning", "cleaning123", "CLEANING"),
                    ("Operations Controller", "operations", "operations123", "OPERATIONS")
                ]

                for name, username, password, role in users:
                    hashed_password = get_password_hash(password)

                    conn.execute(text("""
                        INSERT INTO users (name, username, hashed_password, role)
                        VALUES (:name, :username, :password, :role)
                    """), {
                        "name": name,
                        "username": username,
                        "password": hashed_password,
                        "role": role
                    })

                print("✅ Default users inserted")

        # ============================================================
        # 4️⃣ Synthetic Data (CSV + DB)
        # ============================================================
        print("📊 Preparing synthetic data...")

        generate_daily_data()            # CSV
        load_synthetic_features()       # 🔥 DB (IMPORTANT)

        # ============================================================
        # 6️⃣ ML Training (SMART)
        # ============================================================
        print("🤖 Training model (if needed)...")
        train_model()

        print("✅ System Ready 🚆")

    except Exception as e:
        print(f"❌ Startup error: {e}")

    # ============================================================
    # ALWAYS ATTEMPT KAFKA CONSUMER START
    # even if earlier startup tasks fail
    # ============================================================
    print("🧱 Ensuring events_log table...")
    try:
        ensure_events_log_table()
    except Exception as e:
        print(f"⚠️ events_log ensure warning: {e}")

    print("🔌 Starting Kafka event consumer...")
    try:
        start_event_consumer()
        consumer_started = True
        print("✅ Kafka event consumer started")
    except Exception as e:
        print(f"⚠️ Kafka consumer startup warning: {e}")

    yield
    
    # ============================================================
    # SHUTDOWN
    # ============================================================
    print("🛑 Shutting down...")
    if consumer_started:
        try:
            stop_event_consumer()
            print("✅ Kafka consumer stopped")
        except Exception as e:
            print(f"⚠️ Kafka consumer shutdown warning: {e}")
  


# ============================================================
# FASTAPI APP
# ============================================================
app = FastAPI(
    title="MetroFlow Application Layer",
    lifespan=lifespan
)


# ============================================================
# CORS
# ============================================================
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


# ============================================================
# ROUTERS
# ============================================================
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(users_router, prefix="/users", tags=["users"])
app.include_router(maintenance_router, prefix="/maintenance", tags=["maintenance"])
app.include_router(fitness_router, prefix="/fitness", tags=["fitness"])
app.include_router(branding_router, prefix="/branding", tags=["branding"])
app.include_router(planner_router, prefix="/planner", tags=["planner"])
app.include_router(cleaning_router, prefix="/cleaning", tags=["cleaning"])
app.include_router(operational_router,prefix="/operations",tags=["Operations Control Room"])
app.include_router(analytics_router, tags=["analytics"])
app.include_router(ai_router, tags=["ai"])
app.include_router(admin_analytics_router, tags=["admin-analytics"])


# ============================================================
# ROOT
# ============================================================
@app.get("/")
def read_root():
    return {
        "message": "MetroFlow Backend Running 🚆",
        "mode": "lifespan startup",
        "planner_api": "/planner/generate-plan"
    }