'use client';

import { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@sidpro/ui';
import { Building2, Users, FileText, MessageSquare, Plus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DetailDrawer } from '@/components/enterprise/detail-drawer';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import { useRegencyOverview } from '@/features/tenants/use-regency-overview';
import { useVillageSummary } from '@/features/tenants/use-village-summary';
import { useProvisionParents } from '@/features/tenants/use-provision-parents';

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Users;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-xl font-semibold text-slate-900">{value.toLocaleString('id-ID')}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function KabupatenContent() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useRegencyOverview();
  const [selectedVillageId, setSelectedVillageId] = useState<string | null>(null);
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [provisionName, setProvisionName] = useState('');
  const [provisionCode, setProvisionCode] = useState('');
  const [provisionParentId, setProvisionParentId] = useState('');
  const [provisionAdminEmail, setProvisionAdminEmail] = useState('');
  const [provisionAdminName, setProvisionAdminName] = useState('');
  const villageSummary = useVillageSummary(selectedVillageId);
  const provisionParents = useProvisionParents();

  const provisionMutation = useMutation({
    mutationFn: async (body: {
      name: string;
      code: string;
      parentId: string;
      adminEmail?: string;
      adminName?: string;
    }) => {
      const res = await apiClient('/tenants/provision/village', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.success) throw new Error(res.message ?? 'Gagal memprovisikan desa');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', 'regency', 'overview'] });
      setProvisionOpen(false);
      setProvisionName('');
      setProvisionCode('');
    },
  });

  if (isLoading) {
    return <p className="text-sm text-slate-500">Memuat dashboard kabupaten...</p>;
  }

  if (error || !data) {
    return (
      <p className="text-sm text-red-600">
        {(error as Error)?.message ?? 'Dashboard kabupaten tidak tersedia untuk akun ini.'}
      </p>
    );
  }

  const canProvision = can('tenants.provision_village') || can('settings.manage');

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Dashboard Kabupaten</h1>
          <p className="page-description">
            Ringkasan agregat lintas desa — {data.regency.name} ({data.villageCount} desa).
          </p>
        </div>
        {canProvision && (
          <Button
            size="sm"
            onClick={() => {
              setProvisionParentId(data.regency.id);
              setProvisionOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Provision Desa
          </Button>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Penduduk" value={data.totals.residents} icon={Users} />
        <StatCard label="Total Keluarga" value={data.totals.families} icon={Building2} />
        <StatCard label="Surat Pending" value={data.totals.pendingLetters} icon={FileText} />
        <StatCard label="Pengaduan Aktif" value={data.totals.openComplaints} icon={MessageSquare} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Desa di Bawah Kabupaten</CardTitle>
        </CardHeader>
        <CardContent>
          {data.villages.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada desa terdaftar.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="py-2 pr-4">Desa</th>
                    <th className="py-2 pr-4">Kode</th>
                    <th className="py-2 pr-4">Penduduk</th>
                    <th className="py-2 pr-4">Surat Pending</th>
                    <th className="py-2">Pengaduan Aktif</th>
                  </tr>
                </thead>
                <tbody>
                  {data.villages.map((village) => (
                    <tr
                      key={village.id}
                      className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                      onClick={() => setSelectedVillageId(village.id)}
                    >
                      <td className="py-3 pr-4 font-medium text-emerald-700">{village.name}</td>
                      <td className="py-3 pr-4 text-slate-600">{village.code}</td>
                      <td className="py-3 pr-4">{village.residentCount}</td>
                      <td className="py-3 pr-4">{village.pendingLetterCount}</td>
                      <td className="py-3">{village.openComplaintCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-slate-500">Klik baris desa untuk ringkasan read-only.</p>
        </CardContent>
      </Card>

      <DetailDrawer
        open={Boolean(selectedVillageId)}
        onClose={() => setSelectedVillageId(null)}
        title="Ringkasan Desa"
        width="max-w-lg"
      >
        {villageSummary.isLoading ? (
          <p className="text-sm text-slate-500">Memuat ringkasan...</p>
        ) : villageSummary.error || !villageSummary.data ? (
          <p className="text-sm text-red-600">
            {(villageSummary.error as Error)?.message ?? 'Ringkasan tidak tersedia.'}
          </p>
        ) : (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Nama Desa</dt>
              <dd className="font-medium">
                {villageSummary.data.profile?.name ?? villageSummary.data.village.name}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Kode Tenant</dt>
              <dd>{villageSummary.data.village.code}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Status</dt>
              <dd className="capitalize">{villageSummary.data.village.status}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Penduduk</dt>
              <dd>{villageSummary.data.stats.residents.toLocaleString('id-ID')}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Keluarga</dt>
              <dd>{villageSummary.data.stats.families.toLocaleString('id-ID')}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Surat Pending</dt>
              <dd>{villageSummary.data.stats.pendingLetters}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Pengaduan Aktif</dt>
              <dd>{villageSummary.data.stats.openComplaints}</dd>
            </div>
            {villageSummary.data.profile?.address && (
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Alamat</dt>
                <dd>{villageSummary.data.profile.address}</dd>
              </div>
            )}
          </dl>
        )}
      </DetailDrawer>

      <DetailDrawer
        open={provisionOpen}
        onClose={() => setProvisionOpen(false)}
        title="Provision Tenant Desa Baru"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setProvisionOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={
                provisionMutation.isPending ||
                !provisionName.trim() ||
                !provisionCode.trim() ||
                !provisionParentId
              }
              onClick={() =>
                provisionMutation.mutate({
                  name: provisionName.trim(),
                  code: provisionCode.trim(),
                  parentId: provisionParentId,
                  ...(provisionAdminEmail.trim()
                    ? {
                        adminEmail: provisionAdminEmail.trim(),
                        adminName: provisionAdminName.trim() || undefined,
                      }
                    : {}),
                })
              }
            >
              {provisionMutation.isPending ? 'Menyimpan...' : 'Buat Desa'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="form-label" htmlFor="provision-parent">
              Parent (Kabupaten/Kecamatan)
            </label>
            <select
              id="provision-parent"
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
              value={provisionParentId}
              onChange={(e) => setProvisionParentId(e.target.value)}
            >
              <option value="">— Pilih —</option>
              {(provisionParents.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.level})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="provision-name">
              Nama Desa
            </label>
            <Input
              id="provision-name"
              value={provisionName}
              onChange={(e) => setProvisionName(e.target.value)}
              placeholder="Desa Baru"
            />
          </div>
          <div>
            <label className="form-label" htmlFor="provision-code">
              Kode Tenant
            </label>
            <Input
              id="provision-code"
              value={provisionCode}
              onChange={(e) => setProvisionCode(e.target.value)}
              placeholder="desa-baru"
            />
          </div>
          <div>
            <label className="form-label" htmlFor="provision-admin-email">
              Email Admin Desa (opsional, butuh SEED_ADMIN_PASSWORD di API)
            </label>
            <Input
              id="provision-admin-email"
              type="email"
              value={provisionAdminEmail}
              onChange={(e) => setProvisionAdminEmail(e.target.value)}
              placeholder="admin@desa-baru.id"
            />
          </div>
          <div>
            <label className="form-label" htmlFor="provision-admin-name">
              Nama Admin Desa
            </label>
            <Input
              id="provision-admin-name"
              value={provisionAdminName}
              onChange={(e) => setProvisionAdminName(e.target.value)}
              placeholder="Admin Desa Baru"
            />
          </div>
          <p className="text-xs text-slate-500">
            Provisioning otomatis membuat profil desa, role admin/operator/warga, dan pengaturan GIS
            dasar.
          </p>
          {provisionMutation.isError && (
            <p className="form-error">{(provisionMutation.error as Error).message}</p>
          )}
        </div>
      </DetailDrawer>
    </div>
  );
}
