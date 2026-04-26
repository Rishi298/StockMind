'use client';

import { useState, useRef } from 'react';
import { Upload, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';

interface Props {
  onImported: () => void;
}

export function ZerodhaImport({ onImported }: Props) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setStatus('uploading');
    setMessage('');
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch('/api/zerodha/csv-import', { method: 'POST', body: form });
      const data = await res.json() as { imported?: number; message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Import failed');
      setStatus('success');
      setMessage(data.message ?? `Imported ${data.imported} holding(s) from Zerodha`);
      onImported();
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : 'Import failed');
    }
  }

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-6 w-6 rounded bg-[#387ED1]/15 flex items-center justify-center">
          <span className="text-[10px] font-bold text-[#387ED1]">Z</span>
        </div>
        <h3 className="text-sm font-semibold text-stone-300">Import from Zerodha</h3>
      </div>

      <p className="text-xs text-stone-500 mb-3">
        Download your Holdings CSV from{' '}
        <a href="https://console.zerodha.com/portfolio/holdings" target="_blank" rel="noopener noreferrer"
          className="text-[#387ED1] hover:underline inline-flex items-center gap-0.5">
          Zerodha Console <ExternalLink className="h-3 w-3" />
        </a>
        {' '}and upload it below.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      <button
        onClick={() => fileRef.current?.click()}
        disabled={status === 'uploading'}
        className="flex items-center gap-2 px-4 py-2 bg-stone-800 border border-stone-700 hover:border-[#387ED1] text-stone-300 text-xs rounded-lg transition-colors disabled:opacity-50"
      >
        <Upload className="h-3.5 w-3.5" />
        {status === 'uploading' ? 'Importing...' : 'Upload CSV'}
      </button>

      {status === 'success' && (
        <div className="flex items-center gap-2 mt-3 text-xs text-emerald-400">
          <CheckCircle className="h-3.5 w-3.5" /> {message}
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2 mt-3 text-xs text-red-400">
          <AlertCircle className="h-3.5 w-3.5" /> {message}
        </div>
      )}
    </div>
  );
}
