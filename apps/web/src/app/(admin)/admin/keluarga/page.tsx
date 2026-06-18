'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createFamilySchema, addFamilyMemberSchema } from '@sidpro/validators';
import type { z } from 'zod';
import { Button, Input } from '@sidpro/ui';
import { Plus, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/enterprise/page-header';
import { DataTable, FilterBar } from '@/components/enterprise/data-table';
import { DetailDrawer } from '@/components/enterprise/detail-drawer';
import { AddressFields } from '@/components/enterprise/address-fields';
import { useAuth } from '@/hooks/use-auth';
import {
  useFamilies,
  useFamily,
  useCreateFamily,
  useAddFamilyMember,
  type Family,
} from '@/features/families/use-families';
import { useResidents } from '@/features/residents/use-residents';

type CreateFamilyForm = z.infer<typeof createFamilySchema>;
type AddMemberForm = z.input<typeof addFamilyMemberSchema>;

export default function KeluargaPage() {
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [memberOpen, setMemberOpen] = useState(false);
  const [residentSearch, setResidentSearch] = useState('');
  const [address, setAddress] = useState({
    hamletId: '',
    neighborhoodUnitId: '',
    street: '',
  });

  const { data, isLoading, error, refetch } = useFamilies({ page, limit: 20, search });
  const { data: familyDetail, isLoading: detailLoading } = useFamily(detailId);
  const { data: residentsData } = useResidents({
    page: 1,
    limit: 50,
    search: residentSearch || undefined,
  });
  const createMutation = useCreateFamily();
  const addMemberMutation = useAddFamilyMember();

  const createForm = useForm<CreateFamilyForm>({
    resolver: zodResolver(createFamilySchema),
    defaultValues: { kkNumber: '', economicStatus: '', houseStatus: '' },
  });

  const memberForm = useForm<AddMemberForm>({
    resolver: zodResolver(addFamilyMemberSchema),
    defaultValues: { residentId: '', relationship: '', isHead: false },
  });

  async function onCreateSubmit(values: CreateFamilyForm) {
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
    const parsed = createFamilySchema.parse(payload);
    await createMutation.mutateAsync(parsed);
    setCreateOpen(false);
    createForm.reset();
    setAddress({ hamletId: '', neighborhoodUnitId: '', street: '' });
  }

  async function onAddMemberSubmit(values: AddMemberForm) {
    if (!detailId) return;
    const parsed = addFamilyMemberSchema.parse(values);
    await addMemberMutation.mutateAsync({ familyId: detailId, body: parsed });
    setMemberOpen(false);
    memberForm.reset();
  }

  function openDetail(family: Family) {
    setDetailId(family.id);
  }

  const families = data?.data ?? [];
  const meta = data?.meta;

  function getHeadName(family: Family) {
    const head = family.familyMembers?.find((m) => m.isHead);
    return head?.resident.fullName ?? '—';
  }

  return (
    <div>
      <PageHeader
        title="Data Keluarga"
        description="Kelola kartu keluarga dan anggota rumah tangga."
        actions={
          can('families.create') ? (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Tambah KK
            </Button>
          ) : undefined
        }
      />

      <DataTable
        columns={[
          {
            key: 'kkNumber',
            header: 'No. KK',
            render: (row) => (
              <span
                className="font-mono text-xs"
                title={can('families.view_sensitive') ? row.kkNumber : 'Nomor KK disamarkan'}
              >
                {row.kkNumber}
              </span>
            ),
          },
          {
            key: 'head',
            header: 'Kepala Keluarga',
            render: (row) => getHeadName(row),
          },
          {
            key: 'members',
            header: 'Anggota',
            render: (row) => row.familyMembers?.length ?? 0,
          },
          {
            key: 'economicStatus',
            header: 'Ekonomi',
            render: (row) => row.economicStatus ?? '—',
          },
          {
            key: 'address',
            header: 'RT/RW',
            render: (row) =>
              row.address ? `${row.address.rt ?? '—'}/${row.address.rw ?? '—'}` : '—',
          },
        ]}
        data={families}
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
          <FilterBar
            search={search}
            onSearchChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            searchPlaceholder="Cari nomor KK..."
          />
        }
      />

      <DetailDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tambah Kartu Keluarga"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
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
        <form className="space-y-4" onSubmit={createForm.handleSubmit(onCreateSubmit)}>
          <div>
            <label className="form-label" htmlFor="kkNumber">
              Nomor KK
            </label>
            <Input id="kkNumber" maxLength={16} {...createForm.register('kkNumber')} />
            {createForm.formState.errors.kkNumber && (
              <p className="form-error">{createForm.formState.errors.kkNumber.message}</p>
            )}
          </div>
          <div>
            <label className="form-label" htmlFor="economicStatus">
              Status Ekonomi
            </label>
            <Input id="economicStatus" {...createForm.register('economicStatus')} />
          </div>
          <div>
            <label className="form-label" htmlFor="houseStatus">
              Status Rumah
            </label>
            <Input id="houseStatus" {...createForm.register('houseStatus')} />
          </div>
          <AddressFields
            hamletId={address.hamletId}
            neighborhoodUnitId={address.neighborhoodUnitId}
            street={address.street}
            onHamletChange={(id) => setAddress((a) => ({ ...a, hamletId: id, neighborhoodUnitId: '' }))}
            onNeighborhoodUnitChange={(id) => setAddress((a) => ({ ...a, neighborhoodUnitId: id }))}
            onStreetChange={(street) => setAddress((a) => ({ ...a, street }))}
          />
        </form>
      </DetailDrawer>

      <DetailDrawer
        open={Boolean(detailId)}
        onClose={() => {
          setDetailId(null);
          setMemberOpen(false);
        }}
        title="Detail Keluarga"
        width="max-w-2xl"
        footer={
          can('families.update') ? (
            <Button size="sm" onClick={() => setMemberOpen(true)}>
              <UserPlus className="mr-1.5 h-4 w-4" />
              Tambah Anggota
            </Button>
          ) : undefined
        }
      >
        {detailLoading ? (
          <p className="text-sm text-slate-500">Memuat detail...</p>
        ) : familyDetail ? (
          <div className="space-y-6">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Nomor KK</dt>
                <dd className="font-mono font-medium">{familyDetail.kkNumber}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Status Ekonomi</dt>
                <dd>{familyDetail.economicStatus ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Status Rumah</dt>
                <dd>{familyDetail.houseStatus ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Alamat</dt>
                <dd>{familyDetail.address?.fullAddress ?? '—'}</dd>
              </div>
            </dl>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Anggota Keluarga</h3>
              {familyDetail.familyMembers.length === 0 ? (
                <p className="text-sm text-slate-500">Belum ada anggota keluarga.</p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80">
                        <th className="px-3 py-2 text-xs font-medium uppercase text-slate-500">
                          Nama
                        </th>
                        <th className="px-3 py-2 text-xs font-medium uppercase text-slate-500">
                          NIK
                        </th>
                        <th className="px-3 py-2 text-xs font-medium uppercase text-slate-500">
                          Hubungan
                        </th>
                        <th className="px-3 py-2 text-xs font-medium uppercase text-slate-500">
                          KK
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {familyDetail.familyMembers.map((member) => (
                        <tr key={member.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-2">{member.resident.fullName}</td>
                          <td className="px-3 py-2 font-mono text-xs">{member.resident.nik}</td>
                          <td className="px-3 py-2">{member.relationship}</td>
                          <td className="px-3 py-2">
                            {member.isHead ? (
                              <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700">
                                Kepala
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Data tidak ditemukan.</p>
        )}
      </DetailDrawer>

      <DetailDrawer
        open={memberOpen}
        onClose={() => setMemberOpen(false)}
        title="Tambah Anggota Keluarga"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setMemberOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={addMemberMutation.isPending}
              onClick={memberForm.handleSubmit(onAddMemberSubmit)}
            >
              {addMemberMutation.isPending ? 'Menyimpan...' : 'Tambah'}
            </Button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={memberForm.handleSubmit(onAddMemberSubmit)}>
          <div>
            <label className="form-label">Cari Penduduk</label>
            <Input
              placeholder="Ketik nama..."
              value={residentSearch}
              onChange={(e) => setResidentSearch(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="residentId">
              Pilih Penduduk
            </label>
            <select
              id="residentId"
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
              {...memberForm.register('residentId')}
            >
              <option value="">— Pilih —</option>
              {(residentsData?.data ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.fullName} ({r.nik})
                </option>
              ))}
            </select>
            {memberForm.formState.errors.residentId && (
              <p className="form-error">{memberForm.formState.errors.residentId.message}</p>
            )}
          </div>
          <div>
            <label className="form-label" htmlFor="relationship">
              Hubungan Keluarga
            </label>
            <Input
              id="relationship"
              placeholder="Contoh: Anak, Istri, Kepala Keluarga"
              {...memberForm.register('relationship')}
            />
            {memberForm.formState.errors.relationship && (
              <p className="form-error">{memberForm.formState.errors.relationship.message}</p>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...memberForm.register('isHead')} />
            Jadikan kepala keluarga
          </label>
        </form>
      </DetailDrawer>
    </div>
  );
}
