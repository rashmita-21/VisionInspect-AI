import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ScanEye,
  History,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
  Database,
  Info,
} from 'lucide-react';
import { useBackend } from '../../context/BackendContext';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const { isDemoMode, setIsDemoMode, health } = useBackend();

  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/inspect', label: 'AI Inspection', icon: ScanEye },
    { to: '/history', label: 'Inspection History', icon: History },
    { to: '/performance', label: 'Model Performance', icon: Activity },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  const content = (
    <div className="flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-[#292E3B] shrink-0">
        <NavLink
          to="/"
          onClick={onCloseMobile}
          className="flex items-center gap-2.5 overflow-hidden focus:outline-none"
        >
          <div className="w-8 h-8 rounded-md bg-[#28223D] border border-[#3D325C] flex items-center justify-center text-[#A78BFA] shrink-0">
            <ScanEye className="w-4 h-4" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight text-[#F1F2F6] whitespace-nowrap">
                VisionInspect <span className="text-[#A78BFA] font-bold">AI</span>
              </span>
              <span className="text-[10px] text-[#737D90] font-mono uppercase tracking-wider">
                Industrial Surface CV
              </span>
            </div>
          )}
        </NavLink>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex items-center justify-center w-6 h-6 rounded text-[#737D90] hover:text-[#F1F2F6] hover:bg-[#1C2130] transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition-colors duration-150 ${
                  isActive
                    ? 'bg-[#28223D] text-[#A78BFA] border border-[#3D325C]/70 shadow-sm'
                    : 'text-[#969EAF] hover:text-[#F1F2F6] hover:bg-[#161A24]'
                } ${collapsed ? 'justify-center px-2' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Target Dataset & Demo Mode Switcher in Sidebar Footer */}
      <div className="p-3 border-t border-[#292E3B] bg-[#0E1118] shrink-0 space-y-2">
        {!collapsed ? (
          <>
            <div className="px-2 py-1.5 rounded bg-[#161A24] border border-[#292E3B] text-[11px] text-[#969EAF]">
              <div className="flex items-center justify-between text-[#737D90] font-mono text-[10px] mb-1">
                <span>TARGET SPEC</span>
                <span className="text-[#A78BFA]">MVTec AD</span>
              </div>
              <div className="flex items-center justify-between font-medium text-[#F1F2F6]">
                <span>Category</span>
                <span className="font-mono text-[#A78BFA]">metal_nut</span>
              </div>
            </div>

            {/* Isolated Demo Mode Switch */}
            <div className="px-2 py-2 rounded bg-[#161A24] border border-[#292E3B]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-[#F1F2F6] flex items-center gap-1.5">
                  <Database className="w-3 h-3 text-[#A78BFA]" />
                  Isolated Demo Mode
                </span>
                <input
                  type="checkbox"
                  id="demo-toggle"
                  checked={isDemoMode}
                  onChange={(e) => setIsDemoMode(e.target.checked)}
                  className="rounded border-[#292E3B] bg-[#1C2130] text-[#A78BFA] focus:ring-[#A78BFA] focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-[#A78BFA]"
                />
              </div>
              <p className="text-[10px] text-[#737D90] leading-snug">
                {isDemoMode
                  ? 'Active: Loading isolated MVTec AD specimen records.'
                  : 'Real API Mode: Connects to local FastAPI backend.'}
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setIsDemoMode(!isDemoMode)}
              className={`p-1.5 rounded text-xs ${
                isDemoMode
                  ? 'bg-[#28223D] text-[#A78BFA] border border-[#3D325C]'
                  : 'bg-[#161A24] text-[#737D90] border border-[#292E3B]'
              }`}
              title={`Demo Mode: ${isDemoMode ? 'Active' : 'Off'}`}
            >
              <Database className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden md:block bg-[#10131B] border-r border-[#292E3B] shrink-0 transition-all duration-200 z-20 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {content}
      </aside>

      {/* Mobile Backdrop & Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 md:hidden"
          onClick={onCloseMobile}
        >
          <div
            className="w-64 max-w-[80vw] h-full bg-[#10131B] border-r border-[#292E3B] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {content}
          </div>
        </div>
      )}
    </>
  );
};
