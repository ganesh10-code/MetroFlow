from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.models.user import User
from app.models.train import MasterTrainData, BrandingPriority
from app.api.auth import get_current_active_user

branding_router = APIRouter()

class TrainBrandingUpdate(BaseModel):
    penalty_risk_level: str | None = None
    advertiser_name: str | None = None

def check_branding_role(current_user: User = Depends(get_current_active_user)):
    if current_user.role not in ["BRANDING", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

@branding_router.get("/trains")
def get_branding_trains(db: Session = Depends(get_db), user: User = Depends(check_branding_role)):
    trains = db.query(MasterTrainData).all()
    return trains

@branding_router.put("/trains/{train_id}")
def update_branding_status(train_id: str, update_data: TrainBrandingUpdate, db: Session = Depends(get_db), user: User = Depends(check_branding_role)):
    train = db.query(MasterTrainData).filter(MasterTrainData.train_id == train_id).first()
    if not train:
        raise HTTPException(status_code=404, detail="Train not found")
        
    if update_data.penalty_risk_level is not None:
        train.penalty_risk_level = update_data.penalty_risk_level
    if update_data.advertiser_name is not None:
        train.advertiser_name = update_data.advertiser_name
        
    db.commit()
    return {"message": "Branding status updated", "train_id": train_id}
