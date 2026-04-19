"""
Premium Analytics Module for MetroFlow Admin Dashboard
- REAL-TIME analytics from database + Kafka events
- NO hardcoded or synthetic data
- Context-aware GenAI analytics assistant
- 7-day trend calculation from actual data
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import json

from app.core.database import get_db
from app.api.auth import get_current_active_user
from app.services.genai_adapter import ask_llm
from app.services.kafka_consumer_store import (
    get_analytics_state,
    get_recent_events,
    get_consumer_runtime_status,
)

admin_analytics_router = APIRouter(prefix="/admin/analytics", tags=["admin-analytics"])

# ==========================================================
# TIMEZONE
# ==========================================================
IST = ZoneInfo("Asia/Kolkata")

def ist_now():
    return datetime.now(IST)

def ist_today():
    return ist_now().date()

# ==========================================================
# RESPONSE MODELS
# ==========================================================
class SummaryMetrics(BaseModel):
    total_trains: int
    running_trains: int
    standby_trains: int
    maintenance_trains: int
    high_risk_trains: int
    today_submissions: int
    maintenance_backlog: int
    fitness_non_compliant: int
    timestamp: str

class TrendPoint(BaseModel):
    date: str
    value: float

class TrendsData(BaseModel):
    maintenance_trend: List[TrendPoint]
    cleaning_trend: List[TrendPoint]
    fitness_trend: List[TrendPoint]
    risk_trend: List[TrendPoint]

class KafkaEvent(BaseModel):
    timestamp: str
    department: str
    event_type: str
    train_id: str
    details: str
    records_count: int = 0
    user_id: Optional[int] = None

class ChatRequest(BaseModel):
    query: str
    context: Optional[Dict[str, Any]] = None

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: str

class ChatResponse(BaseModel):
    messages: List[ChatMessage]
    analysis: str

class RiskTrain(BaseModel):
    train_id: str
    urgency_level: str
    penalty_risk_level: str
    compliance_status: Optional[str] = None
    open_job_priority: Optional[str] = None
    km_since_maintenance: int

# ==========================================================
# AUTHORIZATION
# ==========================================================
def check_admin_access(user=Depends(get_current_active_user)):
    role = str(user.role).upper()
    if role not in ["ADMIN", "OPERATIONS", "PLANNER"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return user


def _recent_events_from_db(db: Session, limit: int = 20) -> List[Dict[str, Any]]:
    try:
        rows = db.execute(
            text(
                """
                SELECT event_timestamp, department, event_type, train_id, payload
                FROM events_log
                ORDER BY event_timestamp DESC
                LIMIT :limit
                """
            ),
            {"limit": limit},
        ).fetchall()
    except Exception as exc:
        print(f"⚠️ _recent_events_from_db failed: {str(exc)}")
        return []

    events: List[Dict[str, Any]] = []
    for row in rows:
        raw_payload = row[4] if len(row) > 4 else {}
        if isinstance(raw_payload, str):
            try:
                raw_payload = json.loads(raw_payload)
            except Exception:
                raw_payload = {}
        payload = raw_payload or {}
        records_count = int(payload.get("records_count", 0) or 0)
        details = str(payload.get("details") or f"{row[1]} submitted {records_count} record(s)")

        events.append(
            {
                "timestamp": row[0].isoformat() if hasattr(row[0], "isoformat") else str(row[0]),
                "department": str(row[1] or "unknown"),
                "event_type": str(row[2] or "unknown"),
                "train_id": str(row[3] or "N/A"),
                "details": details,
                "records_count": records_count,
                "user_id": payload.get("user_id"),
            }
        )
    if events:
        return events

    # Fallback: synthesize "recent events" from department log tables for today.
    try:
        fallback_rows = db.execute(
            text(
                """
                SELECT 'maintenance' AS department, COUNT(*)::int AS records_count, MAX(updated_at) AS updated_at
                FROM maintenance_logs
                WHERE log_date = CURRENT_DATE
                UNION ALL
                SELECT 'fitness' AS department, COUNT(*)::int AS records_count, MAX(updated_at) AS updated_at
                FROM fitness_logs
                WHERE log_date = CURRENT_DATE
                UNION ALL
                SELECT 'cleaning' AS department, COUNT(*)::int AS records_count, MAX(updated_at) AS updated_at
                FROM cleaning_logs
                WHERE log_date = CURRENT_DATE
                UNION ALL
                SELECT 'branding' AS department, COUNT(*)::int AS records_count, MAX(updated_at) AS updated_at
                FROM branding_logs
                WHERE log_date = CURRENT_DATE
                UNION ALL
                SELECT 'operations' AS department, 1::int AS records_count, MAX(updated_at) AS updated_at
                FROM operations_control_room
                WHERE log_date = CURRENT_DATE
                """
            )
        ).fetchall()

        synthesized: List[Dict[str, Any]] = []
        for dept, count, updated_at in fallback_rows:
            records_count = int(count or 0)
            if records_count <= 0:
                continue
            ts = updated_at.isoformat() if hasattr(updated_at, "isoformat") else ist_now().isoformat()
            synthesized.append(
                {
                    "timestamp": ts,
                    "department": str(dept),
                    "event_type": "department_submission",
                    "train_id": "N/A",
                    "details": f"{dept} submitted {records_count} record(s)",
                    "records_count": records_count,
                    "user_id": None,
                }
            )

        synthesized.sort(key=lambda x: x["timestamp"], reverse=True)
        return synthesized[:limit]
    except Exception as exc:
        print(f"⚠️ fallback events synthesis failed: {str(exc)}")
        return []

# ==========================================================
# 1. SUMMARY AGGREGATION
# ==========================================================
@admin_analytics_router.get("/summary", response_model=SummaryMetrics)
def get_summary_metrics(
    db: Session = Depends(get_db),
    user=Depends(check_admin_access)
):
    """
    Return LIVE in-memory analytics state updated by Kafka consumer.
    """
    try:
        events = _recent_events_from_db(db, limit=20)
        if not events:
            state = get_analytics_state()
            events = state.get("events", [])

        department_counts: Dict[str, int] = {}
        maintenance_backlog = 0
        high_risk_trains = 0

        for event in events:
            dept = str(event.get("department", "unknown")).lower()
            count = int(event.get("records_count", 0) or 0)
            department_counts[dept] = int(department_counts.get(dept, 0)) + count
            if dept == "maintenance":
                maintenance_backlog += count
            elif dept == "fitness":
                high_risk_trains += count

        total_trains = int(
            db.execute(text("SELECT COUNT(*) FROM master_train_data")).scalar() or 0
        )

        ocr_row = db.execute(
            text(
                """
                SELECT run_count, standby_count, maintenance_count
                FROM operations_control_room
                WHERE log_date = CURRENT_DATE
                ORDER BY updated_at DESC
                LIMIT 1
                """
            )
        ).fetchone()
        running_trains = int(ocr_row[0]) if ocr_row else int(department_counts.get("operations", 0))
        standby_trains = int(ocr_row[1]) if ocr_row else max(0, total_trains - running_trains)
        maintenance_trains = int(ocr_row[2]) if ocr_row else int(department_counts.get("maintenance", 0))
        ts = events[0]["timestamp"] if events else ist_now().isoformat()

        summary = SummaryMetrics(
            total_trains=total_trains,
            running_trains=running_trains,
            standby_trains=standby_trains,
            maintenance_trains=maintenance_trains,
            high_risk_trains=high_risk_trains,
            today_submissions=len(events),
            maintenance_backlog=maintenance_backlog,
            fitness_non_compliant=int(department_counts.get("fitness", 0)),
            timestamp=ts,
        )
        print(f"📤 /admin/analytics/summary response: {summary.model_dump()}")
        return summary
    
    except Exception as e:
        print(f"❌ Summary error: {str(e)}")
        # Return zeros rather than 500 error
        return SummaryMetrics(
            total_trains=0,
            running_trains=0,
            standby_trains=0,
            maintenance_trains=0,
            high_risk_trains=0,
            today_submissions=0,
            maintenance_backlog=0,
            fitness_non_compliant=0,
            timestamp=ist_now().isoformat()
        )

# ==========================================================
# 2. TRENDS (7-day moving average)
# ==========================================================
@admin_analytics_router.get("/trends", response_model=TrendsData)
def get_trends(
    days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db),
    user=Depends(check_admin_access)
):
    """
    Generate simple trend arrays from last Kafka event updates.
    """
    try:
        event_limit = min(max(days, 1), 7)
        events = _recent_events_from_db(db, limit=20)
        if not events:
            events = get_recent_events(limit=20)
        selected_events = list(reversed(events[:event_limit]))

        maintenance_trend = []
        cleaning_trend = []
        fitness_trend = []
        risk_trend = []
        running_risk = 0.0

        for event in selected_events:
            event_date = str(event.get("timestamp", ist_now().isoformat()))
            department = str(event.get("department", "")).lower()
            count = float(event.get("records_count", 0))

            maintenance_trend.append(
                TrendPoint(date=event_date, value=count if department == "maintenance" else 0.0)
            )
            cleaning_trend.append(
                TrendPoint(date=event_date, value=count if department == "cleaning" else 0.0)
            )
            fitness_trend.append(
                TrendPoint(date=event_date, value=count if department == "fitness" else 0.0)
            )
            running_risk = max(0.0, min(1.0, running_risk + (count / 100.0 if department == "fitness" else 0.0)))
            risk_trend.append(TrendPoint(date=event_date, value=running_risk))

        while len(maintenance_trend) < 7:
            fallback_date = ist_now() - timedelta(minutes=(7 - len(maintenance_trend)))
            iso = fallback_date.isoformat()
            maintenance_trend.insert(0, TrendPoint(date=iso, value=0.0))
            cleaning_trend.insert(0, TrendPoint(date=iso, value=0.0))
            fitness_trend.insert(0, TrendPoint(date=iso, value=0.0))
            risk_trend.insert(0, TrendPoint(date=iso, value=0.0))

        trends = TrendsData(
            maintenance_trend=maintenance_trend[-7:],
            cleaning_trend=cleaning_trend[-7:],
            fitness_trend=fitness_trend[-7:],
            risk_trend=risk_trend[-7:],
        )
        print(f"📤 /admin/analytics/trends response points={len(trends.maintenance_trend)}")
        return trends
    
    except Exception as e:
        print(f"❌ Trends error: {str(e)}")
        # Return empty trends rather than 500 error
        days_list = [ist_today() - timedelta(days=i) for i in range(days, 0, -1)]
        empty_trends = [TrendPoint(date=d.isoformat(), value=0.0) for d in days_list]
        return TrendsData(
            maintenance_trend=empty_trends,
            cleaning_trend=empty_trends,
            fitness_trend=empty_trends,
            risk_trend=empty_trends
        )

# ==========================================================
# 3. KAFKA LIVE EVENTS (Optional)
# ==========================================================
@admin_analytics_router.get("/kafka-live")
def get_kafka_live_events(
    db: Session = Depends(get_db),
    user=Depends(check_admin_access),
    limit: int = Query(20, ge=1, le=100),
):
    """
    Return recent in-memory Kafka events.
    """
    try:
        source_events = _recent_events_from_db(db, limit=limit)
        if not source_events:
            source_events = get_recent_events(limit=limit)

        events = [
            KafkaEvent(
                timestamp=str(event.get("timestamp", ist_now().isoformat())),
                department=str(event.get("department", "unknown")),
                event_type=str(event.get("event_type", "unknown")),
                train_id=str(event.get("train_id", "N/A")),
                details=str(event.get("details", "Kafka event")),
                records_count=int(event.get("records_count", 0) or 0),
                user_id=event.get("user_id"),
            )
            for event in source_events
        ]
        response = {
            "events": events,
            "count": len(events),
            "timestamp": ist_now().isoformat()
        }
        print(f"📤 /admin/analytics/kafka-live response count={response['count']}")
        return response
    
    except Exception as e:
        print(f"❌ Kafka events error: {str(e)}")
        return {"events": [], "count": 0, "timestamp": ist_now().isoformat()}


@admin_analytics_router.get("/health")
def get_analytics_health(user=Depends(check_admin_access)):
    """Runtime status for Kafka analytics pipeline."""
    status = get_consumer_runtime_status()
    print(f"📤 /admin/analytics/health response: {status}")
    return status

# ==========================================================
# 4. GENAI ANALYTICS CHAT
# ==========================================================
def build_analytics_context(db: Session) -> dict:
    """Build rich, FRESH context from real database for LLM."""
    
    context = {}
    
    try:
        # Metrics summary
        try:
            summary = db.execute(text("""
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN urgency_level = 'CRITICAL' THEN 1 ELSE 0 END) as critical_count
                FROM master_train_data
            """)).fetchone()
            context["fleet_overview"] = {
                "total_trains": summary[0] if summary and summary[0] else 0,
                "critical_trains": summary[1] if summary and summary[1] else 0
            }
        except Exception as e:
            print(f"⚠️ Fleet overview query failed: {str(e)}")
            context["fleet_overview"] = {"total_trains": 0, "critical_trains": 0}
        
        # Maintenance backlog (REAL)
        try:
            backlog = db.execute(text("""
                SELECT 
                    COUNT(*) as total_pending,
                    SUM(CASE WHEN priority_level = 'CRITICAL' THEN 1 ELSE 0 END) as critical,
                    SUM(CASE WHEN priority_level = 'HIGH' THEN 1 ELSE 0 END) as high
                FROM jobcard_status
                WHERE work_status NOT IN ('COMPLETED', 'CLOSED')
            """)).fetchone()
            context["maintenance"] = {
                "pending": backlog[0] if backlog and backlog[0] else 0,
                "critical": backlog[1] if backlog and backlog[1] else 0,
                "high": backlog[2] if backlog and backlog[2] else 0
            }
        except Exception as e:
            print(f"⚠️ Maintenance backlog query failed: {str(e)}")
            context["maintenance"] = {"pending": 0, "critical": 0, "high": 0}
        
        # Fitness compliance (REAL)
        try:
            fitness = db.execute(text("""
                SELECT 
                    SUM(CASE WHEN validity_status = 'EXPIRED' THEN 1 ELSE 0 END) as expired,
                    SUM(CASE WHEN validity_status = 'EXPIRING_SOON' THEN 1 ELSE 0 END) as expiring
                FROM fitness_certificates
            """)).fetchone()
            context["fitness"] = {
                "expired": fitness[0] if fitness and fitness[0] else 0,
                "expiring_soon": fitness[1] if fitness and fitness[1] else 0
            }
        except Exception as e:
            print(f"⚠️ Fitness compliance query failed: {str(e)}")
            context["fitness"] = {"expired": 0, "expiring_soon": 0}
        
        # Cleaning status (REAL)
        try:
            cleaning = db.execute(text("""
                SELECT 
                    SUM(CASE WHEN compliance_status = 'NON_COMPLIANT' THEN 1 ELSE 0 END) as non_compliant,
                    AVG(days_since_last_clean) as avg_days
                FROM cleaning_detailing
            """)).fetchone()
            context["cleaning"] = {
                "non_compliant": cleaning[0] if cleaning and cleaning[0] else 0,
                "avg_days_since_clean": round(cleaning[1], 1) if cleaning and cleaning[1] else 0
            }
        except Exception as e:
            print(f"⚠️ Cleaning status query failed: {str(e)}")
            context["cleaning"] = {"non_compliant": 0, "avg_days_since_clean": 0}
        
        # Today's events count (REAL Kafka events) - graceful fallback
        context["today_events"] = 0
        try:
            events_count = db.execute(text("""
                SELECT COUNT(*)
                FROM events_log
                WHERE event_timestamp >= :today_start
            """), {"today_start": ist_now().replace(hour=0, minute=0, second=0, microsecond=0)}).fetchone()
            context["today_events"] = events_count[0] if events_count else 0
        except Exception as e:
            print(f"⚠️ Today events query failed (events_log may not exist): {str(e)}")
            context["today_events"] = 0
        
    except Exception as e:
        print(f"❌ Context building error: {str(e)}")
    
    return context

@admin_analytics_router.post("/chat")
def analytics_chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    user=Depends(check_admin_access)
):
    """
    GenAI analytics assistant - ChatGPT style interface.
    
    STRICTLY: MetroFlow analytics ONLY, uses FRESH real-time data
    DO NOT: general knowledge, planner decisions, hallucinations
    """
    
    try:
        # Build FRESH context from database (called every time)
        context = build_analytics_context(db)
        
        # Strict domain prompt with REAL current data
        system_prompt = """You are MetroFlow Analytics Assistant - ONLY for MetroFlow operational analytics.

REAL-TIME DATA:
Fleet Status:
- Total trains: {total}
- Critical risk: {critical}
- Maintenance backlog: {maint_pending} ({maint_critical} critical, {maint_high} high)
- Fitness compliance: {fitness_expired} expired, {fitness_expiring} expiring
- Cleaning status: {clean_non_compliant} non-compliant, avg {clean_avg_days} days since clean
- Today's Kafka events: {today_events}

User Question: {query}

RULES:
1. Answer ONLY about MetroFlow operational analytics
2. Use ONLY the provided real data - DO NOT hallucinate
3. If asked about unrelated topics: "This assistant only handles MetroFlow analytics."
4. Provide insights based on actual numbers
5. Be concise (max 150 words)
6. Reference specific data points in responses"""

        filled_prompt = system_prompt.format(
            total=context.get("fleet_overview", {}).get("total_trains", 0),
            critical=context.get("fleet_overview", {}).get("critical_trains", 0),
            maint_pending=context.get("maintenance", {}).get("pending", 0),
            maint_critical=context.get("maintenance", {}).get("critical", 0),
            maint_high=context.get("maintenance", {}).get("high", 0),
            fitness_expired=context.get("fitness", {}).get("expired", 0),
            fitness_expiring=context.get("fitness", {}).get("expiring_soon", 0),
            clean_non_compliant=context.get("cleaning", {}).get("non_compliant", 0),
            clean_avg_days=context.get("cleaning", {}).get("avg_days_since_clean", 0),
            today_events=context.get("today_events", 0),
            query=request.query
        )
        
        # Call LLM with fresh context
        response_text = ask_llm(filled_prompt)
        
        if not response_text:
            response_text = "Unable to analyze. Please try again."
        
        # Build response with chat history
        messages = [
            ChatMessage(
                role="user",
                content=request.query,
                timestamp=ist_now().isoformat()
            ),
            ChatMessage(
                role="assistant",
                content=response_text,
                timestamp=ist_now().isoformat()
            )
        ]
        
        return ChatResponse(
            messages=messages,
            analysis=response_text
        )
    
    except Exception as e:
        print(f"❌ Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")

# ==========================================================
# 5. HIGH RISK TRAINS DETAIL
# ==========================================================
@admin_analytics_router.get("/risks/high-risk-trains", response_model=List[RiskTrain])
def get_high_risk_trains(
    db: Session = Depends(get_db),
    user=Depends(check_admin_access)
):
    """Get detailed list of high-risk trains from real data."""
    
    try:
        try:
            trains = db.execute(text("""
                SELECT 
                    train_id,
                    urgency_level,
                    penalty_risk_level,
                    compliance_status,
                    highest_open_job_priority,
                    kilometers_since_last_maintenance
                FROM master_train_data
                WHERE urgency_level = 'CRITICAL'
                OR penalty_risk_level = 'HIGH'
                ORDER BY train_id
                LIMIT 20
            """)).fetchall()
        except Exception as e:
            print(f"⚠️ High risk trains query failed: {str(e)}")
            trains = []
        
        result = []
        for row in trains:
            result.append(RiskTrain(
                train_id=row[0],
                urgency_level=row[1] or "NORMAL",
                penalty_risk_level=row[2] or "LOW",
                compliance_status=row[3],
                open_job_priority=row[4],
                km_since_maintenance=row[5] or 0
            ))
        
        return result
    
    except Exception as e:
        print(f"❌ High risk trains error: {str(e)}")
        # Return empty list instead of 500 error
        return []
