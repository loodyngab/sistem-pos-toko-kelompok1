-- =====================================================================
-- SEEDER: data awal wajib ada sebelum aplikasi bisa dipakai
-- Jalankan setelah schema.sql
-- =====================================================================
USE pos_akuntansi;

-- ---------------------------------------------------------------------
-- 1. ROLE (7 peran sesuai flowchart)
-- ---------------------------------------------------------------------
INSERT INTO role (nama_role) VALUES
('Owner'), ('Kepala Toko'), ('Bagian Keuangan'), ('Akunting'),
('Kepala Gudang'), ('Kasir'), ('Sales');

-- ---------------------------------------------------------------------
-- 2. USER demo — 1 akun per role, SEMUA password: demo123
--    (hash bcrypt di bawah = hash dari "demo123"; untuk password lain
--    generate dengan: npm run hash -- passwordBaru)
-- ---------------------------------------------------------------------
INSERT INTO user (id_role, username, password, nama_lengkap) VALUES
(1, 'owner',       '$2b$10$LnTUbHzcGz0tVSZ9hZgTh.l04Kh0WcBQdACpE0HuiImYbkyHRT4ju', 'Pemilik Toko'),
(6, 'kasir1',      '$2b$10$LnTUbHzcGz0tVSZ9hZgTh.l04Kh0WcBQdACpE0HuiImYbkyHRT4ju', 'Kasir Satu'),
(5, 'gudang1',     '$2b$10$LnTUbHzcGz0tVSZ9hZgTh.l04Kh0WcBQdACpE0HuiImYbkyHRT4ju', 'Kepala Gudang'),
(2, 'kepalatoko1', '$2b$10$LnTUbHzcGz0tVSZ9hZgTh.l04Kh0WcBQdACpE0HuiImYbkyHRT4ju', 'Kepala Toko Demo'),
(3, 'keuangan1',   '$2b$10$LnTUbHzcGz0tVSZ9hZgTh.l04Kh0WcBQdACpE0HuiImYbkyHRT4ju', 'Bagian Keuangan Demo'),
(4, 'akunting1',   '$2b$10$LnTUbHzcGz0tVSZ9hZgTh.l04Kh0WcBQdACpE0HuiImYbkyHRT4ju', 'Akunting Demo'),
(7, 'sales1',      '$2b$10$LnTUbHzcGz0tVSZ9hZgTh.l04Kh0WcBQdACpE0HuiImYbkyHRT4ju', 'Sales Demo');

-- ---------------------------------------------------------------------
-- 3. CHART OF ACCOUNTS (Bagan Akun standar dagang)
--    Kode akun ini dipakai LANGSUNG oleh backend (lihat
--    backend/src/utils/jurnalHelper.js) — jangan diganti tanpa
--    menyesuaikan kode di sana juga.
-- ---------------------------------------------------------------------
INSERT INTO akun (kode_akun, nama_akun, jenis_akun) VALUES
('1101', 'Kas',                         'Aset'),
('1102', 'Piutang Usaha',               'Aset'),
('1103', 'Persediaan Barang Dagang',    'Aset'),
('2101', 'Utang Usaha',                 'Kewajiban'),
('3101', 'Modal Pemilik',               'Ekuitas'),
('4101', 'Pendapatan Penjualan',        'Pendapatan'),
('4102', 'Retur Penjualan',             'Pendapatan'),
('5101', 'Harga Pokok Penjualan',       'Beban'),
('5102', 'Beban Kerugian Persediaan',   'Beban'),
('5103', 'Beban Operasional',           'Beban');

-- ---------------------------------------------------------------------
-- 4. KATEGORI & PRODUK dummy
-- ---------------------------------------------------------------------
INSERT INTO kategori (nama_kategori) VALUES
('Makanan'), ('Minuman'), ('Kebutuhan Rumah Tangga');

INSERT INTO produk (kode_sku, id_kategori, nama_produk, harga_beli, harga_jual, stok_sistem) VALUES
('SKU-001', 1, 'Mie Instan Goreng',     2500,  3500, 100),
('SKU-002', 2, 'Air Mineral 600ml',     2000,  3000, 150),
('SKU-003', 1, 'Roti Tawar',            8000, 12000,  40),
('SKU-004', 3, 'Sabun Cuci Piring',     6000,  9000,  60),
('SKU-005', 2, 'Kopi Sachet',           1000,  2000, 200);

-- ---------------------------------------------------------------------
-- 5. SUPPLIER & PELANGGAN contoh
-- ---------------------------------------------------------------------
INSERT INTO supplier (nama_supplier, kontak, alamat) VALUES
('CV Sumber Rejeki', '0812-1111-2222', 'Jl. Industri No. 10'),
('PT Distribusi Utama', '0813-3333-4444', 'Jl. Gudang Raya No. 5');

INSERT INTO pelanggan (nama_pelanggan, kontak) VALUES
('Umum / Walk-in', NULL),
('Budi Santoso', '0821-5555-6666');

-- ---------------------------------------------------------------------
-- 6. SALDO AWAL (jurnal pembuka)
--    Stok produk di atas harus punya nilai di akun Persediaan, kalau tidak
--    setiap penjualan akan membuat saldo Persediaan minus di neraca.
--    Modal Pemilik = Kas awal + nilai persediaan awal.
--    Nilai persediaan awal = SUM(stok_sistem * harga_beli) produk di atas
--    = 100*2500 + 150*2000 + 40*8000 + 60*6000 + 200*1000 = 1.430.000
--    Kas awal (modal tunai) = 5.000.000
-- ---------------------------------------------------------------------
INSERT INTO jurnal (id_jurnal, no_referensi, keterangan) VALUES
(1, 'SALDO-AWAL', 'Saldo awal: setoran modal tunai & persediaan awal');

INSERT INTO jurnal_detail (id_jurnal, id_akun, posisi, nominal) VALUES
(1, (SELECT id_akun FROM akun WHERE kode_akun = '1101'), 'Debit',  5000000),
(1, (SELECT id_akun FROM akun WHERE kode_akun = '1103'), 'Debit',
    (SELECT SUM(stok_sistem * harga_beli) FROM produk)),
(1, (SELECT id_akun FROM akun WHERE kode_akun = '3101'), 'Kredit',
    5000000 + (SELECT SUM(stok_sistem * harga_beli) FROM produk));

-- Kartu stok: catat stok awal sebagai barang masuk
INSERT INTO pergerakan_stok (id_produk, jenis, jumlah, keterangan)
SELECT id_produk, 'IN', stok_sistem, 'Saldo Awal' FROM produk;
