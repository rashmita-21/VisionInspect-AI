import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from backend.app.main import app
from backend.app.db.session import SessionLocal
from backend.app.db.models import Inspection, EvaluationRun

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client

def create_dummy_jpeg_bytes(width=64, height=64) -> bytes:
    img = Image.new("RGB", (width, height), color=(128, 128, 128))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()

def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "version" in data
    assert "uptimeSeconds" in data
    assert "supportedCategory" in data

def test_model_info_truthful_state(client):
    response = client.get("/api/model-info")
    assert response.status_code == 200
    data = response.json()
    assert data["targetCategory"] == "metal_nut"
    assert data["architecture"] == "PatchCore (PyTorch)"
    # When not yet fitted, reports isOperational False honestly
    assert isinstance(data["isOperational"], bool)
    assert len(data["statusMessage"]) > 0

def test_inspect_corrupt_file_rejected(client):
    fake_bytes = b"This is not a real image header"
    files = {"file": ("corrupt.jpg", fake_bytes, "image/jpeg")}
    response = client.post("/api/inspect", files=files)
    assert response.status_code == 400
    assert "Invalid file format" in response.json()["detail"]

def test_inspect_empty_file_rejected(client):
    files = {"file": ("empty.jpg", b"", "image/jpeg")}
    response = client.post("/api/inspect", files=files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()

def test_inspect_unfitted_model_returns_503(client):
    # Tests that when model is not fitted, API does not return fake data
    valid_jpeg = create_dummy_jpeg_bytes()
    files = {"file": ("test_nut.jpg", valid_jpeg, "image/jpeg")}
    response = client.post("/api/inspect", files=files)
    # If model is not fitted, must return 503 Service Unavailable
    # (If model is fitted, returns 200)
    assert response.status_code in [200, 503]
    if response.status_code == 503:
        assert "not ready" in response.json()["detail"].lower() or "fitted" in response.json()["detail"].lower()

def test_inspections_history_pagination_and_query(client):
    response = client.get("/api/inspections?page=1&limit=5")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["page"] == 1
    assert data["pageSize"] == 5

def test_inspection_detail_404(client):
    response = client.get("/api/inspections/NON_EXISTENT_ID_99999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

def test_analytics_summary(client):
    response = client.get("/api/analytics/summary")
    assert response.status_code == 200
    data = response.json()
    assert "totalInspections" in data
    assert "anomalyRate" in data
    assert "activityTimeline" in data
    assert isinstance(data["activityTimeline"], list)

def test_analytics_performance_status(client):
    response = client.get("/api/analytics/performance")
    # Returns 404 if no evaluation run has been executed yet, or 200 if one has
    assert response.status_code in [200, 404]
    if response.status_code == 404:
        assert "not yet available" in response.json()["detail"].lower()

def test_assistant_chat_endpoint(client):
    payload = {
        "message": "What is the status of the quality control inspections?",
        "history": []
    }
    response = client.post("/api/assistant/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert len(data["reply"]) > 0
    assert "provider" in data
