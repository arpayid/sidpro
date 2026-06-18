'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { Upload, X, FileIcon } from 'lucide-react';
import { cn } from '@sidpro/ui';
import { Button } from '@sidpro/ui';

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

export function FileUpload({
  accept = DEFAULT_TYPES.join(','),
  maxSize = DEFAULT_MAX_SIZE,
  onFileSelect,
  disabled,
  label = 'Unggah file',
}: {
  accept?: string;
  maxSize?: number;
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  function validate(f: File): boolean {
    setError('');
    if (f.size > maxSize) {
      setError(`Ukuran file maksimal ${Math.round(maxSize / 1024 / 1024)}MB`);
      return false;
    }
    const allowed = accept.split(',').map((t) => t.trim());
    if (allowed.length && !allowed.some((t) => f.type === t || t === '*/*')) {
      setError('Tipe file tidak diizinkan');
      return false;
    }
    return true;
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (validate(f)) {
      setFile(f);
      onFileSelect(f);
    }
    e.target.value = '';
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled}
        onChange={handleChange}
      />
      {!file ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-4 py-8 text-center transition-colors hover:border-emerald-400 hover:bg-emerald-50/30',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          <Upload className="mb-2 h-8 w-8 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">{label}</span>
          <span className="mt-1 text-xs text-slate-500">PDF, JPG, PNG, Excel — max 5MB</span>
        </button>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
          <FileIcon className="h-8 w-8 text-emerald-600" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{file.name}</p>
            <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setFile(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
