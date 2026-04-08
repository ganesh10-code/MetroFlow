from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel

from app.core.database import get_db
from app.api.auth import get_current_active_user

branding_router = APIRouter()


class TrainBrandingUpdate(BaseModel):
    penalty_risk_level: str | None = None
    advertiser_name: str | None = None


def check_branding_role(user=Depends(get_current_active_user)):
    if user.role not in ["BRANDING", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return user


@branding_router.get("/trains")
def get_branding_trains(db: Session = Depends(get_db), user=Depends(check_branding_role)):
    result = db.execute(text("SELECT * FROM master_train_data")).fetchall()
    return [dict(r._mapping) for r in result]


@branding_router.put("/trains/{train_id}")
def update_branding_status(train_id: str, update_data: TrainBrandingUpdate,
                          db: Session = Depends(get_db), user=Depends(check_branding_role)):

    db.execute(text("""
        UPDATE master_train_data
        SET
            penalty_risk_level = COALESCE(:pr, penalty_risk_level),
            advertiser_name = COALESCE(:ad, advertiser_name)
        WHERE train_id = :train_id
    """), {
        "pr": update_data.penalty_risk_level,
        "ad": update_data.advertiser_name,
        "train_id": train_id
    })

    db.commit()
    return {"message": "Branding status updated"}