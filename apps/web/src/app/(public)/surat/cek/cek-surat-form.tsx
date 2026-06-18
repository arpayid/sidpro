'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { publicLetterTrackSchema, type PublicLetterTrackInput } from '@sidpro/validators';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Badge } from '@sidpro/ui';
import { AlertCircle, FileText, Search } from 'lucide-react';
import { ApprovalStepper, Timeline } from '@/components/enterprise/approval-stepper';
import { LETTER_STATUS_LABELS } from '@/features/letters/use-letters';
import { useTrackPublicLetter } from '@/features/letters/use-public-letter-track';
import { getPublicTenantCode } from '@/lib/tenant';

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function CekSuratForm() {
  const searchParams = useSearchParams();
  const trackMutation = useTrackPublicLetter();
  const tenantCode = getPublicTenantCode();

  const form = useForm<PublicLetterTrackInput>({
    resolver: zodResolver(publicLetterTrackSchema),
    defaultValues: {
      ticket: '',
      nikLast4: '',
    },
  });

  useEffect(() => {
    const ticket = searchParams.get('ticket');
    if (ticket) {
      form.setValue('ticket', ticket.toUpperCase());
    }
  }, [searchParams, form]);

  async function onSubmit(values: PublicLetterTrackInput) {
    await trackMutation.mutateAsync(values);
  }

  const result = trackMutation.data;

  return (
    <div className="container-page py-10">
      <h1 className="page-title">Cek Status Permohonan Surat</h1>
      <p className="page-description">
        Masukkan nomor tiket dan 4 digit terakhir NIK pemohon untuk melihat progres permohonan surat.
      </p>

      <Card className="mx-auto mt-8 max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Lacak Permohonan Surat</CardTitle>
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
                placeholder="SRT-XXXXXXXX"
                {...form.register('ticket')}
                onChange={(e) => form.setValue('ticket', e.target.value.toUpperCase())}
              />
              {form.formState.errors.ticket && (
                <p className="form-error">{form.formState.errors.ticket.message}</p>
              )}
            </div>
            <div>
              <label className="form-label" htmlFor="nikLast4">
                4 Digit Terakhir NIK Pemohon
              </label>
              <Input
                id="nikLast4"
                inputMode="numeric"
                maxLength={4}
                placeholder="1234"
                {...form.register('nikLast4')}
              />
              {form.formState.errors.nikLast4 && (
                <p className="form-error">{form.formState.errors.nikLast4.message}</p>
              )}
            </div>
            <Button type="submit" disabled={trackMutation.isPending} className="w-full">
              {trackMutation.isPending ? 'Mencari...' : 'Cek Status'}
            </Button>
          </form>

          {trackMutation.isError && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {(trackMutation.error as Error)?.message ??
                  'Permohonan surat tidak ditemukan. Periksa tiket dan NIK.'}
              </span>
            </div>
          )}

          {result && (
            <div className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-600" />
                  <span className="font-semibold">{result.ticket}</span>
                </div>
                <Badge variant="secondary">
                  {LETTER_STATUS_LABELS[result.status] ?? result.statusLabel}
                </Badge>
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Jenis Surat</dt>
                  <dd className="text-right font-medium">{result.letterType}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Keperluan</dt>
                  <dd className="max-w-[60%] text-right font-medium">{result.purpose}</dd>
                </div>
                {result.letterNumber && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Nomor Surat</dt>
                    <dd className="text-right font-medium">{result.letterNumber}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Diajukan</dt>
                  <dd className="text-right">{formatDateTime(result.submittedAt)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Terakhir Diperbarui</dt>
                  <dd className="text-right">{formatDateTime(result.updatedAt)}</dd>
                </div>
              </dl>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Progres
                </p>
                <ApprovalStepper currentStatus={result.status} />
              </div>
              {result.timeline.length > 0 && (
                <Timeline
                  items={result.timeline.map((entry) => ({
                    title: entry.label,
                    subtitle: formatDateTime(entry.at),
                  }))}
                />
              )}
            </div>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            Surat sudah terbit?{' '}
            <Link href="/verifikasi-surat" className="font-medium text-emerald-600 hover:underline">
              Verifikasi keaslian surat
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
