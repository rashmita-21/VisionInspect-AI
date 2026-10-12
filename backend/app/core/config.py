import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings

# Root directory of backend (where app/ resides)
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
PROJECT_ROOT = BACKEND_DIR.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "VisionInspect AI"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    # Paths
    BACKEND_DIR: Path = BACKEND_DIR
    DATA_DIR: Path = BACKEND_DIR / "data"
    ARTIFACTS_DIR: Path = BACKEND_DIR / "artifacts"
    INSPECTIONS_DIR: Path = BACKEND_DIR / "artifacts" / "inspections"
    MODELS_DIR: Path = BACKEND_DIR / "artifacts" / "models"
    EVALUATION_DIR: Path = BACKEND_DIR / "artifacts" / "evaluation"
    DATASET_DIR: Path = BACKEND_DIR / "data" / "mvtec_ad" / "metal_nut"

    # Database
    DATABASE_URL: str = f"sqlite:///{BACKEND_DIR / 'data' / 'visioninspect.db'}"

    # Security & Upload constraints
    MAX_UPLOAD_SIZE_BYTES: int = 15 * 1024 * 1024  # 15 MB
    ALLOWED_IMAGE_TYPES: List[str] = ["image/jpeg", "image/png", "image/jpg"]
    ALLOWED_EXTENSIONS: List[str] = [".jpg", ".jpeg", ".png"]

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    # Model Defaults & Multi-Category Support
    MODEL_NAME: str = "PatchCore-PyTorch"
    MODEL_VERSION: str = "v1.0.0"
    TARGET_CATEGORY: str = "metal_nut"
    SUPPORTED_CATEGORIES: List[str] = [
        "metal_nut",
        "bottle",
        "cable",
        "transistor",
        "screw",
    ]
    DEFAULT_DECISION_THRESHOLD: float = 0.50

    def get_dataset_dir(self, category: str) -> Path:
        base = self.DATA_DIR / "mvtec_ad" / category
        if (base / category).is_dir():
            return base / category
        return base

    def get_model_path(self, category: str) -> Path:
        return self.MODELS_DIR / f"patchcore_{category}.pt"

    def get_metrics_path(self, category: str) -> Path:
        return self.EVALUATION_DIR / f"latest_metrics_{category}.json"

    # LLM Assistant Configuration (keys held strictly on backend)
    LLM_PROVIDER: str = "gemini"  # "gemini", "openai", "none"
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    LLM_MODEL: str = "gemini-2.5-flash"

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

# Ensure required runtime directories exist
for path in [
    settings.DATA_DIR,
    settings.ARTIFACTS_DIR,
    settings.INSPECTIONS_DIR,
    settings.MODELS_DIR,
    settings.EVALUATION_DIR,
    settings.DATASET_DIR.parent,
]:
    path.mkdir(parents=True, exist_ok=True)
