from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.models.user import User
from app.models.train import MasterTrainData, FitnessCertificate
from app.api.auth import get_current_active_user

fitness_router = APIRouter()

class TrainFitnessUpdate(BaseModel):
    compliance_status: str | None = None
    validity_status: str | None = None

def check_fitness_role(current_user: User = Depends(get_current_active_user)):
    if current_user.role not in ["FITNESS", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

@fitness_router.get("/trains")
def get_fitness_trains(db: Session = Depends(get_db), user: User = Depends(check_fitness_role)):
    trains = db.query(MasterTrainData).all()
    return trains

@fitness_router.put("/trains/{train_id}")
def update_fitness_status(train_id: str, update_data: TrainFitnessUpdate, db: Session = Depends(get_db), user: User = Depends(check_fitness_role)):
    train = db.query(MasterTrainData).filter(MasterTrainData.train_id == train_id).first()
    if not train:
        raise HTTPException(status_code=404, detail="Train not found")
        
    if update_data.compliance_status is not None:
        train.compliance_status = update_data.compliance_status
        
    if update_data.validity_status is not None:
        # Assuming we update the most recent certificate as a simplification
        cert = db.query(FitnessCertificate).filter(FitnessCertificate.train_id == train_id).first()
        if cert:
            cert.validity_status = update_data.validity_status
        else:
            # Create dummy cert for demo
            pass
            
    db.commit()
    return {"message": "Fitness status updated", "train_id": train_id}
