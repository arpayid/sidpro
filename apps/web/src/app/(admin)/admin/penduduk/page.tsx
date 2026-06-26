'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createResidentSchema,
  updateResidentSchema,
  residentMutationSchema,
} from '@sidpro/validators';
import type { z } from 'zod';
import { Button, Input } from '@sidpro/ui';
import { Plus, Pencil, Trash2, Download, Upload } from 'lucide-react';
import { PageHeader } from '@/components/enterprise/page-header';
import { DataTable, FilterBar } from '@/components/enterprise/data-table';
import { DetailDrawer } from '@/components/enterprise/detail-drawer';
import { ModalForm } from '@/components/enterprise/modal-form';
import { StatusBadge } from '@/components/enterprise/status-badge';
import { ConfirmDialog } from '@/components/enterprise/confirm-dialog';
import { FileUpload } from '@/components/enterprise/file-upload';
import { AddressFields } from '@/components/enterprise/address-fields';
import { useAuth } from '@/hooks/use-auth';
import { maskNik } from '@/lib/mask-nik';
import {
  useResidents,
  useCreateResident,
  useUpdateResident,
  useDeleteResident,
  useExportResidents,
  useImportResidents,
  useMutateResident,
  type Resident,
} from '@/features/residents/use-residents';

type CreateForm = z.input<typeof createResidentSchema>;
type EditForm = z.input<typeof updateResidentSchema>;
type MutateForm = z.input<typeof residentMutationSchema>;

const STATUS_VARIANTS: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
  permanent: 'success',
  temporary: 'info',
  moved: 'warning',
  deceased: 'danger',
};

const STATUS_LABELS: Record<string, string> = {
  permanent: 'Tetap',
  temporary: 'Sementara',
  moved: 'Pindah',
  deceased: 'Meninggal',
};

const defaultValues: CreateForm = {
  nik: '',
  fullName: '',
  gender: 'male',
  birthPlace: '',
  birthDate: '',
  religion: '',
  education: '',
  occupation: '',
  maritalStatus: '',
  residentStatus: 'permanent',
};

function ResidentFormFields({
  register,
  errors,
  isEdit,
}: {
  register: ReturnType<typeof useForm<CreateForm>>['register'];
  errors: Record<string, { message?: string } | undefined>;
  isEdit?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="form-label" htmlFor="nik">
          NIK {isEdit && <span className="text-slate-400">(tidak dapat diubah)</span>}
        </label>
        <Input id="nik" {...register('nik')} disabled={isEdit} maxLength={16} />
        {errors.nik && <p className="form-error">{errors.nik.message}</p>}
      </div>
      <div>
        <label className="form-label" htmlFor="fullName">
          Nama Lengkap
        </label>
        <Input id="fullName" {...register('fullName')} />
        {errors.fullName && <p className="form-error">{errors.fullName.message}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="form-label" htmlFor="gender">
            Jenis Kelamin
          </label>
          <select
            id="gender"
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            {...register('gender')}
          >
            <option value="male">Laki-laki</option>
            <option value="female">Perempuan</option>
          </select>
        </div>
        <div>
          <label className="form-label" htmlFor="residentStatus">
            Status Penduduk
          </label>
          <select
            id="residentStatus"
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            {...register('residentStatus')}
          >
            <option value="permanent">Tetap</option>
            <option value="temporary">Sementara</option>
            <option value="moved">Pindah</option>
            <option value="deceased">Meninggal</option>
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="form-label" htmlFor="birthPlace">
            Tempat Lahir
          </label>
          <Input id="birthPlace" {...register('birthPlace')} />
          {errors.birthPlace && <p className="form-error">{errors.birthPlace.message}</p>}
        </div>
        <div>
          <label className="form-label" htmlFor="birthDate">
            Tanggal Lahir
          </label>
          <Input id="birthDate" type="date" {...register('birthDate')} />
          {errors.birthDate && <p className="form-error">{errors.birthDate.message}</p>}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="form-label" htmlFor="religion">
            Agama
          </label>
          <Input id="religion" {...register('religion')} />
        </div>
        <div>
          <label className="form-label" htmlFor="education">
            Pendidikan
          </label>
          <Input id="education" {...register('education')} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="form-label" htmlFor="occupation">
            Pekerjaan
          </label>
          <Input id="occupation" {...register('occupation')} />
        </div>
        <div>
          <label className="form-label" htmlFor="maritalStatus">
            Status Perkawinan
          </label>
          <Input id="maritalStatus" {...register('maritalStatus')} />
        </div>
      </div>
    </div>
  );
}

export default function PendudukPage() {
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | 'import' | 'mutate' | null>(
    null,
  );
  const [selected, setSelected] = useState<Resident | null>(null);
  const [detailResident, setDetailResident] = useState<Resident | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Resident | null>(null);
  const [importError, setImportError] = useState('');
  const [address, setAddress] = useState({
    hamletId: '',
    neighborhoodUnitId: '',
    street: '',
  });

  const { data, isLoading, error, refetch } = useResidents({
    page,
    limit: pageSize,
    search,
    residentStatus: statusFilter || undefined,
  });
  const filteredResidents = (data?.data ?? []).filter((resident) =>
    genderFilter ? resident.gender === genderFilter : true,
  );
  const createMutation = useCreateResident();
  const updateMutation = useUpdateResident();
  const mutateMutation = useMutateResident();
  const deleteMutation = useDeleteResident();
  const exportMutation = useExportResidents();
  const importMutation = useImportResidents();

  const isCreate = drawerMode === 'create';
  const isEdit = drawerMode === 'edit';
  const isMutate = drawerMode === 'mutate';

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createResidentSchema),
    defaultValues,
  });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(updateResidentSchema),
  });

  const mutateForm = useForm<MutateForm>({
    resolver: zodResolver(residentMutationSchema),
    defaultValues: { residentStatus: 'moved', eventDate: '', notes: '' },
  });

  function openCreate() {
    createForm.reset(defaultValues);
    setAddress({ hamletId: '', neighborhoodUnitId: '', street: '' });
    setSelected(null);
    setDrawerMode('create');
  }

  function openEdit(resident: Resident) {
    setSelected(resident);
    editForm.reset({
      fullName: resident.fullName,
      gender: resident.gender,
      birthPlace: resident.birthPlace,
      birthDate: resident.birthDate.slice(0, 10),
      religion: resident.religion ?? '',
      education: resident.education ?? '',
      occupation: resident.occupation ?? '',
      maritalStatus: resident.maritalStatus ?? '',
      residentStatus: resident.residentStatus as CreateForm['residentStatus'],
    });
    setDrawerMode('edit');
  }

  function openMutate(resident: Resident) {
    setSelected(resident);
    mutateForm.reset({
      residentStatus: 'moved',
      eventDate: new Date().toISOString().slice(0, 10),
      notes: '',
    });
    setDrawerMode('mutate');
  }

  async function onMutateSubmit(values: MutateForm) {
    if (!selected) return;
    const parsed = residentMutationSchema.parse(values);
    await mutateMutation.mutateAsync({ id: selected.id, body: parsed });
    setDrawerMode(null);
    setSelected(null);
  }

  async function onCreateSubmit(values: CreateForm) {
    const payload = {
      ...values,
      ...(address.hamletId && address.neighborhoodUnitId
        ? {
            address: {
              hamletId: address.hamletId,
              neighborhoodUnitId: address.neighborhoodUnitId,
              street: address.street || undefined,
            },
          }
        : {}),
    };
    const parsed = createResidentSchema.parse(payload);
    await createMutation.mutateAsync(parsed);
    setDrawerMode(null);
  }

  async function onEditSubmit(values: EditForm) {
    if (!selected) return;
    const payload = {
      ...values,
      ...(address.hamletId && address.neighborhoodUnitId
        ? {
            address: {
              hamletId: address.hamletId,
              neighborhoodUnitId: address.neighborhoodUnitId,
              street: address.street || undefined,
            },
          }
        : {}),
    };
    await updateMutation.mutateAsync({ id: selected.id, body: payload });
    setDrawerMode(null);
    setSelected(null);
  }

  async function onDelete() {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  async function onImport(file: File) {
    setImportError('');
    try {
      await importMutation.mutateAsync(file);
      setDrawerMode(null);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import gagal');
    }
  }

  const residents = filteredResidents;
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <div>
      <PageHeader
        title="Data Penduduk"
        description="Kelola data kependudukan desa."
        actions={
          <div className="flex flex-wrap gap-2">
            {can('population.export') && (
              <Button
                variant="outline"
                size="sm"
                disabled={exportMutation.isPending}
                onClick={() => exportMutation.mutate()}
              >
                <Download className="mr-1.5 h-4 w-4" />
                Export
              </Button>
            )}
            {can('population.import') && (
              <Button variant="outline" size="sm" onClick={() => setDrawerMode('import')}>
                <Upload className="mr-1.5 h-4 w-4" />
                Import
              </Button>
            )}
            {can('population.create') && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="mr-1.5 h-4 w-4" />
                Tambah Penduduk
              </Button>
            )}
          </div>
        }
      />

      <DataTable
        columns={[
          {
            key: 'nik',
            header: 'NIK',
            render: (row) => (
              <span
                className="font-mono text-xs"
                title={can('population.view_sensitive') ? row.nik : 'NIK disamarkan'}
              >
                {can('population.view_sensitive') ? row.nik : maskNik(row.nik)}
              </span>
            ),
          },
          { key: 'fullName', header: 'Nama' },
          {
            key: 'gender',
            header: 'JK',
            render: (row) => (row.gender === 'male' ? 'L' : 'P'),
          },
          {
            key: 'birthDate',
            header: 'Tgl Lahir',
            render: (row) => row.birthDate.slice(0, 10),
          },
          {
            key: 'residentStatus',
            header: 'Status',
            render: (row) => (
              <StatusBadge variant={STATUS_VARIANTS[row.residentStatus] ?? 'default'}>
                {STATUS_LABELS[row.residentStatus] ?? row.residentStatus}
              </StatusBadge>
            ),
          },
          {
            key: 'address',
            header: 'RT/RW',
            render: (row) =>
              row.address ? `${row.address.rt ?? '—'}/${row.address.rw ?? '—'}` : '—',
          },
        ]}
        data={residents}
        loading={isLoading}
        error={error?.message}
        onRetry={() => refetch()}
        rowKey={(row) => row.id}
        onRowClick={(row) => setDetailResident(row)}
        page={page}
        totalPages={totalPages}
        total={genderFilter ? residents.length : meta?.total}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={(value) => {
          setPageSize(value);
          setPage(1);
        }}
        toolbar={
          <div className="flex flex-wrap items-center gap-3">
            <FilterBar
              search={search}
              onSearchChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              searchPlaceholder="Cari nama atau NIK..."
            />
            <select
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Semua status</option>
              <option value="permanent">Tetap</option>
              <option value="temporary">Sementara</option>
              <option value="moved">Pindah</option>
              <option value="deceased">Meninggal</option>
            </select>
            <select
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm"
              value={genderFilter}
              onChange={(e) => {
                setGenderFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Semua JK</option>
              <option value="male">Laki-laki</option>
              <option value="female">Perempuan</option>
            </select>
          </div>
        }
        rowActions={
          can('population.update') || can('population.delete')
            ? (row) => (
                <div className="flex justify-end gap-1">
                  {can('population.update') && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openMutate(row)}
                        title="Mutasi"
                      >
                        M
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {can('population.delete') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setDeleteTarget(row)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )
            : undefined
        }
      />

      <ModalForm
        open={isCreate}
        onClose={() => setDrawerMode(null)}
        title="Tambah Penduduk"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDrawerMode(null)}>
              Batal
            </Button>
            <Button
              disabled={createMutation.isPending}
              onClick={createForm.handleSubmit(onCreateSubmit)}
            >
              {createMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        }
      >
        <form onSubmit={createForm.handleSubmit(onCreateSubmit)}>
          <ResidentFormFields register={createForm.register} errors={createForm.formState.errors} />
          <div className="mt-4">
            <AddressFields
              hamletId={address.hamletId}
              neighborhoodUnitId={address.neighborhoodUnitId}
              street={address.street}
              onHamletChange={(id) =>
                setAddress((a) => ({ ...a, hamletId: id, neighborhoodUnitId: '' }))
              }
              onNeighborhoodUnitChange={(id) =>
                setAddress((a) => ({ ...a, neighborhoodUnitId: id }))
              }
              onStreetChange={(street) => setAddress((a) => ({ ...a, street }))}
            />
          </div>
        </form>
      </ModalForm>

      <ModalForm
        open={isEdit}
        onClose={() => {
          setDrawerMode(null);
          setSelected(null);
        }}
        title="Edit Penduduk"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDrawerMode(null)}>
              Batal
            </Button>
            <Button
              disabled={updateMutation.isPending}
              onClick={editForm.handleSubmit(onEditSubmit)}
            >
              {updateMutation.isPending ? 'Menyimpan...' : 'Perbarui'}
            </Button>
          </div>
        }
      >
        {selected && (
          <div className="mb-4 rounded-md bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-500">NIK: </span>
            <span className="font-mono">{selected.nik}</span>
          </div>
        )}
        <form onSubmit={editForm.handleSubmit(onEditSubmit)}>
          <ResidentFormFields
            register={editForm.register as ReturnType<typeof useForm<CreateForm>>['register']}
            errors={editForm.formState.errors}
            isEdit
          />
          <div className="mt-4">
            <AddressFields
              hamletId={address.hamletId}
              neighborhoodUnitId={address.neighborhoodUnitId}
              street={address.street}
              onHamletChange={(id) =>
                setAddress((a) => ({ ...a, hamletId: id, neighborhoodUnitId: '' }))
              }
              onNeighborhoodUnitChange={(id) =>
                setAddress((a) => ({ ...a, neighborhoodUnitId: id }))
              }
              onStreetChange={(street) => setAddress((a) => ({ ...a, street }))}
            />
          </div>
        </form>
      </ModalForm>

      <DetailDrawer
        open={Boolean(detailResident)}
        onClose={() => setDetailResident(null)}
        title="Detail Penduduk"
        width="max-w-2xl"
        footer={
          detailResident && can('population.update') ? (
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => openMutate(detailResident)}>
                Catat Mutasi
              </Button>
              <Button size="sm" onClick={() => openEdit(detailResident)}>
                Edit
              </Button>
            </div>
          ) : undefined
        }
      >
        {detailResident && (
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Nama</dt>
              <dd className="font-medium">{detailResident.fullName}</dd>
            </div>
            <div>
              <dt className="text-slate-500">NIK</dt>
              <dd className="font-mono">
                {can('population.view_sensitive')
                  ? detailResident.nik
                  : maskNik(detailResident.nik)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Status</dt>
              <dd>
                <StatusBadge variant={STATUS_VARIANTS[detailResident.residentStatus] ?? 'default'}>
                  {STATUS_LABELS[detailResident.residentStatus] ?? detailResident.residentStatus}
                </StatusBadge>
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Jenis Kelamin</dt>
              <dd>{detailResident.gender === 'male' ? 'Laki-laki' : 'Perempuan'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">TTL</dt>
              <dd>
                {detailResident.birthPlace}, {detailResident.birthDate.slice(0, 10)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Nomor KK</dt>
              <dd className="font-mono">
                {detailResident.family
                  ? detailResident.family.kkNumber.replace(/(?<=.{4}).(?=.{4})/g, '•')
                  : '—'}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Alamat</dt>
              <dd>
                {detailResident.address?.fullAddress ??
                  (detailResident.address
                    ? `RT ${detailResident.address.rt ?? '—'} / RW ${detailResident.address.rw ?? '—'}`
                    : '—')}
              </dd>
            </div>
          </dl>
        )}
      </DetailDrawer>

      <DetailDrawer
        open={isMutate}
        onClose={() => {
          setDrawerMode(null);
          setSelected(null);
        }}
        title="Mutasi Penduduk"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDrawerMode(null)}>
              Batal
            </Button>
            <Button
              disabled={mutateMutation.isPending}
              onClick={mutateForm.handleSubmit(onMutateSubmit)}
            >
              {mutateMutation.isPending ? 'Menyimpan...' : 'Catat Mutasi'}
            </Button>
          </div>
        }
      >
        {selected && (
          <p className="mb-4 text-sm text-slate-600">
            Mutasi untuk: <strong>{selected.fullName}</strong>
          </p>
        )}
        <form className="space-y-4" onSubmit={mutateForm.handleSubmit(onMutateSubmit)}>
          <div>
            <label className="form-label" htmlFor="mutate-status">
              Jenis Mutasi
            </label>
            <select
              id="mutate-status"
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
              {...mutateForm.register('residentStatus')}
            >
              <option value="moved">Pindah</option>
              <option value="deceased">Meninggal</option>
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="mutate-date">
              Tanggal Kejadian
            </label>
            <Input id="mutate-date" type="date" {...mutateForm.register('eventDate')} />
            {mutateForm.formState.errors.eventDate && (
              <p className="form-error">{mutateForm.formState.errors.eventDate.message}</p>
            )}
          </div>
          <div>
            <label className="form-label" htmlFor="mutate-notes">
              Catatan
            </label>
            <textarea
              id="mutate-notes"
              rows={3}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...mutateForm.register('notes')}
            />
          </div>
        </form>
      </DetailDrawer>

      <DetailDrawer
        open={drawerMode === 'import'}
        onClose={() => setDrawerMode(null)}
        title="Import Data Penduduk"
        footer={
          <p className="text-xs text-slate-500">
            Format: Excel (.xlsx) atau CSV sesuai template SIDPRO.
          </p>
        }
      >
        <FileUpload
          accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          label="Pilih file data penduduk"
          disabled={importMutation.isPending}
          onFileSelect={onImport}
        />
        {importError && <p className="form-error mt-2">{importError}</p>}
        {importMutation.isPending && (
          <p className="mt-2 text-sm text-slate-500">Mengimpor data...</p>
        )}
      </DetailDrawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus Penduduk"
        message={`Yakin ingin menghapus "${deleteTarget?.fullName}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        loading={deleteMutation.isPending}
        onConfirm={onDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
