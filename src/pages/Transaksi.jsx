import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { ShoppingCart, Plus, Minus, Trash2, ArrowRightLeft, Upload, Download } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

const Transaksi = () => {
  const { role } = useOutletContext();
  const { products, processTransaction } = useAppContext();
  const [activeTab, setActiveTab] = useState('SALE'); // SALE, PURCHASE, RETUR_SALE, RETUR_PURCHASE
  const [cart, setCart] = useState([]);

  // RBAC Access Control for Tabs
  const canSell = ['Owner', 'Kepala Toko', 'Kasir', 'Sales'].includes(role);
  const canPurchase = ['Owner', 'Kepala Toko', 'Kepala Gudang'].includes(role);
  const canReturn = ['Owner', 'Kepala Toko'].includes(role);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : item;
      }
      return item;
    }));
  };

  const total = cart.reduce((sum, item) => sum + (activeTab === 'SALE' || activeTab === 'RETUR_SALE' ? item.price : item.cost) * item.qty, 0);

  const handleSubmit = () => {
    if (cart.length === 0) return;
    
    // Additional RBAC Check
    if (activeTab === 'SALE' && !canSell) return alert('Tidak ada otorisasi penjualan');
    if (activeTab === 'PURCHASE' && !canPurchase) return alert('Tidak ada otorisasi pembelian');
    if ((activeTab === 'RETUR_SALE' || activeTab === 'RETUR_PURCHASE') && !canReturn) return alert('Membutuhkan otorisasi Kepala Toko/Owner untuk retur');

    processTransaction(activeTab, cart, total);
    alert(`Transaksi ${activeTab} berhasil diproses!`);
    setCart([]);
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
          <button onClick={() => {setActiveTab('SALE'); setCart([])}} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'SALE' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
            <ShoppingCart size={16} /> Penjualan POS
          </button>
        )}
        {canPurchase && (
          <button onClick={() => {setActiveTab('PURCHASE'); setCart([])}} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'PURCHASE' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
            <Download size={16} /> Pembelian
          </button>
        )}
        {canReturn && (
          <>
            <button onClick={() => {setActiveTab('RETUR_SALE'); setCart([])}} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'RETUR_SALE' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
              <ArrowRightLeft size={16} /> Retur Penjualan
            </button>
            <button onClick={() => {setActiveTab('RETUR_PURCHASE'); setCart([])}} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'RETUR_PURCHASE' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
              <Upload size={16} /> Retur Pembelian
            </button>
          </>
        )}
      </div>

      <div className="flex gap-6 h-[calc(100vh-14rem)]">
        {/* Katalog / Item List */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-bold text-slate-700">Pilih Produk</h3>
          </div>
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
              disabled={cart.length === 0}
              className={`w-full py-4 rounded-xl font-bold text-white transition-all ${
                cart.length > 0 ? 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200' : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              Proses Transaksi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transaksi;
