import React from 'react';
import { Clock, Cpu, Calendar, Download, HelpCircle, ShieldAlert, CheckCircle, AlertTriangle } from 'lucide-react';
import { InspectionResult } from '../../types/inspection';
import { StatusBadge } from '../ui/StatusBadge';

interface AnomalyScoreCardProps {
  result: InspectionResult;
  onDownload?: () => void;
}

export const AnomalyScoreCard: React.FC<AnomalyScoreCardProps> = ({
  result,
  onDownload,
}) => {
  const {
    anomalyScore,
    threshold,
    decision,
    inferenceDurationMs,
    modelName,
    modelVersion,
    timestamp,
    category,
    anomalyMapUrl,
    maskUrl,
    isDemo,
  } = result;

  const scorePercentage = Math.min(Math.max(anomalyScore * 100, 0), 100);
  const thresholdPercentage = Math.min(Math.max(threshold * 100, 0), 100);

  const formattedDate = new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const hasArtifact = Boolean(anomalyMapUrl || maskUrl);

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    const targetUrl = anomalyMapUrl || maskUrl;
    if (!targetUrl) return;

    const link = document.createElement('a');
    link.href = targetUrl;
    link.download = `${result.id}-defect-visualization.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="rounded-lg border border-[#292E3B] bg-[#161A24] p-5 space-y-5">
      {/* Top Header: Decision Badge & Score Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#292E3B]">
        <div className="flex items-center gap-2.5">
          <StatusBadge decision={decision} size="md" />
          {isDemo && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#28223D] text-[#A78BFA] border border-[#3D325C]">
              Demo Specimen
            </span>
          )}
        </div>
        <div className="text-right">
          <span className="text-xs text-[#969EAF] mr-2">Inspection ID:</span>
          <span className="text-xs font-mono font-medium text-[#F1F2F6]">{result.id}</span>
        </div>
      </div>

      {/* Main Metric: Anomaly Score Meter */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-[#969EAF]">
              Anomaly Score
            </span>
            <span className="text-[11px] font-mono text-[#737D90]">
              (Threshold: {threshold.toFixed(2)})
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold font-mono tabular-nums text-[#F1F2F6]">
              {anomalyScore.toFixed(3)}
            </span>
            <span className="text-xs text-[#969EAF] ml-1">/ 1.000</span>
          </div>
        </div>

        {/* Meter Bar with Decision Threshold Line */}
        <div className="relative w-full h-3 bg-[#10131B] rounded-full border border-[#292E3B] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              decision === 'ANOMALY_DETECTED'
                ? 'bg-[#E87575]'
                : decision === 'REVIEW_REQUIRED'
                ? 'bg-[#E7B566]'
                : 'bg-[#4DBA8A]'
            }`}
            style={{ width: `${scorePercentage}%` }}
          />
          {/* Threshold marker tick */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[#F1F2F6] z-10"
            style={{ left: `${thresholdPercentage}%` }}
            title={`Decision Threshold: ${threshold.toFixed(2)}`}
          />
        </div>

        <div className="flex justify-between items-center text-[10px] text-[#737D90] font-mono mt-1">
          <span>0.00 (Nominal)</span>
          <span className="text-[#F1F2F6]">Threshold {threshold.toFixed(2)}</span>
          <span>1.00 (Severe Anomaly)</span>
        </div>
      </div>

      {/* Technical Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-[#292E3B] text-xs">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-[#737D90] block mb-0.5">
            Inference Time
          </span>
          <span className="font-mono font-medium text-[#F1F2F6] flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[#969EAF]" />
            {inferenceDurationMs.toFixed(1)} ms
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase tracking-wider text-[#737D90] block mb-0.5">
            Model & Version
          </span>
          <span className="font-mono text-[#F1F2F6] truncate block" title={`${modelName} ${modelVersion}`}>
            {modelName} ({modelVersion})
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase tracking-wider text-[#737D90] block mb-0.5">
            Specimen Category
          </span>
          <span className="font-mono text-[#A78BFA]">{category}</span>
        </div>

        <div>
          <span className="text-[10px] uppercase tracking-wider text-[#737D90] block mb-0.5">
            Timestamp
          </span>
          <span className="text-[11px] text-[#969EAF] truncate block" title={formattedDate}>
            {formattedDate}
          </span>
        </div>
      </div>

      {/* Interpretation & Safety QC Notice (Strict Requirement) */}
      <div className="rounded bg-[#1C2130] border border-[#292E3B] p-3 text-xs text-[#969EAF] space-y-1.5">
        <div className="flex items-center gap-1.5 text-[#F1F2F6] font-medium text-xs">
          <HelpCircle className="w-3.5 h-3.5 text-[#A78BFA]" />
          <span>Metric Interpretation & Operational Guidance</span>
        </div>
        <p className="leading-relaxed">
          The anomaly score measures mathematical feature deviation from the learned coreset distribution of nominal industrial surfaces (PatchCore distance) and is <strong className="text-[#F1F2F6]">not a calibrated defect probability</strong>.
        </p>
        <div className="flex items-start gap-1.5 pt-1 text-[11px] text-[#E7B566]">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Notice: This system supports automated screening. Predictions assist human quality-assurance engineers and do not replace final engineering or safety verification.
          </span>
        </div>
      </div>

      {/* Download Action */}
      <div className="flex items-center justify-end pt-1">
        <button
          onClick={handleDownload}
          disabled={!hasArtifact}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-md transition-colors ${
            hasArtifact
              ? 'bg-[#222737] hover:bg-[#28223D] text-[#F1F2F6] hover:text-[#A78BFA] border border-[#292E3B]'
              : 'bg-[#1C2130] text-[#737D90] border border-[#292E3B] cursor-not-allowed opacity-50'
          }`}
          title={hasArtifact ? 'Download defect visualization map' : 'No artifact available to download'}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Result Artifact</span>
        </button>
      </div>
    </div>
  );
};
