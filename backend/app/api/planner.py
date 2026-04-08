from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Any, Dict, Optional
from datetime import date

from app.core.database import get_db
from app.api.auth import get_current_active_user
from app.services.core_adapter import get_readiness_summary
from ml.planner_engine import generate_plan

planner_router = APIRouter()


class AssistantQuery(BaseModel):
    query: str
    plan_id: Optional[int] = None

class WhatIfConfig(BaseModel):
    maintenance_limit: float = 0.2
    risk_weight: float = 1.0

class OverrideRequest(BaseModel):
    plan_id: int
    train_id: str
    decision: str  # RUN / MAINTENANCE

def check_planner_role(user=Depends(get_current_active_user)):
    if user.role not in ["PLANNER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return user

@planner_router.post("/override")
def override_decision(
    request: OverrideRequest,
    db: Session = Depends(get_db),
    user=Depends(check_planner_role)
):

    # Validate decision
    if request.decision not in ["RUN", "MAINTENANCE"]:
        raise HTTPException(status_code=400, detail="Invalid decision")

    result = db.execute(text("""
        UPDATE plan_details
        SET decision = :decision,
            override_flag = TRUE
        WHERE plan_id = :pid
        AND train_id = :tid
        RETURNING *
    """), {
        "decision": request.decision,
        "pid": request.plan_id,
        "tid": request.train_id
    }).fetchone()

    if not result:
        raise HTTPException(status_code=404, detail="Plan or Train not found")

    return {
        "message": "Override applied successfully",
        "train_id": request.train_id,
        "new_decision": request.decision
    }


@planner_router.post("/what-if")
def simulate_plan(
    config: WhatIfConfig,
    user=Depends(check_planner_role)
):
    result = generate_plan(config=config.dict(), save=False)

    return {
        "type": "simulation",
        "config": config.dict(),
        "details": result["data"]
    }

@planner_router.get("/summary")
def get_planner_summary(db: Session = Depends(get_db), user=Depends(check_planner_role)):
    result = db.execute(text("SELECT * FROM master_train_data")).fetchall()
    trains = [dict(r._mapping) for r in result]
    return get_readiness_summary(trains)


@planner_router.post("/generate-plan")
def generate_plan_api(
    db: Session = Depends(get_db),
    user=Depends(check_planner_role)
):
    result = generate_plan()

    return {
        "plan_id": result["plan_id"],
        "details": result["data"]
    }

@planner_router.post("/finalize")
def finalize_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    user=Depends(check_planner_role)
):
    # future: lock plan
    return {
        "message": f"Plan {plan_id} finalized",
        "status": "locked"
    }