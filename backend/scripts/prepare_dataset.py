import os
import sys
import json
import argparse
from pathlib import Path
from PIL import Image

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR.parent))

from backend.app.core.config import settings

# Expected defect classes per category in MVTec AD
CATEGORY_DEFECT_CLASSES = {
    "metal_nut": ["bent", "color", "flip", "scratch"],
    "bottle": ["broken_large", "broken_small", "contamination"],
    "cable": [
        "bent_wire",
        "cable_swap",
        "combined",
        "cut_inner_insulation",
        "cut_outer_insulation",
        "missing_cable",
        "missing_wire",
        "poke_insulation",
    ],
    "transistor": ["bent_lead", "cut_lead", "damaged_case", "misplaced"],
    "screw": [
        "manipulated_front",
        "scratch_head",
        "scratch_neck",
        "thread_side",
        "thread_top",
    ],
}

def validate_category_dataset(category: str, base_dir: Path) -> dict:
    dataset_dir = base_dir / category
    if (dataset_dir / category).is_dir():
        dataset_dir = dataset_dir / category
    report = {
        "category": category,
        "dataset_path": str(dataset_dir),
        "exists": dataset_dir.exists(),
        "valid": False,
        "train_good_count": 0,
        "test_counts": {},
        "ground_truth_counts": {},
        "missing_masks": [],
        "corrupted_images": [],
        "errors": [],
    }

    if not dataset_dir.exists():
        report["errors"].append(f"Category directory '{dataset_dir}' does not exist.")
        return report

    train_good_dir = dataset_dir / "train" / "good"
    if not train_good_dir.exists():
        report["errors"].append(f"Missing required training directory: {train_good_dir}")
    else:
        train_files = list(train_good_dir.glob("*.png")) + list(train_good_dir.glob("*.jpg"))
        report["train_good_count"] = len(train_files)
        for tf in train_files:
            try:
                with Image.open(tf) as img:
                    img.verify()
            except Exception as e:
                report["corrupted_images"].append(str(tf))

    test_dir = dataset_dir / "test"
    gt_dir = dataset_dir / "ground_truth"

    if test_dir.exists():
        for sub in sorted(test_dir.iterdir()):
            if sub.is_dir():
                test_imgs = list(sub.glob("*.png")) + list(sub.glob("*.jpg"))
                report["test_counts"][sub.name] = len(test_imgs)

                # If it's a defect category, verify ground truth masks
                if sub.name != "good":
                    gt_sub = gt_dir / sub.name
                    if not gt_sub.exists():
                        report["errors"].append(f"Missing ground_truth/{sub.name}/ directory.")
                    else:
                        gt_masks = list(gt_sub.glob("*.png"))
                        report["ground_truth_counts"][sub.name] = len(gt_masks)
                        for t_img in test_imgs:
                            stem = t_img.stem
                            expected_mask = gt_sub / f"{stem}_mask.png"
                            if not expected_mask.exists():
                                report["missing_masks"].append(str(expected_mask))

    # Overall validity check
    is_valid = (
        report["train_good_count"] > 0
        and len(report["errors"]) == 0
        and len(report["corrupted_images"]) == 0
        and len(report["missing_masks"]) == 0
    )
    report["valid"] = is_valid
    return report

def main():
    parser = argparse.ArgumentParser(description="MVTec AD Multi-Category Dataset Auditor")
    parser.add_argument(
        "--category",
        type=str,
        default="metal_nut",
        choices=settings.SUPPORTED_CATEGORIES,
        help="Target MVTec AD category to audit",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Audit all supported MVTec AD categories",
    )
    parser.add_argument(
        "--base-dir",
        type=Path,
        default=settings.DATA_DIR / "mvtec_ad",
        help="Base directory containing category folders",
    )
    args = parser.parse_args()

    print("=" * 70)
    print("VisionInspect AI — Multi-Category Dataset Structural Validation Auditor")
    print("=" * 70)

    categories_to_check = settings.SUPPORTED_CATEGORIES if args.all else [args.category]
    all_passed = True

    for cat in categories_to_check:
        print(f"\nAuditing category: [{cat}]")
        rep = validate_category_dataset(cat, args.base_dir)
        print(json.dumps(rep, indent=2))
        if rep["valid"]:
            print(f"-> [{cat}]: PASSED (Train: {rep['train_good_count']} nominal samples)")
        else:
            print(f"-> [{cat}]: FAILED / INCOMPLETE (Errors: {len(rep['errors'])})")
            all_passed = False

    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
