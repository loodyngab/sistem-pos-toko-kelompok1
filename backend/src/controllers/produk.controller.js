const pool = require('../config/db');

async function list(req, res) {
  const [rows] = await pool.query(
    `SELECT p.*, k.nama_kategori
     FROM produk p JOIN kategori k ON p.id_kategori = k.id_kategori
     ORDER BY p.nama_produk`
  );
  res.json(rows);
}

async function getOne(req, res) {
  const [rows] = await pool.query('SELECT * FROM produk WHERE id_produk = ?', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ message: 'Produk tidak ditemukan.' });
  res.json(rows[0]);
}

async function create(req, res) {
  const { kode_sku, id_kategori, nama_produk, harga_beli, harga_jual, stok_sistem } = req.body;
  if (!kode_sku || !id_kategori || !nama_produk) {
    return res.status(400).json({ message: 'kode_sku, id_kategori, nama_produk wajib diisi.' });
  }
  const [result] = await pool.query(
    `INSERT INTO produk (kode_sku, id_kategori, nama_produk, harga_beli, harga_jual, stok_sistem)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [kode_sku, id_kategori, nama_produk, harga_beli || 0, harga_jual || 0, stok_sistem || 0]
  );
  res.status(201).json({ id_produk: result.insertId });
}

async function update(req, res) {
  const { kode_sku, id_kategori, nama_produk, harga_beli, harga_jual } = req.body;
  await pool.query(
    `UPDATE produk SET kode_sku = ?, id_kategori = ?, nama_produk = ?, harga_beli = ?, harga_jual = ?
     WHERE id_produk = ?`,
    [kode_sku, id_kategori, nama_produk, harga_beli, harga_jual, req.params.id]
  );
  res.json({ message: 'Produk diperbarui.' });
}

async function remove(req, res) {
  await pool.query('DELETE FROM produk WHERE id_produk = ?', [req.params.id]);
  res.json({ message: 'Produk dihapus.' });
}

module.exports = { list, getOne, create, update, remove };
