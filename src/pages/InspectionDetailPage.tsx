import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Cpu,
  Layers,
  Download,
  AlertCircle,
  HelpCircle,
  ShieldAlert,
  FileText,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useBackend } from '../context/BackendContext';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ImageComparison } from '../components/inspection/ImageComparison';
import { EmptyState } from '../components/ui/EmptyState';
import { DEMO_HISTORY_RECORDS } from '../services/demoData';
import { api } from '../services/api';
import { InspectionResult } from '../types/inspection';
import { InspectionAssistantModal } from '../components/assistant/InspectionAssistantModal';

export const InspectionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { inspections } = useBackend();
  const [fetchedRecord, setFetchedRecord] = useState<InspectionResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);

  // Try finding record in memory
  const memoryRecord = useMemo(() => {
    if (!id) return null;
    const found = inspections.find((item) => item.id.toLowerCase() === id.toLowerCase());
    if (found) return found;
    return DEMO_HISTORY_RECORDS.find((item) => item.id.toLowerCase() === id.toLowerCase()) || null;
  }, [id, inspections]);

  // If not found in memory, fetch directly from backend API
  useEffect(() => {
    if (!memoryRecord && id) {
      setLoading(true);
      api
        .getInspectionById(id)
        .then((res) => setFetchedRecord(res))
        .catch(() => setFetchedRecord(null))
        .finally(() => setLoading(false));
    }
  }, [id, memoryRecord]);

  const record = memoryRecord || fetchedRecord;

  if (!record) {
    return (
      <div className="space-y-6">
        <div className="pb-2 border-b border-[#292E3B]/70">
          <button
            onClick={() => navigate('/history')}
            className="inline-flex items-center gap-1.5 text-xs text-[#969EAF] hover:text-[#F1F2F6] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Inspection History
          </button>
        </div>

        <EmptyState
          icon={AlertCircle}
          title="Inspection Record Not Found"
          description={`No recorded inspection matching ID "${id}" could be located in the current database index.`}
          action={{
            label: 'Return to History Log',
            onClick: () => navigate('/history'),
          }}
        />
      </div>
    );
  }

  const formattedDate = new Date(record.timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const scorePercentage = Math.min(Math.max(record.anomalyScore * 100, 0), 100);
  const thresholdPercentage = Math.min(Math.max(record.threshold * 100, 0), 100);

  return (
    <div className="space-y-6">
      {/* Top Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#292E3B]/70">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/history')}
            className="p-1.5 rounded bg-[#161A24] border border-[#292E3B] text-[#969EAF] hover:text-[#F1F2F6] hover:bg-[#1C2130] transition-colors"
            title="Return to inspection history"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-[#F1F2F6] font-mono tracking-tight">
                {record.id}
              </h1>
              <StatusBadge decision={record.decision} size="sm" />
              {record.isDemo && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#28223D] text-[#A78BFA] border border-[#3D325C]">
                  Demo Specimen
                </span>
              )}
            </div>
            <p className="text-xs text-[#969EAF] mt-0.5 font-mono">
              File: {record.filename} · Category: {record.category}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAssistantOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#A78BFA] bg-[#28223D] hover:bg-[#342b50] hover:text-[#C4B5FD] border border-[#3D325C] rounded transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask AI Assistant</span>
          </button>
          {record.anomalyMapUrl && (
            <a
              href={record.anomalyMapUrl}
              download={`${record.id}-defect-map.png`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#F1F2F6] bg-[#222737] hover:bg-[#28223D] hover:text-[#A78BFA] border border-[#292E3B] rounded transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download Anomaly Map
            </a>
          )}
        </div>
      </div>

      {/* Primary Details Metric Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Score Card */}
        <div className="rounded-lg border border-[#292E3B] bg-[#161A24] p-4 flex flex-col justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-[#969EAF]">
            Anomaly Score
          </span>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono tabular-nums text-[#F1F2F6]">
              {record.anomalyScore.toFixed(3)}
              <span className="text-xs text-[#969EAF] font-normal ml-1">/ 1.000</span>
            </div>
            <div className="relative w-full h-2 bg-[#10131B] rounded-full border border-[#292E3B] overflow-hidden mt-2">
              <div
                className={`h-full ${record.decision === 'ANOMALY_DETECTED'
                  ? 'bg-[#E87575]'
                  : record.decision === 'REVIEW_REQUIRED'
                    ? 'bg-[#E7B566]'
                    : 'bg-[#4DBA8A]'
                  }`}
                style={{ width: `${scorePercentage}%` }}
              />
            </div>
          </div>
          <span className="text-[10px] text-[#737D90] font-mono">
            Decision boundary threshold: {record.threshold.toFixed(2)}
          </span>
        </div>

        {/* Inference Latency */}
        <div className="rounded-lg border border-[#292E3B] bg-[#161A24] p-4 flex flex-col justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-[#969EAF] flex items-center justify-between">
            <span>Inference Duration</span>
            <Clock className="w-3.5 h-3.5 text-[#737D90]" />
          </span>
          <div className="my-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-[#F1F2F6]">
              {record.inferenceDurationMs.toFixed(1)}
            </span>
            <span className="text-xs text-[#969EAF] ml-1">ms</span>
          </div>
          <span className="text-[10px] text-[#737D90] font-mono">
            PatchCore CoreSet Search
          </span>
        </div>

        {/* Model Spec */}
        <div className="rounded-lg border border-[#292E3B] bg-[#161A24] p-4 flex flex-col justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-[#969EAF] flex items-center justify-between">
            <span>Model Spec</span>
            <Cpu className="w-3.5 h-3.5 text-[#737D90]" />
          </span>
          <div className="my-2">
            <span className="text-base font-semibold text-[#F1F2F6] block truncate">
              {record.modelName}
            </span>
            <span className="text-xs font-mono text-[#A78BFA]">{record.modelVersion}</span>
          </div>
          <span className="text-[10px] text-[#737D90] font-mono">
            Category: {record.category}
          </span>
        </div>

        {/* Timestamp */}
        <div className="rounded-lg border border-[#292E3B] bg-[#161A24] p-4 flex flex-col justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-[#969EAF] flex items-center justify-between">
            <span>Timestamp</span>
            <Calendar className="w-3.5 h-3.5 text-[#737D90]" />
          </span>
          <div className="my-2">
            <span className="text-xs font-mono text-[#F1F2F6] block leading-snug">
              {formattedDate}
            </span>
          </div>
          <span className="text-[10px] text-[#737D90] font-mono">
            Logged into QC database
          </span>
        </div>
      </div>

      {/* Visual Defect Localization Comparison */}
      <ImageComparison
        originalUrl={record.originalImageUrl}
        anomalyMapUrl={record.anomalyMapUrl}
        maskUrl={record.maskUrl}
        titleOriginal={`Original Specimen (${record.filename})`}
        titleAnomaly={
          record.anomalyMapUrl
            ? 'PatchCore Visual Anomaly Localization'
            : 'Anomaly Localization (No defect mask returned for this specimen)'
        }
      />

      {/* Technical Notes & QC Safety Notice */}
      <div className="rounded-lg border border-[#292E3B] bg-[#161A24] p-4.5 space-y-3">
        <h3 className="text-xs font-semibold text-[#F1F2F6] uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-[#A78BFA]" />
          Inspection Audit Notes & Metadata
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded bg-[#1C2130] border border-[#292E3B] space-y-1.5">
            <span className="text-[10px] font-mono uppercase text-[#737D90]">Analysis Notes</span>
            <p className="text-[#969EAF] leading-relaxed">
              {record.notes ||
                'Nearest-neighbor patch distance computed against nominal memory bank. Defect map highlights localized pixel clusters exceeding decision threshold.'}
            </p>
          </div>

          <div className="p-3 rounded bg-[#1C2130] border border-[#292E3B] space-y-1.5">
            <span className="text-[10px] font-mono uppercase text-[#737D90]">QC Standard Notice</span>
            <p className="text-[#E7B566] text-[11px] leading-relaxed">
              Industrial surface inspection results are provided as computer-vision decision support. Final part disposition (Accept / Scrap / Rework) remains the responsibility of certified quality control personnel.
            </p>
          </div>
        </div>
      </div>

      {/* Grounded Quality Control Assistant Modal */}
      <InspectionAssistantModal
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        activeInspectionId={record.id}
      />
    </div>
  );
};
