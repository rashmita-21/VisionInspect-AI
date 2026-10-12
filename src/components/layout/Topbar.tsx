import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, RefreshCw, Layers, ShieldAlert, CheckCircle2, ChevronRight, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useBackend } from '../../context/BackendContext';
import { InspectionAssistantModal } from '../assistant/InspectionAssistantModal';

interface TopbarProps {
  onOpenMobile: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenMobile }) => {
  const location = useLocation();
  const { health, isChecking, checkConnection, isDemoMode } = useBackend();
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  // Compute breadcrumbs
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/') return [{ label: 'Overview', to: '/' }];
    if (path === '/inspect') return [{ label: 'AI Inspection Workbench', to: '/inspect' }];
    if (path.startsWith('/history/')) {
      const id = path.split('/')[2];
      return [
        { label: 'Inspection History', to: '/history' },
        { label: id || 'Inspection Record', to: path },
      ];
    }
    if (path === '/history') return [{ label: 'Inspection History', to: '/history' }];
    if (path === '/performance') return [{ label: 'Model Performance', to: '/performance' }];
    if (path === '/settings') return [{ label: 'Settings & API Config', to: '/settings' }];
    return [{ label: 'Industrial Inspection', to: '/' }];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <>
      <header className="h-14 bg-[#10131B] border-b border-[#292E3B] px-4 md:px-6 flex items-center justify-between gap-4 shrink-0 select-none">
        {/* Left Zone: Mobile toggle + Breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenMobile}
            className="md:hidden p-1.5 rounded text-[#969EAF] hover:text-[#F1F2F6] hover:bg-[#1C2130]"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb Trail */}
          <nav className="flex items-center gap-1.5 text-xs text-[#969EAF] min-w-0">
            <span className="hidden sm:inline-flex items-center gap-1 text-[#737D90] font-mono shrink-0">
              <Layers className="w-3.5 h-3.5 text-[#A78BFA]" />
              <span>Industrial Inspection</span>
            </span>
            <ChevronRight className="hidden sm:inline w-3 h-3 text-[#737D90] shrink-0" />
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={crumb.to + idx}>
                  {idx > 0 && <ChevronRight className="w-3 h-3 text-[#737D90] shrink-0" />}
                  {isLast ? (
                    <span className="font-medium text-[#F1F2F6] truncate max-w-[200px] sm:max-w-none">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      to={crumb.to}
                      className="hover:text-[#F1F2F6] transition-colors truncate"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        </div>

        {/* Right Zone: Genuine Connection Status + Demo Badge + Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Isolated Demo Badge if activated */}
          {isDemoMode && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-[#A78BFA] bg-[#28223D] border border-[#3D325C]">
              Isolated Demo Active
            </span>
          )}

          {/* Real Backend Connection Indicator */}
          <div className="flex items-center gap-2">
            {health.status === 'online' ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-[#4DBA8A] bg-[#132A20] border border-[#1E4332]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Model Online</span>
                <span className="sm:hidden">Online</span>
              </div>
            ) : (
              <Link
                to="/settings"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-[#969EAF] bg-[#161A24] border border-[#292E3B] hover:border-[#3D325C] hover:text-[#F1F2F6] transition-colors"
                title="Click to configure backend API endpoint in Settings"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-[#E7B566]" />
                <span className="hidden sm:inline">Backend Not Connected</span>
                <span className="sm:hidden text-[11px]">Offline</span>
              </Link>
            )}

            {/* Refresh Connection Status Button */}
            <button
              onClick={() => checkConnection()}
              disabled={isChecking}
              className={`p-1.5 rounded text-[#737D90] hover:text-[#F1F2F6] hover:bg-[#1C2130] transition-colors ${isChecking ? 'animate-spin text-[#A78BFA]' : ''
                }`}
              title="Check FastAPI backend connection"
              aria-label="Check FastAPI backend connection"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* AI Quality Control Assistant Button */}
          <button
            onClick={() => setIsAssistantOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-[#A78BFA] bg-[#28223D] border border-[#3D325C] hover:bg-[#342b50] hover:text-[#C4B5FD] transition-colors"
            title="Ask Industrial Inspection Assistant"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI Assistant</span>
          </button>

          {/* Quick Settings link */}
          <Link
            to="/settings"
            className="p-1.5 rounded text-[#969EAF] hover:text-[#F1F2F6] hover:bg-[#1C2130] transition-colors"
            title="Inspection & API Settings"
            aria-label="Settings"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Inspection Assistant Modal */}
      <InspectionAssistantModal
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
      />
    </>
  );
};
