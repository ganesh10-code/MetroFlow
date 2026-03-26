from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from datetime import datetime, date

from app.core.database import get_db
from app.models.user import User
from app.models.train import MasterTrainData
from app.models.plan import Plan, PlanDetail
from app.api.auth import get_current_active_user
from app.services.core_adapter import get_readiness_summary, generate_plan_placeholder
from app.services.genai_adapter import generate_explanation, explain_plan, summarize_plan, ask_assistant
from app.services.audit import log_action

planner_router = APIRouter()


# ─── Request/Response schemas ──────────────────────────────────────────────────

class AssistantQuery(BaseModel):
    query: str
    plan_id: Optional[int] = None

class OverrideRequest(BaseModel):
    plan_id: int
    train_id: str
    decision: str          # INDUCT or HOLD
    remarks: Optional[str] = None


# ─── Role guard ────────────────────────────────────────────────────────────────

def check_planner_role(current_user: User = Depends(get_current_active_user)):
    if current_user.role not in ["PLANNER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user


# ─── Helper ────────────────────────────────────────────────────────────────────

def _train_to_dict(t: MasterTrainData) -> Dict[str, Any]:
    return {
        "train_id": t.train_id,
        "rolling_stock_status": t.rolling_stock_status,
        "compliance_status": t.compliance_status,
        "penalty_risk_level": t.penalty_risk_level,
        "urgency_level": t.urgency_level,
        "signalling_status": t.signalling_status,
        "telecom_status": t.telecom_status,
        "advertiser_name": t.advertiser_name,
        "highest_open_job_priority": t.highest_open_job_priority,
        "kilometers_since_last_maintenance": t.kilometers_since_last_maintenance,
        "days_since_last_clean": t.days_since_last_clean,
    }


# ─── Endpoints ─────────────────────────────────────────────────────────────────

@planner_router.get("/summary")
def get_planner_summary(db: Session = Depends(get_db), user: User = Depends(check_planner_role)):
    trains = db.query(MasterTrainData).all()
    trains_list = [_train_to_dict(t) for t in trains]
    summary = get_readiness_summary(trains_list)
    return summary


@planner_router.get("/trains")
def get_all_trains_for_planner(db: Session = Depends(get_db), user: User = Depends(check_planner_role)):
    """Return full train data for the planner overview table."""
    trains = db.query(MasterTrainData).all()
    return [_train_to_dict(t) for t in trains]


@planner_router.post("/generate-plan")
def generate_plan(db: Session = Depends(get_db), user: User = Depends(check_planner_role)):
    """
    Generate and persist an induction plan.
    Uses core_adapter placeholder — Ganesh's optimizer plugs in here.
    """
    trains = db.query(MasterTrainData).all()
    trains_list = [_train_to_dict(t) for t in trains]

    plan_result = generate_plan_placeholder(trains_list)
    explanation = generate_explanation(plan_result)
    summary_data = {"total": len(trains_list), "details": plan_result.get("details", [])}
    summary_text = str(summarize_plan(summary_data))

    # Persist Plan
    new_plan = Plan(
        date=str(date.today()),
        created_by=user.id,
        created_at=datetime.utcnow(),
        is_locked=False,
        status="GENERATED",
        total_trains=len(trains_list),
        selected_count=len(plan_result.get("selected_trains", [])),
        confidence_score=plan_result.get("confidence_score"),
        explanation=explanation,
        summary=summary_text,
    )
    db.add(new_plan)
    db.flush()  # get new_plan.id

    # Persist PlanDetails
    for detail in plan_result.get("details", []):
        pd = PlanDetail(
            plan_id=new_plan.id,
            train_id=detail["train_id"],
            decision=detail["decision"],
            risk_score=detail.get("risk_score"),
            override_flag=False,
        )
        db.add(pd)

    db.commit()
    db.refresh(new_plan)

    log_action(db, user.id, "GENERATED_PLAN", "plan", str(new_plan.id), f"Generated plan with {new_plan.selected_count} inducted trains")

    return {
        "plan_id": new_plan.id,
        "date": new_plan.date,
        "status": new_plan.status,
        "total_trains": new_plan.total_trains,
        "selected_count": new_plan.selected_count,
        "confidence_score": new_plan.confidence_score,
        "explanation": new_plan.explanation,
        "details": plan_result.get("details", []),
    }


@planner_router.get("/history")
def get_plan_history(db: Session = Depends(get_db), user: User = Depends(check_planner_role)):
    """Return list of all generated plans (most recent first)."""
    plans = db.query(Plan).order_by(Plan.created_at.desc()).all()
    result = []
    for p in plans:
        override_count = db.query(PlanDetail).filter(
            PlanDetail.plan_id == p.id,
            PlanDetail.override_flag == True
        ).count()
        result.append({
            "id": p.id,
            "date": p.date,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "created_by": p.created_by,
            "status": p.status,
            "is_locked": p.is_locked,
            "total_trains": p.total_trains,
            "selected_count": p.selected_count,
            "confidence_score": p.confidence_score,
            "override_count": override_count,
        })
    return result


@planner_router.get("/history/{plan_id}")
def get_plan_detail(plan_id: int, db: Session = Depends(get_db), user: User = Depends(check_planner_role)):
    """Return a full plan with all train-level decisions."""
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    details = db.query(PlanDetail).filter(PlanDetail.plan_id == plan_id).all()
    details_list = [{
        "id": d.id,
        "train_id": d.train_id,
        "decision": d.decision,
        "risk_score": d.risk_score,
        "override_flag": d.override_flag,
        "remarks": d.remarks,
        "overridden_at": d.overridden_at.isoformat() if d.overridden_at else None,
    } for d in details]

    return {
        "id": plan.id,
        "date": plan.date,
        "created_at": plan.created_at.isoformat() if plan.created_at else None,
        "created_by": plan.created_by,
        "status": plan.status,
        "is_locked": plan.is_locked,
        "total_trains": plan.total_trains,
        "selected_count": plan.selected_count,
        "confidence_score": plan.confidence_score,
        "explanation": plan.explanation,
        "summary": plan.summary,
        "details": details_list,
    }


@planner_router.post("/override")
def override_plan_detail(req: OverrideRequest, db: Session = Depends(get_db), user: User = Depends(check_planner_role)):
    """
    Override a single train's decision within a plan.
    Cannot override a locked plan.
    """
    plan = db.query(Plan).filter(Plan.id == req.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    if plan.is_locked:
        raise HTTPException(status_code=400, detail="Cannot override a locked plan")

    if req.decision not in ["INDUCT", "HOLD"]:
        raise HTTPException(status_code=422, detail="Decision must be INDUCT or HOLD")

    detail = db.query(PlanDetail).filter(
        PlanDetail.plan_id == req.plan_id,
        PlanDetail.train_id == req.train_id
    ).first()
    if not detail:
        raise HTTPException(status_code=404, detail="Train not found in this plan")

    detail.decision = req.decision
    detail.override_flag = True
    detail.remarks = req.remarks
    detail.overridden_by = user.id
    detail.overridden_at = datetime.utcnow()

    # Update selected count on plan
    inducted = db.query(PlanDetail).filter(
        PlanDetail.plan_id == req.plan_id,
        PlanDetail.decision == "INDUCT"
    ).count()
    plan.selected_count = inducted

    db.commit()

    log_action(db, user.id, "OVERRIDE", "plan_detail", str(detail.id),
               f"Train {req.train_id} overridden to {req.decision}. Remarks: {req.remarks or 'None'}")

    return {"message": "Override applied", "train_id": req.train_id, "new_decision": req.decision}


@planner_router.post("/lock-plan/{plan_id}")
def lock_plan(plan_id: int, db: Session = Depends(get_db), user: User = Depends(check_planner_role)):
    """Lock a plan so no further overrides can be made."""
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    if plan.is_locked:
        raise HTTPException(status_code=400, detail="Plan is already locked")

    plan.is_locked = True
    plan.status = "LOCKED"
    db.commit()

    log_action(db, user.id, "LOCK_PLAN", "plan", str(plan_id), "Plan locked by planner")

    return {"message": "Plan locked successfully", "plan_id": plan_id}


@planner_router.post("/assistant")
def chat_with_assistant(query: AssistantQuery, db: Session = Depends(get_db), user: User = Depends(check_planner_role)):
    """Planner GenAI assistant — placeholder ready for real LLM integration."""
    context: Dict[str, Any] = {}
    if query.plan_id:
        plan = db.query(Plan).filter(Plan.id == query.plan_id).first()
        if plan:
            context["plan_id"] = query.plan_id
            context["date"] = plan.date
            context["selected_count"] = plan.selected_count

    response = ask_assistant(query.query, context=context)
    return {"response": response}
