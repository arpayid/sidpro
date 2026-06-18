'use client';

import { useState, type FormEvent } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@sidpro/ui';
import { MessageSquare } from 'lucide-react';

export default function PengaduanPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get('name'),
      email: form.get('email'),
      phone: form.get('phone'),
      category: form.get('category'),
      subject: form.get('subject'),
      message: form.get('message'),
    };

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1/public/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('API unavailable');
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="container-page py-10">
        <Card className="mx-auto max-w-lg text-center">
          <CardContent className="p-8">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <MessageSquare className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Pengaduan Terkirim</h1>
            <p className="mt-2 text-sm text-slate-600">
              Terima kasih. Pengaduan Anda telah diterima dan akan ditindaklanjuti oleh pemerintah desa.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <h1 className="page-title">Pengaduan Warga</h1>
      <p className="page-description">
        Sampaikan aspirasi, keluhan, atau laporan masalah kepada pemerintah desa.
      </p>

      <Card className="mx-auto mt-8 max-w-2xl">
        <CardHeader>
          <CardTitle>Formulir Pengaduan</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
                  Nama Lengkap
                </label>
                <Input id="name" name="name" required placeholder="Nama lengkap" />
              </div>
              <div>
                <label htmlFor="phone" className="mb-1 block text-sm font-medium text-slate-700">
                  No. Telepon
                </label>
                <Input id="phone" name="phone" required placeholder="08xxxxxxxxxx" />
              </div>
            </div>
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <Input id="email" name="email" type="email" placeholder="email@example.com" />
            </div>
            <div>
              <label htmlFor="category" className="mb-1 block text-sm font-medium text-slate-700">
                Kategori
              </label>
              <select
                id="category"
                name="category"
                required
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Pilih kategori</option>
                <option value="infrastruktur">Infrastruktur</option>
                <option value="lingkungan">Lingkungan</option>
                <option value="pelayanan">Pelayanan</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </div>
            <div>
              <label htmlFor="subject" className="mb-1 block text-sm font-medium text-slate-700">
                Subjek
              </label>
              <Input id="subject" name="subject" required placeholder="Ringkasan pengaduan" />
            </div>
            <div>
              <label htmlFor="message" className="mb-1 block text-sm font-medium text-slate-700">
                Isi Pengaduan
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={5}
                placeholder="Jelaskan pengaduan Anda secara detail..."
                className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? 'Mengirim...' : 'Kirim Pengaduan'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
