'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@sidpro/ui';
import { useAuth } from '@/hooks/use-auth';
import {
  useUpdateVillageProfile,
  useVillageProfile,
  type UpdateVillageProfileInput,
} from '@/features/village-profile/use-village-profile';
import { TwoFaSettings } from '@/components/auth/two-fa-settings';
import {
  useSecuritySettings,
  useUpdateSecuritySettings,
} from '@/features/settings/use-security-settings';

export function PengaturanContent() {
  const { can } = useAuth();
  const { data, isLoading, error } = useVillageProfile();
  const updateMutation = useUpdateVillageProfile();
  const { data: securitySettings, isLoading: securityLoading } = useSecuritySettings();
  const updateSecurityMutation = useUpdateSecuritySettings();

  const form = useForm<UpdateVillageProfileInput>({
    defaultValues: {
      name: '',
      address: '',
      province: '',
      regency: '',
      district: '',
      postalCode: '',
      vision: '',
      mission: '',
      description: '',
      contactPhone: '',
      contactEmail: '',
    },
  });

  useEffect(() => {
    if (!data?.village) return;
    const v = data.village;
    form.reset({
      name: v.name ?? '',
      address: v.address ?? '',
      province: v.province ?? '',
      regency: v.regency ?? '',
      district: v.district ?? '',
      postalCode: v.postalCode ?? '',
      vision: v.vision ?? '',
      mission: v.mission ?? '',
      description: v.description ?? '',
      contactPhone: data.contact?.phone ?? '',
      contactEmail: data.contact?.email ?? '',
    });
  }, [data, form]);

  async function onSubmit(values: UpdateVillageProfileInput) {
    await updateMutation.mutateAsync(values);
  }

  const canManage = can('settings.manage');

  return (
    <div>
      <h1 className="page-title">Pengaturan</h1>
      <p className="page-description">Konfigurasi profil desa dan preferensi sistem.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profil Desa</CardTitle>
            {data?.tenant && (
              <p className="text-xs text-slate-500">Kode tenant: {data.tenant.code}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <p className="text-sm text-slate-500">Memuat profil desa...</p>
            ) : error ? (
              <p className="text-sm text-red-600">Gagal memuat profil desa.</p>
            ) : (
              <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                <div>
                  <label className="form-label" htmlFor="name">
                    Nama Desa
                  </label>
                  <Input id="name" disabled={!canManage} {...form.register('name')} />
                </div>
                <div>
                  <label className="form-label" htmlFor="address">
                    Alamat
                  </label>
                  <Input id="address" disabled={!canManage} {...form.register('address')} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="form-label" htmlFor="province">
                      Provinsi
                    </label>
                    <Input id="province" disabled={!canManage} {...form.register('province')} />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="regency">
                      Kabupaten
                    </label>
                    <Input id="regency" disabled={!canManage} {...form.register('regency')} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="form-label" htmlFor="district">
                      Kecamatan
                    </label>
                    <Input id="district" disabled={!canManage} {...form.register('district')} />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="postalCode">
                      Kode Pos
                    </label>
                    <Input id="postalCode" disabled={!canManage} {...form.register('postalCode')} />
                  </div>
                </div>
                <div>
                  <label className="form-label" htmlFor="vision">
                    Visi
                  </label>
                  <textarea
                    id="vision"
                    rows={2}
                    disabled={!canManage}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    {...form.register('vision')}
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="mission">
                    Misi
                  </label>
                  <textarea
                    id="mission"
                    rows={3}
                    disabled={!canManage}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    {...form.register('mission')}
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="description">
                    Deskripsi
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    disabled={!canManage}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    {...form.register('description')}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="form-label" htmlFor="contactPhone">
                      Telepon Kontak
                    </label>
                    <Input
                      id="contactPhone"
                      disabled={!canManage}
                      placeholder="(0298) 123456"
                      {...form.register('contactPhone')}
                    />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="contactEmail">
                      Email Kontak
                    </label>
                    <Input
                      id="contactEmail"
                      type="email"
                      disabled={!canManage}
                      placeholder="info@desa.go.id"
                      {...form.register('contactEmail')}
                    />
                  </div>
                </div>
                {updateMutation.isSuccess && (
                  <p className="text-sm text-emerald-600">Profil desa berhasil disimpan.</p>
                )}
                {updateMutation.isError && (
                  <p className="text-sm text-red-600">
                    {(updateMutation.error as Error).message}
                  </p>
                )}
                {canManage && (
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </Button>
                )}
              </form>
            )}
          </CardContent>
        </Card>

        <TwoFaSettings />

        <Card>
          <CardHeader>
            <CardTitle>Kebijakan Keamanan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            {securityLoading ? (
              <p className="text-slate-500">Memuat kebijakan keamanan...</p>
            ) : (
              <>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 rounded border-slate-300 text-emerald-600"
                    checked={securitySettings?.require2FaAdmin ?? false}
                    disabled={!canManage || updateSecurityMutation.isPending}
                    onChange={async (e) => {
                      await updateSecurityMutation.mutateAsync(e.target.checked);
                    }}
                  />
                  <span>
                    <span className="font-medium text-slate-800">Wajib 2FA untuk semua admin</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      Admin tanpa 2FA akan diarahkan mengaktifkan TOTP saat login berikutnya.
                    </span>
                  </span>
                </label>
                {updateSecurityMutation.isSuccess && (
                  <p className="text-emerald-600">Kebijakan keamanan berhasil disimpan.</p>
                )}
                {updateSecurityMutation.isError && (
                  <p className="text-red-600">
                    {(updateSecurityMutation.error as Error).message}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferensi Sistem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                defaultChecked
                disabled
                className="rounded border-slate-300 text-emerald-600"
              />
              Aktifkan audit log untuk semua mutasi data
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                defaultChecked
                disabled
                className="rounded border-slate-300 text-emerald-600"
              />
              Masking NIK/KK di tampilan operator
            </label>
            <p className="text-xs text-slate-400">
              Preferensi lanjutan lainnya akan tersedia pada fase enterprise hardening.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
