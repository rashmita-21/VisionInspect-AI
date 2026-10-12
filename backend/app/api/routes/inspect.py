import json
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, status
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.db.session import get_db
from backend.app.db.models import Inspection
from backend.app.schemas.inspection import InspectionResult, InspectionMetadata
from backend.app.ml.model_loader import model_manager
from backend.app.ml.preprocessing import validate_image_bytes

router = APIRouter(tags=["Inspection"])

@router.post("/inspect", response_model=InspectionResult)
async def inspect_image(
    file: UploadFile = File(...),
    category: str = Form("metal_nut"),
    db: Session = Depends(get_db),
):
    """
    Accepts an uploaded image as multipart form data and a target category.
    Validates the upload, enforces category support, runs genuine PatchCore inference,
    persists results and image artifacts, and returns inspection outcome.
    """
    # 1. Validate category support
    if category not in settings.SUPPORTED_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unsupported category '{category}'. "
                f"Supported categories are: {', '.join(settings.SUPPORTED_CATEGORIES)}"
            ),
        )

    # 2. Read file bytes
    try:
        file_bytes = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded file: {str(e)}",
        )

    # 3. Basic validation
    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes).",
        )

    if len(file_bytes) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size limit of {settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)} MB.",
        )

    # 4. Content-based validation
    try:
        validate_image_bytes(file_bytes, settings.MAX_UPLOAD_SIZE_BYTES)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )

    # 5. Check model operational readiness for the requested category
    if not model_manager.is_category_operational(category):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                f"PatchCore inference model for '{category}' is not ready. The memory bank has not been fitted yet. "
                f"Please run 'python backend/scripts/train_model.py --category {category}' once the MVTec AD dataset is available."
            ),
        )

    # 6. Run category-specific inference
    try:
        result = model_manager.run_inspection(
            file_bytes, file.filename or "uploaded_specimen.png", category=category
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference pipeline execution error: {str(exc)}",
        )

    # 6. Persist to SQLite
    db_inspection = Inspection(
        id=result["id"],
        timestamp=datetime.fromisoformat(result["timestamp"].replace("Z", "")),
        filename=result["filename"],
        original_image_path=result["original_image_path"],
        anomaly_map_path=result["heatmap_path"],
        mask_path=None,
        overlay_path=result["overlay_path"],
        anomaly_score=result["anomaly_score"],
        normalized_score=result["normalized_score"],
        threshold=result["threshold"],
        decision=result["decision"],
        inference_duration_ms=result["inference_duration_ms"],
        model_name=result["model_name"],
        model_version=result["model_version"],
        category=result["category"],
        explanation=result["explanation"],
        is_demo=False,
        meta_json=json.dumps(result.get("metadata", {})),
    )
    db.add(db_inspection)
    db.commit()
    db.refresh(db_inspection)

    meta = result.get("metadata")
    metadata_obj = InspectionMetadata(**meta) if meta else None

    return InspectionResult(
        id=result["id"],
        timestamp=result["timestamp"],
        filename=result["filename"],
        originalImageUrl=result["original_image_url"],
        anomalyMapUrl=result["anomaly_map_url"],
        maskUrl=None,
        overlayUrl=result["overlay_url"],
        anomalyScore=result["anomaly_score"],
        normalizedScore=result["normalized_score"],
        threshold=result["threshold"],
        decision=result["decision"],
        inferenceDurationMs=result["inference_duration_ms"],
        modelName=result["model_name"],
        modelVersion=result["model_version"],
        category=result["category"],
        explanation=result["explanation"],
        isDemo=False,
        metadata=metadata_obj,
    )
