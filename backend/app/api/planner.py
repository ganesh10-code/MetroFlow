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

from datetime import datetime
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")


def ist_today():
    return datetime.now(IST).date()

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
        total = db.execute(
            text("SELECT COUNT(*) FROM master_train_data")
        ).scalar()

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
            fit = db.execute(text("""
                SELECT COUNT(*)
                FROM master_train_data
                WHERE compliance_status='FIT'
            """)).scalar()

            ready = fit
            pending = total - fit

        today = ist_today()

        departments = []

        checks = {
            "operations_control_room": """
                SELECT COUNT(*) FROM operations_control_room
                WHERE log_date=:today
            """,
            "maintenance_logs": """
                SELECT COUNT(*) FROM maintenance_logs
                WHERE log_date=:today
            """,
            "cleaning_logs": """
                SELECT COUNT(*) FROM cleaning_logs
                WHERE log_date=:today
            """,
            "fitness_logs": """
                SELECT COUNT(*) FROM fitness_logs
                WHERE log_date=:today
            """,
            "branding_logs": """
                SELECT COUNT(*) FROM branding_logs
                WHERE log_date=:today
            """,
            "mileage_logs": """
                SELECT COUNT(*) FROM mileage_logs
                WHERE log_date=:today
            """
        }

        for key, sql in checks.items():
            cnt = db.execute(text(sql), {
                "today": today
            }).scalar()

            if int(cnt or 0) > 0:
                departments.append(key)

        return {
            "total_trains": total,
            "ready_for_induction": ready,
            "maintenance_pending": pending,
            "departments_received": departments,
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
# ==========================================================
# DEPARTMENT DATA (TODAY ONLY + LATEST)
# ==========================================================
@planner_router.get("/department-data/{dept}")
def department_popup(
    dept: str,
    db: Session = Depends(get_db),
    user=Depends(planner_access)
):
    try:
        today = ist_today()

        allowed = {
            "operations_control_room",
            "maintenance_logs",
            "cleaning_logs",
            "fitness_logs",
            "branding_logs",
            "mileage_logs"
        }

        if dept not in allowed:
            raise HTTPException(
                status_code=400,
                detail="Invalid department"
            )

        rows = db.execute(text(f"""
            SELECT *
            FROM {dept}
            WHERE log_date = :today
            ORDER BY id DESC
            LIMIT 1
        """), {
            "today": today
        }).fetchall()

        return {
            "rows": [dict(r._mapping) for r in rows]
        }

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
    db: Session = Depends(get_db),
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

        # ---------------------------------
        # STORE SIMULATION LOG
        # ---------------------------------
        db.execute(text("""
            INSERT INTO simulation_logs(
                scenario_name,
                created_by,
                remarks
            )
            VALUES(
                :scenario,
                :user,
                :remarks
            )
        """), {
            "scenario": scenario,
            "user": user.username,
            "remarks": f"Train: {payload.train_id or 'ALL'}"
        })

        db.commit()

        # ---------------------------------
        # RUN SIMULATION
        # ---------------------------------
        df = generate_temp_plan({
            "scenario": scenario,
            "train_id": payload.train_id
        })

        rows = df.to_dict(orient="records")

        run = int((df["decision"] == "RUN").sum())
        standby = int((df["decision"] == "STANDBY").sum())
        maint = int((df["decision"] == "MAINTENANCE").sum())

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
    
# ==========================================================
# CHECK IF TODAY PLAN FINALIZED
# Used by department dashboards
# ==========================================================
@planner_router.get("/is-finalized")
def is_finalized(
    db: Session = Depends(get_db),
    user=Depends(get_current_active_user)
):
    """
    Allow all authenticated users.
    Departments need this to lock submissions.
    """

    row = db.execute(text("""
        SELECT id
        FROM plan_versions
        WHERE version_type = 'FINALIZED'
        AND DATE(created_at) = :today
        LIMIT 1
    """), {
        "today": ist_today()
    }).fetchone()

    return {
        "finalized": row is not None
    }


# ==========================================================
# FINAL PLAN FOR DASHBOARDS
# Used by department users to view today's finalized plan
# ==========================================================
@planner_router.get("/final-plan")
def final_plan(
    db: Session = Depends(get_db),
    user=Depends(get_current_active_user)
):
    """
    Allow all authenticated users.
    Departments can view finalized plan.
    """

    # Latest finalized version today
    version = db.execute(text("""
        SELECT reference_plan_id
        FROM plan_versions
        WHERE version_type = 'FINALIZED'
        AND DATE(created_at) = :today
        ORDER BY created_at DESC
        LIMIT 1
    """), {
        "today": ist_today()
    }).fetchone()

    if not version:
        return []

    plan_id = version[0]

    rows = db.execute(text("""
        SELECT
            train_id,
            decision,
            risk_score,
            priority_score,
            reason
        FROM plan_details
        WHERE plan_id = :plan_id
        ORDER BY
            CASE decision
                WHEN 'RUN' THEN 1
                WHEN 'STANDBY' THEN 2
                WHEN 'MAINTENANCE' THEN 3
                ELSE 4
            END,
            train_id
    """), {
        "plan_id": plan_id
    }).fetchall()

    return [dict(r._mapping) for r in rows]


@planner_router.get("/maintenance-trains")
def get_maintenance_trains(
    db: Session = Depends(get_db),
    user=Depends(get_current_active_user)
):
    today = datetime.now(IST).date()

    rows = db.execute(text("""
        SELECT pd.train_id
        FROM plan_details pd
        JOIN plans p ON p.id = pd.plan_id
        WHERE p.date = :today
        AND UPPER(TRIM(pd.decision)) = 'MAINTENANCE'
        ORDER BY pd.train_id
    """), {
        "today": today
    }).fetchall()

    return [str(r[0]).strip().upper()
        for r in rows
    ]