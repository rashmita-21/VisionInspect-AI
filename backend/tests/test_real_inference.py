import pytest
from pathlib import Path
import torch
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.core.config import settings
from backend.app.ml.model_loader import model_manager
from backend.app.db.session import SessionLocal
from backend.app.db.models import Inspection

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client

def test_all_categories_have_trained_models():
    """Verify that all 5 categories have operational trained models."""
    for category in settings.SUPPORTED_CATEGORIES:
        model = model_manager.get_model(category)
        assert model is not None, f"Model for {category} could not be loaded"
        assert model.is_fitted is True, f"Model for {category} is not fitted"
        assert model.memory_bank is not None
        assert isinstance(model.memory_bank, torch.Tensor)
        assert model.memory_bank.shape[0] > 0
        assert model.threshold > 0.0

def test_real_inference_on_mvtec_specimen(client):
    """Test full inspect API pipeline on a real MVTec AD specimen image."""
    category = "metal_nut"
    cat_dir = settings.get_dataset_dir(category)
    test_img = next((cat_dir / "test").rglob("*.png"), None)
    assert test_img is not None, "No test image found in MVTec AD dataset"

    with open(test_img, "rb") as f:
        img_bytes = f.read()

    response = client.post(
        "/api/inspect",
        files={"file": (test_img.name, img_bytes, "image/png")},
        data={"category": category},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["category"] == category
    assert data["decision"] in ["NORMAL", "ANOMALY_DETECTED", "REVIEW_REQUIRED"]
    assert data["anomalyScore"] > 0.0
    assert data["threshold"] > 0.0
    assert data["anomalyMapUrl"] is not None
    assert data["overlayUrl"] is not None
    assert len(data["explanation"]) > 0

    inspection_id = data["id"]

    # Verify retrieval via inspections endpoint
    get_res = client.get(f"/api/inspections/{inspection_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == inspection_id

    # Verify assistant grounding on this inspection
    chat_payload = {
        "message": "Explain the anomaly score and decision for this inspection.",
        "inspectionId": inspection_id,
        "history": [],
    }
    chat_res = client.post("/api/assistant/chat", json=chat_payload)
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert chat_data["groundedInspectionId"] == inspection_id
    assert inspection_id in chat_data["reply"] or category in chat_data["reply"]
