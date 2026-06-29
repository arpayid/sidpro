export default function AdminLoading() {
  return (
    <div className="flex min-h-[16rem] items-center justify-center" role="status" aria-live="polite">
      <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" aria-hidden="true" />
        Memuat halaman administrasi…
      </div>
    </div>
  );
}
