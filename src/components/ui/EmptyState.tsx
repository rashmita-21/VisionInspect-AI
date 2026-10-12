import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`rounded-lg border border-[#292E3B] bg-[#161A24] p-8 text-center flex flex-col items-center justify-center max-w-xl mx-auto my-6 ${className}`}
    >
      <div className="w-11 h-11 rounded-lg bg-[#1C2130] border border-[#292E3B] flex items-center justify-center text-[#969EAF] mb-3.5">
        <Icon className="w-5 h-5 text-[#969EAF]" />
      </div>
      <h3 className="text-sm font-semibold text-[#F1F2F6] mb-1.5">{title}</h3>
      <p className="text-xs text-[#969EAF] max-w-md leading-relaxed mb-4">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center justify-center px-4 py-2 text-xs font-medium text-[#F1F2F6] bg-[#222737] hover:bg-[#28223D] hover:text-[#A78BFA] border border-[#292E3B] rounded-md transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
