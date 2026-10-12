import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between py-3 px-2 text-xs text-[#969EAF]">
      <div className="font-mono text-[11px]">
        Showing <span className="text-[#F1F2F6]">{startItem}</span>–<span className="text-[#F1F2F6]">{endItem}</span> of{' '}
        <span className="text-[#F1F2F6]">{totalItems}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded bg-[#161A24] border border-[#292E3B] text-[#969EAF] hover:text-[#F1F2F6] hover:bg-[#1C2130] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <span className="px-2.5 py-1 rounded bg-[#10131B] border border-[#292E3B] font-mono text-[11px] text-[#F1F2F6]">
          {currentPage} / {totalPages}
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded bg-[#161A24] border border-[#292E3B] text-[#969EAF] hover:text-[#F1F2F6] hover:bg-[#1C2130] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
