export type AnomalyDecision = 'NORMAL' | 'ANOMALY_DETECTED' | 'REVIEW_REQUIRED';

export interface InspectionResult {
  id: string;
  timestamp: string;
  filename: string;
  originalImageUrl: string;
  anomalyMapUrl?: string;
  maskUrl?: string;
  overlayUrl?: string;
  anomalyScore: number; // Raw anomaly score (e.g. 0.00 to 1.00 or distance metric)
  normalizedScore?: number; // 0-100 scale for UI
  threshold: number; // e.g. 0.50 or learned decision boundary
  decision: AnomalyDecision;
  inferenceDurationMs: number;
  modelName: string;
  modelVersion: string;
  category: string; // e.g., 'metal_nut'
  notes?: string;
  isDemo?: boolean; // Clearly marks isolated demo/sample data
  metadata?: {
    imageWidth?: number;
    imageHeight?: number;
    fileSizeBytes?: number;
    patchCoreFeatures?: number;
    deviceUsed?: string;
  };
}

export interface BackendHealth {
  status: 'online' | 'offline' | 'checking' | 'error';
  version?: string;
  modelLoaded?: boolean;
  modelName?: string;
  modelVersion?: string;
  supportedCategory?: string;
  supportedCategories?: string[];
  uptimeSeconds?: number;
  lastChecked?: string;
  error?: string;
}

export interface ModelInfo {
  name: string;
  architecture: string; // e.g. "PatchCore (Anomalib / PyTorch)"
  backbone: string; // e.g. "WideResNet-50-2"
  version: string;
  dataset: string; // "MVTec AD"
  targetCategory: string; // "metal_nut"
  inputResolution: string; // "224x224"
  memoryBankSize?: string;
  trainingSamples?: number;
  isOperational: boolean;
  statusMessage: string;
}

export interface EvaluationMetrics {
  evaluatedAt: string;
  dataset: string;
  category: string;
  imageAuroc: number; // e.g. 0.988 (Image-level AUROC)
  pixelAuroc: number; // e.g. 0.972 (Pixel-level localization AUROC)
  pixelPrecision: number; // e.g. 0.894
  pixelRecall: number; // e.g. 0.912
  f1Score: number; // e.g. 0.903
  optimalThreshold: number; // e.g. 0.520
  testSetSize: {
    total: number;
    normal: number;
    anomalous: number;
  };
  defectBreakdown: Array<{
    defectType: string;
    sampleCount: number;
    detectedCount: number;
    detectionRate: number;
  }>;
  knownLimitations: string[];
}

export interface AnalyticsSummary {
  totalInspections: number;
  normalCount: number;
  anomalyCount: number;
  reviewRequiredCount: number;
  anomalyRate: number; // 0 - 100 percentage
  avgInferenceDurationMs: number;
  activityTimeline: Array<{
    date: string;
    inspections: number;
    anomalies: number;
  }>;
}

export interface InspectionFilterParams {
  searchQuery?: string;
  decision?: string; // 'ALL' | AnomalyDecision
  startDate?: string;
  endDate?: string;
  sortBy?: 'timestamp' | 'anomalyScore' | 'inferenceDurationMs';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}
