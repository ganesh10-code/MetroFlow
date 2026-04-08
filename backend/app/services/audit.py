from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime


def log_action(db: Session, user_id: int, action: str, target_entity: str, target_id: str, details: str = ""):
    db.execute(text("""
        INSERT INTO audit_logs (user_id, action, target_entity, target_id, timestamp, details)
        VALUES (:user_id, :action, :entity, :target_id, :time, :details)
    """), {
        "user_id": user_id,
        "action": action,
        "entity": target_entity,
        "target_id": target_id,
        "time": datetime.utcnow(),
        "details": details
    })

    db.commit()