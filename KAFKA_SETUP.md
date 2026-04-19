# Kafka Event Streaming Integration - MetroFlow

## Overview

MetroFlow now includes **Kafka-based event streaming** for real-time event capture and monitoring. This enables:

- 📡 Real-time event publishing from all department submissions
- 🎯 Plan generation and finalization tracking
- 🎮 Scenario simulation monitoring
- 🔍 Audit trails and event logs
- 🔗 Integration with external systems (analytics, dashboards, etc.)

## Quick Start

### 1. Enable Kafka in Environment

Add to `.env`:

```env
KAFKA_ENABLED=true
KAFKA_BROKER=localhost:9092
```

### 2. Start Kafka Locally (Docker)

```bash
# Start Kafka and Zookeeper
docker run -d \
  --name zookeeper \
  -e ZOOKEEPER_CLIENT_PORT=2181 \
  confluentinc/cp-zookeeper:7.5.0

docker run -d \
  --name kafka \
  -e KAFKA_ZOOKEEPER_CONNECT=zookeeper:2181 \
  -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 \
  -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1 \
  -p 9092:9092 \
  confluentinc/cp-kafka:7.5.0
```

Or use Docker Compose:

```yaml
# docker-compose.yml (snippet)
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
```

### 3. Install Dependencies

```bash
pip install kafka-python
```

### 4. Test Connection

```bash
python -c "from app.services.kafka_producer import get_kafka_producer; p = get_kafka_producer(); print('✅ Connected!' if p else '❌ Failed')"
```

---

## Kafka Topics & Event Schema

### Topic 1: `department-events`

**When:** Department data submissions (maintenance, fitness, cleaning, branding, operations)

**Event Schema:**
```json
{
  "event_type": "department_submission",
  "timestamp": "2026-04-19T14:30:45.123456+05:30",
  "user_id": 3,
  "data": {
    "department": "maintenance",
    "records_count": 25,
    "open_jobs": 45,
    "urgency_level": "HIGH"
  }
}
```

**Possible Departments:**
- `maintenance` - Job tracking
- `fitness` - Compliance certification
- `cleaning` - Cleaning completion
- `branding` - Branding priorities
- `operations` - Fleet counts & mileage

---

### Topic 2: `planner-events`

**When:** Planner actions (generate, finalize, simulate)

#### Event Type: `plan_generated`

```json
{
  "event_type": "plan_generated",
  "timestamp": "2026-04-19T15:00:00.000000+05:30",
  "user_id": 2,
  "data": {
    "plan_id": 0,
    "status": "GENERATED",
    "counts": {
      "run": 18,
      "standby": 4,
      "maintenance": 3
    },
    "has_ai_summary": true
  }
}
```

#### Event Type: `plan_finalized`

```json
{
  "event_type": "plan_finalized",
  "timestamp": "2026-04-19T15:30:00.000000+05:30",
  "user_id": 2,
  "data": {
    "plan_id": 42,
    "status": "FINALIZED",
    "counts": {},
    "finalized_by": "planner",
    "role": "PLANNER"
  }
}
```

#### Event Type: `scenario_simulation`

```json
{
  "event_type": "scenario_simulation",
  "timestamp": "2026-04-19T15:15:00.000000+05:30",
  "user_id": 2,
  "data": {
    "scenario": "TRAIN_FAILURE",
    "train_id": "T001",
    "run": 17,
    "standby": 5,
    "maintenance": 3
  }
}
```

---

### Topic 3: `user-events` (Future)

Reserved for user management events (create, update, delete users).

---

### Topic 4: `system-events` (Future)

Reserved for system-level events (startup, shutdown, errors).

---

## Consuming Events

### Using the Example Consumer

```bash
# Monitor all events
python -m backend.services.kafka_consumer_example

# Monitor specific topic
python -c "from backend.services.kafka_consumer_example import consume_department_events; consume_department_events()"
```

### Custom Consumer Example

```python
from kafka import KafkaConsumer
import json

consumer = KafkaConsumer(
    'department-events',
    bootstrap_servers=['localhost:9092'],
    value_deserializer=lambda m: json.loads(m.decode('utf-8')),
    auto_offset_reset='latest',
    group_id='my-group'
)

for message in consumer:
    event = message.value
    print(f"Department: {event['data']['department']}")
    print(f"Records: {event['data']['records_count']}")
```

---

## Architecture & Design

### Event Flow

```
API Endpoint (e.g., /maintenance/submit)
    ↓
Business Logic (validate, save to DB)
    ↓
db.commit() ← Database change persisted
    ↓
send_event(...) ← Fire-and-forget Kafka event
    ↓
Return response to client
```

### Key Design Principles

✅ **Non-Blocking:** Kafka failures don't break API responses
✅ **Fire-and-Forget:** Events sent asynchronously
✅ **Graceful Degradation:** System works without Kafka
✅ **Configurable:** Enable/disable via `KAFKA_ENABLED` env var
✅ **Minimal Changes:** No modifications to existing business logic
✅ **Extensible:** Easy to add new event types

---

## Configuration

### Environment Variables

```env
# Enable/disable Kafka (default: true)
KAFKA_ENABLED=true

# Kafka broker address (default: localhost:9092)
KAFKA_BROKER=localhost:9092
```

### Programmatic Configuration

Edit `backend/app/services/kafka_producer.py`:

```python
KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")
KAFKA_ENABLED = os.getenv("KAFKA_ENABLED", "true").lower() == "true"

# Adjust producer settings
_producer = KafkaProducer(
    bootstrap_servers=[KAFKA_BROKER],
    acks="all",  # Wait for all replicas
    retries=3,   # Retry on failure
    request_timeout_ms=5000,
)
```

---

## Logging

All Kafka operations are logged to the console/logs:

```
✅ Event sent: department_submission → department-events partition 0
⚠️ Kafka send error: Connection refused
❌ Kafka connection failed: ...
```

Enable debug logging:

```python
import logging
logging.getLogger('kafka').setLevel(logging.DEBUG)
```

---

## Testing Event Flow

### 1. Start Kafka

```bash
docker-compose up -d
```

### 2. Start Consumer (in one terminal)

```bash
python -m backend.services.kafka_consumer_example
```

### 3. Submit Data (in another terminal)

```bash
curl -X POST http://localhost:8000/maintenance/submit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{"train_id": "T001", "open_jobs": 5, "urgency_level": "HIGH"}]'
```

### 4. See Event in Consumer Terminal

```
================================================================================
📨 TOPIC: department-events
⏰ EVENT TYPE: department_submission
👤 USER ID: 3
📅 TIMESTAMP: 2026-04-19T14:30:45.123456+05:30
📦 DATA:
{
  "department": "maintenance",
  "records_count": 1,
  "train_id": "T001"
}
================================================================================
```

---

## Production Deployment

### Considerations

1. **Kafka Cluster:** Use 3+ broker cluster for HA
2. **Replication Factor:** Set to 3
3. **Retention:** Configure topic retention policies
4. **Monitoring:** Monitor consumer lag
5. **Authentication:** Enable SASL/SSL if needed
6. **Scaling:** Use consumer groups for parallel processing

### Example Production Setup

```env
KAFKA_ENABLED=true
KAFKA_BROKER=kafka-broker-1:9092,kafka-broker-2:9092,kafka-broker-3:9092
```

---

## Troubleshooting

### Issue: "Kafka connection failed"

**Solution:**
- Verify Kafka is running: `docker ps | grep kafka`
- Check broker address in `.env`
- Test connection: `telnet localhost 9092`

### Issue: Events not appearing

**Solution:**
- Check `KAFKA_ENABLED=true` in `.env`
- Verify consumer group: Check topic partitions
- Enable debug logging

### Issue: High latency

**Solution:**
- Adjust `request_timeout_ms` in kafka_producer.py
- Check network connectivity
- Monitor Kafka broker performance

---

## Future Enhancements

- [ ] Kafka schema registry integration
- [ ] Event filtering & routing
- [ ] Dead-letter queues for failed events
- [ ] Real-time dashboard visualization
- [ ] Analytics pipeline integration
- [ ] Event replay capability
- [ ] Multi-cluster setup
- [ ] Webhook integration for external systems

---

## FAQ

**Q: Will Kafka failure break my APIs?**
A: No. Events are fire-and-forget. If Kafka is down, APIs still work.

**Q: Can I disable Kafka?**
A: Yes. Set `KAFKA_ENABLED=false` or omit the env var.

**Q: How are events serialized?**
A: JSON format, UTF-8 encoded.

**Q: Can I change topic names?**
A: Yes. Edit `TOPICS` dict in `backend/app/services/kafka_producer.py`.

**Q: What about event ordering?**
A: Ordered per partition. For strict ordering, use single partition per topic.

---

## Support

For issues or questions about Kafka integration:
1. Check logs in `logs/` directory
2. Review `backend/app/services/kafka_producer.py`
3. Run consumer example to verify setup
4. Check Kafka broker health
