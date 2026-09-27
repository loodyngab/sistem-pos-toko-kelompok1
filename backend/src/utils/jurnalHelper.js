/**
 * jurnalHelper.js
 * -----------------------------------------------------------------------
 * Semua fungsi di sini WAJIB dipanggil di dalam transaction (conn) yang
 * sama dengan transaksi bisnisnya (checkout, pembelian, stok opname),
 * supaya jika salah satu langkah gagal, semuanya rollback bersama.
 *
 * Kode akun mengacu ke database/seeder.sql — jangan ubah salah satu
 * tanpa mengubah yang lain.
 * -----------------------------------------------------------------------
 */

const KODE_AKUN = {
  KAS: '1101',
  PIUTANG: '1102',
  PERSEDIAAN: '1103',
  UTANG: '2101',
  PENDAPATAN_PENJUALAN: '4101',
  RETUR_PENJUALAN: '4102',
  HPP: '5101',
  KERUGIAN_PERSEDIAAN: '5102',
};

// Cache sederhana in-memory: id_akun jarang berubah, tidak perlu query ulang tiap request.
let akunCache = null;

async function getAkunId(conn, kodeAkun) {
  if (!akunCache) {
    const [rows] = await conn.query('SELECT id_akun, kode_akun FROM akun');
    akunCache = {};
    rows.forEach((r) => { akunCache[r.kode_akun] = r.id_akun; });
  }
  const id = akunCache[kodeAkun];
  if (!id) {
    throw new Error(
      `Kode akun ${kodeAkun} tidak ditemukan di tabel akun. Pastikan seeder.sql sudah dijalankan.`
    );
  }
  return id;
}

/**
 * Insert 1 header jurnal + N baris jurnal_detail.
 * entries: [{ kodeAkun, posisi: 'Debit'|'Kredit', nominal }, ...]
 * Melempar error jika total Debit != total Kredit (validasi wajib akuntansi).
 */
async function postJurnal(conn, { tanggal, noReferensi, keterangan, entries }) {
  const totalDebit = entries
    .filter((e) => e.posisi === 'Debit')
    .reduce((sum, e) => sum + Number(e.nominal), 0);
  const totalKredit = entries
    .filter((e) => e.posisi === 'Kredit')
    .reduce((sum, e) => sum + Number(e.nominal), 0);

  // Toleransi pembulatan kecil (floating point), tapi tetap ketat.
  if (Math.abs(totalDebit - totalKredit) > 0.01) {
    throw new Error(
      `Jurnal tidak balance! Total Debit (${totalDebit}) != Total Kredit (${totalKredit}). Referensi: ${noReferensi}`
    );
  }

  const [jurnalResult] = await conn.query(
    'INSERT INTO jurnal (tanggal, no_referensi, keterangan) VALUES (?, ?, ?)',
    [tanggal, noReferensi, keterangan]
  );
  const idJurnal = jurnalResult.insertId;

  for (const entry of entries) {
    const idAkun = await getAkunId(conn, entry.kodeAkun);
    await conn.query(
      'INSERT INTO jurnal_detail (id_jurnal, id_akun, posisi, nominal) VALUES (?, ?, ?, ?)',
      [idJurnal, idAkun, entry.posisi, entry.nominal]
    );
  }

  return idJurnal;
}

/**
 * Jurnal otomatis saat transaksi PENJUALAN (POS) selesai / tombol "Bayar".
 * - Debit Kas, Kredit Pendapatan Penjualan  (sebesar total_pembayaran)
 * - Debit HPP, Kredit Persediaan            (sebesar total modal barang terjual)
 */
async function jurnalPenjualan(conn, { tanggal, noInvoice, totalPembayaran, totalModal }) {
  return postJurnal(conn, {
    tanggal,
    noReferensi: noInvoice,
    keterangan: `Penjualan - ${noInvoice}`,
    entries: [
      { kodeAkun: KODE_AKUN.KAS, posisi: 'Debit', nominal: totalPembayaran },
      { kodeAkun: KODE_AKUN.PENDAPATAN_PENJUALAN, posisi: 'Kredit', nominal: totalPembayaran },
      { kodeAkun: KODE_AKUN.HPP, posisi: 'Debit', nominal: totalModal },
      { kodeAkun: KODE_AKUN.PERSEDIAAN, posisi: 'Kredit', nominal: totalModal },
    ],
  });
}

/**
 * Jurnal otomatis saat PEMBELIAN barang dari supplier selesai.
 * Diasumsikan tunai (Kas). Jika kredit/utang, ganti KAS -> UTANG.
 * - Debit Persediaan, Kredit Kas/Utang (sebesar total_pembelian)
 */
async function jurnalPembelian(conn, { tanggal, noOrder, totalPembelian, tunai = true }) {
  return postJurnal(conn, {
    tanggal,
    noReferensi: noOrder,
    keterangan: `Pembelian - ${noOrder}`,
    entries: [
      { kodeAkun: KODE_AKUN.PERSEDIAAN, posisi: 'Debit', nominal: totalPembelian },
      { kodeAkun: tunai ? KODE_AKUN.KAS : KODE_AKUN.UTANG, posisi: 'Kredit', nominal: totalPembelian },
    ],
  });
}

/**
 * Jurnal penyesuaian (Write-off) saat stok opname menemukan selisih MINUS
 * (barang hilang/rusak, stok fisik < stok sistem).
 * - Debit Beban Kerugian Persediaan, Kredit Persediaan (sebesar nilai selisih)
 * Selisih POSITIF (stok fisik > stok sistem) sengaja tidak dijurnal otomatis
 * di sini — butuh keputusan manual (Akunting), tapi tetap tercatat di
 * pergerakan_stok & stok_opname_detail.
 */
async function jurnalWriteOff(conn, { tanggal, noReferensi, nilaiKerugian }) {
  if (nilaiKerugian <= 0) return null;
  return postJurnal(conn, {
    tanggal,
    noReferensi,
    keterangan: `Write-off / Hapus Buku - ${noReferensi}`,
    entries: [
      { kodeAkun: KODE_AKUN.KERUGIAN_PERSEDIAAN, posisi: 'Debit', nominal: nilaiKerugian },
      { kodeAkun: KODE_AKUN.PERSEDIAAN, posisi: 'Kredit', nominal: nilaiKerugian },
    ],
  });
}

/**
 * Jurnal otomatis saat RETUR PENJUALAN (barang dikembalikan pelanggan).
 * Asumsi: uang dikembalikan tunai dari Kas (bukan sisa piutang).
 * - Debit Retur Penjualan (mengurangi pendapatan), Kredit Kas  (sebesar nilai retur)
 * - Debit Persediaan (barang balik ke gudang), Kredit HPP      (sebesar nilai modal)
 * Ini kebalikan persis dari jurnalPenjualan().
 */
async function jurnalReturPenjualan(conn, { tanggal, noReferensi, nilaiRetur, nilaiModal }) {
  return postJurnal(conn, {
    tanggal,
    noReferensi,
    keterangan: `Retur Penjualan - ${noReferensi}`,
    entries: [
      { kodeAkun: KODE_AKUN.RETUR_PENJUALAN, posisi: 'Debit', nominal: nilaiRetur },
      { kodeAkun: KODE_AKUN.KAS, posisi: 'Kredit', nominal: nilaiRetur },
      { kodeAkun: KODE_AKUN.PERSEDIAAN, posisi: 'Debit', nominal: nilaiModal },
      { kodeAkun: KODE_AKUN.HPP, posisi: 'Kredit', nominal: nilaiModal },
    ],
  });
}

/**
 * Jurnal otomatis saat RETUR PEMBELIAN (barang dikembalikan ke supplier).
 * Asumsi: uang diterima tunai kembali dari supplier (bukan pengurang utang).
 * Jika pembelian aslinya kredit/utang, ganti KAS -> UTANG (lihat parameter tunai).
 * - Debit Kas/Utang, Kredit Persediaan (sebesar nilai retur)
 * Ini kebalikan persis dari jurnalPembelian().
 */
async function jurnalReturPembelian(conn, { tanggal, noReferensi, nilaiRetur, tunai = true }) {
  return postJurnal(conn, {
    tanggal,
    noReferensi,
    keterangan: `Retur Pembelian - ${noReferensi}`,
    entries: [
      { kodeAkun: tunai ? KODE_AKUN.KAS : KODE_AKUN.UTANG, posisi: 'Debit', nominal: nilaiRetur },
      { kodeAkun: KODE_AKUN.PERSEDIAAN, posisi: 'Kredit', nominal: nilaiRetur },
    ],
  });
}

module.exports = {
  KODE_AKUN,
  postJurnal,
  jurnalPenjualan,
  jurnalPembelian,
  jurnalWriteOff,
  jurnalReturPenjualan,
  jurnalReturPembelian,
};
