# backend/app/api/cleaning.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import List
from datetime import datetime
from zoneinfo import ZoneInfo

from app.core.database import get_db
from app.api.auth import get_current_active_user

cleaning_router = APIRouter()

# ==========================================================
# TIMEZONE (IST)
# ==========================================================
IST = ZoneInfo("Asia/Kolkata")


def ist_now():
    return datetime.now(IST)


def ist_today():
    return ist_now().date()


def db_timestamp():
    """
    Store naive IST datetime in PostgreSQL TIMESTAMP
    """
    return datetime.now(IST).replace(tzinfo=None)


# ==========================================================
# ACCESS
# ADMIN + CLEANING
# ==========================================================
def check_cleaning_role(user=Depends(get_current_active_user)):
    role = str(user.role).upper()

    if role not in ["ADMIN", "CLEANING"]:
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions"
        )

    return user


# ==========================================================
# MODEL
# ==========================================================
class CleaningRow(BaseModel):
    train_id: str
    cleaning_done: bool


# ==========================================================
# TRAINS
# ==========================================================
@cleaning_router.get("/trains")
def get_trains(
    db: Session = Depends(get_db),
    user=Depends(check_cleaning_role)
):
    rows = db.execute(text("""
        SELECT train_id
        FROM master_train_data
        ORDER BY train_id
    """)).fetchall()

    return [{"train_id": row[0]} for row in rows]


# ==========================================================
# STATUS
# ==========================================================
@cleaning_router.get("/status")
def get_status(
    db: Session = Depends(get_db),
    user=Depends(check_cleaning_role)
):
    row = db.execute(text("""
        SELECT COUNT(*)
        FROM cleaning_logs
        WHERE log_date = :today
    """), {
        "today": ist_today()
    }).fetchone()

    return {
        "submitted_today": row[0] > 0
    }


# ==========================================================
# TODAY DATA
# ==========================================================
@cleaning_router.get("/today")
def get_today_rows(
    db: Session = Depends(get_db),
    user=Depends(check_cleaning_role)
):
    rows = db.execute(text("""
        SELECT
            train_id,
            cleaning_done,
            TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI:SS') AS updated_at
        FROM cleaning_logs
        WHERE log_date = :today
        ORDER BY train_id
    """), {
        "today": ist_today()
    }).fetchall()

    return [dict(r._mapping) for r in rows]


# ==========================================================
# SUBMIT
# ==========================================================
@cleaning_router.post("/submit")
def submit_today(
    payload: List[CleaningRow],
    db: Session = Depends(get_db),
    user=Depends(check_cleaning_role)
):

    if not payload:
        raise HTTPException(
            status_code=400,
            detail="No rows submitted"
        )

    today = ist_today()
    now = db_timestamp()

    lock = db.execute(text("""
        SELECT id
        FROM plan_versions
        WHERE version_type='FINALIZED'
        AND DATE(created_at)=:today
        LIMIT 1
    """), {
        "today": today
    }).fetchone()

    if lock:
        raise HTTPException(
            status_code=400,
            detail="Today's plan finalized. Submission locked."
        )

    for row in payload:
        db.execute(text("""
            INSERT INTO cleaning_logs(
                log_date,
                train_id,
                cleaning_done,
                created_at,
                updated_at
            )
            VALUES(
                :log_date,
                :train_id,
                :cleaning_done,
                :created_at,
                :updated_at
            )

            ON CONFLICT (log_date, train_id)

            DO UPDATE SET
                cleaning_done = EXCLUDED.cleaning_done,
                updated_at = EXCLUDED.updated_at
        """), {
            "log_date": today,
            "train_id": row.train_id,
            "cleaning_done": row.cleaning_done,
            "created_at": now,
            "updated_at": now
        })

    db.commit()

    return {
        "message": "Today's cleaning data submitted successfully",
        "timestamp_ist": str(ist_now())
    }