const pool = require('../config/db');
const { jurnalWriteOff } = require('../utils/jurnalHelper');

/**
 * POST /api/stok-opname
 * Body: { keterangan, items: [{ id_produk, stok_fisik }] }
 * stok_sistem diambil otomatis dari database saat proses berjalan.
 *
 * Selisih MINUS (stok_fisik < stok_sistem) -> otomatis di-write-off:
 *   - stok_sistem produk disesuaikan turun ke stok_fisik
 *   - dicatat di pergerakan_stok (ADJ)
 *   - dijurnal: Debit Beban Kerugian Persediaan, Kredit Persediaan
 * Selisih POSITIF dicatat tapi TIDAK otomatis dijurnal (butuh keputusan
 * Akunting/Owner, misalnya barang temuan atau kesalahan pencatatan awal).
 */
async function create(req, res) {
  const { keterangan, items } = req.body;
  const idUser = req.user.id_user; // Kepala Gudang

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Daftar produk opname wajib diisi.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [opnameResult] = await conn.query(
      'INSERT INTO stok_opname (id_user, keterangan) VALUES (?, ?)',
      [idUser, keterangan || null]
    );
    const idOpname = opnameResult.insertId;

    let totalNilaiKerugian = 0;
    const noReferensi = `OPNAME-${idOpname}`;

    for (const item of items) {
      const [produkRows] = await conn.query(
        'SELECT stok_sistem, harga_beli, nama_produk FROM produk WHERE id_produk = ? FOR UPDATE',
        [item.id_produk]
      );
      if (produkRows.length === 0) {
        throw new Error(`Produk id ${item.id_produk} tidak ditemukan.`);
      }
      const produk = produkRows[0];
      const selisih = item.stok_fisik - produk.stok_sistem;

      await conn.query(
        `INSERT INTO stok_opname_detail (id_opname, id_produk, stok_sistem, stok_fisik, selisih)
         VALUES (?, ?, ?, ?, ?)`,
        [idOpname, item.id_produk, produk.stok_sistem, item.stok_fisik, selisih]
      );

      if (selisih !== 0) {
        await conn.query('UPDATE produk SET stok_sistem = ? WHERE id_produk = ?', [
          item.stok_fisik,
          item.id_produk,
        ]);
        await conn.query(
          `INSERT INTO pergerakan_stok (id_produk, jenis, jumlah, keterangan)
           VALUES (?, 'ADJ', ?, ?)`,
          [item.id_produk, selisih, `Stok Opname ${noReferensi}`]
        );
      }

      if (selisih < 0) {
        totalNilaiKerugian += Math.abs(selisih) * Number(produk.harga_beli);
      }
    }

    if (totalNilaiKerugian > 0) {
      await jurnalWriteOff(conn, {
        tanggal: new Date(),
        noReferensi,
        nilaiKerugian: totalNilaiKerugian,
      });
    }

    await conn.commit();
    res.status(201).json({
      message: 'Stok opname selesai.',
      id_opname: idOpname,
      total_nilai_kerugian: totalNilaiKerugian,
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(400).json({ message: err.message || 'Stok opname gagal, dibatalkan.' });
  } finally {
    conn.release();
  }
}

async function list(req, res) {
  const [rows] = await pool.query(
    `SELECT so.*, u.nama_lengkap AS kepala_gudang
     FROM stok_opname so JOIN user u ON so.id_user = u.id_user
     ORDER BY so.tanggal DESC`
  );
  res.json(rows);
}

module.exports = { create, list };
