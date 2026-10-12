import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  ShieldAlert,
  CheckCircle2,
  Cpu,
  Layers,
  ArrowRight,
  Database,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useBackend } from '../context/BackendContext';
import { api, ApiError } from '../services/api';
import { InspectionResult } from '../types/inspection';
import { ImageUploader } from '../components/inspection/ImageUploader';
import { ImageComparison } from '../components/inspection/ImageComparison';
import { AnomalyScoreCard } from '../components/inspection/AnomalyScoreCard';
import { ErrorState } from '../components/ui/ErrorState';
import { SampleImagePreset, SUPPORTED_CATEGORIES, CATEGORY_DETAILS, SupportedCategory } from '../services/demoData';
import { InspectionAssistantModal } from '../components/assistant/InspectionAssistantModal';

export const InspectPage: React.FC = () => {
  const { health, apiUrl, isDemoMode, addInspection } = useBackend();

  // Multi-Category state
  const [selectedCategory, setSelectedCategory] = useState<SupportedCategory>('metal_nut');

  // Selected file and preview state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [activePreset, setActivePreset] = useState<SampleImagePreset | null>(null);

  // Inspection lifecycle state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [inspectionResult, setInspectionResult] = useState<InspectionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [backendUnavailablePrompt, setBackendUnavailablePrompt] = useState<boolean>(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);

  // Clean up object URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Handle local file selection
  const handleFileSelect = (file: File) => {
    // Clear previous results & errors
    setInspectionResult(null);
    setErrorMessage(null);
    setBackendUnavailablePrompt(false);
    setActivePreset(null);

    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(objectUrl);

    // Compute dimensions
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = objectUrl;
  };

  // Handle preset loading
  const handleLoadPreset = (preset: SampleImagePreset) => {
    setInspectionResult(null);
    setErrorMessage(null);
    setBackendUnavailablePrompt(false);
    setSelectedFile(null);
    setActivePreset(preset);
    setPreviewUrl(preset.imageUrl);

    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = preset.imageUrl;
  };

  // Reset / Clear
  const handleReset = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setImageDimensions(null);
    setActivePreset(null);
    setInspectionResult(null);
    setErrorMessage(null);
    setBackendUnavailablePrompt(false);
  };

  // Run Inspection Handler
  const handleRunInspection = async () => {
    if (!selectedFile && !activePreset) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setBackendUnavailablePrompt(false);

    // If active preset is loaded in demo mode OR user selected demo sample
    if (activePreset && (isDemoMode || health.status !== 'online')) {
      // Simulate realistic PatchCore inference processing time (45-60ms simulated over 700ms UI animation)
      setTimeout(() => {
        const result: InspectionResult = {
          ...activePreset.demoResult,
          id: `INS-${Date.now().toString().slice(-6)}`,
          timestamp: new Date().toISOString(),
        };
        setInspectionResult(result);
        addInspection(result);
        setIsProcessing(false);
      }, 700);
      return;
    }

    // Live API Execution
    if (selectedFile) {
      if (health.status !== 'online') {
        // Backend unavailable state
        setIsProcessing(false);
        setBackendUnavailablePrompt(true);
        return;
      }

      try {
        const result = await api.inspectImage(selectedFile, selectedCategory);
        setInspectionResult(result);
        addInspection(result);
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setErrorMessage(
            `Inference API returned error: ${err.message}${err.status ? ` (Status Code: ${err.status})` : ''
            }`
          );
        } else {
          setErrorMessage(
            (err as Error).message ||
            'Connection failed: Ensure FastAPI server is running with CORS enabled.'
          );
        }
      } finally {
        setIsProcessing(false);
      }
    } else if (activePreset && health.status === 'online') {
      // Fetch the preset image as a blob to send to the real backend
      try {
        const resp = await fetch(activePreset.imageUrl);
        const blob = await resp.blob();
        const file = new File([blob], `${activePreset.id}.jpg`, { type: 'image/jpeg' });
        const result = await api.inspectImage(file, selectedCategory);
        setInspectionResult(result);
        addInspection(result);
      } catch (err: unknown) {
        setErrorMessage(
          (err as Error).message || 'Failed to dispatch specimen to live FastAPI backend.'
        );
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Workbench Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#292E3B]/70">
        <div>
          <h1 className="text-xl font-semibold text-[#F1F2F6] tracking-tight">
            AI Inspection Workbench
          </h1>
          <p className="text-xs text-[#969EAF] mt-0.5">
            Evaluate industrial surface specimens using category-isolated PatchCore nearest-neighbor anomaly detection.
          </p>
        </div>

        {/* Backend status indicator */}
        <div className="flex items-center gap-2">
          {health.status === 'online' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-[#4DBA8A] bg-[#132A20] border border-[#1E4332] rounded">
              <CheckCircle2 className="w-3.5 h-3.5" />
              FastAPI: {apiUrl}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-[#969EAF] bg-[#161A24] border border-[#292E3B] rounded">
              <ShieldAlert className="w-3.5 h-3.5 text-[#E7B566]" />
              Backend: Disconnected
            </span>
          )}
        </div>
      </div>

      {/* CATEGORY SELECTOR BAR */}
      <div className="rounded-lg border border-[#292E3B] bg-[#161A24] p-3.5 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-medium text-[#F1F2F6] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#A78BFA]" />
            <span>Inspection Category Target:</span>
            <span className="text-xs font-semibold text-[#A78BFA]">
              {CATEGORY_DETAILS[selectedCategory]?.displayName || selectedCategory}
            </span>
          </span>
          <span className="text-[11px] text-[#737D90] font-mono">
            Isolated memory bank & threshold
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {SUPPORTED_CATEGORIES.map((catKey) => {
            const meta = CATEGORY_DETAILS[catKey];
            const isSelected = selectedCategory === catKey;
            return (
              <button
                key={catKey}
                type="button"
                onClick={() => {
                  setSelectedCategory(catKey);
                  // Clear active preset if from another category
                  if (activePreset && activePreset.category !== catKey) {
                    handleReset();
                  }
                }}
                disabled={isProcessing}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${isSelected
                    ? 'bg-[#28223D] text-[#A78BFA] border border-[#3D325C] shadow-sm font-semibold'
                    : 'bg-[#10131B] text-[#969EAF] hover:text-[#F1F2F6] hover:bg-[#1C2130] border border-[#292E3B]'
                  } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span>{meta?.displayName || catKey}</span>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A78BFA]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Category Details Note */}
        <p className="text-[11px] text-[#737D90] leading-relaxed">
          {CATEGORY_DETAILS[selectedCategory]?.description} Primary defect types audited: {CATEGORY_DETAILS[selectedCategory]?.defectTypes.join(', ')}.
        </p>
      </div>

      {/* SECTION A: Image Upload & Preview Canvas */}
      <div className="space-y-4">
        <ImageUploader
          selectedFile={selectedFile}
          previewUrl={previewUrl}
          imageDimensions={imageDimensions}
          onFileSelect={handleFileSelect}
          onClear={handleReset}
          onLoadPreset={handleLoadPreset}
          disabled={isProcessing}
        />

        {/* SECTION B: Inspection Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg border border-[#292E3B] bg-[#161A24]">
          <div className="flex items-center gap-2 text-xs text-[#969EAF]">
            {previewUrl ? (
              <span className="flex items-center gap-1.5 text-[#F1F2F6]">
                <CheckCircle2 className="w-4 h-4 text-[#4DBA8A]" />
                {activePreset
                  ? `Specimen loaded: ${activePreset.name}`
                  : `File loaded: ${selectedFile?.name}`}
              </span>
            ) : (
              <span className="text-[#737D90]">Select or upload a specimen image to begin inspection</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {previewUrl && (
              <button
                type="button"
                onClick={handleReset}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#969EAF] hover:text-[#F1F2F6] bg-[#1C2130] hover:bg-[#222737] border border-[#292E3B] rounded-md transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}

            <button
              type="button"
              onClick={handleRunInspection}
              disabled={!previewUrl || isProcessing}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-all duration-150 ${!previewUrl || isProcessing
                ? 'bg-[#1C2130] text-[#737D90] border border-[#292E3B] cursor-not-allowed opacity-60'
                : 'bg-[#A78BFA] hover:bg-[#B9A4FF] text-[#0B0D12] shadow-sm cursor-pointer'
                }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Computing Coreset Distance...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Inspection</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Backend Unavailable State Banner */}
      {backendUnavailablePrompt && (
        <div className="rounded-lg border border-[#4A3B1F] bg-[#221C14] p-4.5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded bg-[#2D2415] text-[#E7B566] shrink-0 mt-0.5">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="space-y-1 text-xs">
              <h4 className="font-semibold text-[#F1F2F6]">
                FastAPI Backend Not Connected
              </h4>
              <p className="text-[#E7B566] leading-relaxed">
                Real PyTorch PatchCore visual anomaly detection requires an active Python FastAPI backend listening at{' '}
                <code className="px-1 py-0.5 rounded bg-[#161A24] text-[#F1F2F6] font-mono">{apiUrl}</code>.
                Per our product integrity guidelines, we do not fabricate model predictions.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => {
                    setBackendUnavailablePrompt(false);
                    // Load nominal demo specimen for evaluation
                    const preset = activePreset || {
                      id: 'sample-custom-evaluation',
                      name: selectedFile?.name || 'Uploaded Specimen',
                      category: 'metal_nut',
                      expectedCondition: 'Nominal' as const,
                      description: 'Evaluated in isolated demo mode',
                      imageUrl: previewUrl || '',
                      demoResult: {
                        id: `INS-DEMO-${Date.now().toString().slice(-4)}`,
                        timestamp: new Date().toISOString(),
                        filename: selectedFile?.name || 'custom_specimen.png',
                        originalImageUrl: previewUrl || '',
                        anomalyScore: 0.185,
                        normalizedScore: 18.5,
                        threshold: 0.50,
                        decision: 'NORMAL',
                        inferenceDurationMs: 47.1,
                        modelName: 'PatchCore-MVTec',
                        modelVersion: 'v0.9.4-demo',
                        category: 'metal_nut',
                        isDemo: true,
                      },
                    };
                    setInspectionResult(preset.demoResult);
                    addInspection(preset.demoResult);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-[#F1F2F6] bg-[#2D2415] hover:bg-[#3E321E] border border-[#4A3B1F] rounded transition-colors"
                >
                  Preview with Demo Scoring Engine
                </button>
                <a
                  href="/settings"
                  className="px-3 py-1.5 text-xs font-medium text-[#969EAF] hover:text-[#F1F2F6] bg-[#161A24] rounded border border-[#292E3B] transition-colors"
                >
                  Inspect API Settings & Instructions
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Model Error State */}
      {errorMessage && (
        <ErrorState
          title="Inference Pipeline Error"
          message={errorMessage}
          onRetry={handleRunInspection}
        />
      )}

      {/* Processing Skeleton Overlay */}
      {isProcessing && (
        <div className="rounded-lg border border-[#3D325C] bg-[#161A24] p-8 text-center space-y-3 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-[#28223D] flex items-center justify-center mx-auto text-[#A78BFA]">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <h3 className="text-sm font-semibold text-[#F1F2F6]">
            Extracting Patch-Level Embedding Neighborhood
          </h3>
          <p className="text-xs text-[#969EAF] max-w-md mx-auto">
            Passing image through WideResNet-50-2 feature extractor and computing coreset memory-bank nearest-neighbor distance metrics...
          </p>
        </div>
      )}

      {/* SECTION C: Inspection Results (When available) */}
      {inspectionResult && !isProcessing && (
        <div className="space-y-6 pt-2">
          {/* Section Divider */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#A78BFA] flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              Inspection Results
            </span>
            <button
              onClick={() => setIsAssistantOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium text-[#A78BFA] bg-[#28223D] border border-[#3D325C] hover:bg-[#342b50] hover:text-[#C4B5FD] transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI Assistant about this result</span>
            </button>
            <div className="h-px bg-[#292E3B] flex-1" />
          </div>

          {/* Anomaly Score, Decision & Interpretation Card */}
          <AnomalyScoreCard result={inspectionResult} />

          {/* Side-by-Side Visual Defect Localization Map */}
          <ImageComparison
            originalUrl={inspectionResult.originalImageUrl}
            anomalyMapUrl={inspectionResult.anomalyMapUrl}
            maskUrl={inspectionResult.maskUrl}
            titleOriginal={`Original Specimen (${inspectionResult.filename})`}
            titleAnomaly={
              inspectionResult.anomalyMapUrl
                ? 'PatchCore Visual Anomaly Localization'
                : 'Defect Localization (Nominal specimen - No mask returned)'
            }
          />
        </div>
      )}

      {/* Grounded Quality Control Assistant Modal */}
      <InspectionAssistantModal
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        activeInspectionId={inspectionResult?.id}
      />
    </div>
  );
};
