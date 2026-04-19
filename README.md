# MetroFlow - AI-Based Train Induction Planning & Real-Time Analytics Platform

> A data-driven decision support system for metro train fleet management with **Apache Kafka-powered real-time streaming analytics**

## 📌 Overview

MetroFlow is an integrated platform that combines:

1. **AI-Based Train Induction Planning**: Intelligent daily planning system for metro train fleet induction
2. **Kafka Real-Time Analytics**: Live streaming analytics platform for monitoring fleet operations across multiple departments
3. **Role-Based Operations Dashboard**: Multi-department interface for maintenance, fitness, cleaning, branding, and operations teams

The system analyzes operational data from multiple departments and makes optimal decisions about which trainsets should:
- **RUN** – Enter revenue service
- **STANDBY** – Remain available as backup  
- **MAINTENANCE** – Move to inspection or repair

## 🎯 Core Features

### 📊 Kafka Real-Time Streaming Analytics
- **Live Event Stream**: Real-time Kafka event ingestion from all departments
- **Department-wise Monitoring**: Separate analytics tracks for Maintenance, Fitness, Cleaning, Operations, and Branding
- **Fleet Overview Dashboard**: Real-time KPI cards showing:
  - Total trains in fleet
  - Currently running trains
  - Maintenance backlog
  - High-risk trains requiring attention
- **7-Day Trend Analysis**: Historical trends for each department's metrics
- **Live Event Panel**: Detailed real-time event display with timestamps, record counts, and processing status

### 🤖 AI-Powered Insights
- **Context-Aware GenAI Assistant**: Analytics-focused chatbot powered by GROQ/GEMINI LLMs
- **Real-time Analytics Context**: Fresh fleet data aggregation on every query
- **Natural Language Explanations**: Human-readable insights into operational patterns

### 🔧 Fleet Management
- **Maintenance Tracking**: Work order backlog and compliance status
- **Fitness Certification**: Train certificate validity and compliance monitoring
- **Cleaning & Detailing**: Hygiene standards and schedule tracking
- **Operations Control**: Daily run status and deployment tracking
- **Branding Compliance**: Brand contract priorities and commitments

### 🔐 Role-Based Access Control
- **ADMIN**: Full system access and analytics
- **OPERATIONS**: Operations control room dashboard
- **PLANNER**: Train induction planning interface
- **MAINTENANCE/FITNESS/CLEANING/BRANDING**: Department-specific dashboards

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  React + TypeScript                                             │
│  ├─ Admin Dashboard (User Management)                          │
│  ├─ Kafka Real-Time Analytics Dashboard                        │
│  │  ├─ Fleet Overview KPI Cards                               │
│  │  ├─ Department Trends (7-day charts)                       │
│  │  ├─ Live Events Stream (Kafka)                             │
│  │  ├─ Risk Panel                                             │
│  │  └─ AI Insights Chat Panel                                 │
│  └─ Role-Based Department Dashboards                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND LAYER (FastAPI)                      │
├─────────────────────────────────────────────────────────────────┤
│  ├─ Authentication & Authorization                             │
│  ├─ User Management APIs                                       │
│  ├─ Analytics APIs                                             │
│  │  ├─ GET /admin/analytics/summary                          │
│  │  ├─ GET /admin/analytics/trends                           │
│  │  ├─ GET /admin/analytics/kafka-live                       │
│  │  ├─ GET /admin/analytics/risks/high-risk-trains           │
│  │  └─ POST /admin/analytics/chat                            │
│  ├─ Department-Specific APIs                                  │
│  └─ Kafka Consumer Service (Background)                        │
└─────────────────────────────────────────────────────────────────┘
         ↙              ↓              ↓              ↘
    ┌────────┐  ┌────────────┐  ┌──────────────┐  ┌────────┐
    │ Kafka  │  │ PostgreSQL │  │ GROQ/GEMINI  │  │ GenAI  │
    │ Broker │  │ Database   │  │ LLM Service  │  │Module  │
    └────────┘  └────────────┘  └──────────────┘  └────────┘
```

### Data Flow: Real-Time Event Processing

```
Department Dashboards (Maintenance/Fitness/Cleaning/Operations)
         ↓
   Kafka Topics:
   ├─ maintenance-events
   ├─ fitness-events
   ├─ cleaning-events
   ├─ operations-events
   └─ branding-events
         ↓
   Kafka Consumer Service (Background Thread)
   ├─ Consumes events
   ├─ Extracts department & event details
   └─ Stores to events_log table
         ↓
   PostgreSQL events_log Table
   ├─ event_timestamp (IST timezone)
   ├─ department
   ├─ event_type
   ├─ train_id
   └─ payload (JSON)
         ↓
   Real-Time Analytics APIs
   ├─ Query fresh data on each request
   ├─ Aggregate by department
   └─ Return to Frontend
         ↓
   Live Analytics Dashboard
   ├─ Update every 10 seconds (configurable)
   ├─ Show live event stream
   └─ Display 7-day trends
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Tailwind CSS + Framer Motion |
| **Backend** | FastAPI + SQLAlchemy ORM |
| **Real-Time Streaming** | Apache Kafka + Python kafka-python |
| **Database** | PostgreSQL + SQLAlchemy |
| **ML/GenAI** | GROQ/GEMINI LLM APIs + Scikit-learn (placeholder) |
| **Bundler** | Vite |
| **Build/Orchestration** | Docker + Docker Compose |

---

## 📂 Project Structure

```
MetroFlow/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app + Kafka consumer lifecycle
│   │   ├── api/
│   │   │   ├── auth.py            # Authentication endpoints
│   │   │   ├── users.py           # User management
│   │   │   ├── admin_analytics.py # Real-time analytics endpoints (5 endpoints)
│   │   │   └── [department APIs]  # Maintenance, Fitness, Cleaning, etc.
│   │   ├── core/
│   │   │   ├── database.py        # SQLAlchemy setup & DB session
│   │   │   └── security.py        # JWT & authorization
│   │   └── services/
│   │       ├── kafka_consumer_store.py    # Background Kafka consumer
│   │       ├── kafka_producer.py          # Event publishing
│   │       ├── genai_adapter.py           # LLM integration
│   │       ├── core_adapter.py            # ML/optimization (placeholder)
│   │       └── audit.py                   # Audit logging
│   ├── ml/
│   │   ├── config.py              # ML configuration
│   │   ├── planner_engine.py      # Planning algorithm
│   │   └── train_model.py         # Model training
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── AdminDashboard.tsx         # Admin user management + analytics
│   │   │   ├── Login.tsx
│   │   │   ├── Landing.tsx
│   │   │   └── [Department Dashboards]
│   │   ├── components/
│   │   │   └── analytics/
│   │   │       ├── AnalyticsDashboard.tsx # Main analytics orchestration
│   │   │       ├── LiveEventsPanel.tsx    # Kafka event stream display
│   │   │       ├── TrendsCharts.tsx       # 7-day trend visualization
│   │   │       ├── ChatPanel.tsx          # AI insights interface
│   │   │       ├── RiskPanel.tsx          # High-risk trains display
│   │   │       └── MetricCard.tsx         # KPI card component
│   │   ├── config/
│   │   │   └── axios.ts           # API client configuration
│   │   └── context/
│   │       └── AuthContext.tsx    # Auth state management
│   ├── package.json
│   ├── tsconfig.json
│   └── tailwind.config.js
│
├── database/
│   └── schema.sql                 # PostgreSQL schema + events_log table
│
├── docker-compose.yml             # Kafka + PostgreSQL + Backend
├── KAFKA_SETUP.md                 # Kafka configuration guide
├── ANALYTICS_DATA_SOURCES.md      # Detailed data source documentation
└── requirements.txt
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Node.js 16+
- PostgreSQL 12+
- Apache Kafka 3.x
- Docker & Docker Compose (optional)

### Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/Scripts/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env  # Edit with your configuration

# Run migrations
python -m app.core.database

# Start backend server
uvicorn app.main:app --reload
```

**Backend runs on**: `http://localhost:8000`

### Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

**Frontend runs on**: `http://localhost:5173`

### Kafka Setup

Start Kafka using Docker Compose:

```bash
docker-compose up -d
```

Or follow [KAFKA_SETUP.md](KAFKA_SETUP.md) for manual setup.

---

## 📊 Analytics Dashboard Walkthrough

### 1. Fleet Overview Section
Shows 4 key metrics:
- **Total Trains**: Complete fleet inventory from master database
- **Running Trains**: Current active trains (from Operations Control Room)
- **Maintenance Backlog**: Pending work orders (from Kafka events)
- **High Risk**: Non-compliant trains requiring attention (from Kafka events)

### 2. AI-Powered Insights (Chat Panel)
- Ask questions about fleet status
- Receives context-fresh analytics data on every query
- LLM provides natural language insights
- Powered by GROQ/GEMINI

### 3. Department Trends (7-Day History)
- **Maintenance Department**: Pending work orders trend
- **Fitness Certification**: Non-compliant trains trend
- **Cleaning & Detailing**: Pending cleaning tasks trend
- **System Risk Assessment**: Overall operational health index

### 4. Live Events Stream (Kafka)
- **Real-time event display** with color-coded departments
- **Full event details**: Timestamp, train ID, record count, user ID
- **Event sequence tracking**: See events in order they occurred
- **Department breakdown**: Statistics showing events per department
- **Auto-refresh**: Updates every 10 seconds (configurable)

### 5. High-Risk Trains
- Detailed list of trains requiring immediate attention
- Urgency level and penalty risk indicators
- Compliance status and maintenance info

---

## 🔌 API Endpoints

### Analytics Endpoints (Require ADMIN/OPERATIONS/PLANNER role)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/analytics/summary` | Fleet overview metrics |
| GET | `/admin/analytics/trends` | 7-day trend data for all departments |
| GET | `/admin/analytics/kafka-live` | Recent Kafka events from last 24 hours |
| POST | `/admin/analytics/chat` | AI-powered analytics chat |
| GET | `/admin/analytics/risks/high-risk-trains` | List of high-risk trains |

### Response Example: `/admin/analytics/summary`

```json
{
  "total_trains": 25,
  "running_trains": 4,
  "standby_trains": 15,
  "maintenance_trains": 6,
  "high_risk_trains": 2,
  "today_submissions": 4,
  "maintenance_backlog": 2,
  "fitness_non_compliant": 0,
  "timestamp": "2026-04-20T10:30:00+05:30"
}
```

---

## 🎨 UI/UX Features

### Real-Time Indicators
- 🟢 **Live Data** indicator when Kafka events are active
- 🔴 **Kafka Stream** indicator showing event count
- ⏳ Loading states for all data sections
- ⚠️ Error messages with graceful fallbacks

### Premium Design
- Dark theme with cyan/green/orange/purple/red color coding
- Gradient borders for visual hierarchy
- Smooth animations with Framer Motion
- Responsive grid layouts (mobile-friendly)
- Hover effects and interactive feedback

### Data Visualization
- Bar charts with sparkline trends
- Color-coded department sections
- Status indicators and badges
- Grid-based event display with full details

---

## 🔄 Kafka Event Format

Events published to Kafka topics follow this structure:

```json
{
  "timestamp": "2026-04-20T10:30:00+05:30",
  "department": "maintenance",
  "event_type": "work_order_submitted",
  "train_id": "MR-001",
  "payload": {
    "records_count": 2,
    "user_id": 5,
    "details": "Routine maintenance completed"
  }
}
```

**Topics**: 
- `maintenance-events`
- `fitness-events`
- `cleaning-events`
- `operations-events`
- `branding-events`

---

## 🗄️ Database Schema

### Key Tables
- `master_train_data`: Fleet inventory
- `operations_control_room`: Daily operations status
- `maintenance_logs`: Maintenance work orders
- `fitness_certificates`: Fitness certification validity
- `cleaning_detailing`: Cleaning task logs
- `events_log`: **Kafka event storage** (new)
- `users`: User accounts and roles
- `audit_logs`: Audit trail

See [database/schema.sql](database/schema.sql) for complete schema.

---

## 🔐 Authentication & Authorization

### User Roles
- **ADMIN**: Full system access, user management, analytics
- **OPERATIONS**: Operations dashboard, operations control room
- **PLANNER**: Train induction planning interface
- **MAINTENANCE**: Maintenance department dashboard
- **FITNESS**: Fitness certification dashboard
- **CLEANING**: Cleaning department dashboard
- **BRANDING**: Branding compliance dashboard

### Protected Endpoints
All analytics and sensitive endpoints require:
- Valid JWT token in Authorization header
- Appropriate role-based permissions

---

## 📈 Data Sources & Updates

For detailed explanation of where each metric comes from, see [ANALYTICS_DATA_SOURCES.md](ANALYTICS_DATA_SOURCES.md)

**Summary**:
- **Total Trains**: Static inventory (database)
- **Running Trains**: Operations Control Room (daily submission)
- **Maintenance**: Kafka events (real-time, on-demand)
- **High Risk**: Kafka events (real-time, on-demand)
- **Trends**: Aggregated from department logs (7-day history)

---

## 🚧 Error Handling

The system implements graceful error handling:
- Missing tables return 0 instead of 500 errors
- Failed queries return empty arrays with warning logs
- All API responses are validated before returning
- Frontend displays "No data" states instead of crashing

---

## 📝 Environment Configuration

Create `.env` file in backend directory:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/metroflow

# Kafka
KAFKA_ENABLED=true
KAFKA_BROKER=localhost:9092
KAFKA_GROUP_ID=metroflow-consumer

# LLM
GENAI_PROVIDER=groq  # or gemini
GENAI_API_KEY=your_api_key_here

# Auth
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256

# Timezone
TZ=Asia/Kolkata
```

---

## 🤝 Contributing

### Adding a New Department Dashboard
1. Create new component in `frontend/src/pages/[DepartmentName]Dashboard.tsx`
2. Add role-based route in router
3. Create Kafka topic: `[department]-events`
4. Update API endpoints as needed

### Adding Analytics Features
1. Add SQL queries to `backend/app/api/admin_analytics.py`
2. Create frontend components in `frontend/src/components/analytics/`
3. Update types and interfaces
4. Add error handling and graceful fallbacks

---

## 📊 Performance Considerations

- **Auto-refresh**: Configurable (default: 10 seconds)
- **Event limit**: 20 most recent events displayed
- **Trend period**: 7 days of historical data
- **Database indexes**: On event_timestamp and department columns
- **Kafka partitioning**: By department for scalability

---

## 🐛 Troubleshooting

### "500 Error" on Analytics Endpoints
- Check if database tables exist
- Verify database connection in `.env`
- Check backend logs for detailed error messages
- Ensure all migrations have run

### "No Live Data" in Dashboard
- Verify Kafka broker is running: `localhost:9092`
- Check Kafka consumer logs for errors
- Ensure department teams are publishing events
- Check if events_log table exists in database

### Frontend won't start
- Delete `node_modules` and reinstall: `npm install`
- Clear Vite cache: `rm -rf .vite`
- Check Node.js version: `node --version` (should be 16+)

---

## 📚 Documentation

- [KAFKA_SETUP.md](KAFKA_SETUP.md) - Kafka configuration and setup
- [ANALYTICS_DATA_SOURCES.md](ANALYTICS_DATA_SOURCES.md) - Detailed data source documentation
- [database/schema.sql](database/schema.sql) - Database schema definition

---

## 🔮 Phase 2: Planned Enhancements

- ML optimization engine integration
- Historical analytics and reporting
- Predictive maintenance recommendations
- Advanced filtering and search capabilities
- Custom alert thresholds
- Export to CSV/PDF functionality
- Mobile app version

---

## 📄 License

[Specify your license here]

---

## 👥 Team

Built with ❤️ for Metro Operations & Fleet Management

**Questions?** Check the documentation or open an issue.

---

**Last Updated**: April 20, 2026  
**System Status**: ✅ Production Ready (Phase 1 Complete)

# ▶️ Run Instructions
## NOTE: Make sure PostgreSQL is running, and `.env` has your `DATABASE_URL` set.

## Backend

### Create Virtual Environment and activate
```bash
py -3.11 -m venv venv
.\venv\Scripts\Activate.ps1
```
#### Note: only 3.10 or 3.11 is compatible for some python packages like numpy, pandas
### Install dependencies

```bash
pip install -r requirements.txt
```

### Generate daily operational data

```bash
python -m scripts.daily_data_generator
```

### Load data into PostgreSQL

```bash
python -m pipeline.feature_pipeline
```

### Train ML model

```bash
python -m ml.train_model
```

### Plan Generation

```bash
python -m ml.plan_engine.py
```

### Start API server

```bash
cd backend
uvicorn app.api:app --reload
```
Open API documentation:
http://127.0.0.1:8000/docs

## Frontend
### Run Frontend
Start the React + Vite frontend (from the `frontend` directory):

```bash
cd frontend
npm install
npm run dev
```

The App will be available at `http://localhost:5173`.
