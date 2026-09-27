-- =====================================================================
-- SISTEM POS & AKUNTANSI TOKO TERINTEGRASI
-- Schema database sesuai ERD (Database_tugas_Mobile_computing.pdf)
-- Engine: MySQL / MariaDB (kompatibel dengan XAMPP, Laragon, DBngin)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS pos_akuntansi
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pos_akuntansi;

SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- 1. MODUL AKTOR & HAK AKSES (RBAC)
-- ---------------------------------------------------------------------
CREATE TABLE role (
  id_role     INT AUTO_INCREMENT PRIMARY KEY,
  nama_role   VARCHAR(50) NOT NULL UNIQUE  -- Owner, Kepala Toko, Bagian Keuangan,
                                            -- Akunting, Kepala Gudang, Kasir, Sales
) ENGINE=InnoDB;

CREATE TABLE user (
  id_user      INT AUTO_INCREMENT PRIMARY KEY,
  id_role      INT NOT NULL,
  username     VARCHAR(50) NOT NULL UNIQUE,
  password     VARCHAR(255) NOT NULL,       -- di-hash (bcrypt)
  nama_lengkap VARCHAR(100) NOT NULL,
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_role) REFERENCES role(id_role)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. MASTER DATA
-- ---------------------------------------------------------------------
CREATE TABLE kategori (
  id_kategori   INT AUTO_INCREMENT PRIMARY KEY,
  nama_kategori VARCHAR(50) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE produk (
  id_produk    INT AUTO_INCREMENT PRIMARY KEY,
  kode_sku     VARCHAR(30) NOT NULL UNIQUE,
  id_kategori  INT NOT NULL,
  nama_produk  VARCHAR(100) NOT NULL,
  harga_beli   DECIMAL(15,2) NOT NULL DEFAULT 0,
  harga_jual   DECIMAL(15,2) NOT NULL DEFAULT 0,
  stok_sistem  INT NOT NULL DEFAULT 0,
  FOREIGN KEY (id_kategori) REFERENCES kategori(id_kategori)
) ENGINE=InnoDB;

CREATE TABLE supplier (
  id_supplier   INT AUTO_INCREMENT PRIMARY KEY,
  nama_supplier VARCHAR(100) NOT NULL,
  kontak        VARCHAR(50),
  alamat        VARCHAR(255)
) ENGINE=InnoDB;

CREATE TABLE pelanggan (
  id_pelanggan   INT AUTO_INCREMENT PRIMARY KEY,
  nama_pelanggan VARCHAR(100) NOT NULL,
  kontak         VARCHAR(50)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. MODUL TRANSAKSIONAL (POS & PEMBELIAN)
-- ---------------------------------------------------------------------
CREATE TABLE penjualan (
  id_penjualan     INT AUTO_INCREMENT PRIMARY KEY,
  no_invoice       VARCHAR(30) NOT NULL UNIQUE,
  tanggal          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  id_user          INT NOT NULL,           -- Kasir/Sales
  id_pelanggan     INT NULL,
  total_pembayaran DECIMAL(15,2) NOT NULL DEFAULT 0,
  status           ENUM('Selesai','Void','Retur') NOT NULL DEFAULT 'Selesai',
  FOREIGN KEY (id_user) REFERENCES user(id_user),
  FOREIGN KEY (id_pelanggan) REFERENCES pelanggan(id_pelanggan)
) ENGINE=InnoDB;

CREATE TABLE penjualan_detail (
  id_detail     INT AUTO_INCREMENT PRIMARY KEY,
  id_penjualan  INT NOT NULL,
  id_produk     INT NOT NULL,
  kuantitas     INT NOT NULL,
  harga_satuan  DECIMAL(15,2) NOT NULL,
  subtotal      DECIMAL(15,2) NOT NULL,
  FOREIGN KEY (id_penjualan) REFERENCES penjualan(id_penjualan) ON DELETE CASCADE,
  FOREIGN KEY (id_produk) REFERENCES produk(id_produk)
) ENGINE=InnoDB;

CREATE TABLE pembelian (
  id_pembelian    INT AUTO_INCREMENT PRIMARY KEY,
  no_order        VARCHAR(30) NOT NULL UNIQUE,
  tanggal         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  id_user         INT NOT NULL,           -- Admin Gudang
  id_supplier     INT NOT NULL,
  total_pembelian DECIMAL(15,2) NOT NULL DEFAULT 0,
  status          ENUM('Selesai','Void','Retur') NOT NULL DEFAULT 'Selesai',
  FOREIGN KEY (id_user) REFERENCES user(id_user),
  FOREIGN KEY (id_supplier) REFERENCES supplier(id_supplier)
) ENGINE=InnoDB;

CREATE TABLE pembelian_detail (
  id_detail     INT AUTO_INCREMENT PRIMARY KEY,
  id_pembelian  INT NOT NULL,
  id_produk     INT NOT NULL,
  kuantitas     INT NOT NULL,
  harga_satuan  DECIMAL(15,2) NOT NULL,
  subtotal      DECIMAL(15,2) NOT NULL,
  FOREIGN KEY (id_pembelian) REFERENCES pembelian(id_pembelian) ON DELETE CASCADE,
  FOREIGN KEY (id_produk) REFERENCES produk(id_produk)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. MANAJEMEN GUDANG (INVENTORI)
-- ---------------------------------------------------------------------
CREATE TABLE pergerakan_stok (
  id_pergerakan INT AUTO_INCREMENT PRIMARY KEY,
  id_produk     INT NOT NULL,
  jenis         ENUM('IN','OUT','ADJ') NOT NULL,
  jumlah        INT NOT NULL,
  tanggal       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  keterangan    VARCHAR(100),  -- Penjualan, Pembelian, Retur, Write-off, Opname
  FOREIGN KEY (id_produk) REFERENCES produk(id_produk)
) ENGINE=InnoDB;

CREATE TABLE stok_opname (
  id_opname  INT AUTO_INCREMENT PRIMARY KEY,
  tanggal    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  id_user    INT NOT NULL,      -- Kepala Gudang
  keterangan VARCHAR(255),
  FOREIGN KEY (id_user) REFERENCES user(id_user)
) ENGINE=InnoDB;

CREATE TABLE stok_opname_detail (
  id_detail    INT AUTO_INCREMENT PRIMARY KEY,
  id_opname    INT NOT NULL,
  id_produk    INT NOT NULL,
  stok_sistem  INT NOT NULL,
  stok_fisik   INT NOT NULL,
  selisih      INT NOT NULL,
  FOREIGN KEY (id_opname) REFERENCES stok_opname(id_opname) ON DELETE CASCADE,
  FOREIGN KEY (id_produk) REFERENCES produk(id_produk)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 5. MODUL AKUNTANSI & KEUANGAN
-- ---------------------------------------------------------------------
CREATE TABLE akun (
  id_akun    INT AUTO_INCREMENT PRIMARY KEY,
  kode_akun  VARCHAR(10) NOT NULL UNIQUE,
  nama_akun  VARCHAR(100) NOT NULL,
  jenis_akun ENUM('Aset','Kewajiban','Ekuitas','Pendapatan','Beban') NOT NULL
) ENGINE=InnoDB;

CREATE TABLE jurnal (
  id_jurnal    INT AUTO_INCREMENT PRIMARY KEY,
  tanggal      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  no_referensi VARCHAR(30),   -- No Invoice / No Order
  keterangan   VARCHAR(255)
) ENGINE=InnoDB;

CREATE TABLE jurnal_detail (
  id_jurnal_detail INT AUTO_INCREMENT PRIMARY KEY,
  id_jurnal        INT NOT NULL,
  id_akun          INT NOT NULL,
  posisi           ENUM('Debit','Kredit') NOT NULL,
  nominal          DECIMAL(15,2) NOT NULL,
  FOREIGN KEY (id_jurnal) REFERENCES jurnal(id_jurnal) ON DELETE CASCADE,
  FOREIGN KEY (id_akun) REFERENCES akun(id_akun)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- INDEX TAMBAHAN untuk performa query laporan
-- ---------------------------------------------------------------------
CREATE INDEX idx_penjualan_tanggal ON penjualan(tanggal);
CREATE INDEX idx_pembelian_tanggal ON pembelian(tanggal);
CREATE INDEX idx_jurnal_tanggal ON jurnal(tanggal);
CREATE INDEX idx_jurnal_detail_akun ON jurnal_detail(id_akun);
CREATE INDEX idx_pergerakan_produk ON pergerakan_stok(id_produk);
