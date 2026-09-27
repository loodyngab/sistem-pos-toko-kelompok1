import { useState } from 'react';
import { Search, Plus, Minus, ShoppingBag, Trash2 } from 'lucide-react';

const DUMMY_PRODUCTS = [
  { id: 1, name: 'Beras Premium 5kg', price: 65000, category: 'Sembako', image: 'https://images.unsplash.com/photo-1586201375761-83865001e8ac?w=500&q=80' },
  { id: 2, name: 'Minyak Goreng 2L', price: 34000, category: 'Sembako', image: 'https://images.unsplash.com/photo-1628102491629-77858ab57287?w=500&q=80' },
  { id: 3, name: 'Gula Pasir 1kg', price: 15000, category: 'Sembako', image: 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=500&q=80' },
  { id: 4, name: 'Telur Ayam 1kg', price: 28000, category: 'Sembako', image: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=500&q=80' },
  { id: 5, name: 'Mie Instan Goreng', price: 3000, category: 'Makanan', image: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=500&q=80' },
  { id: 6, name: 'Susu UHT 1L', price: 18000, category: 'Minuman', image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500&q=80' },
  { id: 7, name: 'Kopi Bubuk 250g', price: 25000, category: 'Minuman', image: 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?w=500&q=80' },
  { id: 8, name: 'Sabun Cuci Piring', price: 12000, category: 'Kebersihan', image: 'https://images.unsplash.com/photo-1584820927500-eaa623f95eaf?w=500&q=80' },
];

const Pos = () => {
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Semua');

  const categories = ['Semua', ...new Set(DUMMY_PRODUCTS.map(p => p.category))];

  const filteredProducts = DUMMY_PRODUCTS.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'Semua' || product.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
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

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    alert(`Pembayaran berhasil sebesar Rp ${total.toLocaleString()}`);
    setCart([]);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-6">
      {/* Kiri - Daftar Produk */}
      <div className="flex-1 flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header Produk */}
        <div className="p-6 border-b border-gray-100 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Point of Sales</h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Cari produk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
              />
            </div>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl whitespace-nowrap text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid Produk */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50/50">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group"
              >
                <div className="aspect-square bg-gray-100 rounded-xl mb-3 overflow-hidden">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="text-xs font-semibold text-blue-600 mb-1">{product.category}</div>
                <h3 className="font-semibold text-gray-800 text-sm mb-2 line-clamp-2">{product.name}</h3>
                <p className="font-bold text-gray-900">Rp {product.price.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Kanan - Keranjang */}
      <div className="w-96 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 h-full overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <ShoppingBag className="text-blue-600" size={24} />
          <h2 className="text-xl font-bold text-gray-800">Keranjang ({cart.reduce((acc, item) => acc + item.qty, 0)})</h2>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <ShoppingBag size={48} className="mb-4 opacity-50" />
              <p>Keranjang masih kosong</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <img src={item.image} alt={item.name} className="w-16 h-16 rounded-lg object-cover" />
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-medium text-gray-800 text-sm line-clamp-1">{item.name}</h4>
                    <p className="text-sm font-bold text-blue-600">Rp {(item.price * item.qty).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-2 py-1">
                      <button onClick={() => updateQty(item.id, -1)} className="text-gray-500 hover:text-blue-600">
                        <Minus size={16} />
                      </button>
                      <span className="text-sm font-semibold w-4 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="text-gray-500 hover:text-blue-600">
                        <Plus size={16} />
                      </button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <div className="flex justify-between items-center mb-6">
            <span className="text-gray-600 font-medium">Total Tagihan</span>
            <span className="text-2xl font-bold text-gray-900">Rp {total.toLocaleString()}</span>
          </div>
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-colors ${
              cart.length > 0 
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Bayar Sekarang
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pos;
