import pandas as pd
import numpy as np
import os
from datetime import datetime, timedelta


def generate_daily_data():

    PROJECT_ROOT = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..")
    )

    DATASET_PATH = os.path.join(PROJECT_ROOT, "datasets", "master_train_data.csv")
    GENERATED_PATH = os.path.join(PROJECT_ROOT, "generated", "synthetic_daily_features.csv")

    # 🔥 Safety check
    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(f"❌ master_train_data.csv not found at: {DATASET_PATH}")
    
    # ✅ Skip if exists
    if os.path.exists(GENERATED_PATH):
        print("⏭️ Synthetic data already exists → skipping")
        return

    print("📊 Generating synthetic daily data...")


    train_master = pd.read_csv(DATASET_PATH)

    days = 90
    start_date = datetime(2026, 1, 1)

    records = []
    train_state = {}

    for _, train in train_master.iterrows():
        train_id = train["Train_ID"]

        train_state[train_id] = {
            "open_jobs": np.random.randint(0, 2),
            "mileage_since_maintenance": np.random.randint(0, 3000),
            "days_since_clean": np.random.randint(0, 5)
        }

    for day in range(days):
        date = start_date + timedelta(days=day)

        for _, train in train_master.iterrows():
            train_id = train["Train_ID"]
            state = train_state[train_id]

            # -------------------
            # Maintenance
            # -------------------
            open_jobs = max(0, state["open_jobs"] + np.random.choice([0, 1]))
            urgency_level = np.random.choice(["LOW", "MEDIUM", "HIGH"])

            # -------------------
            # Mileage
            # -------------------
            mileage_today = np.random.uniform(150, 320)
            state["mileage_since_maintenance"] += mileage_today

            # -------------------
            # Cleaning
            # -------------------
            state["days_since_clean"] += 1
            days_since_clean = state["days_since_clean"]
            cleaning_required = 1 if days_since_clean > 5 else 0

            # -------------------
            # Fitness
            # -------------------
            compliance_status = np.random.choice(["FIT", "UNSAFE"])

            # -------------------
            # Branding
            # -------------------
            branding_priority = np.random.choice([0, 1, 2, 3, 4])
            penalty_risk_level = np.random.choice(["LOW", "HIGH"])

            # -------------------
            # Operations
            # -------------------
            shunting_time = np.random.randint(1, 10)

            # -------------------
            # Risk Label
            # -------------------
            health_score = 100
            health_score -= open_jobs * 5
            health_score -= mileage_today * 0.02
            health_score -= days_since_clean * 3

            risk_label = 1 if health_score < 50 else 0

            records.append({
                "date": date,
                "train_id": train_id,

                "open_jobs": open_jobs,
                "urgency_level": urgency_level,

                "mileage_today": round(mileage_today, 2),

                "days_since_clean": days_since_clean,
                "cleaning_required": cleaning_required,

                "compliance_status": compliance_status,

                "branding_priority": branding_priority,
                "penalty_risk_level": penalty_risk_level,

                "shunting_time": shunting_time,

                "risk_label": risk_label
            })

    df = pd.DataFrame(records)

    os.makedirs(os.path.dirname(GENERATED_PATH), exist_ok=True)
    df.to_csv(GENERATED_PATH, index=False)

    print("✅ Synthetic data generated")

if __name__ == "__main__":
    generate_daily_data()