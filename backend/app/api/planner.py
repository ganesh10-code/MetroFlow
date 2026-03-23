from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Any, Dict
from app.core.database import get_db
from app.models.user import User
from app.models.train import MasterTrainData
from app.api.auth import get_current_active_user
from app.services.core_adapter import get_readiness_summary, generate_plan_placeholder
from app.services.genai_adapter import generate_explanation, ask_assistant
from app.services.audit import log_action

planner_router = APIRouter()

class AssistantQuery(BaseModel):
    query: str

def check_planner_role(current_user: User = Depends(get_current_active_user)):
    if current_user.role not in ["PLANNER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

@planner_router.get("/summary")
def get_planner_summary(db: Session = Depends(get_db), user: User = Depends(check_planner_role)):
    # get all trains as dicts
    trains = db.query(MasterTrainData).all()
    trains_list = [{"train_id": t.train_id, "rolling_stock_status": t.rolling_stock_status} for t in trains]
    summary = get_readiness_summary(trains_list)
    return summary

@planner_router.post("/generate-plan")
def generate_plan(db: Session = Depends(get_db), user: User = Depends(check_planner_role)):
    trains = db.query(MasterTrainData).all()
    trains_list = [{"train_id": t.train_id, "rolling_stock_status": t.rolling_stock_status} for t in trains]
    
    plan_result = generate_plan_placeholder(trains_list)
    explanation = generate_explanation(plan_result)
    
    log_action(db, user.id, "GENERATED_PLAN", "plan", plan_result["plan_id"])
    
    return {
        "plan": plan_result,
        "explanation": explanation
    }

@planner_router.post("/assistant")
def chat_with_assistant(query: AssistantQuery, user: User = Depends(check_planner_role)):
    response = ask_assistant(query.query, context={})
    return {"response": response}
