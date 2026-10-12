import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  icon: LucideIcon;
  secondaryContext?: string;
  accent?: boolean;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  icon: Icon,
  secondaryContext,
  accent = false,
  className = '',
}) => {
  const displayValue = value === null || value === undefined || value === '' ? '—' : value;

  return (
    <div
      className={`rounded-lg border border-[#292E3B] bg-[#161A24] p-4.5 transition-colors duration-150 ${
        accent ? 'border-[#3D325C]/80 shadow-[0_0_0_1px_rgba(167,139,250,0.1)]' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <span className="text-xs font-medium uppercase tracking-wider text-[#969EAF]">
          {label}
        </span>
        <div className={`p-1.5 rounded-md ${accent ? 'bg-[#28223D] text-[#A78BFA]' : 'bg-[#1C2130] text-[#737D90]'}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span
          className={`text-2xl font-semibold tabular-nums ${
            accent ? 'text-[#F1F2F6]' : 'text-[#F1F2F6]'
          }`}
        >
          {displayValue}
        </span>
        {unit && displayValue !== '—' && (
          <span className="text-xs text-[#969EAF] font-medium">{unit}</span>
        )}
      </div>

      {secondaryContext && (
        <p className="mt-2 text-xs text-[#737D90] font-normal leading-relaxed truncate">
          {secondaryContext}
        </p>
      )}
    </div>
  );
};
