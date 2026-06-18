'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  publicComplaintTrackSchema,
  type PublicComplaintTrackInput,
} from '@sidpro/validators';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Badge } from '@sidpro/ui';
import { AlertCircle, ClipboardList, Search } from 'lucide-react';
import { ComplaintStepper, Timeline } from '@/components/enterprise/approval-stepper';
import {
  COMPLAINT_PRIORITY_LABELS,
  COMPLAINT_STATUS_LABELS,
} from '@/features/complaints/use-complaints';
import { useTrackPublicComplaint } from '@/features/complaints/use-public-complaint-track';
import { getPublicTenantCode } from '@/lib/tenant';

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function CekPengaduanForm() {
  const searchParams = useSearchParams();
  const trackMutation = useTrackPublicComplaint();
  const tenantCode = getPublicTenantCode();

  const form = useForm<PublicComplaintTrackInput>({
    resolver: zodResolver(publicComplaintTrackSchema),
    defaultValues: {
      ticket: '',
      reporterPhone: '',
    },
  });

  useEffect(() => {
    const ticket = searchParams.get('ticket');
    if (ticket) {
      form.setValue('ticket', ticket);
    }
  }, [searchParams, form]);

  async function onSubmit(values: PublicComplaintTrackInput) {
    await trackMutation.mutateAsync(values);
  }

  const result = trackMutation.data;

  return (
    <div className="container-page py-10">
      <h1 className="page-title">Cek Status Pengaduan</h1>
      <p className="page-description">
        Masukkan nomor tiket dan nomor telepon yang digunakan saat mengirim pengaduan.
      </p>

      <Card className="mx-auto mt-8 max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Lacak Pengaduan</CardTitle>
              <p className="text-xs text-slate-500">Desa: {tenantCode}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="form-label" htmlFor="ticket">
                Nomor Tiket
              </label>
              <Input
                id="ticket"
                placeholder="PGD-XXXXXXXX"
                {...form.register('ticket')}
              />
              {form.formState.errors.ticket && (
                <p className="form-error">{form.formState.errors.ticket.message}</p>
              )}
            </div>
            <div>
              <label className="form-label" htmlFor="reporterPhone">
                No. Telepon
              </label>
              <Input
                id="reporterPhone"
                placeholder="08xxxxxxxxxx"
                {...form.register('reporterPhone')}
              />
              {form.formState.errors.reporterPhone && (
                <p className="form-error">{form.formState.errors.reporterPhone.message}</p>
              )}
            </div>

            {trackMutation.isError && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {(trackMutation.error as Error).message ||
                    'Pengaduan tidak ditemukan. Periksa nomor tiket dan telepon Anda.'}
                </span>
              </div>
            )}

            <Button type="submit" disabled={trackMutation.isPending} className="w-full">
              {trackMutation.isPending ? 'Mencari...' : 'Cek Status'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-500">
            Belum punya tiket?{' '}
            <Link href="/pengaduan" className="font-medium text-emerald-700 hover:underline">
              Kirim pengaduan baru
            </Link>
          </p>
        </CardContent>
      </Card>

      {result && (
        <Card className="mx-auto mt-8 max-w-2xl">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Nomor Tiket
                </p>
                <p className="font-mono text-lg font-semibold text-slate-900">{result.ticket}</p>
              </div>
              <Badge variant="default">{result.statusLabel}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{result.title}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {result.category} · {COMPLAINT_PRIORITY_LABELS[result.priority] ?? result.priority}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Diajukan {formatDateTime(result.submittedAt)}
                {result.closedAt && ` · Ditutup ${formatDateTime(result.closedAt)}`}
              </p>
            </div>

            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                Progres
              </p>
              <ComplaintStepper currentStatus={result.status} />
            </div>

            {result.timeline.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Riwayat Status
                </p>
                <Timeline
                  items={result.timeline.map((entry) => ({
                    title: entry.label,
                    time: formatDateTime(entry.at),
                  }))}
                />
              </div>
            )}

            {result.responses.length > 0 && (
              <div>
                <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <ClipboardList className="h-4 w-4" />
                  Tanggapan Desa
                </p>
                <Timeline
                  items={result.responses.map((entry) => ({
                    title: 'Tanggapan',
                    time: formatDateTime(entry.at),
                    description: entry.message,
                  }))}
                />
              </div>
            )}

            {result.responses.length === 0 && (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Status saat ini:{' '}
                <span className="font-medium">
                  {COMPLAINT_STATUS_LABELS[result.status] ?? result.statusLabel}
                </span>
                . Belum ada tanggapan resmi dari pemerintah desa.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
