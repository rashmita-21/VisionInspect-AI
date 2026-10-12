import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export const AppShell: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0B0D12] text-[#F1F2F6]">
      {/* Sidebar Navigation */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        mobileOpen={mobileDrawerOpen}
        onCloseMobile={() => setMobileDrawerOpen(false)}
      />

      {/* Main Container */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        {/* Topbar */}
        <Topbar onOpenMobile={() => setMobileDrawerOpen(true)} />

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto bg-[#0B0D12] p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
