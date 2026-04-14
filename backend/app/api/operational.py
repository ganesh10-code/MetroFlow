# backend/app/api/operations_control.py
# OPTIONAL NEW API (recommended)

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db
from app.api.auth import get_current_active_user

operational_router = APIRouter()


# ==========================================================
# ACCESS
# ==========================================================
def admin_access(user=Depends(get_current_active_user)):
    if user.role not in ["ADMIN", "PLANNER"]:
        raise HTTPException(403, "Not authorized")
    return user


# ==========================================================
# MODEL
# ==========================================================
class OCRInput(BaseModel):
    run_count: int
    standby_count: int


# ==========================================================
# UPDATE COUNTS
# ==========================================================
@operational_router.post("/set-counts")
def set_counts(
    payload: OCRInput,
    db: Session = Depends(get_db),
    user=Depends(admin_access)
):

    db.execute(text("""
        INSERT INTO operations_control_room(
            run_count,
            standby_count,
            updated_by
        )
        VALUES(
            :run,
            :standby,
            :user
        )
    """), {
        "run": payload.run_count,
        "standby": payload.standby_count,
        "user": user.username
    })

    db.commit()

    return {
        "message":
        "Operational counts updated successfully"
    }


# ==========================================================
# GET CURRENT COUNTS
# ==========================================================
@operational_router.get("/current-counts")
def current_counts(
    db: Session = Depends(get_db),
    user=Depends(admin_access)
):

    row = db.execute(text("""
        SELECT run_count, standby_count, updated_at
        FROM operations_control_room
        ORDER BY updated_at DESC
        LIMIT 1
    """)).fetchone()

    if not row:
        return {
            "run_count": 18,
            "standby_count": 4,
            "source": "baseline"
        }

    return {
        "run_count": row[0],
        "standby_count": row[1],
        "updated_at": str(row[2]),
        "source": "control_room"
    }