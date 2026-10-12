import os
import sys
import argparse
from datetime import datetime, timezone
from pathlib import Path
import torch
from PIL import Image

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR.parent))

from backend.app.core.config import settings
from backend.app.ml.preprocessing import load_and_preprocess_image
from backend.app.ml.patchcore import PatchCoreModel
from backend.app.db.session import SessionLocal, init_db
from backend.app.db.models import ModelRecord

def train_patchcore_category(
    category: str,
    base_dir: Path,
    backbone: str = "wide_resnet50_2",
    coreset_ratio: float = 0.10,
    device: str = "cpu",
) -> int:
    dataset_dir = base_dir / category
    if (dataset_dir / category).is_dir():
        dataset_dir = dataset_dir / category
    print("\n" + "=" * 70)
    print(f"VisionInspect AI — PatchCore Memory Bank Fitting Pipeline [{category}]")
    print("=" * 70)
    print(f"Category      : {category}")
    print(f"Dataset path  : {dataset_dir}")
    print(f"Backbone      : {backbone}")
    print(f"Device        : {device}")
    print(f"Coreset ratio : {coreset_ratio * 100:.1f}%\n")

    train_good_dir = dataset_dir / "train" / "good"
    if not train_good_dir.exists():
        print(f"[ERROR] Required training directory not found: {train_good_dir}")
        print(f"Please ensure the MVTec AD {category} dataset is extracted.")
        return 1

    img_paths = sorted(list(train_good_dir.glob("*.png")) + list(train_good_dir.glob("*.jpg")))
    if len(img_paths) == 0:
        print(f"[ERROR] No training images found in: {train_good_dir}")
        return 1

    print(f"[1/4] Found {len(img_paths)} nominal training images.")
    print("[2/4] Initializing feature extractor and extracting patch embeddings...")

    model = PatchCoreModel(backbone_name=backbone, device=device)

    all_patches = []
    for idx, p in enumerate(img_paths):
        with open(p, "rb") as f:
            file_bytes = f.read()
        pil_img, tensor, _, _ = load_and_preprocess_image(file_bytes)
        patches, _ = model.extract_patch_features(tensor)
        all_patches.append(patches.cpu())
        if (idx + 1) % 25 == 0 or idx == len(img_paths) - 1:
            print(f"  Processed {idx + 1}/{len(img_paths)} training images...")

    raw_memory_bank = torch.cat(all_patches, dim=0)
    total_patches, feat_dim = raw_memory_bank.shape
    print(f"\n[3/4] Extracted {total_patches} total patch embeddings ({feat_dim} dims).")
    print(f"      Applying greedy k-Center coreset subsampling ({coreset_ratio * 100:.1f}%)...")

    model.fit_memory_bank(raw_memory_bank, coreset_ratio=coreset_ratio)
    coreset_size = model.memory_bank.shape[0] if model.memory_bank is not None else 0
    print(f"      Coreset memory bank constructed with {coreset_size} representative vectors.")

    # [4/4] Threshold calibration
    print("\n[4/4] Calibrating decision threshold against nominal training samples...")
    sample_scores = []
    eval_sample = img_paths[: min(30, len(img_paths))]
    for p in eval_sample:
        with open(p, "rb") as f:
            b = f.read()
        pil_img, tensor, _, _ = load_and_preprocess_image(b)
        pred = model.predict(tensor, pil_img, threshold=1.0)
        sample_scores.append(pred["anomaly_score"])

    # Set threshold at 99th percentile margin
    nominal_max = max(sample_scores) if sample_scores else 0.40
    calibrated_threshold = round(max(nominal_max * 1.15, 0.45), 4)
    model.threshold = calibrated_threshold
    print(f"      Nominal score max    : {nominal_max:.4f}")
    print(f"      Calibrated threshold : {calibrated_threshold:.4f}")

    # Save model artifact
    save_path = settings.get_model_path(category)
    model.save_state(str(save_path))
    print(f"\n[SAVED] Model weights and memory bank saved to: {save_path}")

    # Update database record
    init_db()
    db = SessionLocal()
    try:
        record_id = f"model-{category}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        rec = ModelRecord(
            id=record_id,
            name=f"PatchCore-{category}",
            architecture="PatchCore (PyTorch)",
            backbone=backbone,
            version=settings.MODEL_VERSION,
            category=category,
            status="ready",
            artifact_path=str(save_path),
            config_json=str({
                "coreset_size": coreset_size,
                "total_training_images": len(img_paths),
                "threshold": calibrated_threshold,
            }),
        )
        db.add(rec)
        db.commit()
        print(f"[DB] Registered model record '{record_id}' in SQLite.")
    finally:
        db.close()

    print(f"\n[SUCCESS] PatchCore model for category '{category}' training complete.")
    return 0

def main():
    parser = argparse.ArgumentParser(description="Train PatchCore on MVTec AD Categories")
    parser.add_argument(
        "--category",
        type=str,
        default="metal_nut",
        choices=settings.SUPPORTED_CATEGORIES,
        help="Target MVTec AD category to train",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Train models for all supported MVTec AD categories",
    )
    parser.add_argument(
        "--base-dir",
        type=Path,
        default=settings.DATA_DIR / "mvtec_ad",
        help="Base directory containing category folders",
    )
    parser.add_argument("--backbone", type=str, default="wide_resnet50_2")
    parser.add_argument("--coreset-ratio", type=float, default=0.10)
    parser.add_argument("--device", type=str, default="cpu")
    args = parser.parse_args()

    categories_to_train = settings.SUPPORTED_CATEGORIES if args.all else [args.category]
    exit_codes = []

    for cat in categories_to_train:
        rc = train_patchcore_category(
            category=cat,
            base_dir=args.base_dir,
            backbone=args.backbone,
            coreset_ratio=args.coreset_ratio,
            device=args.device,
        )
        exit_codes.append(rc)

    return 0 if all(c == 0 for c in exit_codes) else 1

if __name__ == "__main__":
    sys.exit(main())
