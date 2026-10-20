# Ruang 3D untuk Hermes di Helipod

Paket ini berisi kode Ruang asli (kantor 3D, agen, task board, kalender, memory, dan logs), bukan simulasi. Data dibaca melalui CLI `hermes` pada container tempat Ruang dijalankan.

Target Hermes yang diberikan: `https://image-dockerhub-tvx3x6.helipod.app`. Endpoint tersebut belum dapat diverifikasi dari lingkungan penyiapan ini. Paket belum diunggah atau dijalankan di Helipod.

## Persiapan

- Upload dan ekstrak seluruh paket ke container Hermes, misalnya `/app/ruang-helipod`.
- Jalankan sebagai **user yang sama** dengan Hermes, dengan `HOME`, `HERMES_HOME`, `PATH`, dan volume data Hermes yang sudah ada.
- Sediakan Node.js **22.12+** (atau Node.js 20.19+) dan npm. Build memerlukan akses registry npm.
- Sediakan port internal kosong, contoh `3001`.
- Pilih direktori konfigurasi Ruang di volume persistent yang writable. Jangan menunjuk direktori ini ke file konfigurasi Hermes.

Contoh berikut mengasumsikan paket ada di `/app/ruang-helipod`. Sesuaikan lokasinya dengan container Anda.

## Build

```bash
cd /app/ruang-helipod
bash deploy/helipod/install.sh
```

Installer memeriksa Node dan Hermes, memasang dependency sesuai lockfile, lalu membangun frontend dan server. Installer tidak memasang atau memperbarui Hermes.

## Siapkan access code

Atur `RUANG_CONFIG_DIR` pada environment Helipod ke subdirektori di volume persistent milik Anda. Bila tidak diatur, lokasi bawaan adalah `~/.config/ruang`; pastikan lokasi itu tersimpan saat container dibuat ulang.

Di terminal interaktif dengan environment dan user yang sama dengan proses runtime:

```bash
cd /app/ruang-helipod
node deploy/helipod/start.mjs --prepare
```

Simpan access code yang muncul. Kode hanya ditampilkan saat pertama dibuat; berkas konfigurasi menyimpan hash. Startup berikutnya mempertahankan kode yang sudah ada. Launcher menolak membuat kode melalui log startup noninteraktif; jalankan langkah persiapan ini dahulu. Gunakan volume konfigurasi yang sama setelah restart.

## Jalankan Ruang

Jika proses Hermes sudah berjalan dan Anda hanya menjalankan Ruang dari console:

```bash
cd /app/ruang-helipod
RUANG_HOST=0.0.0.0 RUANG_PORT=3001 node deploy/helipod/start.mjs
```

Sesi ini berjalan foreground. Untuk bertahan setelah restart, tambahkan Ruang pada mekanisme startup container Anda.

Jika Helipod hanya menyediakan satu startup command, tersedia wrapper `deploy/helipod/with-hermes.sh`. Bentuk pemakaiannya:

```text
bash /app/ruang-helipod/deploy/helipod/with-hermes.sh -- PERINTAH_HERMES_ASLI ARGUMEN_ASLI
```

Ganti bagian setelah `--` dengan perintah startup container yang sekarang benar-benar dipakai. Jangan menjalankan Hermes kedua kali jika proses lama masih berjalan. Wrapper tidak menebak nama executable/entrypoint image Anda; command dan working directory Hermes tetap perlu mengikuti konfigurasi image tersebut. Kedua proses berhenti saat wrapper menerima sinyal shutdown, dan container keluar jika salah satu layanan berhenti.

Untuk image immutable, salin paket dan jalankan `install.sh` saat membangun image turunan Hermes. Pertahankan dependency, entrypoint, user, volume, dan perintah Hermes yang sekarang. Nama Docker image dan entrypoint asli belum diberikan, sehingga paket ini tidak mengganti keduanya dengan tebakan.

## Atur routing Helipod

1. Tambahkan route/domain HTTPS untuk **Ruang** ke port internal `3001`, sesuai kemampuan routing Helipod yang tersedia.
2. Pertahankan route aplikasi Hermes yang sekarang. Bila satu domain hanya bisa menunjuk satu port, gunakan domain/route lain untuk Ruang.
3. Pastikan routing menunjuk port yang sama dengan `RUANG_PORT`.

Launcher memakai `RUANG_PORT` terlebih dahulu, kemudian `PORT`, lalu `3001`. Pengaturan lewat environment Helipod lebih cocok untuk runtime; `.env.example` hanya contoh dan tidak dimuat otomatis.

Pemeriksaan dari dalam container:

```bash
curl --fail http://127.0.0.1:3001/api/health
```

Hasil yang diharapkan memiliki `ok: true`. Buka domain Ruang, masukkan access code, lalu periksa agen pada halaman Office. Health check hanya membuktikan server hidup; jika agen tidak tampil, periksa `hermes profile list` sebagai user runtime yang sama dan pastikan volume Hermes terbaca.

## Verifikasi dan batas pengujian

```bash
node --test deploy/helipod/start.test.mjs
npm test
npm run build
```

Tes launcher tidak memerlukan dependency npm. Tes upstream dan build penuh memerlukan `npm ci`; keduanya belum dijalankan pada lingkungan penyiapan karena akses jaringan executor tidak tersedia. Tampilan browser dan integrasi ke Hermes Helipod juga belum diverifikasi.

## Asal kode

- Sumber: https://github.com/yugienugraha/ruang
- Commit: `ea65bff2321ee433dc16162890fdb3ca5dfc7c56`
- Lisensi MIT dan atribusi upstream dipertahankan pada `LICENSE`.
- Perubahan aplikasi: `server/index.ts` menerima `RUANG_HOST`, dengan default upstream tetap `127.0.0.1`.
- Tambahan: launcher, installer, wrapper startup, contoh environment, tes launcher, dan panduan ini. Screenshot dokumentasi upstream tidak disertakan.
