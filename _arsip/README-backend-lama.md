# Sistem POS & Akuntansi Toko Terintegrasi — Backend & Database

Bagian ini adalah "otak" sistem: database fisik + REST API Node.js/Express +
logika jurnal otomatis, sesuai ERD dan flowchart yang sudah kalian buat.
Frontend React (dari teman kamu) akan konsumsi API ini menggantikan data
dummy JSON yang dipakainya sekarang.

## 1. Setup Database

1. Jalankan MySQL/MariaDB lokal (XAMPP/Laragon di Windows, DBngin di Mac).
2. Buka database client (DBeaver / DbVisualizer / HeidiSQL / phpMyAdmin).
3. Jalankan berurutan:
   ```
   database/schema.sql     -- membuat semua tabel
   database/seeder.sql     -- data awal (role, akun, produk dummy)
   ```
4. **Penting:** ganti hash password di `seeder.sql` dengan hash asli. Jalankan:
   ```bash
   cd backend
   npm install
   npm run hash -- password_kamu
   ```
   Copy hasil hash-nya, lalu `UPDATE user SET password = '<hash>' WHERE username = 'owner';`
   (ulangi untuk user lain).

## 2. Setup Backend

```bash
cd backend
npm install
cp .env.example .env
# edit .env: sesuaikan DB_USER, DB_PASSWORD, DB_PORT dengan setup lokalmu
npm run dev
```

Server jalan di `http://localhost:5000`. Test cepat: buka `http://localhost:5000`
di browser, harus muncul pesan JSON "API ... berjalan."

## 3. Struktur Endpoint Utama

| Method | Endpoint                          | Keterangan                                  |
|--------|------------------------------------|----------------------------------------------|
| POST   | /api/auth/login                    | Login, dapat JWT token                        |
| GET    | /api/produk                        | Daftar produk (untuk grid POS)                |
| POST   | /api/penjualan/checkout            | **Checkout POS** — inti sistem                |
| POST   | /api/pembelian                     | Restock barang dari supplier                  |
| POST   | /api/stok-opname                   | Stok opname + auto write-off jika minus       |
| POST   | /api/retur/penjualan                | Retur barang dari pelanggan (sebagian/semua)  |
| POST   | /api/retur/pembelian                | Retur barang ke supplier (sebagian/semua)     |
| GET    | /api/laporan/neraca-saldo          | Neraca Saldo per tanggal                      |
| GET    | /api/laporan/laba-rugi             | Laba Rugi per periode                         |
| GET    | /api/laporan/rekap-persediaan      | Nilai persediaan saat ini                     |
| GET    | /api/jurnal                        | Buku Jurnal Umum                              |
| GET    | /api/jurnal/buku-besar/:id_akun    | Buku Besar per akun                           |

Semua endpoint (kecuali `/api/auth/login`) butuh header:
`Authorization: Bearer <token>`

## 4. Cara Kerja Logika Jurnal Otomatis (bagian tersulit)

Lihat `backend/src/utils/jurnalHelper.js`. Setiap transaksi bisnis
(checkout, pembelian, opname) dibungkus dalam **satu database transaction**
(`conn.beginTransaction()` ... `conn.commit()` / `conn.rollback()`), supaya:

- Kalau stok gagal diupdate → jurnal juga tidak ikut tercatat.
- Kalau Debit != Kredit → seluruh transaksi dibatalkan (rollback), bukan
  cuma menolak permintaan (validasi wajib akuntansi ada di `postJurnal()`).

Contoh alur saat tombol **Bayar** ditekan di halaman POS:
1. Insert `penjualan` + `penjualan_detail`
2. Kurangi `stok_sistem` di `produk`, catat `pergerakan_stok` (OUT)
3. Insert `jurnal` + `jurnal_detail`:
   - Debit Kas / Kredit Pendapatan Penjualan
   - Debit HPP / Kredit Persediaan
4. Jika semua sukses → commit. Jika ada satu langkah gagal → rollback semua.

## 5. Menghubungkan ke Frontend React Teman Kamu

Di kode React yang sedang dibuat (Pos.jsx, dll), ganti bagian yang baca
data dummy JSON dengan `fetch`/`axios` ke endpoint di atas, contoh:

```js
// Sebelumnya: const produk = dummyProducts;
const res = await fetch('http://localhost:5000/api/produk', {
  headers: { Authorization: `Bearer ${token}` },
});
const produk = await res.json();
```

## 6. Langkah Selanjutnya yang Disarankan

- [ ] Ganti hash password seeder dengan hash asli (lihat langkah 1)
- [ ] Sesuaikan daftar 7 role di `role` table dengan hak akses tiap route
      (`allowRoles(...)` di masing-masing file `*.routes.js`) sesuai
      kebijakan tim kalian
- [ ] Integrasi ke React: ganti semua data dummy JSON dengan panggilan API
- [ ] Testing: pakai Postman/Thunder Client untuk tes tiap endpoint sebelum
      dihubungkan ke frontend

## 7. Menghindari Konflik dengan Frontend yang Dibuat Terpisah

Karena frontend (React) dan backend (repo ini) dikerjakan oleh orang
berbeda dengan bantuan AI masing-masing, ikuti ini supaya integrasinya
mulus:

- **Jangan edit file .jsx orang lain langsung.** Kerjakan backend di
  branch/folder sendiri. Baru digabung saat fase integrasi.
- **Satu titik integrasi.** Minta semua pemanggilan API di frontend
  dikumpulkan di satu file, misal `src/services/api.js`, bukan tersebar
  di tiap komponen. Saat integrasi, cukup file itu saja yang diubah.
- **Cocokkan nama field.** Response API di sini pakai nama sesuai ERD
  (`nama_produk`, `harga_jual`, `stok_sistem`, dst — snake_case, Bahasa
  Indonesia). Kalau UI dummy pakai nama lain (misal `name`, `price`,
  camelCase), buat adapter/mapping di `services/api.js`:
  ```js
  // Contoh adapter, taruh di services/api.js
  const toUIProduct = (p) => ({
    id: p.id_produk,
    name: p.nama_produk,
    price: p.harga_jual,
    stock: p.stok_sistem,
  });
  ```
  Komponen UI tidak perlu diubah sama sekali — hanya adapter yang tahu
  bentuk asli dari backend.
