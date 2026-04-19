import os
import json
import logging
from kafka import KafkaConsumer
from kafka.errors import KafkaError

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")


def consume_all_events():
    topics = [
        "department-events",
        "planner-events",
        "user-events",
        "system-events",
    ]

    try:
        consumer = KafkaConsumer(
            *topics,
            bootstrap_servers=[KAFKA_BROKER],
            value_deserializer=lambda m: json.loads(m.decode("utf-8")),
            auto_offset_reset="latest",   # 🔥 only new events
            group_id="metroflow-consumer-group",
        )

        logger.info(f"✅ Connected to Kafka at {KAFKA_BROKER}")
        logger.info(f"📡 Listening to topics: {', '.join(topics)}")
        logger.info("-" * 80)

        for message in consumer:
            print_event(message)

    except KafkaError as e:
        logger.error(f"❌ Kafka error: {str(e)}")
    except KeyboardInterrupt:
        logger.info("Shutting down consumer...")
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")


def print_event(message):
    topic = message.topic
    value = message.value

    timestamp = value.get("timestamp", "N/A")
    event_type = value.get("event_type", "UNKNOWN")
    user_id = value.get("user_id", "N/A")
    data = value.get("data", {})

    print(f"\n{'='*80}")
    print(f"📨 TOPIC: {topic}")
    print(f"⏰ EVENT TYPE: {event_type}")
    print(f"👤 USER ID: {user_id}")
    print(f"📅 TIMESTAMP: {timestamp}")
    print(f"📦 DATA:")
    print(json.dumps(data, indent=2))
    print(f"{'='*80}")


if __name__ == "__main__":
    consume_all_events()