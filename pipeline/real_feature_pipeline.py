import pandas as pd
from sqlalchemy import create_engine, text
from datetime import datetime, date
import os

from backend.ml.config import DATABASE_URL

engine = create_engine(DATABASE_URL)


# -------------------------------
# ✅ NEW: Table existence checker
# -------------------------------
def table_exists(conn, table_name):
    result = conn.execute(text(f"""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = '{table_name}'
        );
    """))
    return result.scalar()


def ensure_log_tables():
    with engine.begin() as conn:

        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS maintenance_logs (
            id SERIAL PRIMARY KEY,
            train_id VARCHAR,
            open_jobs INT,
            urgency_level VARCHAR,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """))

        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS cleaning_logs (
            id SERIAL PRIMARY KEY,
            train_id VARCHAR,
            cleaning_done BOOLEAN,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """))

        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS fitness_logs (
            id SERIAL PRIMARY KEY,
            train_id VARCHAR,
            compliance_status VARCHAR,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """))

        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS branding_logs (
            id SERIAL PRIMARY KEY,
            train_id VARCHAR,
            branding_priority INT,
            penalty_risk_level VARCHAR,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """))

        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS real_daily_features (
            id SERIAL PRIMARY KEY,
            date DATE,
            train_id VARCHAR,

            open_jobs INT,
            urgency_level VARCHAR,

            mileage_today FLOAT,

            days_since_clean INT,
            cleaning_required INT,

            compliance_status VARCHAR,

            branding_priority INT,
            penalty_risk_level VARCHAR,

            shunting_time INT,

            risk_label INT
        );
        """))

        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS model_metadata (
            id SERIAL PRIMARY KEY,
            last_trained_at TIMESTAMP,
            data_points INT
        );
        """))

        print("✅ Log + real-time tables ensured")


def generate_real_daily_features():

    print("📊 Generating REAL daily features...")

    today = date.today()

    with engine.begin() as conn:

        # -------------------------
        # 1. Check master table
        # -------------------------
        if not table_exists(conn, "master_train_data"):
            print("❌ master_train_data missing → abort")
            return

        # -------------------------
        # 2. Check if ANY logs exist
        # -------------------------
        log_tables = [
            "maintenance_logs",
            "cleaning_logs",
            "fitness_logs",
            "branding_logs"
        ]

        logs_exist = False

        for table in log_tables:
            if table_exists(conn, table):
                count = conn.execute(
                    text(f"SELECT COUNT(*) FROM {table}")
                ).scalar()

                if count > 0:
                    logs_exist = True
                    break

        if not logs_exist:
            print("⏭️ No real-time logs → skipping real feature generation")
            return

        # -------------------------
        # 3. Fetch trains
        # -------------------------
        trains = conn.execute(
            text("SELECT train_id FROM master_train_data")
        ).fetchall()

        records = []

        for t in trains:
            train_id = t[0]

            # -------------------------
            # Maintenance (REQUIRED)
            # -------------------------
            maint = conn.execute(text("""
                SELECT open_jobs, urgency_level
                FROM maintenance_logs
                WHERE train_id = :tid
                ORDER BY created_at DESC
                LIMIT 1
            """), {"tid": train_id}).fetchone()

            if not maint:
                continue  # ❗ Skip this train completely

            # -------------------------
            # Cleaning
            # -------------------------
            clean = conn.execute(text("""
                SELECT created_at
                FROM cleaning_logs
                WHERE train_id = :tid
                ORDER BY created_at DESC
                LIMIT 1
            """), {"tid": train_id}).fetchone()

            if not clean:
                continue

            days_since_clean = (datetime.utcnow() - clean[0]).days
            cleaning_required = 1 if days_since_clean > 5 else 0

            # -------------------------
            # Fitness
            # -------------------------
            fitness = conn.execute(text("""
                SELECT compliance_status
                FROM fitness_logs
                WHERE train_id = :tid
                ORDER BY created_at DESC
                LIMIT 1
            """), {"tid": train_id}).fetchone()

            if not fitness:
                continue

            # -------------------------
            # Branding
            # -------------------------
            branding = conn.execute(text("""
                SELECT branding_priority, penalty_risk_level
                FROM branding_logs
                WHERE train_id = :tid
                ORDER BY created_at DESC
                LIMIT 1
            """), {"tid": train_id}).fetchone()

            if not branding:
                continue

            # -------------------------
            # Derived
            # -------------------------
            mileage_today = 200
            shunting_time = 5

            records.append({
                "date": today,
                "train_id": train_id,
                "open_jobs": maint[0],
                "urgency_level": maint[1],
                "mileage_today": mileage_today,
                "days_since_clean": days_since_clean,
                "cleaning_required": cleaning_required,
                "compliance_status": fitness[0],
                "branding_priority": branding[0],
                "penalty_risk_level": branding[1],
                "shunting_time": shunting_time,
                "risk_label": 0
            })

        # -------------------------
        # 4. Final check
        # -------------------------
        if not records:
            print("⏭️ No valid real data → skipping insert")
            return

        df = pd.DataFrame(records)

        df.to_sql("real_daily_features", engine, if_exists="append", index=False)

        print(f"✅ Real daily features stored ({len(df)} records)")