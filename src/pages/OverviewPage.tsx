import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ScanEye,
  AlertTriangle,
  Percent,
  Clock,
  Layers,
  ArrowRight,
  Database,
  ShieldAlert,
  CheckCircle2,
  Cpu,
  BarChart2,
  Plus,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { useBackend } from '../context/BackendContext';
import { MetricCard } from '../components/ui/MetricCard';
import { InspectionTable } from '../components/history/InspectionTable';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { DEMO_ANALYTICS_SUMMARY } from '../services/demoData';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { health, inspections, isDemoMode, setIsDemoMode, modelInfo } = useBackend();

  // If in demo mode, provide demo timeline; if real mode, calculate from real inspections
  const hasRealInspections = inspections.length > 0;
  const isDataAvailable = hasRealInspections || isDemoMode;

  // Compute metrics from current inspections or demo
  const totalInspections = hasRealInspections
    ? inspections.length
    : isDemoMode
    ? DEMO_ANALYTICS_SUMMARY.totalInspections
    : null;

  const anomalousCount = hasRealInspections
    ? inspections.filter((i) => i.decision === 'ANOMALY_DETECTED').length
    : isDemoMode
    ? DEMO_ANALYTICS_SUMMARY.anomalyCount
    : null;

  const anomalyRate = hasRealInspections && inspections.length > 0
    ? ((inspections.filter((i) => i.decision === 'ANOMALY_DETECTED').length / inspections.length) * 100).toFixed(1)
    : isDemoMode
    ? DEMO_ANALYTICS_SUMMARY.anomalyRate.toFixed(1)
    : null;

  const avgInferenceTime = hasRealInspections && inspections.length > 0
    ? (
        inspections.reduce((acc, curr) => acc + curr.inferenceDurationMs, 0) /
        inspections.length
      ).toFixed(1)
    : isDemoMode
    ? DEMO_ANALYTICS_SUMMARY.avgInferenceDurationMs.toFixed(1)
    : null;

  // Chart data
  const chartData = isDemoMode
    ? DEMO_ANALYTICS_SUMMARY.activityTimeline
    : hasRealInspections
    ? [
        { date: 'Recent', inspections: inspections.length, anomalies: anomalousCount || 0 },
      ]
    : [];

  const distributionData = isDataAvailable
    ? [
        {
          name: 'Normal',
          count: hasRealInspections
            ? inspections.filter((i) => i.decision === 'NORMAL').length
            : DEMO_ANALYTICS_SUMMARY.normalCount,
          color: '#4DBA8A',
        },
        {
          name: 'Anomalous',
          count: anomalousCount || 0,
          color: '#E87575',
        },
        {
          name: 'Review Req.',
          count: hasRealInspections
            ? inspections.filter((i) => i.decision === 'REVIEW_REQUIRED').length
            : DEMO_ANALYTICS_SUMMARY.reviewRequiredCount,
          color: '#E7B566',
        },
      ]
    : [];

  // Recent flagged images
  const flaggedImages = inspections.filter(
    (i) => i.decision === 'ANOMALY_DETECTED' || i.decision === 'REVIEW_REQUIRED'
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#292E3B]/70">
        <div>
          <h1 className="text-xl font-semibold text-[#F1F2F6] tracking-tight">
            Inspection Overview
          </h1>
          <p className="text-xs text-[#969EAF] mt-0.5">
            Monitor industrial surface inspections and anomaly detection results.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/inspect')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white bg-[#A78BFA] hover:bg-[#B9A4FF] text-[#0B0D12] font-semibold rounded-md transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            New Inspection
          </button>
        </div>
      </div>

      {/* Backend Disconnected Notice (Truthful State) */}
      {health.status !== 'online' && !isDemoMode && (
        <div className="p-4 rounded-lg bg-[#161A24] border border-[#292E3B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-[#969EAF]">
            <div className="p-1.5 rounded bg-[#1C2130] text-[#E7B566]">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-[#F1F2F6]">
                FastAPI Backend Not Connected.
              </span>{' '}
              <span>
                Real live inference requires a running backend server. Inspection records will populate once inspections are conducted.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsDemoMode(true)}
              className="px-3 py-1.5 rounded text-xs font-medium text-[#A78BFA] bg-[#28223D] hover:bg-[#322B4D] border border-[#3D325C] transition-colors"
            >
              Enable Isolated Demo Mode
            </button>
            <Link
              to="/settings"
              className="px-3 py-1.5 rounded text-xs font-medium text-[#969EAF] hover:text-[#F1F2F6] bg-[#1C2130] hover:bg-[#222737] border border-[#292E3B] transition-colors"
            >
              Configure API
            </Link>
          </div>
        </div>
      )}

      {/* Demo Mode Notice */}
      {isDemoMode && (
        <div className="p-3 rounded-lg bg-[#28223D]/60 border border-[#3D325C] flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#A78BFA]">
            <Database className="w-4 h-4 shrink-0" />
            <span>
              <strong>Isolated Demo Mode Active:</strong> Displaying benchmark inspection records from the MVTec AD metal_nut dataset for design evaluation.
            </span>
          </div>
          <button
            onClick={() => setIsDemoMode(false)}
            className="text-[11px] underline text-[#969EAF] hover:text-[#F1F2F6]"
          >
            Switch to Live API Mode
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Inspections"
          value={totalInspections}
          icon={ScanEye}
          secondaryContext={
            isDemoMode ? 'Benchmark demo set' : totalInspections ? 'Total surface samples processed' : 'Awaiting first run'
          }
        />
        <MetricCard
          label="Anomalous Images"
          value={anomalousCount}
          icon={AlertTriangle}
          secondaryContext={
            anomalousCount !== null ? 'Detected surface defects' : 'Awaiting inspections'
          }
          accent={Boolean(anomalousCount && anomalousCount > 0)}
        />
        <MetricCard
          label="Anomaly Rate"
          value={anomalyRate}
          unit="%"
          icon={Percent}
          secondaryContext="Defect proportion of inspected parts"
        />
        <MetricCard
          label="Avg Inference Time"
          value={avgInferenceTime}
          unit="ms"
          icon={Clock}
          secondaryContext="PatchCore coreset search duration"
        />
      </div>

      {/* Analytics Section or Empty State */}
      {isDataAvailable ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Inspection Activity Chart */}
          <div className="lg:col-span-2 rounded-lg border border-[#292E3B] bg-[#161A24] p-4.5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-semibold text-[#F1F2F6] uppercase tracking-wider">
                  Inspection Activity Timeline
                </h3>
                <p className="text-[11px] text-[#737D90]">
                  Daily volume of nominal and anomalous surface checks
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span className="flex items-center gap-1.5 text-[#969EAF]">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#A78BFA]" />
                  Total Checks
                </span>
                <span className="flex items-center gap-1.5 text-[#969EAF]">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#E87575]" />
                  Anomalies
                </span>
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#A78BFA" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="anomalyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E87575" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#E87575" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#292E3B" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#737D90"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#292E3B' }}
                  />
                  <YAxis
                    stroke="#737D90"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#292E3B' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#161A24',
                      borderColor: '#292E3B',
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: '#F1F2F6',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="inspections"
                    name="Inspections"
                    stroke="#A78BFA"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#totalGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="anomalies"
                    name="Anomalies"
                    stroke="#E87575"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#anomalyGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Outcome Distribution */}
          <div className="rounded-lg border border-[#292E3B] bg-[#161A24] p-4.5 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-semibold text-[#F1F2F6] uppercase tracking-wider mb-1">
                Outcome Distribution
              </h3>
              <p className="text-[11px] text-[#737D90] mb-4">
                Inspection classification breakdown
              </p>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distributionData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#292E3B" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#737D90"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#292E3B' }}
                  />
                  <YAxis
                    stroke="#737D90"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#292E3B' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#161A24',
                      borderColor: '#292E3B',
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: '#F1F2F6',
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 pt-2 border-t border-[#292E3B] flex items-center justify-between text-[11px] text-[#969EAF]">
              <span>Normal: {distributionData[0]?.count || 0}</span>
              <span>Defect: {distributionData[1]?.count || 0}</span>
              <span>Review: {distributionData[2]?.count || 0}</span>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={BarChart2}
          title="No Inspection Activity Recorded"
          description="Inspection activity timelines and anomaly outcome distributions will appear here once the backend is connected and surface inspections have been performed."
          action={{
            label: 'Go to AI Inspection Workbench',
            onClick: () => navigate('/inspect'),
          }}
        />
      )}

      {/* Two-Column Bottom Strip: Recent Flagged Specimen Thumbnails + Model Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Flagged Images */}
        <div className="lg:col-span-2 rounded-lg border border-[#292E3B] bg-[#161A24] p-4.5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-semibold text-[#F1F2F6] uppercase tracking-wider">
                Recent Flagged Defects
              </h3>
              <p className="text-[11px] text-[#737D90]">
                Surfaces triggering anomaly threshold alarms
              </p>
            </div>
            <Link
              to="/history"
              className="text-xs text-[#A78BFA] hover:text-[#B9A4FF] flex items-center gap-1"
            >
              <span>View All History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {flaggedImages.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {flaggedImages.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/history/${item.id}`)}
                  className="rounded bg-[#1C2130] border border-[#292E3B] hover:border-[#3D325C] p-2.5 cursor-pointer transition-colors group"
                >
                  <div className="relative aspect-square bg-[#0B0D12] rounded overflow-hidden mb-2 border border-[#292E3B]">
                    <img
                      src={item.anomalyMapUrl || item.originalImageUrl}
                      alt={item.filename}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-1.5 right-1.5">
                      <StatusBadge decision={item.decision} size="sm" />
                    </div>
                  </div>
                  <p className="text-xs font-mono font-medium text-[#F1F2F6] group-hover:text-[#A78BFA] truncate">
                    {item.id}
                  </p>
                  <div className="flex justify-between text-[10px] text-[#737D90] font-mono mt-0.5">
                    <span>Score: {item.anomalyScore.toFixed(3)}</span>
                    <span>{item.inferenceDurationMs.toFixed(0)} ms</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-[#737D90] bg-[#10131B] rounded border border-[#292E3B]/60">
              No defect specimens flagged yet. Normal parts will not appear in this flagged list.
            </div>
          )}
        </div>

        {/* Model Architecture Status Card */}
        <div className="rounded-lg border border-[#292E3B] bg-[#161A24] p-4.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-[#F1F2F6] uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#A78BFA]" />
                Target Model Specs
              </h3>
              {health.status === 'online' ? (
                <span className="text-[10px] font-mono text-[#4DBA8A]">ONLINE</span>
              ) : (
                <span className="text-[10px] font-mono text-[#737D90]">SPECIFICATION</span>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#292E3B]">
                <span className="text-[#969EAF]">Architecture</span>
                <span className="font-mono text-[#F1F2F6]">PatchCore (PyTorch)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#292E3B]">
                <span className="text-[#969EAF]">Backbone</span>
                <span className="font-mono text-[#F1F2F6]">WideResNet-50-2</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#292E3B]">
                <span className="text-[#969EAF]">Target Specimen</span>
                <span className="font-mono text-[#A78BFA]">metal_nut (MVTec)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#292E3B]">
                <span className="text-[#969EAF]">Inference Engine</span>
                <span className="font-mono text-[#F1F2F6]">FastAPI / Anomalib</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[#969EAF]">Backend Link</span>
                <span className="font-mono text-[11px] text-[#969EAF]">
                  {health.status === 'online' ? 'Connected' : 'Pending Configuration'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#292E3B]">
            <Link
              to="/performance"
              className="text-xs text-[#A78BFA] hover:text-[#B9A4FF] flex items-center justify-between"
            >
              <span>View Benchmark Performance</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Inspections Table */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-[#F1F2F6] uppercase tracking-wider">
            Recent Inspection Log
          </h3>
          {inspections.length > 0 && (
            <Link
              to="/history"
              className="text-xs text-[#969EAF] hover:text-[#F1F2F6] transition-colors"
            >
              View Full History ({inspections.length})
            </Link>
          )}
        </div>

        {inspections.length > 0 ? (
          <InspectionTable inspections={inspections.slice(0, 5)} />
        ) : (
          <div className="rounded-lg border border-[#292E3B] bg-[#161A24] p-8 text-center text-xs text-[#737D90]">
            No inspection records logged in current session. Upload a surface image in the AI Inspection Workbench to begin.
          </div>
        )}
      </div>
    </div>
  );
};
