import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, ShieldAlert, Database, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useBackend } from '../context/BackendContext';
import { InspectionTable } from '../components/history/InspectionTable';
import { SearchFilters } from '../components/history/SearchFilters';
import { Pagination } from '../components/history/Pagination';
import { EmptyState } from '../components/ui/EmptyState';
import { DEMO_HISTORY_RECORDS } from '../services/demoData';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    inspections,
    health,
    isDemoMode,
    setIsDemoMode,
    clearSessionInspections,
  } = useBackend();

  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Filter logic
  const filteredRecords = useMemo(() => {
    return inspections.filter((item) => {
      // Search by ID or filename
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = item.id.toLowerCase().includes(q);
        const matchesFilename = item.filename.toLowerCase().includes(q);
        if (!matchesId && !matchesFilename) return false;
      }

      // Category filter
      if (categoryFilter !== 'ALL') {
        if (item.category !== categoryFilter) return false;
      }

      // Status filter
      if (statusFilter !== 'ALL') {
        if (item.decision !== statusFilter) return false;
      }

      return true;
    });
  }, [inspections, searchQuery, statusFilter, categoryFilter]);

  // Pagination slice
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#292E3B]/70">
        <div>
          <h1 className="text-xl font-semibold text-[#F1F2F6] tracking-tight">
            Inspection History
          </h1>
          <p className="text-xs text-[#969EAF] mt-0.5">
            Audit log of all surface anomaly screenings and classification records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {inspections.length > 0 && (
            <button
              onClick={clearSessionInspections}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#969EAF] hover:text-[#E87575] bg-[#161A24] hover:bg-[#2B1618] border border-[#292E3B] rounded transition-colors"
              title="Clear current session inspection history"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Session Log</span>
            </button>
          )}

          <button
            onClick={() => navigate('/inspect')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#A78BFA] hover:bg-[#B9A4FF] text-[#0B0D12] rounded transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            New Inspection
          </button>
        </div>
      </div>

      {/* Connection & Demo Notice */}
      {health.status !== 'online' && !isDemoMode && (
        <div className="p-3.5 rounded-lg bg-[#161A24] border border-[#292E3B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-[#969EAF]">
            <ShieldAlert className="w-4 h-4 text-[#E7B566] shrink-0" />
            <span>
              Real FastAPI database is not connected. Showing {inspections.length} local session inspections.
            </span>
          </div>
          <button
            onClick={() => setIsDemoMode(true)}
            className="px-3 py-1 text-xs font-medium text-[#A78BFA] bg-[#28223D] border border-[#3D325C] rounded hover:bg-[#322B4D] transition-colors shrink-0"
          >
            Load Demo History Records
          </button>
        </div>
      )}

      {isDemoMode && (
        <div className="p-3 rounded-lg bg-[#28223D]/50 border border-[#3D325C] flex items-center justify-between gap-3 text-xs text-[#A78BFA]">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 shrink-0" />
            <span>
              <strong>Isolated Demo Records:</strong> Displaying benchmark inspection records from the MVTec AD dataset.
            </span>
          </div>
          <button
            onClick={() => setIsDemoMode(false)}
            className="text-[11px] underline text-[#969EAF] hover:text-[#F1F2F6]"
          >
            Reset to Empty Live Mode
          </button>
        </div>
      )}

      {/* Search & Filters */}
      <SearchFilters
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={(s) => {
          setStatusFilter(s);
          setCurrentPage(1);
        }}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={(c) => {
          setCategoryFilter(c);
          setCurrentPage(1);
        }}
        onReset={handleResetFilters}
        totalFiltered={filteredRecords.length}
      />

      {/* Data Table or Empty State */}
      {paginatedRecords.length > 0 ? (
        <div className="space-y-3">
          <InspectionTable inspections={paginatedRecords} />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredRecords.length}
            onPageChange={setCurrentPage}
          />
        </div>
      ) : (
        <EmptyState
          icon={History}
          title={
            searchQuery || statusFilter !== 'ALL'
              ? 'No Matching Inspection Records'
              : 'No Inspection Records Logged'
          }
          description={
            searchQuery || statusFilter !== 'ALL'
              ? 'Try adjusting your search criteria or resetting the status filters to view logged records.'
              : 'Historical surface inspection records will appear here as tests are executed against the computer vision model.'
          }
          action={
            searchQuery || statusFilter !== 'ALL'
              ? {
                label: 'Clear Filter Criteria',
                onClick: handleResetFilters,
              }
              : {
                label: 'Launch AI Inspection Workbench',
                onClick: () => navigate('/inspect'),
              }
          }
        />
      )}
    </div>
  );
};
