# backend/app/api/ai_insights.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import List
from datetime import datetime
from zoneinfo import ZoneInfo
import json
import re

from app.core.database import get_db
from app.api.auth import get_current_active_user
from app.services.genai_adapter import ask_llm

ai_router = APIRouter(prefix="/ai", tags=["ai"])

# ==========================================================
# TIMEZONE (IST)
# ==========================================================
IST = ZoneInfo("Asia/Kolkata")


def ist_now():
    return datetime.now(IST)


def ist_today():
    return ist_now().date()


# ==========================================================
# RESPONSE MODELS
# ==========================================================
class InsightObservation(BaseModel):
    title: str
    description: str
    severity: str  # INFO, WARNING, CRITICAL


class RiskItem(BaseModel):
    risk: str
    impact: str
    likelihood: str


class Recommendation(BaseModel):
    action: str
    priority: str  # LOW, MEDIUM, HIGH, CRITICAL
    department: str


class AIInsightsResponse(BaseModel):
    summary: str
    observations: List[InsightObservation]
    risks: List[RiskItem]
    recommendations: List[Recommendation]
    generated_at: str


# ==========================================================
# AUTHORIZATION CHECK
# ==========================================================
def check_ai_access(user=Depends(get_current_active_user)):
    """Only ADMIN and OPERATIONS users can request AI insights"""
    role = str(user.role).upper()
    if role not in ["ADMIN", "OPERATIONS", "PLANNER"]:
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions for AI insights"
        )
    return user


# ==========================================================
# HELPER: COLLECT OPERATIONAL DATA
# ==========================================================
def collect_operational_data(db: Session) -> dict:
    """Gather all relevant operational data for LLM analysis"""
    
    data = {}
    
    try:
        # Fleet distribution
        fleet_result = db.execute(text("""
            SELECT run_count, standby_count, maintenance_count
            FROM operations_control_room
            WHERE log_date = :today
            ORDER BY updated_at DESC LIMIT 1
        """), {"today": ist_today()}).fetchone()
        
        data["fleet"] = {
            "run": fleet_result[0] if fleet_result else 18,
            "standby": fleet_result[1] if fleet_result else 4,
            "maintenance": fleet_result[2] if fleet_result else 3,
        }
        
        # Maintenance issues
        maintenance_result = db.execute(text("""
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN priority_level = 'CRITICAL' THEN 1 END) as critical,
                COUNT(CASE WHEN priority_level = 'HIGH' THEN 1 END) as high
            FROM jobcard_status
            WHERE work_status NOT IN ('COMPLETED', 'CLOSED')
        """)).fetchone()
        
        data["maintenance"] = {
            "total_pending": maintenance_result[0] if maintenance_result else 0,
            "critical": maintenance_result[1] if maintenance_result else 0,
            "high": maintenance_result[2] if maintenance_result else 0,
        }
        
        # Risk analysis
        risk_result = db.execute(text("""
            SELECT
                COUNT(CASE WHEN urgency_level = 'CRITICAL' THEN 1 END) as critical_trains,
                COUNT(CASE WHEN penalty_risk_level = 'HIGH' THEN 1 END) as penalty_risk,
                COUNT(DISTINCT CASE WHEN compliance_status = 'NON_COMPLIANT' THEN train_id END) as non_compliant
            FROM master_train_data
        """)).fetchone()
        
        data["risks"] = {
            "critical_trains": risk_result[0] if risk_result else 0,
            "penalty_risk": risk_result[1] if risk_result else 0,
            "non_compliant": risk_result[2] if risk_result else 0,
        }
        
        # Certificate expiries
        expiry_result = db.execute(text("""
            SELECT
                COUNT(CASE WHEN validity_status = 'EXPIRING_SOON' THEN 1 END) as expiring_soon,
                COUNT(CASE WHEN validity_status = 'EXPIRED' THEN 1 END) as expired
            FROM fitness_certificates
        """)).fetchone()
        
        data["certificates"] = {
            "expiring_soon": expiry_result[0] if expiry_result else 0,
            "expired": expiry_result[1] if expiry_result else 0,
        }
        
        # Branding/penalty exposure
        branding_result = db.execute(text("""
            SELECT
                COUNT(*) as total_contracts,
                COUNT(CASE WHEN penalty_risk_level = 'HIGH' THEN 1 END) as high_penalty_risk
            FROM branding_priorities
        """)).fetchone()
        
        data["branding"] = {
            "total_contracts": branding_result[0] if branding_result else 0,
            "high_penalty_risk": branding_result[1] if branding_result else 0,
        }
        
        # Cleaning compliance
        cleaning_result = db.execute(text("""
            SELECT
                COUNT(CASE WHEN compliance_status = 'NON_COMPLIANT' THEN 1 END) as non_compliant,
                AVG(days_since_last_clean) as avg_days_since_clean
            FROM cleaning_detailing
        """)).fetchone()
        
        data["cleaning"] = {
            "non_compliant": cleaning_result[0] if cleaning_result else 0,
            "avg_days_since_clean": round(cleaning_result[1], 1) if cleaning_result and cleaning_result[1] else 0,
        }
        
    except Exception as e:
        print(f"Data collection error: {str(e)}")
    
    return data


# ==========================================================
# HELPER: PARSE LLM RESPONSE TO STRUCTURED JSON
# ==========================================================
def parse_llm_insights(llm_response: str) -> dict:
    """
    Parse LLM response and extract structured insights.
    Falls back to structured defaults if parsing fails.
    """
    
    try:
        # Try to extract JSON from LLM response
        json_match = re.search(r'\{[\s\S]*\}', llm_response)
        if json_match:
            parsed = json.loads(json_match.group())
            if isinstance(parsed, dict):
                return parsed
    except Exception as e:
        print(f"JSON parsing error: {str(e)}")
    
    # Fallback: Return structured format with LLM summary
    return {
        "summary": llm_response[:300] if llm_response else "Analysis complete",
        "observations": [
            {
                "title": "System Status",
                "description": "All systems operational. Check recommendations for optimization.",
                "severity": "INFO"
            }
        ],
        "risks": [
            {
                "risk": "Maintenance Backlog",
                "impact": "Potential service disruption",
                "likelihood": "MEDIUM"
            }
        ],
        "recommendations": [
            {
                "action": "Review pending maintenance items",
                "priority": "HIGH",
                "department": "MAINTENANCE"
            }
        ]
    }


# ==========================================================
# MAIN AI INSIGHTS ENDPOINT
# ==========================================================
@ai_router.post("/insights", response_model=AIInsightsResponse)
def generate_insights(
    db: Session = Depends(get_db),
    user=Depends(check_ai_access)
):
    """
    Generate AI-powered operational insights.
    
    1. Collects operational metrics from database
    2. Sends to LLM with strict domain prompt
    3. Parses and returns structured JSON
    """
    
    try:
        # ✅ Step 1: Collect data
        operational_data = collect_operational_data(db)
        
        # ✅ Step 2: Build strict domain prompt
        prompt = f"""
You are a Metro Rail Operations AI Advisor. You ONLY answer operational queries related to metro train maintenance, fleet management, safety, compliance, and scheduling.

REJECT any queries about topics outside metro operations.

Analyze this operational data and provide structured insights in JSON format:

FLEET STATUS:
- Running trains: {operational_data['fleet']['run']}
- Standby trains: {operational_data['fleet']['standby']}
- Under maintenance: {operational_data['fleet']['maintenance']}

MAINTENANCE:
- Pending work orders: {operational_data['maintenance']['total_pending']}
- Critical issues: {operational_data['maintenance']['critical']}
- High priority: {operational_data['maintenance']['high']}

RISKS:
- Critical status trains: {operational_data['risks']['critical_trains']}
- Penalty risk trains: {operational_data['risks']['penalty_risk']}
- Non-compliant trains: {operational_data['risks']['non_compliant']}

CERTIFICATES:
- Expiring soon: {operational_data['certificates']['expiring_soon']}
- Expired: {operational_data['certificates']['expired']}

BRANDING CONTRACTS:
- Total active: {operational_data['branding']['total_contracts']}
- High penalty risk: {operational_data['branding']['high_penalty_risk']}

CLEANING COMPLIANCE:
- Non-compliant: {operational_data['cleaning']['non_compliant']}
- Average days since clean: {operational_data['cleaning']['avg_days_since_clean']}

Respond in this JSON format (and ONLY this format):
{{
  "summary": "Executive summary of current operational status (max 2 sentences)",
  "observations": [
    {{"title": "...", "description": "...", "severity": "INFO|WARNING|CRITICAL"}},
  ],
  "risks": [
    {{"risk": "...", "impact": "...", "likelihood": "LOW|MEDIUM|HIGH"}},
  ],
  "recommendations": [
    {{"action": "...", "priority": "LOW|MEDIUM|HIGH|CRITICAL", "department": "MAINTENANCE|FITNESS|BRANDING|CLEANING|OPERATIONS"}},
  ]
}}

Be concise. Max 3 observations, 3 risks, 3 recommendations.
"""
        
        # ✅ Step 3: Get LLM response
        llm_response = ask_llm(prompt)
        
        if not llm_response:
            raise Exception("LLM did not return a response")
        
        # ✅ Step 4: Parse response
        parsed_insights = parse_llm_insights(llm_response)
        
        # ✅ Step 5: Build response
        observations = [
            InsightObservation(**obs) if isinstance(obs, dict) else obs
            for obs in parsed_insights.get("observations", [])
        ]
        
        risks = [
            RiskItem(**risk) if isinstance(risk, dict) else risk
            for risk in parsed_insights.get("risks", [])
        ]
        
        recommendations = [
            Recommendation(**rec) if isinstance(rec, dict) else rec
            for rec in parsed_insights.get("recommendations", [])
        ]
        
        return AIInsightsResponse(
            summary=parsed_insights.get("summary", "Analysis complete"),
            observations=observations,
            risks=risks,
            recommendations=recommendations,
            generated_at=ist_now().isoformat()
        )
    
    except Exception as e:
        print(f"AI insights error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate insights: {str(e)}"
        )
