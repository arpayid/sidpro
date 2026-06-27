'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateLetterSettingsSchema } from '@sidpro/validators';
import type { z } from 'zod';
import Link from 'next/link';
import { Button, Input } from '@sidpro/ui';
import { ArrowLeft, Save, FileText, ShieldCheck, Settings2 } from 'lucide-react';
import { PageHeader } from '@/components/enterprise/page-header';
import {
  useLetterSettings,
  useUpdateLetterSettings,
  useUpdateLetterTemplate,
  type LetterTemplateItem,
} from '@/features/letters/use-letter-settings';

type SettingsForm = z.infer<typeof updateLetterSettingsSchema>;

export default function SuratPengaturanPage() {
  const { data, isLoading, error, refetch } = useLetterSettings();
  const updateSettings = useUpdateLetterSettings();
  const updateTemplate = useUpdateLetterTemplate();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [templateContent, setTemplateContent] = useState('');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const form = useForm<SettingsForm>({
    resolver: zodResolver(updateLetterSettingsSchema),
    defaultValues: {
      signatory: { name: '', title: '' },
      pdf: { maskNik: false },
      header: { useCustom: false },
    },
  });

  useEffect(() => {
    if (!data) return;
    form.reset({
      signatory: data.signatory,
      pdf: data.pdf,
      header: {
        useCustom: data.header.useCustom,
        name: data.header.name ?? data.villageProfile?.name ?? '',
        address: data.header.address ?? data.villageProfile?.address ?? '',
        province: data.header.province ?? data.villageProfile?.province ?? '',
        regency: data.header.regency ?? data.villageProfile?.regency ?? '',
        district: data.header.district ?? data.villageProfile?.district ?? '',
      },
    });
    if (!selectedTemplateId && data.templates[0]) {
      setSelectedTemplateId(data.templates[0].id);
      setTemplateContent(data.templates[0].content);
    }
  }, [data, form, selectedTemplateId]);

  const selectedTemplate: LetterTemplateItem | undefined = data?.templates.find(
    (t) => t.id === selectedTemplateId,
  );

  useEffect(() => {
    if (selectedTemplate) setTemplateContent(selectedTemplate.content);
  }, [selectedTemplate]);

  async function onSaveSettings(values: SettingsForm) {
    setSaveMessage(null);
    await updateSettings.mutateAsync(values);
    setSaveMessage('Pengaturan surat berhasil disimpan.');
  }

  async function onSaveTemplate() {
    if (!selectedTemplateId) return;
    setSaveMessage(null);
    await updateTemplate.mutateAsync({
      id: selectedTemplateId,
      body: { content: templateContent },
    });
    setSaveMessage('Template surat berhasil diperbarui.');
  }

  const useCustomHeader = form.watch('header.useCustom');

  return (
    <div>
      <PageHeader
        title="Pengaturan Surat"
        description="Konfigurasi pejabat penandatangan, kop surat PDF, masking NIK, dan template surat."
        actions={
          <Link href="/admin/surat">
            <Button variant="outline" size="sm" type="button">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Kembali ke Layanan Surat
            </Button>
          </Link>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg border border-slate-200 bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Gagal memuat pengaturan.{' '}
          <button type="button" className="underline" onClick={() => refetch()}>
            Coba lagi
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {saveMessage && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {saveMessage}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <Settings2 className="h-5 w-5 text-emerald-700" />
              <p className="mt-2 text-sm font-semibold text-emerald-950">Template terpusat</p>
              <p className="mt-1 text-xs text-emerald-800">Edit placeholder surat tanpa mengubah kode aplikasi.</p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <ShieldCheck className="h-5 w-5 text-blue-700" />
              <p className="mt-2 text-sm font-semibold text-blue-950">Masking data sensitif</p>
              <p className="mt-1 text-xs text-blue-800">NIK dapat disamarkan untuk distribusi dokumen yang lebih aman.</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <FileText className="h-5 w-5 text-slate-700" />
              <p className="mt-2 text-sm font-semibold text-slate-950">Kop PDF fleksibel</p>
              <p className="mt-1 text-xs text-slate-600">Pakai profil desa atau kop khusus untuk kebutuhan operasional.</p>
            </div>
          </div>

          <form
            className="grid gap-6 lg:grid-cols-2"
            onSubmit={form.handleSubmit(onSaveSettings)}
          >
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Pejabat Penandatangan</h2>
              <p className="mt-1 text-xs text-slate-500">
                Nama dan jabatan yang muncul di bagian tanda tangan PDF.
              </p>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="form-label" htmlFor="signatoryName">
                    Nama Pejabat
                  </label>
                  <Input id="signatoryName" {...form.register('signatory.name')} />
                </div>
                <div>
                  <label className="form-label" htmlFor="signatoryTitle">
                    Jabatan
                  </label>
                  <Input id="signatoryTitle" {...form.register('signatory.title')} />
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Keamanan PDF</h2>
              <p className="mt-1 text-xs text-slate-500">
                Kontrol tampilan data sensitif pada surat yang digenerate.
              </p>
              <label className="mt-4 flex items-start gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-1 rounded border-slate-300 text-emerald-600"
                  {...form.register('pdf.maskNik')}
                />
                <span>
                  <span className="font-medium">Masking NIK di PDF</span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Contoh: 3201********0001 — disarankan untuk surat publik.
                  </span>
                </span>
              </label>
            </section>

            <section className="lg:col-span-2 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Kop Surat PDF</h2>
              <p className="mt-1 text-xs text-slate-500">
                Secara default memakai profil desa dari database.
                {data?.villageProfile && (
                  <span className="block mt-1">
                    Profil desa saat ini: <strong>{data.villageProfile.name}</strong>
                    {data.villageProfile.address ? ` — ${data.villageProfile.address}` : ''}
                  </span>
                )}
              </p>

              <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-emerald-600"
                  {...form.register('header.useCustom')}
                />
                Gunakan kop surat kustom untuk PDF
              </label>

              {useCustomHeader && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="form-label">Nama Desa (kop)</label>
                    <Input {...form.register('header.name')} />
                  </div>
                  <div>
                    <label className="form-label">Provinsi</label>
                    <Input {...form.register('header.province')} />
                  </div>
                  <div>
                    <label className="form-label">Kabupaten/Kota</label>
                    <Input {...form.register('header.regency')} />
                  </div>
                  <div>
                    <label className="form-label">Kecamatan</label>
                    <Input {...form.register('header.district')} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="form-label">Alamat</label>
                    <Input {...form.register('header.address')} />
                  </div>
                </div>
              )}
            </section>

            <div className="lg:col-span-2 flex justify-end">
              <Button type="submit" disabled={updateSettings.isPending}>
                <Save className="mr-1.5 h-4 w-4" />
                {updateSettings.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </Button>
            </div>
          </form>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-900">Template Surat Aktif</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Placeholder: {'{{nama_pemohon}}'}, {'{{nik}}'}, {'{{keperluan}}'}, {'{{nama_desa}}'}, dll.
            </p>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div>
                <label className="form-label" htmlFor="templateSelect">
                  Jenis Surat
                </label>
                <select
                  id="templateSelect"
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                >
                  {(data?.templates ?? []).length === 0 && (
                    <option value="">Belum ada template aktif</option>
                  )}
                  {(data?.templates ?? []).map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.letterType.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-2 flex items-end justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!selectedTemplateId || updateTemplate.isPending}
                  onClick={onSaveTemplate}
                >
                  {updateTemplate.isPending ? 'Menyimpan template...' : 'Simpan Template'}
                </Button>
              </div>
            </div>

            {selectedTemplate ? (
              <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Template aktif: <strong>{selectedTemplate.letterType.name}</strong>. Simpan perubahan sebelum generate PDF berikutnya.
              </p>
            ) : (
              <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Belum ada template untuk diedit. Tambahkan jenis surat/template dari backend seed terlebih dahulu.
              </p>
            )}

            <textarea
              rows={12}
              className="mt-4 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
              value={templateContent}
              onChange={(e) => setTemplateContent(e.target.value)}
            />
          </section>
        </div>
      )}
    </div>
  );
}
