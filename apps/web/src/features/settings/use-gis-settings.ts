'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export const GIS_MAP_CENTER_KEY = 'gis.map_center';
export const GIS_MAP_LAYERS_KEY = 'gis.map_layers';

export interface MapCenter {
  lat: number;
  lng: number;
  zoom: number;
}

export interface MapLayer {
  id: string;
  name: string;
  lat: number;
  lng: number;
  layerType: 'boundary' | 'asset' | 'project' | 'office';
}

interface SettingRecord<T> {
  key: string;
  value: T;
}

const defaultCenter: MapCenter = { lat: -3.668, lng: 119.974, zoom: 13 };

function parseCenter(value: unknown): MapCenter {
  if (!value || typeof value !== 'object') return defaultCenter;
  const v = value as Record<string, unknown>;
  return {
    lat: typeof v.lat === 'number' ? v.lat : defaultCenter.lat,
    lng: typeof v.lng === 'number' ? v.lng : defaultCenter.lng,
    zoom: typeof v.zoom === 'number' ? v.zoom : defaultCenter.zoom,
  };
}

function parseLayers(value: unknown): MapLayer[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is MapLayer =>
      Boolean(item) &&
      typeof item === 'object' &&
      typeof (item as MapLayer).id === 'string' &&
      typeof (item as MapLayer).name === 'string' &&
      typeof (item as MapLayer).lat === 'number' &&
      typeof (item as MapLayer).lng === 'number',
  );
}

export function useGisSettings() {
  return useQuery({
    queryKey: ['settings', 'gis'],
    queryFn: async () => {
      const [centerRes, layersRes] = await Promise.all([
        apiClient<SettingRecord<MapCenter>>(`/settings/${GIS_MAP_CENTER_KEY}`).catch(() => null),
        apiClient<SettingRecord<MapLayer[]>>(`/settings/${GIS_MAP_LAYERS_KEY}`).catch(() => null),
      ]);
      return {
        center: parseCenter(centerRes?.data?.value),
        layers: parseLayers(layersRes?.data?.value),
      };
    },
  });
}

export function useUpdateGisSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { center: MapCenter; layers: MapLayer[] }) => {
      const [centerRes, layersRes] = await Promise.all([
        apiClient(`/settings/${GIS_MAP_CENTER_KEY}`, {
          method: 'PUT',
          body: { value: input.center },
        }),
        apiClient(`/settings/${GIS_MAP_LAYERS_KEY}`, {
          method: 'PUT',
          body: { value: input.layers },
        }),
      ]);
      if (!centerRes.success || !layersRes.success) {
        throw new Error('Gagal menyimpan pengaturan GIS');
      }
      return input;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'gis'] });
      qc.invalidateQueries({ queryKey: ['public', 'map'] });
    },
  });
}
