import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useOutletContext } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, AlertCircle, FileMinus } from 'lucide-react';

const Gudang = () => {
  const { role } = useOutletContext();
  const { products, stockHistory, handleWriteOff } = useAppContext();
  const [activeTab, setActiveTab] = useState('STOK'); 
  
  const canWriteOff = ['Owner', 'Kepala Toko'].includes(role);
  
  const [writeOffForm, setWriteOffForm] = useState({ id: '', qty: 1, note: '' });

  const submitWriteOff = (e) => {
    e.preventDefault();
    if(!writeOffForm.id) return alert('Pilih produk');
    handleWriteOff(writeOffForm.id, Number(writeOffForm.qty), writeOffForm.note);
    alert('Hapus buku (Write-off) berhasil dicatat');
    setWriteOffForm({ id: '', qty: 1, note: '' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Manajemen Gudang & Inventori</h2>
        <p className="text-slate-500 text-sm mt-1">Stok Opname, Pergerakan Stok, dan Penyesuaian Hapus Buku</p>
      </div>

      <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1 w-fit">
        <button onClick={() => setActiveTab('STOK')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'STOK' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
          Stok Opname
        </button>
        <button onClick={() => setActiveTab('HISTORY')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'HISTORY' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
          Kartu Pergerakan Stok
        </button>
        {canWriteOff && (
          <button onClick={() => setActiveTab('WRITE_OFF')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'WRITE_OFF' ? 'bg-red-50 text-red-700' : 'text-slate-500 hover:text-slate-700'}`}>
            Hapus Buku (Write-off)
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {activeTab === 'STOK' && (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Kode SKU</th>
                <th className="px-6 py-4">Nama Produk</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4 text-center">Stok Sistem</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-bold text-indigo-600">{p.id}</td>
                  <td className="px-6 py-4 font-medium text-slate-800">{p.name}</td>
                  <td className="px-6 py-4"><span className="bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-600">{p.category}</span></td>
                  <td className="px-6 py-4 text-center font-black text-slate-800">{p.stock}</td>
                  <td className="px-6 py-4 text-center">
                    {p.stock < 20 ? (
                      <span className="flex items-center justify-center gap-1 text-red-600 font-bold text-xs bg-red-50 px-2 py-1 rounded-lg w-max mx-auto">
                        <AlertCircle size={14}/> Menipis
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded-lg">Aman</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'HISTORY' && (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Tanggal Transaksi</th>
                <th className="px-6 py-4">Tipe Transaksi</th>
                <th className="px-6 py-4">Produk</th>
                <th className="px-6 py-4 text-center">Qty</th>
                <th className="px-6 py-4">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stockHistory.map((h, i) => (
                <tr key={h.id || i} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 text-slate-500 font-medium">{new Date(h.date).toLocaleString('id-ID')}</td>
                  <td className="px-6 py-4">
                    {h.type === 'IN' ? (
                      <span className="flex items-center gap-1.5 text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded w-max text-xs">
                        <ArrowDownLeft size={14} /> BARANG MASUK
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded w-max text-xs">
                        <ArrowUpRight size={14} /> BARANG KELUAR
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-800">{h.product}</td>
                  <td className={`px-6 py-4 text-center font-black ${h.type === 'IN' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {h.type === 'IN' ? '+' : '-'}{h.qty}
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-xs font-medium">{h.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'WRITE_OFF' && (
          <div className="p-8 max-w-2xl mx-auto">
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-6 flex items-start gap-3">
              <FileMinus className="text-red-500 mt-1" size={20} />
              <div>
                <h4 className="font-bold text-red-800">Hapus Buku (Write-off)</h4>
                <p className="text-sm text-red-600 mt-1">Gunakan fitur ini hanya untuk mencatat barang rusak, hilang, atau kadaluarsa. Aksi ini akan mengurangi stok dan tercatat dalam log audit.</p>
              </div>
            </div>

            <form onSubmit={submitWriteOff} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Pilih Produk</label>
                <select 
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={writeOffForm.id}
                  onChange={e => setWriteOffForm({...writeOffForm, id: e.target.value})}
                  required
                >
                  <option value="">-- Pilih Produk --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.id} - {p.name} (Sistem: {p.stock})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Jumlah Dikurangi</label>
                  <input 
                    type="number" min="1" required
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={writeOffForm.qty}
                    onChange={e => setWriteOffForm({...writeOffForm, qty: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Alasan</label>
                  <input 
                    type="text" required placeholder="Contoh: Barang Rusak/Expired"
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={writeOffForm.note}
                    onChange={e => setWriteOffForm({...writeOffForm, note: e.target.value})}
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all shadow-md mt-4">
                Proses Hapus Buku
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Gudang;
