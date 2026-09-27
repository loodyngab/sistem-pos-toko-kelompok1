const pool = require('../config/db');
const { jurnalPembelian } = require('../utils/jurnalHelper');
const { keteranganReturPembelian, lengkapiInfoRetur } = require('../utils/returHelper');

/**
 * POST /api/pembelian
 * Body: { id_supplier, tunai: boolean, items: [{ id_produk, kuantitas, harga_satuan }] }
 * harga_satuan di sini adalah harga BELI (bisa beda dari harga_beli master
 * jika supplier kasih harga khusus) — akan dipakai untuk update harga_beli produk juga.
 */
async function create(req, res) {
  const { id_supplier, tunai = true, items } = req.body;
  const idUser = req.user.id_user; // Admin Gudang yang login

  if (!id_supplier || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'id_supplier dan items wajib diisi.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const noOrder = `PO-${Date.now()}`;
    let totalPembelian = 0;
    items.forEach((i) => { totalPembelian += Number(i.harga_satuan) * i.kuantitas; });

    const [pembelianResult] = await conn.query(
      `INSERT INTO pembelian (no_order, id_user, id_supplier, total_pembelian, status)
       VALUES (?, ?, ?, ?, 'Selesai')`,
      [noOrder, idUser, id_supplier, totalPembelian]
    );
    const idPembelian = pembelianResult.insertId;

    for (const item of items) {
      const subtotal = Number(item.harga_satuan) * item.kuantitas;

      await conn.query(
        `INSERT INTO pembelian_detail (id_pembelian, id_produk, kuantitas, harga_satuan, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [idPembelian, item.id_produk, item.kuantitas, item.harga_satuan, subtotal]
      );

      // Stok bertambah + update harga_beli terbaru
      await conn.query(
        'UPDATE produk SET stok_sistem = stok_sistem + ?, harga_beli = ? WHERE id_produk = ?',
        [item.kuantitas, item.harga_satuan, item.id_produk]
      );

      await conn.query(
        `INSERT INTO pergerakan_stok (id_produk, jenis, jumlah, keterangan)
         VALUES (?, 'IN', ?, ?)`,
        [item.id_produk, item.kuantitas, `Pembelian ${noOrder}`]
      );
    }

    await jurnalPembelian(conn, {
      tanggal: new Date(),
      noOrder,
      totalPembelian,
      tunai,
    });

    await conn.commit();
    res.status(201).json({ message: 'Pembelian berhasil dicatat.', id_pembelian: idPembelian, no_order: noOrder });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(400).json({ message: err.message || 'Pembelian gagal, dibatalkan.' });
  } finally {
    conn.release();
  }
}

async function list(req, res) {
  const [rows] = await pool.query(
    `SELECT p.*, s.nama_supplier, u.nama_lengkap AS admin_gudang
     FROM pembelian p
     JOIN supplier s ON p.id_supplier = s.id_supplier
     JOIN user u ON p.id_user = u.id_user
     ORDER BY p.tanggal DESC`
  );
  res.json(rows);
}

/** GET /api/pembelian/:id — header + item (dipakai UI retur pembelian) */
async function detail(req, res) {
  const [header] = await pool.query('SELECT * FROM pembelian WHERE id_pembelian = ?', [req.params.id]);
  if (header.length === 0) return res.status(404).json({ message: 'Transaksi tidak ditemukan.' });

  const [items] = await pool.query(
    `SELECT pd.*, pr.nama_produk FROM pembelian_detail pd
     JOIN produk pr ON pd.id_produk = pr.id_produk WHERE pd.id_pembelian = ?`,
    [req.params.id]
  );
  const itemsLengkap = await lengkapiInfoRetur(pool, items, keteranganReturPembelian(header[0].no_order));
  res.json({ ...header[0], items: itemsLengkap });
}

module.exports = { create, list, detail };
