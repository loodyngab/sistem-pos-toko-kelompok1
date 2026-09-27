import { createContext, useState, useContext, useEffect } from 'react';
import { fetchProduk, kirimTransaksi, kirimWriteOff } from '../services/api';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [stockHistory, setStockHistory] = useState([]);

  // Ambil produk asli dari backend saat pertama kali render
  useEffect(() => {
    let mounted = true;
    fetchProduk()
      .then((data) => { if (mounted) setProducts(data); })
      .catch((err) => console.error('Gagal memuat produk dari backend:', err))
      .finally(() => { if (mounted) setLoadingProducts(false); });
    return () => { mounted = false; };
  }, []);

  const refreshProducts = async () => {
    try {
      const data = await fetchProduk();
      setProducts(data);
    } catch (err) {
      console.error('Gagal memuat ulang produk:', err);
    }
  };

  /**
   * type: 'SALE' | 'PURCHASE' | 'RETUR_SALE' | 'RETUR_PURCHASE'
   * items: cart dari komponen (array of { id, name, price, cost, qty, ... })
   * total: dihitung di komponen (dipakai buat catatan transaksi lokal saja;
   * nilai yang tersimpan resmi di jurnal dihitung ulang oleh backend).
   *
   * BEDA PENTING dari versi dummy sebelumnya: fungsi ini sekarang async
   * dan benar-benar memanggil backend. Komponen yang memanggil
   * processTransaction perlu di-await (lihat Transaksi.jsx).
   */
  const processTransaction = async (type, items, total, referensi) => {
    // referensi: { id_penjualan } / { id_pembelian } untuk retur
    const result = await kirimTransaksi(type, items, referensi); // lempar error kalau gagal, ditangani di komponen

    const date = new Date().toISOString();
    const txId = result.no_invoice || result.no_order || result.no_referensi || `${type}-${Date.now()}`;
    setTransactions((prev) => [{ id: txId, type, items, total, date }, ...prev]);

    // Refresh produk supaya stok yang ditampilkan sinkron dengan database
    await refreshProducts();

    return result;
  };

  /**
   * Gudang.jsx: form write-off ("kurangi stok sebanyak qty dengan alasan").
   * Dipetakan ke endpoint stok-opname di backend (lihat kirimWriteOff).
   */
  const handleWriteOff = async (productId, qty, note) => {
    const produk = products.find((p) => p.id === Number(productId) || p.id === productId);
    if (!produk) throw new Error('Produk tidak ditemukan.');

    await kirimWriteOff(produk.id, produk.stock, qty, note);

    setStockHistory((h) => [
      {
        id: Date.now(),
        date: new Date().toISOString(),
        type: 'OUT',
        product: produk.name,
        qty,
        note: `Write-off: ${note}`,
      },
      ...h,
    ]);

    await refreshProducts();
  };

  return (
    <AppContext.Provider
      value={{
        products, setProducts, loadingProducts, refreshProducts,
        transactions, setTransactions,
        stockHistory, setStockHistory,
        processTransaction,
        handleWriteOff,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
