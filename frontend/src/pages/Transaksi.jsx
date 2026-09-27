import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { ShoppingCart, Plus, Minus, Trash2, ArrowRightLeft, Upload, Download } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { fetchPenjualan, fetchPembelian, fetchPenjualanDetail, fetchPembelianDetail } from '../services/api';

const Transaksi = () => {
  const { role } = useOutletContext();
  const { products, processTransaction } = useAppContext();
  // RBAC Access Control for Tabs — harus sama dengan allowRoles di backend
  // (penjualan.routes.js, pembelian.routes.js, retur.routes.js)
  const canSell = ['Owner', 'Kasir', 'Sales'].includes(role);
  const canPurchase = ['Owner', 'Kepala Gudang'].includes(role);
  const canReturSale = ['Owner', 'Kasir', 'Sales'].includes(role);
  const canReturPurchase = ['Owner', 'Kepala Gudang'].includes(role);

  // Tab awal = tab pertama yang boleh diakses role ini
  const [activeTab, setActiveTab] = useState(canSell ? 'SALE' : 'PURCHASE'); // SALE, PURCHASE, RETUR_SALE, RETUR_PURCHASE
  const [cart, setCart] = useState([]);
  const isRetur = activeTab === 'RETUR_SALE' || activeTab === 'RETUR_PURCHASE';

  // ---- Retur: harus merujuk invoice penjualan / PO pembelian asli ----
  const [daftarInvoice, setDaftarInvoice] = useState([]);
  const [invoiceId, setInvoiceId] = useState('');
  const [invoiceDetail, setInvoiceDetail] = useState(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  const muatDaftarInvoice = async (tab) => {
    setLoadingInvoice(true);
    try {
      const rows = tab === 'RETUR_SALE' ? await fetchPenjualan() : await fetchPembelian();
      setDaftarInvoice(
        rows
          .filter((r) => r.status !== 'Void')
          .map((r) => tab === 'RETUR_SALE'
            ? { id: r.id_penjualan, no: r.no_invoice, tanggal: r.tanggal, total: Number(r.total_pembayaran), pihak: r.nama_pelanggan || '-' }
            : { id: r.id_pembelian, no: r.no_order, tanggal: r.tanggal, total: Number(r.total_pembelian), pihak: r.nama_supplier })
      );
    } catch (err) {
      alert(`Gagal memuat daftar transaksi: ${err.message}`);
    } finally {
      setLoadingInvoice(false);
    }
  };

  const pilihInvoice = async (id, tab = activeTab) => {
    setInvoiceId(id);
    setInvoiceDetail(null);
    setCart([]);
    if (!id) return;
    setLoadingInvoice(true);
    try {
      setInvoiceDetail(tab === 'RETUR_SALE' ? await fetchPenjualanDetail(id) : await fetchPembelianDetail(id));
    } catch (err) {
      alert(`Gagal memuat detail transaksi: ${err.message}`);
    } finally {
      setLoadingInvoice(false);
    }
  };

  const gantiTab = (tab) => {
    setActiveTab(tab);
    setCart([]);
    setInvoiceId('');
    setInvoiceDetail(null);
    setDaftarInvoice([]);
    if (tab === 'RETUR_SALE' || tab === 'RETUR_PURCHASE') muatDaftarInvoice(tab);
  };

  // Item invoice dalam bentuk yang sama dengan produk katalog. Harga = harga
  // di invoice asli (bukan harga produk sekarang); max = sisa yang bisa diretur.
  const itemInvoice = (invoiceDetail?.items || []).map((i) => ({
    id: i.id_produk,
    name: i.nama_produk,
    price: Number(i.harga_satuan),
    cost: Number(i.harga_satuan),
    dibeli: i.kuantitas,
    sudahDiretur: i.sudah_diretur,
    max: i.sisa_bisa_diretur,
  }));

  const addToCart = (product) => {
    if (product.max !== undefined && product.max <= 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.max !== undefined && existing.qty >= existing.max) return prev;
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        const dalamBatas = newQty > 0 && (item.max === undefined || newQty <= item.max);
        return dalamBatas ? { ...item, qty: newQty } : item;
      }
      return item;
    }));
  };

  const total = cart.reduce((sum, item) => sum + (activeTab === 'SALE' || activeTab === 'RETUR_SALE' ? item.price : item.cost) * item.qty, 0);

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (cart.length === 0) return;

    // Additional RBAC Check
    if (activeTab === 'SALE' && !canSell) return alert('Tidak ada otorisasi penjualan');
    if (activeTab === 'PURCHASE' && !canPurchase) return alert('Tidak ada otorisasi pembelian');
    if (activeTab === 'RETUR_SALE' && !canReturSale) return alert('Tidak ada otorisasi retur penjualan');
    if (activeTab === 'RETUR_PURCHASE' && !canReturPurchase) return alert('Tidak ada otorisasi retur pembelian');

    setSubmitting(true);
    try {
      const referensi =
        activeTab === 'RETUR_SALE' ? { id_penjualan: Number(invoiceId) }
        : activeTab === 'RETUR_PURCHASE' ? { id_pembelian: Number(invoiceId) }
        : undefined;
      await processTransaction(activeTab, cart, total, referensi);
      alert(`Transaksi ${activeTab} berhasil diproses!`);
      setCart([]);
      if (isRetur) {
        // Muat ulang supaya status & sisa yang bisa diretur ter-update
        await muatDaftarInvoice(activeTab);
        await pilihInvoice(invoiceId);
      }
    } catch (err) {
      alert(`Transaksi gagal: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Modul Transaksi</h2>
        <p className="text-slate-500 text-sm mt-1">Kelola penjualan, pembelian, dan retur</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1 w-fit">
        {canSell && (
          <button onClick={() => gantiTab('SALE')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'SALE' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
            <ShoppingCart size={16} /> Penjualan POS
          </button>
        )}
        {canPurchase && (
          <button onClick={() => gantiTab('PURCHASE')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'PURCHASE' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
            <Download size={16} /> Pembelian
          </button>
        )}
        {canReturSale && (
          <button onClick={() => gantiTab('RETUR_SALE')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'RETUR_SALE' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
            <ArrowRightLeft size={16} /> Retur Penjualan
          </button>
        )}
        {canReturPurchase && (
          <button onClick={() => gantiTab('RETUR_PURCHASE')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'RETUR_PURCHASE' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
            <Upload size={16} /> Retur Pembelian
          </button>
        )}
      </div>

      <div className="flex gap-6 h-[calc(100vh-14rem)]">
        {/* Katalog / Item List */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-bold text-slate-700">
              {activeTab === 'RETUR_SALE' ? 'Pilih Invoice Penjualan' : activeTab === 'RETUR_PURCHASE' ? 'Pilih Order Pembelian' : 'Pilih Produk'}
            </h3>
          </div>
          {isRetur ? (
            <div className="flex-1 overflow-auto p-4 space-y-4">
              <select
                value={invoiceId}
                onChange={(e) => pilihInvoice(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
              >
                <option value="">
                  {loadingInvoice && daftarInvoice.length === 0 ? 'Memuat...' : `-- Pilih ${activeTab === 'RETUR_SALE' ? 'invoice' : 'order'} (${daftarInvoice.length}) --`}
                </option>
                {daftarInvoice.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.no} · {new Date(inv.tanggal).toLocaleString('id-ID')} · {inv.pihak} · Rp {inv.total.toLocaleString('id-ID')}
                  </option>
                ))}
              </select>

              {invoiceDetail && (
                <>
                  {invoiceDetail.status === 'Retur' && (
                    <p className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Transaksi ini sudah pernah diretur sebagian. Hanya sisa kuantitas yang masih bisa diretur.
                    </p>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 content-start">
                    {itemInvoice.map((p) => {
                      const habis = p.max <= 0;
                      return (
                        <div key={p.id} onClick={() => addToCart(p)}
                          className={`p-4 border rounded-xl transition-all bg-white ${habis ? 'border-slate-100 opacity-50 cursor-not-allowed' : 'border-slate-200 hover:border-indigo-400 hover:shadow-md cursor-pointer'}`}>
                          <h4 className="font-bold text-slate-800 text-sm mb-2">{p.name}</h4>
                          <p className="text-xs text-slate-500">Dibeli: {p.dibeli} · Sudah diretur: {p.sudahDiretur}</p>
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                            <span className="text-sm font-black text-slate-700">Rp {p.price.toLocaleString()}</span>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${habis ? 'bg-slate-100 text-slate-500' : 'bg-indigo-100 text-indigo-700'}`}>
                              Sisa: {p.max}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              {!invoiceId && !loadingInvoice && (
                <p className="text-sm text-slate-400 text-center pt-8">
                  Pilih {activeTab === 'RETUR_SALE' ? 'invoice penjualan' : 'order pembelian'} yang barangnya mau diretur.
                </p>
              )}
            </div>
          ) : (
          <div className="flex-1 overflow-auto p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 content-start">
            {products.map(p => (
              <div key={p.id} onClick={() => addToCart(p)} className="p-4 border border-slate-200 rounded-xl hover:border-indigo-400 hover:shadow-md cursor-pointer transition-all bg-white group">
                <div className="text-xs font-bold text-indigo-600 mb-1">{p.id}</div>
                <h4 className="font-bold text-slate-800 text-sm mb-2">{p.name}</h4>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                  <span className="text-sm font-black text-slate-700">
                    Rp {(activeTab === 'SALE' || activeTab === 'RETUR_SALE' ? p.price : p.cost).toLocaleString()}
                  </span>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${p.stock < 20 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                    Stok: {p.stock}
                  </span>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>

        {/* Keranjang Transaksi */}
        <div className="w-[400px] bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-slate-700">Detail {activeTab}</h3>
            <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-bold">{cart.length} Item</span>
          </div>
          
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {cart.map(item => (
              <div key={item.id} className="p-3 border border-slate-100 bg-slate-50 rounded-xl flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-sm text-slate-800">{item.name}</h4>
                  <button onClick={() => setCart(c => c.filter(i => i.id !== item.id))} className="text-red-400 hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-indigo-600">
                    Rp {((activeTab === 'SALE' || activeTab === 'RETUR_SALE' ? item.price : item.cost) * item.qty).toLocaleString()}
                  </span>
                  <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-sm">
                    <button onClick={() => updateQty(item.id, -1)} className="text-slate-500 hover:text-indigo-600"><Minus size={14} /></button>
                    <span className="text-sm font-bold w-4 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="text-slate-500 hover:text-indigo-600"><Plus size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">Belum ada item dipilih</div>
            )}
          </div>

          <div className="p-6 border-t border-slate-200 bg-slate-50">
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-600 font-bold">Total Transaksi</span>
              <span className="text-2xl font-black text-slate-900">Rp {total.toLocaleString()}</span>
            </div>
            <button 
              onClick={handleSubmit}
              disabled={cart.length === 0 || submitting}
              className={`w-full py-4 rounded-xl font-bold text-white transition-all ${
                cart.length > 0 && !submitting ? 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200' : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              {submitting ? 'Memproses...' : 'Proses Transaksi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transaksi;
