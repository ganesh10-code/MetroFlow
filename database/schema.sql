CREATE TABLE master_train_data (
    train_id VARCHAR PRIMARY KEY,
    rolling_stock_status VARCHAR,
    signalling_status VARCHAR,
    telecom_status VARCHAR,
    highest_open_job_priority VARCHAR,
    kilometers_since_last_maintenance INT,
    maintenance_threshold INT,
    urgency_level VARCHAR,
    penalty_risk_level VARCHAR,
    days_since_last_clean INT,
    compliance_status VARCHAR,
    track_id VARCHAR,
    position INT,
    estimated_shunting_time_minutes INT,
    rolling_stock_expiry DATE,
    signalling_expiry DATE,
    telecom_expiry DATE,
    advertiser_name VARCHAR,
    total_kilometers INT
);

CREATE TABLE jobcard_status (
    work_order_id VARCHAR PRIMARY KEY,
    train_id VARCHAR,
    maintenance_description TEXT,
    work_status VARCHAR,
    priority_level VARCHAR,
    FOREIGN KEY (train_id)
    REFERENCES master_train_data(train_id)
);

CREATE TABLE fitness_certificates (
    certificate_id VARCHAR PRIMARY KEY,
    train_id VARCHAR,
    certificate_type VARCHAR,
    issue_date DATE,
    expiry_date DATE,
    validity_status VARCHAR,
    FOREIGN KEY (train_id)
    REFERENCES master_train_data(train_id)
);

CREATE TABLE mileage_balancing (
    id SERIAL PRIMARY KEY,
    train_id VARCHAR,
    total_kilometers INT,
    kilometers_since_last_maintenance INT,
    maintenance_threshold INT,
    urgency_level VARCHAR,
    FOREIGN KEY (train_id)
    REFERENCES master_train_data(train_id)
);

CREATE TABLE cleaning_detailing (
    id SERIAL PRIMARY KEY,
    train_id VARCHAR,
    last_deep_clean_date DATE,
    days_since_last_clean INT,
    compliance_status VARCHAR,
    FOREIGN KEY (train_id)
    REFERENCES master_train_data(train_id)
);

CREATE TABLE branding_priorities (
    contract_id VARCHAR PRIMARY KEY,
    train_id VARCHAR,
    advertiser_name VARCHAR,
    required_exposure_hours FLOAT,
    accumulated_exposure_hours FLOAT,
    projected_sla_compliance_percentage FLOAT,
    penalty_risk_level VARCHAR,
    FOREIGN KEY (train_id)
    REFERENCES master_train_data(train_id)
);

CREATE TABLE stabling_geometry (
    id SERIAL PRIMARY KEY,
    train_id VARCHAR,
    track_id VARCHAR,
    position INT,
    shunting_required VARCHAR,
    estimated_shunting_time_minutes INT,
    accessibility_score INT,
    FOREIGN KEY (train_id)
    REFERENCES master_train_data(train_id)
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR,
    username VARCHAR UNIQUE,
    hashed_password VARCHAR,
    role VARCHAR,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT,
    action VARCHAR,
    target_entity VARCHAR,
    target_id VARCHAR,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details TEXT
);

CREATE TABLE plans (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_trains INT,
    maintenance_count INT,
    standby_count INT,
    run_count INT,
    avg_risk_score FLOAT
);

CREATE TABLE plan_details (
    id SERIAL PRIMARY KEY,
    plan_id INT,
    train_id VARCHAR,
    decision VARCHAR CHECK (decision IN ('RUN','MAINTENANCE','STANDBY')),
    risk_score FLOAT,
    priority_score FLOAT,
    reason TEXT,

    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
    FOREIGN KEY (train_id) REFERENCES master_train_data(train_id)
);


-- SYNTHETIC DAILY FEATURES
CREATE TABLE synthetic_daily_features (
    id SERIAL PRIMARY KEY,
    date DATE,
    train_id VARCHAR,
    open_jobs INT,
    urgency_level VARCHAR,
    mileage_today FLOAT,
    days_since_clean INT,
    cleaning_required INT,
    compliance_status VARCHAR,
    branding_priority INT,
    penalty_risk_level VARCHAR,
    shunting_time INT,
    risk_label INT
);

-- MODEL METADATA (for smart retraining)
CREATE TABLE model_metadata (
    id SERIAL PRIMARY KEY,
    last_trained_at TIMESTAMP,
    data_points INT
);

-- ===============================
-- 🔥 LOG TABLES (REAL-TIME DATA)
-- ===============================

CREATE TABLE IF NOT EXISTS maintenance_logs (
    id SERIAL PRIMARY KEY,
    train_id VARCHAR,
    open_jobs INT,
    urgency_level VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cleaning_logs (
    id SERIAL PRIMARY KEY,
    train_id VARCHAR,
    cleaning_done BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fitness_logs (
    id SERIAL PRIMARY KEY,
    train_id VARCHAR,
    compliance_status VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS branding_logs (
    id SERIAL PRIMARY KEY,
    train_id VARCHAR,
    branding_priority INT,
    penalty_risk_level VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===============================
-- 🔥 REAL DAILY FEATURES TABLE
-- ===============================

CREATE TABLE IF NOT EXISTS real_daily_features (
    id SERIAL PRIMARY KEY,
    date DATE,
    train_id VARCHAR,
    open_jobs INT,
    urgency_level VARCHAR,
    mileage_today FLOAT,
    days_since_clean INT,
    cleaning_required INT,
    compliance_status VARCHAR,
    branding_priority INT,
    penalty_risk_level VARCHAR,
    shunting_time INT,
    risk_label INT
);