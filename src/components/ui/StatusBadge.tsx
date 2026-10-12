import React from 'react';
import { AnomalyDecision } from '../../types/inspection';

interface StatusBadgeProps {
  decision?: AnomalyDecision | 'OFFLINE' | 'ONLINE' | 'DEMO' | 'CHECKING';
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  decision,
  label,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  if (decision === 'NORMAL') {
    return (
      <span
        className={`inline-flex items-center font-medium rounded border border-[#1E4332] bg-[#132A20] text-[#4DBA8A] whitespace-nowrap ${sizeClasses} ${className}`}
      >
        {label || 'Normal'}
      </span>
    );
  }

  if (decision === 'ANOMALY_DETECTED') {
    return (
      <span
        className={`inline-flex items-center font-medium rounded border border-[#4B2225] bg-[#2B1618] text-[#E87575] whitespace-nowrap ${sizeClasses} ${className}`}
      >
        {label || 'Anomaly Detected'}
      </span>
    );
  }

  if (decision === 'REVIEW_REQUIRED') {
    return (
      <span
        className={`inline-flex items-center font-medium rounded border border-[#4A3B1F] bg-[#2D2415] text-[#E7B566] whitespace-nowrap ${sizeClasses} ${className}`}
      >
        {label || 'Review Required'}
      </span>
    );
  }

  if (decision === 'ONLINE') {
    return (
      <span
        className={`inline-flex items-center font-medium rounded border border-[#1E4332] bg-[#132A20] text-[#4DBA8A] whitespace-nowrap ${sizeClasses} ${className}`}
      >
        {label || 'Model Connected'}
      </span>
    );
  }

  if (decision === 'DEMO') {
    return (
      <span
        className={`inline-flex items-center font-medium rounded border border-[#3D325C] bg-[#28223D] text-[#A78BFA] whitespace-nowrap ${sizeClasses} ${className}`}
      >
        {label || 'Demo Test Data'}
      </span>
    );
  }

  // OFFLINE or fallback
  return (
    <span
      className={`inline-flex items-center font-medium rounded border border-[#292E3B] bg-[#1C2130] text-[#969EAF] whitespace-nowrap ${sizeClasses} ${className}`}
    >
      {label || 'Backend Not Connected'}
    </span>
  );
};
