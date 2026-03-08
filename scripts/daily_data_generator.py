import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Load base datasets
train_master = pd.read_csv("datasets/master_train_data.csv")
jobcards = pd.read_csv("datasets/jobcard_status.csv")
fitness = pd.read_csv("datasets/fitness_certificates.csv")
cleaning = pd.read_csv("datasets/cleaning_detailing.csv")
mileage = pd.read_csv("datasets/mileage_balancing.csv")
branding = pd.read_csv("datasets/branding_priorities.csv")
stabling = pd.read_csv("datasets/stabling_geometry.csv")

days = 90
start_date = datetime(2026, 1, 1)

records = []

for day in range(days):

    date = start_date + timedelta(days=day)

    for _, train in train_master.iterrows():

        train_id = train["Train_ID"]

        open_jobs = np.random.randint(0, 4)

        fitness_valid = np.random.choice([0,1], p=[0.1,0.9])

        mileage_today = np.round(np.random.uniform(150, 350), 3)
        
        cleaning_required = np.random.choice([0,1])

        branding_priority = np.random.randint(0,5)

        shunting_time = np.random.randint(0,10)

        records.append({
            "date": date,
            "train_id": train_id,
            "open_jobs": open_jobs,
            "fitness_valid": fitness_valid,
            "mileage_today": mileage_today,
            "cleaning_required": cleaning_required,
            "branding_priority": branding_priority,
            "shunting_time": shunting_time
        })

df = pd.DataFrame(records)

df.to_csv("generated/train_daily_profile.csv", index=False)

print("Generated 90 days operational data")