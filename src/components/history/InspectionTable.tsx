import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { InspectionResult } from '../../types/inspection';
import { StatusBadge } from '../ui/StatusBadge';

interface InspectionTableProps {
  inspections: InspectionResult[];
  onRowClick?: (id: string) => void;
}

export const InspectionTable: React.FC<InspectionTableProps> = ({
  inspections,
  onRowClick,
}) => {
  const navigate = useNavigate();

  const handleRowNavigate = (id: string) => {
    if (onRowClick) {
      onRowClick(id);
    } else {
      navigate(`/history/${id}`);
    }
  };

  if (inspections.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[#292E3B] bg-[#161A24]">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-[#292E3B] bg-[#1C2130] text-[#969EAF]">
            <th className="py-2.5 px-3.5 font-medium uppercase tracking-wider text-[11px]">
              ID / Specimen
            </th>
            <th className="py-2.5 px-3 font-medium uppercase tracking-wider text-[11px] w-14">
              Preview
            </th>
            <th className="py-2.5 px-3 font-medium uppercase tracking-wider text-[11px]">
              Date & Time
            </th>
            <th className="py-2.5 px-3 font-medium uppercase tracking-wider text-[11px] text-right">
              Anomaly Score
            </th>
            <th className="py-2.5 px-3 font-medium uppercase tracking-wider text-[11px] text-center">
              Decision
            </th>
            <th className="py-2.5 px-3 font-medium uppercase tracking-wider text-[11px] text-right">
              Inference
            </th>
            <th className="py-2.5 px-3 font-medium uppercase tracking-wider text-[11px] hidden sm:table-cell">
              Model
            </th>
            <th className="py-2.5 px-3.5 text-right w-12">
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#292E3B]/60">
          {inspections.map((item) => {
            const dateStr = new Date(item.timestamp).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <tr
                key={item.id}
                onClick={() => handleRowNavigate(item.id)}
                className="hover:bg-[#1C2130]/70 cursor-pointer transition-colors duration-100 group"
              >
                {/* ID & Filename */}
                <td className="py-2.5 px-3.5 whitespace-nowrap">
                  <div className="font-mono font-medium text-[#F1F2F6] group-hover:text-[#A78BFA] transition-colors">
                    {item.id}
                  </div>
                  <div className="text-[10px] text-[#737D90] truncate max-w-[130px] font-mono">
                    {item.filename}
                  </div>
                  <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#1C2130] text-[#A78BFA] border border-[#292E3B]">
                    {item.category}
                  </span>
                </td>

                {/* Thumbnail */}
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <div className="w-9 h-9 rounded bg-[#0B0D12] border border-[#292E3B] overflow-hidden flex items-center justify-center">
                    {item.originalImageUrl ? (
                      <img
                        src={item.originalImageUrl}
                        alt="Thumbnail"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <ImageIcon className="w-3.5 h-3.5 text-[#737D90]" />
                    )}
                  </div>
                </td>

                {/* Timestamp */}
                <td className="py-2.5 px-3 whitespace-nowrap text-[#969EAF] font-mono text-[11px]">
                  {dateStr}
                </td>

                {/* Anomaly Score */}
                <td className="py-2.5 px-3 whitespace-nowrap text-right">
                  <span
                    className={`font-mono font-medium tabular-nums ${item.anomalyScore >= item.threshold
                        ? 'text-[#E87575]'
                        : item.anomalyScore >= item.threshold * 0.8
                          ? 'text-[#E7B566]'
                          : 'text-[#4DBA8A]'
                      }`}
                  >
                    {item.anomalyScore.toFixed(3)}
                  </span>
                  <span className="text-[10px] text-[#737D90] font-mono block">
                    th: {item.threshold.toFixed(2)}
                  </span>
                </td>

                {/* Model Decision */}
                <td className="py-2.5 px-3 whitespace-nowrap text-center">
                  <StatusBadge decision={item.decision} size="sm" />
                </td>

                {/* Inference Duration */}
                <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono tabular-nums text-[#F1F2F6]">
                  {item.inferenceDurationMs.toFixed(1)} ms
                </td>

                {/* Model Version */}
                <td className="py-2.5 px-3 whitespace-nowrap text-[#737D90] font-mono text-[11px] hidden sm:table-cell">
                  {item.modelVersion}
                </td>

                {/* View Details Action */}
                <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                  <span className="p-1 rounded text-[#737D90] group-hover:text-[#A78BFA] transition-colors inline-block">
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
