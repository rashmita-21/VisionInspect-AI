from typing import Optional, Dict, Any
from fastapi import APIRouter, Query, HTTPException, status
from backend.app.core.config import settings
from backend.app.schemas.inspection import ModelInfo
from backend.app.ml.model_loader import model_manager

router = APIRouter(tags=["Model"])

@router.get("/model-info", response_model=ModelInfo)
def get_model_info(category: Optional[str] = Query(None)):
    """
    Returns actual model name, version, operational status, target category,
    expected input requirements, and memory bank size for a category or default.
    """
    if category is not None and category not in settings.SUPPORTED_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported category '{category}'. Supported categories: {settings.SUPPORTED_CATEGORIES}",
        )
    return model_manager.get_model_info(category=category)

@router.get("/categories")
def get_categories() -> Dict[str, Any]:
    """
    Returns operational and readiness summary for all supported categories.
    """
    return model_manager.list_categories_status()
