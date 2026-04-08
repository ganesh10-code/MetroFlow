from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel

from app.core.database import get_db
from app.api.auth import get_current_active_user

maintenance_router = APIRouter()


class TrainMaintenanceUpdate(BaseModel):
    rolling_stock_status: str | None = None
    urgency_level: str | None = None
    highest_open_job_priority: str | None = None


def check_maintenance_role(user=Depends(get_current_active_user)):
    if user.role not in ["MAINTENANCE", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return user


@maintenance_router.get("/trains")
def get_maintenance_trains(db: Session = Depends(get_db), user=Depends(check_maintenance_role)):
    result = db.execute(text("SELECT * FROM master_train_data")).fetchall()
    return [dict(r._mapping) for r in result]


@maintenance_router.put("/trains/{train_id}")
def update_maintenance_status(train_id: str, update_data: TrainMaintenanceUpdate,
                             db: Session = Depends(get_db), user=Depends(check_maintenance_role)):

    db.execute(text("""
        UPDATE master_train_data
        SET
            rolling_stock_status = COALESCE(:rss, rolling_stock_status),
            urgency_level = COALESCE(:ul, urgency_level),
            highest_open_job_priority = COALESCE(:hp, highest_open_job_priority)
        WHERE train_id = :train_id
    """), {
        "rss": update_data.rolling_stock_status,
        "ul": update_data.urgency_level,
        "hp": update_data.highest_open_job_priority,
        "train_id": train_id
    })

    db.commit()
    return {"message": "Maintenance status updated"}