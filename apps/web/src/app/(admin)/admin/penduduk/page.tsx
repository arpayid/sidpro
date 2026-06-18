'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createResidentSchema, updateResidentSchema } from '@sidpro/validators';
import type { z } from 'zod';
import { Button, Input } from '@sidpro/ui';
import { Plus, Pencil, Trash2, Download, Upload } from 'lucide-react';
import { PageHeader } from '@/components/enterprise/page-header';
import { DataTable, FilterBar } from '@/components/enterprise/data-table';
import { DetailDrawer } from '@/components/enterprise/detail-drawer';
import { ConfirmDialog } from '@/components/enterprise/confirm-dialog';
import { FileUpload } from '@/components/enterprise/file-upload';
import { useAuth } from '@/hooks/use-auth';
import {
  useResidents,
  useCreateResident,
  useUpdateResident,
  useDeleteResident,
  useExportResidents,
  useImportResidents,
  type Resident,
} from '@/features/residents/use-residents';

type CreateForm = z.input<typeof createResidentSchema>;
type EditForm = z.input<typeof updateResidentSchema>;

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
          <select id="gender" className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" {...register('gender')}>
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
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | 'import' | null>(null);
  const [selected, setSelected] = useState<Resident | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Resident | null>(null);
  const [importError, setImportError] = useState('');

  const { data, isLoading, error, refetch } = useResidents({ page, limit: 20, search });
  const createMutation = useCreateResident();
  const updateMutation = useUpdateResident();
  const deleteMutation = useDeleteResident();
  const exportMutation = useExportResidents();
  const importMutation = useImportResidents();

  const isCreate = drawerMode === 'create';
  const isEdit = drawerMode === 'edit';

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createResidentSchema),
    defaultValues,
  });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(updateResidentSchema),
  });

  function openCreate() {
    createForm.reset(defaultValues);
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

  async function onCreateSubmit(values: CreateForm) {
    const parsed = createResidentSchema.parse(values);
    await createMutation.mutateAsync(parsed);
    setDrawerMode(null);
  }

  async function onEditSubmit(values: EditForm) {
    if (!selected) return;
    await updateMutation.mutateAsync({ id: selected.id, body: values });
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

  const residents = data?.data ?? [];
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
              <span className="font-mono text-xs" title={can('population.view_sensitive') ? row.nik : 'NIK disamarkan'}>
                {row.nik}
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
            render: (row) => STATUS_LABELS[row.residentStatus] ?? row.residentStatus,
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
        onRowClick={(row) => can('population.update') && openEdit(row)}
        page={page}
        totalPages={totalPages}
        total={meta?.total}
        onPageChange={setPage}
        toolbar={
          <FilterBar
            search={search}
            onSearchChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            searchPlaceholder="Cari nama atau NIK..."
          />
        }
        rowActions={
          can('population.update') || can('population.delete')
            ? (row) => (
                <div className="flex justify-end gap-1">
                  {can('population.update') && (
                    <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
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

      <DetailDrawer
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
          <ResidentFormFields
            register={createForm.register}
            errors={createForm.formState.errors}
          />
        </form>
      </DetailDrawer>

      <DetailDrawer
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
