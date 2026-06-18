'use client';

import { useMemo, useState } from 'react';
import { Button, Input } from '@sidpro/ui';
import { Plus, Check, UserPlus, MessageSquare, XCircle, Download } from 'lucide-react';
import { PageHeader } from '@/components/enterprise/page-header';
import { DataTable, FilterBar } from '@/components/enterprise/data-table';
import { DetailDrawer } from '@/components/enterprise/detail-drawer';
import { ConfirmDialog } from '@/components/enterprise/confirm-dialog';
import { StatusBadge, complaintStatusVariant } from '@/components/enterprise/status-badge';
import { ComplaintStepper, Timeline } from '@/components/enterprise/approval-stepper';
import { FileUpload } from '@/components/enterprise/file-upload';
import { useAuth } from '@/hooks/use-auth';
import { useUsers } from '@/features/users/use-users';
import {
  useComplaints,
  useComplaint,
  useCreateComplaint,
  useUpdateComplaintStatus,
  useAssignComplaint,
  useAddComplaintResponse,
  useCloseComplaint,
  useDownloadComplaintFile,
  useUploadComplaintAttachment,
  useExportComplaints,
  COMPLAINT_STATUS_LABELS,
  COMPLAINT_PRIORITY_LABELS,
  type Complaint,
} from '@/features/complaints/use-complaints';

const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'submitted', label: 'Masuk' },
  { value: 'verified', label: 'Diverifikasi' },
  { value: 'assigned', label: 'Ditugaskan' },
  { value: 'in_progress', label: 'Diproses' },
  { value: 'resolved', label: 'Selesai' },
  { value: 'rejected', label: 'Ditolak' },
  { value: 'closed', label: 'Ditutup' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'Semua Prioritas' },
  { value: 'low', label: 'Rendah' },
  { value: 'medium', label: 'Sedang' },
  { value: 'high', label: 'Tinggi' },
  { value: 'urgent', label: 'Mendesak' },
];

const CATEGORIES = ['Infrastruktur', 'Lingkungan', 'Pelayanan', 'Keamanan', 'Sosial', 'Lainnya'];

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    dateTo: to.toISOString().slice(0, 10),
    dateFrom: from.toISOString().slice(0, 10),
  };
}

function selectClass() {
  return 'h-9 rounded-md border border-slate-200 bg-white px-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500';
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

export default function AdminPengaduanPage() {
  const { can, canAny } = useAuth();
  const defaults = useMemo(() => defaultDateRange(), []);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(defaults.dateFrom);
  const [dateTo, setDateTo] = useState(defaults.dateTo);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [createForm, setCreateForm] = useState<{
    title: string;
    description: string;
    category: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    location: string;
  }>({
    title: '',
    description: '',
    category: CATEGORIES[0],
    priority: 'medium',
    location: '',
  });

  const { data, isLoading, error, refetch } = useComplaints({
    page,
    limit: 20,
    search: search || undefined,
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });
  const { data: detail, isLoading: detailLoading } = useComplaint(detailId);
  const { data: usersData } = useUsers({ page: 1, limit: 100, status: 'active' });

  const createMutation = useCreateComplaint();
  const statusMutation = useUpdateComplaintStatus();
  const assignMutation = useAssignComplaint();
  const responseMutation = useAddComplaintResponse();
  const closeMutation = useCloseComplaint();
  const downloadMutation = useDownloadComplaintFile();
  const uploadMutation = useUploadComplaintAttachment();
  const exportMutation = useExportComplaints();

  const complaints = data?.data ?? [];
  const meta = data?.meta;
  const staff = usersData?.data ?? [];

  async function handleCreate() {
    await createMutation.mutateAsync(createForm);
    setCreateOpen(false);
    setCreateForm({
      title: '',
      description: '',
      category: CATEGORIES[0],
      priority: 'medium',
      location: '',
    });
  }

  async function verifyComplaint() {
    if (!detailId) return;
    await statusMutation.mutateAsync({ id: detailId, status: 'verified' });
  }

  async function assignComplaint() {
    if (!detailId || !assigneeId) return;
    await assignMutation.mutateAsync({ id: detailId, assigneeId });
    setAssigneeId('');
  }

  async function submitResponse(markResolved = false) {
    if (!detailId || !responseText.trim()) return;
    await responseMutation.mutateAsync({
      id: detailId,
      body: {
        response: responseText,
        status: markResolved ? 'resolved' : 'in_progress',
      },
    });
    setResponseText('');
  }

  async function rejectComplaint() {
    if (!detailId) return;
    await statusMutation.mutateAsync({
      id: detailId,
      status: 'rejected',
      note: responseText || 'Pengaduan ditolak',
    });
    setRejectOpen(false);
    setResponseText('');
  }

  async function closeComplaint() {
    if (!detailId) return;
    await closeMutation.mutateAsync(detailId);
  }

  function openDetail(row: Complaint) {
    setDetailId(row.id);
    setResponseText('');
    setAssigneeId(row.assignee?.id ?? '');
  }

  const isActionPending =
    statusMutation.isPending ||
    assignMutation.isPending ||
    responseMutation.isPending ||
    closeMutation.isPending;

  return (
    <div>
      <PageHeader
        title="Pengaduan Warga"
        description="Tindak lanjuti pengaduan dari masyarakat secara transparan."
        actions={
          <div className="flex gap-2">
            {can('complaints.read') && (
              <Button
                size="sm"
                variant="outline"
                disabled={exportMutation.isPending}
                onClick={() => exportMutation.mutate()}
              >
                <Download className="mr-1.5 h-4 w-4" />
                Export CSV
              </Button>
            )}
            {can('complaints.create') && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Buat Pengaduan
              </Button>
            )}
          </div>
        }
      />

      <div className="mt-6">
        <DataTable
          columns={[
            {
              key: 'title',
              header: 'Pengaduan',
              render: (row) => (
                <div className="min-w-[200px]">
                  <p className="font-medium text-slate-800">{row.title}</p>
                  <p className="text-xs text-slate-500">{row.category}</p>
                </div>
              ),
            },
            {
              key: 'priority',
              header: 'Prioritas',
              render: (row) => (
                <StatusBadge
                  variant={
                    row.priority === 'urgent' || row.priority === 'high' ? 'danger' : 'default'
                  }
                >
                  {COMPLAINT_PRIORITY_LABELS[row.priority] ?? row.priority}
                </StatusBadge>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (row) => (
                <StatusBadge variant={complaintStatusVariant(row.status)}>
                  {COMPLAINT_STATUS_LABELS[row.status] ?? row.status}
                </StatusBadge>
              ),
            },
            {
              key: 'assignee',
              header: 'Petugas',
              render: (row) => row.assignee?.name ?? '—',
            },
            {
              key: 'createdAt',
              header: 'Masuk',
              render: (row) => (
                <span className="whitespace-nowrap text-sm text-slate-600">
                  {formatDateTime(row.createdAt)}
                </span>
              ),
            },
          ]}
          data={complaints}
          loading={isLoading}
          error={error ? (error as Error).message : null}
          onRetry={() => refetch()}
          emptyTitle="Belum ada pengaduan"
          emptyDescription="Pengaduan warga akan muncul di sini."
          rowKey={(row) => row.id}
          onRowClick={openDetail}
          page={page}
          totalPages={meta?.totalPages ?? 1}
          total={meta?.total}
          onPageChange={setPage}
          toolbar={
            <FilterBar
              search={search}
              onSearchChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              searchPlaceholder="Cari judul, kategori, lokasi..."
            >
              <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className={selectClass()} />
              <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className={selectClass()} />
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={selectClass()}>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                ))}
              </select>
              <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }} className={selectClass()}>
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                ))}
              </select>
            </FilterBar>
          }
        />
      </div>

      <DetailDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Buat Pengaduan"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>Simpan</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="form-label">Judul</label>
            <Input value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Deskripsi</label>
            <textarea className="min-h-24 w-full rounded-md border border-slate-200 p-3 text-sm" value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">Kategori</label>
              <select className={selectClass() + ' w-full'} value={createForm.category} onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Prioritas</label>
              <select className={selectClass() + ' w-full'} value={createForm.priority} onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' })}>
                {PRIORITY_OPTIONS.filter((o) => o.value).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Lokasi</label>
            <Input value={createForm.location} onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })} />
          </div>
        </div>
      </DetailDrawer>

      <DetailDrawer
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        title="Detail Pengaduan"
        width="max-w-2xl"
      >
        {detailLoading && <p className="text-sm text-slate-500">Memuat...</p>}
        {detail && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{detail.title}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {detail.category} · {COMPLAINT_PRIORITY_LABELS[detail.priority]}
              </p>
            </div>

            <ComplaintStepper currentStatus={detail.status} />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-slate-400">Pelapor</p>
                <p className="text-sm text-slate-800">
                  {detail.reporter?.name ?? detail.reporterName ?? 'Anonim'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">Petugas</p>
                <p className="text-sm text-slate-800">{detail.assignee?.name ?? '—'}</p>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase text-slate-400">Deskripsi</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{detail.description}</p>
              {detail.location && (
                <p className="mt-2 text-xs text-slate-500">Lokasi: {detail.location}</p>
              )}
            </div>

            {detail.attachments && detail.attachments.length > 0 && (
              <div>
                <p className="mb-2 text-xs uppercase text-slate-400">Lampiran</p>
                <ul className="space-y-2">
                  {detail.attachments.map((file) => (
                    <li key={file.id}>
                      <button
                        type="button"
                        className="text-sm text-emerald-700 hover:underline"
                        onClick={async () => {
                          const url = await downloadMutation.mutateAsync(file.id);
                          window.open(url, '_blank');
                        }}
                      >
                        {file.path.split('/').pop()} ({Math.round(file.size / 1024)} KB)
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {canAny(['complaints.create', 'complaints.update']) && detailId && (
              <div>
                <p className="mb-2 text-xs uppercase text-slate-400">Unggah Lampiran</p>
                <FileUpload
                  label="Pilih file lampiran"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onFileSelect={async (file) => {
                    await uploadMutation.mutateAsync({ complaintId: detailId, file });
                  }}
                  disabled={uploadMutation.isPending}
                />
                {uploadMutation.isError && (
                  <p className="form-error mt-2">{(uploadMutation.error as Error).message}</p>
                )}
                {uploadMutation.isSuccess && (
                  <p className="mt-2 text-sm text-emerald-600">Lampiran berhasil diunggah.</p>
                )}
              </div>
            )}

            <div>
              <p className="mb-2 text-xs uppercase text-slate-400">Timeline Tanggapan</p>
              {detail.responses && detail.responses.length > 0 ? (
                <Timeline
                  items={detail.responses.map((r) => ({
                    title: r.status ? COMPLAINT_STATUS_LABELS[r.status] ?? r.status : 'Catatan',
                    time: formatDateTime(r.createdAt),
                    description: r.response,
                  }))}
                />
              ) : (
                <p className="text-sm text-slate-500">Belum ada tanggapan.</p>
              )}
            </div>

            {!['rejected', 'closed', 'resolved'].includes(detail.status) && (
              <div className="space-y-4 border-t border-slate-100 pt-4">
                <div className="flex flex-wrap gap-2">
                  {can('complaints.update') && detail.status === 'submitted' && (
                    <Button size="sm" onClick={verifyComplaint} disabled={isActionPending}>
                      <Check className="mr-1 h-4 w-4" /> Verifikasi
                    </Button>
                  )}
                  {can('complaints.close') && (
                    <Button size="sm" variant="outline" onClick={() => setRejectOpen(true)} disabled={isActionPending}>
                      <XCircle className="mr-1 h-4 w-4" /> Tolak
                    </Button>
                  )}
                </div>

                {can('complaints.assign') && ['verified', 'assigned', 'in_progress'].includes(detail.status) && (
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[200px] flex-1">
                      <label className="form-label">Tugaskan ke</label>
                      <select className={selectClass() + ' w-full'} value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                        <option value="">Pilih petugas</option>
                        {staff.map((u) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                    <Button size="sm" onClick={assignComplaint} disabled={!assigneeId || isActionPending}>
                      <UserPlus className="mr-1 h-4 w-4" /> Tugaskan
                    </Button>
                  </div>
                )}

                {can('complaints.respond') && ['assigned', 'in_progress'].includes(detail.status) && (
                  <div className="space-y-2">
                    <label className="form-label">Tanggapan / Catatan</label>
                    <textarea
                      className="min-h-20 w-full rounded-md border border-slate-200 p-3 text-sm"
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="Tulis update penanganan..."
                    />
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => submitResponse(false)} disabled={!responseText.trim() || isActionPending}>
                        <MessageSquare className="mr-1 h-4 w-4" /> Kirim Update
                      </Button>
                      <Button size="sm" onClick={() => submitResponse(true)} disabled={!responseText.trim() || isActionPending}>
                        Tandai Selesai
                      </Button>
                    </div>
                  </div>
                )}

                {can('complaints.close') && detail.status === 'resolved' && (
                  <Button size="sm" variant="outline" onClick={closeComplaint} disabled={isActionPending}>
                    Tutup Pengaduan
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </DetailDrawer>

      <ConfirmDialog
        open={rejectOpen}
        title="Tolak Pengaduan"
        message="Pengaduan akan ditolak dan tercatat di audit log."
        confirmLabel="Tolak"
        loading={statusMutation.isPending}
        onConfirm={rejectComplaint}
        onCancel={() => setRejectOpen(false)}
      />
    </div>
  );
}
