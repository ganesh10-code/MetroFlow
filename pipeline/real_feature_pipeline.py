import pandas as pd
from sqlalchemy import create_engine, text
import os
from datetime import datetime
from zoneinfo import ZoneInfo

from backend.ml.config import DATABASE_URL

engine = create_engine(DATABASE_URL)

IST = ZoneInfo("Asia/Kolkata")


def ist_now():
    return datetime.now(IST)


def ist_today():
    return ist_now().date()


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
            log_date DATE DEFAULT CURRENT_DATE,
            train_id VARCHAR NOT NULL,
            open_jobs INT,
            urgency_level VARCHAR,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (log_date, train_id)
        );
        """))

        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS cleaning_logs (
            id SERIAL PRIMARY KEY,
            log_date DATE DEFAULT CURRENT_DATE,
            train_id VARCHAR NOT NULL,
            cleaning_done BOOLEAN,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (log_date, train_id)
        );
        """))

        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS fitness_logs (
            id SERIAL PRIMARY KEY,
            log_date DATE DEFAULT CURRENT_DATE,
            train_id VARCHAR NOT NULL,
            compliance_status VARCHAR,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (log_date, train_id)
        );
        """))

        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS branding_logs (
            id SERIAL PRIMARY KEY,
            log_date DATE DEFAULT CURRENT_DATE,
            train_id VARCHAR NOT NULL,
            branding_priority INT,
            penalty_risk_level VARCHAR,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (log_date, train_id)
        );
        """))

        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS operations_control_room (
            id SERIAL PRIMARY KEY,
            log_date DATE DEFAULT CURRENT_DATE,
            run_count INT NOT NULL,
            standby_count INT NOT NULL,
            maintenance_count INT NOT NULL,
            updated_by VARCHAR,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (log_date)
        ); 
        """))

        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS mileage_logs (
            id SERIAL PRIMARY KEY,
            log_date DATE NOT NULL,
            train_id VARCHAR NOT NULL,
            mileage_today FLOAT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (log_date, train_id)
        );
        """))

        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS real_daily_features (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        train_id VARCHAR NOT NULL,
        open_jobs INT,
        urgency_level VARCHAR,

        mileage_today FLOAT,

        days_since_clean INT,
        cleaning_required INT,

        compliance_status VARCHAR,

        branding_priority INT,
        penalty_risk_level VARCHAR,

        shunting_time INT,

        risk_label INT,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT uq_real_daily_features
        UNIQUE (date, train_id)
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

    today = ist_today()
    now = ist_now()

    with engine.begin() as conn:

        # =====================================================
        # 1. MASTER TABLE CHECK
        # =====================================================
        if not table_exists(conn, "master_train_data"):
            print("❌ master_train_data missing")
            return

        # =====================================================
        # 2. REQUIRE ALL DEPARTMENTS FULL SUBMISSION
        # =====================================================
        fleet_count = conn.execute(text("""
            SELECT COUNT(*)
            FROM master_train_data
        """)).scalar()

        counts = conn.execute(text("""
            SELECT
            (SELECT COUNT(DISTINCT train_id)
             FROM maintenance_logs
             WHERE log_date=:today),

            (SELECT COUNT(DISTINCT train_id)
             FROM cleaning_logs
             WHERE log_date=:today),

            (SELECT COUNT(DISTINCT train_id)
             FROM fitness_logs
             WHERE log_date=:today),

            (SELECT COUNT(DISTINCT train_id)
             FROM branding_logs
             WHERE log_date=:today),

            (SELECT COUNT(DISTINCT train_id)
             FROM mileage_logs
             WHERE log_date=:today)
        """), {
            "today": today
        }).fetchone()

        all_ready = all(
            int(x or 0) >= int(fleet_count)
            for x in counts
        )

        if not all_ready:
            print("⏭️ Incomplete department logs → skipping REAL generation")
            return

        # =====================================================
        # 3. FETCH MASTER TRAINS
        # =====================================================
        trains = conn.execute(text("""
            SELECT
                train_id,
                track_id,
                position,
                estimated_shunting_time_minutes
            FROM master_train_data
            ORDER BY train_id
        """)).fetchall()

        total_rows = 0

        # =====================================================
        # 4. LOOP EACH TRAIN
        # =====================================================
        for t in trains:

            train_id = t[0]
            track_id = t[1]
            position = t[2] or 1
            estimated_time = t[3] or 5

            # -------------------------------------------------
            # MAINTENANCE
            # -------------------------------------------------
            maint = conn.execute(text("""
                SELECT
                    open_jobs,
                    urgency_level
                FROM maintenance_logs
                WHERE log_date = :today
                AND train_id = :tid
                LIMIT 1
            """), {
                "today": today,
                "tid": train_id
            }).fetchone()

            if not maint:
                continue

            open_jobs = maint[0]
            urgency_level = maint[1]

            # -------------------------------------------------
            # CLEANING
            # -------------------------------------------------
            clean = conn.execute(text("""
                SELECT
                    log_date,
                    cleaning_done
                FROM cleaning_logs
                WHERE train_id = :tid
                ORDER BY log_date DESC
                LIMIT 1
            """), {
                "tid": train_id
            }).fetchone()

            if not clean:
                continue

            last_clean_date = clean[0]
            cleaning_done = clean[1]

            days_since_clean = (today - last_clean_date).days

            cleaning_required = (
                0 if cleaning_done else
                1 if days_since_clean >= 5 else 0
            )

            # -------------------------------------------------
            # FITNESS
            # -------------------------------------------------
            fitness = conn.execute(text("""
                SELECT compliance_status
                FROM fitness_logs
                WHERE log_date = :today
                AND train_id = :tid
                LIMIT 1
            """), {
                "today": today,
                "tid": train_id
            }).fetchone()

            if not fitness:
                continue

            compliance_status = fitness[0]

            # -------------------------------------------------
            # BRANDING
            # -------------------------------------------------
            branding = conn.execute(text("""
                SELECT
                    branding_priority,
                    penalty_risk_level
                FROM branding_logs
                WHERE log_date = :today
                AND train_id = :tid
                LIMIT 1
            """), {
                "today": today,
                "tid": train_id
            }).fetchone()

            if not branding:
                continue

            branding_priority = branding[0]
            penalty_risk_level = branding[1]

            # -------------------------------------------------
            # OCR MILEAGE
            # -------------------------------------------------
            mileage = conn.execute(text("""
                SELECT mileage_today
                FROM mileage_logs
                WHERE log_date = :today
                AND train_id = :tid
                LIMIT 1
            """), {
                "today": today,
                "tid": train_id
            }).fetchone()

            mileage_today = mileage[0] if mileage else 0

            # -------------------------------------------------
            # DYNAMIC SHUNTING TIME
            # Formula:
            # estimated + congestion + maintenance
            # -------------------------------------------------

            congestion_count = conn.execute(text("""
                SELECT COUNT(*)
                FROM master_train_data
                WHERE track_id = :track
                AND position < :pos
            """), {
                "track": track_id,
                "pos": position
            }).scalar()

            congestion_factor = congestion_count * 2

            if str(urgency_level).upper() == "HIGH":
                maintenance_factor = 6
            elif str(urgency_level).upper() == "MEDIUM":
                maintenance_factor = 3
            else:
                maintenance_factor = 0

            final_shunting_time = (
                estimated_time
                + congestion_factor
                + maintenance_factor
            )

            # -------------------------------------------------
            # RISK LABEL
            # -------------------------------------------------
            risk_label = 0

            if str(urgency_level).upper() == "HIGH":
                risk_label += 1

            if str(compliance_status).upper() != "FIT":
                risk_label += 1

            if cleaning_required == 1:
                risk_label += 1

            if str(penalty_risk_level).upper() == "HIGH":
                risk_label += 1

            # -------------------------------------------------
            # UPSERT INTO real_daily_features
            # -------------------------------------------------
            conn.execute(text("""
                INSERT INTO real_daily_features(
                    date,
                    train_id,
                    open_jobs,
                    urgency_level,
                    mileage_today,
                    days_since_clean,
                    cleaning_required,
                    compliance_status,
                    branding_priority,
                    penalty_risk_level,
                    shunting_time,
                    risk_label,
                    created_at,
                    updated_at
                )
                VALUES(
                    :date,
                    :train_id,
                    :open_jobs,
                    :urgency_level,
                    :mileage_today,
                    :days_since_clean,
                    :cleaning_required,
                    :compliance_status,
                    :branding_priority,
                    :penalty_risk_level,
                    :shunting_time,
                    :risk_label,
                    :created_at,
                    :updated_at
                )

                ON CONFLICT (date, train_id)

                DO UPDATE SET
                    open_jobs = EXCLUDED.open_jobs,
                    urgency_level = EXCLUDED.urgency_level,
                    mileage_today = EXCLUDED.mileage_today,
                    days_since_clean = EXCLUDED.days_since_clean,
                    cleaning_required = EXCLUDED.cleaning_required,
                    compliance_status = EXCLUDED.compliance_status,
                    branding_priority = EXCLUDED.branding_priority,
                    penalty_risk_level = EXCLUDED.penalty_risk_level,
                    shunting_time = EXCLUDED.shunting_time,
                    risk_label = EXCLUDED.risk_label,
                    updated_at = EXCLUDED.updated_at
            """), {
                "date": today,
                "train_id": train_id,
                "open_jobs": open_jobs,
                "urgency_level": urgency_level,
                "mileage_today": mileage_today,
                "days_since_clean": days_since_clean,
                "cleaning_required": cleaning_required,
                "compliance_status": compliance_status,
                "branding_priority": branding_priority,
                "penalty_risk_level": penalty_risk_level,
                "shunting_time": final_shunting_time,
                "risk_label": risk_label,
                "created_at": now,
                "updated_at": now
            })

            total_rows += 1

        print(
            f"✅ real_daily_features upsert completed ({total_rows} rows)"
        )