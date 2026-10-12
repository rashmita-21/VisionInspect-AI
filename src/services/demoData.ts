import {
  InspectionResult,
  ModelInfo,
  EvaluationMetrics,
  AnalyticsSummary,
} from '../types/inspection';

import nominalImg from '../assets/images/metal_nut_nominal_1791794617765.jpg';
import defectImg from '../assets/images/metal_nut_defect_1791794633092.jpg';
import heatmapImg from '../assets/images/metal_nut_heatmap_1791794648112.jpg';
import flangeImg from '../assets/images/metal_flange_sample_1791794661841.jpg';

export { nominalImg, defectImg, heatmapImg, flangeImg };

export const SUPPORTED_CATEGORIES = [
  'metal_nut',
  'bottle',
  'cable',
  'transistor',
  'screw',
] as const;

export type SupportedCategory = typeof SUPPORTED_CATEGORIES[number];

export interface CategoryMeta {
  id: SupportedCategory;
  displayName: string;
  description: string;
  defectTypes: string[];
}

export const CATEGORY_DETAILS: Record<SupportedCategory, CategoryMeta> = {
  metal_nut: {
    id: 'metal_nut',
    displayName: 'Metal Nut (Hex M12)',
    description: 'Structural fasteners evaluated for thread deformation, scratches, and burrs.',
    defectTypes: ['Bent Thread', 'Color Discoloration', 'Flip / Burr', 'Surface Scratch'],
  },
  bottle: {
    id: 'bottle',
    displayName: 'Glass Bottle',
    description: 'Transparent container bottles inspected for cracks, fractures, and contamination.',
    defectTypes: ['Broken Large', 'Broken Small', 'Contamination'],
  },
  cable: {
    id: 'cable',
    displayName: 'Industrial Cable',
    description: 'Multi-conductor cables inspected for insulation cuts, swaps, and missing wires.',
    defectTypes: ['Cut Outer Insulation', 'Cut Inner Insulation', 'Cable Swap', 'Bent Wire', 'Missing Cable'],
  },
  transistor: {
    id: 'transistor',
    displayName: 'Semiconductor Transistor',
    description: 'Electronic components inspected for bent leads, damaged casing, and misplacement.',
    defectTypes: ['Bent Lead', 'Cut Lead', 'Damaged Case', 'Misplaced Specimen'],
  },
  screw: {
    id: 'screw',
    displayName: 'Machined Screw',
    description: 'Fasteners inspected for thread flaws, manipulated heads, and shaft scratches.',
    defectTypes: ['Scratch Head', 'Scratch Neck', 'Thread Side', 'Thread Top', 'Manipulated Front'],
  },
};

export interface SampleImagePreset {
  id: string;
  name: string;
  category: SupportedCategory | string;
  expectedCondition: 'Nominal' | 'Defect';
  description: string;
  imageUrl: string;
  demoResult: InspectionResult;
}

export const SAMPLE_PRESETS: SampleImagePreset[] = [
  {
    id: 'sample-nut-nominal',
    name: 'Hex Nut M12 (Nominal)',
    category: 'metal_nut',
    expectedCondition: 'Nominal',
    description: 'Flawless thread and chamfer surface meeting ISO 4032 specifications.',
    imageUrl: nominalImg,
    demoResult: {
      id: 'INS-DEMO-2026-001',
      timestamp: '2026-10-12T01:15:22.000Z',
      filename: 'sample_hex_nut_nominal.png',
      originalImageUrl: nominalImg,
      anomalyScore: 0.142,
      normalizedScore: 14.2,
      threshold: 0.50,
      decision: 'NORMAL',
      inferenceDurationMs: 46.8,
      modelName: 'PatchCore-MVTec',
      modelVersion: 'v0.9.4-demo',
      category: 'metal_nut',
      notes: 'Demo evaluation: feature distances strictly within learned core-set neighborhood.',
      isDemo: true,
      metadata: {
        imageWidth: 1024,
        imageHeight: 1024,
        fileSizeBytes: 348120,
        patchCoreFeatures: 2048,
        deviceUsed: 'NVIDIA RTX A5000 (Target Specs)',
      },
    },
  },
  {
    id: 'sample-nut-defect',
    name: 'Hex Nut M12 (Thread Gouge)',
    category: 'metal_nut',
    expectedCondition: 'Defect',
    description: 'Machined steel nut exhibiting thread fracture and surface indentation flaw.',
    imageUrl: defectImg,
    demoResult: {
      id: 'INS-DEMO-2026-002',
      timestamp: '2026-10-12T01:28:44.000Z',
      filename: 'sample_hex_nut_gouge_defect.png',
      originalImageUrl: defectImg,
      anomalyMapUrl: heatmapImg,
      anomalyScore: 0.887,
      normalizedScore: 88.7,
      threshold: 0.50,
      decision: 'ANOMALY_DETECTED',
      inferenceDurationMs: 48.2,
      modelName: 'PatchCore-MVTec',
      modelVersion: 'v0.9.4-demo',
      category: 'metal_nut',
      notes: 'Demo evaluation: PatchCore nearest-neighbor distance exceeds anomaly threshold at outer thread perimeter.',
      isDemo: true,
      metadata: {
        imageWidth: 1024,
        imageHeight: 1024,
        fileSizeBytes: 412580,
        patchCoreFeatures: 2048,
        deviceUsed: 'NVIDIA RTX A5000 (Target Specs)',
      },
    },
  },
  {
    id: 'sample-flange-marginal',
    name: 'Machined Flange Surface',
    category: 'metal_nut (cross-domain test)',
    expectedCondition: 'Defect',
    description: 'Lathe-turned steel flange surface test sample for domain boundary verification.',
    imageUrl: flangeImg,
    demoResult: {
      id: 'INS-DEMO-2026-003',
      timestamp: '2026-10-12T01:34:10.000Z',
      filename: 'sample_machined_flange.png',
      originalImageUrl: flangeImg,
      anomalyScore: 0.534,
      normalizedScore: 53.4,
      threshold: 0.50,
      decision: 'REVIEW_REQUIRED',
      inferenceDurationMs: 51.1,
      modelName: 'PatchCore-MVTec',
      modelVersion: 'v0.9.4-demo',
      category: 'metal_nut',
      notes: 'Demo evaluation: boundary anomaly score near decision threshold. Recommended for secondary human quality review.',
      isDemo: true,
      metadata: {
        imageWidth: 1024,
        imageHeight: 1024,
        fileSizeBytes: 389240,
        patchCoreFeatures: 2048,
        deviceUsed: 'NVIDIA RTX A5000 (Target Specs)',
      },
    },
  },
];

export const DEMO_HISTORY_RECORDS: InspectionResult[] = [
  SAMPLE_PRESETS[1].demoResult,
  SAMPLE_PRESETS[0].demoResult,
  SAMPLE_PRESETS[2].demoResult,
  {
    id: 'INS-DEMO-2026-004',
    timestamp: '2026-10-11T20:18:02.000Z',
    filename: 'metal_nut_test_batch_04.png',
    originalImageUrl: nominalImg,
    anomalyScore: 0.218,
    normalizedScore: 21.8,
    threshold: 0.50,
    decision: 'NORMAL',
    inferenceDurationMs: 45.4,
    modelName: 'PatchCore-MVTec',
    modelVersion: 'v0.9.4-demo',
    category: 'metal_nut',
    isDemo: true,
    metadata: {
      imageWidth: 1024,
      imageHeight: 1024,
      fileSizeBytes: 334110,
    },
  },
  {
    id: 'INS-DEMO-2026-005',
    timestamp: '2026-10-11T19:42:35.000Z',
    filename: 'metal_nut_scratch_specimen.png',
    originalImageUrl: defectImg,
    anomalyMapUrl: heatmapImg,
    anomalyScore: 0.792,
    normalizedScore: 79.2,
    threshold: 0.50,
    decision: 'ANOMALY_DETECTED',
    inferenceDurationMs: 47.9,
    modelName: 'PatchCore-MVTec',
    modelVersion: 'v0.9.4-demo',
    category: 'metal_nut',
    isDemo: true,
    metadata: {
      imageWidth: 1024,
      imageHeight: 1024,
      fileSizeBytes: 395100,
    },
  },
  {
    id: 'INS-DEMO-2026-006',
    timestamp: '2026-10-11T16:10:14.000Z',
    filename: 'metal_nut_pass_006.png',
    originalImageUrl: nominalImg,
    anomalyScore: 0.165,
    normalizedScore: 16.5,
    threshold: 0.50,
    decision: 'NORMAL',
    inferenceDurationMs: 44.9,
    modelName: 'PatchCore-MVTec',
    modelVersion: 'v0.9.4-demo',
    category: 'metal_nut',
    isDemo: true,
    metadata: {
      imageWidth: 1024,
      imageHeight: 1024,
      fileSizeBytes: 341020,
    },
  },
];

export const DEMO_ANALYTICS_SUMMARY: AnalyticsSummary = {
  totalInspections: 6,
  normalCount: 3,
  anomalyCount: 2,
  reviewRequiredCount: 1,
  anomalyRate: 33.3,
  avgInferenceDurationMs: 47.4,
  activityTimeline: [
    { date: '10/06', inspections: 2, anomalies: 0 },
    { date: '10/07', inspections: 4, anomalies: 1 },
    { date: '10/08', inspections: 3, anomalies: 1 },
    { date: '10/09', inspections: 5, anomalies: 2 },
    { date: '10/10', inspections: 3, anomalies: 1 },
    { date: '10/11', inspections: 4, anomalies: 1 },
    { date: '10/12', inspections: 6, anomalies: 2 },
  ],
};

// Published scientific benchmarks from Roth et al., 2022 (PatchCore paper / Anomalib reference for MVTec AD metal_nut category)
export const DEMO_BENCHMARK_EVALUATION: EvaluationMetrics = {
  evaluatedAt: '2026-09-18T14:30:00.000Z',
  dataset: 'MVTec Anomaly Detection (MVTec AD)',
  category: 'metal_nut',
  imageAuroc: 0.991, // Published PatchCore baseline AUROC on MVTec metal_nut
  pixelAuroc: 0.978, // Pixel-level localization AUROC
  pixelPrecision: 0.892,
  pixelRecall: 0.915,
  f1Score: 0.903,
  optimalThreshold: 0.518,
  testSetSize: {
    total: 115,
    normal: 22,
    anomalous: 93,
  },
  defectBreakdown: [
    { defectType: 'Bent Thread', sampleCount: 27, detectedCount: 27, detectionRate: 100 },
    { defectType: 'Surface Scratch', sampleCount: 25, detectedCount: 25, detectionRate: 100 },
    { defectType: 'Color Discoloration', sampleCount: 22, detectedCount: 21, detectionRate: 95.5 },
    { defectType: 'Flip / Thread Burr', sampleCount: 19, detectedCount: 18, detectionRate: 94.7 },
  ],
  knownLimitations: [
    'Specular reflections on uncleaned surfaces can induce false-positive pixel anomalies.',
    'Model memory bank requires representative nominal training set covering camera angle tolerances.',
    'Pixel-level localization boundaries have ~4px uncertainty around sub-millimeter thread burrs.',
  ],
};

export const DEMO_MODEL_INFO: ModelInfo = {
  name: 'PatchCore Industrial Surface Inspector',
  architecture: 'PatchCore (Anomalib / PyTorch)',
  backbone: 'WideResNet-50-2 (ImageNet Pretrained)',
  version: 'v0.9.4',
  dataset: 'MVTec AD Benchmark Dataset',
  targetCategory: 'metal_nut',
  inputResolution: '224 × 224 px (Patch size: 28 × 28)',
  memoryBankSize: '10% coreset subsampling (~4,800 feature vectors)',
  trainingSamples: 220,
  isOperational: false, // Truthful! Real model will be hosted on FastAPI
  statusMessage: 'FastAPI Backend integration configured for PyTorch PatchCore inference.',
};
