# Roadmap Update Policy

Dokumen ini mengatur kapan dan bagaimana roadmap serta register audit SIDPRO harus diperbarui. Tujuannya adalah menjaga status proyek dapat ditelusuri dari perubahan repository, bukan dari ingatan chat atau asumsi.

## Sumber Kebenaran

| Dokumen | Fungsi |
| --- | --- |
| [`docs/ROADMAP.md`](../ROADMAP.md) | Ringkasan status, prioritas, dan blocker audit. |
| [`docs/audits/AUDIT_MASTER_REGISTER.md`](AUDIT_MASTER_REGISTER.md) | Status audit, bukti, batas klaim, dan kriteria closure. |
| `docs/audits/AUDIT-*.md` | Detail temuan, scope, implementasi, dan validasi audit tertentu. |
| Pull request dan workflow CI | Bukti implementasi dan validasi. |

Bila terdapat perbedaan, detail audit dan bukti PR/CI harus diperiksa terlebih dahulu. `ROADMAP.md` adalah ringkasan, bukan pengganti bukti teknis.

## Kapan Pembaruan Wajib Dilakukan

Dokumentasi roadmap wajib diperbarui dalam pull request yang sama bila perubahan melakukan satu atau lebih hal berikut:

1. menambah, memperbaiki, atau menutup temuan audit;
2. mengubah status audit atau status temuan;
3. menambah bukti validasi, workflow CI, migration guard, test, runbook, atau observability;
4. menemukan risiko baru, regresi, blocker, atau batasan yang relevan;
5. mengubah scope audit, prioritas, atau syarat closure;
6. mencatat hasil staging/production/restore drill yang sebelumnya belum ada.

Bila pull request tidak berdampak pada roadmap, PR tetap harus menyatakan alasan `No roadmap impact`.

## Format Wajib di Pull Request

Setiap PR harus memiliki bagian berikut:

```md
## Roadmap Impact

- Audit: AUDIT-<nomor>, atau `None`
- Temuan / area: <ID temuan atau deskripsi singkat>
- Status sebelum: <status dari register>
- Status sesudah: <status dari register>
- Bukti validasi: <test, workflow, migration, atau command>
- Dokumen diperbarui: <path dokumen, atau `None`>
- No roadmap impact: <alasan, bila Audit = None>
```

Contoh PR yang menyelesaikan sebagian pekerjaan AUDIT-5:

```md
## Roadmap Impact

- Audit: AUDIT-5
- Temuan / area: Performance evidence untuk finance report export
- Status sebelum: In Progress
- Status sesudah: In Progress
- Bukti validasi: `EXPLAIN (ANALYZE, BUFFERS)` fixture + CI database test
- Dokumen diperbarui: `docs/ROADMAP.md`, `docs/audits/AUDIT-5-...md`
- No roadmap impact: N/A
```

Contoh PR dependency rutin tanpa perubahan status audit:

```md
## Roadmap Impact

- Audit: None
- Temuan / area: None
- Status sebelum: N/A
- Status sesudah: N/A
- Bukti validasi: CI dan Security Audit
- Dokumen diperbarui: None
- No roadmap impact: Pembaruan dependency rutin tidak mengubah temuan, scope, status, atau bukti audit.
```

## Prosedur Pembaruan

### 1. Tentukan audit yang terdampak

Gunakan scope dalam `AUDIT_MASTER_REGISTER.md`. Satu PR dapat memengaruhi lebih dari satu audit, misalnya release gate dapat berdampak pada AUDIT-7 dan AUDIT-8.

### 2. Perbarui dokumen audit detail

Jika audit memiliki dokumen khusus, perbarui bagian berikut sesuai kebutuhan:

- status;
- finding atau risk;
- implementasi;
- validation evidence;
- pekerjaan tersisa;
- deployment/staging/production evidence.

Jangan menghapus finding lama hanya karena sudah diperbaiki. Ubah statusnya menjadi `Resolved`, `Mitigated`, atau `Accepted`, lalu tautkan bukti.

### 3. Perbarui Master Register

Perbarui status, bukti, batas klaim, atau kriteria closure pada entry audit terkait ketika perubahan bersifat material.

### 4. Perbarui Roadmap Ringkas

Perbarui `docs/ROADMAP.md` jika salah satu hal berikut berubah:

- status audit;
- urutan prioritas;
- blocker;
- klaim readiness;
- rujukan dokumen baru.

### 5. Isi Roadmap Impact pada PR

Bagian ini wajib diisi meskipun jawabannya `None`. Reviewer harus dapat membedakan perubahan tanpa dampak roadmap dari perubahan yang lupa dicatat.

## Aturan Status

- `Evidence Partial` tidak boleh dipromosikan ke `Closed` tanpa scope dan closure evidence penuh.
- `In Progress` tidak berarti semua temuan sudah diketahui; temuan baru harus dicatat saat ditemukan.
- `Blocked by Environment` harus menyebut environment/data/akses yang hilang dan bukti yang tertunda.
- `Validation Pending` hanya boleh digunakan bila implementasi sudah ada tetapi evidence yang disyaratkan belum tersedia.
- `Closed` harus menyebut dokumen closure, bukti validasi, dan tanggal/commit closure.

## Batasan Automation Saat Ini

Pada baseline policy ini, pengisian Roadmap Impact difasilitasi oleh template PR dan dicek saat review. Belum ada workflow CI yang memverifikasi ketepatan isi status atau memastikan semua perubahan teknis harus menyentuh file roadmap.

Automation semacam itu dapat ditambahkan kemudian, tetapi tidak boleh memaksa update roadmap untuk perubahan yang benar-benar tidak berdampak. Kualitas isi tetap memerlukan review manusia.

## Review Checklist

Reviewer perubahan yang relevan dengan audit harus memeriksa:

- audit yang dipilih sesuai scope;
- status sebelum/sesudah tidak bertentangan dengan register;
- bukti validasi benar-benar ada;
- dokumen detail dan roadmap ringkas konsisten;
- klaim `Closed` memenuhi kriteria closure;
- blocker atau environment limitation tidak disembunyikan.
