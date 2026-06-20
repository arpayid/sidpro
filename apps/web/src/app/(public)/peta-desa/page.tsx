'use client';

import { usePublicMap } from '@/features/gis/use-public-map';

export default function PetaDesaPage() {
  const { data, isLoading, error } = usePublicMap();

  if (isLoading) {
    return (
      <div className="container-page py-12">
        <p className="text-sm text-slate-500">Memuat peta desa...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container-page py-12">
        <p className="text-sm text-red-600">Peta desa tidak dapat dimuat.</p>
      </div>
    );
  }

  const { lat, lng, zoom } = data.center;
  const delta = 0.02 + (18 - zoom) * 0.002;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lng}`;

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-bold text-slate-900">Peta Desa</h1>
      <p className="mt-1 text-slate-600">{data.villageName} — lokasi pusat administrasi desa.</p>
      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
        <iframe
          title={`Peta ${data.villageName}`}
          src={mapUrl}
          className="h-[480px] w-full"
          loading="lazy"
        />
      </div>
      {data.layers.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-slate-900">Titik Layer Desa</h2>
          <ul className="mt-3 space-y-2">
            {data.layers.map((layer) => (
              <li
                key={layer.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm"
              >
                <span className="font-medium text-slate-800">{layer.name}</span>
                <span className="text-slate-500">
                  {layer.layerType ?? 'point'} · {layer.lat.toFixed(4)}, {layer.lng.toFixed(4)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Peta interaktif dasar (Post-MVP GIS). Koordinat dan layer dapat diatur admin desa di Pengaturan → Peta Desa.
      </p>
    </div>
  );
}
