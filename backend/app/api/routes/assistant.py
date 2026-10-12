from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.schemas.inspection import ChatRequest, ChatResponse
from backend.app.services.assistant import assistant_service

router = APIRouter(tags=["Assistant"])

@router.post("/assistant/chat", response_model=ChatResponse)
def chat_with_assistant(req: ChatRequest, db: Session = Depends(get_db)):
    """
    Submits a user query to the industrial quality control assistant.
    Responses are grounded in actual database records, model metrics, and active inspections.
    """
    return assistant_service.chat(
        db=db,
        message=req.message,
        inspection_id=req.inspectionId,
        history=req.history,
    )
