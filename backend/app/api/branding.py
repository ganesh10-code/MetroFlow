# backend/app/api/branding.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import List
from datetime import datetime
from zoneinfo import ZoneInfo
import json

from app.core.database import get_db
from app.api.auth import get_current_active_user
from app.services.kafka_producer import send_event, build_department_event

branding_router = APIRouter()

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
# ADMIN + BRANDING
# ==========================================================
def check_branding_role(user=Depends(get_current_active_user)):
    role = str(user.role).upper()

    if role not in ["ADMIN", "BRANDING"]:
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions"
        )

    return user


# ==========================================================
# MODEL
# ==========================================================
class BrandingRow(BaseModel):
    train_id: str
    branding_priority: int
    penalty_risk_level: str


# ==========================================================
# TRAINS
# ==========================================================
@branding_router.get("/trains")
def get_trains(
    db: Session = Depends(get_db),
    user=Depends(check_branding_role)
):
    rows = db.execute(text("""
        SELECT train_id
        FROM master_train_data
        ORDER BY train_id
    """)).fetchall()

    return [
        {"train_id": r[0]}
        for r in rows
    ]


# ==========================================================
# STATUS
# ==========================================================
@branding_router.get("/status")
def get_status(
    db: Session = Depends(get_db),
    user=Depends(check_branding_role)
):
    row = db.execute(text("""
        SELECT COUNT(*)
        FROM branding_logs
        WHERE log_date = :today
    """), {
        "today": ist_today()
    }).fetchone()

    return {
        "submitted_today": row[0] > 0
    }


# ==========================================================
# TODAY
# ==========================================================
@branding_router.get("/today")
def get_today_rows(
    db: Session = Depends(get_db),
    user=Depends(check_branding_role)
):
    rows = db.execute(text("""
        SELECT
            train_id,
            branding_priority,
            penalty_risk_level,
            TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI:SS') AS updated_at
        FROM branding_logs
        WHERE log_date = :today
        ORDER BY train_id
    """), {
        "today": ist_today()
    }).fetchall()

    return [
        dict(r._mapping)
        for r in rows
    ]


# ==========================================================
# SUBMIT
# ==========================================================
@branding_router.post("/submit")
def submit_today(
    payload: List[BrandingRow],
    db: Session = Depends(get_db),
    user=Depends(check_branding_role)
):

    if not payload:
        raise HTTPException(
            status_code=400,
            detail="No rows submitted"
        )

    today = ist_today()
    now = ist_now().strftime("%Y-%m-%d %H:%M:%S")

    # lock after finalize
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

        priority = int(row.branding_priority)
        risk = row.penalty_risk_level.upper()

        if priority < 1 or priority > 10:
            raise HTTPException(
                status_code=400,
                detail=f"Priority must be 1-10 for {row.train_id}"
            )

        if risk not in [
            "LOW",
            "MEDIUM",
            "HIGH"
        ]:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid risk level for {row.train_id}"
            )

        db.execute(text("""
            INSERT INTO branding_logs(
                log_date,
                train_id,
                branding_priority,
                penalty_risk_level,
                created_at,
                updated_at
            )
            VALUES(
                :log_date,
                :train_id,
                :priority,
                :risk,
                :created_at,
                :updated_at
            )

            ON CONFLICT (log_date, train_id)

            DO UPDATE SET
                branding_priority = EXCLUDED.branding_priority,
                penalty_risk_level = EXCLUDED.penalty_risk_level,
                updated_at = :updated_at
        """), {
            "log_date": today,
            "train_id": row.train_id,
            "priority": priority,
            "risk": risk,
            "created_at": now,
            "updated_at": now
        })

    db.commit()

    # Persist dashboard event history directly for reliable analytics visibility.
    try:
        db.execute(text("""
            INSERT INTO events_log (event_timestamp, event_type, department, train_id, payload, created_at)
            VALUES (:event_timestamp, :event_type, :department, :train_id, CAST(:payload AS JSON), :created_at)
        """), {
            "event_timestamp": ist_now().replace(tzinfo=None),
            "event_type": "department_submission",
            "department": "branding",
            "train_id": None,
            "payload": json.dumps({
                "records_count": len(payload),
                "details": f"branding submitted {len(payload)} record(s)",
                "user_id": user.id,
            }),
            "created_at": ist_now().replace(tzinfo=None),
        })
        db.commit()
    except Exception as e:
        print(f"⚠️ events_log insert failed (branding): {str(e)}")
        db.rollback()

    # 🔥 EMIT KAFKA EVENT (fire-and-forget)
    send_event(
        topic_key="department_events",
        event_type="department_submission",
        payload=build_department_event(
            department="branding",
            user_id=user.id,
            records_count=len(payload),
        ),
        user_id=user.id,
    )

    return {
        "message": "Today's branding data submitted successfully",
        "timestamp_ist": str(ist_now())
    }