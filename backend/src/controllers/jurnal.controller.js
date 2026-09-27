const pool = require('../config/db');

/** GET /api/jurnal — Buku Jurnal Umum */
async function list(req, res) {
  const [jurnals] = await pool.query('SELECT * FROM jurnal ORDER BY tanggal DESC');
  const [details] = await pool.query(
    `SELECT jd.*, a.kode_akun, a.nama_akun FROM jurnal_detail jd
     JOIN akun a ON jd.id_akun = a.id_akun`
  );

  const detailByJurnal = {};
  details.forEach((d) => {
    if (!detailByJurnal[d.id_jurnal]) detailByJurnal[d.id_jurnal] = [];
    detailByJurnal[d.id_jurnal].push(d);
  });

  const result = jurnals.map((j) => ({ ...j, rincian: detailByJurnal[j.id_jurnal] || [] }));
  res.json(result);
}

/** GET /api/jurnal/buku-besar/:id_akun — Buku Besar per akun */
async function bukuBesar(req, res) {
  const [rows] = await pool.query(
    `SELECT j.tanggal, j.no_referensi, j.keterangan, jd.posisi, jd.nominal
     FROM jurnal_detail jd
     JOIN jurnal j ON jd.id_jurnal = j.id_jurnal
     WHERE jd.id_akun = ?
     ORDER BY j.tanggal`,
    [req.params.id_akun]
  );

  let saldoBerjalan = 0;
  const rincian = rows.map((r) => {
    saldoBerjalan += r.posisi === 'Debit' ? Number(r.nominal) : -Number(r.nominal);
    return { ...r, saldo_berjalan: saldoBerjalan };
  });

  res.json(rincian);
}

module.exports = { list, bukuBesar };
