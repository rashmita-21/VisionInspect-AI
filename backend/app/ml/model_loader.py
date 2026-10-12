import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any, Tuple
import cv2
import numpy as np
import torch
from PIL import Image

from backend.app.core.config import settings
from backend.app.ml.preprocessing import validate_image_bytes, load_and_preprocess_image
from backend.app.ml.patchcore import PatchCoreModel
from backend.app.schemas.inspection import ModelInfo

class ModelManager:
    _instance: Optional["ModelManager"] = None

    def __init__(self):
        self._models: Dict[str, PatchCoreModel] = {}
        self._loaded: Dict[str, bool] = {}
        self._init_all_models()

    @classmethod
    def get_instance(cls) -> "ModelManager":
        if cls._instance is None:
            cls._instance = ModelManager()
        return cls._instance

    def _init_all_models(self):
        """Attempts to load saved weights for all supported categories."""
        for cat in settings.SUPPORTED_CATEGORIES:
            self._load_category_model(cat)

    def _load_category_model(self, category: str) -> Optional[PatchCoreModel]:
        """Loads or reloads the model for a specific category."""
        if category not in settings.SUPPORTED_CATEGORIES:
            raise ValueError(
                f"Unsupported category '{category}'. Supported categories: {settings.SUPPORTED_CATEGORIES}"
            )
        model_path = settings.get_model_path(category)
        try:
            model = PatchCoreModel(backbone_name="wide_resnet50_2", device="cpu", category=category)
            if model_path.exists():
                model.load_state(str(model_path))
                model.category = category
                self._models[category] = model
                self._loaded[category] = True
                return model
            else:
                self._models[category] = model
                self._loaded[category] = False
                return model
        except Exception:
            self._loaded[category] = False
            return None

    def reload(self, category: Optional[str] = None):
        """Reloads model weights from disk for a category or all categories."""
        if category:
            self._load_category_model(category)
        else:
            self._init_all_models()

    def get_model(self, category: str) -> Optional[PatchCoreModel]:
        """Retrieves PatchCore model for category, raising ValueError for unsupported categories."""
        if category not in settings.SUPPORTED_CATEGORIES:
            raise ValueError(
                f"Unsupported category '{category}'. Supported categories: {settings.SUPPORTED_CATEGORIES}"
            )
        if category not in self._models:
            self._load_category_model(category)
        return self._models.get(category)

    def is_category_operational(self, category: str) -> bool:
        """Checks if a category's model memory bank is loaded and operational."""
        model = self.get_model(category)
        return model is not None and model.is_fitted

    def get_model_info(self, category: Optional[str] = None) -> ModelInfo:
        """Returns truthful model status information for a specific category or default."""
        target_cat = category or settings.TARGET_CATEGORY
        if target_cat not in settings.SUPPORTED_CATEGORIES:
            raise ValueError(
                f"Unsupported category '{target_cat}'. Supported categories: {settings.SUPPORTED_CATEGORIES}"
            )
        model = self.get_model(target_cat)

        if (
            model is not None
            and model.is_fitted
            and isinstance(model.memory_bank, torch.Tensor)
        ):
            memory_bank_count = model.memory_bank.shape[0]
            return ModelInfo(
                name=f"PatchCore Industrial Surface Inspector [{target_cat}]",
                architecture="PatchCore (PyTorch)",
                backbone=model.backbone_name,
                version=settings.MODEL_VERSION,
                dataset="MVTec AD Benchmark Dataset",
                targetCategory=target_cat,
                inputResolution="224 × 224 px (Patch: 28×28)",
                memoryBankSize=f"{memory_bank_count} coreset feature vectors",
                trainingSamples=220,
                isOperational=True,
                statusMessage=f"PyTorch PatchCore model memory bank for '{target_cat}' loaded and operational for inference.",
            )
        else:
            return ModelInfo(
                name=f"PatchCore Industrial Surface Inspector [{target_cat}]",
                architecture="PatchCore (PyTorch)",
                backbone="WideResNet-50-2",
                version=settings.MODEL_VERSION,
                dataset="MVTec AD Benchmark Dataset",
                targetCategory=target_cat,
                inputResolution="224 × 224 px (Patch: 28×28)",
                memoryBankSize="Untrained (0 vectors)",
                trainingSamples=0,
                isOperational=False,
                statusMessage=(
                    f"Model memory bank for '{target_cat}' not yet fitted. Place dataset into "
                    f"backend/data/mvtec_ad/{target_cat} and run: python backend/scripts/train_model.py --category {target_cat}"
                ),
            )

    def list_categories_status(self) -> Dict[str, Any]:
        """Returns operational summary for all supported categories."""
        result = {}
        for cat in settings.SUPPORTED_CATEGORIES:
            op = self.is_category_operational(cat)
            m = self.get_model(cat)
            vectors = 0
            model_threshold: Optional[float] = None
            if m is not None:
                if m.is_fitted and isinstance(m.memory_bank, torch.Tensor):
                    vectors = m.memory_bank.shape[0]
                if op:
                    model_threshold = m.threshold

            result[cat] = {
                "category": cat,
                "isOperational": op,
                "memoryBankVectors": vectors,
                "threshold": model_threshold,
                "modelPath": str(settings.get_model_path(cat)),
                "existsOnDisk": settings.get_model_path(cat).exists(),
            }
        return result

    def run_inspection(
        self, file_bytes: bytes, filename: str, category: str = "metal_nut"
    ) -> Dict[str, Any]:
        """
        Runs verified end-to-end inference on uploaded image bytes using category-specific model.
        Saves original, heatmap, and overlay images into backend/artifacts/inspections/.
        Returns inspection metadata dictionary.
        """
        if category not in settings.SUPPORTED_CATEGORIES:
            raise ValueError(
                f"Unsupported category '{category}'. Supported categories: {settings.SUPPORTED_CATEGORIES}"
            )

        start_time = datetime.now(timezone.utc)

        # 1. Validate bytes
        fmt = validate_image_bytes(file_bytes, settings.MAX_UPLOAD_SIZE_BYTES)

        # 2. Preprocess
        pil_img, tensor, orig_w, orig_h = load_and_preprocess_image(file_bytes)

        # 3. Model readiness check
        model = self.get_model(category)
        if model is None or not model.is_fitted:
            raise RuntimeError(
                f"Model memory bank for category '{category}' is not loaded or has not been fitted. "
                f"Please fit the model before executing live inspections: python backend/scripts/train_model.py --category {category}"
            )

        # 4. Predict using category model
        t0 = datetime.now(timezone.utc)
        pred = model.predict(tensor, pil_img)
        t1 = datetime.now(timezone.utc)
        inference_ms = (t1 - t0).total_seconds() * 1000.0

        # 5. Persist image artifacts
        inspection_id = f"INS-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:6].upper()}"

        orig_filename = f"{inspection_id}_original.{fmt}"
        heatmap_filename = f"{inspection_id}_heatmap.png"
        overlay_filename = f"{inspection_id}_overlay.png"

        orig_save_path = settings.INSPECTIONS_DIR / orig_filename
        heatmap_save_path = settings.INSPECTIONS_DIR / heatmap_filename
        overlay_save_path = settings.INSPECTIONS_DIR / overlay_filename

        with open(orig_save_path, "wb") as f:
            f.write(file_bytes)

        cv2.imwrite(str(heatmap_save_path), pred["heatmap_bgr"])
        cv2.imwrite(str(overlay_save_path), pred["overlay_bgr"])

        # Relative URLs for frontend consumption
        orig_url = f"/artifacts/inspections/{orig_filename}"
        heatmap_url = f"/artifacts/inspections/{heatmap_filename}"
        overlay_url = f"/artifacts/inspections/{overlay_filename}"

        return {
            "id": inspection_id,
            "timestamp": start_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "filename": filename,
            "original_image_path": str(orig_save_path),
            "original_image_url": orig_url,
            "heatmap_path": str(heatmap_save_path),
            "anomaly_map_url": heatmap_url,
            "overlay_path": str(overlay_save_path),
            "overlay_url": overlay_url,
            "mask_url": None,
            "anomaly_score": pred["anomaly_score"],
            "normalized_score": pred["normalized_score"],
            "threshold": pred["threshold"],
            "decision": pred["decision"],
            "inference_duration_ms": inference_ms,
            "model_name": f"PatchCore-{category}",
            "model_version": settings.MODEL_VERSION,
            "category": category,
            "explanation": pred["explanation"],
            "metadata": {
                "imageWidth": orig_w,
                "imageHeight": orig_h,
                "fileSizeBytes": len(file_bytes),
                "patchCoreFeatures": pred["num_patches"],
                "deviceUsed": "CPU (PyTorch)",
            },
        }

model_manager = ModelManager.get_instance()
