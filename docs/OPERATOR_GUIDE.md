# SIDPRO Operator Guide

Panduan ini ditujukan untuk operator desa yang menggunakan SIDPRO dalam pekerjaan harian administrasi desa. Gunakan panduan ini bersama SOP internal desa, matriks kewenangan, dan kebijakan keamanan data warga.

## 1. Prinsip Umum Operator

- Gunakan akun pribadi yang diberikan admin, bukan akun bersama.
- Pastikan data yang dibuka, diubah, diekspor, atau dibagikan sesuai tugas dan kewenangan jabatan.
- Periksa kembali data NIK, nomor KK, nama, alamat, dan dokumen pendukung sebelum menyimpan perubahan.
- Catat atau laporkan ke admin jika menemukan data tidak wajar, akses yang tidak sesuai, atau aktivitas mencurigakan.
- Logout setelah selesai menggunakan aplikasi, terutama di komputer bersama kantor desa.

## 2. Login

1. Buka alamat SIDPRO yang diberikan admin desa.
2. Masukkan email/username dan password akun operator.
3. Klik **Masuk**.
4. Jika kredensial benar dan akun aktif, sistem akan membuka halaman dashboard.
5. Jika login gagal, periksa kembali penulisan email/username, password, dan status koneksi internet.

Catatan:

- Jangan menyimpan password di catatan yang mudah dilihat orang lain.
- Jangan memberikan password kepada rekan kerja, warga, vendor, atau pihak luar.
- Laporkan percobaan login mencurigakan kepada admin.

## 3. Verifikasi 2FA Jika Aktif

Jika Two-Factor Authentication (2FA) diaktifkan untuk akun operator:

1. Setelah password diterima, sistem akan meminta kode verifikasi 2FA.
2. Buka aplikasi autentikator yang sudah didaftarkan, misalnya aplikasi authenticator di ponsel kerja.
3. Masukkan kode 6 digit yang sedang aktif.
4. Klik **Verifikasi** untuk melanjutkan ke dashboard.
5. Jika kode ditolak, tunggu kode baru muncul lalu coba kembali.

Jika perangkat 2FA hilang atau tidak dapat diakses, segera hubungi admin sistem untuk proses pemulihan sesuai SOP desa.

## 4. Dashboard

Dashboard adalah halaman awal untuk melihat ringkasan operasional desa.

Yang biasanya dapat dilihat operator:

- Statistik penduduk dan keluarga.
- Ringkasan permohonan surat.
- Ringkasan pengaduan masyarakat.
- Aktivitas atau notifikasi terbaru.
- Tautan cepat ke modul yang sering digunakan.

Langkah penggunaan:

1. Masuk ke aplikasi.
2. Baca kartu statistik dan notifikasi prioritas.
3. Gunakan menu sidebar atau tautan cepat untuk membuka modul kerja.
4. Jika ada data yang terlihat tidak sesuai, buka modul terkait dan lakukan verifikasi sebelum memperbarui data.

## 5. Kelola Penduduk

Modul penduduk digunakan untuk mengelola data individu warga.

Alur umum:

1. Buka menu **Penduduk**.
2. Gunakan pencarian atau filter untuk menemukan warga berdasarkan nama, NIK, dusun/RT/RW, status, atau kriteria lain yang tersedia.
3. Buka detail penduduk untuk melihat data lengkap sesuai hak akses.
4. Untuk menambah data, klik **Tambah Penduduk** lalu isi formulir sesuai dokumen resmi.
5. Untuk memperbarui data, klik **Edit** pada detail penduduk dan ubah hanya data yang sudah terverifikasi.
6. Simpan perubahan dan pastikan sistem menampilkan status berhasil.
7. Untuk data penting, pastikan perubahan tercatat dalam audit log.

Hal yang harus diperhatikan:

- NIK adalah data sensitif; jangan menyalin atau membagikannya tanpa dasar kewenangan.
- Pastikan format NIK, tanggal lahir, jenis kelamin, alamat, dan relasi keluarga sesuai dokumen resmi.
- Hindari membuat data ganda. Cari data warga terlebih dahulu sebelum menambah penduduk baru.
- Gunakan fitur upload dokumen hanya untuk file yang sah dan relevan.

## 6. Kelola Keluarga

Modul keluarga/KK digunakan untuk mengelola struktur keluarga dan anggota dalam satu nomor KK.

Alur umum:

1. Buka menu **Keluarga** atau **Kartu Keluarga**.
2. Cari keluarga berdasarkan nomor KK, kepala keluarga, alamat, dusun/RT/RW, atau filter lain.
3. Buka detail keluarga untuk melihat kepala keluarga dan daftar anggota.
4. Untuk menambah keluarga baru, klik **Tambah Keluarga** dan isi data KK sesuai dokumen resmi.
5. Tambahkan anggota keluarga dari data penduduk yang sudah ada atau melalui alur yang disediakan sistem.
6. Perbarui hubungan keluarga, status anggota, atau alamat hanya berdasarkan dokumen valid.
7. Simpan perubahan dan cek kembali ringkasan anggota keluarga.

Hal yang harus diperhatikan:

- Nomor KK adalah data sensitif dan harus diperlakukan seperti data pribadi terlindungi.
- Pastikan satu penduduk tidak terhubung ke keluarga aktif yang salah.
- Perubahan kepala keluarga, pindah anggota, atau pemecahan KK harus mengikuti SOP administrasi desa.
- Export data keluarga hanya boleh dilakukan jika diperlukan untuk tugas resmi.

## 7. Proses Surat

Modul surat digunakan untuk memproses permohonan surat dari warga atau input operator.

Alur umum:

1. Buka menu **Layanan Surat** atau **Surat**.
2. Pilih daftar permohonan dengan status baru/menunggu verifikasi.
3. Buka detail permohonan dan periksa:
   - identitas pemohon;
   - jenis surat;
   - tujuan penggunaan;
   - dokumen lampiran;
   - catatan tambahan.
4. Jika data belum lengkap, kembalikan permohonan atau minta pemohon melengkapi data sesuai SOP.
5. Jika data valid, lanjutkan proses verifikasi/approval sesuai kewenangan.
6. Generate dokumen surat dari template yang tersedia.
7. Periksa hasil surat sebelum ditandatangani atau diterbitkan.
8. Setelah final, ubah status sesuai proses: disetujui, diterbitkan, selesai, atau ditolak.
9. Jika sistem menyediakan QR validation, pastikan surat final memiliki kode/QR validasi yang benar.

Hal yang harus diperhatikan:

- Jangan menerbitkan surat jika identitas atau dokumen pendukung belum valid.
- Gunakan template resmi yang sudah disetujui desa.
- Setiap approval, reject, generate, atau download surat penting harus dapat ditelusuri melalui audit log.

## 8. Proses Pengaduan

Modul pengaduan digunakan untuk menerima, menindaklanjuti, dan menutup laporan masyarakat.

Alur umum:

1. Buka menu **Pengaduan**.
2. Filter pengaduan berdasarkan status, prioritas, kategori, tanggal, atau petugas penanggung jawab.
3. Buka detail pengaduan untuk melihat isi laporan, identitas pelapor bila tersedia, lokasi, lampiran, dan riwayat respons.
4. Tetapkan kategori, prioritas, dan petugas penanggung jawab sesuai SOP.
5. Berikan respons awal jika diperlukan.
6. Perbarui status secara bertahap, misalnya baru, diproses, menunggu tindak lanjut, selesai, atau ditolak.
7. Tambahkan catatan tindak lanjut agar riwayat penyelesaian jelas.
8. Tutup pengaduan hanya jika penyelesaian sudah sesuai prosedur.

Hal yang harus diperhatikan:

- Jangan menyebarkan identitas pelapor atau isi pengaduan kepada pihak yang tidak berwenang.
- Lampiran pengaduan harus diperiksa dengan hati-hati dan tidak diunduh ke perangkat pribadi tanpa kebutuhan kerja.
- Respons operator harus profesional, jelas, dan sesuai kebijakan layanan desa.

## 9. Lihat Audit Log

Audit log digunakan untuk melihat jejak aktivitas penting di sistem.

Alur umum:

1. Buka menu **Audit Log** jika akun memiliki izin.
2. Gunakan filter modul, aksi, aktor, rentang tanggal, atau kata kunci.
3. Buka detail log untuk melihat ringkasan aktivitas.
4. Cocokkan aktivitas dengan tiket kerja, permohonan surat, atau perubahan data jika sedang melakukan pemeriksaan.
5. Laporkan aktivitas yang tidak dikenal atau mencurigakan kepada admin/supervisor.

Catatan:

- Audit log membantu memastikan perubahan data, export, approval, dan aktivitas penting dapat ditelusuri.
- Detail audit log tidak boleh digunakan untuk mencari data pribadi di luar kebutuhan pemeriksaan resmi.

## 10. Export Data

Export data digunakan untuk kebutuhan laporan resmi, pelayanan, atau administrasi internal.

Alur umum:

1. Buka modul yang menyediakan export, misalnya Penduduk, Keluarga, Surat, Pengaduan, atau Laporan.
2. Terapkan filter yang sesuai agar data yang diekspor hanya data yang diperlukan.
3. Klik **Export** dan pilih format yang tersedia, misalnya CSV, Excel, atau PDF.
4. Pastikan tujuan export sesuai kewenangan dan kebutuhan kerja.
5. Simpan file export di lokasi kerja yang aman.
6. Hapus file export dari perangkat lokal jika sudah tidak diperlukan atau sesuai kebijakan retensi desa.

Aturan penting:

- Export data sensitif harus sesuai kewenangan operator.
- Jangan mengirim file export melalui kanal pribadi yang tidak disetujui.
- Jangan mengunggah file export ke layanan pihak ketiga tanpa persetujuan resmi.
- Aktivitas export harus dapat diaudit.

## 11. Catatan Keamanan Data

Data warga adalah data sensitif. Operator wajib menjaga kerahasiaan dan integritas data berikut:

- NIK.
- Nomor KK.
- Alamat dan data domisili.
- Dokumen kependudukan.
- Data status keluarga.
- Data bantuan sosial.
- Data pengaduan.
- Riwayat layanan surat.

Kewajiban operator:

- Jangan membagikan akun kepada siapa pun.
- Gunakan 2FA jika tersedia atau diwajibkan admin.
- Gunakan password kuat dan berbeda dari akun pribadi.
- Jangan membuka data warga yang tidak terkait pekerjaan.
- Jangan menyalin NIK/KK ke chat pribadi, catatan tidak aman, atau dokumen tidak resmi.
- Pastikan export data dilakukan hanya untuk kebutuhan resmi dan sesuai kewenangan.
- Segera laporkan kehilangan perangkat, dugaan kebocoran password, atau akses tidak sah.

## 12. Troubleshooting Sederhana

### 12.1 Lupa Password

Langkah yang disarankan:

1. Gunakan fitur **Lupa Password** jika tersedia di halaman login.
2. Periksa email resmi untuk instruksi reset password.
3. Jika email tidak diterima, hubungi admin sistem desa.
4. Setelah password direset, buat password baru yang kuat.
5. Jika merasa akun disalahgunakan, minta admin memeriksa audit log dan sesi aktif.

### 12.2 File Gagal Upload

Kemungkinan penyebab:

- Ukuran file melebihi batas.
- Tipe file tidak diizinkan.
- Koneksi internet tidak stabil.
- Nama file terlalu panjang atau menggunakan karakter yang tidak umum.
- Storage sistem sedang bermasalah.

Langkah perbaikan:

1. Pastikan file sesuai format yang diizinkan, misalnya PDF/JPG/PNG sesuai aturan modul.
2. Kompres file jika ukurannya terlalu besar.
3. Ganti nama file dengan format sederhana, misalnya `nik-nama-dokumen.pdf` tanpa karakter khusus berlebihan.
4. Coba upload ulang dengan koneksi yang stabil.
5. Jika tetap gagal, catat waktu kejadian, nama modul, ukuran file, dan pesan error lalu laporkan ke admin.

### 12.3 Surat Gagal Generate

Kemungkinan penyebab:

- Data pemohon belum lengkap.
- Template surat belum tersedia atau bermasalah.
- Nomor surat belum dikonfigurasi.
- Layanan generate dokumen/PDF sedang bermasalah.

Langkah perbaikan:

1. Periksa kembali data pemohon dan isian permohonan.
2. Pastikan jenis surat memiliki template aktif.
3. Pastikan nomor surat atau pengaturan surat sudah benar.
4. Coba generate ulang setelah data diperbaiki.
5. Jika masih gagal, catat jenis surat, nama pemohon, waktu kejadian, dan pesan error lalu laporkan ke admin.

### 12.4 Email Notifikasi Tidak Terkirim

Kemungkinan penyebab:

- Alamat email penerima salah atau tidak aktif.
- Email masuk ke folder spam/junk.
- Worker/background job tidak berjalan.
- Konfigurasi SMTP belum aktif atau sedang bermasalah.
- Koneksi ke layanan email terganggu.

Langkah perbaikan:

1. Pastikan alamat email penerima benar.
2. Minta penerima memeriksa folder spam/junk.
3. Coba kirim ulang notifikasi jika fitur tersedia.
4. Jika email tetap tidak terkirim, laporkan ke admin dengan informasi modul, penerima, waktu kejadian, dan pesan error.
5. Admin perlu memeriksa status worker, konfigurasi SMTP, dan log aplikasi.

## 13. Kapan Harus Menghubungi Admin

Hubungi admin sistem jika:

- Akun terkunci, tidak aktif, atau lupa password tidak dapat dipulihkan mandiri.
- Perangkat 2FA hilang atau kode 2FA selalu ditolak.
- Ada data penduduk/keluarga yang tidak dapat diperbaiki melalui alur normal.
- Surat gagal generate berulang.
- File penting gagal upload berulang.
- Email notifikasi tidak terkirim untuk banyak pengguna.
- Muncul aktivitas audit log yang tidak dikenal.
- Terjadi dugaan kebocoran data, akun dipakai orang lain, atau akses tidak sah.
