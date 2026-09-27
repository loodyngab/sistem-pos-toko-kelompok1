import { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { RefreshCw } from 'lucide-react';
import {
  fetchLabaRugi, fetchNeracaSaldo, fetchJurnalUmum, fetchPenjualan, fetchPembelian,
} from '../services/api';

const KODE_KAS = '1101';
const KODE_HPP = '5101';

const rupiah = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

// Tanggal lokal (YYYY-MM-DD). toISOString() = UTC, bisa meleset 1 hari di WIB.
function tanggalLokal(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Arus kas 7 hari terakhir (s.d. tanggalAkhir) dari baris jurnal akun Kas:
 * Debit Kas = pemasukan, Kredit Kas = pengeluaran. Jurnal saldo awal
 * (setoran modal) tidak ikut, supaya grafik mencerminkan operasional.
 */
function hitungArusKas(jurnal, tanggalAkhir) {
  const hari = [];
  const akhir = new Date(`${tanggalAkhir}T00:00:00`);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(akhir);
    d.setDate(d.getDate() - i);
    hari.push({
      key: tanggalLokal(d),
      name: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
      Pemasukan: 0,
      Pengeluaran: 0,
    });
  }
  const byKey = Object.fromEntries(hari.map((h) => [h.key, h]));

  jurnal.forEach((j) => {
    if (j.no_referensi === 'SALDO-AWAL') return;
    const slot = byKey[tanggalLokal(new Date(j.tanggal))];
    if (!slot) return;
    j.rincian
      .filter((r) => r.kode_akun === KODE_KAS)
      .forEach((r) => {
        if (r.posisi === 'Debit') slot.Pemasukan += Number(r.nominal);
        else slot.Pengeluaran += Number(r.nominal);
      });
  });
  return hari;
}

/** Susun neraca dari neraca saldo: Aset = Kewajiban + Ekuitas + Laba berjalan. */
function susunNeraca(akun) {
  const aset = akun.filter((a) => a.jenis_akun === 'Aset').map((a) => ({ ...a, nilai: a.saldo }));
  const kewajiban = akun.filter((a) => a.jenis_akun === 'Kewajiban').map((a) => ({ ...a, nilai: -a.saldo }));
  const ekuitas = akun.filter((a) => a.jenis_akun === 'Ekuitas').map((a) => ({ ...a, nilai: -a.saldo }));
  // Pendapatan & Beban yang belum ditutup ke modal = laba berjalan
  const labaBerjalan = akun
    .filter((a) => a.jenis_akun === 'Pendapatan' || a.jenis_akun === 'Beban')
    .reduce((s, a) => s - a.saldo, 0);

  const sum = (rows) => rows.reduce((s, r) => s + r.nilai, 0);
  const totalAset = sum(aset);
  const totalPasiva = sum(kewajiban) + sum(ekuitas) + labaBerjalan;
  return { aset, kewajiban, ekuitas, labaBerjalan, totalAset, totalPasiva };
}

const Baris = ({ label, nilai, className = '', indent = false }) => (
  <div className={`flex justify-between ${indent ? 'pl-4' : ''} ${className}`}>
    <span>{label}</span>
    <span className="font-bold">{nilai}</span>
  </div>
);

const Laporan = () => {
  const { products, loadingProducts } = useAppContext();
  const [activeTab, setActiveTab] = useState('KEUANGAN');

  // ---- Filter periode (tab Keuangan) ----
  const [tanggalAwal, setTanggalAwal] = useState('');
  const [tanggalAkhir, setTanggalAkhir] = useState(tanggalLokal());

  // ---- Data dari backend ----
  const [labaRugi, setLabaRugi] = useState(null);
  const [neraca, setNeraca] = useState(null);
  const [arusKas, setArusKas] = useState(null);
  const [arusKasError, setArusKasError] = useState('');
  const [transaksi, setTransaksi] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const muatKeuangan = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [lr, ns] = await Promise.all([
        fetchLabaRugi(tanggalAwal, tanggalAkhir),
        fetchNeracaSaldo(tanggalAkhir),
      ]);
      setLabaRugi(lr);
      setNeraca(susunNeraca(ns.akun));
    } catch (err) {
      setError(err.message);
    }

    // Jurnal hanya boleh diakses Owner/Akunting/Bagian Keuangan (lihat
    // jurnal.routes.js) — gagal di sini tidak boleh menggagalkan laporan lain.
    try {
      setArusKas(hitungArusKas(await fetchJurnalUmum(), tanggalAkhir));
      setArusKasError('');
    } catch (err) {
      setArusKas(null);
      setArusKasError(err.message);
    }
    setLoading(false);
  }, [tanggalAwal, tanggalAkhir]);

  const muatTransaksi = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [jual, beli] = await Promise.all([fetchPenjualan(), fetchPembelian()]);
      const gabungan = [
        ...jual.map((p) => ({
          id: p.no_invoice, date: p.tanggal, type: 'PENJUALAN', total: Number(p.total_pembayaran),
          pihak: p.nama_pelanggan || '-', petugas: p.kasir, status: p.status,
        })),
        ...beli.map((p) => ({
          id: p.no_order, date: p.tanggal, type: 'PEMBELIAN', total: Number(p.total_pembelian),
          pihak: p.nama_supplier, petugas: p.admin_gudang, status: p.status,
        })),
      ].sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransaksi(gabungan);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'KEUANGAN') muatKeuangan();
    if (activeTab === 'TRANSAKSIONAL') muatTransaksi();
  }, [activeTab, muatKeuangan, muatTransaksi]);

  // ---- Turunan laba rugi ----
  const rincianLR = labaRugi?.rincian || [];
  const akunPendapatan = rincianLR.filter((r) => r.jenis_akun === 'Pendapatan');
  const hpp = rincianLR.filter((r) => r.kode_akun === KODE_HPP).reduce((s, r) => s + r.nilai, 0);
  const bebanLain = rincianLR.filter((r) => r.jenis_akun === 'Beban' && r.kode_akun !== KODE_HPP);
  const totalPendapatan = labaRugi?.total_pendapatan || 0;
  const labaKotor = totalPendapatan - hpp;
  const labaBersih = labaRugi?.laba_rugi_bersih || 0;
  const persen = (x) => (totalPendapatan ? Math.round((x / totalPendapatan) * 100) : 0);

  // ---- Turunan transaksional (transaksi Void tidak dihitung) ----
  const aktif = transaksi.filter((t) => t.status !== 'Void');
  const totalPenjualan = aktif.filter((t) => t.type === 'PENJUALAN').reduce((s, t) => s + t.total, 0);
  const totalPembelian = aktif.filter((t) => t.type === 'PEMBELIAN').reduce((s, t) => s + t.total, 0);

  // ---- Turunan operasional ----
  const totalNilaiPersediaan = products.reduce((s, p) => s + p.cost * p.stock, 0);
  const totalPotensiLaba = products.reduce((s, p) => s + (p.price - p.cost) * p.stock, 0);

  const tabClass = (tab) =>
    `px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === tab ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Pusat Laporan & Analitik</h2>
        <p className="text-slate-500 text-sm mt-1">Laporan Operasional, Transaksi, dan Kinerja Keuangan</p>
      </div>

      <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1 w-fit">
        <button onClick={() => setActiveTab('OPERASIONAL')} className={tabClass('OPERASIONAL')}>Operasional & Barang</button>
        <button onClick={() => setActiveTab('TRANSAKSIONAL')} className={tabClass('TRANSAKSIONAL')}>Transaksional</button>
        <button onClick={() => setActiveTab('KEUANGAN')} className={tabClass('KEUANGAN')}>Keuangan & Fiskal</button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          Gagal memuat laporan: {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[60vh]">
        {activeTab === 'OPERASIONAL' && (
          <div className="p-6">
            <h3 className="font-bold text-slate-700 text-lg mb-4">Rekap Persediaan Barang (Valuasi)</h3>
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Produk</th>
                  <th className="px-4 py-3 text-center">Stok</th>
                  <th className="px-4 py-3 text-right">HPP (Modal)</th>
                  <th className="px-4 py-3 text-right">Harga Jual</th>
                  <th className="px-4 py-3 text-right">Nilai Persediaan</th>
                  <th className="px-4 py-3 text-right">Potensi Laba</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map(p => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-bold text-slate-800">{p.name}</td>
                    <td className="px-4 py-3 text-center">{p.stock}</td>
                    <td className="px-4 py-3 text-right">{rupiah(p.cost)}</td>
                    <td className="px-4 py-3 text-right">{rupiah(p.price)}</td>
                    <td className="px-4 py-3 text-right font-bold text-indigo-600">{rupiah(p.cost * p.stock)}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">{rupiah((p.price - p.cost) * p.stock)}</td>
                  </tr>
                ))}
                {!loadingProducts && products.length === 0 && (
                  <tr><td colSpan="6" className="text-center py-4 text-slate-400">Belum ada produk</td></tr>
                )}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                <tr>
                  <td colSpan="4" className="px-4 py-3 font-black text-slate-800">Total</td>
                  <td className="px-4 py-3 text-right font-black text-indigo-700">{rupiah(totalNilaiPersediaan)}</td>
                  <td className="px-4 py-3 text-right font-black text-emerald-700">{rupiah(totalPotensiLaba)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {activeTab === 'TRANSAKSIONAL' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-700 text-lg">Rekapitulasi Transaksi Sistem</h3>
              <button onClick={muatTransaksi} disabled={loading} className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-50">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Muat ulang
              </button>
            </div>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-xs text-emerald-600 font-bold uppercase mb-1">Total Penjualan</p>
                <p className="text-xl font-black text-emerald-700">{rupiah(totalPenjualan)}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                <p className="text-xs text-red-600 font-bold uppercase mb-1">Total Pembelian</p>
                <p className="text-xl font-black text-red-700">{rupiah(totalPembelian)}</p>
              </div>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">No. Transaksi</th>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">Tipe</th>
                  <th className="px-4 py-3">Pelanggan / Supplier</th>
                  <th className="px-4 py-3">Petugas</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transaksi.map(t => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 font-bold text-indigo-600">{t.id}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(t.date).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        t.type === 'PENJUALAN' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{t.pihak}</td>
                    <td className="px-4 py-3 text-slate-500">{t.petugas}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        t.status === 'Selesai' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{rupiah(t.total)}</td>
                  </tr>
                ))}
                {!loading && transaksi.length === 0 && <tr><td colSpan="7" className="text-center py-4 text-slate-400">Belum ada transaksi</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'KEUANGAN' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Dari tanggal (laba rugi)</label>
                <input type="date" value={tanggalAwal} onChange={(e) => setTanggalAwal(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Sampai tanggal</label>
                <input type="date" value={tanggalAkhir} onChange={(e) => setTanggalAkhir(e.target.value || tanggalLokal())}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-50" />
              </div>
              <p className="text-xs text-slate-400 pb-2">
                {tanggalAwal ? '' : 'Tanpa "dari tanggal" = sejak awal pencatatan. '}Neraca per tanggal akhir.
              </p>
              {loading && <RefreshCw size={16} className="animate-spin text-indigo-500 mb-2" />}
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
                  <h3 className="font-black text-slate-800 text-lg mb-4 border-b border-slate-200 pb-2">Laporan Laba Rugi</h3>
                  <div className="space-y-3 text-sm">
                    {akunPendapatan.map((a) => (
                      <Baris key={a.kode_akun} label={a.nama_akun} nilai={rupiah(a.nilai)}
                        className={a.nilai < 0 ? 'text-red-500' : 'text-slate-600'} />
                    ))}
                    {akunPendapatan.length === 0 && <Baris label="Pendapatan Penjualan" nilai={rupiah(0)} className="text-slate-600" />}
                    <Baris label="Harga Pokok Penjualan (HPP)" nilai={`- ${rupiah(hpp)}`} className="text-red-500" />
                    <div className="flex justify-between pt-2 border-t border-slate-200">
                      <span className="font-black text-slate-800">Laba Kotor</span>
                      <span className="font-black text-indigo-600">{rupiah(labaKotor)}</span>
                    </div>
                    {bebanLain.map((b) => (
                      <Baris key={b.kode_akun} label={b.nama_akun} nilai={`- ${rupiah(b.nilai)}`} className="text-red-500" />
                    ))}
                    <div className="flex justify-between p-3 bg-indigo-100 rounded-lg mt-2">
                      <span className="font-black text-indigo-900 text-base">Laba Bersih</span>
                      <span className="font-black text-indigo-700 text-base">{rupiah(labaBersih)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
                  <h3 className="font-black text-slate-800 text-lg mb-4 border-b border-slate-200 pb-2">Neraca Posisi Keuangan</h3>
                  {neraca && (
                    <div className="space-y-3 text-sm">
                      <p className="font-bold text-indigo-600">ASET</p>
                      {neraca.aset.map((a) => (
                        <Baris key={a.kode_akun} label={a.nama_akun} nilai={rupiah(a.nilai)} indent className="text-slate-600" />
                      ))}
                      <div className="flex justify-between pt-2 border-t border-slate-200">
                        <span className="font-black text-slate-800">Total Aset</span>
                        <span className="font-black text-indigo-600">{rupiah(neraca.totalAset)}</span>
                      </div>

                      <p className="font-bold text-indigo-600 pt-2">KEWAJIBAN & EKUITAS</p>
                      {[...neraca.kewajiban, ...neraca.ekuitas].map((a) => (
                        <Baris key={a.kode_akun} label={a.nama_akun} nilai={rupiah(a.nilai)} indent className="text-slate-600" />
                      ))}
                      <Baris label="Laba Berjalan" nilai={rupiah(neraca.labaBerjalan)} indent className="text-slate-600" />
                      <div className="flex justify-between pt-2 border-t border-slate-200">
                        <span className="font-black text-slate-800">Total Kewajiban & Ekuitas</span>
                        <span className="font-black text-indigo-600">{rupiah(neraca.totalPasiva)}</span>
                      </div>
                      {Math.abs(neraca.totalAset - neraca.totalPasiva) > 0.01 && (
                        <p className="text-xs font-bold text-red-600">Neraca tidak seimbang — periksa jurnal.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 h-64 flex flex-col">
                  <h3 className="font-black text-slate-800 text-sm mb-4">Arus Kas 7 Hari Terakhir</h3>
                  <div className="flex-1">
                    {arusKas ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={arusKas}>
                          <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(v) => rupiah(v)} />
                          <Bar dataKey="Pemasukan" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-center text-sm text-slate-400 px-4">
                        {arusKasError || 'Memuat...'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                    <div className="w-16 h-16 shrink-0 rounded-full border-4 border-indigo-500 flex items-center justify-center font-black text-indigo-700">
                      {persen(labaKotor)}%
                    </div>
                    <p className="text-xs font-bold text-slate-500">Margin Laba Kotor</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                    <div className="w-16 h-16 shrink-0 rounded-full border-4 border-emerald-500 flex items-center justify-center font-black text-emerald-700">
                      {persen(labaBersih)}%
                    </div>
                    <p className="text-xs font-bold text-slate-500">Margin Laba Bersih</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Laporan;
