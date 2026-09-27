const pool = require('../config/db');

/**
 * Tanggal hari ini (YYYY-MM-DD) menurut zona waktu LOKAL server.
 * Jangan pakai toISOString() — itu UTC, sehingga antara jam 00.00–07.00 WIB
 * tanggalnya masih "kemarin" dan transaksi hari ini tidak ikut terhitung.
 */
function hariIniLokal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * GET /api/laporan/neraca-saldo?tanggal_akhir=YYYY-MM-DD
 * Menjumlahkan seluruh Debit - Kredit per akun s.d. tanggal tertentu.
 */
async function neracaSaldo(req, res) {
  const tanggalAkhir = req.query.tanggal_akhir || hariIniLokal();

  const [rows] = await pool.query(
    `SELECT a.kode_akun, a.nama_akun, a.jenis_akun,
            COALESCE(SUM(CASE WHEN jd.posisi = 'Debit' THEN jd.nominal ELSE 0 END), 0) AS total_debit,
            COALESCE(SUM(CASE WHEN jd.posisi = 'Kredit' THEN jd.nominal ELSE 0 END), 0) AS total_kredit
     FROM akun a
     LEFT JOIN (
       -- Filter tanggal harus di sini (sebelum di-LEFT JOIN ke akun). Kalau
       -- ditaruh di ON join ke jurnal, baris jurnal_detail di luar periode
       -- tetap ikut terjumlah.
       SELECT jd.id_akun, jd.posisi, jd.nominal
       FROM jurnal_detail jd
       JOIN jurnal j ON jd.id_jurnal = j.id_jurnal
       WHERE j.tanggal <= ?
     ) jd ON jd.id_akun = a.id_akun
     GROUP BY a.id_akun
     ORDER BY a.kode_akun`,
    [`${tanggalAkhir} 23:59:59`]
  );

  const result = rows.map((r) => ({
    ...r,
    saldo: r.total_debit - r.total_kredit, // positif = saldo normal Debit (Aset/Beban)
  }));

  const totalDebit = result.reduce((s, r) => s + r.total_debit, 0);
  const totalKredit = result.reduce((s, r) => s + r.total_kredit, 0);

  res.json({ tanggal_akhir: tanggalAkhir, akun: result, total_debit: totalDebit, total_kredit: totalKredit });
}

/**
 * GET /api/laporan/laba-rugi?tanggal_awal=...&tanggal_akhir=...
 * Pendapatan - Beban (termasuk HPP) pada periode tertentu.
 */
async function labaRugi(req, res) {
  const { tanggal_awal, tanggal_akhir } = req.query;
  const awal = tanggal_awal || '1970-01-01';
  const akhir = tanggal_akhir || hariIniLokal();

  const [rows] = await pool.query(
    `SELECT a.kode_akun, a.nama_akun, a.jenis_akun,
            COALESCE(SUM(CASE WHEN jd.posisi = 'Debit' THEN jd.nominal ELSE 0 END), 0) AS total_debit,
            COALESCE(SUM(CASE WHEN jd.posisi = 'Kredit' THEN jd.nominal ELSE 0 END), 0) AS total_kredit
     FROM akun a
     JOIN jurnal_detail jd ON jd.id_akun = a.id_akun
     JOIN jurnal j ON jd.id_jurnal = j.id_jurnal
     WHERE a.jenis_akun IN ('Pendapatan','Beban')
       AND j.tanggal BETWEEN ? AND ?
     GROUP BY a.id_akun
     ORDER BY a.kode_akun`,
    [`${awal} 00:00:00`, `${akhir} 23:59:59`]
  );

  let totalPendapatan = 0;
  let totalBeban = 0;
  const rincian = rows.map((r) => {
    // Pendapatan bersaldo normal Kredit, Beban bersaldo normal Debit
    const nilai = r.jenis_akun === 'Pendapatan' ? r.total_kredit - r.total_debit : r.total_debit - r.total_kredit;
    if (r.jenis_akun === 'Pendapatan') totalPendapatan += nilai;
    else totalBeban += nilai;
    return { ...r, nilai };
  });

  res.json({
    periode: { awal, akhir },
    rincian,
    total_pendapatan: totalPendapatan,
    total_beban: totalBeban,
    laba_rugi_bersih: totalPendapatan - totalBeban,
  });
}

/** GET /api/laporan/kartu-stok/:id_produk — riwayat pergerakan 1 produk */
async function kartuStok(req, res) {
  const [rows] = await pool.query(
    `SELECT * FROM pergerakan_stok WHERE id_produk = ? ORDER BY tanggal DESC`,
    [req.params.id_produk]
  );
  res.json(rows);
}

/** GET /api/laporan/rekap-persediaan — nilai persediaan saat ini per produk */
async function rekapPersediaan(req, res) {
  const [rows] = await pool.query(
    `SELECT id_produk, kode_sku, nama_produk, stok_sistem, harga_beli,
            (stok_sistem * harga_beli) AS nilai_persediaan
     FROM produk ORDER BY nama_produk`
  );
  const totalNilai = rows.reduce((s, r) => s + Number(r.nilai_persediaan), 0);
  res.json({ produk: rows, total_nilai_persediaan: totalNilai });
}

module.exports = { neracaSaldo, labaRugi, kartuStok, rekapPersediaan };
