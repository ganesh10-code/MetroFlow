import pandas as pd
from sqlalchemy import create_engine, text
import os

from backend.ml.config import DATABASE_URL
from scripts.daily_data_generator import generate_daily_data

engine = create_engine(DATABASE_URL)


# ==========================================
# TABLE CHECK
# ==========================================
def table_exists(conn, table_name):
    result = conn.execute(text(f"""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = '{table_name}'
        );
    """))
    return result.scalar()


# ==========================================
# SCHEMA CREATION
# ==========================================
def create_schema_if_needed():

    with engine.connect() as conn:

        required_tables = [
            "master_train_data",
            "jobcard_status",
            "fitness_certificates",
            "mileage_balancing",
            "cleaning_detailing",
            "branding_priorities",
            "stabling_geometry",
            "users",
            "plans",
            "plan_details",
            "synthetic_daily_features",
            "real_daily_features",
            "maintenance_logs",
            "cleaning_logs",
            "fitness_logs",
            "branding_logs"
        ]

        missing = [t for t in required_tables if not table_exists(conn, t)]

        if not missing:
            print("✅ All tables exist")
            return

        print(f"⚠️ Missing tables: {missing}")

        # 🔥 FIXED ROOT PATH
        CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
        PROJECT_ROOT = os.path.dirname(CURRENT_DIR)

        schema_path = os.path.join(PROJECT_ROOT, "database", "schema.sql")

        if not os.path.exists(schema_path):
            raise FileNotFoundError(f"❌ schema.sql not found at: {schema_path}")

        # 🔥 CASE 1: If core table missing → fresh setup
        if "master_train_data" in missing:
            print("📄 Fresh DB → creating full schema")

            with open(schema_path, "r") as f:
                conn.execute(text(f.read()))

            print("✅ Full schema created")

        else:
            # 🔥 CASE 2: Only missing tables → create individually
            print("🔧 Creating only missing tables...")

            if "synthetic_daily_features" in missing:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS synthetic_daily_features (
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

            if "real_daily_features" in missing:
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

            print("✅ Missing tables created successfully")


# ==========================================
# LOAD STATIC CSV DATA
# ==========================================
def load_data():

    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    datasets = {
        "master_train_data": os.path.join(BASE_DIR, "datasets", "master_train_data.csv"),
        "jobcard_status": os.path.join(BASE_DIR, "datasets", "jobcard_status.csv"),
        "fitness_certificates": os.path.join(BASE_DIR, "datasets", "fitness_certificates.csv"),
        "mileage_balancing": os.path.join(BASE_DIR, "datasets", "mileage_balancing.csv"),
        "cleaning_detailing": os.path.join(BASE_DIR, "datasets", "cleaning_detailing.csv"),
        "branding_priorities": os.path.join(BASE_DIR, "datasets", "branding_priorities.csv"),
        "stabling_geometry": os.path.join(BASE_DIR, "datasets", "stabling_geometry.csv"),
    }

    with engine.connect() as conn:

        for table, path in datasets.items():

            if not os.path.exists(path):
                print(f"⚠️ Missing file: {path}")
                continue

            try:
                count = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()

                if count > 0:
                    print(f"⏭️ {table} already loaded")
                    continue

            except:
                pass

            df = pd.read_csv(path)
            df.columns = [c.lower().replace(" ", "_") for c in df.columns]

            print(f"📦 Loading {table}")
            df.to_sql(table, engine, if_exists="append", index=False)
            print(f"✅ {table} loaded")


# ==========================================
# 🔥 SYNTHETIC DATA PIPELINE
# ==========================================
def load_synthetic_features():

    PROJECT_ROOT = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..")
    )
    csv_path = os.path.join(PROJECT_ROOT, "generated", "synthetic_daily_features.csv")

    with engine.begin() as conn:

        # -------------------------
        # 1. Ensure table exists (ONLY THIS TABLE)
        # -------------------------
        if not table_exists(conn, "synthetic_daily_features"):
            print("⚠️ synthetic_daily_features missing → creating ONLY this table")

            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS synthetic_daily_features (
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

        # -------------------------
        # 2. Check if data exists
        # -------------------------
        count = conn.execute(
            text("SELECT COUNT(*) FROM synthetic_daily_features")
        ).scalar()

        if count > 0:
            print("⏭️ Synthetic table already populated")
            return

        print("📊 Synthetic table empty → generating/loading data")

    # -------------------------
    # 3. Generate CSV if missing
    # -------------------------
    if not os.path.exists(csv_path):
        print("⚠️ CSV missing → generating synthetic data")
        generate_daily_data()

    if not os.path.exists(csv_path):
        print("❌ Failed to generate synthetic data")
        print(f"Expected CSV at: {csv_path}")
        return

    # -------------------------
    # 4. Load CSV into DB
    # -------------------------
    df = pd.read_csv(csv_path)

    df.columns = [
        c.lower().replace(" ", "_").replace("-", "_")
        for c in df.columns
    ]

    df.to_sql("synthetic_daily_features", engine, if_exists="append", index=False)

    print("✅ Synthetic data loaded into DB")