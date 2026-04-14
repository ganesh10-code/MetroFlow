import os
from dotenv import load_dotenv

load_dotenv()

# 🔥 Absolute project root
PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..")
)

DATABASE_URL = os.getenv("DATABASE_URL")

# 🔥 Absolute model path
MODEL_PATH = os.path.join(
    PROJECT_ROOT,
    "trained_models",
    "risk_model.pkl"
)

# Basic validation to alert the developer
if not DATABASE_URL:
    print("WARNING: DATABASE_URL is not set. Database operations will fail.")

if not os.path.exists(os.path.dirname(MODEL_PATH)):
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)