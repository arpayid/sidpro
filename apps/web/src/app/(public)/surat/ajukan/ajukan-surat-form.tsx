'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@sidpro/ui';
import { FileText } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useLetterTypes, useCreateLetterRequest } from '@/features/letters/use-letters';

const wargaLetterSchema = z.object({
  letterTypeId: z.string().uuid('Pilih jenis surat'),
  applicantNik: z
    .string()
    .length(16, 'NIK harus 16 digit')
    .regex(/^\d{16}$/, 'NIK harus berisi angka'),
  purpose: z.string().min(5, 'Keperluan minimal 5 karakter').max(1000),
});

type WargaLetterForm = z.infer<typeof wargaLetterSchema>;

export function AjukanSuratForm() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { data: letterTypes, isLoading: typesLoading } = useLetterTypes();
  const createMutation = useCreateLetterRequest();

  const isWarga =
    user?.roles.includes('warga') &&
    !user?.roles.some((role) =>
      ['admin_desa', 'operator_desa', 'superadmin_system', 'admin_kabupaten'].includes(role),
    );

  const form = useForm<WargaLetterForm>({
    resolver: zodResolver(wargaLetterSchema),
    defaultValues: { letterTypeId: '', applicantNik: '', purpose: '' },
  });

  if (!isAuthenticated) {
    return (
      <Card className="mx-auto mt-8 max-w-lg">
        <CardContent className="p-6 text-center text-sm text-slate-600">
          <p className="mb-4">Silakan login sebagai warga untuk mengajukan permohonan surat.</p>
          <Link href="/login?callbackUrl=/surat/ajukan">
            <Button type="button">Login Warga</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (!isWarga) {
    return (
      <Card className="mx-auto mt-8 max-w-lg">
        <CardContent className="p-6 text-center text-sm text-slate-600">
          <p className="mb-4">
            Halaman ini untuk akun warga. Operator/admin dapat membuat permohonan dari menu Layanan
            Surat.
          </p>
          <Link href="/admin/surat">
            <Button type="button" variant="outline">
              Buka Layanan Surat Admin
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  async function onSubmit(values: WargaLetterForm) {
    const result = await createMutation.mutateAsync(values);
    const ticketId = result.data?.id;
    if (ticketId) {
      const ticket = `SRT-${ticketId.slice(0, 8).toUpperCase()}`;
      router.push(`/surat/cek?ticket=${ticket}`);
      return;
    }
    form.reset();
  }

  return (
    <Card className="mx-auto mt-8 max-w-lg">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Ajukan Permohonan Surat</CardTitle>
            <p className="text-xs text-slate-500">Akun: {user?.email}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="form-label" htmlFor="letterTypeId">
              Jenis Surat
            </label>
            <select
              id="letterTypeId"
              className="form-input w-full"
              {...form.register('letterTypeId')}
              disabled={typesLoading}
            >
              <option value="">Pilih jenis surat</option>
              {(letterTypes ?? []).map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            {form.formState.errors.letterTypeId && (
              <p className="form-error">{form.formState.errors.letterTypeId.message}</p>
            )}
          </div>
          <div>
            <label className="form-label" htmlFor="applicantNik">
              NIK Pemohon
            </label>
            <Input
              id="applicantNik"
              inputMode="numeric"
              maxLength={16}
              placeholder="16 digit NIK"
              {...form.register('applicantNik')}
            />
            {form.formState.errors.applicantNik && (
              <p className="form-error">{form.formState.errors.applicantNik.message}</p>
            )}
          </div>
          <div>
            <label className="form-label" htmlFor="purpose">
              Keperluan
            </label>
            <textarea
              id="purpose"
              className="form-input min-h-[100px] w-full"
              placeholder="Jelaskan keperluan surat..."
              {...form.register('purpose')}
            />
            {form.formState.errors.purpose && (
              <p className="form-error">{form.formState.errors.purpose.message}</p>
            )}
          </div>
          {createMutation.isError && (
            <p className="text-sm text-red-600">
              {(createMutation.error as Error)?.message ?? 'Gagal mengajukan surat'}
            </p>
          )}
          <Button type="submit" disabled={createMutation.isPending} className="w-full">
            {createMutation.isPending ? 'Mengirim...' : 'Ajukan Permohonan'}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-500">
          Setelah diajukan, lacak status di{' '}
          <Link href="/surat/cek" className="font-medium text-emerald-600 hover:underline">
            Cek Status Surat
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
