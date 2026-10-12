import json
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.core.config import settings
from backend.app.db.session import get_db
from backend.app.db.models import Inspection, EvaluationRun
from backend.app.schemas.inspection import (
    AnalyticsSummary,
    ActivityTimelineItem,
    EvaluationMetrics,
    DefectBreakdownItem,
    TestSetSize,
)

router = APIRouter(tags=["Analytics"])

@router.get("/analytics/summary", response_model=AnalyticsSummary)
def get_analytics_summary(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Computes real summary metrics and activity timeline from persisted inspection records,
    with optional category filtering.
    """
    if category and category.lower() != "all" and category.lower() not in settings.SUPPORTED_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported category '{category}'. Supported categories: {settings.SUPPORTED_CATEGORIES}",
        )

    query = db.query(Inspection)
    if category and category.lower() != "all":
        query = query.filter(Inspection.category == category.lower())

    total = query.count()
    if total == 0:
        return AnalyticsSummary(
            totalInspections=0,
            normalCount=0,
            anomalyCount=0,
            reviewRequiredCount=0,
            anomalyRate=0.0,
            avgInferenceDurationMs=0.0,
            activityTimeline=[],
        )

    normal_query = db.query(Inspection).filter(Inspection.decision == "NORMAL")
    anomaly_query = db.query(Inspection).filter(Inspection.decision == "ANOMALY_DETECTED")
    review_query = db.query(Inspection).filter(Inspection.decision == "REVIEW_REQUIRED")
    duration_query = db.query(func.avg(Inspection.inference_duration_ms))

    if category and category.lower() != "all":
        normal_query = normal_query.filter(Inspection.category == category.lower())
        anomaly_query = anomaly_query.filter(Inspection.category == category.lower())
        review_query = review_query.filter(Inspection.category == category.lower())
        duration_query = duration_query.filter(Inspection.category == category.lower())

    normal_count = normal_query.count()
    anomaly_count = anomaly_query.count()
    review_count = review_query.count()
    anomaly_rate = round((anomaly_count / total) * 100.0, 1)
    avg_duration = duration_query.scalar() or 0.0

    # Build 7-day timeline from real timestamps
    timeline = []
    now = datetime.now(timezone.utc)
    for i in range(6, -1, -1):
        day = now - timedelta(days=i)
        day_str = day.strftime("%m/%d")
        start_of_day = datetime(day.year, day.month, day.day, 0, 0, 0, tzinfo=timezone.utc)
        end_of_day = datetime(day.year, day.month, day.day, 23, 59, 59, tzinfo=timezone.utc)

        day_q = (
            db.query(Inspection)
            .filter(Inspection.timestamp >= start_of_day, Inspection.timestamp <= end_of_day)
        )
        day_anom_q = (
            db.query(Inspection)
            .filter(
                Inspection.timestamp >= start_of_day,
                Inspection.timestamp <= end_of_day,
                Inspection.decision == "ANOMALY_DETECTED",
            )
        )
        if category and category.lower() != "all":
            day_q = day_q.filter(Inspection.category == category.lower())
            day_anom_q = day_anom_q.filter(Inspection.category == category.lower())

        day_total = day_q.count()
        day_anomalies = day_anom_q.count()

        timeline.append(
            ActivityTimelineItem(
                date=day_str,
                inspections=day_total,
                anomalies=day_anomalies,
            )
        )

    return AnalyticsSummary(
        totalInspections=total,
        normalCount=normal_count,
        anomalyCount=anomaly_count,
        reviewRequiredCount=review_count,
        anomalyRate=anomaly_rate,
        avgInferenceDurationMs=round(float(avg_duration), 1),
        activityTimeline=timeline,
    )

@router.get("/analytics/performance", response_model=EvaluationMetrics)
def get_evaluation_metrics(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Returns actual saved model evaluation results on test split.
    Can be filtered by category (e.g. metal_nut, bottle, cable, etc.).
    """
    if category and category.lower() != "all" and category.lower() not in settings.SUPPORTED_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported category '{category}'. Supported categories: {settings.SUPPORTED_CATEGORIES}",
        )

    query = db.query(EvaluationRun)
    if category and category.lower() != "all":
        query = query.filter(EvaluationRun.category == category.lower())

    run = query.order_by(EvaluationRun.timestamp.desc()).first()
    if not run:
        cat_msg = f" for category '{category}'" if category else ""
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Evaluation metrics{cat_msg} are not yet available. "
                f"Run 'python backend/scripts/evaluate_model.py {f'--category {category}' if category else ''}' "
                "once dataset and model are prepared."
            ),
        )

    breakdown = []
    defect_raw = getattr(run, "defect_breakdown_json", None)
    if defect_raw:
        try:
            items = json.loads(str(defect_raw))
            breakdown = [DefectBreakdownItem(**item) for item in items]
        except Exception:
            pass

    evaluated_at_str = (
        run.timestamp.strftime("%Y-%m-%dT%H:%M:%SZ")
        if hasattr(run.timestamp, "strftime")
        else f"{run.timestamp}Z"
    )

    return EvaluationMetrics(
        evaluatedAt=evaluated_at_str,
        dataset=getattr(run, "dataset_name", ""),
        category=getattr(run, "category", ""),
        imageAuroc=getattr(run, "image_auroc", 0.0),
        pixelAuroc=getattr(run, "pixel_auroc", 0.0),
        pixelPrecision=getattr(run, "pixel_precision", 0.0),
        pixelRecall=getattr(run, "pixel_recall", 0.0),
        f1Score=getattr(run, "f1_score", 0.0),
        optimalThreshold=getattr(run, "optimal_threshold", 0.0),
        testSetSize=TestSetSize(
            total=getattr(run, "test_set_size_total", 0),
            normal=getattr(run, "test_set_size_normal", 0),
            anomalous=getattr(run, "test_set_size_anomalous", 0),
        ),
        defectBreakdown=breakdown,
        knownLimitations=[
            "Specular reflections on uncleaned surfaces can induce false-positive pixel anomalies.",
            "Model memory bank requires representative nominal training set covering camera angle tolerances.",
            "Pixel-level localization boundaries have ~4px uncertainty around sub-millimeter thread burrs.",
        ],
    )
