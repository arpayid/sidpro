'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { adminCreateLetterRequestSchema } from '@sidpro/validators';
import type { z } from 'zod';
import { Button, Input } from '@sidpro/ui';
import { Plus, Check, X, FileText, Download } from 'lucide-react';
import { PageHeader } from '@/components/enterprise/page-header';
import { DataTable, FilterBar } from '@/components/enterprise/data-table';
import { DetailDrawer } from '@/components/enterprise/detail-drawer';
import { StatusBadge, letterStatusVariant } from '@/components/enterprise/status-badge';
import { ApprovalStepper, Timeline } from '@/components/enterprise/approval-stepper';
import { useAuth } from '@/hooks/use-auth';
import {
  useLetterTypes,
  useLetterRequests,
  useLetterRequest,
  useCreateLetterRequest,
  useVerifyLetterRequest,
  useApproveLetterRequest,
  useRejectLetterRequest,
  useGenerateLetterPdf,
  useDownloadLetterPdf,
  LETTER_STATUS_LABELS,
  type LetterRequest,
} from '@/features/letters/use-letters';
import { useResidents } from '@/features/residents/use-residents';
import { maskNik } from '@/lib/mask-nik';

type CreateForm = z.infer<typeof adminCreateLetterRequestSchema>;

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'submitted', label: 'Diajukan' },
  { value: 'verified', label: 'Terverifikasi' },
  { value: 'approved', label: 'Disetujui' },
  { value: 'completed', label: 'Selesai' },
  { value: 'rejected', label: 'Ditolak' },
];

export default function SuratPage() {
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [residentSearch, setResidentSearch] = useState('');

  const { data, isLoading, error, refetch } = useLetterRequests({
    page,
    limit: 20,
    status: statusFilter || undefined,
  });
  const { data: detail, isLoading: detailLoading } = useLetterRequest(detailId);
  const { data: letterTypes } = useLetterTypes();
  const { data: residentsData } = useResidents({
    page: 1,
    limit: 50,
    search: residentSearch || undefined,
  });

  const createMutation = useCreateLetterRequest();
  const verifyMutation = useVerifyLetterRequest();
  const approveMutation = useApproveLetterRequest();
  const rejectMutation = useRejectLetterRequest();
  const generateMutation = useGenerateLetterPdf();
  const downloadMutation = useDownloadLetterPdf();

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(adminCreateLetterRequestSchema),
    defaultValues: { letterTypeId: '', residentId: '', purpose: '' },
  });

  async function onCreateSubmit(values: CreateForm) {
    await createMutation.mutateAsync(values);
    setCreateOpen(false);
    createForm.reset();
  }

  function openDetail(request: LetterRequest) {
    setDetailId(request.id);
    setActionNotes('');
  }

  const requests = data?.data ?? [];
  const meta = data?.meta;
  const isActionPending =
    verifyMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
    generateMutation.isPending ||
    downloadMutation.isPending;

  return (
    <div>
      <PageHeader
        title="Layanan Surat"
        description="Kelola pengajuan dan penerbitan surat desa."
        actions={
          <div className="flex gap-2">
            {can('letters.manage') && (
              <Link href="/admin/surat/pengaturan">
                <Button size="sm" variant="outline" type="button">
                  Pengaturan Surat
                </Button>
              </Link>
            )}
            {can('letters.create') && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Buat Permohonan
              </Button>
            )}
          </div>
        }
      />

      <section>
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Permohonan Surat</h2>
        <DataTable
          columns={[
            {
              key: 'letterType',
              header: 'Jenis Surat',
              render: (row) => row.letterType?.name ?? '—',
            },
            {
              key: 'resident',
              header: 'Pemohon',
              render: (row) => row.resident?.fullName ?? row.requester?.name ?? '—',
            },
            {
              key: 'purpose',
              header: 'Keperluan',
              render: (row) => (
                <span className="line-clamp-1 max-w-[200px]" title={row.purpose}>
                  {row.purpose}
                </span>
              ),
            },
            {
              key: 'submittedAt',
              header: 'Diajukan',
              render: (row) => new Date(row.submittedAt).toLocaleDateString('id-ID'),
            },
            {
              key: 'status',
              header: 'Status',
              render: (row) => (
                <StatusBadge variant={letterStatusVariant(row.status)}>
                  {LETTER_STATUS_LABELS[row.status] ?? row.status}
                </StatusBadge>
              ),
            },
          ]}
          data={requests}
          loading={isLoading}
          error={error?.message}
          onRetry={() => refetch()}
          rowKey={(row) => row.id}
          onRowClick={openDetail}
          page={page}
          totalPages={meta?.totalPages ?? 1}
          total={meta?.total}
          onPageChange={setPage}
          toolbar={
            <FilterBar>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </FilterBar>
          }
        />
      </section>

      <DetailDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Buat Permohonan Surat"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={createMutation.isPending}
              onClick={createForm.handleSubmit(onCreateSubmit)}
            >
              {createMutation.isPending ? 'Mengajukan...' : 'Ajukan'}
            </Button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={createForm.handleSubmit(onCreateSubmit)}>
          <div>
            <label className="form-label" htmlFor="letterTypeId">
              Jenis Surat
            </label>
            <select
              id="letterTypeId"
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
              {...createForm.register('letterTypeId')}
            >
              <option value="">— Pilih jenis surat —</option>
              {(letterTypes ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {createForm.formState.errors.letterTypeId && (
              <p className="form-error">{createForm.formState.errors.letterTypeId.message}</p>
            )}
          </div>
          <div>
            <label className="form-label">Cari Penduduk</label>
            <Input
              placeholder="Ketik nama pemohon..."
              value={residentSearch}
              onChange={(e) => setResidentSearch(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="residentId">
              Penduduk Pemohon <span className="text-red-500">*</span>
            </label>
            <select
              id="residentId"
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
              {...createForm.register('residentId')}
            >
              <option value="">— Pilih penduduk —</option>
              {(residentsData?.data ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.fullName} ({maskNik(r.nik)})
                </option>
              ))}
            </select>
            {createForm.formState.errors.residentId && (
              <p className="form-error">{createForm.formState.errors.residentId.message}</p>
            )}
          </div>
          <div>
            <label className="form-label" htmlFor="purpose">
              Keperluan / Alasan
            </label>
            <textarea
              id="purpose"
              rows={4}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              {...createForm.register('purpose')}
            />
            {createForm.formState.errors.purpose && (
              <p className="form-error">{createForm.formState.errors.purpose.message}</p>
            )}
          </div>
        </form>
      </DetailDrawer>

      <DetailDrawer
        open={Boolean(detailId)}
        onClose={() => {
          setDetailId(null);
          setActionNotes('');
        }}
        title="Detail Permohonan Surat"
        width="max-w-2xl"
        footer={
          detail && !['completed', 'rejected'].includes(detail.status) ? (
            <div className="flex flex-wrap gap-2">
              {detail.status === 'submitted' && can('letters.verify') && (
                <>
                  <Button
                    size="sm"
                    disabled={isActionPending}
                    onClick={() =>
                      detailId &&
                      verifyMutation.mutate({ id: detailId, approved: true, notes: actionNotes })
                    }
                  >
                    <Check className="mr-1 h-4 w-4" />
                    Verifikasi
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600"
                    disabled={isActionPending}
                    onClick={() =>
                      detailId &&
                      verifyMutation.mutate({ id: detailId, approved: false, notes: actionNotes })
                    }
                  >
                    <X className="mr-1 h-4 w-4" />
                    Tolak Verifikasi
                  </Button>
                </>
              )}
              {detail.status === 'verified' && can('letters.approve') && (
                <>
                  <Button
                    size="sm"
                    disabled={isActionPending}
                    onClick={() =>
                      detailId &&
                      approveMutation.mutate({ id: detailId, approved: true, notes: actionNotes })
                    }
                  >
                    <Check className="mr-1 h-4 w-4" />
                    Setujui
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600"
                    disabled={isActionPending}
                    onClick={() =>
                      detailId &&
                      approveMutation.mutate({ id: detailId, approved: false, notes: actionNotes })
                    }
                  >
                    <X className="mr-1 h-4 w-4" />
                    Tolak
                  </Button>
                </>
              )}
              {['submitted', 'verified'].includes(detail.status) && can('letters.reject') && (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isActionPending}
                  onClick={() => detailId && rejectMutation.mutate({ id: detailId, notes: actionNotes })}
                >
                  Tolak Permohonan
                </Button>
              )}
              {detail.status === 'approved' && can('letters.generate') && (
                <Button
                  size="sm"
                  disabled={isActionPending}
                  onClick={() => detailId && generateMutation.mutate(detailId)}
                >
                  <FileText className="mr-1 h-4 w-4" />
                  Generate PDF
                </Button>
              )}
            </div>
          ) : detail?.status === 'completed' && can('letters.download') ? (
            <Button
              size="sm"
              variant="outline"
              disabled={downloadMutation.isPending}
              onClick={async () => {
                if (!detailId) return;
                const data = await downloadMutation.mutateAsync(detailId);
                window.open(data.url, '_blank', 'noopener,noreferrer');
              }}
            >
              <Download className="mr-1 h-4 w-4" />
              {downloadMutation.isPending ? 'Menyiapkan...' : 'Unduh Surat PDF'}
            </Button>
          ) : undefined
        }
      >
        {detailLoading ? (
          <p className="text-sm text-slate-500">Memuat detail...</p>
        ) : detail ? (
          <div className="space-y-6">
            <ApprovalStepper currentStatus={detail.status} />

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Jenis Surat</dt>
                <dd className="font-medium">{detail.letterType?.name}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd>
                  <StatusBadge variant={letterStatusVariant(detail.status)}>
                    {LETTER_STATUS_LABELS[detail.status] ?? detail.status}
                  </StatusBadge>
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Pemohon</dt>
                <dd>{detail.resident?.fullName ?? detail.requester?.name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Diajukan</dt>
                <dd>{new Date(detail.submittedAt).toLocaleString('id-ID')}</dd>
              </div>
              {detail.letterNumber && (
                <div className="sm:col-span-2">
                  <dt className="text-slate-500">Nomor Surat</dt>
                  <dd className="font-mono font-medium">{detail.letterNumber}</dd>
                </div>
              )}
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Keperluan</dt>
                <dd>{detail.purpose}</dd>
              </div>
            </dl>

            {!['completed', 'rejected'].includes(detail.status) && (
              <div>
                <label className="form-label" htmlFor="actionNotes">
                  Catatan (opsional)
                </label>
                <textarea
                  id="actionNotes"
                  rows={2}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Catatan verifikasi / persetujuan..."
                />
              </div>
            )}

            {generateMutation.isSuccess && generateMutation.data?.data && (
              <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Surat PDF berhasil digenerate: {generateMutation.data.data.letterNumber}
                {detail.outputs?.[0]?.qrCode && (
                  <p className="mt-1 font-mono text-xs text-emerald-700">
                    Kode verifikasi: {detail.outputs[0].qrCode.slice(0, 8).toUpperCase()}…
                  </p>
                )}
              </div>
            )}

            {detail.outputs && detail.outputs.length > 0 && detail.status === 'completed' && (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <p className="font-medium text-slate-800">Surat siap diunduh</p>
                <p className="mt-1 text-xs text-slate-600">
                  Gunakan tombol &quot;Unduh Surat PDF&quot; untuk mendapatkan file resmi.
                </p>
              </div>
            )}

            {detail.approvals && detail.approvals.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-900">Riwayat Persetujuan</h3>
                <Timeline
                  items={detail.approvals.map((a) => ({
                    title: `${a.level} — ${a.status}`,
                    time: new Date(a.createdAt).toLocaleString('id-ID'),
                    description: a.notes ?? undefined,
                  }))}
                />
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Data tidak ditemukan.</p>
        )}
      </DetailDrawer>
    </div>
  );
}
