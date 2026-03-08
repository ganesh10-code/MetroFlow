from fastapi import FastAPI
import pandas as pd
import joblib
from sqlalchemy import create_engine
from config import DATABASE_URL, MODEL_PATH

app = FastAPI()

engine = create_engine(DATABASE_URL)

model = joblib.load(MODEL_PATH)

@app.get("/")
def root():
    return {"message": "Metro AI Induction Planning API"}

@app.get("/trains")
def get_trains():

    df = pd.read_sql("SELECT * FROM train_master", engine)

    return df.to_dict(orient="records")

@app.get("/predict_risk")
def predict():

    df = pd.read_sql("SELECT * FROM train_daily_profile", engine)

    features = df[
        [
            "open_jobs",
            "mileage_today",
            "cleaning_required",
            "branding_priority",
            "shunting_time"
        ]
    ]

    predictions = model.predict(features)

    df["risk_prediction"] = predictions

    return df.to_dict(orient="records")