from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field

AnomalyDecision = Literal["NORMAL", "ANOMALY_DETECTED", "REVIEW_REQUIRED"]

class InspectionMetadata(BaseModel):
    imageWidth: Optional[int] = None
    imageHeight: Optional[int] = None
    fileSizeBytes: Optional[int] = None
    patchCoreFeatures: Optional[int] = None
    deviceUsed: Optional[str] = None

class InspectionResult(BaseModel):
    id: str
    timestamp: str
    filename: str
    originalImageUrl: str
    anomalyMapUrl: Optional[str] = None
    maskUrl: Optional[str] = None
    overlayUrl: Optional[str] = None
    anomalyScore: float
    normalizedScore: float
    threshold: float
    decision: AnomalyDecision
    inferenceDurationMs: float
    modelName: str
    modelVersion: str
    category: str = "metal_nut"
    explanation: Optional[str] = None
    notes: Optional[str] = None
    isDemo: bool = False
    metadata: Optional[InspectionMetadata] = None

class BackendHealth(BaseModel):
    status: Literal["online", "offline", "checking", "error"]
    version: str
    modelLoaded: bool
    modelName: str
    modelVersion: str
    supportedCategory: str
    supportedCategories: Optional[List[str]] = None
    uptimeSeconds: float
    lastChecked: str
    error: Optional[str] = None

class ModelInfo(BaseModel):
    name: str
    architecture: str
    backbone: str
    version: str
    dataset: str
    targetCategory: str
    inputResolution: str
    memoryBankSize: Optional[str] = None
    trainingSamples: Optional[int] = None
    isOperational: bool
    statusMessage: str

class DefectBreakdownItem(BaseModel):
    defectType: str
    sampleCount: int
    detectedCount: int
    detectionRate: float

class TestSetSize(BaseModel):
    total: int
    normal: int
    anomalous: int

class EvaluationMetrics(BaseModel):
    evaluatedAt: str
    dataset: str
    category: str
    imageAuroc: float
    pixelAuroc: float
    pixelPrecision: float
    pixelRecall: float
    f1Score: float
    optimalThreshold: float
    testSetSize: TestSetSize
    defectBreakdown: List[DefectBreakdownItem]
    knownLimitations: List[str]

class ActivityTimelineItem(BaseModel):
    date: str
    inspections: int
    anomalies: int

class AnalyticsSummary(BaseModel):
    totalInspections: int
    normalCount: int
    anomalyCount: int
    reviewRequiredCount: int
    anomalyRate: float
    avgInferenceDurationMs: float
    activityTimeline: List[ActivityTimelineItem]

class PaginatedInspections(BaseModel):
    items: List[InspectionResult]
    total: int
    page: int
    pageSize: int

class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str

class ChatRequest(BaseModel):
    message: str
    inspectionId: Optional[str] = None
    history: Optional[List[ChatMessage]] = None

class ChatResponse(BaseModel):
    reply: str
    groundedInspectionId: Optional[str] = None
    sources: Optional[List[str]] = None
    provider: str
