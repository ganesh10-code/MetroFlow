# backend/app/services/core_adapter.py

from typing import Dict, Any, List
import pandas as pd

from ml.planner_engine import generate_temp_plan


# ==========================================================
# READINESS SUMMARY
# Used for dashboards / admin monitoring
# ==========================================================
def get_readiness_summary(
    trains_data: List[Dict[str, Any]]
) -> Dict[str, Any]:

    total = len(trains_data)

    ready = sum(
        1 for t in trains_data
        if t.get("rolling_stock_status") == "OK"
        and t.get("compliance_status") == "FIT"
    )

    maint_pending = sum(
        1 for t in trains_data
        if t.get("rolling_stock_status") != "OK"
    )

    fitness_fit = sum(
        1 for t in trains_data
        if t.get("compliance_status") == "FIT"
    )

    fitness_unsafe = total - fitness_fit

    branding_high = sum(
        1 for t in trains_data
        if t.get("penalty_risk_level") == "HIGH"
    )

    branding_low = total - branding_high

    return {
        "total_trains": total,
        "ready_for_induction": ready,
        "maintenance_pending": maint_pending,
        "fleet_utilization_pct": round(
            (ready / max(total, 1)) * 100,
            2
        ),
        "maintenance": {
            "pending": maint_pending,
            "healthy": total - maint_pending
        },
        "fitness": {
            "fit": fitness_fit,
            "unsafe": fitness_unsafe
        },
        "branding": {
            "high_risk": branding_high,
            "low_risk": branding_low
        }
    }


# ==========================================================
# REAL PLAN GENERATION
# Wrapper over planner_engine
# ==========================================================
def generate_plan_placeholder():

    try:
        df: pd.DataFrame = generate_temp_plan()

        selected = df[
            df["decision"] == "RUN"
        ]["train_id"].tolist()

        standby = df[
            df["decision"] == "STANDBY"
        ]["train_id"].tolist()

        maint = df[
            df["decision"] == "MAINTENANCE"
        ]["train_id"].tolist()

        return {
            "status": "generated",
            "selected_trains": selected,
            "standby_trains": standby,
            "maintenance_trains": maint,
            "confidence_score": round(
                len(selected) / max(len(df), 1),
                2
            ),
            "avg_risk_score": round(
                float(df["risk_score"].mean()),
                2
            ),
            "details": df.to_dict(
                orient="records"
            )
        }

    except Exception as e:

        return {
            "status": "error",
            "selected_trains": [],
            "standby_trains": [],
            "maintenance_trains": [],
            "confidence_score": 0,
            "avg_risk_score": 0,
            "details": [],
            "error": str(e)
        }


# ==========================================================
# QUICK LIVE SUMMARY
# Useful for admin cards / widgets
# ==========================================================
def get_operational_summary():

    try:
        df = generate_temp_plan()

        return {
            "total_trains": len(df),
            "run": int(
                (df["decision"] == "RUN").sum()
            ),
            "standby": int(
                (df["decision"] == "STANDBY").sum()
            ),
            "maintenance": int(
                (df["decision"] == "MAINTENANCE").sum()
            ),
            "avg_risk": round(
                float(df["risk_score"].mean()),
                2
            ),
            "avg_priority": round(
                float(df["priority_score"].mean()),
                2
            )
        }

    except Exception as e:

        return {
            "total_trains": 0,
            "run": 0,
            "standby": 0,
            "maintenance": 0,
            "avg_risk": 0,
            "avg_priority": 0,
            "error": str(e)
        }


# ==========================================================
# PLAN STATUS
# ==========================================================
def get_latest_plan_status():

    return {
        "planner_engine": "ACTIVE",
        "mode": "ML + ORTOOLS + GENAI",
        "data_source_priority": "REAL > SYNTHETIC",
        "what_if_enabled": True,
        "manual_override": True,
        "comparison_dashboard": True,
        "finalize_locking": True
    }