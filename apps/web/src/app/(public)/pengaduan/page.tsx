'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { publicComplaintFormSchema, type PublicComplaintFormInput } from '@sidpro/validators';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@sidpro/ui';
import { MessageSquare, AlertCircle, Search } from 'lucide-react';
import { useSubmitPublicComplaint } from '@/features/complaints/use-public-complaint';
import { getPublicTenantCode } from '@/lib/tenant';

const CATEGORIES = [
  { value: 'Infrastruktur', label: 'Infrastruktur' },
  { value: 'Lingkungan', label: 'Lingkungan' },
  { value: 'Pelayanan', label: 'Pelayanan' },
  { value: 'Keamanan', label: 'Keamanan' },
  { value: 'Sosial', label: 'Sosial' },
  { value: 'Lainnya', label: 'Lainnya' },
];

function formatTicketId(id: string) {
  return `PGD-${id.slice(0, 8).toUpperCase()}`;
}

export default function PengaduanPage() {
  const submitMutation = useSubmitPublicComplaint();
  const tenantCode = getPublicTenantCode();

  const form = useForm<PublicComplaintFormInput>({
    resolver: zodResolver(publicComplaintFormSchema),
    defaultValues: {
      reporterName: '',
      reporterPhone: '',
      reporterEmail: '',
      category: '',
      title: '',
      description: '',
      priority: 'medium',
      location: '',
    },
  });

  async function onSubmit(values: PublicComplaintFormInput) {
    await submitMutation.mutateAsync(values);
  }

  if (submitMutation.isSuccess && submitMutation.data) {
    const ticket = formatTicketId(submitMutation.data.id);
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
            <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                Nomor Tiket
              </p>
              <p className="mt-1 font-mono text-lg font-semibold text-emerald-900">{ticket}</p>
              <p className="mt-2 text-xs text-emerald-700">
                Simpan nomor ini untuk mengecek status pengaduan Anda.
              </p>
            </div>
            <Link
              href={`/pengaduan/cek?ticket=${encodeURIComponent(ticket)}`}
              className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-700 sm:w-auto"
            >
              <Search className="mr-2 h-4 w-4" />
              Cek Status Pengaduan
            </Link>
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
          <p className="text-xs text-slate-500">Desa: {tenantCode}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="form-label" htmlFor="reporterName">
                  Nama Lengkap
                </label>
                <Input id="reporterName" {...form.register('reporterName')} />
                {form.formState.errors.reporterName && (
                  <p className="form-error">{form.formState.errors.reporterName.message}</p>
                )}
              </div>
              <div>
                <label className="form-label" htmlFor="reporterPhone">
                  No. Telepon
                </label>
                <Input id="reporterPhone" {...form.register('reporterPhone')} placeholder="08xxxxxxxxxx" />
                {form.formState.errors.reporterPhone && (
                  <p className="form-error">{form.formState.errors.reporterPhone.message}</p>
                )}
              </div>
            </div>
            <div>
              <label className="form-label" htmlFor="reporterEmail">
                Email <span className="text-slate-400">(opsional)</span>
              </label>
              <Input id="reporterEmail" type="email" {...form.register('reporterEmail')} />
              {form.formState.errors.reporterEmail && (
                <p className="form-error">{form.formState.errors.reporterEmail.message}</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="form-label" htmlFor="category">
                  Kategori
                </label>
                <select
                  id="category"
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  {...form.register('category')}
                >
                  <option value="">Pilih kategori</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                {form.formState.errors.category && (
                  <p className="form-error">{form.formState.errors.category.message}</p>
                )}
              </div>
              <div>
                <label className="form-label" htmlFor="priority">
                  Prioritas
                </label>
                <select
                  id="priority"
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  {...form.register('priority')}
                >
                  <option value="low">Rendah</option>
                  <option value="medium">Sedang</option>
                  <option value="high">Tinggi</option>
                  <option value="urgent">Mendesak</option>
                </select>
              </div>
            </div>
            <div>
              <label className="form-label" htmlFor="title">
                Subjek
              </label>
              <Input id="title" {...form.register('title')} placeholder="Ringkasan pengaduan" />
              {form.formState.errors.title && (
                <p className="form-error">{form.formState.errors.title.message}</p>
              )}
            </div>
            <div>
              <label className="form-label" htmlFor="location">
                Lokasi <span className="text-slate-400">(opsional)</span>
              </label>
              <Input id="location" {...form.register('location')} placeholder="RT/RW, jalan, dll." />
            </div>
            <div>
              <label className="form-label" htmlFor="description">
                Isi Pengaduan
              </label>
              <textarea
                id="description"
                rows={5}
                placeholder="Jelaskan pengaduan Anda secara detail..."
                className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                {...form.register('description')}
              />
              {form.formState.errors.description && (
                <p className="form-error">{form.formState.errors.description.message}</p>
              )}
            </div>

            {submitMutation.isError && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{(submitMutation.error as Error).message}</span>
              </div>
            )}

            <Button type="submit" disabled={submitMutation.isPending} className="w-full sm:w-auto">
              {submitMutation.isPending ? 'Mengirim...' : 'Kirim Pengaduan'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
