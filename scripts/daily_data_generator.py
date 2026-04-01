import pandas as pd
import numpy as np
import os
from datetime import datetime, timedelta

train_master = pd.read_csv("datasets/master_train_data.csv")

os.makedirs("generated", exist_ok=True)

days = 90
start_date = datetime(2026, 1, 1)

records = []
train_state = {}

# 🔹 Initialize state
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

        # 🔥 1. JOB DYNAMICS
        if state["open_jobs"] > 3:
            state["open_jobs"] -= 1
        else:
            state["open_jobs"] += np.random.choice([0, 1])

        # occasional spike
        if np.random.rand() < 0.1:
            state["open_jobs"] += np.random.randint(1, 3)

        open_jobs = max(0, state["open_jobs"])

        # 🔥 2. MILEAGE
        mileage_today = np.random.uniform(150, 320)
        state["mileage_since_maintenance"] += mileage_today

        # 🔥 3. CLEANING
        state["days_since_clean"] += 1
        cleaning_required = 1 if state["days_since_clean"] > 5 else 0

        if cleaning_required and np.random.rand() < 0.4:
            state["days_since_clean"] = 0

        # 🔥 4. HIDDEN HEALTH SCORE (CRITICAL FIX)
        health_score = 100

        health_score -= open_jobs * 6
        health_score -= state["mileage_since_maintenance"] * 0.003
        health_score -= state["days_since_clean"] * 4

        # add randomness (noise)
        health_score += np.random.uniform(-10, 10)

        # 🔥 FINAL TARGET (NOT DIRECTLY DERIVABLE)
        risk_label = 1 if health_score < 50 else 0

        # add label noise (very important)
        if np.random.rand() < 0.05:
            risk_label = 1 - risk_label

        # 🔥 Branding
        branding_priority = np.random.choice(
            [0, 1, 2, 3, 4],
            p=[0.4, 0.25, 0.2, 0.1, 0.05]
        )

        # 🔥 Shunting
        if open_jobs > 3:
            shunting_time = np.random.randint(5, 12)
        else:
            shunting_time = np.random.randint(1, 8)

        records.append({
            "date": date,
            "train_id": train_id,
            "open_jobs": open_jobs,
            "mileage_today": round(mileage_today, 2),
            "cleaning_required": cleaning_required,
            "branding_priority": branding_priority,
            "shunting_time": shunting_time,
            "risk_label": risk_label   # 🔥 IMPORTANT
        })

df = pd.DataFrame(records)

df.to_csv("generated/train_daily_profile.csv", index=False)

print("✅ Generated ML-safe realistic data")