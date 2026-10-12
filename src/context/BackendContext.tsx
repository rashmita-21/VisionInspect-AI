import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BackendHealth, InspectionResult, ModelInfo } from '../types/inspection';
import { api, getApiBaseUrl, setApiBaseUrl as saveApiBaseUrl } from '../services/api';
import { DEMO_HISTORY_RECORDS, DEMO_MODEL_INFO } from '../services/demoData';

interface BackendContextType {
  apiUrl: string;
  setApiUrl: (url: string) => void;
  health: BackendHealth;
  isChecking: boolean;
  checkConnection: () => Promise<BackendHealth>;
  isDemoMode: boolean;
  setIsDemoMode: (val: boolean) => void;
  inspections: InspectionResult[];
  addInspection: (item: InspectionResult) => void;
  clearSessionInspections: () => void;
  modelInfo: ModelInfo | null;
  refreshData: () => Promise<void>;
}

const BackendContext = createContext<BackendContextType | undefined>(undefined);

const STORAGE_DEMO_KEY = 'visioninspect_demo_mode_active';
const STORAGE_SESSION_INSPECTIONS_KEY = 'visioninspect_session_inspections';

export const BackendProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiUrl, setApiUrlState] = useState<string>(getApiBaseUrl());
  const [isDemoMode, setIsDemoModeState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_DEMO_KEY);
      // Default to false to adhere to strict truthfulness requirement:
      // "The status must reflect the actual connection state. If the backend has not been configured, show 'Backend Not Connected' or 'Model Unavailable'. Do not show a fake online indicator."
      return stored === 'true';
    }
    return false;
  });

  const [health, setHealth] = useState<BackendHealth>({
    status: 'checking',
    lastChecked: new Date().toISOString(),
  });
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);

  // Inspections list
  const [inspections, setInspections] = useState<InspectionResult[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_SESSION_INSPECTIONS_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // ignore error
        }
      }
    }
    return [];
  });

  const setApiUrl = (url: string) => {
    saveApiBaseUrl(url);
    setApiUrlState(url);
  };

  const setIsDemoMode = (val: boolean) => {
    setIsDemoModeState(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_DEMO_KEY, val ? 'true' : 'false');
    }
  };

  const addInspection = (item: InspectionResult) => {
    setInspections((prev) => {
      const updated = [item, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_SESSION_INSPECTIONS_KEY, JSON.stringify(updated.slice(0, 50)));
      }
      return updated;
    });
  };

  const clearSessionInspections = () => {
    setInspections([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_SESSION_INSPECTIONS_KEY);
    }
  };

  const checkConnection = useCallback(async (): Promise<BackendHealth> => {
    setIsChecking(true);
    try {
      const res = await api.checkHealth();
      setHealth(res);
      if (res.status === 'online') {
        try {
          const info = await api.getModelInfo();
          setModelInfo(info);
        } catch {
          setModelInfo(null);
        }
        try {
          const persisted = await api.getInspections({ limit: 50 });
          if (persisted?.items && persisted.items.length > 0) {
            setInspections(persisted.items);
          }
        } catch {
          // preserve existing in-memory inspections
        }
      } else {
        setModelInfo(null);
      }
      return res;
    } catch (err) {
      const fallbackHealth: BackendHealth = {
        status: 'offline',
        lastChecked: new Date().toISOString(),
        error: (err as Error).message || 'Unable to connect to FastAPI server',
      };
      setHealth(fallbackHealth);
      setModelInfo(null);
      return fallbackHealth;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const refreshData = useCallback(async () => {
    await checkConnection();
  }, [checkConnection]);

  // Initial check on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Return demo records when demo mode is active and no session records exist
  const effectiveInspections = isDemoMode
    ? inspections.length > 0
      ? inspections
      : DEMO_HISTORY_RECORDS
    : inspections;

  const effectiveModelInfo = health.status === 'online' ? modelInfo : (isDemoMode ? DEMO_MODEL_INFO : null);

  return (
    <BackendContext.Provider
      value={{
        apiUrl,
        setApiUrl,
        health,
        isChecking,
        checkConnection,
        isDemoMode,
        setIsDemoMode,
        inspections: effectiveInspections,
        addInspection,
        clearSessionInspections,
        modelInfo: effectiveModelInfo,
        refreshData,
      }}
    >
      {children}
    </BackendContext.Provider>
  );
};

export const useBackend = () => {
  const context = useContext(BackendContext);
  if (!context) {
    throw new Error('useBackend must be used within a BackendProvider');
  }
  return context;
};
