'use client';

import { useState, type FormEvent } from 'react';
import { Button, Input } from '@sidpro/ui';
import { apiFetch } from '@/lib/api';
import { getPublicTenantCode } from '@/lib/tenant';

export default function BantuanAiPage() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAsk(e: FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ question: string; answer: string }>(
        `/assistant/public/ask?tenantCode=${encodeURIComponent(getPublicTenantCode())}`,
        { method: 'POST', body: JSON.stringify({ question: question.trim() }) },
      );
      setAnswer(res.data?.answer ?? 'Tidak ada jawaban.');
    } catch {
      setError('Gagal menghubungi asisten. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page max-w-2xl py-10">
      <h1 className="text-2xl font-bold text-slate-900">Asisten Layanan Desa</h1>
      <p className="mt-1 text-slate-600">
        FAQ otomatis untuk pertanyaan umum layanan administrasi desa (tanpa data pribadi).
      </p>

      <form className="mt-6 space-y-3" onSubmit={onAsk}>
        <Input
          placeholder="Contoh: Bagaimana cara mengajukan surat domisili?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <Button type="submit" disabled={loading}>
          {loading ? 'Mencari jawaban...' : 'Tanya'}
        </Button>
      </form>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {answer && (
        <div className="mt-6 rounded-lg border border-emerald-100 bg-emerald-50/50 p-4 text-sm text-slate-700">
          {answer}
        </div>
      )}
    </div>
  );
}
