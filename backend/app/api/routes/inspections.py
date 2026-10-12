import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from backend.app.core.config import settings
from backend.app.db.session import get_db
from backend.app.db.models import Inspection
from backend.app.schemas.inspection import InspectionResult, PaginatedInspections, InspectionMetadata

router = APIRouter(tags=["Inspections"])

def to_inspection_result(item: Inspection) -> InspectionResult:
    # Build clean relative URLs for image artifacts
    orig_url = (
        item.original_image_path
        if item.original_image_path.startswith("/") or item.original_image_path.startswith("http")
        else f"/artifacts/inspections/{item.original_image_path.split('/')[-1].split(chr(92))[-1]}"
    )
    heatmap_url = None
    if item.anomaly_map_path:
        heatmap_url = (
            item.anomaly_map_path
            if item.anomaly_map_path.startswith("/") or item.anomaly_map_path.startswith("http")
            else f"/artifacts/inspections/{item.anomaly_map_path.split('/')[-1].split(chr(92))[-1]}"
        )
    overlay_url = None
    if item.overlay_path:
        overlay_url = (
            item.overlay_path
            if item.overlay_path.startswith("/") or item.overlay_path.startswith("http")
            else f"/artifacts/inspections/{item.overlay_path.split('/')[-1].split(chr(92))[-1]}"
        )

    metadata_obj = None
    if item.meta_json:
        try:
            m = json.loads(item.meta_json)
            metadata_obj = InspectionMetadata(**m)
        except Exception:
            pass

    return InspectionResult(
        id=item.id,
        timestamp=item.timestamp.isoformat() + "Z",
        filename=item.filename,
        originalImageUrl=orig_url,
        anomalyMapUrl=heatmap_url,
        maskUrl=item.mask_path,
        overlayUrl=overlay_url,
        anomalyScore=item.anomaly_score,
        normalizedScore=item.normalized_score,
        threshold=item.threshold,
        decision=item.decision,  # type: ignore
        inferenceDurationMs=item.inference_duration_ms,
        modelName=item.model_name,
        modelVersion=item.model_version,
        category=item.category,
        explanation=item.explanation,
        notes=item.notes,
        isDemo=item.is_demo,
        metadata=metadata_obj,
    )

@router.get("/inspections", response_model=PaginatedInspections)
def get_inspections(
    search: Optional[str] = Query(None, description="Search query matching ID or filename"),
    decision: Optional[str] = Query(None, description="Decision filter: NORMAL, ANOMALY_DETECTED, REVIEW_REQUIRED"),
    category: Optional[str] = Query(None, description="Category filter (metal_nut, bottle, cable, transistor, screw)"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Returns paginated list of persisted inspection records with optional search, decision, and category filters.
    """
    query = db.query(Inspection)

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                Inspection.id.ilike(term),
                Inspection.filename.ilike(term),
            )
        )

    if decision and decision.upper() != "ALL":
        query = query.filter(Inspection.decision == decision.upper())

    if category and category.lower() != "all" and category.lower() not in settings.SUPPORTED_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported category '{category}'. Supported categories: {settings.SUPPORTED_CATEGORIES}",
        )

    if category and category.lower() != "all":
        query = query.filter(Inspection.category == category.lower())

    total = query.count()
    items = query.order_by(desc(Inspection.timestamp)).offset((page - 1) * limit).limit(limit).all()

    return PaginatedInspections(
        items=[to_inspection_result(i) for i in items],
        total=total,
        page=page,
        pageSize=limit,
    )

@router.get("/inspections/{inspection_id}", response_model=InspectionResult)
def get_inspection_by_id(inspection_id: str, db: Session = Depends(get_db)):
    """
    Retrieves a single inspection record by ID.
    """
    item = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection record '{inspection_id}' not found.",
        )

    return to_inspection_result(item)
