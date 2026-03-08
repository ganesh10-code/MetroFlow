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