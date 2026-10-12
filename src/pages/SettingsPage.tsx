import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Server,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Cpu,
  FileCode,
  ShieldCheck,
  ExternalLink,
  Save,
  Terminal,
} from 'lucide-react';
import { useBackend } from '../context/BackendContext';
import { StatusBadge } from '../components/ui/StatusBadge';

export const SettingsPage: React.FC = () => {
  const { apiUrl, setApiUrl, health, isChecking, checkConnection } = useBackend();

  const [inputUrl, setInputUrl] = useState<string>(apiUrl);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    status: 'success' | 'failed' | null;
    message: string;
  }>({ status: null, message: '' });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setApiUrl(inputUrl.trim());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleTestConnection = async () => {
    setTestResult({ status: null, message: '' });
    const result = await checkConnection();

    if (result.status === 'online') {
      setTestResult({
        status: 'success',
        message: `Successfully connected to FastAPI server (v${result.version || '1.0.0'}). Model: ${
          result.modelName || 'PatchCore'
        }`,
      });
    } else {
      setTestResult({
        status: 'failed',
        message: `Failed to reach backend at ${inputUrl}. Error: ${
          result.error || 'Connection refused. Ensure server is running and CORS is configured.'
        }`,
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-2 border-b border-[#292E3B]/70">
        <h1 className="text-xl font-semibold text-[#F1F2F6] tracking-tight">
          System & API Settings
        </h1>
        <p className="text-xs text-[#969EAF] mt-0.5">
          Configure the Python FastAPI inference endpoint, inspection parameters, and model targets.
        </p>
      </div>

      {/* SECTION 1: API Configuration */}
      <div className="rounded-lg border border-[#292E3B] bg-[#161A24] p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#292E3B]">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-[#A78BFA]" />
            <h2 className="text-xs font-semibold text-[#F1F2F6] uppercase tracking-wider">
              FastAPI Backend Endpoint
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#737D90]">Current Status:</span>
            {health.status === 'online' ? (
              <span className="text-xs font-mono text-[#4DBA8A] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Online
              </span>
            ) : (
              <span className="text-xs font-mono text-[#E7B566] flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Disconnected
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label
              htmlFor="api-url-input"
              className="block text-xs font-medium text-[#969EAF] mb-1.5"
            >
              Backend Base URL (supports HTTP / HTTPS / localhost)
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                id="api-url-input"
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="http://localhost:8000"
                className="flex-1 bg-[#10131B] border border-[#292E3B] focus:border-[#A78BFA] rounded px-3 py-2 text-xs font-mono text-[#F1F2F6] placeholder-[#737D90] focus:outline-none transition-colors"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-[#F1F2F6] bg-[#222737] hover:bg-[#28223D] hover:text-[#A78BFA] border border-[#292E3B] rounded transition-colors shrink-0"
              >
                <Save className="w-3.5 h-3.5" />
                Save URL
              </button>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isChecking}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-[#0B0D12] bg-[#A78BFA] hover:bg-[#B9A4FF] rounded transition-colors shrink-0 font-semibold disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                Test Connection
              </button>
            </div>
          </div>

          {saveSuccess && (
            <p className="text-xs text-[#4DBA8A] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              API base URL saved to local configuration.
            </p>
          )}

          {testResult.status === 'success' && (
            <div className="p-3 rounded bg-[#132A20] border border-[#1E4332] text-xs text-[#4DBA8A] flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{testResult.message}</span>
            </div>
          )}

          {testResult.status === 'failed' && (
            <div className="p-3 rounded bg-[#2B1618] border border-[#4B2225] text-xs text-[#E87575] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{testResult.message}</span>
            </div>
          )}
        </form>

        {/* FastAPI Server Integration Quick Reference */}
        <div className="rounded bg-[#10131B] border border-[#292E3B] p-3 text-xs space-y-2">
          <div className="flex items-center gap-1.5 text-[#F1F2F6] font-medium">
            <Terminal className="w-3.5 h-3.5 text-[#A78BFA]" />
            <span>FastAPI Server Quick-Start Spec</span>
          </div>
          <p className="text-[#969EAF] text-[11px] leading-relaxed">
            To connect a custom backend, run a Python service exposing CORS for this origin:
          </p>
          <pre className="p-2.5 rounded bg-[#0B0D12] border border-[#292E3B]/70 font-mono text-[11px] text-[#A78BFA] overflow-x-auto">
{`# Sample FastAPI Minimal Router
from fastapi import FastAPI, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/health")
def health():
    return {"status": "online", "modelLoaded": True, "modelVersion": "v0.9.4"}

@app.post("/api/inspect")
async def inspect(file: UploadFile):
    # Pass image bytes into PyTorch PatchCore inference pipeline
    return {"id": "INS-1001", "anomalyScore": 0.12, "threshold": 0.50, "decision": "NORMAL", ...}`}
          </pre>
        </div>
      </div>

      {/* SECTION 2: Model Architecture & Target Specs */}
      <div className="rounded-lg border border-[#292E3B] bg-[#161A24] p-5 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-[#292E3B]">
          <Cpu className="w-4 h-4 text-[#A78BFA]" />
          <h2 className="text-xs font-semibold text-[#F1F2F6] uppercase tracking-wider">
            Model Specifications & Weights
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded bg-[#1C2130] border border-[#292E3B]">
            <span className="text-[10px] text-[#737D90] uppercase font-mono block">Algorithm Architecture</span>
            <span className="font-mono text-[#F1F2F6] text-sm block mt-0.5">PatchCore (Anomalib / PyTorch)</span>
            <span className="text-[11px] text-[#969EAF] mt-1 block">Local patch neighborhood coreset subsampling</span>
          </div>

          <div className="p-3 rounded bg-[#1C2130] border border-[#292E3B]">
            <span className="text-[10px] text-[#737D90] uppercase font-mono block">Feature Extractor Backbone</span>
            <span className="font-mono text-[#F1F2F6] text-sm block mt-0.5">WideResNet-50-2</span>
            <span className="text-[11px] text-[#969EAF] mt-1 block">ImageNet pretrained multi-scale receptive field</span>
          </div>

          <div className="p-3 rounded bg-[#1C2130] border border-[#292E3B]">
            <span className="text-[10px] text-[#737D90] uppercase font-mono block">Target Specimen Domain</span>
            <span className="font-mono text-[#A78BFA] text-sm block mt-0.5">metal_nut (MVTec AD)</span>
            <span className="text-[11px] text-[#969EAF] mt-1 block">Hexagonal threaded machined steel surface</span>
          </div>

          <div className="p-3 rounded bg-[#1C2130] border border-[#292E3B]">
            <span className="text-[10px] text-[#737D90] uppercase font-mono block">Input Receptive Dimension</span>
            <span className="font-mono text-[#F1F2F6] text-sm block mt-0.5">224 × 224 px (Patch: 28×28)</span>
            <span className="text-[11px] text-[#969EAF] mt-1 block">Normalized tensor tensor shape: [1, 3, 224, 224]</span>
          </div>
        </div>
      </div>

      {/* SECTION 3: Inspection Constraints */}
      <div className="rounded-lg border border-[#292E3B] bg-[#161A24] p-5 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-[#292E3B]">
          <ShieldCheck className="w-4 h-4 text-[#A78BFA]" />
          <h2 className="text-xs font-semibold text-[#F1F2F6] uppercase tracking-wider">
            Inspection Ingestion Parameters
          </h2>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1.5 border-b border-[#292E3B]/70">
            <span className="text-[#969EAF]">Accepted File Types</span>
            <span className="font-mono text-[#F1F2F6]">JPG, JPEG, PNG (MIME: image/jpeg, image/png)</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-[#292E3B]/70">
            <span className="text-[#969EAF]">Max Client File Size</span>
            <span className="font-mono text-[#F1F2F6]">15 MB (15,728,640 bytes)</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-[#292E3B]/70">
            <span className="text-[#969EAF]">Decision Boundary Default</span>
            <span className="font-mono text-[#A78BFA]">0.50 (99th percentile of nominal coreset distance)</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-[#969EAF]">Data Persistence</span>
            <span className="font-mono text-[#F1F2F6]">Session Storage + FastAPI Database Proxy</span>
          </div>
        </div>
      </div>

      {/* SECTION 4: About & Attributions */}
      <div className="rounded-lg border border-[#292E3B] bg-[#161A24] p-5 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-[#292E3B]">
          <FileCode className="w-4 h-4 text-[#A78BFA]" />
          <h2 className="text-xs font-semibold text-[#F1F2F6] uppercase tracking-wider">
            About VisionInspect AI
          </h2>
        </div>

        <div className="space-y-2 text-xs text-[#969EAF] leading-relaxed">
          <p>
            <strong className="text-[#F1F2F6]">VisionInspect AI</strong> is an industrial visual anomaly detection and inspection analytics platform designed for precision manufacturing and quality assurance workflows.
          </p>
          <p>
            <strong>Benchmark Dataset Attribution:</strong> The benchmark specimens and baseline metrics utilize the <strong className="text-[#F1F2F6]">MVTec Anomaly Detection Dataset (MVTec AD)</strong> by Paul Bergmann et al., MVTec Software GmbH.
          </p>
          <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-[#737D90] border-t border-[#292E3B]">
            <span>Version: 1.0.0-prod</span>
            <span>Stack: React · Vite · TypeScript · Tailwind · FastAPI Bridge</span>
          </div>
        </div>
      </div>
    </div>
  );
};
