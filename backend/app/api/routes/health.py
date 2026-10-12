import time
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.app.core.config import settings
from backend.app.db.session import get_db
from backend.app.schemas.inspection import BackendHealth
from backend.app.ml.model_loader import model_manager

router = APIRouter(tags=["Health"])
START_TIME = time.time()

@router.get("/health", response_model=BackendHealth)
def get_health(db: Session = Depends(get_db)):
    """
    Returns application health, database connectivity, and model status.
    Model readiness is reported truthfully: an unavailable model is not represented as ready.
    """
    db_connected = False
    db_error = None
    try:
        db.execute(text("SELECT 1"))
        db_connected = True
    except Exception as e:
        db_error = str(e)

    model_info = model_manager.get_model_info()

    status = "online" if db_connected else "error"
    error_msg = db_error if not db_connected else None

    return BackendHealth(
        status=status,
        version=settings.VERSION,
        modelLoaded=model_info.isOperational,
        modelName=model_info.name,
        modelVersion=model_info.version,
        supportedCategory=model_info.targetCategory,
        supportedCategories=settings.SUPPORTED_CATEGORIES,
        uptimeSeconds=round(time.time() - START_TIME, 1),
        lastChecked=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        error=error_msg,
    )
