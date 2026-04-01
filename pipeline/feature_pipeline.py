import pandas as pd
from sqlalchemy import create_engine, text
from config import DATABASE_URL
import os
import sys

if not DATABASE_URL:
    print("❌ Error: DATABASE_URL is not set.")
    sys.exit(1)

engine = create_engine(DATABASE_URL)


# -------------------------------
# Check if table exists
# -------------------------------
def table_exists(conn, table_name):
    result = conn.execute(text(f"""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = '{table_name}'
        );
    """))
    return result.scalar()


# -------------------------------
# Create schema (only once)
# -------------------------------
def create_schema_if_needed():
    with engine.connect() as conn:
        if not table_exists(conn, "master_train_data"):
            print("📄 Tables not found → Creating schema...")

            with open("database/schema.sql", "r") as f:
                schema_sql = f.read()

            conn.execute(text(schema_sql))
            print("✅ Schema created")
        else:
            print("✅ Tables already exist → Skipping schema creation")


# -------------------------------
# Clear ONLY dynamic tables
# -------------------------------
def clear_dynamic_data():
    dynamic_tables = [
        "plan_details",
        "plans",
        "train_daily_profile"
    ]

    with engine.begin() as conn:
        for table in dynamic_tables:
            try:
                conn.execute(text(f"DELETE FROM {table}"))
                print(f"🧹 Cleared {table}")
            except Exception:
                print(f"⚠️ Skip {table} (may not exist)")


# -------------------------------
# Load data smartly
# -------------------------------
def load_data():

    datasets = {
        "master_train_data": "datasets/master_train_data.csv",
        "jobcard_status": "datasets/jobcard_status.csv",
        "fitness_certificates": "datasets/fitness_certificates.csv",
        "mileage_balancing": "datasets/mileage_balancing.csv",
        "cleaning_detailing": "datasets/cleaning_detailing.csv",
        "branding_priorities": "datasets/branding_priorities.csv",
        "stabling_geometry": "datasets/stabling_geometry.csv",
        "train_daily_profile": "generated/train_daily_profile.csv"
    }

    with engine.connect() as conn:

        for table, file in datasets.items():

            if not os.path.exists(file):
                print(f"⚠️ File missing: {file}")
                continue

            # -------------------------------
            # Skip STATIC tables if already loaded
            # -------------------------------
            if table != "train_daily_profile":
                try:
                    result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    if result.scalar() > 0:
                        print(f"⏭️ Skipping {table} (already loaded)")
                        continue
                except Exception:
                    pass

            # -------------------------------
            # Load CSV
            # -------------------------------
            df = pd.read_csv(file)

            # Normalize column names
            df.columns = [
                col.lower().replace('-', '_').replace(' ', '_')
                for col in df.columns
            ]

            print(f"\n📦 Loading {table}")
            print(f"Columns: {list(df.columns)}")

            try:
                df.to_sql(
                    table,
                    engine,
                    if_exists="append",
                    index=False
                )
                print(f"✅ {table} inserted")

            except Exception as e:
                print(f"❌ ERROR in {table}: {e}")


# -------------------------------
# MAIN EXECUTION
# -------------------------------
if __name__ == "__main__":
    print("🚀 Starting smart pipeline...")

    create_schema_if_needed()
    clear_dynamic_data()
    load_data()

    print("\n✅ Pipeline completed successfully.")