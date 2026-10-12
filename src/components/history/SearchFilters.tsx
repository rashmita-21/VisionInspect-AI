import { Search, Filter, X, Layers } from 'lucide-react';
import { AnomalyDecision } from '../../types/inspection';
import { SUPPORTED_CATEGORIES } from '../../services/demoData';

interface SearchFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusFilterChange: (s: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (c: string) => void;
  onReset: () => void;
  totalFiltered: number;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  onReset,
  totalFiltered,
}) => {
  const isFiltered = searchQuery.trim() !== '' || statusFilter !== 'ALL' || categoryFilter !== 'ALL';

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#161A24] p-3 rounded-lg border border-[#292E3B]">
      {/* Search Bar */}
      <div className="relative flex-1 max-w-md">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#737D90]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by Inspection ID or filename..."
          className="w-full bg-[#10131B] border border-[#292E3B] rounded pl-8 pr-3 py-1.5 text-xs text-[#F1F2F6] placeholder-[#737D90] focus:outline-none focus:border-[#A78BFA] transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#737D90] hover:text-[#F1F2F6]"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Category Select Dropdown */}
      <div className="flex items-center gap-1.5 bg-[#10131B] rounded border border-[#292E3B] px-2 py-1 text-xs">
        <Layers className="w-3.5 h-3.5 text-[#737D90]" />
        <select
          value={categoryFilter}
          onChange={(e) => onCategoryFilterChange(e.target.value)}
          className="bg-transparent text-xs text-[#F1F2F6] focus:outline-none cursor-pointer"
        >
          <option value="ALL" className="bg-[#10131B] text-[#F1F2F6]">
            All Categories
          </option>
          {SUPPORTED_CATEGORIES.map((cat) => (
            <option key={cat} value={cat} className="bg-[#10131B] text-[#F1F2F6]">
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Status Filter Segmented Controls */}
      <div className="flex items-center bg-[#10131B] rounded border border-[#292E3B] p-0.5 text-xs">
        {[
          { id: 'ALL', label: 'All' },
          { id: 'NORMAL', label: 'Normal' },
          { id: 'ANOMALY_DETECTED', label: 'Defect' },
          { id: 'REVIEW_REQUIRED', label: 'Review' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => onStatusFilterChange(tab.id)}
            className={`px-2.5 py-1 rounded text-xs transition-colors ${statusFilter === tab.id
              ? 'bg-[#28223D] text-[#A78BFA] font-medium'
              : 'text-[#969EAF] hover:text-[#F1F2F6]'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isFiltered && (
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-[#969EAF] hover:text-[#F1F2F6] bg-[#1C2130] hover:bg-[#222737] rounded border border-[#292E3B] transition-colors"
        >
          <X className="w-3 h-3" />
          Clear
        </button>
      )}

      <span className="text-[11px] font-mono text-[#737D90] ml-1">
        {totalFiltered} records
      </span>
    </div>
  );
};
