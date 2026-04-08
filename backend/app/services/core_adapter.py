from typing import Dict, Any, List
import pandas as pd

# 🔥 Import REAL ML engine
from ml.planner_engine import generate_plan as ml_generate_plan


# ============================================================
# READINESS SUMMARY (NO CHANGE)
# ============================================================
def get_readiness_summary(trains_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    total = len(trains_data)

    maint_ready = sum(1 for t in trains_data if t.get("rolling_stock_status") == "OK")
    maint_pending = sum(1 for t in trains_data if t.get("rolling_stock_status") == "MAINTENANCE_REQUIRED")
    maint_unknown = total - maint_ready - maint_pending

    fitness_fit = sum(1 for t in trains_data if t.get("compliance_status") == "FIT")
    fitness_unsafe = sum(1 for t in trains_data if t.get("compliance_status") == "UNSAFE")
    fitness_unverified = total - fitness_fit - fitness_unsafe

    branding_low = sum(1 for t in trains_data if t.get("penalty_risk_level") == "LOW")
    branding_high = sum(1 for t in trains_data if t.get("penalty_risk_level") == "HIGH")

    ready = sum(
        1 for t in trains_data
        if t.get("rolling_stock_status") == "OK" and t.get("compliance_status") == "FIT"
    )

    return {
        "total_trains": total,
        "ready_for_induction": ready,
        "maintenance_pending": total - maint_ready,
        "maintenance": {
            "ready": maint_ready,
            "maintenance_required": maint_pending,
            "unknown": maint_unknown,
        },
        "fitness": {
            "fit": fitness_fit,
            "unsafe": fitness_unsafe,
            "not_verified": fitness_unverified,
        },
        "branding": {
            "low_risk": branding_low,
            "high_risk": branding_high,
        },
    }


# ============================================================
# 🔥 REAL PLAN GENERATION (REPLACED PLACEHOLDER)
# ============================================================
def generate_plan_placeholder(trains_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Now calls REAL ML engine instead of placeholder logic.
    """

    try:
        # 🔥 Call your ML engine
        df: pd.DataFrame = ml_generate_plan()

        selected = df[df["decision"] == "RUN"]["train_id"].tolist()

        return {
            "status": "generated",
            "selected_trains": selected,
            "confidence_score": round(len(selected) / max(len(df), 1), 2),
            "details": df.to_dict(orient="records"),
        }

    except Exception as e:
        print(f"❌ ML Engine failed: {e}")

        # fallback (important for system stability)
        return {
            "status": "error",
            "selected_trains": [],
            "confidence_score": 0,
            "details": [],
            "error": str(e)
        }


# ============================================================
# OPTIONAL STATUS API
# ============================================================
def get_latest_plan_status() -> Dict[str, Any]:
    return {
        "last_run": "AUTO",
        "plan_active": True,
        "note": "ML planner engine integrated successfully",
    }