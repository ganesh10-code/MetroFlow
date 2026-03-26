from typing import Dict, Any, List

# ============================================================
# PLACEHOLDER — Ganesh's core ML/optimization engine adapter
# Application layer calls these methods.
# Ganesh can implement the final logic here without breaking the app.
# ============================================================

def get_readiness_summary(trains_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Summarize readiness across all departments based on full train records.
    Currently uses field-level heuristics as a placeholder for the real ML aggregation.
    """
    total = len(trains_data)
    maint_ready = sum(1 for t in trains_data if t.get("rolling_stock_status") == "OK")
    maint_pending = sum(1 for t in trains_data if t.get("rolling_stock_status") == "MAINTENANCE_REQUIRED")
    maint_unknown = total - maint_ready - maint_pending

    fitness_fit = sum(1 for t in trains_data if t.get("compliance_status") == "FIT")
    fitness_unsafe = sum(1 for t in trains_data if t.get("compliance_status") == "UNSAFE")
    fitness_unverified = total - fitness_fit - fitness_unsafe

    branding_low = sum(1 for t in trains_data if t.get("penalty_risk_level") == "LOW")
    branding_high = sum(1 for t in trains_data if t.get("penalty_risk_level") == "HIGH")

    # A train is "ready for induction" if maintenance OK and fitness FIT
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


def generate_plan_placeholder(trains_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    PLACEHOLDER — Simulate running the final ML model to generate the induction plan.
    Ganesh's real optimizer plugs in here.
    Decisions are derived from basic heuristics only.
    """
    details = []
    selected = []

    for t in trains_data:
        maint_ok = t.get("rolling_stock_status") == "OK"
        fitness_ok = t.get("compliance_status") == "FIT"
        risk = t.get("penalty_risk_level", "LOW")

        if maint_ok and fitness_ok:
            decision = "INDUCT"
            score = 0.1 if risk == "LOW" else 0.4
            selected.append(t["train_id"])
        elif not maint_ok and not fitness_ok:
            decision = "HOLD"
            score = 0.9
        else:
            decision = "HOLD"
            score = 0.6

        details.append({
            "train_id": t["train_id"],
            "decision": decision,
            "risk_score": round(score, 2),
        })

    confidence = round(len(selected) / max(len(trains_data), 1), 2)

    return {
        "status": "placeholder",
        "selected_trains": selected,
        "confidence_score": confidence,
        "details": details,
    }


def get_latest_plan_status() -> Dict[str, Any]:
    return {
        "last_run": "2026-03-24T21:00:00Z",
        "plan_active": True,
        "note": "Placeholder — real status from Ganesh's optimizer pending",
    }
