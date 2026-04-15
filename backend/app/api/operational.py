# backend/app/api/operations.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import List
from datetime import datetime
from zoneinfo import ZoneInfo

from app.core.database import get_db
from app.api.auth import get_current_active_user

operational_router = APIRouter()

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
    Store naive IST datetime into PostgreSQL TIMESTAMP
    """
    return datetime.now(IST).replace(tzinfo=None)


def format_ist(dt):
    """
    Always display IST correctly
    """
    if not dt:
        return None

    if isinstance(dt, str):
        return dt

    if dt.tzinfo is None:
        return dt.strftime("%Y-%m-%d %H:%M:%S")

    return dt.astimezone(IST).strftime("%Y-%m-%d %H:%M:%S")


# ==========================================================
# ACCESS
# ==========================================================
def check_ocr_role(user=Depends(get_current_active_user)):
    role = str(user.role).upper()

    if role not in ["ADMIN", "OPERATIONS"]:
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions"
        )

    return user


# ==========================================================
# MODELS
# ==========================================================
class OCRInput(BaseModel):
    run_count: int
    standby_count: int
    maintenance_count: int


class MileageRow(BaseModel):
    train_id: str
    mileage_today: float


# ==========================================================
# STATUS
# ==========================================================
@operational_router.get("/status")
def get_status(
    db: Session = Depends(get_db),
    user=Depends(check_ocr_role)
):
    row = db.execute(text("""
        SELECT COUNT(*)
        FROM operations_control_room
        WHERE log_date = :today
    """), {
        "today": ist_today()
    }).fetchone()

    return {
        "submitted_today": row[0] > 0
    }


# ==========================================================
# TRAINS
# ==========================================================
@operational_router.get("/trains")
def get_trains(
    db: Session = Depends(get_db),
    user=Depends(check_ocr_role)
):
    rows = db.execute(text("""
        SELECT train_id
        FROM master_train_data
        ORDER BY train_id
    """)).fetchall()

    return [{"train_id": r[0]} for r in rows]


# ==========================================================
# CURRENT COUNTS
# ==========================================================
@operational_router.get("/current-counts")
def current_counts(
    db: Session = Depends(get_db),
    user=Depends(check_ocr_role)
):
    row = db.execute(text("""
        SELECT
            run_count,
            standby_count,
            maintenance_count,
            TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI:SS')
        FROM operations_control_room
        WHERE log_date = :today
        LIMIT 1
    """), {
        "today": ist_today()
    }).fetchone()

    if not row:
        return {
            "run_count": 18,
            "standby_count": 4,
            "maintenance_count": 3,
            "source": "baseline"
        }

    return {
        "run_count": row[0],
        "standby_count": row[1],
        "maintenance_count": row[2],
        "updated_at": row[3],
        "source": "today"
    }


# ==========================================================
# TODAY MILEAGE
# ==========================================================
@operational_router.get("/mileage/today")
def get_today_mileage(
    db: Session = Depends(get_db),
    user=Depends(check_ocr_role)
):
    rows = db.execute(text("""
        SELECT
            train_id,
            mileage_today,
            TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI:SS')
        FROM mileage_logs
        WHERE log_date = :today
        ORDER BY train_id
    """), {
        "today": ist_today()
    }).fetchall()

    return [
        {
            "train_id": r[0],
            "mileage_today": r[1],
            "updated_at": r[2]
        }
        for r in rows
    ]


# ==========================================================
# SUBMIT COUNTS
# ==========================================================
@operational_router.post("/submit")
def submit_today(
    payload: OCRInput,
    db: Session = Depends(get_db),
    user=Depends(check_ocr_role)
):
    today = ist_today()
    now = db_timestamp()

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
            detail="Today's plan finalized. Submission locked."
        )

    db.execute(text("""
        INSERT INTO operations_control_room(
            log_date,
            run_count,
            standby_count,
            maintenance_count,
            updated_by,
            created_at,
            updated_at
        )
        VALUES(
            :log_date,
            :run_count,
            :standby_count,
            :maintenance_count,
            :updated_by,
            :created_at,
            :updated_at
        )

        ON CONFLICT (log_date)

        DO UPDATE SET
            run_count = EXCLUDED.run_count,
            standby_count = EXCLUDED.standby_count,
            maintenance_count = EXCLUDED.maintenance_count,
            updated_by = EXCLUDED.updated_by,
            updated_at = EXCLUDED.updated_at
    """), {
        "log_date": today,
        "run_count": payload.run_count,
        "standby_count": payload.standby_count,
        "maintenance_count": payload.maintenance_count,
        "updated_by": user.username,
        "created_at": now,
        "updated_at": now
    })

    db.commit()

    return {
        "message": "Counts submitted successfully",
        "timestamp_ist": str(ist_now())
    }


# ==========================================================
# SUBMIT MILEAGE
# ==========================================================
@operational_router.post("/mileage/submit")
def submit_mileage(
    payload: List[MileageRow],
    db: Session = Depends(get_db),
    user=Depends(check_ocr_role)
):
    if not payload:
        raise HTTPException(
            status_code=400,
            detail="No mileage rows submitted"
        )

    today = ist_today()
    now = db_timestamp()

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
            detail="Today's plan finalized. Submission locked."
        )

    for row in payload:
        db.execute(text("""
            INSERT INTO mileage_logs(
                log_date,
                train_id,
                mileage_today,
                created_at,
                updated_at
            )
            VALUES(
                :log_date,
                :train_id,
                :mileage_today,
                :created_at,
                :updated_at
            )

            ON CONFLICT (log_date, train_id)

            DO UPDATE SET
                mileage_today = EXCLUDED.mileage_today,
                updated_at = EXCLUDED.updated_at
        """), {
            "log_date": today,
            "train_id": row.train_id,
            "mileage_today": row.mileage_today,
            "created_at": now,
            "updated_at": now
        })

    db.commit()

    return {
        "message": "Mileage submitted successfully",
        "timestamp_ist": str(ist_now())
    }