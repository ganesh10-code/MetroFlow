from sqlalchemy.orm import Session
from app.models.user import AuditLog
from datetime import datetime

def log_action(db: Session, user_id: int, action: str, target_entity: str, target_id: str, details: str = ""):
    """
    Basic audit logging utility.
    """
    new_log = AuditLog(
        user_id=user_id,
        action=action,
        target_entity=target_entity,
        target_id=target_id,
        timestamp=datetime.utcnow(),
        details=details
    )
    db.add(new_log)
    db.commit()
