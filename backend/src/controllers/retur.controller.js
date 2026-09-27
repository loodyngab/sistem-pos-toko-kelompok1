const pool = require('../config/db');
const { jurnalReturPenjualan, jurnalReturPembelian } = require('../utils/jurnalHelper');
const {
  keteranganReturPenjualan, keteranganReturPembelian, jumlahSudahDiretur,
} = require('../utils/returHelper');

/** Validasi bentuk items: tiap kuantitas harus bilangan bulat > 0. */
function validasiItems(items) {
  for (const item of items) {
    if (!Number.isInteger(item.kuantitas) || item.kuantitas <= 0) {
      return `Kuantitas retur untuk produk id ${item.id_produk} harus bilangan bulat > 0.`;
    }
  }
  return null;
}

/**
 * POST /api/retur/penjualan
 * Body: { id_penjualan, items: [{ id_produk, kuantitas }] }
 *
 * Retur SEBAGIAN diperbolehkan (tidak harus retur semua barang di 1 invoice).
 * kuantitas yang diretur tidak boleh melebihi kuantitas yang dibeli di invoice tsb.
 * harga_satuan & harga_beli diambil dari data invoice ASLI, bukan harga produk
 * saat ini — supaya nilai retur akurat meskipun harga produk sudah berubah.
 */
async function returPenjualan(req, res) {
  const { id_penjualan, items } = req.body;

  if (!id_penjualan || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'id_penjualan dan items wajib diisi.' });
  }
  const errItems = validasiItems(items);
  if (errItems) return res.status(400).json({ message: errItems });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [penjualanRows] = await conn.query(
      'SELECT * FROM penjualan WHERE id_penjualan = ? FOR UPDATE',
      [id_penjualan]
    );
    if (penjualanRows.length === 0) throw new Error('Transaksi penjualan tidak ditemukan.');
    const penjualan = penjualanRows[0];
    if (penjualan.status === 'Void') throw new Error('Transaksi ini sudah void, tidak bisa diretur.');

    const noReferensi = `RETJ-${penjualan.no_invoice.replace('INV-', '')}`;
    const keterangan = keteranganReturPenjualan(penjualan.no_invoice);
    // Retur sebelumnya untuk invoice ini ikut dihitung, supaya invoice yang
    // sama tidak bisa diretur berulang kali melebihi jumlah yang dibeli.
    const sudahDiretur = await jumlahSudahDiretur(conn, keterangan);
    let nilaiRetur = 0;
    let nilaiModal = 0;

    for (const item of items) {
      // Ambil detail ASLI dari invoice ini (harga saat itu, bukan harga produk sekarang)
      const [detailRows] = await conn.query(
        `SELECT pd.*, pr.harga_beli, pr.nama_produk
         FROM penjualan_detail pd JOIN produk pr ON pd.id_produk = pr.id_produk
         WHERE pd.id_penjualan = ? AND pd.id_produk = ?`,
        [id_penjualan, item.id_produk]
      );
      if (detailRows.length === 0) {
        throw new Error(`Produk id ${item.id_produk} tidak ada di invoice ${penjualan.no_invoice}.`);
      }
      const detail = detailRows[0];
      const sisa = detail.kuantitas - (sudahDiretur[item.id_produk] || 0);
      if (item.kuantitas > sisa) {
        throw new Error(
          `Kuantitas retur (${item.kuantitas}) melebihi sisa yang bisa diretur (${sisa} dari ${detail.kuantitas} dibeli) untuk "${detail.nama_produk}".`
        );
      }

      nilaiRetur += Number(detail.harga_satuan) * item.kuantitas;
      nilaiModal += Number(detail.harga_beli) * item.kuantitas;

      // Stok balik ke gudang
      await conn.query('UPDATE produk SET stok_sistem = stok_sistem + ? WHERE id_produk = ?', [
        item.kuantitas,
        item.id_produk,
      ]);
      await conn.query(
        `INSERT INTO pergerakan_stok (id_produk, jenis, jumlah, keterangan)
         VALUES (?, 'IN', ?, ?)`,
        [item.id_produk, item.kuantitas, keterangan]
      );
    }

    // Tandai status invoice asli sebagai Retur (retur sebagian tetap ditandai
    // begini supaya mudah difilter; detail lengkap tetap ada di riwayat retur)
    await conn.query('UPDATE penjualan SET status = "Retur" WHERE id_penjualan = ?', [id_penjualan]);

    await jurnalReturPenjualan(conn, {
      tanggal: new Date(),
      noReferensi,
      nilaiRetur,
      nilaiModal,
    });

    await conn.commit();
    res.status(201).json({ message: 'Retur penjualan berhasil dicatat.', no_referensi: noReferensi, nilai_retur: nilaiRetur });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(400).json({ message: err.message || 'Retur penjualan gagal, dibatalkan.' });
  } finally {
    conn.release();
  }
}

/**
 * POST /api/retur/pembelian
 * Body: { id_pembelian, tunai: boolean, items: [{ id_produk, kuantitas }] }
 * Sama seperti retur penjualan, tapi arah stok berlawanan (barang keluar
 * lagi ke supplier) dan sumber harga dari pembelian_detail.
 */
async function returPembelian(req, res) {
  const { id_pembelian, tunai = true, items } = req.body;

  if (!id_pembelian || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'id_pembelian dan items wajib diisi.' });
  }
  const errItems = validasiItems(items);
  if (errItems) return res.status(400).json({ message: errItems });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [pembelianRows] = await conn.query(
      'SELECT * FROM pembelian WHERE id_pembelian = ? FOR UPDATE',
      [id_pembelian]
    );
    if (pembelianRows.length === 0) throw new Error('Transaksi pembelian tidak ditemukan.');
    const pembelian = pembelianRows[0];
    if (pembelian.status === 'Void') throw new Error('Transaksi ini sudah void, tidak bisa diretur.');

    const noReferensi = `RETP-${pembelian.no_order.replace('PO-', '')}`;
    const keterangan = keteranganReturPembelian(pembelian.no_order);
    const sudahDiretur = await jumlahSudahDiretur(conn, keterangan);
    let nilaiRetur = 0;

    for (const item of items) {
      const [detailRows] = await conn.query(
        `SELECT pd.*, pr.nama_produk, pr.stok_sistem
         FROM pembelian_detail pd JOIN produk pr ON pd.id_produk = pr.id_produk
         WHERE pd.id_pembelian = ? AND pd.id_produk = ?`,
        [id_pembelian, item.id_produk]
      );
      if (detailRows.length === 0) {
        throw new Error(`Produk id ${item.id_produk} tidak ada di order ${pembelian.no_order}.`);
      }
      const detail = detailRows[0];
      const sisa = detail.kuantitas - (sudahDiretur[item.id_produk] || 0);
      if (item.kuantitas > sisa) {
        throw new Error(
          `Kuantitas retur (${item.kuantitas}) melebihi sisa yang bisa diretur (${sisa} dari ${detail.kuantitas} dibeli) untuk "${detail.nama_produk}".`
        );
      }
      if (item.kuantitas > detail.stok_sistem) {
        throw new Error(
          `Stok "${detail.nama_produk}" tidak cukup untuk diretur (sisa stok: ${detail.stok_sistem}).`
        );
      }

      nilaiRetur += Number(detail.harga_satuan) * item.kuantitas;

      await conn.query('UPDATE produk SET stok_sistem = stok_sistem - ? WHERE id_produk = ?', [
        item.kuantitas,
        item.id_produk,
      ]);
      await conn.query(
        `INSERT INTO pergerakan_stok (id_produk, jenis, jumlah, keterangan)
         VALUES (?, 'OUT', ?, ?)`,
        [item.id_produk, item.kuantitas, keterangan]
      );
    }

    await conn.query('UPDATE pembelian SET status = "Retur" WHERE id_pembelian = ?', [id_pembelian]);

    await jurnalReturPembelian(conn, {
      tanggal: new Date(),
      noReferensi,
      nilaiRetur,
      tunai,
    });

    await conn.commit();
    res.status(201).json({ message: 'Retur pembelian berhasil dicatat.', no_referensi: noReferensi, nilai_retur: nilaiRetur });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(400).json({ message: err.message || 'Retur pembelian gagal, dibatalkan.' });
  } finally {
    conn.release();
  }
}

module.exports = { returPenjualan, returPembelian };
