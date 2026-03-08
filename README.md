# 🚆 AI-Driven Train Induction Planning System

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

backend/
api.py # FastAPI backend

models/
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

# ▶️ How to Run

### 1️⃣ Install dependencies

```bash
pip install -r requirements.txt
```

### 2️⃣ Generate daily operational data

```bash
python -m scripts.daily_data_generator
```

### 3️⃣ Load data into PostgreSQL

```bash
python -m pipeline.feature_pipeline
```

### 4️⃣ Train ML model

```bash
python -m ml.train_model
```

### 5️⃣ Start API server

```bash
uvicorn backend.api:app --reload
```

Open API documentation:
http://127.0.0.1:8000/docs
