# Analytics Dashboard - Data Sources Explained

## Fleet Overview Metrics (4 Cards)

### Card 1: Total Trains = **25**
```
SOURCE: master_train_data TABLE
QUERY: SELECT COUNT(*) FROM master_train_data
UPDATED: When new trains are added to master database
DEPENDS ON: Database seeds/initialization
WHY 25?: This is the complete train fleet inventory (static data)
```

### Card 2: Running Trains = **4**
```
SOURCE: operations_control_room TABLE
QUERY: SELECT run_count FROM operations_control_room 
       WHERE log_date = CURRENT_DATE
       ORDER BY updated_at DESC LIMIT 1
UPDATED: When OPERATIONS department submits daily status
DEPENDS ON: Operations Control Room submissions
WHY 4?: Operations team submitted that 4 trains are currently running today
SUBMITTED BY: Operations Department Dashboard
```

### Card 3: Maintenance Backlog = **0**
```
SOURCE: Kafka Events (MAINTENANCE department)
QUERY: Count events where department = 'maintenance'
UPDATED: When maintenance team publishes Kafka events
DEPENDS ON: Maintenance department activity
WHY 0?: Maintenance team hasn't submitted any work orders YET
SUBMITTED BY: Maintenance Department (when they log work)
```

### Card 4: High Risk = **0**
```
SOURCE: Kafka Events (FITNESS department)
QUERY: Count events where department = 'fitness'
UPDATED: When fitness team publishes Kafka events
DEPENDS ON: Fitness compliance checks
WHY 0?: Fitness team hasn't reported any non-compliant trains
SUBMITTED BY: Fitness Certification Department
```

---

## Data Source Hierarchy

```
┌─────────────────────────────────────────────────────┐
│         METROFLOW ANALYTICS DASHBOARD              │
└─────────────────────────────────────────────────────┘
                        ↓
    ┌──────────────────────────────────────┐
    │   Fleet Overview Metrics (4 Cards)   │
    └──────────────────────────────────────┘
              ↙               ↙              ↙          ↙
    ┌──────────┐      ┌──────────┐      ┌──────────┐ ┌──────────┐
    │Database  │      │Operations│      │Kafka     │ │Kafka     │
    │Table     │      │Control   │      │Events    │ │Events    │
    │          │      │Room      │      │Maint.    │ │Fitness   │
    │master_   │      │Table     │      │Dept.     │ │Dept.     │
    │train_    │      │          │      │          │ │          │
    │data      │      │Current   │      │Activity  │ │Activity  │
    └──────────┘      │Log Date  │      │Logs      │ │Logs      │
    COUNT(*)=25       └──────────┘      └──────────┘ └──────────┘
    STATIC            run_count=4       records=0    records=0
    (Permanent        UPDATED DAILY     DYNAMIC      DYNAMIC
     Inventory)       BY OPS TEAM       (Real-time)  (Real-time)
```

---

## Why Different Values Are Normal

### Scenario: Why Maintenance = 0 but Running = 4?

```
TIMELINE:
─────────────────────────────────────────

Morning:
  09:00 AM → Operations team logs in
  09:05 AM → Operations submits: "4 trains running today"
             ✓ Running Trains = 4 (NOW SHOWING)
             
  10:00 AM → Maintenance team hasn't done anything yet
             ✗ Maintenance Backlog = 0 (NOT SUBMITTED YET)
             
Afternoon:
  02:00 PM → Maintenance team logs work order
             ✓ Kafka event: "Maintenance work submitted"
             ✓ Maintenance Backlog = now shows count
             
  04:00 PM → Running trains still 4 (Operations data unchanged)
             Running Trains = 4 (STILL SHOWING FROM MORNING)
             Maintenance Backlog = now shows NEW data
```

---

## Data Update Triggers

| Metric | Source | How It Updates | Updated By |
|--------|--------|---|---|
| **Total Trains** | `master_train_data` | Only when DB seed changes | Admin/Database |
| **Running Trains** | `operations_control_room` | Daily form submission | Operations Team |
| **Maintenance Backlog** | Kafka Events | Real-time event publishing | Maintenance Team |
| **High Risk** | Kafka Events | Real-time event publishing | Fitness Team |

---

## Real World Example

### Today's Actual Timeline:

```
09:00 AM - Dashboard State:
  ├─ Total Trains: 25 (from database)
  ├─ Running: 0 (Operations hasn't submitted yet)
  ├─ Maintenance: 0 (Maintenance hasn't worked yet)
  └─ High Risk: 0 (Fitness hasn't checked yet)

10:30 AM - Operations Team Submits Daily Report:
  ├─ Total Trains: 25 (unchanged)
  ├─ Running: 4 ✓ (Operations just submitted)
  ├─ Maintenance: 0 (Maintenance still hasn't worked)
  └─ High Risk: 0 (Fitness still hasn't checked)

11:45 AM - Maintenance Team Logs Work:
  ├─ Total Trains: 25 (unchanged)
  ├─ Running: 4 (unchanged - Operations submitted once)
  ├─ Maintenance: 2 ✓ (Maintenance just logged 2 items)
  └─ High Risk: 0 (Fitness still hasn't checked)

02:00 PM - Fitness Team Checks Trains:
  ├─ Total Trains: 25 (unchanged)
  ├─ Running: 4 (unchanged - Operations data frozen)
  ├─ Maintenance: 2 (unchanged - Maintenance data frozen)
  └─ High Risk: 1 ✓ (Fitness found 1 non-compliant train)
```

---

## Summary

### Why You See: Total=25, Running=4, Maintenance=0, High Risk=0

| Metric | Reason |
|--------|--------|
| **25 Total** | Database has 25 trains (permanent data) |
| **4 Running** | Operations team submitted "4 trains active today" |
| **0 Maintenance** | Maintenance team hasn't submitted any work orders yet |
| **0 High Risk** | Fitness team hasn't reported any issues yet |

### These Are Independent Data Streams

- **Total Trains** = Static inventory (doesn't change often)
- **Running Trains** = Operations daily report (updated once per day)
- **Maintenance** = Real-time Kafka feed (updates whenever maintenance submits)
- **High Risk** = Real-time Kafka feed (updates whenever fitness submits)

**They can have different values because they come from different sources at different times!**

---

## How to Verify This

To see the actual queries in the backend:

```python
# File: backend/app/api/admin_analytics.py
# Line ~220-245

# Total Trains Query:
SELECT COUNT(*) FROM master_train_data
# Result: 25

# Running Trains Query:
SELECT run_count FROM operations_control_room 
WHERE log_date = CURRENT_DATE 
ORDER BY updated_at DESC LIMIT 1
# Result: 4 (from Operations submission)

# Maintenance Backlog Query:
# Counts Kafka events where department = 'maintenance'
# Result: 0 (no events submitted yet)

# High Risk Query:
# Counts Kafka events where department = 'fitness'
# Result: 0 (no events submitted yet)
```

---

## Next Steps to See Different Values

To populate the Maintenance and High Risk data, you need:

1. **For Maintenance Backlog**: Maintenance team submits work order
2. **For High Risk**: Fitness team submits compliance check
3. These will then publish Kafka events and populate those cards

Until then, they show **0** because no data has been submitted by those departments yet.

