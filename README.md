# Sistem POS & Akuntansi Toko Terintegrasi

Tugas kelompok: sistem *Point of Sales* (POS), inventori gudang, dan akuntansi
terintegrasi. Setiap transaksi (penjualan, pembelian, retur, stok opname)
otomatis memotong/menambah stok **dan** mencatat jurnal akuntansi.

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express, JWT + bcrypt, RBAC per role
- **Database:** MySQL / MariaDB

## Struktur Folder

```
sistem-pos-akuntansi/
├── frontend/     React (halaman: Login, Transaksi, Gudang, Laporan)
│   └── src/services/api.js   ← satu-satunya file yang memanggil backend
├── backend/      REST API Express
│   └── src/{routes, controllers, middleware, utils, config}
├── database/     schema.sql (16 tabel) + seeder.sql (data awal)
├── docs/         ERD, flowchart, dan penjelasannya (PDF/DOCX)
└── _arsip/       file lama yang tidak dipakai lagi (tidak perlu disentuh)
```

## Cara Menjalankan

Butuh: Node.js 18+ dan MySQL (XAMPP/Laragon di Windows, DBngin di Mac).

> **Windows:** ganti `cp .env.example .env` dengan `copy .env.example .env`.

**1. Database** — jalankan berurutan di database client (DBeaver, phpMyAdmin, dst):
```
database/schema.sql
database/seeder.sql
```
Untuk reset data (misal sebelum demo): `DROP DATABASE pos_akuntansi;` lalu jalankan kedua file itu lagi.

**2. Backend** (terminal 1)
```bash
cd backend
npm install
cp .env.example .env     # isi DB_USER / DB_PASSWORD sesuai MySQL lokal
npm run dev
```
Jalan di `http://localhost:5050`. (Bukan 5000 — di Mac port 5000 dipakai AirPlay.)

**3. Frontend** (terminal 2)
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
Buka `http://localhost:5173`.

## Akun Demo

Semua password: **`demo123`**

| Username      | Role            | Bisa apa |
|---------------|-----------------|----------|
| `owner`       | Owner           | Semua |
| `kasir1`      | Kasir           | Penjualan, retur penjualan |
| `sales1`      | Sales           | Penjualan, retur penjualan |
| `gudang1`     | Kepala Gudang   | Pembelian, retur pembelian, write-off stok |
| `kepalatoko1` | Kepala Toko     | Lihat laporan & stok |
| `keuangan1`   | Bagian Keuangan | Laporan + jurnal |
| `akunting1`   | Akunting        | Laporan + jurnal |

Hak akses yang berlaku adalah yang di backend (`allowRoles(...)` di
`backend/src/routes/*.routes.js`); menu di frontend mengikuti aturan itu.

## Endpoint Utama

Semua endpoint (kecuali login) butuh header `Authorization: Bearer <token>`.

| Method | Endpoint | Keterangan |
|---|---|---|
| POST | `/api/auth/login` | Login, dapat JWT |
| GET | `/api/produk` | Daftar produk |
| POST | `/api/penjualan/checkout` | Checkout POS |
| GET | `/api/penjualan`, `/api/penjualan/:id` | Riwayat & detail penjualan |
| POST | `/api/pembelian` | Restock dari supplier |
| GET | `/api/pembelian`, `/api/pembelian/:id` | Riwayat & detail pembelian |
| POST | `/api/retur/penjualan` | Retur dari pelanggan (wajib `id_penjualan`) |
| POST | `/api/retur/pembelian` | Retur ke supplier (wajib `id_pembelian`) |
| POST | `/api/stok-opname` | Stok opname / write-off |
| GET | `/api/laporan/laba-rugi` | Laba rugi per periode |
| GET | `/api/laporan/neraca-saldo` | Neraca saldo per tanggal |
| GET | `/api/laporan/rekap-persediaan` | Nilai persediaan |
| GET | `/api/jurnal` | Jurnal umum |

## Cara Kerja Jurnal Otomatis

Lihat `backend/src/utils/jurnalHelper.js`. Setiap transaksi dibungkus satu
*database transaction*: kalau salah satu langkah gagal, atau Debit ≠ Kredit,
semuanya di-*rollback*.

Contoh checkout:
1. Simpan `penjualan` + `penjualan_detail`
2. Kurangi stok, catat `pergerakan_stok` (OUT)
3. Jurnal: Debit Kas / Kredit Pendapatan, dan Debit HPP / Kredit Persediaan
4. Commit (atau rollback semua jika ada yang gagal)

`seeder.sql` juga membuat jurnal **saldo awal** (Kas + Persediaan = Modal),
supaya neraca seimbang sejak awal.

## Tampilan Aplikasi

**Login**
<img width="1913" alt="Login" src="https://github.com/user-attachments/assets/0df974a2-d187-4115-8b78-b62646ed7d09" />

**Transaksi (POS)**
<img width="1920" alt="POS" src="https://github.com/user-attachments/assets/0cca059e-2750-4e14-9c7f-b0a69797d943" />

**Gudang**
<img width="1920" alt="Gudang" src="https://github.com/user-attachments/assets/e2503c2f-e9f1-47e5-ab45-e7ae1e3866bf" />

**Laporan Keuangan**
<img width="1919" alt="Laporan" src="https://github.com/user-attachments/assets/a7bec6d2-8412-4b1d-b0bb-5eba221afdd7" />

## Pembagian Tugas

| No | Nama Anggota | Peran | Tugas & Tanggung Jawab |
|:---|:---|:---|:---|
| 1 | Rudi Kurniawan | Project Manager & System Analyst | Setup repository GitHub, merancang kerangka awal aplikasi React, dan mengatur *Routing* akses pengguna (RBAC). |
| 2 | Rivaldo Juniar Ardana | Backend & Database Developer | Merancang ERD, membuat struktur tabel *database*, dan membangun API untuk menjembatani *frontend* dengan data. |
| 3 | Andi Mulyono | Frontend Developer (Transaksi) | Membuat UI/UX untuk modul Kasir (POS) dan fitur keranjang belanja. |
| 4 | Anton Yogaswara | Frontend Developer (Laporan) | Membangun antarmuka Gudang (Pergerakan Stok) dan Laporan Keuangan (Laba Rugi/Neraca) beserta visualisasi datanya. |
| 5 | Muhammad Aziis Baehacqi | QA & Integrator | Menggabungkan komponen antarmuka, melakukan *testing* alur data otomatis dari Penjualan hingga ke Akuntansi, dan menangani *bug*. |
