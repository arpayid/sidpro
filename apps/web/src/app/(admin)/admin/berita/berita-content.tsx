'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Badge, Button, Input } from '@sidpro/ui';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/shared/data-table';
import { DetailDrawer } from '@/components/enterprise/detail-drawer';
import { useAuth } from '@/hooks/use-auth';
import { formatDate } from '@/lib/demo-data';
import {
  useCmsPosts,
  useCreateCmsPost,
  useUpdateCmsPost,
  useDeleteCmsPost,
  type CmsPost,
  type CmsPostInput,
} from '@/features/cms/use-cms-posts';

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const emptyForm: CmsPostInput = {
  title: '',
  slug: '',
  content: '',
  excerpt: '',
  category: 'Umum',
  status: 'draft',
};

export function BeritaContent() {
  const { can } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<CmsPost | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data, isLoading, error } = useCmsPosts({
    status: statusFilter || undefined,
  });
  const createMutation = useCreateCmsPost();
  const updateMutation = useUpdateCmsPost();
  const deleteMutation = useDeleteCmsPost();

  const form = useForm<CmsPostInput>({ defaultValues: emptyForm });
  const posts = data?.data ?? [];
  const canManage = can('cms.manage');

  useEffect(() => {
    if (editingPost) {
      form.reset({
        title: editingPost.title,
        slug: editingPost.slug,
        content: editingPost.content,
        excerpt: editingPost.excerpt ?? '',
        category: editingPost.category ?? 'Umum',
        status: editingPost.status,
      });
      return;
    }
    form.reset(emptyForm);
  }, [editingPost, form]);

  function openCreate() {
    setEditingPost(null);
    setDrawerOpen(true);
  }

  function openEdit(post: CmsPost) {
    setEditingPost(post);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingPost(null);
  }

  async function onSubmit(values: CmsPostInput) {
    if (editingPost) {
      await updateMutation.mutateAsync({ id: editingPost.id, body: values });
    } else {
      await createMutation.mutateAsync(values);
    }
    closeDrawer();
  }

  async function onDelete(post: CmsPost) {
    if (!window.confirm(`Hapus berita "${post.title}"?`)) return;
    await deleteMutation.mutateAsync(post.id);
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Manajemen Berita</h1>
          <p className="page-description">Kelola konten berita dan pengumuman portal desa.</p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Tulis Berita
          </Button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {['', 'draft', 'published'].map((status) => (
          <Button
            key={status || 'all'}
            size="sm"
            variant={statusFilter === status ? 'default' : 'outline'}
            onClick={() => setStatusFilter(status)}
          >
            {status === '' ? 'Semua' : status === 'draft' ? 'Draft' : 'Terbit'}
          </Button>
        ))}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <p className="text-sm text-slate-500">Memuat berita...</p>
        ) : error ? (
          <p className="text-sm text-red-600">Gagal memuat daftar berita.</p>
        ) : (
          <DataTable
            data={posts}
            columns={[
              { key: 'title', header: 'Judul', cell: (row) => row.title },
              {
                key: 'category',
                header: 'Kategori',
                cell: (row) => <Badge variant="secondary">{row.category ?? 'Umum'}</Badge>,
              },
              {
                key: 'status',
                header: 'Status',
                cell: (row) => (
                  <Badge variant={row.status === 'published' ? 'default' : 'secondary'}>
                    {row.status === 'published' ? 'Terbit' : 'Draft'}
                  </Badge>
                ),
              },
              {
                key: 'date',
                header: 'Tanggal',
                cell: (row) => formatDate(row.publishedAt ?? row.createdAt),
              },
              {
                key: 'actions',
                header: 'Aksi',
                cell: (row) => (
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/berita/${row.slug}`}
                      className="text-sm text-emerald-600 hover:underline"
                      target="_blank"
                    >
                      Lihat
                    </Link>
                    {canManage && (
                      <>
                        <button
                          type="button"
                          className="text-slate-500 hover:text-slate-800"
                          onClick={() => openEdit(row)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => onDelete(row)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                ),
              },
            ]}
            emptyMessage="Belum ada berita. Klik Tulis Berita untuk membuat konten baru."
          />
        )}
      </div>

      <DetailDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editingPost ? 'Edit Berita' : 'Tulis Berita'}
        width="max-w-2xl"
        footer={
          <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
            <Button variant="outline" onClick={closeDrawer}>
              Batal
            </Button>
            <Button
              disabled={!canManage || isSaving}
              onClick={form.handleSubmit(onSubmit)}
            >
              {isSaving ? 'Menyimpan...' : editingPost ? 'Simpan Perubahan' : 'Simpan Berita'}
            </Button>
          </div>
        }
      >
        <form className="space-y-4 p-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <label className="form-label" htmlFor="title">
              Judul
            </label>
            <Input
              id="title"
              disabled={!canManage}
              {...form.register('title', {
                required: true,
                onChange: (event) => {
                  if (!editingPost) {
                    form.setValue('slug', slugify(event.target.value));
                  }
                },
              })}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="slug">
              Slug URL
            </label>
            <Input id="slug" disabled={!canManage} {...form.register('slug', { required: true })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label" htmlFor="category">
                Kategori
              </label>
              <Input id="category" disabled={!canManage} {...form.register('category')} />
            </div>
            <div>
              <label className="form-label" htmlFor="status">
                Status
              </label>
              <select
                id="status"
                disabled={!canManage}
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                {...form.register('status')}
              >
                <option value="draft">Draft</option>
                <option value="published">Terbit</option>
              </select>
            </div>
          </div>
          <div>
            <label className="form-label" htmlFor="excerpt">
              Ringkasan
            </label>
            <textarea
              id="excerpt"
              rows={2}
              disabled={!canManage}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...form.register('excerpt')}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="content">
              Konten
            </label>
            <textarea
              id="content"
              rows={10}
              disabled={!canManage}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...form.register('content', { required: true })}
            />
          </div>
        </form>
      </DetailDrawer>
    </div>
  );
}
