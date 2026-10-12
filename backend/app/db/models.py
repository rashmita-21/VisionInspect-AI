from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Text
from backend.app.db.session import Base

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(String(64), primary_key=True, index=True)
    timestamp = Column(DateTime, default=utc_now, nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    original_image_path = Column(String(512), nullable=False)
    anomaly_map_path = Column(String(512), nullable=True)
    mask_path = Column(String(512), nullable=True)
    overlay_path = Column(String(512), nullable=True)
    anomaly_score = Column(Float, nullable=False)
    normalized_score = Column(Float, nullable=False)
    threshold = Column(Float, nullable=False)
    decision = Column(String(32), nullable=False, index=True)  # 'NORMAL', 'ANOMALY_DETECTED', 'REVIEW_REQUIRED'
    inference_duration_ms = Column(Float, nullable=False)
    model_name = Column(String(128), nullable=False)
    model_version = Column(String(64), nullable=False)
    category = Column(String(64), nullable=False, default="metal_nut")
    explanation = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    is_demo = Column(Boolean, default=False, nullable=False)
    meta_json = Column(Text, nullable=True)

class ModelRecord(Base):
    __tablename__ = "models"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    architecture = Column(String(128), nullable=False)
    backbone = Column(String(128), nullable=False)
    version = Column(String(64), nullable=False)
    category = Column(String(64), nullable=False)
    status = Column(String(32), nullable=False)  # 'untrained', 'ready', 'failed'
    artifact_path = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    config_json = Column(Text, nullable=True)

class EvaluationRun(Base):
    __tablename__ = "evaluation_runs"

    id = Column(String(64), primary_key=True, index=True)
    model_version = Column(String(64), nullable=False)
    category = Column(String(64), nullable=False, default="metal_nut")
    dataset_name = Column(String(128), nullable=False, default="MVTec AD")
    timestamp = Column(DateTime, default=utc_now, nullable=False)
    image_auroc = Column(Float, nullable=False)
    pixel_auroc = Column(Float, nullable=False)
    pixel_precision = Column(Float, nullable=False)
    pixel_recall = Column(Float, nullable=False)
    f1_score = Column(Float, nullable=False)
    optimal_threshold = Column(Float, nullable=False)
    test_set_size_total = Column(Integer, nullable=False)
    test_set_size_normal = Column(Integer, nullable=False)
    test_set_size_anomalous = Column(Integer, nullable=False)
    defect_breakdown_json = Column(Text, nullable=False)
    status = Column(String(32), nullable=False, default="completed")  # 'completed', 'failed', 'in_progress'
    config_json = Column(Text, nullable=True)
