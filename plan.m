# SIDPRO — Master Work Plan (Opsi A, B, C + Next Tasks)

```txt
Dokumen   : plan.m
Proyek    : SID Premium Enterprise (sidpro)
Workspace : /root/sidpro
Versi     : 1.0
Tanggal   : 2026-06-18
Baseline  : commit 254d515 (mvp-complaints-v1)
Protokol  : AGENTS.md → AUDIT → PLAN → IMPLEMENT → VALIDATE → TEST → DOCS → PR
```

---

## 0. Ringkasan Eksekutif

Tiga opsi kerja ini melanjutkan MVP setelah modul **pengaduan end-to-end** (`mvp-complaints-v1`).

| Opsi | Nama | Tujuan | Estimasi | Prioritas |
|------|------|--------|----------|-----------|
| **A** | Stabilisasi & Smoke Test | Baseline hijau, regressions tertangkap otomatis | 2–3 hari | **P0 — wajib pertama** |
| **B** | Penduduk & Keluarga MVP | Data inti desa siap untuk surat & laporan | 7–10 hari | **P1 — core MVP** |
| **C** | Tracking Pengaduan Publik | Warga cek status tiket PGD-* tanpa login | 4–5 hari | **P2 — UX warga** |
| **Next** | Surat, Backup, Portal, dll. | Menutup sisa MVP blueprint | 15–25 hari | **P1–P3 bertahap** |

**Urutan eksekusi disarankan:**

```txt
Opsi A (selesai & hijau)
  → Opsi B Sprint B1–B3 (paralel opsional: Opsi C setelah A)
  → Next Tasks fase 1 (surat hardening)
  → Next Tasks fase 2 (backup + portal)
```

**Constraint workspace (wajib):**

- Tidak deploy production, systemd, `/opt/sidpro`, Nginx, HTTPS, domain.
- Tidak commit secret (`.env`, `.staging`).
- Tidak migration destructive tanpa review eksplisit.
- Data warga = data sensitif; NIK/KK wajib masking sesuai permission.

---

## 1. Baseline Saat Ini

### 1.1 Sudah selesai (committed)

| Modul | Status | Tag / Commit |
|-------|--------|--------------|
| Auth + JWT refresh | ✅ | foundation |
| RBAC + Users/Roles UI | ✅ | `mvp-rbac-ui-v1` |
| Audit log viewer | ✅ | `mvp-audit-log-v1` |
| Pengaduan admin workflow | ✅ | `mvp-complaints-v1` |
| Form publik `/pengaduan` | ✅ | POST `/complaints/public` |
| Upload lampiran admin | ✅ | POST `/files/upload` ownerType=complaint |
| Penduduk admin (partial) | 🟡 | CRUD, import, export |
| Keluarga admin (partial) | 🟡 | create, detail, add member |
| Layanan surat (partial) | 🟡 | admin + PDF + QR partial |
| Smoke test script | 🟡 | ada, belum lulus penuh |

### 1.2 Gap kritis yang memblokir

| Gap | Dampak |
|-----|--------|
| `STAGING_ADMIN_PASSWORD` tidak di-set | Smoke test & validasi admin E2E gagal |
| JWT tidak refresh permission setelah seed | Admin dapat 403 sampai re-login |
| Tidak ada API tracking pengaduan publik | Teks sukses form menjanjikan cek status, belum ada halaman |
| Dusun/RT/RW: schema ada, API/UI tidak | Alamat penduduk/KK tidak lengkap |
| Keluarga: edit/hapus anggota/export belum di UI | Operator tidak bisa kelola KK penuh |
| Backup & restore | MVP item #12 belum |

### 1.3 Command validasi standar (semua opsi)

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm prisma:validate
docker compose config -q
```

Smoke test (setelah credential):

```bash
STAGING_ADMIN_PASSWORD='...' ./scripts/smoke-test.sh
# skip seed jika permission sudah sinkron:
SMOKE_RUN_SEED=0 STAGING_ADMIN_PASSWORD='...' ./scripts/smoke-test.sh
```

---

## 2. Opsi A — Stabilisasi & Smoke Test

### 2.1 Goal

Memastikan repository dalam keadaan **merge-ready** dan workflow inti (auth, RBAC, penduduk dasar, keluarga dasar, pengaduan) teruji otomatis via `scripts/smoke-test.sh`.

### 2.2 Roadmap Phase

- **Phase 1** — Core Platform (validasi)
- **Phase 5** — Pengaduan (verifikasi E2E)

### 2.3 Modul terdampak

| Layer | File / area |
|-------|-------------|
| Ops | `.env` (local only), `docs/OPERATIONS.md` |
| Smoke | `scripts/smoke-test.sh` |
| Seed | `prisma/seed/index.ts` |
| API | `apps/api` (restart jika perlu) |
| CI | `.github/workflows/*` (opsional) |

### 2.4 Database changes

**Tidak ada** — hanya seed/sync permission jika diperlukan.

### 2.5 API changes

**Tidak ada** — verifikasi endpoint existing.

### 2.6 UI changes

**Tidak ada** — verifikasi redirect `/admin/*` tanpa login.

### 2.7 RBAC / Security impact

- Pastikan seed menyertakan permission complaints lengkap:
  - `complaints.read`, `complaints.create`, `complaints.update`, `complaints.assign`, `complaints.respond`, `complaints.close`
- Pastikan role `admin_desa` / `operator_desa` memiliki permission yang dibutuhkan smoke test.
- Dokumentasikan: **re-login wajib** setelah `pnpm prisma:seed`.

### 2.8 Audit log impact

Tidak ada perubahan kode; verifikasi smoke test tidak menghapus audit trail penting.

### 2.9 Implementation steps

#### Step A.1 — Credential staging (0.5 hari)

**Tugas:**

1. Set di `.env` (jangan commit):
   ```env
   SEED_ADMIN_EMAIL=admin@demo-desa.id
   SEED_ADMIN_PASSWORD=<strong-password>
   STAGING_ADMIN_EMAIL=admin@demo-desa.id
   STAGING_ADMIN_PASSWORD=<same-as-seed-or-known-hash>
   ```
2. Update `.env.example` jika variabel belum terdokumentasi (tanpa nilai secret).
3. Jalankan `pnpm prisma:seed` agar password admin sinkron.

**DoD partial:**

- [ ] Login manual `POST /api/v1/auth/login` → 200 + accessToken
- [ ] Password tidak muncul di `git diff`

#### Step A.2 — Service health (0.25 hari)

**Tugas:**

1. `pnpm build`
2. Pastikan API `:4000` memakai build terbaru (restart proses dev/prod lokal).
3. `curl http://localhost:4000/api/v1/health` → healthy
4. Opsional: web `:3000` untuk step redirect admin.

#### Step A.3 — Jalankan smoke test penuh (0.5 hari)

**13+ step yang harus PASS:**

| # | Step | Endpoint / aksi |
|---|------|----------------|
| 1 | Health | `GET /api/v1/health` |
| 2 | Admin redirect | `GET /admin/dashboard` tanpa cookie → 302/307 |
| 3 | Login admin | `POST /auth/login` |
| 4 | Dashboard | `GET /reports/dashboard` |
| 5 | Create resident | `POST /residents` |
| 6 | Update resident | `PATCH /residents/:id` |
| 7 | Delete resident | `DELETE /residents/:id` |
| 8 | Create family | `POST /families` |
| 9 | Add family member | `POST /families/:id/members` |
| 10 | RBAC create user | `POST /users` |
| 11 | RBAC assign role + complaints.read | `PUT /users/:id/roles`, login smoke user |
| 12 | RBAC disable user | `PATCH /users/:id/status`, login blocked |
| 13 | Complaints public create | `POST /complaints/public?tenantCode=demo-desa` |
| 14 | Complaints verify | `PATCH /complaints/:id/status` |
| 15 | Complaints assign | `PATCH /complaints/:id/assign` |
| 16 | Complaints response | `POST /complaints/:id/responses` |
| 17 | Logout | `POST /auth/logout` |

#### Step A.4 — Triage kegagalan (0.5–1 hari)

| Gejala | Diagnosis | Fix |
|--------|-----------|-----|
| Login 401 | Password DB ≠ staging password | Re-seed dengan `SEED_ADMIN_PASSWORD` |
| 403 complaints | JWT lama, permission belum ada | Re-login admin |
| 404 endpoint | API belum restart | Rebuild + restart |
| Public create gagal | `tenantCode` salah / tenant tidak ada | Cek seed `demo-desa` |
| RBAC step gagal | Role ID tidak ditemukan | Perbaiki smoke script atau seed role |

#### Step A.5 — Dokumentasi & opsional CI (0.5 hari)

**File:**

- `docs/OPERATIONS.md` — section "Smoke Test Credential Setup"
- `scripts/smoke-test.sh` — perbaiki pesan error jika perlu

**Opsional CI:**

- GitHub Actions job `smoke` dengan secret `STAGING_ADMIN_PASSWORD` (non-blocking awalnya)

### 2.10 Testing plan

| Jenis | Cakupan |
|-------|---------|
| Otomatis | `./scripts/smoke-test.sh` → `FAIL=0` |
| Manual | Login admin UI → buka `/admin/pengaduan` → lihat complaint dari smoke |
| Regresi | `pnpm lint && pnpm typecheck && pnpm test && pnpm build` |

### 2.11 Rollback risk

**Rendah** — tidak ada schema change. Risiko hanya re-seed menimpa data dev.

### 2.12 Definition of Done — Opsi A

- [ ] `STAGING_ADMIN_PASSWORD` terkonfigurasi (local)
- [ ] `./scripts/smoke-test.sh` → semua step PASS
- [ ] Validasi standar hijau
- [ ] `docs/OPERATIONS.md` ter-update
- [ ] Tidak ada secret di commit
- [ ] Tag opsional: `mvp-smoke-green-v1` (jika hanya docs/script fix)

### 2.13 Estimasi

**2–3 hari kerja** (1 developer / 1 AI agent session)

---

## 3. Opsi B — Penduduk & Keluarga MVP Lengkap

### 3.1 Goal

Menyelesaikan **Phase 3 blueprint** (MVP item #4 Data penduduk, #5 Data KK) agar operator desa dapat mengelola data warga end-to-end: wilayah, alamat, mutasi, KK lengkap, import/export, dengan tenant scope dan audit log.

### 3.2 Roadmap Phase

- **Phase 3** — Penduduk & Keluarga

### 3.3 Current repo state (audit)

| Fitur | Backend API | Frontend UI | Gap |
|-------|-------------|-------------|-----|
| List + search penduduk | ✅ | ✅ | Filter lanjutan kurang |
| CRUD penduduk | ✅ | ✅ | Alamat/wilayah belum di form |
| Import/export penduduk | ✅ | ✅ | — |
| NIK masking | ✅ | 🟡 | UI harus konsisten |
| List keluarga | ✅ | ✅ | — |
| Create KK | ✅ | ✅ | headResidentId opsional |
| Detail + add member | ✅ | ✅ | — |
| Update KK | ✅ | 🟡 hook ada, UI minim |
| Delete KK (soft) | ✅ | 🔴 UI belum |
| Remove member | ✅ | 🔴 UI belum |
| Export keluarga | 🔴 API belum | 🔴 | Perlu implement |
| Dusun (Hamlet) | 🔴 | 🔴 | Schema `hamlets` ada |
| RT/RW (NeighborhoodUnit) | 🔴 | 🔴 | Schema ada |
| Civil events / mutasi | 🔴 | 🔴 | Schema `civil_events` ada |
| Address management | 🟡 implicit | 🔴 | Tidak ada modul terpisah |

### 3.4 Modul terdampak

```txt
apps/api/src/modules/
  population/          (extend)
  families/            (extend)
  territories/         (NEW — hamlets + neighborhood units)
  addresses/           (NEW atau bagian territories)

apps/web/src/
  app/(admin)/admin/penduduk/page.tsx
  app/(admin)/admin/keluarga/page.tsx
  app/(admin)/admin/wilayah/page.tsx   (NEW — opsional v1)
  features/residents/use-residents.ts
  features/families/use-families.ts
  features/territories/                (NEW)

packages/validators/src/
  population.ts
  families.ts
  territories.ts                     (NEW)

prisma/schema.prisma                 (mungkin minor, hindari destructive)
prisma/seed/index.ts
docs/modules/population.md
docs/modules/families.md
docs/API_CONTRACT.md
scripts/smoke-test.sh                (extend)
```

### 3.5 Database changes

**Prinsip:** Pakai tabel existing; hindari migration destructive.

| Tabel | Aksi |
|-------|------|
| `hamlets` | Pakai existing — seed minimal 1 dusun demo |
| `neighborhood_units` | Pakai existing — seed RT/RW demo |
| `addresses` | Pakai existing — link ke hamlet + neighborhood_unit |
| `residents` | `addressId` diisi dari form |
| `families` | `addressId`, `headResidentId` wajib saat create |
| `civil_events` | Insert saat mutasi status |

**Migration baru (jika diperlukan):**

- Hanya index/constraint non-destructive (mis. validasi unique sudah ada).
- **Tidak** drop column/table tanpa approval.

**Seed tambahan:**

```txt
demo-desa:
  - 1 hamlet "Dusun Krajan"
  - 2 neighborhood units (RT 01/RW 01, RT 02/RW 01)
  - permission territories.* (jika modul baru)
```

### 3.6 API changes

#### 3.6.1 Modul Territories (NEW)

| Method | Path | Permission | Deskripsi |
|--------|------|------------|-----------|
| GET | `/hamlets` | `territories.read` atau `population.read` | List dusun |
| POST | `/hamlets` | `territories.create` | Buat dusun |
| PATCH | `/hamlets/:id` | `territories.update` | Edit dusun |
| GET | `/hamlets/:id/neighborhood-units` | `territories.read` | List RT/RW per dusun |
| POST | `/neighborhood-units` | `territories.create` | Buat RT/RW |
| PATCH | `/neighborhood-units/:id` | `territories.update` | Edit RT/RW |

**Alternatif MVP:** Gabung ke `population` module jika ingin scope lebih kecil (tanpa halaman admin wilayah terpisah).

#### 3.6.2 Population (extend)

| Method | Path | Perubahan |
|--------|------|-----------|
| POST/PATCH | `/residents` | Terima `addressId` atau nested address `{ hamletId, neighborhoodUnitId, fullAddress }` |
| POST | `/residents/:id/civil-events` | **NEW** — mutasi (moved, deceased, birth, etc.) |
| GET | `/residents` | Filter: `residentStatus`, `gender`, `neighborhoodUnitId` |

#### 3.6.3 Families (extend)

| Method | Path | Perubahan |
|--------|------|-----------|
| PATCH | `/families/:id` | Validasi: hanya satu `isHead=true` per KK |
| GET | `/families/export` | **NEW** — Excel/CSV + audit log |
| POST | `/families` | Validasi `headResidentId` wajib atau auto-set dari member pertama |

### 3.7 UI changes

#### Sprint B1 — Wilayah & alamat (3 hari)

| Task | File | Detail |
|------|------|--------|
| B1.1 | `territories` API + hooks | CRUD dusun & RT/RW |
| B1.2 | `penduduk/page.tsx` | Dropdown dusun → RT/RW; field alamat lengkap |
| B1.3 | `keluarga/page.tsx` | Form create/edit: alamat rumah tangga |
| B1.4 | Seed demo wilayah | Agar form tidak kosong |

#### Sprint B2 — Keluarga operasional (2 hari)

| Task | File | Detail |
|------|------|--------|
| B2.1 | `keluarga/page.tsx` | Modal/drawer edit KK (`useUpdateFamily`) |
| B2.2 | `keluarga/page.tsx` | Hapus anggota + konfirmasi (`useRemoveFamilyMember` — hook baru) |
| B2.3 | `keluarga/page.tsx` | Soft delete KK (`useDeleteFamily` — hook baru) |
| B2.4 | `families.service.ts` | Validasi satu kepala keluarga |
| B2.5 | Export keluarga button | Permission `families.export` |

#### Sprint B3 — Mutasi & polish (2 hari)

| Task | File | Detail |
|------|------|--------|
| B3.1 | Mutasi penduduk | UI: ubah status → `moved`/`deceased` + civil event |
| B3.2 | Filter enterprise | Status, gender, RT/RW di penduduk & keluarga |
| B3.3 | Masking NIK/KK | Sembunyikan di UI jika tidak punya `*.view_sensitive` |
| B3.4 | Drawer detail penduduk | Tampilkan KK terkait, riwayat mutasi |
| B3.5 | Smoke test extend | Family update, remove member, export |

#### Sprint B4 — Docs & release (1 hari)

- Update `docs/modules/population.md`, `families.md`
- Update `docs/API_CONTRACT.md`
- Tag: `mvp-population-v1`

### 3.8 RBAC / Security impact

**Permission baru (usulan):**

```txt
territories.read
territories.create
territories.update
territories.delete
```

Atau map ke `population.*` untuk mengurangi kompleksitas MVP.

**Permission existing wajib dipakai:**

```txt
population.read / create / update / delete / import / export / view_sensitive
families.read / create / update / delete / export / view_sensitive
```

**Aturan data sensitif:**

- NIK/KK di-list: masked kecuali `population.view_sensitive` / `families.view_sensitive`
- Export: wajib permission + audit log
- Import: validasi NIK format, cegah duplikat tenant scope

### 3.9 Tenant-scope impact

Semua query **wajib** filter `tenantId` dari JWT:

- `hamlets`, `neighborhood_units`, `addresses`, `residents`, `families`, `family_members`, `civil_events`

### 3.10 Audit log impact

| Aksi | action | entityType |
|------|--------|------------|
| Create/update/delete resident | create/update/delete | resident |
| Import/export resident | import/export | resident |
| Create/update/delete family | create/update/delete | family |
| Add/remove member | update | family |
| Export family | export | family |
| Civil event | create | civil_event |
| Territory CRUD | create/update/delete | hamlet / neighborhood_unit |

### 3.11 Testing plan

| Jenis | Test |
|-------|------|
| Unit API | Validasi satu head per KK, NIK duplikat ditolak, tenant isolation |
| Smoke | Extend `scripts/smoke-test.sh`: family PATCH, member DELETE, export GET |
| Manual E2E | Buat dusun → RT → penduduk dengan alamat → KK → 2 anggota → mutasi pindah |
| Validasi | `pnpm lint && typecheck && test && build && prisma:validate` |

### 3.12 Rollback risk

| Risiko | Mitigasi |
|--------|----------|
| Migration salah | Hanya additive migration; backup DB dev sebelum migrate |
| Import rusak data | Preview mode import (sudah ada) + dry-run |
| KK head ganda | Constraint di service layer + DB unique partial jika perlu |

### 3.13 Definition of Done — Opsi B

- [ ] Operator dapat CRUD penduduk dengan alamat (dusun/RT/RW)
- [ ] Operator dapat kelola KK lengkap: create, edit, anggota, hapus anggota, soft delete
- [ ] Satu kepala keluarga per KK (validasi backend)
- [ ] Mutasi penduduk (minimal pindah/meninggal) + civil event + audit log
- [ ] Export keluarga berfungsi + tercatat audit
- [ ] Import/export penduduk tetap hijau
- [ ] NIK masking konsisten API + UI
- [ ] Smoke test extended PASS
- [ ] Docs modul ter-update
- [ ] Tag `mvp-population-v1` pushed

### 3.14 Estimasi

**7–10 hari kerja** (tergantung scope wilayah: halaman admin terpisah vs inline di form)

### 3.15 Dependensi

- **Opsi A selesai** (smoke test = safety net)
- Tidak blocking Opsi C (file overlap minimal)

---

## 4. Opsi C — Tracking Pengaduan Publik

### 4.1 Goal

Warga dapat **mengecek status pengaduan** setelah submit menggunakan nomor tiket `PGD-{8 char UUID}` + verifikasi nomor HP, tanpa login.

### 4.2 Roadmap Phase

- **Phase 5** — Pengaduan & Notifikasi (subset: status tracking)

### 4.3 Current repo state

| Item | Status |
|------|--------|
| Submit publik | ✅ `POST /complaints/public` |
| Tampilkan tiket di sukses | ✅ `PGD-{id prefix}` |
| Endpoint track | 🔴 belum ada |
| Halaman `/pengaduan/cek` | 🔴 belum ada |
| Rate limit public | 🟡 perlu untuk endpoint baru |

### 4.4 Modul terdampak

```txt
apps/api/src/modules/complaints/
  complaints.controller.ts    (+ GET/POST track public)
  complaints.service.ts       (+ trackPublic, sanitize response)

packages/validators/src/complaints.ts
  (+ publicComplaintTrackSchema)

apps/web/src/
  app/(public)/pengaduan/cek/page.tsx     (NEW)
  app/(public)/pengaduan/page.tsx         (link ke cek status)
  features/complaints/use-public-complaint-track.ts (NEW)

docs/modules/complaints.md
docs/API_CONTRACT.md
scripts/smoke-test.sh                     (+ step track)
```

### 4.5 Database changes

**Tidak ada** — baca dari `complaints` + `complaint_responses` existing.

Opsional future: tabel `complaint_status_history` untuk timeline akurat (bukan MVP C).

### 4.6 API design (detail)

#### Endpoint (rekomendasi)

```http
POST /api/v1/complaints/public/track?tenantCode=demo-desa
Content-Type: application/json

{
  "ticket": "PGD-19F10A9D",
  "reporterPhone": "08123456789"
}
```

**Alternatif:** `GET` dengan query params (kurang disarankan — log URL exposure).

#### Parsing tiket

```txt
Input:  PGD-19F10A9D (case insensitive)
Parse:  strip prefix "PGD-"
Lookup: WHERE id::text ILIKE '{prefix}%'
        AND tenant.code = tenantCode
        AND reporter_phone matches (normalized)
```

#### Normalisasi telepon

```txt
Strip: spasi, dash, +62 → 0
Compare: full match ATAU last 4 digits (dokumentasikan keputusan)
```

#### Response sukses (sanitized)

```json
{
  "success": true,
  "data": {
    "ticket": "PGD-19F10A9D",
    "title": "Judul pengaduan",
    "category": "Lingkungan",
    "priority": "medium",
    "status": "in_progress",
    "statusLabel": "Diproses",
    "submittedAt": "2026-06-18T10:00:00.000Z",
    "updatedAt": "2026-06-18T12:00:00.000Z",
    "closedAt": null,
    "timeline": [
      { "status": "submitted", "label": "Masuk", "at": "..." },
      { "status": "verified", "label": "Diverifikasi", "at": "..." },
      { "status": "in_progress", "label": "Diproses", "at": "..." }
    ],
    "responses": [
      {
        "message": "Tim sedang menindaklanjuti",
        "at": "2026-06-18T11:00:00.000Z"
      }
    ]
  }
}
```

#### Response error

| HTTP | Kondisi | Pesan generik |
|------|---------|---------------|
| 404 | Tiket tidak ada / tenant salah | "Pengaduan tidak ditemukan" |
| 403 | HP tidak cocok | "Data verifikasi tidak sesuai" |
| 429 | Rate limit | "Terlalu banyak percobaan" |
| 400 | Validasi gagal | Pesan field-specific |

**Jangan bedakan** "tiket tidak ada" vs "HP salah" di pesan (cegah enumeration).

#### Data yang TIDAK boleh di-response

- `reporterEmail`
- `assigneeId` / nama petugas internal
- `tenantId` internal
- Download URL lampiran
- Isi `description` penuh (opsional: ringkasan 100 char saja)

### 4.7 UI changes

#### Halaman `/pengaduan/cek`

| State | UI |
|-------|-----|
| idle | Form: nomor tiket + nomor HP |
| loading | Skeleton / spinner |
| error | Alert merah, pesan generik |
| success | Card status + `ComplaintStepper` + timeline respons |

#### Link dari halaman sukses

Di `/pengaduan` setelah submit:

```txt
[ Cek Status Pengaduan ] → /pengaduan/cek?ticket=PGD-XXX
```

Pre-fill tiket dari query string; HP tetap diisi manual.

#### Form validation (frontend = backend)

```txt
ticket:   min 8 char, pattern PGD-[A-Z0-9]+
phone:    min 8 digit
```

### 4.8 RBAC / Security impact

| Kontrol | Implementasi |
|---------|--------------|
| Public endpoint | `@Public()` decorator |
| Rate limit | 10 req/min/IP (reuse ThrottlerGuard pattern login) |
| Tenant isolation | Resolve tenant dari `tenantCode` query |
| No auth | Tidak expose data admin |
| Audit (opsional) | Log `complaint.track` tanpa PII di metadata |

### 4.9 Tenant-scope impact

Lookup complaint **hanya** dalam tenant yang di-resolve dari `tenantCode`.

### 4.10 Audit log impact

Opsional: `action: 'track'`, `entityType: 'complaint'`, metadata: `{ ticketPrefix }` tanpa phone.

### 4.11 Implementation steps

#### Step C.1 — Validator & service (1 hari)

1. `publicComplaintTrackSchema` di validators
2. `ComplaintsService.trackPublic(tenantCode, body)`
3. Build timeline dari `status` + `updatedAt` + `complaint_responses`
4. Unit test service

#### Step C.2 — Controller + rate limit (0.5 hari)

1. `POST complaints/public/track` dengan `@Public()`
2. Wire ThrottlerGuard / custom rate limit
3. Integration test

#### Step C.3 — Frontend (1.5 hari)

1. Hook `useTrackPublicComplaint`
2. Page `/pengaduan/cek`
3. Update success state `/pengaduan`
4. Mobile-first layout

#### Step C.4 — Docs & smoke (0.5 hari)

1. Update `docs/modules/complaints.md` — flow 6 langkah (+ tracking)
2. Smoke step:
   ```bash
   # setelah public create:
   POST /complaints/public/track → assert status=submitted
   ```

#### Step C.5 — Release (0.5 hari)

- Validasi penuh
- Commit: `feat: add public complaint tracking`
- Tag: `mvp-complaint-tracking-v1`

### 4.12 Testing plan

| Test | Expected |
|------|----------|
| Tiket valid + HP benar | 200 + status |
| Tiket valid + HP salah | 403/404 generik |
| Tiket tidak ada | 404 generik |
| Rate limit burst | 429 |
| Cross-tenant | 404 (tidak leak) |
| UI E2E | Submit → copy tiket → cek status |

### 4.13 Rollback risk

**Rendah** — endpoint additive. Bisa disable route jika abuse.

### 4.14 Definition of Done — Opsi C

- [ ] `POST /complaints/public/track` berfungsi dengan verifikasi HP
- [ ] Rate limit aktif
- [ ] Halaman `/pengaduan/cek` dengan loading/success/error
- [ ] Link dari halaman sukses submit
- [ ] Tidak expose data sensitif / internal
- [ ] Smoke test step track PASS
- [ ] Docs ter-update
- [ ] Tag `mvp-complaint-tracking-v1`

### 4.15 Estimasi

**4–5 hari kerja**

### 4.16 Dependensi

- Opsi A (smoke complaints hijau)
- Bisa paralel dengan Opsi B

---

## 5. Next Natural Tasks (pasca A, B, C)

### 5.1 Prioritas berdasarkan MVP Blueprint

```txt
MVP item status:
 1. Auth + RBAC              ✅
 2. Profil desa               🟡 partial
 3. Portal publik             🟡 partial (banyak placeholder)
 4. Data penduduk             → Opsi B
 5. Data KK                   → Opsi B
 6. Layanan surat             🟡 partial
 7. Template surat PDF        🟡 partial
 8. QR validasi surat         🟡 partial
 9. Pengaduan warga           ✅ (+ Opsi C tracking)
10. Dashboard admin           🟡 partial
11. Audit log                 ✅
12. Backup                    🔴 belum
```

### 5.2 Next Task Fase 1 — Layanan Surat Hardening (5–7 hari)

**Goal:** Surat online end-to-end: pengajuan → verifikasi → approval → PDF → QR validasi → tracking publik.

#### 5.2.1 Audit existing

| Area | File |
|------|------|
| API | `apps/api/src/modules/letters/` |
| UI admin | `apps/web/src/app/(admin)/admin/surat/` |
| Public verify | `apps/web/src/app/(public)/verifikasi-surat/` |
| Settings | `apps/web/src/app/(admin)/admin/surat/pengaturan/` |

#### 5.2.2 Gap yang dikerjakan

| Task | Detail |
|------|--------|
| NT.1.1 | Pengajuan surat dari data `residents` (dropdown pemohon) |
| NT.1.2 | Workflow approval konsisten (stepper seperti pengaduan) |
| NT.1.3 | Nomor surat otomatis + template merge field lengkap |
| NT.1.4 | PDF generation stabil + storage MinIO |
| NT.1.5 | QR validasi publik hardening (rate limit, tidak expose NIK penuh) |
| NT.1.6 | Halaman tracking surat publik (mirip Opsi C) |
| NT.1.7 | Audit log semua mutation surat |
| NT.1.8 | Smoke test: create request → approve → generate PDF → verify QR |

**Tag:** `mvp-letters-v1`

### 5.3 Next Task Fase 2 — Backup & Restore (3–5 hari)

**Goal:** MVP item #12 — backup database + dokumentasi restore.

| Task | Detail |
|------|--------|
| NT.2.1 | Script `scripts/backup-db.sh` (pg_dump, encrypted optional) |
| NT.2.2 | Script `scripts/restore-db.sh` (dev only, guarded) |
| NT.2.3 | Dokumentasi `docs/OPERATIONS.md` — backup schedule |
| NT.2.4 | Opsional: MinIO bucket backup policy |
| NT.2.5 | Audit log entry saat export backup manual |

**Constraint:** Tidak setup cron production di workspace; hanya script + docs.

**Tag:** `mvp-backup-v1`

### 5.4 Next Task Fase 3 — Portal Publik (5–8 hari)

**Goal:** Phase 2 blueprint — halaman placeholder jadi konten nyata.

| Halaman | Status | Task |
|---------|--------|------|
| `/` homepage | 🟡 basic | Statistik desa dari API |
| `/profil-desa` | 🔴 placeholder | Data dari `villages` / tenant profile |
| `/berita` | 🟡 | CMS posts list + detail |
| `/agenda` | 🔴 | Events module atau CMS |
| `/galeri` | 🔴 | File gallery dari MinIO |
| `/transparansi` | 🔴 | Stub APBDes / link dokumen |
| `/layanan` | 🟡 | Daftar layanan + link surat/pengaduan |

**Tag:** `mvp-portal-v1`

### 5.5 Next Task Fase 4 — Pengaduan lanjutan (3–4 hari)

| Task | Detail |
|------|--------|
| NT.4.1 | Upload lampiran warga di form `/pengaduan` (public, size/MIME via API) |
| NT.4.2 | Notifikasi email saat status berubah (adapter + queue BullMQ) |
| NT.4.3 | Rate limit `POST /complaints/public` |
| NT.4.4 | Export laporan pengaduan admin (CSV) |
| NT.4.5 | SLA dashboard (opsional) |

**Tag:** `mvp-complaints-v2`

### 5.6 Next Task Fase 5 — Dashboard & Laporan (4–6 hari)

| Task | Detail |
|------|--------|
| NT.5.1 | Dashboard widget: penduduk, KK, surat, pengaduan |
| NT.5.2 | Modul laporan `docs/modules/reports.md` |
| NT.5.3 | Export laporan dengan permission + audit |
| NT.5.4 | Chart recharts di dashboard |

**Tag:** `mvp-dashboard-v1`

### 5.7 Next Task Fase 6 — Enterprise Hardening (ongoing)

| Task | Phase blueprint |
|------|-----------------|
| 2FA admin | Phase 8 |
| CI smoke test dengan secrets | Phase 8 |
| Security scan (npm audit, SAST) | Phase 8 |
| Multi-tenant admin kabupaten | Phase 8 |
| GIS peta desa | Post-MVP |

---

## 6. Timeline Gabungan (Gantt)

```txt
Minggu 1
├── Opsi A (P0) ............ [████████████] 2-3 hari
└── Start Opsi C (P2) ...... [████░░░░░░░░] paralel hari 3-5

Minggu 2
├── Opsi B Sprint B1 ....... [████████░░░░] wilayah + alamat
└── Opsi C selesai ......... [████████████]

Minggu 3
├── Opsi B Sprint B2-B3 .... [████████████] KK operasional + mutasi
└── Tag mvp-population-v1

Minggu 4
├── Next Fase 1 Surat ...... [████████████]
└── Next Fase 2 Backup ..... [████░░░░░░░░]

Minggu 5-6
├── Next Fase 3 Portal ..... [████████████]
└── Next Fase 4 Pengaduan+ . [████░░░░░░░░]
```

---

## 7. Release & Tag Roadmap

| Urutan | Tag | Isi |
|--------|-----|-----|
| done | `mvp-complaints-v1` | Pengaduan admin + form publik |
| A | `mvp-smoke-green-v1` | Smoke test dokumentasi + hijau |
| B | `mvp-population-v1` | Penduduk + KK lengkap |
| C | `mvp-complaint-tracking-v1` | Cek status pengaduan publik |
| NT.1 | `mvp-letters-v1` | Surat E2E + QR |
| NT.2 | `mvp-backup-v1` | Backup scripts |
| NT.3 | `mvp-portal-v1` | Portal publik |
| NT.4 | `mvp-complaints-v2` | Lampiran warga + notifikasi |
| NT.5 | `mvp-dashboard-v1` | Dashboard + laporan |

**Commit message convention (tetap):**

```txt
feat: add <feature>
fix: <bug>
docs: <documentation>
```

---

## 8. Risk Register

| ID | Risiko | Probabilitas | Dampak | Mitigasi |
|----|--------|--------------|--------|----------|
| R1 | Smoke test gagal login | Tinggi | Block A | Sync SEED + STAGING password |
| R2 | JWT permission stale | Tinggi | 403 palsu | ✅ Web sync `/auth/me` on admin load + refresh; re-login after seed |
| R3 | Enumeration tiket pengaduan | Sedang | Privacy | ✅ Verifikasi HP + rate limit + pesan generik |
| R4 | Import penduduk corrupt data | Sedang | Tinggi | Preview mode + backup sebelum import |
| R5 | KK head ganda | Sedang | Sedang | Validasi service + UI |
| R6 | Scope creep wilayah | Sedang | Delay B | MVP: inline dropdown tanpa halaman admin wilayah |
| R7 | Secret ter-commit | Rendah | Kritis | `git reset .env` sebelum commit |
| R8 | Migration destructive | Rendah | Kritis | Review manual; additive only |

---

## 9. Checklist per Session Kerja (AI Agent)

Setiap sesi implementasi wajib:

```txt
[ ] Baca plan.m section yang relevan
[ ] Baca docs modul terkait
[ ] AUDIT file existing sebelum edit
[ ] Implementasi minimal scope
[ ] RBAC + tenant scope + audit log (jika mutation)
[ ] pnpm lint && typecheck && test && build
[ ] prisma:validate (jika schema berubah)
[ ] Update docs modul
[ ] Smoke test jika menyentuh flow inti
[ ] git status — pastikan tidak ada secret
[ ] Commit hanya jika user minta
```

---

## 10. Quick Reference — File Kunci

```txt
Plan ini           : plan.m
Blueprint          : docs/SID_ENTERPRISE_BLUEPRINT.md
API contract       : docs/API_CONTRACT.md
Operasional        : docs/OPERATIONS.md
Modul pengaduan    : docs/modules/complaints.md
Modul penduduk     : docs/modules/population.md
Modul keluarga     : docs/modules/families.md
Modul surat        : docs/modules/surat.md
Smoke test         : scripts/smoke-test.sh
AGENTS protocol    : AGENTS.md
Planning skill     : .ai/skills/02-planning-skill.md
```

---

## 11. Execution Log (2026-06-18)

| Point | Scope | PR | Tag |
|-------|-------|-----|-----|
| 1 | Opsi A — Smoke test | #2 | `mvp-smoke-green-v1` |
| 2 | B1 — Territories & address | #3 | — |
| 3 | B2 — Family operations | #4 | — |
| 4 | B3 — Resident mutation | #6 | `mvp-population-v1` |
| 5 | Opsi C — Complaint tracking | #5 | `mvp-complaint-tracking-v1` |
| 6 | Surat hardening | #7 | `mvp-letters-v1` |
| 7 | Backup & restore | #8 | `mvp-backup-v1` |
| 8 | Portal publik | #9 | `mvp-portal-v1` |
| 9 | Pengaduan v2 | #10 | `mvp-complaints-v2` |
| 10 | Dashboard & laporan | #11 | `mvp-dashboard-v1` |

---

## 12. Wave 2 Execution Plan (2026-06-18)

| Point | Scope | Tag |
|-------|--------|-----|
| 11 | Public complaint attachments (NT.4.1) | `mvp-complaints-v2.1` |
| 12 | Email notifications on status change (NT.4.2) | `mvp-complaints-v2.2` |
| 13 | Family export API + UI | `mvp-population-v2` |
| 14 | Admin profil desa UI | `mvp-portal-v2` |
| 15 | Reports export endpoints (NT.5.3) | `mvp-dashboard-v2` |
| 16 | Admin berita CMS CRUD | `mvp-portal-v2` |
| 17 | Galeri real MinIO URLs | `mvp-portal-v2` |
| 18 | Transparansi dev projects public | `mvp-portal-v2` |
| 19 | CI smoke test in GitHub Actions | `mvp-smoke-green-v2` |
| 20 | Admin galeri + pembangunan UI | `mvp-portal-v2` |

### Wave 2 Execution Log

| Point | PR | Status |
|-------|-----|--------|
| 11 | #12 | ✅ merged → `mvp-complaints-v2.1` |
| 12 | #20 | ✅ merged → `mvp-complaints-v2.2` |
| 13 | #13 | ✅ merged → `mvp-population-v2` |
| 14 | #14 | ✅ merged → `mvp-portal-v2` |
| 15 | #15 | ✅ merged → `mvp-dashboard-v2` |
| 16 | #18 | ✅ merged → `mvp-portal-v2` |
| 17–18 | #16 | ✅ merged → `mvp-portal-v2` |
| 19 | #17 | ✅ merged → `mvp-smoke-green-v2` |
| 20 | #19 | ✅ merged → `mvp-portal-v2` |

---

## 13. Wave 3 — Risk Mitigation (2026-06-19)

| Point | Scope | Mitigates |
|-------|--------|-----------|
| 21 | Auth permission sync (`/auth/me` on admin load + refresh) | R2 |
| 22 | Worker systemd + OPERATIONS docs | Email queue silent fail |

### Wave 3 Execution Log

| Point | PR | Status |
|-------|-----|--------|
| 21–22 | #21 | ✅ merged |

---

## 14. Wave 4 — Enterprise Admin UI (2026-06-19)

| Point | Scope | Tag |
|-------|--------|-----|
| 23 | Finance report summary fix (API) | `mvp-enterprise-v1` |
| 24 | Admin keuangan live UI | `mvp-enterprise-v1` |
| 25 | Admin aset live UI | `mvp-enterprise-v1` |
| 26 | Admin bantuan sosial live UI | `mvp-enterprise-v1` |

### Wave 4 Execution Log

| Point | PR | Status |
|-------|-----|--------|
| 23–26 | #22 | ✅ merged → `mvp-enterprise-v1` |

---

## 15. Wave 5 — Staging & Hardening (2026-06-19)

| Point | Scope | Tag |
|-------|--------|-----|
| 27 | Staging deploy docs + worker checklist | `mvp-staging-ops-v2` |
| 28 | Admin wilayah (dusun/RT/RW) UI | `mvp-population-v3` |
| 29 | CI Redis for smoke (REDIS_URL) | `mvp-smoke-green-v3` |

### Wave 5 Execution Log

| Point | PR | Status |
|-------|-----|--------|
| 27–29 | #23 | ✅ merged → `mvp-staging-ops-v2`, `mvp-population-v3`, `mvp-smoke-green-v3` |

---

## 16. Wave 6 — Population & Portal Polish (2026-06-19)

| Point | Scope | Tag |
|-------|--------|-----|
| 30 | Admin peristiwa sipil UI | `mvp-population-v4` |
| 31 | Portal layanan canonical config (bukan demo) | `mvp-portal-services-v1` |
| 32 | CI backup script verification | `mvp-backup-ci-v1` |

### Wave 6 Execution Log

| Point | PR | Status |
|-------|-----|--------|
| 30–32 | #24 | ✅ merged → `mvp-population-v4`, `mvp-portal-services-v1`, `mvp-backup-ci-v1` |

---

## 17. Wave 7 — Portal CMS & Contact (2026-06-19)

| Point | Scope | Tag |
|-------|--------|-----|
| 33 | Public footer live village + kontak | `mvp-portal-v3` |
| 34 | Admin CMS agenda UI | `mvp-portal-v3` |
| 35 | Seed agenda + village contact setting | `mvp-portal-v3` |

### Wave 7 Execution Log

| Point | PR | Status |
|-------|-----|--------|
| 33–35 | #25 | ✅ merged → `mvp-portal-v3` |

---

## 18. Wave 8 — Security & Portal Nav (2026-06-19)

| Point | Scope | Tag |
|-------|--------|-----|
| 36 | 2FA admin foundation (TOTP setup/login) | `mvp-security-v1` |
| 37 | CI dependency audit enforced | `mvp-security-v1` |
| 38 | Portal header nav canonical config | `mvp-portal-v4` |

### Wave 8 Execution Log

| Point | PR | Status |
|-------|-----|--------|
| 36–38 | #26 | ✅ merged → `mvp-security-v1`, `mvp-portal-v4` |

---

## 19. Wave 9 — Enterprise Security & Post-MVP Roadmap (2026-06-19)

| Point | Scope | Tag |
|-------|--------|-----|
| 39 | Migrasi `xlsx` → `exceljs` (CVE mitigation) | `mvp-security-v2` |
| 40 | Kebijakan 2FA wajib admin + enrollment login | `mvp-security-v2` |
| 41 | Post-MVP roadmap (GIS, multi-tenant kabupaten, BUMDes, AI) | `mvp-roadmap-v1` |

### Wave 9 Execution Log

| Point | PR | Status |
|-------|-----|--------|
| 39–41 | #27 | ✅ merged → `mvp-security-v2`, `mvp-roadmap-v1` |

### Post-MVP Backlog (dokumentasi)

| Modul | Prioritas | Catatan |
|-------|-----------|---------|
| GIS / Peta Desa | P2 | Layer wilayah, aset, pembangunan; integrasi tile server |
| Multi-tenant Kabupaten | P1 | Hierarki kabupaten → kecamatan → desa; admin kabupaten read-only/aggregate |
| BUMDes | P2 | Unit usaha desa, laporan keuangan terpisah dari APBDes |
| AI Assistant | P3 | Setelah core MVP stabil; adapter eksplisit, no vendor lock-in |

---

## 20. Wave 9.1 — Codex Hotfix (2026-06-19)

| Point | Scope | Tag |
|-------|--------|-----|
| 42 | 2FA pending token blocked from JWT routes | `mvp-security-v3` |
| 43 | Complaint ticket exact 8-char suffix | `mvp-security-v3` |
| 44 | CSV export formula injection mitigation | `mvp-security-v3` |
| 45 | Report export RBAC AND permissions | `mvp-security-v3` |
| 46 | Gallery file signing tenant-scoped | `mvp-security-v3` |

### Merge policy (Codex)

```txt
PR dibuka → tunggu Codex review
  → ada temuan P1/P2 valid → fix di branch yang sama → push → re-review
  → tidak ada temuan / semua sudah ditangani → merge + tag
```

### Wave 9.1 Execution Log

| Point | PR | Status |
|-------|-----|--------|
| 42–46 | #28 | ✅ merged → `mvp-security-v3` |

---

## 21. Wave 10 — Multi-tenant Kabupaten Foundation (2026-06-19)

| Point | Scope | Tag |
|-------|--------|-----|
| 47 | Tenant hierarchy schema (`parentId`, `level`) | `mvp-tenant-v1` |
| 48 | Regency aggregate API + RBAC | `mvp-tenant-v1` |
| 49 | Admin kabupaten dashboard UI | `mvp-tenant-v1` |

### Wave 10 Execution Log

| Point | PR | Status |
|-------|-----|--------|
| 47–49 | #29 | ✅ merged → `mvp-tenant-v1` |

---

## 22. Wave 11 — Codex P2 Backlog Batch (2026-06-19)

| Point | Scope | Tag |
|-------|--------|-----|
| 50 | `syncAuthProfile` without JWT reissue | `mvp-ux-v1` |
| 51 | Export binary without token refresh | `mvp-ux-v1` |
| 52 | `residentId` required for warga letter requests | `mvp-ux-v1` |
| 53 | Stale surat tracking results on error | `mvp-ux-v1` |

### Wave 11 Execution Log

| Point | PR | Status |
|-------|-----|--------|
| 50–53 | — | 🚧 in progress |

---

*Dokumen ini adalah living plan. Update versi dan tanggal setiap kali scope berubah.*
