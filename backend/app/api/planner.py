# backend/app/api/planner.py

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
import pandas as pd

from app.core.database import get_db
from app.api.auth import get_current_active_user
from app.services.kafka_producer import send_event, build_planner_event, build_scenario_event

from ml.planner_engine import (
    generate_temp_plan,
    generate_temp_plan_bundle,
    save_current_plan,
    compare_plans,
    save_plan_version,
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

def ist_now():
    return datetime.now(IST)
def ist_today():
    return ist_now().date()

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
        today = ist_today()

        # --------------------------------------------------
        # TOTAL TRAINS
        # --------------------------------------------------
        total = db.execute(
            text("SELECT COUNT(*) FROM master_train_data")
        ).scalar()

        total = int(total or 25)

        # --------------------------------------------------
        # READY / PENDING
        # --------------------------------------------------
        latest_plan = db.execute(text("""
            SELECT run_count, standby_count, maintenance_count, status
            FROM plans
            WHERE date = :today
            LIMIT 1
        """),{"today": today}).fetchone()

        if latest_plan:
            run = int(latest_plan[0] or 0)
            standby = int(latest_plan[1] or 0)
            maint = int(latest_plan[2] or 0)

            ready = run + standby
            pending = maint

        else:
            fit = db.execute(text("""
                SELECT COUNT(*)
                FROM real_daily_features
                WHERE compliance_status = 'FIT' and 
                date = :today
            """),{ "today": today }).scalar()

            ready = int(fit or 0)
            pending = total - ready

        # --------------------------------------------------
        # STATUS RULES
        # OCR = 1 row required
        # Others = all trains required
        # --------------------------------------------------
        checks = {
            "operations_control_room": {
                "sql": """
                    SELECT COUNT(*)
                    FROM operations_control_room
                    WHERE log_date = :today
                """,
                "required": 1
            },

            "maintenance_logs": {
                "sql": """
                    SELECT COUNT(DISTINCT train_id)
                    FROM maintenance_logs
                    WHERE log_date = :today
                """,
                "required": total
            },

            "cleaning_logs": {
                "sql": """
                    SELECT COUNT(DISTINCT train_id)
                    FROM cleaning_logs
                    WHERE log_date = :today
                """,
                "required": total
            },

            "fitness_logs": {
                "sql": """
                    SELECT COUNT(DISTINCT train_id)
                    FROM fitness_logs
                    WHERE log_date = :today
                """,
                "required": total
            },

            "branding_logs": {
                "sql": """
                    SELECT COUNT(DISTINCT train_id)
                    FROM branding_logs
                    WHERE log_date = :today
                """,
                "required": total
            },

            "mileage_logs": {
                "sql": """
                    SELECT COUNT(DISTINCT train_id)
                    FROM mileage_logs
                    WHERE log_date = :today
                """,
                "required": total
            }
        }

        departments_received = []
        departments_complete = []
        departments_missing = []

        for dept, cfg in checks.items():

            cnt = db.execute(
                text(cfg["sql"]),
                {"today": today}
            ).scalar()

            cnt = int(cnt or 0)

            # some data exists today
            if cnt > 0:
                departments_received.append(dept)

            # full submission complete
            if cnt >= cfg["required"]:
                departments_complete.append(dept)
            else:
                departments_missing.append(dept)

        return {
            "total_trains": total,
            "ready_for_induction": ready,
            "maintenance_pending": pending,

            "departments_received": departments_received,
            "departments_complete": departments_complete,
            "departments_missing": departments_missing
        }

    except Exception as e:
        print("summary error:", str(e))
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
    db: Session = Depends(get_db),
    user=Depends(planner_access)
):
    try:
        today = ist_today()

        # --------------------------------------------------
        # FIXED TOTAL FLEET
        # --------------------------------------------------
        total_trains = 25

        # --------------------------------------------------
        # ALLOWED TABLES
        # --------------------------------------------------
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

        # --------------------------------------------------
        # OPERATIONS CONTROL ROOM
        # only 1 row/day
        # --------------------------------------------------
        if dept == "operations_control_room":

            rows = db.execute(text(f"""
                SELECT *
                FROM {dept}
                WHERE log_date = :today
                ORDER BY id DESC
                LIMIT 1
            """), {
                "today": today
            }).fetchall()

            count_today = len(rows)

            return {
                "rows": [dict(r._mapping) for r in rows],
                "submitted_count": count_today,
                "required_count": 1,
                "is_complete": count_today >= 1
            }

        # --------------------------------------------------
        # OTHER TABLES
        # need all 25 trains
        # --------------------------------------------------
        rows = db.execute(text(f"""
            SELECT *
            FROM {dept}
            WHERE log_date = :today
            ORDER BY train_id
        """), {
            "today": today
        }).fetchall()

        count_today = len(rows)

        return {
            "rows": [dict(r._mapping) for r in rows],
            "submitted_count": count_today,
            "required_count": total_trains,
            "is_complete": count_today >= total_trains
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@planner_router.get("/current-plan")
def current_plan(
    db: Session = Depends(get_db),
    user=Depends(planner_access)
):
    today = ist_today()

    plan = db.execute(text("""
        SELECT id, status
        FROM plans
        WHERE date = :today
        LIMIT 1
    """), {
        "today": today
    }).fetchone()

    if not plan:
        return {
            "exists": False
        }

    plan_id = plan[0]
    status = plan[1]

    rows = db.execute(text("""
        SELECT
            train_id,
            decision,
            risk_score,
            priority_score,
            reason
        FROM plan_details
        WHERE plan_id = :pid
        ORDER BY train_id
    """), {
        "pid": plan_id
    }).fetchall()

    return {
        "exists": True,
        "status": status,
        "details": [dict(r._mapping) for r in rows]
    }

# ==========================================================
# GENERATE PLAN
# ==========================================================
@planner_router.post("/generate-plan")
def generate_plan(
    db: Session = Depends(get_db),
    user=Depends(planner_access)
):

    try:

        today = ist_today()

        # -----------------------------------
        # CHECK IF TODAY FINALIZED
        # -----------------------------------
        row = db.execute(text("""
            SELECT id
            FROM plan_versions
            WHERE version_type = 'FINALIZED'
            AND DATE(created_at) = :today
            LIMIT 1
        """), {
            "today": today
        }).fetchone()

        # -----------------------------------
        # BLOCK PLANNER ONLY
        # -----------------------------------
        if row and user.role == "PLANNER":
            raise HTTPException(
                status_code=400,
                detail="Today's plan already finalized. Only ADMIN can regenerate."
            )

        # -----------------------------------
        # GENERATE PLAN
        # -----------------------------------

        result = generate_temp_plan_bundle()

        df = result["plan_df"]
        source_df = result["source_df"]
        targets = result["targets"]
        rows = df.to_dict(orient="records")
        source_rows = source_df.to_dict(orient="records")

        run = int(
            (df["decision"] == "RUN").sum()
        )

        standby = int(
            (df["decision"] == "STANDBY").sum()
        )

        maint = int(
            (df["decision"] == "MAINTENANCE").sum()
        )

        response = {
            "details": rows,
            "counts": {
                "run": run,
                "standby": standby,
                "maintenance": maint
            },
            "ai_summary":
                generate_plan_explanation(
                    rows,
                    source_rows,
                    targets
            )
        }

        # 🔥 EMIT KAFKA EVENT (fire-and-forget)
        send_event(
            topic_key="planner_events",
            event_type="plan_generated",
            payload=build_planner_event(
                plan_id=0,  # Temporary ID (plan not yet persisted)
                status="GENERATED",
                counts=response["counts"],
                additional_data={"has_ai_summary": True},
            ),
            user_id=user.id,
        )

        return response

    except HTTPException:
        raise

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

        now = ist_now().strftime("%Y-%m-%d %H:%M:%S")

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
        # REQUIRE TRAIN ID FROM FRONTEND
        # ---------------------------------
        train_id = str(payload.train_id or "").strip()

        if not train_id:
            raise HTTPException(
                status_code=400,
                detail="Train ID is required"
            )

        # ---------------------------------
        # RUN SIMULATION
        # ---------------------------------
        df = generate_temp_plan({
            "scenario": scenario,
            "train_id": train_id
        })

        rows = df.to_dict(orient="records")

        run = int((df["decision"] == "RUN").sum())
        standby = int((df["decision"] == "STANDBY").sum())
        maint = int((df["decision"] == "MAINTENANCE").sum())

        try:
            simulation_explanation = generate_simulation_explanation(
                rows,
                scenario,
                {
                    "selected_train": train_id,
                    "requested_by": user.username,
                    "time": now
                }
            )
        except Exception as e:
            print("AI ERROR:", str(e))
            simulation_explanation = f"Scenario {scenario} simulated successfully."

                # ---------------------------------
        # STORE SIMULATION LOG
        # ---------------------------------
        db.execute(text("""
            INSERT INTO simulation_logs(
                train_id,
                scenario_name,
                created_by,
                created_at,
                explanation
            )
            VALUES(
                :t_id,
                :scenario,
                :user,
                :now,
                :explanation
            )
        """), {
            "t_id": f"Train: {train_id or 'ALL'}",
            "scenario": scenario,
            "user": user.username,
            "now": now,
            "explanation": simulation_explanation
        })

        db.commit()

        # 🔥 EMIT KAFKA EVENT (fire-and-forget)
        send_event(
            topic_key="planner_events",
            event_type="scenario_simulation",
            payload=build_scenario_event(
                scenario=scenario,
                train_id=train_id,
                additional_data={
                    "run": run,
                    "standby": standby,
                    "maintenance": maint,
                },
            ),
            user_id=user.id,
        )

        return {
            "details": rows,
            "counts": {
                "run": run,
                "standby": standby,
                "maintenance": maint
            },
            "ai_summary": simulation_explanation
                
        }

    except HTTPException:
        raise

    except Exception as e:
        print("WHAT IF ERROR:", repr(e))
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

        plan_id = save_current_plan(df,"FINALIZED")
        save_plan_version(
            "FINALIZED",
            payload.final_rows,
            f"Finalized by {user.username}",
            plan_id
        )

        response = {
            "message":
                "Plan finalized successfully",
            "plan_id": plan_id,
            "ai_summary":
                generate_override_explanation(
                    payload.final_rows,
                    {
                        "planner": user.username,
                        "role": user.role,
                        "timestamp": ist_now().strftime("%Y-%m-%d %H:%M:%S")
                        }
                )
        }

        # 🔥 EMIT KAFKA EVENT (fire-and-forget)
        send_event(
            topic_key="planner_events",
            event_type="plan_finalized",
            payload=build_planner_event(
                plan_id=plan_id,
                status="FINALIZED",
                additional_data={
                    "finalized_by": user.username,
                    "role": user.role,
                },
            ),
            user_id=user.id,
        )

        return response

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