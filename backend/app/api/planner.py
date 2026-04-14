# backend/app/api/planner.py

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
import pandas as pd

from app.core.database import get_db
from app.api.auth import get_current_active_user

from ml.planner_engine import (
    generate_temp_plan,
    save_final_plan,
    compare_plans,
    get_department_popup_data
)

from app.services.genai_adapter import (
    generate_plan_explanation,
    generate_simulation_explanation,
    generate_override_explanation,
    generate_comparison_explanation
)

planner_router = APIRouter()


# ==========================================================
# ACCESS CONTROL
# ==========================================================
def planner_access(user=Depends(get_current_active_user)):

    if user.role not in ["PLANNER", "ADMIN"]:
        raise HTTPException(
            status_code=403,
            detail="Not authorized"
        )

    return user


# ==========================================================
# REQUEST MODELS
# ==========================================================
class ScenarioInput(BaseModel):
    scenario: str | None = None
    train_id: str | None = None


class FinalizeInput(BaseModel):
    original_rows: list
    final_rows: list


# ==========================================================
# SUMMARY
# ==========================================================
@planner_router.get("/summary")
def planner_summary(
    db: Session = Depends(get_db),
    user=Depends(planner_access)
):

    try:

        # Total fleet always from master data
        total = db.execute(
            text("SELECT COUNT(*) FROM master_train_data")
        ).scalar()

        # -----------------------------------------
        # Use latest finalized plan if available
        # -----------------------------------------
        latest_plan = db.execute(text("""
            SELECT
                run_count,
                standby_count,
                maintenance_count
            FROM plans
            ORDER BY created_at DESC
            LIMIT 1
        """)).fetchone()

        if latest_plan:

            run = int(latest_plan[0] or 0)
            standby = int(latest_plan[1] or 0)
            maint = int(latest_plan[2] or 0)

            ready = run + standby
            pending = maint

        else:
            # fallback old logic
            fit = db.execute(text("""
                SELECT COUNT(*)
                FROM master_train_data
                WHERE compliance_status='FIT'
            """)).scalar()

            ready = fit
            pending = total - fit

        received = [
            "Operations Control Room",
            "Maintenance",
            "Cleaning",
            "Fitness",
            "Branding"
        ]

        return {
            "total_trains": total,
            "ready_for_induction": ready,
            "maintenance_pending": pending,
            "departments_received": received,
            "departments_missing": []
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

# ==========================================================
# DEPARTMENT DATA
# ==========================================================
@planner_router.get("/department-data/{dept}")
def department_popup(
    dept: str,
    user=Depends(planner_access)
):

    try:
        return get_department_popup_data(dept)

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==========================================================
# GENERATE PLAN
# ==========================================================
@planner_router.post("/generate-plan")
def generate_plan(
    user=Depends(planner_access)
):

    try:

        df = generate_temp_plan()

        rows = df.to_dict(
            orient="records"
        )

        run = int(
            (df["decision"] == "RUN").sum()
        )

        standby = int(
            (df["decision"] == "STANDBY").sum()
        )

        maint = int(
            (df["decision"] == "MAINTENANCE").sum()
        )

        return {
            "details": rows,
            "counts": {
                "run": run,
                "standby": standby,
                "maintenance": maint
            },
            "ai_summary":
                generate_plan_explanation(rows)
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Plan generation failed: {str(e)}"
        )


# ==========================================================
# WHAT IF
# ==========================================================
@planner_router.post("/what-if")
def what_if(
    payload: ScenarioInput,
    user=Depends(planner_access)
):

    try:

        allowed = [
            "TRAIN_FAILURE",
            "PEAK_HOUR",
            "WEATHER",
            "CLEANING_DELAY",
            "SIGNALLING_FAILURE",
            "STAFF_SHORTAGE",
            "VIP_BRANDING_DAY",
            "MULTIPLE_BREAKDOWN"
        ]

        scenario = payload.scenario

        if scenario not in allowed:
            raise HTTPException(
                status_code=400,
                detail="Invalid scenario"
            )

        df = generate_temp_plan({
            "scenario": scenario,
            "train_id": payload.train_id
        })

        rows = df.to_dict(
            orient="records"
        )

        run = int(
            (df["decision"] == "RUN").sum()
        )

        standby = int(
            (df["decision"] == "STANDBY").sum()
        )

        maint = int(
            (df["decision"] == "MAINTENANCE").sum()
        )

        return {
            "details": rows,
            "counts": {
                "run": run,
                "standby": standby,
                "maintenance": maint
            },
            "ai_summary":
                generate_simulation_explanation(
                    rows,
                    scenario
                )
        }

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Simulation failed: {str(e)}"
        )


# ==========================================================
# FINALIZE PLAN
# ==========================================================
@planner_router.post("/finalize")
def finalize_plan(
    payload: FinalizeInput,
    user=Depends(planner_access)
):

    try:

        if not payload.final_rows:
            raise HTTPException(
                status_code=400,
                detail="No final rows received"
            )

        df = pd.DataFrame(
            payload.final_rows
        )

        plan_id = save_final_plan(df)

        return {
            "message":
                "Plan finalized successfully",
            "plan_id": plan_id,
            "ai_summary":
                generate_override_explanation(
                    payload.final_rows
                )
        }

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Finalize failed: {str(e)}"
        )


# ==========================================================
# COMPARE
# ==========================================================
@planner_router.post("/compare")
def compare(
    payload: FinalizeInput,
    user=Depends(planner_access)
):

    try:

        if (
            not payload.original_rows
            or not payload.final_rows
        ):
            raise HTTPException(
                status_code=400,
                detail="Missing compare data"
            )

        result = compare_plans(
            payload.original_rows,
            payload.final_rows
        )

        result["ai_summary"] = (
            generate_comparison_explanation(
                result
            )
        )

        return result

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Compare failed: {str(e)}"
        )