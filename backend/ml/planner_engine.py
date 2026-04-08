import pandas as pd
import joblib
import os
from sqlalchemy import create_engine, text
from ortools.linear_solver import pywraplp
from ml.config import DATABASE_URL

engine = create_engine(DATABASE_URL)

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MODEL_PATH = os.path.join(BASE_DIR, "trained_models", "risk_model.pkl")


# ===============================
# LOAD MODEL
# ===============================
def load_model():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError("❌ Model not found")
    return joblib.load(MODEL_PATH)


# ===============================
# FETCH DATA (REAL > SYNTHETIC)
# ===============================
def fetch_planning_data():

    with engine.begin() as conn:

        real_count = conn.execute(
            text("SELECT COUNT(*) FROM real_daily_features")
        ).scalar()

        if real_count > 0:
            print("✅ Using REAL data")
            df = pd.read_sql("SELECT * FROM real_daily_features", conn)
        else:
            print("⚠️ Using SYNTHETIC data")
            df = pd.read_sql("SELECT * FROM synthetic_daily_features", conn)

    latest_date = df["date"].max()
    df = df[df["date"] == latest_date].copy()

    return df


# ===============================
# FEATURE ENGINEERING
# ===============================
def prepare_features(df):
    df["job_severity_score"] = df["open_jobs"] * 2
    df["mileage_ratio"] = df["mileage_today"] / 300
    return df


# ===============================
# PRIORITY SCORE
# ===============================
def compute_priority_score(row):
    return (
        0.5 * row["risk_score"]
        + 0.2 * (row["open_jobs"] / 5)
        + 0.1 * (row["mileage_today"] / 300)
        + 0.1 * row["cleaning_required"]
        - 0.2 * (row["branding_priority"] / 5)
        + 0.1 * (row["shunting_time"] / 10)
    )


# ===============================
# HARD RULES
# ===============================
def apply_hard_rules(row):
    if row["risk_score"] > 0.85:
        return "MAINTENANCE"
    if row["cleaning_required"] == 1 and row["open_jobs"] > 3:
        return "MAINTENANCE"
    return None


# ===============================
# OPTIMIZER (PLACEHOLDER FOR OR-TOOLS)
# ===============================

def optimize_plan(df, config=None):


    solver = pywraplp.Solver.CreateSolver("SCIP")
    n = len(df)

    x_run = {}
    x_maint = {}

    for i in range(n):
        x_run[i] = solver.BoolVar(f"run_{i}")
        x_maint[i] = solver.BoolVar(f"maint_{i}")

    # -------------------------
    # CONFIG
    # -------------------------
    maint_ratio = config.get("maintenance_limit", 0.2) if config else 0.2
    risk_weight = config.get("risk_weight", 1.0) if config else 1.0

    maint_limit = int(maint_ratio * n)

    # -------------------------
    # CONSTRAINTS
    # -------------------------
    for i in range(n):
        solver.Add(x_run[i] + x_maint[i] == 1)

    solver.Add(sum(x_maint[i] for i in range(n)) <= maint_limit)

    # -------------------------
    # OBJECTIVE
    # -------------------------
    objective = solver.Objective()

    for i, row in df.iterrows():

        risk = row["risk_score"]
        priority = row["priority_score"]

        objective.SetCoefficient(x_run[i], (1 - risk * risk_weight) * 10 + priority)
        objective.SetCoefficient(x_maint[i], risk * 8)

    objective.SetMaximization()

    status = solver.Solve()

    decisions = []

    for i in range(n):

        row = df.iloc[i]
        hard = apply_hard_rules(row)

        if hard:
            decision = hard
        elif x_maint[i].solution_value() == 1:
            decision = "MAINTENANCE"
        else:
            decision = "RUN"

        decisions.append(decision)

    df["decision"] = decisions
    return df

def fallback_greedy(df):

    df = df.sort_values(by="priority_score", ascending=False)

    decisions = []
    maint_limit = int(0.2 * len(df))
    m = 0

    for _, row in df.iterrows():

        hard = apply_hard_rules(row)

        if hard:
            decision = hard

        elif m < maint_limit and row["risk_score"] > 0.6:
            decision = "MAINTENANCE"
            m += 1

        else:
            decision = "RUN"

        decisions.append(decision)

    df["decision"] = decisions
    return df

# ===============================
# SAVE PLAN
# ===============================
def save_plan(df):

    with engine.begin() as conn:

        latest_date = df["date"].iloc[0]

        result = conn.execute(text("""
            INSERT INTO plans (
                date, total_trains, maintenance_count,
                standby_count, run_count, avg_risk_score
            )
            VALUES (:date, :total, :maint, :standby, :run, :avg)
            RETURNING id
        """), {
            "date": str(latest_date),
            "total": len(df),
            "maint": (df["decision"] == "MAINTENANCE").sum(),
            "standby": (df["decision"] == "STANDBY").sum(),
            "run": (df["decision"] == "RUN").sum(),
            "avg": df["risk_score"].mean()
        })

        plan_id = result.fetchone()[0]

        for _, row in df.iterrows():
            conn.execute(text("""
                INSERT INTO plan_details (
                    plan_id, train_id, decision,
                    risk_score, priority_score
                )
                VALUES (:pid, :tid, :dec, :risk, :priority)
            """), {
                "pid": plan_id,
                "tid": row["train_id"],
                "dec": row["decision"],
                "risk": row["risk_score"],
                "priority": row["priority_score"]
            })

    return plan_id


# ===============================
# MAIN ENGINE
# ===============================
def generate_plan(config=None, save=True):

    df = fetch_planning_data()
    df = prepare_features(df)

    model = load_model()

    X = df[
        [
            "open_jobs",
            "mileage_today",
            "branding_priority",
            "shunting_time",
            "job_severity_score",
            "mileage_ratio"
        ]
    ]

    df["risk_score"] = model.predict_proba(X)[:, 1]
    df["priority_score"] = df.apply(compute_priority_score, axis=1)

    # 🔥 pass config to optimizer
    df = optimize_plan(df, config)

    if save:
        plan_id = save_plan(df)
    else:
        plan_id = None

    return {
        "plan_id": plan_id,
        "data": df.to_dict(orient="records")
    }