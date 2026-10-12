import os
import sys
import tarfile
import zipfile
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BACKEND_DIR / "data"
TARGET_DIR = DATA_DIR / "mvtec_ad" / "metal_nut"

OFFICIAL_URL = "https://www.mvtec.com/research-teaching/datasets/mvtec-ad"
LICENSE_INFO = "Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)"

def check_existing_dataset() -> bool:
    if TARGET_DIR.exists():
        train_good = TARGET_DIR / "train" / "good"
        if train_good.exists() and any(train_good.iterdir()):
            print(f"[FOUND] Existing dataset detected at: {TARGET_DIR}")
            return True
    return False

def find_candidate_archives():
    candidates = []
    search_dirs = [DATA_DIR, DATA_DIR.parent, Path.home() / "Downloads"]
    for d in search_dirs:
        if d.exists():
            for f in d.glob("*metal_nut*"):
                if f.is_file() and f.suffix.lower() in [".xz", ".tar", ".gz", ".zip"]:
                    candidates.append(f)
    return candidates

def extract_archive(archive_path: Path) -> bool:
    print(f"[EXTRACTING] Extracting dataset archive: {archive_path} -> {TARGET_DIR.parent}")
    TARGET_DIR.parent.mkdir(parents=True, exist_ok=True)
    try:
        if archive_path.name.endswith(".zip"):
            with zipfile.ZipFile(archive_path, "r") as zf:
                zf.extractall(TARGET_DIR.parent)
        elif ".tar" in archive_path.name or archive_path.name.endswith(".xz"):
            with tarfile.open(archive_path, "r:*") as tf:
                tf.extractall(TARGET_DIR.parent)
        print(f"[SUCCESS] Dataset successfully extracted to {TARGET_DIR}")
        return True
    except Exception as e:
        print(f"[ERROR] Extraction failed: {e}")
        return False

def main():
    print("=" * 70)
    print("VisionInspect AI — MVTec AD Dataset Acquisition & Setup Helper")
    print("=" * 70)
    print(f"Target category: metal_nut")
    print(f"Intended path  : {TARGET_DIR}")
    print(f"License terms  : {LICENSE_INFO}")
    print("-" * 70)

    if check_existing_dataset():
        print("Dataset is already present and populated. Run prepare_dataset.py to validate.")
        return 0

    print("[SEARCHING] Scanning for downloaded archive files...")
    archives = find_candidate_archives()
    if archives:
        print(f"Found candidate archive: {archives[0]}")
        if extract_archive(archives[0]):
            return 0

    print("\n[DOWNLOAD REQUIRED]")
    print("MVTec AD is protected under CC BY-NC-SA 4.0 license and requires user registration.")
    print("Automated unauthenticated HTTP scraping is restricted by the official portal.\n")
    print("Official Acquisition Steps:")
    print(f"1. Navigate to: {OFFICIAL_URL}")
    print("2. Scroll to 'Download dataset' and submit the short form (Name, Email, Organization).")
    print("3. Download 'metal_nut.tar.xz' from the provided official link.")
    print(f"4. Place 'metal_nut.tar.xz' into: {DATA_DIR}")
    print("5. Re-run this script: python backend/scripts/download_dataset.py\n")
    print("Once placed, the backend will automatically extract and validate all images.")
    print("=" * 70)
    return 1

if __name__ == "__main__":
    sys.exit(main())
