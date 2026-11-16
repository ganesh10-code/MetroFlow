# 🚆 MetroFlow - AI-Based Train Induction Planning & Real-Time Analytics Platform

> An enterprise-grade, data-driven decision support system and real-time streaming analytics platform for metropolitan train fleet management, powered by **Random Forest Machine Learning**, **Constrained Fleet Optimization**, **Apache Kafka Event Streaming**, and **Dual-Provider GenAI (Groq / Gemini)**.

---

## 📌 Executive Overview

In modern metropolitan rail networks, transit authorities face a critical daily decision: **which trainsets should enter passenger revenue service, which should remain on standby reserve, and which must be quarantined for depot maintenance?**

Making this decision manually across a fleet of 25+ trainsets is notoriously complex. Planners must reconcile conflicting constraints across five departments:
* **Operations Control Room (OCR)**: Daily service targets (e.g., 18 RUN, 4 STANDBY, 3 MAINTENANCE) and mileage balancing.
* **Rolling Stock & Maintenance**: Open job cards, component wear, and backlog urgency.
* **Safety & Fitness**: Statutory fitness certificates and safety compliance.
* **Cleaning & Detailing**: Hygiene cycles, passenger presentation, and deep-clean thresholds.
* **Commercial & Branding**: High-value advertiser exposure contracts with severe financial SLA breach penalties.
* **Depot Stabling Geometry**: Physical track positioning, congestion on stabling lines, and shunting extraction delays.

**MetroFlow** automates and optimizes this multi-department workflow into a single unified platform. It ingests live departmental submissions via **Apache Kafka**, predicts operational risk scores using a **regularized Random Forest Classifier**, optimizes daily fleet allocations subject to hard safety rules and soft business priorities, simulates operational stress via **8 What-If scenarios**, and generates natural-language explanations with **Groq & Google Gemini LLMs**.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       FRONTEND LAYER                                            │
│                               React 18 + TypeScript + Vite + Tailwind CSS                       │
├────────────────────────────────┬───────────────────────────────┬────────────────────────────────┤
│       Admin & Analytics        │       Planner Dashboard       │     Department Dashboards      │
│  • User Management (CRUD)      │  • Multi-Dept Readiness Check │  • Operations Control Room     │
│  • Kafka Live Event Stream     │  • AI Plan Generation         │  • Maintenance Work Orders     │
│  • 7-Day Department Trends     │  • Manual Overrides & Diff    │  • Fitness Certification       │
│  • High-Risk Train Matrix      │  • 8 What-If Scenario Sim     │  • Cleaning & Hygiene Logs     │
│  • Contextual GenAI Chat Panel │  • Plan Finalization & Lock   │  • Branding Priorities         │
└────────────────────────────────┴───────────────┬───────────────┴────────────────────────────────┘
                                                 │ HTTP / REST (JWT Auth)
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   BACKEND APPLICATION LAYER                                     │
│                                        FastAPI + Uvicorn                                        │
├─────────────────────────┬───────────────────────────────┬───────────────────────────────────────┤
│    API Router Matrix    │       Security & Auth         │          Streaming & Storage          │
│  • /auth & /users       │  • OAuth2 Password Bearer     │  • Kafka Producer (4 Topics)          │
│  • /operations          │  • JWT Bearer Tokens (HS256)  │  • Background Consumer Daemon         │
│  • /maintenance         │  • Role-Based Access Control  │  • In-Memory Analytics State Cache    │
│  • /fitness             │  • Daily Finalization Lock    │  • SQLAlchemy ORM + Connection Pool   │
│  • /cleaning            │                               │                                       │
│  • /branding            │                               │                                       │
│  • /planner             │                               │                                       │
│  • /admin/analytics     │                               │                                       │
│  • /ai & /analytics     │                               │                                       │
└────────────┬────────────┴───────────────┬───────────────┴───────────────────┬───────────────────┘
             │                            │                                   │
             ▼                            ▼                                   ▼
┌──────────────────────────┐ ┌───────────────────────────┐ ┌─────────────────────────────────────┐
│  APACHE KAFKA BROKER     │ │   ML & OPTIMIZATION CORE  │ │       GENAI EXPLANATIONS            │
│  • department-events     │ │  • RandomForestClassifier │ │  • Groq (Llama-3.3-70B-Versatile)   │
│  • planner-events        │ │  • Smart Retraining Engine│ │  • Google Gemini (Gemini-1.5-Flash) │
│  • user-events           │ │  • Dynamic Shunting Calc  │ │  • Plan / Sim / Override Explanations│
│  • system-events         │ │  • Priority Scoring Form  │ │  • Rule-Based Deterministic Fallback│
│  • Zookeeper Coordinator │ │  • 8 What-If Sim Engine   │ │                                     │
└──────────────────────────┘ └───────────────────────────┘ └─────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      DATABASE LAYER (PostgreSQL)                                │
├─────────────────────────┬───────────────────────────────┬───────────────────────────────────────┤
│    Master & Logs        │         ML & Planning         │          Real-Time Streaming          │
│  • master_train_data    │  • real_daily_features        │  • events_log (Indexed by timestamp & │
│  • operations_control_room  synthetic_daily_features   │    department for live dashboard)     │
│  • maintenance_logs     │  • plans & plan_details       │  • audit_logs                         │
│  • fitness_logs         │  • plan_versions              │  • simulation_logs                    │
│  • cleaning_logs        │  • model_metadata             │  • users (RBAC credentials)           │
│  • branding_logs        │                               │                                       │
│  • mileage_logs         │                               │                                       │
└─────────────────────────┴───────────────────────────────┴───────────────────────────────────────┘
```

---

## 🤖 Core Machine Learning Implementation

The machine learning subsystem lives in `backend/ml/` and provides operational risk assessment to rank and classify trainsets before optimization.

### 1. Model Architecture & Selection
* **Model Type**: `sklearn.ensemble.RandomForestClassifier` (persisted as `trained_models/risk_model.pkl`).
* **Why Random Forest?**
  * **Non-Linear Interactions**: Fleet risk is driven by correlated multi-variable degradation (e.g., high mileage combined with an uninspected bogie defect vs. high mileage alone). Tree ensembles capture these interactions without fragile feature transformations.
  * **Noise Robustness**: Depot sensor logs and manual defect tickets contain noise and missing values; bagging averages variance effectively.
  * **Probability Calibration**: MetroFlow requires continuous risk probabilities (`predict_proba(X)[:, 1]`) in the range $[0.0, 1.0]$ rather than binary outputs, enabling fine-grained fleet ranking.

### 2. Regularization & Hyperparameters
To guarantee generalization on daily fleet batches and prevent overfitting:
```python
RandomForestClassifier(
    n_estimators=200,        # Ensemble depth for stable probability estimates
    max_depth=8,             # Strictly limits tree depth to avoid memorizing training noise
    min_samples_split=10,    # Requires >= 10 samples before splitting internal nodes
    min_samples_leaf=5,      # Leaf nodes must contain >= 5 samples to smooth decision boundaries
    random_state=42,
    class_weight="balanced"  # Balances rare critical failure classes against safe majority
)
```

### 3. Feature Engineering Pipeline (6 Features)
The model consumes a curated 6-dimensional feature vector $X$:
1. `open_jobs`: Total count of unresolved maintenance work orders.
2. `mileage_today`: Kilometers logged during today's operation.
3. `branding_priority`: Commercial advertising tier (0: None, 1: Standard, 2: Bronze, 3: Silver, 4: Gold VIP).
4. `shunting_time`: Dynamic physical transit time in minutes (incorporating depot track geometry, slot position, and congestion).
5. `job_severity_score`: Engineered amplification metric:
   $$\text{job\_severity\_score} = \text{open\_jobs} \times 2$$
6. `mileage_ratio`: Normalized utilization metric:
   $$\text{mileage\_ratio} = \frac{\text{mileage\_today}}{300}$$

### 4. Realistic Noise Injection & Data Augmentation
During training (`inject_realistic_noise()`), MetroFlow injects controlled real-world operational variance:
* **Depot Sensor Variance**: Adds a $\pm 5\%$ normal distribution noise to `mileage_today`:
  $$\text{mileage} \leftarrow \text{mileage} \times (1 + \mathcal{N}(0, 0.05))$$
* **Random Latent Breakdown**: Injects unexpected breakdowns by randomly flipping 5% of records to high risk (`risk_label = 1`).
* **Weekend Seasonality**: Injects operational weekend stress (days 5 & 6) by randomly bumping baseline risk probability by 30%.

### 5. Smart Retraining Lifecycle (`should_retrain()`)
To prevent unnecessary compute cycles on every API call, MetroFlow implements conditional retraining:
* **Trigger 1 (Bootstrap)**: No serialized model file exists at `trained_models/risk_model.pkl`.
* **Trigger 2 (Time Decay)**: Last model training occurred $> 24\text{ hours}$ ago.
* **Trigger 3 (Data Growth)**: The count of real operational records in `real_daily_features` increased by $> 100$ records since the last training run.

**Data Sourcing Strategy**:
* **$\ge 500$ Real Records**: Trains purely on real production data from PostgreSQL.
* **$1 \text{ to } 499$ Real Records**: Uses a **hybrid concatenation** of real database records and synthetic baseline records.
* **$0$ Real Records**: Cold-start fallback on `generated/synthetic_daily_features.csv`.

### 6. Model Evaluation & Artifacts
The training pipeline logs classification metrics and generates visual evaluation artifacts in `trained_models/reports/`:
* `confusion_matrix.png`: Normalized confusion matrix displaying classification accuracy across risk tiers.
* `feature_importance.png`: Ranked feature importance chart showing the predictive weight of each operational metric.
* Model metadata is tracked in the `model_metadata` database table (`last_trained_at`, `data_points`).

---

## ⚙️ Fleet Optimization & Decision Engine (`planner_engine.py`)

The heart of MetroFlow is its rule-constrained optimization engine, which turns ML risk probabilities into concrete fleet dispatch decisions (`RUN`, `STANDBY`, `MAINTENANCE`).

### 1. Operations Control Room (OCR) Constraints
Target fleet distributions are queried dynamically from the `operations_control_room` table for today's date:
* **Base Target**: 18 RUN, 4 STANDBY, 3 MAINTENANCE (for a 25-train fleet).
* **Strict Fleet Balance Constraint**:
  $$\text{RUN\_TARGET} + \text{STANDBY\_TARGET} + \text{MAINTENANCE\_TARGET} \equiv \text{TOTAL\_FLEET\_SIZE}$$

### 2. Composite Priority Scoring Formula
Every train receives a composite multi-factor `priority_score` balancing passenger safety, maintenance backlog, depot transit delays, branding obligations, and mileage equity:

$$\begin{aligned}
\text{Priority Score} = 20 & - (\text{ML Risk Score} \times 10.0) \\
& - (\text{Open Jobs} \times 0.9) \\
& - (\text{Cleaning Required} \times 1.2) \\
& - (\text{Shunting Time} \times 0.06) \\
& + (\text{Branding Priority} \times 0.45) \\
& + (\text{Mileage Ratio} \times 0.35)
\end{aligned}$$

> ⚠️ **Immediate Compliance Deduction**: If $\text{compliance\_status} \neq \text{"FIT"}$, an immediate **8.0-point penalty** is subtracted from the score.

### 3. Strict Safety Blockers (`must_go_maintenance()`)
A train **must** be quarantined to `MAINTENANCE`, bypassing normal scoring optimization, if either condition is met:
1. `compliance_status != "FIT"` (Safety certificate expired or non-compliant).
2. `open_jobs >= 8` (Severe maintenance backlog).

### 4. Two-Phase Fleet Rebalancing Algorithm
1. **Quarantine Blockers**: Identify all trains triggering strict maintenance rules and set `decision = "MAINTENANCE"`.
2. **Quota Reconciliation**:
   * *If Forced Maintenance > Maintenance Target*: The excess trains are sorted by risk and priority (`risk_score ASC`, `priority_score DESC`), and the safest, least problematic trains are moved back to `STANDBY`.
   * *If Forced Maintenance < Maintenance Target*: Additional trains are selected from the standby pool by highest risk (`risk_score DESC`, `priority_score ASC`) and assigned to `MAINTENANCE` until the target is satisfied.
3. **Dispatch Assignment**: The remaining candidates in the `STANDBY` pool are sorted by lowest risk and highest priority. The top $N = \text{RUN\_TARGET}$ trains are assigned to `RUN`. Any remaining trains stay in `STANDBY`.

### 5. Dynamic Depot Shunting & Congestion Time Calculation
In depot stabling yards, trains parked at the back of a dead-end stabling siding cannot leave until trains in front of them are moved. MetroFlow models this physical constraint in `pipeline/real_feature_pipeline.py`:
$$\text{Congestion Count} = |\{t \in \text{Fleet} \mid t.\text{track\_id} = \text{Track} \land t.\text{position} < \text{Position}\}|$$
$$\text{Congestion Penalty} = \text{Congestion Count} \times 2\text{ minutes}$$
$$\text{Maintenance Factor} = \begin{cases} 6\text{ mins}, & \text{urgency} = \text{"HIGH"} \\ 3\text{ mins}, & \text{urgency} = \text{"MEDIUM"} \\ 0\text{ mins}, & \text{otherwise} \end{cases}$$
$$\text{shunting\_time} = \text{estimated\_time} + \text{Congestion Penalty} + \text{Maintenance Factor}$$

### 6. The 8 What-If Scenario Simulations
Planners can simulate operational contingencies in real time before finalizing daily plans:
| Scenario Code | Simulated Operational Event | Engine Mutation |
| :--- | :--- | :--- |
| `TRAIN_FAILURE` | Immediate component failure on specific train | Adds 6 open jobs to the target train(s) |
| `PEAK_HOUR` | Sudden passenger surge requiring maximum capacity | Dynamically increases RUN target by $+2$, reducing MAINTENANCE |
| `WEATHER` | Heavy rain / fog causing depot delays | Adds $+8$ minutes to shunting time for all trains |
| `CLEANING_DELAY` | Hygiene contractor strike or water outage | Sets `cleaning_required = 1` across all trains |
| `SIGNALLING_FAILURE` | Track interlocking failure in depot zones | Adds 4 open jobs to lead stabling tracks |
| `STAFF_SHORTAGE` | Crew shortage limiting train operations | Reduces RUN target by 3, reallocating capacity to STANDBY |
| `VIP_BRANDING_DAY` | Major sponsor campaign / executive visit | Adds $+2$ to branding priority fleet-wide |
| `MULTIPLE_BREAKDOWN` | Cascading depot power failure | Injects 5 open jobs across 4 trainsets simultaneously |

### 7. Plan Versioning & Comparison Engine
MetroFlow supports a complete versioning lifecycle (`plans`, `plan_details`, `plan_versions`):
* **`GENERATED`**: The raw AI-optimized plan.
* **`SIMULATION`**: Transient plan variations from what-if runs (stored with AI summary in `simulation_logs`).
* **`FINALIZED`**: Approved plan signed off by the Lead Planner or Admin. Finalizing locks all department inputs for that calendar day.
* **Plan Comparison Matrix (`compare_plans()`)**:
  Calculates risk deltas using weighted operational exposure:
  $$\text{Fleet Risk} = \frac{1}{N} \sum \Big(\text{risk\_score}_i \times w(\text{decision}_i)\Big)$$
  where $w(\text{RUN}) = 1.0$, $w(\text{STANDBY}) = 0.5$, and $w(\text{MAINTENANCE}) = 0.1$.
  Outputs net risk change, percentage delta, shift direction (`INCREASED`, `DECREASED`, `UNCHANGED`), override count, and exact list of modified train IDs.

---

## 📡 Real-Time Kafka Streaming Pipeline

MetroFlow uses **Apache Kafka** to decouple operational data submissions from analytics consumers, providing a low-latency audit trail and live UI streaming.

```
Department Dashboards ──► KafkaProducer ──► Kafka Broker (Port 9092)
                                                 │
                                 ┌───────────────┴───────────────┐
                                 ▼                               ▼
                      "department-events"                "planner-events"
                                 │                               │
                                 ▼                               ▼
                     MetroFlowEventConsumer (Background Daemon Thread)
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
      In-Memory State Lock               PostgreSQL DB
      (_analytics_lock)                  (events_log table)
                 │                               │
                 └───────────────┬───────────────┘
                                 ▼
                     GET /admin/analytics/summary
                     GET /admin/analytics/kafka-live
                                 ▼
                     Live Frontend Event Stream
```

### Kafka Topics:
1. `department-events`: Real-time submissions from Maintenance, Fitness, Cleaning, Operations, and Branding.
2. `planner-events`: Plan generation, scenario simulation, and plan finalization events.
3. `user-events`: User authentication and administration audit logs.
4. `system-events`: Health checks, consumer heartbeats, and database sync status.

### Event Message Schema:
```json
{
  "event_type": "department_submission",
  "timestamp": "2026-04-20T10:30:00+05:30",
  "user_id": 3,
  "data": {
    "department": "maintenance",
    "records_count": 25,
    "status": "success",
    "details": "Submitted 25 maintenance record(s) for today"
  }
}
```

### High-Performance Consumer Architecture:
* **Background Consumer Daemon (`kafka_consumer_store.py`)**: Runs continuously during the FastAPI server lifecycle.
* **Lock-Protected Memory Store (`_analytics_lock`)**: Maintains the last 20 events, live KPI counters, and department totals in memory, serving dashboard polls in $< 5\text{ms}$ without querying the database.
* **Durable Persistence**: Concurrently commits events into the `events_log` table (indexed by `event_timestamp DESC` and `department`).
* **Resilient Fallback**: If Kafka is temporarily unreachable or disabled via `KAFKA_ENABLED=false`, the backend gracefully falls back to synthetic timeline reconstruction directly from relational log tables.

---

## 🧠 GenAI Explainability Layer (`genai_adapter.py`)

To eliminate "black box" decisions, MetroFlow integrates LLM-based operational explainability.

### Dual-Provider Architecture
* **Primary Provider**: **Groq API** (`llama-3.3-70b-versatile` with low temperature for fast, deterministic reasoning).
* **Secondary Provider**: **Google Gemini** (`gemini-1.5-flash` with automatic failover).
* **Offline Deterministic Fallbacks**: If API keys are absent or rate limits are reached, the system falls back to rule-based parametric summaries.

### Specialized AI Capabilities
1. **Plan Allocation Explanation (`generate_plan_explanation`)**: Ingests OCR targets, risk distributions, open jobs, and branding VIP requirements; produces an executive dispatch briefing explaining why specific trains were assigned to revenue service vs. depot maintenance.
2. **Simulation Explanations (`generate_simulation_explanation`)**: Synthesizes the operational impacts of what-if scenarios (e.g., assessing the impact of a weather delay on shunting transit).
3. **Override Justification (`generate_override_explanation`)**: Explains human modifications when a planner manually switches an AI recommendation.
4. **Plan Diff Analysis (`generate_comparison_explanation`)**: Explains risk trade-offs between initial AI generation and human-finalized plans.
5. **Context-Aware Analytics Chatbot (`/admin/analytics/chat`)**: Allows operators to ask free-form natural language questions (e.g., *"Which trains have pending fitness certificates and high branding contracts?"*); injects live database stats into the prompt context on every request.

---

## 👥 Role-Based Access Control (RBAC) & Portals

MetroFlow implements strict role-based access control with dedicated, role-specific UI workflows:

| Role | Key Capabilities | Primary Portal |
| :--- | :--- | :--- |
| **`ADMIN`** | Full system control; user management; system monitoring; override finalized plans; access all department portals. | `/admin` |
| **`PLANNER`** | Multi-department readiness tracking; AI plan generation; what-if simulation; manual decision overrides; plan finalization. | `/planner` |
| **`OPERATIONS`** | Operations Control Room (OCR); fleet target count submission (RUN, STANDBY, MAINTENANCE); daily mileage tracking. | `/operations` |
| **`MAINTENANCE`** | Log open maintenance jobs, work order severity, and mechanical urgency levels. | `/maintenance` |
| **`FITNESS`** | Safety certification inspections; certify train compliance status (`FIT` vs `UNSAFE`). | `/fitness` |
| **`CLEANING`** | Record daily washing and detailing tasks; monitor days-since-last-clean counters. | `/cleaning` |
| **`BRANDING`** | Track commercial advertising contracts; set branding priority tiers (0–4) and penalty risk levels. | `/branding` |

### Default Seed Credentials
The system automatically provisions standard accounts on startup:
| Username | Password | Role | Description |
| :--- | :--- | :--- | :--- |
| `admin` | `admin123` | `ADMIN` | System Administrator |
| `planner` | `planner123` | `PLANNER` | Lead Fleet Planner |
| `operations` | `operations123` | `OPERATIONS` | Operations Control Room Controller |
| `maintenance` | `maintenance123` | `MAINTENANCE` | Depot Maintenance Chief |
| `fitness` | `fitness123` | `FITNESS` | Safety & Fitness Inspector |
| `cleaning` | `cleaning123` | `CLEANING` | Depot Cleaning Supervisor |
| `branding` | `branding123` | `BRANDING` | Commercial & Branding Manager |

> 🔒 **Daily Finalization Lock**: Once the Lead Planner or Admin finalizes today's plan, department endpoints (`/maintenance/submit`, `/fitness/submit`, `/cleaning/submit`, `/branding/submit`, `/operations/submit-counts`) automatically reject further modifications for that date.

---

## 🔌 API Reference Matrix

The backend exposes 11 modular routers under FastAPI:

### 1. Authentication & Users (`/auth`, `/users`)
* `POST /auth/login`: Authenticate with OAuth2 credentials; returns JWT bearer token.
* `GET /auth/me`: Fetch authenticated user profile and permissions.
* `GET /users/`: List all registered system users (Admin only).
* `POST /users/`: Create a new user with specific role (Admin only).
* `PUT /users/{user_id}`: Update user details or toggle `is_active` status.

### 2. Fleet Planning Engine (`/planner`)
* `GET /planner/summary`: Department submission checklist and induction readiness counts.
* `GET /planner/department-data/{dept}`: Fetch raw table rows submitted today for modal inspection.
* `GET /planner/current-plan`: Retrieve current plan details and status (`GENERATED` / `FINALIZED`).
* `POST /planner/generate-plan`: Trigger ML risk evaluation, priority scoring, and fleet allocation. Emits Kafka event.
* `POST /planner/what-if`: Execute an operational stress simulation scenario (`TRAIN_FAILURE`, `PEAK_HOUR`, etc.).
* `POST /planner/finalize`: Commit final plan decisions; locks department inputs; generates AI explanation.
* `POST /planner/compare`: Compute quantitative risk deltas and decision diffs between original and modified plans.
* `GET /planner/is-finalized`: Check if today's plan has been signed off.
* `GET /planner/final-plan`: Fetch the finalized induction plan for general dashboard views.
* `GET /planner/maintenance-trains`: Fetch list of train IDs assigned to maintenance today.

### 3. Real-Time Admin Analytics (`/admin/analytics`)
* `GET /admin/analytics/summary`: Real-time fleet KPI metrics (Running, Standby, Maintenance, High Risk, Backlog).
* `GET /admin/analytics/trends`: 7-day historical trend series for maintenance, cleaning, fitness, and overall risk.
* `GET /admin/analytics/kafka-live`: Recent Kafka events stream (last 20 events) with origin department and payload.
* `GET /admin/analytics/risks/high-risk-trains`: Detailed list of high-risk trains with urgency and penalty flags.
* `POST /admin/analytics/chat`: Context-aware GenAI conversational analytics assistant.

### 4. Operations Control Room (`/operations`)
* `GET /operations/status`: Check whether OCR targets have been submitted today.
* `GET /operations/trains`: List all fleet train IDs.
* `GET /operations/current-counts`: Return current RUN, STANDBY, and MAINTENANCE target allocations.
* `POST /operations/submit-counts`: Submit today's required fleet breakdown (validates $\sum = \text{Total Fleet}$).
* `GET /operations/mileage/today`: Fetch today's logged kilometers per trainset.
* `POST /operations/mileage/save`: Save daily mileage records.

### 5. Department Logging Endpoints
* **Maintenance** (`/maintenance`):
  * `GET /maintenance/status`, `GET /maintenance/today`, `POST /maintenance/submit`.
* **Fitness Certification** (`/fitness`):
  * `GET /fitness/status`, `GET /fitness/today`, `POST /fitness/submit`.
* **Cleaning & Detailing** (`/cleaning`):
  * `GET /cleaning/status`, `GET /cleaning/today`, `POST /cleaning/submit`.
* **Branding & Advertising** (`/branding`):
  * `GET /branding/status`, `GET /branding/today`, `POST /branding/submit`.

### 6. General Analytics & AI Insights (`/analytics`, `/ai`)
* `GET /analytics/metrics`: Overall system metrics and backlog counts.
* `GET /ai/insights`: High-level operational analysis with observations, risk items, and strategic recommendations.

---

## 🗄️ Database Architecture (`database/schema.sql`)

```
┌────────────────────────────────────────────────────────────────────────┐
│                          RELATIONAL ENTITIES                           │
├────────────────────────────────────────────────────────────────────────┤
│ master_train_data ────┬─── maintenance_logs (open_jobs, urgency)       │
│ (train_id [PK],       ├─── fitness_logs (compliance_status)            │
│  track_id, position,  ├─── cleaning_logs (cleaning_done, days_since)   │
│  shunting_time, etc.) ├─── branding_logs (branding_priority, penalty)  │
│                       ├─── mileage_logs (mileage_today)                │
│                       └─── plan_details (decision, risk_score)         │
│                                      │                                 │
│ plans (date [UQ], status, counts) ───┘                                 │
│ plan_versions (version_type, reference_plan_id, notes)                 │
│ real_daily_features (date, train_id [UQ], shunting_time, risk_label)   │
│ operations_control_room (log_date [UQ], run_count, standby_count)      │
│ events_log (event_timestamp, department, event_type, payload JSON)     │
│ simulation_logs (scenario_name, train_id, explanation)                 │
│ model_metadata (last_trained_at, data_points)                          │
│ users (username [UQ], hashed_password, role, is_active)                │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📂 Repository Directory Layout

```
MetroFlow/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI app lifecycle, DB seeding, Kafka consumer bootstrap
│   │   ├── api/
│   │   │   ├── admin_analytics.py      # Real-time analytics, trends, Kafka feed, GenAI chat
│   │   │   ├── ai_insights.py          # Structured AI observations & risk recommendations
│   │   │   ├── analytics.py            # High-level operational metrics endpoints
│   │   │   ├── auth.py                 # OAuth2 password auth, token issue, current user
│   │   │   ├── branding.py             # Branding priority (0-4) & penalty risk endpoints
│   │   │   ├── cleaning.py             # Cleaning done status & days-since-clean endpoints
│   │   │   ├── fitness.py              # Fitness compliance status (FIT/UNSAFE) endpoints
│   │   │   ├── maintenance.py          # Work orders, open jobs & urgency level endpoints
│   │   │   ├── operational.py          # Operations Control Room targets & mileage endpoints
│   │   │   ├── planner.py              # Plan generation, 8 simulations, finalize, compare
│   │   │   └── users.py                # User administration CRUD endpoints
│   │   ├── core/
│   │   │   ├── database.py             # SQLAlchemy engine & session factory
│   │   │   └── security.py             # Password hashing (bcrypt) & JWT tokens (HS256)
│   │   └── services/
│   │       ├── audit.py                # System audit logging service
│   │       ├── core_adapter.py         # Fleet readiness summary calculations
│   │       ├── genai_adapter.py        # Groq & Gemini multi-provider AI explanation engine
│   │       ├── kafka_consumer_store.py # Background Kafka consumer & in-memory state lock
│   │       └── kafka_producer.py       # Thread-safe Kafka event publisher
│   ├── ml/
│   │   ├── config.py                   # Paths, DB connection, and model artifact settings
│   │   ├── planner_engine.py           # Optimization engine, priority formula, 8 simulations
│   │   └── train_model.py              # Random Forest training, noise injection, smart retraining
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── AdminDashboard.tsx      # Admin User Management & Real-Time Analytics tabs
│   │   │   ├── BrandingDashboard.tsx   # Branding compliance & advertising contract portal
│   │   │   ├── CleaningDashboard.tsx   # Cleaning & hygiene schedule tracking portal
│   │   │   ├── FitnessDashboard.tsx    # Safety fitness certificate validation portal
│   │   │   ├── Landing.tsx             # Public landing page with live system status
│   │   │   ├── Login.tsx               # Terminal login screen with role-based redirection
│   │   │   ├── MaintenanceDashboard.tsx# Depot work orders & defect logging portal
│   │   │   ├── OperationsDashboard.tsx # Operations Control Room targets & mileage portal
│   │   │   └── PlannerDashboard.tsx    # Fleet induction planning, what-if sim, plan diff
│   │   ├── components/
│   │   │   ├── Shell.tsx               # Persistent application layout, sidebar & user menu
│   │   │   ├── analytics/
│   │   │   │   ├── AnalyticsDashboard.tsx # Real-time dashboard coordinator
│   │   │   │   ├── ChatPanel.tsx       # Natural language GenAI analytics assistant
│   │   │   │   ├── LiveEventsPanel.tsx # Real-time Kafka event streaming feed
│   │   │   │   ├── MetricCard.tsx      # KPI cards with live trend sparklines
│   │   │   │   ├── RiskPanel.tsx       # High-risk train summary panel
│   │   │   │   └── TrendsCharts.tsx    # 7-day historical department trend charts
│   │   │   └── ui/                     # Reusable design system (Button, Card, Input, Badges)
│   │   ├── config/axios.ts             # Pre-configured Axios instance with JWT interceptors
│   │   └── context/AuthContext.tsx     # Global React authentication provider
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── pipeline/
│   ├── real_feature_pipeline.py        # Real-time feature generator & shunting congestion calculator
│   └── synthetic_feature_pipeline.py   # Synthetic feature generator & schema bootstrap
├── scripts/
│   └── daily_data_generator.py         # 90-day cold-start synthetic dataset generator
├── datasets/                           # Static CSV seeds (master data, track geometry, contracts)
├── generated/                          # Generated synthetic features cache
├── trained_models/                     # Serialized model (`risk_model.pkl`) & metric plots
├── database/schema.sql                 # Complete PostgreSQL DDL schema & table constraints
├── docker-compose.yml                  # Zookeeper (2181) & Apache Kafka (9092) containers
├── package.json                        # Root npm script orchestrator (concurrent dev runner)
└── requirements.txt                    # Root Python dependencies
```

---

## 🚀 Quick Start Guide

### Prerequisites
* **Python**: 3.10+
* **Node.js**: 18+ and `npm`
* **PostgreSQL**: 13+ running locally or remotely
* **Apache Kafka**: 3.x (or run via Docker Compose)
* **Docker & Docker Compose** (optional, recommended for Kafka)

---

### Step 1: Clone Repository & Configure Environment

```bash
git clone https://github.com/your-username/MetroFlow.git
cd MetroFlow
```

Create `.env` in the project root:
```env
# Database Connection
DATABASE_URL=postgresql://postgres:password@localhost:5432/metroflow

# Apache Kafka Event Streaming
KAFKA_ENABLED=true
KAFKA_BROKER=localhost:9092

# GenAI LLM Providers (At least one recommended)
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# JWT Security
JWT_SECRET_KEY=supersecretkey_for_metroflow_123

# Timezone
TZ=Asia/Kolkata
```

---

### Step 2: Start Apache Kafka & Zookeeper

Using Docker Compose:
```bash
docker-compose up -d
```
Verify Kafka is listening on `localhost:9092` and Zookeeper on `localhost:2181`.

---

### Step 3: Install Dependencies

#### Python Backend:
```bash
# Create and activate virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

#### React Frontend:
```bash
cd frontend
npm install
cd ..
```

---

### Step 4: Run the Complete System

#### Option A: One-Command Startup (Root Directory)
From the project root folder, execute:
```bash
npm run dev
```
*This uses `concurrently` to launch the FastAPI backend on `http://localhost:8000` and the Vite React frontend on `http://localhost:5173` simultaneously.*

#### Option B: Manual Service Startup

**Terminal 1 — Backend**:
```bash
# From repository root (with venv activated):
uvicorn --app-dir backend app.main:app --reload --port 8000

# Or navigate to backend:
cd backend
uvicorn app.main:app --reload --port 8000
```
*API Swagger Documentation*: `http://localhost:8000/docs`

**Terminal 2 — Frontend**:
```bash
cd frontend
npm run dev
```
*Frontend Application*: `http://localhost:5173`

---

## 🧪 System Verification & Startup Sequence

When the backend starts up, `app.main:app` automatically performs:
1. **Schema Check**: Verifies and auto-creates missing database tables (`create_schema_if_needed()`, `ensure_log_tables()`).
2. **Static Seed Data**: Auto-populates `master_train_data`, `jobcard_status`, `branding_priorities`, and depot geometry from CSV datasets.
3. **User Seeding**: Auto-provisions default role accounts (`admin`, `planner`, `operations`, etc.) if the `users` table is empty.
4. **Synthetic Feature Generation**: Creates 90 days of baseline history if cold-starting.
5. **Smart ML Training**: Checks retraining triggers; fits and serializes `trained_models/risk_model.pkl` if required.
6. **Kafka Consumer Bootstrap**: Launches the background daemon `MetroFlowEventConsumer` to ingest real-time events.

---

## 🛠️ Troubleshooting & FAQs

### 1. Backend fails with `No module named 'pipeline'` or `No module named 'ml'`
* **Cause**: Python path is not rooted at the workspace root.
* **Fix**: Run Uvicorn with `--app-dir backend app.main:app` from the project root, or ensure `sys.path.append(BASE_DIR)` is executed (already handled in `app/main.py`).

### 2. "Kafka broker unavailable" warning on startup
* **Cause**: Kafka Docker container is not running or broker port 9092 is unreachable.
* **Fix**:
  1. Check Docker status: `docker-compose ps`.
  2. If running without Kafka, the system will gracefully log a warning and continue operating using PostgreSQL fallback events. To disable Kafka explicitly, set `KAFKA_ENABLED=false` in `.env`.

### 3. Department submissions return "Today's plan is finalized" (HTTP 400)
* **Cause**: The daily plan has already been finalized by a Planner or Admin.
* **Fix**: Department records are intentionally locked once a plan is finalized to prevent mid-day state divergence. An `ADMIN` user can regenerate and replace the finalized plan from `/planner`.

### 4. GenAI summaries return standard fallback strings
* **Cause**: `GROQ_API_KEY` and `GEMINI_API_KEY` are not set in `.env`, or the provider timed out.
* **Fix**: Provide a valid Groq API key (free tier available at [console.groq.com](https://console.groq.com)) or Gemini API key. The system continues operating smoothly with rule-based text fallbacks when keys are absent.

---

## 📄 License & Attribution

Developed with ❤️ for **Metro Rail Fleet Management, Rolling Stock Engineering, and Smart Transit Operations**.
