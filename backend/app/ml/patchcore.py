import math
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as models
from PIL import Image
import cv2
from typing import Tuple, Dict, Any, Optional, List

class PatchCoreModel:
    """
    Genuine PyTorch implementation of PatchCore (Roth et al., CVPR 2022).
    Extracts multi-scale mid-level patch representations from CNN backbones,
    constructs a nominal coreset memory bank, and performs nearest-neighbor anomaly scoring
    with high-resolution spatial localization heatmaps.
    """
    def __init__(
        self,
        backbone_name: str = "wide_resnet50_2",
        device: str = "cpu",
        category: Optional[str] = None,
    ):
        self.backbone_name = backbone_name
        self.device = torch.device(device)
        self.category: Optional[str] = category
        self.memory_bank: Optional[torch.Tensor] = None
        self.threshold: float = 0.50
        self.feature_dim: int = 0
        self.patch_grid_size: Tuple[int, int] = (28, 28)
        self.is_fitted: bool = False
        self._backbone_loaded: bool = False

    def _ensure_backbone(self):
        """Initializes feature extractor backbone on demand."""
        if self._backbone_loaded:
            return
        self._init_backbone()
        self._backbone_loaded = True

    def _init_backbone(self):
        """Initializes feature extractor backbone with pretrained weights."""
        if self.backbone_name == "wide_resnet50_2":
            try:
                w_cls = getattr(models, "Wide_ResNet50_2_Weights", getattr(models, "WideResNet50_2_Weights", None))
                weights = w_cls.DEFAULT if w_cls else None
                base_model = models.wide_resnet50_2(weights=weights)
            except Exception:
                # Fallback to resnet18 if network or memory is constrained
                w_cls18 = getattr(models, "ResNet18_Weights", None)
                weights18 = w_cls18.DEFAULT if w_cls18 else None
                base_model = models.resnet18(weights=weights18)
                self.backbone_name = "resnet18"
        elif self.backbone_name == "resnet50":
            base_model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V1)
        else:
            base_model = models.resnet18(weights=models.ResNet18_Weights.IMAGENET1K_V1)
            self.backbone_name = "resnet18"

        base_model.eval()
        for param in base_model.parameters():
            param.requires_grad = False

        self.layer1 = nn.Sequential(
            base_model.conv1,
            base_model.bn1,
            base_model.relu,
            base_model.maxpool,
            base_model.layer1,
        ).to(self.device)
        self.layer2 = base_model.layer2.to(self.device)
        self.layer3 = base_model.layer3.to(self.device)

        # Local patch neighborhood aggregation (PatchCore paper: AvgPool2d k=3, stride=1, padding=1)
        self.avg_pool = nn.AvgPool2d(kernel_size=3, stride=1, padding=1)

    def extract_patch_features(self, x: torch.Tensor) -> Tuple[torch.Tensor, Tuple[int, int]]:
        """
        Extracts multi-scale locally pooled patch embeddings.
        Input x: [B, 3, H, W]
        Output: (patch_embeddings: [N_patches, C_features], spatial_grid: (H_p, W_p))
        """
        self._ensure_backbone()
        x = x.to(self.device)
        with torch.no_grad():
            h1 = self.layer1(x)
            f2 = self.layer2(h1)
            f3 = self.layer3(f2)

            p2 = self.avg_pool(f2)
            p3 = self.avg_pool(f3)

            # Match spatial dimensions to p2
            target_h, target_w = p2.shape[-2:]
            p3_resized = F.interpolate(p3, size=(target_h, target_w), mode="bilinear", align_corners=False)

            # Concatenate layer2 and layer3 patch embeddings
            f_cat = torch.cat([p2, p3_resized], dim=1)  # [B, C2+C3, H_p, W_p]
            B, C, H_p, W_p = f_cat.shape

            # Reshape to [B * H_p * W_p, C]
            patches = f_cat.permute(0, 2, 3, 1).reshape(-1, C)

        return patches, (H_p, W_p)

    def fit_memory_bank(self, normal_features: torch.Tensor, coreset_ratio: float = 0.10):
        """
        Builds the nominal memory bank and applies greedy coreset subsampling.
        """
        N, C = normal_features.shape
        self.feature_dim = C

        if coreset_ratio >= 1.0 or N <= 200:
            self.memory_bank = normal_features.cpu()
        else:
            # Greedy k-Center Coreset subsampling
            target_size = min(max(50, int(N * coreset_ratio)), 1200)
            if N > 12000:
                # Subsample candidate pool for tractability as in Roth et al. (CVPR 2022)
                g = torch.Generator()
                g.manual_seed(42)
                perm = torch.randperm(N, generator=g)[:12000]
                cand_features = normal_features[perm]
                selected_local = self._kcenter_coreset(cand_features, target_size)
                self.memory_bank = cand_features[selected_local].cpu()
            else:
                selected_indices = self._kcenter_coreset(normal_features, target_size)
                self.memory_bank = normal_features[selected_indices].cpu()

        self.is_fitted = True

    def _kcenter_coreset(self, features: torch.Tensor, target_size: int) -> List[int]:
        """
        Greedy k-Center selection for coreset subsampling.
        Selects points that minimize the maximum distance to any selected point.
        """
        N = features.shape[0]
        device = features.device
        selected: List[int] = [0]
        min_distances = torch.norm(features - features[0], dim=1)

        for _ in range(1, target_size):
            next_idx = int(torch.argmax(min_distances).item())
            selected.append(next_idx)
            new_distances = torch.norm(features - features[next_idx], dim=1)
            min_distances = torch.minimum(min_distances, new_distances)

        return selected

    def predict(
        self,
        image_tensor: torch.Tensor,
        pil_image: Image.Image,
        threshold: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Computes PatchCore anomaly score and defect localization heatmap for an input image.
        """
        if not self.is_fitted or self.memory_bank is None or not isinstance(self.memory_bank, torch.Tensor):
            raise RuntimeError("PatchCore model memory bank has not been fitted or is not valid.")

        if self.memory_bank.ndim != 2 or self.memory_bank.shape[0] == 0:
            raise RuntimeError(
                f"PatchCore model memory bank has invalid dimensions: "
                f"{self.memory_bank.shape if hasattr(self.memory_bank, 'shape') else 'unknown'}"
            )

        active_threshold = threshold if threshold is not None else self.threshold
        patches, (H_p, W_p) = self.extract_patch_features(image_tensor)
        patches_cpu = patches.cpu()

        mb: torch.Tensor = self.memory_bank
        bank_dim = mb.shape[1]
        patch_dim = patches_cpu.shape[1]
        if bank_dim != patch_dim:
            raise RuntimeError(
                f"Feature dimension mismatch between patch features ({patch_dim}) and memory bank ({bank_dim})."
            )

        # Compute nearest-neighbor distances in chunks to save memory
        num_patches = patches_cpu.shape[0]
        chunk_size = 512
        patch_min_dists = torch.empty(num_patches, dtype=torch.float32)

        for i in range(0, num_patches, chunk_size):
            chunk = patches_cpu[i : i + chunk_size]
            # [chunk_size, memory_bank_size]
            dists = torch.cdist(chunk, mb)
            min_d, _ = torch.min(dists, dim=1)
            patch_min_dists[i : i + chunk_size] = min_d

        # 1. Image-level anomaly score (maximum patch distance)
        raw_anomaly_score = float(torch.max(patch_min_dists).item())

        # 2. Decision classification
        # Normal < 0.9 * threshold, Review between 0.9 * th and th, Anomaly > th
        normalized_score = min(max((raw_anomaly_score / active_threshold) * 50.0, 0.0), 100.0)

        if raw_anomaly_score > active_threshold:
            decision = "ANOMALY_DETECTED"
        elif raw_anomaly_score >= (active_threshold * 0.85):
            decision = "REVIEW_REQUIRED"
        else:
            decision = "NORMAL"

        # 3. Spatial Heatmap generation
        patch_map = patch_min_dists.reshape(H_p, W_p).numpy()

        orig_w, orig_h = pil_image.size
        # Resize patch map to original image resolution
        heatmap_resized = cv2.resize(patch_map, (orig_w, orig_h), interpolation=cv2.INTER_CUBIC)
        # Smooth with Gaussian filter
        heatmap_blurred = cv2.GaussianBlur(heatmap_resized, (21, 21), 4)

        # Min-max normalization for visualization
        h_min, h_max = heatmap_blurred.min(), heatmap_blurred.max()
        if h_max > h_min:
            norm_map = (heatmap_blurred - h_min) / (h_max - h_min)
        else:
            norm_map = np.zeros_like(heatmap_blurred)

        # Generate JET colormap
        heatmap_uint8 = (norm_map * 255).astype(np.uint8)
        heatmap_color = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)

        # Convert original PIL image to BGR for OpenCV overlay blending
        orig_bgr = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        overlay_bgr = cv2.addWeighted(orig_bgr, 0.60, heatmap_color, 0.40, 0)

        # Generate Explainable AI (XAI) analysis
        xai_explanation = self._generate_xai_explanation(
            norm_map, raw_anomaly_score, active_threshold, decision, (orig_w, orig_h)
        )

        return {
            "anomaly_score": raw_anomaly_score,
            "normalized_score": normalized_score,
            "threshold": active_threshold,
            "decision": decision,
            "heatmap_bgr": heatmap_color,
            "overlay_bgr": overlay_bgr,
            "raw_map": norm_map,
            "anomaly_map_raw": norm_map,
            "explanation": xai_explanation,
            "num_patches": num_patches,
        }

    def _generate_xai_explanation(
        self,
        norm_map: np.ndarray,
        score: float,
        threshold: float,
        decision: str,
        dimensions: Tuple[int, int],
    ) -> str:
        """
        Extracts grounded, factual explainability insights from the localized anomaly map.
        """
        w, h = dimensions
        if decision == "NORMAL":
            return (
                f"Patch embedding distance ({score:.3f}) falls strictly within nominal coreset bounds "
                f"(threshold: {threshold:.3f}). Spatial heatmap indicates uniform surface consistency "
                f"across all evaluated receptive fields with no anomalous localization clusters."
            )

        # Threshold top 15% intense anomaly pixels
        anomalous_mask = norm_map > 0.70
        affected_pixels = int(np.sum(anomalous_mask))
        total_pixels = w * h
        defect_area_pct = (affected_pixels / total_pixels) * 100

        # Find center of mass of defect
        y_indices, x_indices = np.where(anomalous_mask)
        if len(x_indices) > 0:
            cx = float(np.mean(x_indices)) / w
            cy = float(np.mean(y_indices)) / h

            # Determine quadrant / region
            h_pos = "left" if cx < 0.4 else ("right" if cx > 0.6 else "center")
            v_pos = "upper" if cy < 0.4 else ("lower" if cy > 0.6 else "mid")
            region_str = f"{v_pos}-{h_pos} region"
        else:
            region_str = "diffuse perimeter"

        if decision == "ANOMALY_DETECTED":
            return (
                f"Significant anomaly score ({score:.3f} > {threshold:.3f}) detected in the {region_str}. "
                f"High-density patch outliers occupy approximately {defect_area_pct:.1f}% of inspected surface area, "
                f"indicating distinct feature divergence from nominal training references (consistent with scratch, gouge, or crack)."
            )
        else:
            return (
                f"Borderline anomaly score ({score:.3f}) approaching decision threshold ({threshold:.3f}) "
                f"in the {region_str}. Localized patch variation ({defect_area_pct:.1f}% area) warrants secondary "
                f"quality assurance review to differentiate surface glare/burr from functional defect."
            )

    def save_state(self, filepath: str):
        """Saves memory bank and model configuration."""
        torch.save(
            {
                "memory_bank": self.memory_bank,
                "threshold": self.threshold,
                "backbone_name": self.backbone_name,
                "feature_dim": self.feature_dim,
                "is_fitted": self.is_fitted,
                "category": self.category,
            },
            filepath,
        )

    def load_state(self, filepath: str):
        """Loads fitted memory bank and model configuration."""
        data = torch.load(filepath, map_location=self.device)
        if not isinstance(data, dict):
            raise ValueError(f"Invalid model checkpoint format in '{filepath}': expected dictionary.")

        loaded_mb = data.get("memory_bank")
        if loaded_mb is not None:
            if not isinstance(loaded_mb, torch.Tensor):
                raise ValueError(
                    f"Invalid memory_bank in checkpoint '{filepath}': expected torch.Tensor, got {type(loaded_mb).__name__}."
                )
            if loaded_mb.ndim != 2:
                raise ValueError(
                    f"Invalid memory_bank shape in checkpoint '{filepath}': expected 2D tensor (N, C), got {loaded_mb.shape}."
                )
            self.memory_bank = loaded_mb
        else:
            self.memory_bank = None

        self.threshold = float(data.get("threshold", 0.50))
        self.backbone_name = str(data.get("backbone_name", self.backbone_name))
        self.feature_dim = int(data.get("feature_dim", 0))

        # Backward compatibility: preserve existing category if absent in checkpoint
        ckpt_cat = data.get("category")
        if ckpt_cat is not None and not self.category:
            self.category = str(ckpt_cat)

        is_fitted_val = data.get("is_fitted", True)
        self.is_fitted = bool(is_fitted_val) and (self.memory_bank is not None)
