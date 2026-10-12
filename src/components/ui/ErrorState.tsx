import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Inspection Service Error',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`rounded-lg border border-[#4B2225] bg-[#1F1416] p-5 text-left flex flex-col sm:flex-row items-start gap-3.5 ${className}`}
    >
      <div className="p-1.5 rounded-md bg-[#2B1618] text-[#E87575] shrink-0 mt-0.5">
        <AlertCircle className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-semibold text-[#F1F2F6]">{title}</h4>
        <p className="mt-1 text-xs text-[#E87575] leading-relaxed break-words">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#F1F2F6] bg-[#2B1618] hover:bg-[#3D1F23] border border-[#4B2225] rounded transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Request
          </button>
        )}
      </div>
    </div>
  );
};
