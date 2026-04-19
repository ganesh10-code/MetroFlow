"""Kafka consumer that maintains in-memory analytics state."""

import os
import json
import logging
import threading
import time
from copy import deepcopy
from datetime import datetime
from typing import Any, Dict, Optional
from zoneinfo import ZoneInfo
from kafka import KafkaConsumer
from sqlalchemy import text
from app.core.database import SessionLocal

logger = logging.getLogger(__name__)

# ==========================================================
# TIMEZONE
# ==========================================================
IST = ZoneInfo("Asia/Kolkata")

def ist_now():
    return datetime.now(IST)

# ==========================================================
# KAFKA CONFIG
# ==========================================================
KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")
KAFKA_ENABLED = os.getenv("KAFKA_ENABLED", "true").lower() == "true"
TOPICS = ["department-events"]


def _default_state() -> Dict[str, Any]:
    return {
        "total_trains": 0,
        "running_trains": 0,
        "maintenance_backlog": 0,
        "high_risk_trains": 0,
        "department_counts": {},
        "events": [],
        "timestamp": ist_now().isoformat(),
    }


_analytics_lock = threading.Lock()
_analytics_state: Dict[str, Any] = _default_state()


def get_analytics_state() -> Dict[str, Any]:
    with _analytics_lock:
        return deepcopy(_analytics_state)


def get_recent_events(limit: int = 20) -> list[Dict[str, Any]]:
    with _analytics_lock:
        return deepcopy(_analytics_state["events"][:limit])


def get_consumer_runtime_status() -> Dict[str, Any]:
    consumer = get_event_consumer()
    with _analytics_lock:
        event_count = len(_analytics_state["events"])
        last_timestamp = _analytics_state.get("timestamp")
    return {
        "kafka_enabled": KAFKA_ENABLED,
        "kafka_broker": KAFKA_BROKER,
        "thread_alive": bool(consumer and consumer.thread and consumer.thread.is_alive()),
        "running_flag": bool(consumer and consumer.running),
        "recent_events_count": event_count,
        "state_timestamp": last_timestamp,
    }


def ensure_events_log_table() -> None:
    """Create events_log table/indexes if missing (PostgreSQL-safe)."""
    db = None
    try:
        db = SessionLocal()
        db.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS events_log (
                    id SERIAL PRIMARY KEY,
                    event_timestamp TIMESTAMP NOT NULL,
                    event_type VARCHAR NOT NULL,
                    department VARCHAR NOT NULL,
                    train_id VARCHAR,
                    payload JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_event_timestamp ON events_log (event_timestamp DESC)"))
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_department ON events_log (department)"))
        db.commit()
        logger.info("✅ events_log table ready")
    except Exception as exc:
        if db:
            db.rollback()
        logger.error("❌ Failed to ensure events_log table: %s", str(exc))
    finally:
        if db:
            db.close()


def _persist_event_to_db(event_row: Dict[str, Any]) -> None:
    """Best-effort persistence for recent history across restarts."""
    db = None
    try:
        db = SessionLocal()
        payload = {
            "records_count": event_row.get("records_count", 0),
            "details": event_row.get("details", ""),
            "user_id": event_row.get("user_id"),
        }
        db.execute(
            text(
                """
                INSERT INTO events_log (event_timestamp, event_type, department, train_id, payload, created_at)
                VALUES (:event_timestamp, :event_type, :department, :train_id, CAST(:payload AS JSON), :created_at)
                """
            ),
            {
                "event_timestamp": event_row.get("timestamp"),
                "event_type": event_row.get("event_type", "unknown"),
                "department": event_row.get("department", "unknown"),
                "train_id": event_row.get("train_id"),
                "payload": json.dumps(payload),
                "created_at": ist_now(),
            },
        )
        db.commit()
    except Exception as exc:
        logger.warning("⚠️ Could not persist event to events_log: %s", str(exc))
        if db:
            db.rollback()
    finally:
        if db:
            db.close()


def _load_recent_events_from_db(limit: int = 20) -> list[Dict[str, Any]]:
    db = None
    try:
        db = SessionLocal()
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

        events: list[Dict[str, Any]] = []
        for row in rows:
            payload = row[4] if len(row) > 4 else {}
            if isinstance(payload, str):
                try:
                    payload = json.loads(payload)
                except Exception:
                    payload = {}
            payload = payload or {}
            records_count = int(payload.get("records_count", 0) or 0)
            details = str(payload.get("details") or f"{row[1]} submitted {records_count} record(s)")
            ts = row[0].isoformat() if hasattr(row[0], "isoformat") else str(row[0])

            events.append(
                {
                    "timestamp": ts,
                    "department": str(row[1] or "unknown"),
                    "event_type": str(row[2] or "unknown"),
                    "train_id": str(row[3] or "N/A"),
                    "details": details,
                    "records_count": records_count,
                    "user_id": payload.get("user_id"),
                }
            )
        return events
    except Exception as exc:
        logger.warning("⚠️ Could not load recent events from events_log: %s", str(exc))
        return []
    finally:
        if db:
            db.close()


def hydrate_state_from_recent_history(limit: int = 20) -> None:
    """Load recent events from DB into in-memory state."""
    historical_events = _load_recent_events_from_db(limit=limit)
    if not historical_events:
        return

    with _analytics_lock:
        _analytics_state["events"] = historical_events[:limit]
        _analytics_state["department_counts"] = {}
        _analytics_state["maintenance_backlog"] = 0
        _analytics_state["running_trains"] = 0
        _analytics_state["high_risk_trains"] = 0

        for evt in _analytics_state["events"]:
            department = str(evt.get("department", "unknown")).lower()
            records_count = int(evt.get("records_count", 0) or 0)
            dept_counts = _analytics_state["department_counts"]
            dept_counts[department] = int(dept_counts.get(department, 0)) + records_count

            if department == "maintenance":
                _analytics_state["maintenance_backlog"] += records_count
            elif department == "operations":
                _analytics_state["running_trains"] += records_count
            elif department == "fitness":
                _analytics_state["high_risk_trains"] += records_count

        _analytics_state["total_trains"] = sum(int(v) for v in _analytics_state["department_counts"].values())
        _analytics_state["timestamp"] = ist_now().isoformat()

    logger.info("✅ Hydrated analytics state from %s recent events", len(historical_events))

# ==========================================================
# EVENT CONSUMER
# ==========================================================
class MetroFlowEventConsumer:
    def __init__(self):
        self.consumer = None
        self.running = False
        self.thread = None

    def connect(self) -> bool:
        """Connect to Kafka and start consuming."""
        if not KAFKA_ENABLED:
            logger.info("ℹ️ Kafka disabled - event consumer will not start")
            return False

        try:
            self.consumer = KafkaConsumer(
                *TOPICS,
                bootstrap_servers=[KAFKA_BROKER],
                group_id="metroflow-event-store",
                value_deserializer=lambda m: json.loads(m.decode("utf-8")),
                auto_offset_reset="latest",
                enable_auto_commit=True,
                max_poll_records=100,
                consumer_timeout_ms=1000,
            )
            logger.info(f"✅ Kafka Consumer connected to {KAFKA_BROKER}")
            logger.info(f"📡 Listening to topics: {', '.join(TOPICS)}")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to connect to Kafka: {str(e)}")
            self.consumer = None
            return False

    def process_event(self, event: dict) -> bool:
        """Apply one Kafka event to in-memory analytics state."""
        try:
            event_type = str(event.get("event_type", "unknown"))
            timestamp = event.get("timestamp", ist_now().isoformat())
            user_id = event.get("user_id")
            data = event.get("data") or {}
            # Accept both shapes:
            # 1) {"data": {"department": "...", "records_count": ...}}
            # 2) {"department": "...", "records_count": ...}
            department = str(
                data.get("department")
                or event.get("department")
                or "operations"
            ).lower()
            raw_count = data.get("records_count", event.get("records_count", 0))
            records_count = int(raw_count or 0)
            train_id = data.get("train_id") or data.get("train") or event.get("train_id")

            event_row = {
                "timestamp": timestamp,
                "department": department,
                "event_type": event_type,
                "train_id": str(train_id) if train_id else "N/A",
                "details": f"{department} submitted {records_count} record(s)",
                "records_count": records_count,
                "user_id": user_id,
            }

            logger.info(
                "Kafka event received type=%s department=%s records=%s user_id=%s",
                event_type,
                department,
                records_count,
                user_id,
            )

            with _analytics_lock:
                dept_counts = _analytics_state["department_counts"]
                dept_counts[department] = int(dept_counts.get(department, 0)) + records_count

                _analytics_state["events"].insert(0, event_row)
                _analytics_state["events"] = _analytics_state["events"][:20]

                # Keep total as a live aggregate of all department submissions.
                _analytics_state["total_trains"] = sum(int(v) for v in dept_counts.values())

                if department == "maintenance":
                    _analytics_state["maintenance_backlog"] += records_count
                elif department == "operations":
                    _analytics_state["running_trains"] += records_count
                elif department == "fitness":
                    # Minimal risk rule: fitness submissions contribute to high-risk workload.
                    _analytics_state["high_risk_trains"] += records_count

                _analytics_state["timestamp"] = ist_now().isoformat()

                logger.info("Analytics state updated: %s", json.dumps(_analytics_state))

            _persist_event_to_db(event_row)
            return True
        except Exception as e:
            logger.error("❌ Failed to process event: %s", str(e))
            return False

    def consume_loop(self):
        """Main consumption loop - runs in background thread with auto-reconnect."""
        self.running = True
        logger.info("🚀 Event consumer loop started")

        while self.running:
            if not self.connect():
                logger.warning("⚠️ Kafka connect failed, retrying in 5s...")
                time.sleep(5)
                continue

            try:
                while self.running and self.consumer is not None:
                    messages = self.consumer.poll(timeout_ms=1000)
                    if not messages:
                        continue

                    for _, batch in messages.items():
                        for message in batch:
                            try:
                                event = message.value
                                self.process_event(event)
                            except Exception as e:
                                logger.error("❌ Error processing message: %s", str(e))
                                continue
            except Exception as e:
                logger.error("❌ Consumer loop error: %s", str(e))
                time.sleep(2)
            finally:
                if self.consumer:
                    try:
                        self.consumer.close()
                    except Exception:
                        pass
                    self.consumer = None

        logger.info("🛑 Event consumer stopped")

    def start(self):
        """Start consumer in background thread."""
        if self.thread and self.thread.is_alive():
            logger.warning("⚠️ Consumer already running")
            return

        self.running = True
        self.thread = threading.Thread(target=self.consume_loop, daemon=True)
        self.thread.start()
        logger.info("✅ Event consumer thread started")

    def stop(self):
        """Stop consumer gracefully."""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        logger.info("✅ Event consumer stopped")


# ==========================================================
# GLOBAL INSTANCE
# ==========================================================
_consumer: Optional[MetroFlowEventConsumer] = None


def get_event_consumer() -> Optional[MetroFlowEventConsumer]:
    """Get or create global consumer instance."""
    global _consumer
    if _consumer is None:
        _consumer = MetroFlowEventConsumer()
    return _consumer


def start_event_consumer():
    """Start the Kafka event consumer."""
    ensure_events_log_table()
    hydrate_state_from_recent_history(limit=20)
    consumer = get_event_consumer()
    consumer.start()


def stop_event_consumer():
    """Stop the Kafka event consumer."""
    consumer = get_event_consumer()
    consumer.stop()
