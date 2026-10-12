import io
from pathlib import Path
from typing import Tuple
from PIL import Image
import torch
import torchvision.transforms as T

# Guard against decompression bomb vulnerabilities
Image.MAX_IMAGE_PIXELS = 25_000_000

MAGIC_BYTES = {
    b"\xff\xd8\xff": "jpeg",
    b"\x89PNG\r\n\x1a\n": "png",
}

def validate_image_bytes(file_bytes: bytes, max_size_bytes: int = 15 * 1024 * 1024) -> str:
    """
    Validates byte header magic numbers and file size to prevent spoofing and DoS.
    Returns format string ('jpeg' or 'png').
    """
    if len(file_bytes) == 0:
        raise ValueError("Uploaded file is empty (0 bytes).")
    
    if len(file_bytes) > max_size_bytes:
        raise ValueError(
            f"File size exceeds maximum allowed limit of {max_size_bytes // (1024 * 1024)} MB."
        )

    # Magic byte check
    detected_format = None
    for magic, fmt in MAGIC_BYTES.items():
        if file_bytes.startswith(magic):
            detected_format = fmt
            break

    if not detected_format:
        raise ValueError("Invalid file format. Only legitimate JPEG and PNG images are accepted.")

    # Integrity check via Pillow
    try:
        with Image.open(io.BytesIO(file_bytes)) as img:
            img.verify()
    except Exception as exc:
        raise ValueError(f"Corrupted or malformed image data: {str(exc)}")

    return detected_format

def load_and_preprocess_image(
    file_bytes: bytes, target_size: Tuple[int, int] = (224, 224)
) -> Tuple[Image.Image, torch.Tensor, int, int]:
    """
    Loads verified image bytes, converts to RGB, and generates normalized PyTorch tensor.
    Returns (pil_image, tensor, original_width, original_height).
    """
    with Image.open(io.BytesIO(file_bytes)) as raw_img:
        pil_img = raw_img.convert("RGB")
        width, height = pil_img.size

    transform = T.Compose([
        T.Resize(target_size, interpolation=T.InterpolationMode.BILINEAR),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    tensor = transform(pil_img).unsqueeze(0)  # Shape: [1, 3, H, W]
    return pil_img, tensor, width, height
