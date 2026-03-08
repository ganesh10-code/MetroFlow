import pandas as pd
from sqlalchemy import create_engine
from config import DATABASE_URL

engine = create_engine(DATABASE_URL)

def load_data():

    datasets = {
        "train_master": "datasets/master_train_data.csv",
        "jobcard_status": "datasets/jobcard_status.csv",
        "fitness_certificates": "datasets/fitness_certificates.csv",
        "mileage_balancing": "datasets/mileage_balancing.csv",
        "cleaning_detailing": "datasets/cleaning_detailing.csv",
        "branding_priorities": "datasets/branding_priorities.csv",
        "stabling_geometry": "datasets/stabling_geometry.csv",
        "train_daily_profile": "generated/train_daily_profile.csv"
    }

    for table, file in datasets.items():

        df = pd.read_csv(file)

        df.to_sql(
            table,
            engine,
            if_exists="replace",
            index=False
        )

        print(f"{table} loaded")

if __name__ == "__main__":
    load_data()