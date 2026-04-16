# backend/app/api/maintenance.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import List
from datetime import datetime
from zoneinfo import ZoneInfo

from app.core.database import get_db
from app.api.auth import get_current_active_user

maintenance_router = APIRouter()

# ==========================================================
# TIMEZONE (IST)
# ==========================================================
IST = ZoneInfo("Asia/Kolkata")


def ist_now():
    return datetime.now(IST)


def ist_today():
    return ist_now().date()

# ==========================================================
# ACCESS CONTROL
# ==========================================================
def check_maintenance_role(user=Depends(get_current_active_user)):
    if user.role not in ["ADMIN", "MAINTENANCE"]:
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions"
        )
    return user


# ==========================================================
# MODEL
# ==========================================================
class MaintenanceRow(BaseModel):
    train_id: str
    open_jobs: int
    urgency_level: str


# ==========================================================
# GET TRAINS
# ==========================================================
@maintenance_router.get("/trains")
def get_trains(
    db: Session = Depends(get_db),
    user=Depends(check_maintenance_role)
):
    rows = db.execute(text("""
        SELECT train_id
        FROM master_train_data
        ORDER BY train_id
    """)).fetchall()

    return [dict(r._mapping) for r in rows]


# ==========================================================
# STATUS
# ==========================================================
@maintenance_router.get("/status")
def get_status(
    db: Session = Depends(get_db),
    user=Depends(check_maintenance_role)
):
    row = db.execute(text("""
        SELECT COUNT(*)
        FROM maintenance_logs
        WHERE log_date = :today
    """), {
        "today": ist_today()
    }).fetchone()

    return {
        "submitted_today": row[0] > 0
    }


# ==========================================================
# TODAY ROWS
# ==========================================================
@maintenance_router.get("/today")
def get_today_rows(
    db: Session = Depends(get_db),
    user=Depends(check_maintenance_role)
):
    rows = db.execute(text("""
        SELECT
            train_id,
            open_jobs,
            urgency_level,
            TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at,
            TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI:SS') AS updated_at
        FROM maintenance_logs
        WHERE log_date = :today
        ORDER BY train_id
    """), {
        "today": ist_today()
    }).fetchall()

    return [dict(r._mapping) for r in rows]


# ==========================================================
# SUBMIT TODAY DATA
# ==========================================================
@maintenance_router.post("/submit")
def submit_today(
    payload: List[MaintenanceRow],
    db: Session = Depends(get_db),
    user=Depends(check_maintenance_role)
):

    today = ist_today()
    now = ist_now().strftime("%Y-%m-%d %H:%M:%S")

    if not payload:
        raise HTTPException(
            status_code=400,
            detail="No rows submitted"
        )

    # lock if finalized today
    lock = db.execute(text("""
        SELECT id
        FROM plan_versions
        WHERE version_type = 'FINALIZED'
        AND DATE(created_at) = :today
        LIMIT 1
    """), {
        "today": today
    }).fetchone()

    if lock:
        raise HTTPException(
            status_code=400,
            detail="Today's plan already finalized. Submission locked."
        )

    for row in payload:

        if row.open_jobs < 0:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid open_jobs for {row.train_id}"
            )

        db.execute(text("""
            INSERT INTO maintenance_logs(
                log_date,
                train_id,
                open_jobs,
                urgency_level,
                created_at,
                updated_at
            )
            VALUES(
                :log_date,
                :train_id,
                :open_jobs,
                :urgency_level,
                :created_at,
                :updated_at
            )

            ON CONFLICT (log_date, train_id)

            DO UPDATE SET
                open_jobs = EXCLUDED.open_jobs,
                urgency_level = EXCLUDED.urgency_level,
                updated_at = :updated_at
        """), {
            "log_date": today,
            "train_id": row.train_id,
            "open_jobs": row.open_jobs,
            "urgency_level": row.urgency_level,
            "created_at": now,
            "updated_at": now
        })

    db.commit()

    return {
        "message": "Today's maintenance data submitted successfully",
        "timestamp_ist": str(ist_now())
    }