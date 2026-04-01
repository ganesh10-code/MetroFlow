from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from app.core.database import Base


class Plan(Base):
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    date = Column(String, nullable=False)  # e.g. "2026-03-24"
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_locked = Column(Boolean, default=False)
    status = Column(String, default="GENERATED")  # GENERATED, LOCKED
    total_trains = Column(Integer, default=0)
    selected_count = Column(Integer, default=0)
    confidence_score = Column(Float, nullable=True)
    explanation = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)


class PlanDetail(Base):
    __tablename__ = "plan_details"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    train_id = Column(String, ForeignKey("master_train_data.train_id"), nullable=False)
    decision = Column(String, nullable=False)  # INDUCT or HOLD
    risk_score = Column(Float, nullable=True)
    override_flag = Column(Boolean, default=False)
    remarks = Column(Text, nullable=True)
    overridden_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    overridden_at = Column(DateTime(timezone=True), nullable=True)
