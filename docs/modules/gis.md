# Module: GIS / Peta Desa

Purpose: public village map with configurable center coordinates and point layers.

Users: admin_desa (settings), public visitors (read-only map).

Settings (tenant scope):

| Key | Value shape |
|-----|-------------|
| `gis.map_center` | `{ lat, lng, zoom }` |
| `gis.map_layers` | `[{ id, name, lat, lng, layerType }]` |

Screens:

- `/admin/pengaturan` → card **Peta Desa (GIS)**
- `/peta-desa` — public OpenStreetMap embed + layer list

API:

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/public/map?tenantCode=` | public |
| GET/PUT | `/api/v1/settings/gis.map_center` | `settings.manage` |
| GET/PUT | `/api/v1/settings/gis.map_layers` | `settings.manage` |

Done when: admin can edit center/layers and public map reflects changes.

Tag: `mvp-gis-v2` (Wave 25–26).

Future: tile server adapter, polygon boundaries, publish workflow.
