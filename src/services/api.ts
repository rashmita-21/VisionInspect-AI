/**
 * API Service Layer for VisionInspect AI
 * Connects to Python FastAPI backend.
 */

import {
  BackendHealth,
  InspectionResult,
  ModelInfo,
  EvaluationMetrics,
  AnalyticsSummary,
} from '../types/inspection';

const STORAGE_API_BASE_KEY = 'visioninspect_api_base_url';

export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_API_BASE_KEY);
    if (saved) return saved.trim();
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
};

export const setApiBaseUrl = (url: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_API_BASE_KEY, url.trim());
  }
};

export class ApiError extends Error {
  status?: number;
  data?: unknown;

  constructor(message: string, status?: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
      let errorData = null;
      try {
        errorData = await response.json();
        if (errorData?.detail) {
          errorMessage = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
        } else if (errorData?.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // response wasn't JSON
      }
      throw new ApiError(errorMessage, response.status, errorData);
    }

    return (await response.json()) as T;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) throw err;
    if ((err as Error)?.name === 'AbortError') {
      throw new ApiError('Request timed out while waiting for backend response.');
    }
    throw new ApiError(
      (err as Error)?.message || 'Failed to communicate with FastAPI backend'
    );
  }
}

export const resolveMediaUrl = (url?: string | null): string => {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }
  const base = getApiBaseUrl().replace(/\/+$/, '');
  return `${base}${url.startsWith('/') ? url : `/${url}`}`;
};

const normalizeInspectionUrls = (item: InspectionResult): InspectionResult => {
  return {
    ...item,
    originalImageUrl: resolveMediaUrl(item.originalImageUrl),
    anomalyMapUrl: item.anomalyMapUrl ? resolveMediaUrl(item.anomalyMapUrl) : item.anomalyMapUrl,
    overlayUrl: item.overlayUrl ? resolveMediaUrl(item.overlayUrl) : item.overlayUrl,
  };
};

// Dedicated API endpoints
export const api = {
  // GET /health
  async checkHealth(): Promise<BackendHealth> {
    try {
      const data = await request<Partial<BackendHealth>>('/health', { method: 'GET' });
      return {
        status: (data.status as any) || 'online',
        version: data.version || '1.0.0',
        modelLoaded: Boolean(data.modelLoaded),
        modelName: data.modelName || 'PatchCore-MVTec',
        modelVersion: data.modelVersion || 'v1.0.0',
        supportedCategory: data.supportedCategory || 'metal_nut',
        uptimeSeconds: data.uptimeSeconds,
        lastChecked: new Date().toISOString(),
      };
    } catch (err) {
      return {
        status: 'offline',
        lastChecked: new Date().toISOString(),
        error: (err as Error).message || 'Connection refused or backend unavailable',
      };
    }
  },

  // GET /api/model-info
  async getModelInfo(category?: string): Promise<ModelInfo> {
    const qs = category ? `?category=${encodeURIComponent(category)}` : '';
    return request<ModelInfo>(`/api/model-info${qs}`, { method: 'GET' });
  },

  // GET /api/categories
  async getCategories(): Promise<Record<string, {
    category: string;
    isOperational: boolean;
    memoryBankVectors: number;
    threshold: number | null;
    modelPath: string;
    existsOnDisk: boolean;
  }>> {
    return request('/api/categories', { method: 'GET' });
  },

  // POST /api/inspect (multipart/form-data)
  async inspectImage(file: File, category: string = 'metal_nut'): Promise<InspectionResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    const res = await request<InspectionResult>('/api/inspect', {
      method: 'POST',
      body: formData,
    });
    return normalizeInspectionUrls(res);
  },

  // GET /api/inspections
  async getInspections(params?: {
    search?: string;
    decision?: string;
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: InspectionResult[]; total: number; page: number; pageSize: number }> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.decision && params.decision !== 'ALL') query.set('decision', params.decision);
    if (params?.category && params.category !== 'all') query.set('category', params.category);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      items: InspectionResult[];
      total: number;
      page: number;
      pageSize: number;
    }>(`/api/inspections${qs}`, { method: 'GET' });

    return {
      ...res,
      items: res.items.map(normalizeInspectionUrls),
    };
  },

  // GET /api/inspections/{id}
  async getInspectionById(id: string): Promise<InspectionResult> {
    const res = await request<InspectionResult>(`/api/inspections/${encodeURIComponent(id)}`, {
      method: 'GET',
    });
    return normalizeInspectionUrls(res);
  },

  // GET /api/analytics/summary
  async getAnalyticsSummary(category?: string): Promise<AnalyticsSummary> {
    const qs = category && category !== 'all' ? `?category=${encodeURIComponent(category)}` : '';
    return request<AnalyticsSummary>(`/api/analytics/summary${qs}`, { method: 'GET' });
  },

  // GET /api/analytics/performance
  async getEvaluationMetrics(category?: string): Promise<EvaluationMetrics> {
    const qs = category && category !== 'all' ? `?category=${encodeURIComponent(category)}` : '';
    return request<EvaluationMetrics>(`/api/analytics/performance${qs}`, { method: 'GET' });
  },

  // POST /api/assistant/chat
  async chatWithAssistant(
    message: string,
    inspectionId?: string,
    history?: { role: 'user' | 'assistant' | 'system'; content: string }[]
  ): Promise<{
    reply: string;
    groundedInspectionId?: string;
    sources?: string[];
    provider: string;
  }> {
    return request('/api/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, inspectionId, history }),
    });
  },
};
