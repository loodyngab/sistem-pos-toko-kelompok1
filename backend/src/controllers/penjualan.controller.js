const pool = require('../config/db');
const { jurnalPenjualan } = require('../utils/jurnalHelper');
const { keteranganReturPenjualan, lengkapiInfoRetur } = require('../utils/returHelper');

/**
 * POST /api/penjualan/checkout
 * Body: {
 *   id_pelanggan: number|null,
 *   items: [{ id_produk, kuantitas }]   // harga diambil dari DB, bukan dari client
 * }
 *
 * Ini menggantikan fungsi tombol "Bayar" di halaman POS React (Pos.jsx).
 * Satu request ini melakukan SEMUA hal yang tadinya "dua hal sekaligus"
 * di prompt awal: catat penjualan + potong stok + posting jurnal —
 * semuanya dalam SATU transaction supaya konsisten (all-or-nothing).
 */
async function checkout(req, res) {
  const { id_pelanggan, items } = req.body;
  const idUser = req.user.id_user; // dari JWT (kasir yang login)

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Keranjang belanja kosong.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Ambil data produk terkini (harga & stok) — JANGAN percaya harga dari client
    const idsProduk = items.map((i) => i.id_produk);
    const [produkRows] = await conn.query(
      `SELECT id_produk, nama_produk, harga_beli, harga_jual, stok_sistem
       FROM produk WHERE id_produk IN (?) FOR UPDATE`,
      [idsProduk]
    );
    const produkMap = {};
    produkRows.forEach((p) => { produkMap[p.id_produk] = p; });

    // 2. Validasi stok cukup untuk semua item SEBELUM insert apapun
    for (const item of items) {
      const produk = produkMap[item.id_produk];
      if (!produk) {
        throw new Error(`Produk id ${item.id_produk} tidak ditemukan.`);
      }
      if (produk.stok_sistem < item.kuantitas) {
        throw new Error(
          `Stok tidak cukup untuk "${produk.nama_produk}". Sisa stok: ${produk.stok_sistem}, diminta: ${item.kuantitas}.`
        );
      }
    }

    // 3. Hitung total & buat header penjualan
    let totalPembayaran = 0;
    let totalModal = 0; // untuk HPP
    const noInvoice = `INV-${Date.now()}`;

    items.forEach((item) => {
      const produk = produkMap[item.id_produk];
      totalPembayaran += Number(produk.harga_jual) * item.kuantitas;
      totalModal += Number(produk.harga_beli) * item.kuantitas;
    });

    const [penjualanResult] = await conn.query(
      `INSERT INTO penjualan (no_invoice, id_user, id_pelanggan, total_pembayaran, status)
       VALUES (?, ?, ?, ?, 'Selesai')`,
      [noInvoice, idUser, id_pelanggan || null, totalPembayaran]
    );
    const idPenjualan = penjualanResult.insertId;

    // 4. Insert detail, kurangi stok, catat pergerakan stok — per item
    for (const item of items) {
      const produk = produkMap[item.id_produk];
      const subtotal = Number(produk.harga_jual) * item.kuantitas;

      await conn.query(
        `INSERT INTO penjualan_detail (id_penjualan, id_produk, kuantitas, harga_satuan, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [idPenjualan, item.id_produk, item.kuantitas, produk.harga_jual, subtotal]
      );

      await conn.query('UPDATE produk SET stok_sistem = stok_sistem - ? WHERE id_produk = ?', [
        item.kuantitas,
        item.id_produk,
      ]);

      await conn.query(
        `INSERT INTO pergerakan_stok (id_produk, jenis, jumlah, keterangan)
         VALUES (?, 'OUT', ?, ?)`,
        [item.id_produk, item.kuantitas, `Penjualan ${noInvoice}`]
      );
    }

    // 5. Posting jurnal otomatis (Debit Kas/Kredit Pendapatan, Debit HPP/Kredit Persediaan)
    await jurnalPenjualan(conn, {
      tanggal: new Date(),
      noInvoice,
      totalPembayaran,
      totalModal,
    });

    await conn.commit();

    res.status(201).json({
      message: 'Transaksi berhasil.',
      id_penjualan: idPenjualan,
      no_invoice: noInvoice,
      total_pembayaran: totalPembayaran,
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(400).json({ message: err.message || 'Transaksi gagal, dibatalkan.' });
  } finally {
    conn.release();
  }
}

async function list(req, res) {
  const [rows] = await pool.query(
    `SELECT p.*, u.nama_lengkap AS kasir, pl.nama_pelanggan
     FROM penjualan p
     JOIN user u ON p.id_user = u.id_user
     LEFT JOIN pelanggan pl ON p.id_pelanggan = pl.id_pelanggan
     ORDER BY p.tanggal DESC`
  );
  res.json(rows);
}

async function detail(req, res) {
  const [header] = await pool.query('SELECT * FROM penjualan WHERE id_penjualan = ?', [req.params.id]);
  if (header.length === 0) return res.status(404).json({ message: 'Transaksi tidak ditemukan.' });

  const [items] = await pool.query(
    `SELECT pd.*, pr.nama_produk FROM penjualan_detail pd
     JOIN produk pr ON pd.id_produk = pr.id_produk WHERE pd.id_penjualan = ?`,
    [req.params.id]
  );
  // sudah_diretur / sisa_bisa_diretur dipakai UI retur untuk membatasi kuantitas
  const itemsLengkap = await lengkapiInfoRetur(pool, items, keteranganReturPenjualan(header[0].no_invoice));
  res.json({ ...header[0], items: itemsLengkap });
}

module.exports = { checkout, list, detail };
