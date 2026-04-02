# METROFLOW [ AI-Based Train Induction Planning System ]

## Phase 1: Application Layer Complete

**Note from Development Phase 1:**
The core application framework has been built. The UI, authentication, role-based access, and APIs are ready. 
The ML Optimizer and real AI models are placeholders currently living in `backend/app/services/core_adapter.py` and `genai_adapter.py`. Generating the plan is completely decoupled so Ganesh can simply plug in the ML Core algorithm during Phase 2 without rewriting the application._

---

### 🚦 Next Steps for Ganesh (Phase 2):
1. **Core Adapter**: Provide real implementations in `backend/app/services/core_adapter.py` for generating optimization plans.
2. **GenAI Adapter**: Integrate LLM calls in `backend/app/services/genai_adapter.py` for real-time natural language explanations of the ML plans and chat functionalities.
3. Test locally with the new models! ]

## 📌 Overview

This project implements an **AI-based decision support system for metro train induction planning**.

Every night, metro operators must decide which trainsets should:

- **RUN** – enter revenue service
- **STANDBY** – remain available as backup
- **MAINTENANCE** – move to inspection or repair

The system analyzes operational data such as maintenance jobs, safety certificates, mileage usage, cleaning status, branding commitments, and depot stabling positions to assist planners in making optimal decisions.

The goal is to replace **manual spreadsheet-based planning** with a **data-driven, scalable, and explainable AI system**.

---

# 🧠 Key Features

- Data ingestion pipeline for operational datasets
- Synthetic **daily operational data generator**
- Machine learning model for **train risk prediction**
- REST API for accessing predictions
- Modular architecture ready for **optimization engine integration**

---

# ⚙️ Tech Stack

| Component              | Technology      |
| ---------------------- | --------------- |
| Backend API            | FastAPI         |
| Database               | PostgreSQL      |
| Machine Learning       | Scikit-learn    |
| Optimization (Planned) | Google OR-Tools |
| Data Processing        | Python, Pandas  |

---

# 📂 Project Structure

metroflow/

datasets/ # Raw datasets
generated/ # Generated daily operational data

database/
  schema.sql # PostgreSQL schema

scripts/
  daily_data_generator.py

pipeline/
  feature_pipeline.py # Data ingestion pipeline

ml/
  train_model.py # ML training script
  planner_engine.py # Generates the plan

backend/
  main.py # FastAPI backend

trained_models/
  risk_model.pkl # Trained ML model

requirements.txt
README.md

---

# 📊 Datasets

The system uses operational metro datasets such as:

- Train master data
- Maintenance job cards
- Safety fitness certificates
- Mileage balancing records
- Cleaning & detailing logs
- Branding contract priorities
- Depot stabling geometry

Since real historical logs are unavailable, the system generates **synthetic daily operational data** for training and experimentation.

---

# ▶️ Run Instructions
## NOTE: Make sure PostgreSQL is running, and `.env` has your `DATABASE_URL` set.

## Backend

### Create Virtual Environment and activate
```bash
py -3.11 -m venv venv
.\venv\Scripts\Activate.ps1
```
# Note: only 3.10 or 3.11 is compatible for some python packages like numpy, pandas
### Install dependencies

```bash
pip install -r requirements.txt
```

### Generate daily operational data

```bash
python -m scripts.daily_data_generator
```

### Load data into PostgreSQL

```bash
python -m pipeline.feature_pipeline
```

### Train ML model

```bash
python -m ml.train_model
```

### Plan Generation

```bash
python -m ml.plan_engine.py
```

### Start API server

```bash
cd backend
uvicorn app.api:app --reload
```
Open API documentation:
http://127.0.0.1:8000/docs

## Frontend
### Run Frontend
Start the React + Vite frontend (from the `frontend` directory):

```bash
cd frontend
npm install
npm run dev
```

The App will be available at `http://localhost:5173`.
