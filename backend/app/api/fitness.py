from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel

from app.core.database import get_db
from app.api.auth import get_current_active_user

fitness_router = APIRouter()


class TrainFitnessUpdate(BaseModel):
    compliance_status: str | None = None
    validity_status: str | None = None


def check_fitness_role(user=Depends(get_current_active_user)):
    if user.role not in ["FITNESS", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return user


@fitness_router.get("/trains")
def get_fitness_trains(db: Session = Depends(get_db), user=Depends(check_fitness_role)):
    result = db.execute(text("SELECT * FROM master_train_data")).fetchall()
    return [dict(r._mapping) for r in result]


@fitness_router.put("/trains/{train_id}")
def update_fitness_status(train_id: str, update_data: TrainFitnessUpdate,
                          db: Session = Depends(get_db), user=Depends(check_fitness_role)):

    db.execute(text("""
        UPDATE master_train_data
        SET compliance_status = COALESCE(:cs, compliance_status)
        WHERE train_id = :train_id
    """), {
        "cs": update_data.compliance_status,
        "train_id": train_id
    })

    db.commit()
    return {"message": "Fitness status updated"}