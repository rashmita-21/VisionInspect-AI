import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BackendProvider } from './context/BackendContext';
import { AppShell } from './components/layout/AppShell';
import { OverviewPage } from './pages/OverviewPage';
import { InspectPage } from './pages/InspectPage';
import { HistoryPage } from './pages/HistoryPage';
import { InspectionDetailPage } from './pages/InspectionDetailPage';
import { PerformancePage } from './pages/PerformancePage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <BackendProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<OverviewPage />} />
            <Route path="inspect" element={<InspectPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="history/:id" element={<InspectionDetailPage />} />
            <Route path="performance" element={<PerformancePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </BackendProvider>
  );
}
