# Production Release Runbook

Dokumen ini untuk deployment **Docker Compose production** menggunakan `docker-compose.prod.yml`. Jalankan dari checkout release yang bersih di server, misalnya `/opt/sidpro`.

## Tujuan Release Gate

`bash scripts/production-release.sh` menjalankan urutan berikut dan berhenti pada error pertama:

1. memvalidasi konfigurasi Compose dan memastikan `NODE_ENV=production`;
2. menyalakan PostgreSQL, Redis, dan MinIO lalu menunggu healthcheck;
3. membuat backup PostgreSQL dan MinIO secara atomik;
4. memverifikasi checksum, archive, serta restore database ke database sementara;
5. menjalankan preflight tenant integrity dan menolak `budget_items.realized` negatif;
6. menjalankan `prisma migrate deploy` melalui service `db-maintenance`;
7. membangun serta menyalakan service production;
8. mengecek migration status, tenant integrity, konsistensi ledger keuangan, healthcheck, dan endpoint publik.

Tidak ada seed ulang dalam release gate.

## Persiapan Server

1. Gunakan file env server-local dengan izin ketat, misalnya `/etc/sidpro/production.env`:

```bash
sudo install -d -m 700 /etc/sidpro
sudo install -m 600 /dev/null /etc/sidpro/production.env
sudo chown root:root /etc/sidpro/production.env
```

2. Isi secret production yang nyata. Untuk Compose, gunakan hostname internal:

```dotenv
NODE_ENV=production
DATABASE_URL=postgresql://sidpro:<password-kuat>@postgres:5432/sidpro?schema=public
REDIS_URL=redis://redis:6379
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ROOT_USER=<user-kuat>
MINIO_ROOT_PASSWORD=<password-kuat>
MINIO_BUCKET=sidpro-files
POSTGRES_USER=sidpro
POSTGRES_PASSWORD=<password-kuat>
POSTGRES_DB=sidpro
JWT_SECRET=<secret-panjang-acak>
NEXT_PUBLIC_ENABLE_DEMO_FALLBACK=false
ENABLE_SWAGGER=false
ENABLE_PDF_WORKER=false
NGINX_HTTP_PORT=80
```

3. Pastikan Docker Engine, Docker Compose v2, `gzip`, `tar`, dan `sha256sum` tersedia pada server.

4. Pastikan checkout source bersih. Release runner menolak perubahan tracked yang belum di-commit.

## Release

```bash
cd /opt/sidpro
git fetch --tags origin
git checkout <release-tag-atau-commit>
git pull --ff-only

sudo SIDPRO_ENV_FILE=/etc/sidpro/production.env \
  SIDPRO_BACKUP_DIR=/var/backups/sidpro \
  bash scripts/production-release.sh
```

Gunakan `SIDPRO_RUN_AUTH_SMOKE=1` bila server juga memiliki kredensial smoke yang diizinkan untuk dipakai:

```bash
sudo SIDPRO_ENV_FILE=/etc/sidpro/production.env \
  SIDPRO_BACKUP_DIR=/var/backups/sidpro \
  SIDPRO_RUN_AUTH_SMOKE=1 \
  bash scripts/production-release.sh
```

Authenticated smoke tidak melakukan seed ulang (`SMOKE_RUN_SEED=0`).

## Artefak Backup

Setiap release menghasilkan:

- `db_<release>.sql.gz` dan checksum SHA-256;
- `uploads_<release>.tar.gz` dan checksum SHA-256;
- `release_<release>.manifest` yang mengikat artifact backup dengan revision release.

Sebelum migrasi, `verify-production-backup.sh` melakukan restore dump ke database sementara bernama `sidpro_restore_verify_*`, memeriksa tabel `_prisma_migrations`, lalu menghapus database sementara tersebut.

## Kegagalan dan Pemulihan

Release runner **tidak melakukan rollback otomatis** setelah migration berjalan. Mengembalikan binary lama ketika schema sudah berubah bisa membuat aplikasi tidak kompatibel dengan data. Bila release gagal:

1. catat path manifest backup yang dicetak runner;
2. periksa log `docker compose -f docker-compose.prod.yml logs`;
3. evaluasi kompatibilitas migration dan aplikasi sebelumnya;
4. restore database/object storage hanya setelah keputusan rollback disetujui;
5. jalankan `bash scripts/production-post-deploy-validate.sh` setelah pemulihan.

Migration ledger keuangan menolak nilai `budget_items.realized` negatif dan mengubah saldo positif lama menjadi opening-balance entry. Karena itu backup dan restore verification merupakan syarat release, bukan langkah opsional.
