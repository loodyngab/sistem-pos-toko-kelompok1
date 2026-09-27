/**
 * returHelper.js
 * -----------------------------------------------------------------------
 * Skema tidak punya tabel retur tersendiri, jadi riwayat retur per invoice
 * dibaca dari pergerakan_stok, yang keterangannya selalu berformat:
 *   "Retur Penjualan <no_invoice>"  (jenis IN)
 *   "Retur Pembelian <no_order>"    (jenis OUT)
 * lihat retur.controller.js. Jangan ubah format keterangan tanpa
 * menyesuaikan fungsi di sini.
 * -----------------------------------------------------------------------
 */

const keteranganReturPenjualan = (noInvoice) => `Retur Penjualan ${noInvoice}`;
const keteranganReturPembelian = (noOrder) => `Retur Pembelian ${noOrder}`;

/**
 * Jumlah yang SUDAH diretur per produk untuk satu invoice/order.
 * db: pool atau conn (di dalam transaction). Hasil: { [id_produk]: jumlah }
 */
async function jumlahSudahDiretur(db, keterangan) {
  const [rows] = await db.query(
    `SELECT id_produk, SUM(jumlah) AS jumlah
     FROM pergerakan_stok WHERE keterangan = ?
     GROUP BY id_produk`,
    [keterangan]
  );
  const map = {};
  rows.forEach((r) => { map[r.id_produk] = Number(r.jumlah); });
  return map;
}

/** Tambahkan field sudah_diretur & sisa_bisa_diretur ke tiap item detail. */
async function lengkapiInfoRetur(db, items, keterangan) {
  const sudah = await jumlahSudahDiretur(db, keterangan);
  return items.map((i) => {
    const sudahDiretur = sudah[i.id_produk] || 0;
    return { ...i, sudah_diretur: sudahDiretur, sisa_bisa_diretur: i.kuantitas - sudahDiretur };
  });
}

module.exports = {
  keteranganReturPenjualan,
  keteranganReturPembelian,
  jumlahSudahDiretur,
  lengkapiInfoRetur,
};
