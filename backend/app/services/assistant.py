import os
import json
import logging
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.db.models import Inspection, EvaluationRun, ModelRecord
from backend.app.schemas.inspection import ChatMessage, ChatResponse
from backend.app.ml.model_loader import model_manager

logger = logging.getLogger(__name__)

class BaseLLMClient:
    def generate_response(self, system_instruction: str, user_message: str, history: Optional[List[ChatMessage]] = None) -> str:
        raise NotImplementedError

class GeminiClient(BaseLLMClient):
    def __init__(self, api_key: str, model_name: str = "gemini-2.5-flash"):
        self.api_key = api_key
        self.model_name = model_name

    def generate_response(self, system_instruction: str, user_message: str, history: Optional[List[ChatMessage]] = None) -> str:
        try:
            import httpx
            # Use direct Google Gemini REST API v1beta
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"
            
            contents = []
            if history:
                for h in history[-4:]:  # keep last 4 context turns
                    contents.append({
                        "role": "user" if h.role == "user" else "model",
                        "parts": [{"text": h.content}]
                    })
            contents.append({
                "role": "user",
                "parts": [{"text": user_message}]
            })

            payload = {
                "systemInstruction": {
                    "parts": [{"text": system_instruction}]
                },
                "contents": contents,
                "generationConfig": {
                    "temperature": 0.2,
                    "maxOutputTokens": 800,
                }
            }

            resp = httpx.post(url, json=payload, timeout=20.0)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        return parts[0].get("text", "No response generated.")
                return "The LLM assistant did not return content for this query."
            else:
                return f"Gemini API returned status {resp.status_code}: {resp.text}"
        except Exception as e:
            logger.error(f"Gemini API invocation failed: {e}")
            return f"Error contacting Gemini service: {str(e)}"

class OpenAIClient(BaseLLMClient):
    def __init__(self, api_key: str, model_name: str = "gpt-4o-mini"):
        self.api_key = api_key
        self.model_name = model_name

    def generate_response(self, system_instruction: str, user_message: str, history: Optional[List[ChatMessage]] = None) -> str:
        try:
            import httpx
            url = "https://api.openai.com/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
            messages = [{"role": "system", "content": system_instruction}]
            if history:
                for h in history[-4:]:
                    messages.append({"role": h.role, "content": h.content})
            messages.append({"role": "user", "content": user_message})

            resp = httpx.post(
                url,
                headers=headers,
                json={"model": self.model_name, "messages": messages, "temperature": 0.2, "max_tokens": 800},
                timeout=20.0,
            )
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"]
            return f"OpenAI API returned status {resp.status_code}: {resp.text}"
        except Exception as e:
            return f"Error contacting OpenAI service: {str(e)}"

class OfflineFallbackClient(BaseLLMClient):
    """
    Deterministic rule-grounded assistant when no LLM API key is configured.
    Provides verifiable, factual answers directly from SQLite records and model state.
    """
    def generate_response(self, system_instruction: str, user_message: str, history: Optional[List[ChatMessage]] = None) -> str:
        q = user_message.lower()
        context_data = {}
        if "SYSTEM CONTEXT:\n" in system_instruction:
            try:
                context_str = system_instruction.split("SYSTEM CONTEXT:\n", 1)[1]
                context_data = json.loads(context_str)
            except Exception:
                pass

        if "active_inspection" in context_data and any(w in q for w in ["explain", "result", "score", "inspection", "defect", "why", "detail"]):
            insp = context_data["active_inspection"]
            return (
                f"**Active Inspection Analysis ({insp.get('id', 'N/A')}):**\n\n"
                f"- **Category:** `{insp.get('category', 'metal_nut')}`\n"
                f"- **Decision:** **{insp.get('decision', 'N/A')}**\n"
                f"- **Anomaly Score:** `{insp.get('anomaly_score', 0):.4f}` (Decision Threshold: `{insp.get('threshold', 0):.4f}`)\n"
                f"- **Inference Duration:** `{insp.get('inference_duration_ms', 0):.1f} ms`\n"
                f"- **Finding:** {insp.get('explanation', 'No detailed explanation provided.')}\n\n"
                f"*Running in offline mode. Configure `GEMINI_API_KEY` in `.env` to enable multi-turn generative conversational analysis.*"
            )
        elif any(w in q for w in ["evaluation", "benchmark", "performance", "metric", "accuracy", "auroc", "precision", "recall"]):
            eval_info = context_data.get("latest_evaluation_run")
            if eval_info:
                return (
                    f"**Benchmark Evaluation Metrics (`{eval_info.get('category', 'all')}`):**\n\n"
                    f"- **Image AUROC:** `{eval_info.get('image_auroc', 0) * 100:.2f}%`\n"
                    f"- **Pixel AUROC:** `{eval_info.get('pixel_auroc', 0) * 100:.2f}%`\n"
                    f"- **F1 Score:** `{eval_info.get('f1_score', 0) * 100:.2f}%`\n"
                    f"- **Test Specimens:** `{eval_info.get('test_total', 0)}` total\n\n"
                    f"*Running in offline mode. Set `GEMINI_API_KEY` in `.env` for generative quality assistant conversational replies.*"
                )
            else:
                return (
                    "**Model Performance Context:**\n\n"
                    "The active architecture is PatchCore with WideResNet-50-2 backbone. "
                    "All 5 categories have been fitted and benchmarked on MVTec AD.\n\n"
                    "*Configure `GEMINI_API_KEY` in `.env` for generative quality assistant conversational replies.*"
                )
        else:
            total_db = context_data.get("qc_database_summary", {}).get("total_inspections_in_db", 0)
            return (
                f"**VisionInspect Quality Assistant Notice:**\n\n"
                f"The backend is currently operating with the deterministic rule-grounded assistant engine ({total_db} inspection records indexed). "
                f"To enable open-ended generative conversation, configure `GEMINI_API_KEY` (or `OPENAI_API_KEY`) in your backend `.env` file.\n\n"
                f"All PatchCore inference, multi-category models, visual heatmaps, and inspection persistence are active."
            )

class AssistantService:
    def __init__(self):
        self._init_client()

    def _init_client(self):
        if settings.GEMINI_API_KEY:
            self.client = GeminiClient(api_key=settings.GEMINI_API_KEY, model_name=settings.LLM_MODEL)
            self.provider = "gemini"
        elif settings.OPENAI_API_KEY:
            self.client = OpenAIClient(api_key=settings.OPENAI_API_KEY)
            self.provider = "openai"
        else:
            self.client = OfflineFallbackClient()
            self.provider = "offline-fallback"

    def chat(
        self,
        db: Session,
        message: str,
        inspection_id: Optional[str] = None,
        history: Optional[List[ChatMessage]] = None,
    ) -> ChatResponse:
        # Re-check key in case environment was updated
        self._init_client()

        # Build grounded context
        context_data: Dict[str, Any] = {
            "system_state": {
                "category": settings.TARGET_CATEGORY,
                "model_name": settings.MODEL_NAME,
                "model_version": settings.MODEL_VERSION,
                "default_threshold": settings.DEFAULT_DECISION_THRESHOLD,
            }
        }
        sources: List[str] = ["System Configuration"]

        # Gather target inspection context if provided
        target_inspection = None
        if inspection_id:
            target_inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
            if target_inspection:
                context_data["active_inspection"] = {
                    "id": target_inspection.id,
                    "filename": target_inspection.filename,
                    "category": target_inspection.category,
                    "timestamp": target_inspection.timestamp.isoformat(),
                    "anomaly_score": round(target_inspection.anomaly_score, 4),
                    "normalized_score": round(target_inspection.normalized_score, 1),
                    "threshold": round(target_inspection.threshold, 4),
                    "decision": target_inspection.decision,
                    "inference_duration_ms": round(target_inspection.inference_duration_ms, 1),
                    "explanation": target_inspection.explanation,
                }
                sources.append(f"Inspection Record: {target_inspection.id}")
            else:
                context_data["active_inspection_lookup"] = f"Inspection ID '{inspection_id}' not found in database."

        # Gather overall QC statistics from DB
        total_count = db.query(Inspection).count()
        anomaly_count = db.query(Inspection).filter(Inspection.decision == "ANOMALY_DETECTED").count()
        normal_count = db.query(Inspection).filter(Inspection.decision == "NORMAL").count()
        review_count = db.query(Inspection).filter(Inspection.decision == "REVIEW_REQUIRED").count()

        context_data["qc_database_summary"] = {
            "total_inspections_in_db": total_count,
            "anomalies_flagged": anomaly_count,
            "nominal_passed": normal_count,
            "review_required": review_count,
            "anomaly_rate_pct": round((anomaly_count / total_count * 100), 1) if total_count > 0 else 0.0,
        }
        sources.append("QC Database Summary")

        # Gather latest evaluation run if present
        eval_run = db.query(EvaluationRun).order_by(EvaluationRun.timestamp.desc()).first()
        if eval_run:
            context_data["latest_evaluation_run"] = {
                "category": eval_run.category,
                "evaluated_at": eval_run.timestamp.isoformat(),
                "image_auroc": eval_run.image_auroc,
                "pixel_auroc": eval_run.pixel_auroc,
                "f1_score": eval_run.f1_score,
                "test_total": eval_run.test_set_size_total,
            }
            sources.append(f"Model Evaluation Run ({eval_run.category})")

        system_instruction = (
            "You are the VisionInspect AI Quality Control Assistant, an expert industrial computer vision engineer. "
            "Your job is to provide accurate, grounded technical explanations about industrial surface inspections, "
            "PatchCore anomaly scores, visual heatmaps, and quality trends.\n\n"
            "STRICT RULES:\n"
            "1. Ground all numbers, scores, and decisions strictly in the provided JSON context.\n"
            "2. Never fabricate inspection results or hallucinate defect types not supported by evidence.\n"
            "3. Clearly distinguish anomaly detection (identifying statistical visual outliers) from definitive physical defect classification.\n"
            "4. Provide constructive, professional quality assurance recommendations.\n"
            "5. If requested data is missing from context, state honestly that records are unavailable.\n\n"
            f"SYSTEM CONTEXT:\n{json.dumps(context_data, indent=2)}"
        )

        reply = self.client.generate_response(system_instruction, message, history)

        return ChatResponse(
            reply=reply,
            groundedInspectionId=inspection_id if target_inspection else None,
            sources=sources,
            provider=self.provider,
        )

assistant_service = AssistantService()
