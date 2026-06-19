'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input } from '@sidpro/ui';
import { ImagePlus, Trash2 } from 'lucide-react';
import { DetailDrawer } from '@/components/enterprise/detail-drawer';
import { useAuth } from '@/hooks/use-auth';
import {
  useCmsGallery,
  useCreateCmsGalleryItem,
  useDeleteCmsGalleryItem,
  useGalleryFileUrl,
  useUploadGalleryFile,
  type CmsGalleryItem,
} from '@/features/cms/use-cms-gallery';

function GalleryCard({
  item,
  canManage,
  onDelete,
}: {
  item: CmsGalleryItem;
  canManage: boolean;
  onDelete: (item: CmsGalleryItem) => void;
}) {
  const { data: imageUrl } = useGalleryFileUrl(item.fileId);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="aspect-[4/3] bg-slate-100">
        {imageUrl ? (
          <img src={imageUrl} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Tanpa gambar
          </div>
        )}
      </div>
      <div className="flex items-start justify-between gap-2 p-4">
        <div>
          <h3 className="font-medium text-slate-900">{item.title}</h3>
          {item.description && <p className="mt-1 text-xs text-slate-500">{item.description}</p>}
        </div>
        {canManage && (
          <button
            type="button"
            className="text-red-500 hover:text-red-700"
            onClick={() => onDelete(item)}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function GaleriContent() {
  const { can } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data, isLoading, error } = useCmsGallery({ limit: 24 });
  const createMutation = useCreateCmsGalleryItem();
  const deleteMutation = useDeleteCmsGalleryItem();
  const uploadMutation = useUploadGalleryFile();

  const form = useForm<{ title: string; description: string }>({
    defaultValues: { title: '', description: '' },
  });

  const items = data?.data ?? [];
  const canManage = can('cms.manage');

  async function onSubmit(values: { title: string; description: string }) {
    let fileId: string | undefined;
    if (selectedFile) {
      const uploaded = await uploadMutation.mutateAsync(selectedFile);
      fileId = uploaded.id;
    }

    await createMutation.mutateAsync({
      title: values.title,
      description: values.description || undefined,
      fileId,
      type: 'image',
    });

    form.reset();
    setSelectedFile(null);
    setDrawerOpen(false);
  }

  async function onDelete(item: CmsGalleryItem) {
    if (!window.confirm(`Hapus item galeri "${item.title}"?`)) return;
    await deleteMutation.mutateAsync(item.id);
  }

  const isSaving = createMutation.isPending || uploadMutation.isPending;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Galeri Desa</h1>
          <p className="page-description">Kelola foto kegiatan dan dokumentasi portal desa.</p>
        </div>
        {canManage && (
          <Button onClick={() => setDrawerOpen(true)}>
            <ImagePlus className="mr-2 h-4 w-4" />
            Tambah Foto
          </Button>
        )}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <p className="text-sm text-slate-500">Memuat galeri...</p>
        ) : error ? (
          <p className="text-sm text-red-600">Gagal memuat galeri.</p>
        ) : items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
            Belum ada foto galeri.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item) => (
              <GalleryCard
                key={item.id}
                item={item}
                canManage={canManage}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>

      <DetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Tambah Foto Galeri"
        width="max-w-lg"
        footer={
          <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Batal
            </Button>
            <Button disabled={!canManage || isSaving} onClick={form.handleSubmit(onSubmit)}>
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        }
      >
        <form className="space-y-4 p-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <label className="form-label" htmlFor="title">
              Judul
            </label>
            <Input id="title" disabled={!canManage} {...form.register('title', { required: true })} />
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
          <div>
            <label className="form-label" htmlFor="file">
              Foto (JPG/PNG/WebP, maks 5MB)
            </label>
            <Input
              id="file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={!canManage}
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            />
          </div>
        </form>
      </DetailDrawer>
    </div>
  );
}
