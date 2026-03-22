from fastapi import FastAPI, HTTPException
import pandas as pd
import joblib
from sqlalchemy import create_engine
import os
from config import DATABASE_URL, MODEL_PATH

app = FastAPI()

# Safely initialize database engine
engine = None
if DATABASE_URL:
    try:
        engine = create_engine(DATABASE_URL)
    except Exception as e:
        print(f"Failed to initialize database engine: {e}")

# Safely load ML model
model = None
if MODEL_PATH and os.path.exists(MODEL_PATH):
    try:
        model = joblib.load(MODEL_PATH)
    except Exception as e:
        print(f"Failed to load ML model: {e}")
else:
    print("WARNING: ML model not found or MODEL_PATH not set.")

@app.get("/")
def root():
    return {
        "message": "Metro AI Induction Planning API",
        "status": "Running",
        "database_connected": engine is not None,
        "model_loaded": model is not None
    }

@app.get("/trains")
def get_trains():
    if engine is None:
        raise HTTPException(status_code=500, detail="Database not configured or unreachable")
    
    try:
        df = pd.read_sql("SELECT * FROM master_train_data", engine)
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/predict_risk")
def predict():
    if engine is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    if model is None:
        raise HTTPException(status_code=500, detail="ML model not loaded")
        
    try:
        df = pd.read_sql("SELECT * FROM train_daily_profile", engine)
        
        # Ensure only the trained features are passed to the model
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))