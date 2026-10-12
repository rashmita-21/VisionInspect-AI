import React, { useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Download, Layers, Eye } from 'lucide-react';

interface ImageComparisonProps {
  originalUrl: string;
  anomalyMapUrl?: string;
  maskUrl?: string;
  titleOriginal?: string;
  titleAnomaly?: string;
  allowDownload?: boolean;
  onDownload?: () => void;
}

export const ImageComparison: React.FC<ImageComparisonProps> = ({
  originalUrl,
  anomalyMapUrl,
  maskUrl,
  titleOriginal = 'Original Surface Specimen',
  titleAnomaly = 'PatchCore Anomaly Localization Map',
  allowDownload = true,
  onDownload,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [activeTabMobile, setActiveTabMobile] = useState<'original' | 'anomaly'>('anomaly');
  const [showColorScale, setShowColorScale] = useState<boolean>(true);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => setZoomLevel(1);

  const activeOverlayUrl = anomalyMapUrl || maskUrl;

  const handleTriggerDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }

    if (!activeOverlayUrl) return;

    const link = document.createElement('a');
    link.href = activeOverlayUrl;
    link.download = `visioninspect-anomaly-map-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="rounded-lg border border-[#292E3B] bg-[#161A24] overflow-hidden">
      {/* Header with Comparison Controls */}
      <div className="p-3.5 bg-[#1C2130] border-b border-[#292E3B] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#A78BFA]" />
          <h3 className="text-xs font-semibold text-[#F1F2F6]">Visual Defect Localization</h3>
        </div>

        {/* Mobile View Toggle Tabs */}
        <div className="flex md:hidden items-center bg-[#161A24] rounded border border-[#292E3B] p-0.5">
          <button
            onClick={() => setActiveTabMobile('original')}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              activeTabMobile === 'original'
                ? 'bg-[#28223D] text-[#A78BFA] font-medium'
                : 'text-[#969EAF]'
            }`}
          >
            Original
          </button>
          <button
            onClick={() => setActiveTabMobile('anomaly')}
            disabled={!activeOverlayUrl}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              activeTabMobile === 'anomaly'
                ? 'bg-[#28223D] text-[#A78BFA] font-medium'
                : 'text-[#969EAF]'
            } ${!activeOverlayUrl ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            Anomaly Map
          </button>
        </div>

        {/* Zoom & Action Controls */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-[#161A24] rounded border border-[#292E3B]">
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-[#969EAF] hover:text-[#F1F2F6] hover:bg-[#222737] rounded-l transition-colors"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-[11px] font-mono tabular-nums text-[#969EAF]">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-[#969EAF] hover:text-[#F1F2F6] hover:bg-[#222737] transition-colors"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            {zoomLevel !== 1 && (
              <button
                onClick={handleResetZoom}
                className="px-1.5 py-1 text-[10px] font-mono text-[#A78BFA] hover:text-[#B9A4FF] border-l border-[#292E3B] rounded-r"
                title="Reset zoom"
              >
                Reset
              </button>
            )}
          </div>

          {activeOverlayUrl && allowDownload && (
            <button
              onClick={handleTriggerDownload}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#F1F2F6] bg-[#222737] hover:bg-[#28223D] hover:text-[#A78BFA] border border-[#292E3B] rounded transition-colors"
              title="Download defect localization artifact"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export Artifact</span>
            </button>
          )}
        </div>
      </div>

      {/* Comparison Viewport */}
      <div className="p-4 md:p-6 bg-[#0E1118]">
        {/* Desktop Side-by-Side Grid */}
        <div className="hidden md:grid md:grid-cols-2 gap-4">
          {/* Original View Card */}
          <div className="rounded-md border border-[#292E3B] bg-[#161A24] p-3 flex flex-col">
            <div className="flex items-center justify-between text-xs text-[#969EAF] mb-2 px-1">
              <span className="font-medium text-[#F1F2F6]">{titleOriginal}</span>
              <span className="text-[10px] font-mono text-[#737D90]">INPUT 1024×1024</span>
            </div>
            <div className="relative flex-1 min-h-[340px] max-h-[460px] bg-[#0B0D12] rounded border border-[#292E3B]/60 flex items-center justify-center overflow-hidden">
              <img
                src={originalUrl}
                alt="Original surface"
                style={{ transform: `scale(${zoomLevel})` }}
                className="max-h-[400px] max-w-full object-contain transition-transform duration-150"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* Anomaly Map Card */}
          <div className="rounded-md border border-[#292E3B] bg-[#161A24] p-3 flex flex-col">
            <div className="flex items-center justify-between text-xs text-[#969EAF] mb-2 px-1">
              <span className="font-medium text-[#F1F2F6]">{titleAnomaly}</span>
              <span className="text-[10px] font-mono text-[#A78BFA]">HEATMAP OVERLAY</span>
            </div>

            <div className="relative flex-1 min-h-[340px] max-h-[460px] bg-[#0B0D12] rounded border border-[#292E3B]/60 flex items-center justify-center overflow-hidden">
              {activeOverlayUrl ? (
                <img
                  src={activeOverlayUrl}
                  alt="Anomaly localization visualization"
                  style={{ transform: `scale(${zoomLevel})` }}
                  className="max-h-[400px] max-w-full object-contain transition-transform duration-150"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="p-8 text-center text-[#737D90]">
                  <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No anomaly localization map available.</p>
                  <p className="text-[11px] mt-1 text-[#969EAF]">
                    Specimen classified as nominal or backend segmentation output was omitted.
                  </p>
                </div>
              )}

              {/* Heatmap Legend Bar (Visible when heatmap exists) */}
              {activeOverlayUrl && showColorScale && (
                <div className="absolute bottom-2 right-2 p-2 rounded bg-[#10131B]/90 border border-[#292E3B] backdrop-blur-xs text-[10px] text-[#969EAF] shadow-md flex flex-col gap-1">
                  <div className="flex justify-between font-mono text-[9px] text-[#737D90]">
                    <span>0.0 Nominal</span>
                    <span>1.0 Defect</span>
                  </div>
                  <div className="w-28 h-2 rounded bg-gradient-to-r from-blue-700 via-violet-600 to-red-600" />
                  <span className="text-[9px] text-center text-[#737D90]">PatchCore Distance</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Tabbed View */}
        <div className="md:hidden">
          {activeTabMobile === 'original' ? (
            <div className="rounded-md border border-[#292E3B] bg-[#161A24] p-3">
              <p className="text-xs font-medium text-[#F1F2F6] mb-2">{titleOriginal}</p>
              <div className="min-h-[260px] max-h-[360px] bg-[#0B0D12] rounded border border-[#292E3B]/60 flex items-center justify-center overflow-hidden">
                <img
                  src={originalUrl}
                  alt="Original surface"
                  style={{ transform: `scale(${zoomLevel})` }}
                  className="max-h-[320px] max-w-full object-contain transition-transform duration-150"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-[#292E3B] bg-[#161A24] p-3">
              <p className="text-xs font-medium text-[#F1F2F6] mb-2">{titleAnomaly}</p>
              <div className="min-h-[260px] max-h-[360px] bg-[#0B0D12] rounded border border-[#292E3B]/60 flex items-center justify-center overflow-hidden">
                {activeOverlayUrl ? (
                  <img
                    src={activeOverlayUrl}
                    alt="Anomaly map"
                    style={{ transform: `scale(${zoomLevel})` }}
                    className="max-h-[320px] max-w-full object-contain transition-transform duration-150"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="p-6 text-center text-[#737D90]">
                    <p className="text-xs">No anomaly map returned for this specimen.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
