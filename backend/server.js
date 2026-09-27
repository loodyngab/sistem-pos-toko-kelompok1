require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// ---- Routes ----
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/produk', require('./src/routes/produk.routes'));
app.use('/api', require('./src/routes/masterData.routes')); // /api/kategori, /api/supplier, /api/pelanggan, /api/akun, /api/role
app.use('/api/penjualan', require('./src/routes/penjualan.routes'));
app.use('/api/pembelian', require('./src/routes/pembelian.routes'));
app.use('/api/stok-opname', require('./src/routes/stokOpname.routes'));
app.use('/api/retur', require('./src/routes/retur.routes'));
app.use('/api/jurnal', require('./src/routes/jurnal.routes'));
app.use('/api/laporan', require('./src/routes/laporan.routes'));

app.get('/', (req, res) => {
  res.json({ message: 'API Sistem POS & Akuntansi Toko Terintegrasi berjalan.' });
});

// Handler error terakhir — menangkap SEMUA error dari controller (termasuk
// yang dilempar lewat asyncHandler), supaya server tidak pernah crash total.
app.use((err, req, res, next) => {
  console.error(err);

  // Duplicate entry (misal kode_sku / username yang sudah dipakai)
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      message: 'Data sudah ada (kemungkinan kode_sku, username, atau kode_akun sama dengan yang sudah tersimpan).',
    });
  }

  // Foreign key tidak valid (misal id_kategori/id_produk yang direferensikan tidak ada)
  if (err.code === 'ER_NO_REFERENCED_ROW' || err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      message: 'Data referensi tidak valid (misal id_kategori/id_produk/id_supplier yang dipakai tidak ditemukan).',
    });
  }

  res.status(err.status || 500).json({ message: err.message || 'Terjadi kesalahan pada server.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
