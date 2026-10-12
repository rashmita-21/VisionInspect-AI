import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from backend.app.main import app
from backend.app.core.config import settings
from backend.app.ml.model_loader import model_manager

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client

def create_dummy_jpeg_bytes(width=64, height=64) -> bytes:
    img = Image.new("RGB", (width, height), color=(100, 150, 200))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()

def test_categories_endpoint(client):
    """Verify that /api/categories enumerates all 5 supported MVTec categories."""
    response = client.get("/api/categories")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 5
    expected = ["metal_nut", "bottle", "cable", "transistor", "screw"]
    for cat in expected:
        assert cat in data
        assert "isOperational" in data[cat]
        assert "memoryBankVectors" in data[cat]
        assert "modelPath" in data[cat]

def test_all_supported_categories_model_info(client):
    """Verify that each supported category can query /api/model-info independently."""
    for cat in settings.SUPPORTED_CATEGORIES:
        response = client.get(f"/api/model-info?category={cat}")
        assert response.status_code == 200
        data = response.json()
        assert data["targetCategory"] == cat
        assert data["architecture"] == "PatchCore (PyTorch)"
        assert isinstance(data["isOperational"], bool)

def test_unsupported_category_rejected_in_model_info(client):
    """Verify that unsupported category is rejected with HTTP 400 in model-info."""
    response = client.get("/api/model-info?category=unsupported_gear")
    assert response.status_code == 400
    assert "unsupported category" in response.json()["detail"].lower()

def test_unsupported_category_rejected_in_inspect(client):
    """Verify that unsupported category is rejected with HTTP 400 in inspect endpoint."""
    valid_jpeg = create_dummy_jpeg_bytes()
    files = {"file": ("test.jpg", valid_jpeg, "image/jpeg")}
    data = {"category": "invalid_pcb"}
    response = client.post("/api/inspect", files=files, data=data)
    assert response.status_code == 400
    assert "unsupported category" in response.json()["detail"].lower()

def test_supported_category_accepted_in_inspect(client):
    """Verify that supported category (bottle) is validated and handled correctly."""
    valid_jpeg = create_dummy_jpeg_bytes()
    files = {"file": ("bottle.jpg", valid_jpeg, "image/jpeg")}
    data = {"category": "bottle"}
    response = client.post("/api/inspect", files=files, data=data)
    # Either 200 if fitted, or 503 if not fitted yet (truthful)
    assert response.status_code in [200, 503]
    if response.status_code == 503:
        assert "bottle" in response.json()["detail"].lower() or "not ready" in response.json()["detail"].lower()

def test_unsupported_category_rejected_in_analytics(client):
    """Verify that unsupported category is rejected with HTTP 400 in analytics routes."""
    res_summary = client.get("/api/analytics/summary?category=non_existent_part")
    assert res_summary.status_code == 400
    assert "unsupported category" in res_summary.json()["detail"].lower()

    res_perf = client.get("/api/analytics/performance?category=non_existent_part")
    assert res_perf.status_code == 400
    assert "unsupported category" in res_perf.json()["detail"].lower()

def test_supported_category_analytics_summary_routing(client):
    """Verify that analytics summary accepts each supported category."""
    for cat in settings.SUPPORTED_CATEGORIES:
        response = client.get(f"/api/analytics/summary?category={cat}")
        assert response.status_code == 200
        data = response.json()
        assert "totalInspections" in data
        assert "anomalyRate" in data
        assert "activityTimeline" in data

def test_model_manager_category_isolation():
    """Verify that ModelManager loads distinct isolated models per category."""
    model_bottle = model_manager.get_model("bottle")
    model_screw = model_manager.get_model("screw")
    assert model_bottle is not None
    assert model_screw is not None
    assert model_bottle is not model_screw
    assert model_bottle.category == "bottle"
    assert model_screw.category == "screw"

def test_model_manager_rejects_invalid_category():
    """Verify that ModelManager raises ValueError for invalid category."""
    with pytest.raises(ValueError) as excinfo:
        model_manager.get_model("invalid_category_xyz")
    assert "unsupported category" in str(excinfo.value).lower()
