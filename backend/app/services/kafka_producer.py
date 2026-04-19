import os
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from kafka import KafkaProducer

logger = logging.getLogger(__name__)

# ==========================================================
# TIMEZONE (Safe fallback)
# ==========================================================
try:
    from zoneinfo import ZoneInfo
    IST = ZoneInfo("Asia/Kolkata")
except Exception:
    IST = None

# ==========================================================
# KAFKA CONFIG
# ==========================================================
KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")
KAFKA_ENABLED = os.getenv("KAFKA_ENABLED", "true").lower() == "true"

# ==========================================================
# TOPICS
# ==========================================================
TOPICS = {
    "department_events": "department-events",
    "planner_events": "planner-events",
    "user_events": "user-events",
    "system_events": "system-events",
}

# ==========================================================
# PRODUCER INSTANCE
# ==========================================================
_producer: Optional[KafkaProducer] = None


def get_kafka_producer() -> Optional[KafkaProducer]:
    global _producer

    if not KAFKA_ENABLED:
        return None

    if _producer is None:
        try:
            _producer = KafkaProducer(
                bootstrap_servers=[KAFKA_BROKER],
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                acks="all",
                retries=3,
                request_timeout_ms=5000,
            )
            logger.info(f"✅ Kafka Producer connected to {KAFKA_BROKER}")
        except Exception as e:
            logger.warning(f"⚠️ Kafka connection failed: {str(e)}")
            _producer = None

    return _producer


# ==========================================================
# SEND EVENT
# ==========================================================
def send_event(
    topic_key: str,
    event_type: str,
    payload: Dict[str, Any],
    user_id: Optional[int] = None
) -> bool:

    if not KAFKA_ENABLED:
        return False

    try:
        producer = get_kafka_producer()
        if producer is None:
            return False

        topic = TOPICS.get(topic_key, topic_key)

        event = {
            "event_type": event_type,
            "timestamp": datetime.now(IST).isoformat() if IST else datetime.utcnow().isoformat(),
            "user_id": user_id,
            "data": payload,
        }

        producer.send(topic, value=event)
        return True

    except Exception as e:
        logger.warning(f"⚠️ Failed to send event: {str(e)}")
        return False


# ==========================================================
# EVENT BUILDERS
# ==========================================================
def build_department_event(
    department: str,
    user_id: int,
    records_count: int,
    additional_data: Optional[Dict] = None,
) -> Dict:
    data = {
        "department": department,
        "records_count": records_count,
    }
    if additional_data:
        data.update(additional_data)
    return data


def build_planner_event(
    plan_id: int,
    status: str,
    counts: Optional[Dict] = None,
    additional_data: Optional[Dict] = None,
) -> Dict:
    data = {
        "plan_id": plan_id,
        "status": status,
        "counts": counts or {},
    }
    if additional_data:
        data.update(additional_data)
    return data


def build_scenario_event(
    scenario: str,
    train_id: Optional[str] = None,
    additional_data: Optional[Dict] = None,
) -> Dict:
    data = {
        "scenario": scenario,
        "train_id": train_id,
    }
    if additional_data:
        data.update(additional_data)
    return data


# ==========================================================
# CLEANUP
# ==========================================================
def close_producer():
    global _producer

    if _producer is not None:
        try:
            _producer.flush()
            _producer.close(timeout_ms=5000)
            logger.info("✅ Kafka Producer closed")
        except Exception as e:
            logger.warning(f"⚠️ Error closing Kafka producer: {str(e)}")
        finally:
            _producer = None