from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from app.core.database import Base

class MasterTrainData(Base):
    __tablename__ = "master_train_data"
    train_id = Column(String, primary_key=True, index=True)
    rolling_stock_status = Column(String)
    signalling_status = Column(String)
    telecom_status = Column(String)
    highest_open_job_priority = Column(String)
    kilometers_since_last_maintenance = Column(Integer)
    maintenance_threshold = Column(Integer)
    urgency_level = Column(String)
    penalty_risk_level = Column(String)
    days_since_last_clean = Column(Integer)
    compliance_status = Column(String)
    track_id = Column(String)
    position = Column(Integer)
    estimated_shunting_time_minutes = Column(Integer)
    rolling_stock_expiry = Column(Date)
    signalling_expiry = Column(Date)
    telecom_expiry = Column(Date)
    advertiser_name = Column(String)
    total_kilometers = Column(Integer)

class JobcardStatus(Base):
    __tablename__ = "jobcard_status"
    work_order_id = Column(String, primary_key=True, index=True)
    train_id = Column(String, ForeignKey("master_train_data.train_id"))
    maintenance_description = Column(String)
    work_status = Column(String)
    priority_level = Column(String)

class FitnessCertificate(Base):
    __tablename__ = "fitness_certificates"
    certificate_id = Column(String, primary_key=True, index=True)
    train_id = Column(String, ForeignKey("master_train_data.train_id"))
    certificate_type = Column(String)
    issue_date = Column(Date)
    expiry_date = Column(Date)
    validity_status = Column(String)

class BrandingPriority(Base):
    __tablename__ = "branding_priorities"
    contract_id = Column(String, primary_key=True, index=True)
    train_id = Column(String, ForeignKey("master_train_data.train_id"))
    advertiser_name = Column(String)
    required_exposure_hours = Column(Float)
    accumulated_exposure_hours = Column(Float)
    projected_sla_compliance_percentage = Column(Float)
    penalty_risk_level = Column(String)
