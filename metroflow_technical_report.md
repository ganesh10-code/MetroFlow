# MetroFlow Technical Report: Core Architecture & ML Implementation

## 1. Project Overview
MetroFlow is an AI-powered Train Induction Planning and Real-Time Analytics Platform designed for metro fleet management. It leverages Apache Kafka for real-time streaming analytics, PostgreSQL for persistence, FastAPI for the backend, and a Machine Learning pipeline to optimize daily train deployments (RUN, STANDBY, MAINTENANCE). It also integrates GenAI (Groq/Gemini) to explain ML-driven decisions and provide operational insights.

---

## 2. Machine Learning Model Architecture

### 2.1 Model Type Used & Justification
The core ML model used for risk prediction is a **RandomForestClassifier** (`sklearn.ensemble.RandomForestClassifier`).

**Why Random Forest?**
- **Robustness to Noise**: Metro operations inherently have noisy data (sensor errors, unpredictable delays). Random forests handle noise and outliers well.
- **Non-linear Relationships**: Fleet risk involves complex interactions between variables (e.g., high mileage combined with pending cleaning vs. high mileage alone). Random forests capture these non-linearities without complex feature engineering.
- **Interpretability**: Feature importance can be easily extracted to understand what drives train risk.
- **Class Imbalance Handling**: Built-in support for balanced class weights helps address rare critical failures.

### 2.2 Avoiding Overfitting
The model is strictly regularized to prevent overfitting on the daily feature set. The following hyperparameters are explicitly set in `backend/ml/train_model.py`:
- `max_depth=8`: Limits the depth of individual trees, forcing the model to generalize rather than memorize the training data.
- `min_samples_split=10`: Requires at least 10 samples in an internal node before it can be split.
- `min_samples_leaf=5`: Ensures that each leaf node has at least 5 samples, smoothing the decision boundaries.
- `class_weight="balanced"`: Adjusts weights inversely proportional to class frequencies, preventing the model from biasing toward the majority class (e.g., "Fit" trains) at the expense of ignoring rare risk cases.

### 2.3 Model Training Constraints & Rules
The system employs a **Smart Retraining System** (`should_retrain()` in `train_model.py`) to ensure the model stays fresh without wasting compute resources.

**Retraining Triggers:**
1. **No Model Exists**: Bootstrapping condition.
2. **Time-Based Decay**: Last trained > 24 hours ago.
3. **Data Growth**: At least 100 new data points (real features) added since the last training.

**Data Source Logic:**
- **>500 Real Records**: Uses *only* real operational data from the database.
- **>0 but <500 Real Records**: Uses a *hybrid* approach, concatenating real database data with the synthetic fallback CSV to ensure sufficient volume.
- **0 Real Records**: Relies entirely on the synthetic fallback data (`synthetic_daily_features.csv`).

**Data Augmentation (Realistic Noise Injection):**
To simulate real-world uncertainty during training, the pipeline explicitly injects noise:
- **Sensor Noise**: Adds a ±5% normal distribution variance to `mileage_today`.
- **Random Failures**: Randomly flags 5% of trains as high risk (label=1) to simulate unexpected breakdowns.
- **Seasonality Simulation**: Increases baseline risk probability on weekends (days 5, 6) to mimic varying operational stress.

### 2.4 Model Performance & Evaluation
- **Train/Test Split**: Uses an 80/20 split.
- **Dynamic Stratification**: The system attempts to use a stratified split (`stratify=y`) to maintain class distribution. However, if a rare class has fewer than 2 instances, it falls back to a standard random split to avoid crashing.
- **Metric**: The primary evaluation metric logged is `accuracy_score`. Predicted risk scores are output as probabilities (`predict_proba()[:, 1]`) to rank trains dynamically rather than just binary classification.

---

## 3. Core Engine: Technical Rules & Constraints
The `planner_engine.py` is the heart of MetroFlow. It translates ML risk probabilities into concrete fleet decisions (RUN, STANDBY, MAINTENANCE) subject to strict operational constraints.

### 3.1 Operations Control Room (OCR) Constraints
The target number of trains for each category is derived from the `operations_control_room` table or falls back to baselines:
- **Base RUN Target**: 18 trains.
- **Base STANDBY Target**: 4 trains.
- **Base MAINTENANCE**: Total Fleet (e.g., 25) - (Run + Standby).
*Constraint*: The sum of RUN, STANDBY, and MAINTENANCE must equal the exact total fleet size.

### 3.2 Priority Scoring Formula
Every train receives a composite `priority_score` used for ranking. The formula heavily penalizes risk and rewards operational needs:
```text
Priority Score = 20
  - (ML Risk Score * 10.0)      # Heavy penalty for AI-predicted risk
  - (Open Jobs * 0.9)           # Penalty for pending maintenance
  - (Cleaning Required * 1.2)   # Penalty for dirty trains
  - (Shunting Time * 0.06)      # Slight penalty for distant trains
  + (Branding Priority * 0.45)  # Bonus for VIP advertisement trains
  + (Mileage Ratio * 0.35)      # Bonus to balance mileage
```
*Immediate Penalty*: If `compliance_status != "FIT"`, a massive 8-point penalty is deducted.

### 3.3 Strict Maintenance Rules (Forced Blockers)
A train **MUST** be sent to maintenance, bypassing ML optimization, if:
1. `compliance_status` is not "FIT".
2. `open_jobs` >= 8 (Severe maintenance backlog).

### 3.4 The Optimization Flow
1. **Force Blockers**: Assign trains meeting the strict maintenance rules to `MAINTENANCE`.
2. **Rebalance**:
   - If forced maintenance exceeds the OCR target, the *least risky* maintenance trains are moved to `STANDBY`.
   - If maintenance is below the target, the *most risky* standby candidates are moved to `MAINTENANCE`.
3. **Run Assignment**: The remaining pool of `STANDBY` trains is sorted (safest/highest priority first). The top `N` trains (matching the RUN target) are assigned to `RUN`.

### 3.5 "What-If" Simulation Capabilities
The engine supports dynamic scenario injection that mutates the feature set before optimization:
- `TRAIN_FAILURE`: Adds 6 open jobs to specific trains.
- `WEATHER`: Increases shunting time by 8 minutes globally.
- `VIP_BRANDING_DAY`: Boosts branding priority by 2 globally.
- `PEAK_HOUR`: Dynamically increases the `run_count` target by 2 and adjusts maintenance targets.

---

## 4. Architectural Highlights
- **Kafka Event Streaming**: A background daemon (`MetroFlowEventConsumer`) continually listens to `department-events`. When a department (e.g., Maintenance) submits data, the consumer updates an in-memory state lock (`_analytics_lock`) and persists to `events_log`. This powers the 10-second auto-refresh live dashboard without hammering the database.
- **GenAI Explanability Layer**: Instead of black-box ML outputs, `genai_adapter.py` feeds the structured plan, targets, and comparison metrics into Groq/Gemini to generate human-readable explanations (e.g., "Why were these 3 trains moved to maintenance?").
- **Graceful Fallbacks**: The system ensures continuous operation. If department data is incomplete, the pipeline falls back to generating synthetic feature pipelines. If GenAI APIs timeout, fallback string templates are used. If Kafka fails, standard polling is maintained.
