import pandas as pd
from sqlalchemy import create_engine, text
from config import DATABASE_URL
import os
import sys

if not DATABASE_URL:
    print("Error: DATABASE_URL is not set. Cannot run pipeline.")
    sys.exit(1)

engine = create_engine(DATABASE_URL)

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

    # Safe ingestion: Delete existing rows in reverse dependency order instead of dropping tables
    with engine.begin() as conn:
        for table in reversed(list(datasets.keys())):
            try:
                # Using DELETE instead of TRUNCATE to avoid CASCADE issues if not supported
                conn.execute(text(f"DELETE FROM {table}"))
            except Exception as e:
                pass # Table might not exist yet if created by pandas dynamically

    for table, file in datasets.items():
        if not os.path.exists(file):
            print(f"Warning: File {file} not found. Skipping.")
            continue
            
        df = pd.read_csv(file)
        
        # Normalize columns: lower case and replace dashes/spaces with underscores to match schema.sql
        df.columns = [col.lower().replace('-', '_').replace(' ', '_') for col in df.columns]
        
        try:
            df.to_sql(
                table,
                engine,
                if_exists="append",
                index=False
            )
            print(f"✅ {table} loaded safely with constraints preserved")
        except Exception as e:
            print(f"❌ Failed to load {table}: {e}")

if __name__ == "__main__":
    print("Starting safe data ingestion pipeline...")
    load_data()
    print("Ingestion complete.")