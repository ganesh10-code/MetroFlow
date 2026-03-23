from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from app.core.database import get_db
from app.models.user import User
from app.models.train import MasterTrainData, JobcardStatus
from app.api.auth import get_current_active_user

maintenance_router = APIRouter()

class TrainMaintenanceUpdate(BaseModel):
    rolling_stock_status: str | None = None
    urgency_level: str | None = None
    highest_open_job_priority: str | None = None

def check_maintenance_role(current_user: User = Depends(get_current_active_user)):
    if current_user.role not in ["MAINTENANCE", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

@maintenance_router.get("/trains")
def get_maintenance_trains(db: Session = Depends(get_db), user: User = Depends(check_maintenance_role)):
    trains = db.query(MasterTrainData).all()
    # In a real app we might filter only those needing maintenance
    return trains

@maintenance_router.put("/trains/{train_id}")
def update_maintenance_status(train_id: str, update_data: TrainMaintenanceUpdate, db: Session = Depends(get_db), user: User = Depends(check_maintenance_role)):
    train = db.query(MasterTrainData).filter(MasterTrainData.train_id == train_id).first()
    if not train:
        raise HTTPException(status_code=404, detail="Train not found")
        
    if update_data.rolling_stock_status is not None:
        train.rolling_stock_status = update_data.rolling_stock_status
    if update_data.urgency_level is not None:
        train.urgency_level = update_data.urgency_level
    if update_data.highest_open_job_priority is not None:
        train.highest_open_job_priority = update_data.highest_open_job_priority
        
    db.commit()
    db.refresh(train)
    return {"message": "Maintenance status updated", "train_id": train.train_id}
