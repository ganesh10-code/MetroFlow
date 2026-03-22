import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
MODEL_PATH = os.getenv("MODEL_PATH", "models/risk_model.pkl")

# Basic validation to alert the developer
if not DATABASE_URL:
    print("WARNING: DATABASE_URL is not set. Database operations will fail.")