import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const Laporan = () => {
  const { products, transactions, finance } = useAppContext();
  const [activeTab, setActiveTab] = useState('KEUANGAN'); 

  const labaKotor = finance.pendapatan - finance.hpp;
  const labaBersih = labaKotor - finance.biaya;
  const totalAset = finance.kas + (finance.persediaan || 0) + finance.piutang;
  
  const revenueData = [
    { name: 'Sen', Pemasukan: 4000, Pengeluaran: 2400 },
    { name: 'Sel', Pemasukan: 3000, Pengeluaran: 1398 },
    { name: 'Rab', Pemasukan: 2000, Pengeluaran: 9800 },
    { name: 'Kam', Pemasukan: 2780, Pengeluaran: 3908 },
    { name: 'Jum', Pemasukan: 1890, Pengeluaran: 4800 },
    { name: 'Sab', Pemasukan: 2390, Pengeluaran: 3800 },
    { name: 'Min', Pemasukan: 3490, Pengeluaran: 4300 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Pusat Laporan & Analitik</h2>
        <p className="text-slate-500 text-sm mt-1">Laporan Operasional, Transaksi, dan Kinerja Keuangan</p>
      </div>

      <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1 w-fit">
        <button onClick={() => setActiveTab('OPERASIONAL')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'OPERASIONAL' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
          Operasional & Barang
        </button>
        <button onClick={() => setActiveTab('TRANSAKSIONAL')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'TRANSAKSIONAL' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
          Transaksional
        </button>
        <button onClick={() => setActiveTab('KEUANGAN')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'KEUANGAN' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
          Keuangan & Fiskal
        </button>
      </div>

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
                    <td className="px-4 py-3 text-right">Rp {p.cost.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">Rp {p.price.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-bold text-indigo-600">Rp {(p.cost * p.stock).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">Rp {((p.price - p.cost) * p.stock).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'TRANSAKSIONAL' && (
          <div className="p-6">
            <h3 className="font-bold text-slate-700 text-lg mb-4">Rekapitulasi Transaksi Sistem</h3>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-xs text-emerald-600 font-bold uppercase mb-1">Total Penjualan</p>
                <p className="text-xl font-black text-emerald-700">Rp {finance.pendapatan.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                <p className="text-xs text-red-600 font-bold uppercase mb-1">Total Pembelian</p>
                <p className="text-xl font-black text-red-700">Rp {finance.pembelian.toLocaleString()}</p>
              </div>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">ID Transaksi</th>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">Tipe</th>
                  <th className="px-4 py-3 text-right">Total Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map(t => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 font-bold text-indigo-600">{t.id}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(t.date).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        t.type.includes('SALE') ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">Rp {t.total.toLocaleString()}</td>
                  </tr>
                ))}
                {transactions.length === 0 && <tr><td colSpan="4" className="text-center py-4 text-slate-400">Belum ada transaksi</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'KEUANGAN' && (
          <div className="p-6 grid grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
                <h3 className="font-black text-slate-800 text-lg mb-4 border-b border-slate-200 pb-2">Laporan Laba Rugi</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Pendapatan Penjualan</span>
                    <span className="font-bold">Rp {finance.pendapatan.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-red-500">
                    <span>Harga Pokok Penjualan (HPP)</span>
                    <span className="font-bold">- Rp {finance.hpp.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="font-black text-slate-800">Laba Kotor</span>
                    <span className="font-black text-indigo-600">Rp {labaKotor.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-red-500">
                    <span>Biaya Operasional</span>
                    <span className="font-bold">- Rp {finance.biaya.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-indigo-100 rounded-lg mt-2">
                    <span className="font-black text-indigo-900 text-base">Laba Bersih</span>
                    <span className="font-black text-indigo-700 text-base">Rp {labaBersih.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
                <h3 className="font-black text-slate-800 text-lg mb-4 border-b border-slate-200 pb-2">Neraca Posisi Keuangan</h3>
                <div className="space-y-3 text-sm">
                  <p className="font-bold text-indigo-600">ASET</p>
                  <div className="flex justify-between pl-4">
                    <span className="text-slate-600">Kas & Bank</span>
                    <span className="font-bold">Rp {finance.kas.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pl-4">
                    <span className="text-slate-600">Persediaan Barang</span>
                    <span className="font-bold">Rp {(finance.persediaan || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="font-black text-slate-800">Total Aset</span>
                    <span className="font-black text-indigo-600">Rp {totalAset.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
               <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 h-64 flex flex-col">
                  <h3 className="font-black text-slate-800 text-sm mb-4">Arus Kas (Dummy Data)</h3>
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueData}>
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{fill: '#f1f5f9'}} />
                        <Bar dataKey="Pemasukan" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full border-4 border-indigo-500 flex items-center justify-center font-black text-indigo-700">
                      {finance.pendapatan ? Math.round((labaKotor / finance.pendapatan) * 100) : 0}%
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500">Margin Laba Kotor</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full border-4 border-emerald-500 flex items-center justify-center font-black text-emerald-700">
                      ROI
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500">Retur Investasi</p>
                      <p className="text-lg font-black text-slate-800">+ 5.2%</p>
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
