import React, { useRef, useState, useCallback } from 'react';
import { Upload, X, RefreshCw, FileText, CheckCircle2, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { SAMPLE_PRESETS, SampleImagePreset } from '../../services/demoData';

interface ImageUploaderProps {
  selectedFile: File | null;
  previewUrl: string | null;
  imageDimensions: { width: number; height: number } | null;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  onLoadPreset?: (preset: SampleImagePreset) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  selectedFile,
  previewUrl,
  imageDimensions,
  onFileSelect,
  onClear,
  onLoadPreset,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateAndHandle = useCallback(
    (file: File) => {
      setValidationError(null);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setValidationError('Invalid format. Accepted surface image formats are JPG, JPEG, and PNG.');
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setValidationError(
          `File size exceeds 15 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB). Please select a compressed inspection specimen.`
        );
        return;
      }

      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndHandle(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndHandle(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        className="hidden"
        onChange={handleFileInputChange}
        disabled={disabled}
      />

      {/* Validation Error Banner */}
      {validationError && (
        <div className="p-3 rounded-md bg-[#2B1618] border border-[#4B2225] flex items-start gap-2.5 text-xs text-[#E87575]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Upload Validation Failed: </span>
            {validationError}
          </div>
          <button
            onClick={() => setValidationError(null)}
            className="text-[#969EAF] hover:text-[#F1F2F6]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {!previewUrl ? (
        /* Upload Drag & Drop Surface */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`relative rounded-lg border-2 border-dashed p-8 md:p-12 text-center cursor-pointer transition-all duration-200 ${
            isDragOver
              ? 'border-[#A78BFA] bg-[#28223D]/50'
              : 'border-[#292E3B] bg-[#161A24] hover:border-[#3D325C] hover:bg-[#1C2130]'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-lg bg-[#1C2130] border border-[#292E3B] flex items-center justify-center text-[#A78BFA] mb-4">
              <Upload className="w-6 h-6" />
            </div>

            <h3 className="text-sm font-semibold text-[#F1F2F6] mb-1">
              Upload Industrial Surface Image
            </h3>
            <p className="text-xs text-[#969EAF] mb-4 text-balance">
              Drag and drop high-resolution inspection image here, or click to browse files
            </p>

            <button
              type="button"
              disabled={disabled}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#F1F2F6] bg-[#222737] hover:bg-[#28223D] hover:text-[#A78BFA] border border-[#292E3B] rounded-md transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Browse Local Files
            </button>

            <div className="mt-4 flex items-center gap-3 text-[11px] text-[#737D90] font-mono">
              <span>JPG, JPEG, PNG</span>
              <span>·</span>
              <span>Max 15 MB</span>
              <span>·</span>
              <span>Target: metal_nut</span>
            </div>
          </div>
        </div>
      ) : (
        /* Selected Image Preview with Metadata and Quick Controls */
        <div className="rounded-lg border border-[#292E3B] bg-[#161A24] overflow-hidden">
          <div className="p-3.5 bg-[#1C2130] border-b border-[#292E3B] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded bg-[#161A24] text-[#A78BFA]">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#F1F2F6] truncate max-w-xs md:max-w-md">
                  {selectedFile ? selectedFile.name : 'Selected Inspection Specimen'}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-[#969EAF] font-mono">
                  {selectedFile && <span>{formatFileSize(selectedFile.size)}</span>}
                  {imageDimensions && (
                    <>
                      <span>·</span>
                      <span>{imageDimensions.width} × {imageDimensions.height} px</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#969EAF] hover:text-[#F1F2F6] bg-[#161A24] hover:bg-[#222737] border border-[#292E3B] rounded transition-colors"
                title="Select another image"
              >
                <RefreshCw className="w-3 h-3" />
                <span className="hidden sm:inline">Replace</span>
              </button>
              <button
                type="button"
                onClick={onClear}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#E87575] hover:bg-[#2B1618] border border-[#292E3B] hover:border-[#4B2225] rounded transition-colors"
                title="Remove selected image"
              >
                <X className="w-3 h-3" />
                <span className="hidden sm:inline">Remove</span>
              </button>
            </div>
          </div>

          {/* Centered Preview Canvas */}
          <div className="p-6 bg-[#0E1118] flex items-center justify-center min-h-[300px] max-h-[460px] overflow-hidden">
            <img
              src={previewUrl}
              alt="Uploaded surface specimen preview"
              className="max-h-[380px] max-w-full object-contain rounded border border-[#292E3B]/80 shadow-md"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}

      {/* Preset Specimen Quick-Loader (For testing & recruitment demonstration) */}
      {onLoadPreset && (
        <div className="rounded-lg border border-[#292E3B] bg-[#10131B] p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#F1F2F6] flex items-center gap-1.5">
              <span>Benchmark Specimens</span>
              <span className="text-[10px] font-mono text-[#737D90]">(MVTec AD Dataset)</span>
            </span>
            <span className="text-[10px] text-[#969EAF]">Click to load test specimen</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {SAMPLE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                disabled={disabled}
                onClick={() => onLoadPreset(preset)}
                className="flex items-center gap-2.5 p-2 rounded bg-[#161A24] hover:bg-[#1C2130] border border-[#292E3B] hover:border-[#3D325C] text-left transition-colors group cursor-pointer disabled:opacity-50"
              >
                <img
                  src={preset.imageUrl}
                  alt={preset.name}
                  className="w-10 h-10 rounded object-cover border border-[#292E3B] shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[#F1F2F6] group-hover:text-[#A78BFA] truncate">
                    {preset.name}
                  </p>
                  <p className="text-[10px] text-[#737D90] font-mono">
                    {preset.expectedCondition === 'Nominal' ? (
                      <span className="text-[#4DBA8A]">Nominal</span>
                    ) : (
                      <span className="text-[#E87575]">Defective</span>
                    )}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
