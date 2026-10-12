import React from 'react';

export const LoadingSkeleton: React.FC<{ rows?: number; className?: string }> = ({
  rows = 4,
  className = '',
}) => {
  return (
    <div className={`space-y-3 animate-pulse ${className}`}>
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="h-9 bg-[#1C2130] rounded border border-[#292E3B]/60 w-full"
        />
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`rounded-lg border border-[#292E3B] bg-[#161A24] p-4.5 animate-pulse ${className}`}>
      <div className="h-3.5 bg-[#1C2130] rounded w-28 mb-3" />
      <div className="h-7 bg-[#1C2130] rounded w-16 mb-2" />
      <div className="h-3 bg-[#1C2130] rounded w-36" />
    </div>
  );
};
