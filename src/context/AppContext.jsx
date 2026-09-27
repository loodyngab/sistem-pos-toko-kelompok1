import { createContext, useState, useContext } from 'react';

const AppContext = createContext();

const initialProducts = [
  { id: 'P001', name: 'Beras Premium 5kg', price: 65000, cost: 50000, stock: 120, category: 'Sembako' },
  { id: 'P002', name: 'Minyak Goreng 2L', price: 34000, cost: 28000, stock: 15, category: 'Sembako' },
  { id: 'P003', name: 'Gula Pasir 1kg', price: 15000, cost: 12000, stock: 85, category: 'Sembako' },
  { id: 'P004', name: 'Telur Ayam 1kg', price: 28000, cost: 24000, stock: 42, category: 'Sembako' },
];

export const AppProvider = ({ children }) => {
  const [products, setProducts] = useState(initialProducts);
  const [transactions, setTransactions] = useState([]); 
  const [stockHistory, setStockHistory] = useState([
    { id: 1, date: new Date().toISOString(), type: 'IN', product: 'Beras Premium 5kg', qty: 120, note: 'Stok Awal' },
    { id: 2, date: new Date().toISOString(), type: 'IN', product: 'Minyak Goreng 2L', qty: 15, note: 'Stok Awal' },
  ]);
  const [finance, setFinance] = useState({
    kas: 50000000,
    piutang: 0,
    hutang: 0,
    modal: 50000000,
    pendapatan: 0,
    hpp: 0,
    biaya: 0,
    pembelian: 0
  });

  const processTransaction = (type, items, total) => {
    const date = new Date().toISOString();
    const txId = `${type}-${Date.now()}`;
    
    setTransactions(prev => [{ id: txId, type, items, total, date }, ...prev]);
    
    const newHistory = [];
    let totalHpp = 0;

    setProducts(prev => prev.map(p => {
      const item = items.find(i => i.id === p.id);
      if (item) {
        const isOut = type === 'SALE' || type === 'RETUR_PURCHASE';
        const isIn = type === 'PURCHASE' || type === 'RETUR_SALE';
        
        if (isOut || isIn) {
          newHistory.push({
            id: Date.now() + Math.random(),
            date,
            type: isOut ? 'OUT' : 'IN',
            product: p.name,
            qty: item.qty,
            note: `${type} ${txId}`
          });
        }
        
        totalHpp += (p.cost * item.qty);
        return { ...p, stock: p.stock + (isOut ? -item.qty : item.qty) };
      }
      return p;
    }));

    setStockHistory(prev => [...newHistory, ...prev]);

    setFinance(prev => {
      let newFinance = { ...prev };
      if (type === 'SALE') {
        newFinance.kas += total;
        newFinance.pendapatan += total;
        newFinance.hpp += totalHpp;
      } else if (type === 'PURCHASE') {
        newFinance.kas -= total;
        newFinance.pembelian += total;
        newFinance.persediaan = (newFinance.persediaan || 0) + total;
      } else if (type === 'RETUR_SALE') {
        newFinance.kas -= total;
        newFinance.pendapatan -= total;
        newFinance.hpp -= totalHpp;
      } else if (type === 'RETUR_PURCHASE') {
        newFinance.kas += total;
        newFinance.pembelian -= total;
      }
      return newFinance;
    });
  };

  const handleWriteOff = (productId, qty, note) => {
    setProducts(prev => prev.map(p => {
      if(p.id === productId) {
        setStockHistory(h => [{
          id: Date.now(),
          date: new Date().toISOString(),
          type: 'OUT',
          product: p.name,
          qty: qty,
          note: `Write-off: ${note}`
        }, ...h]);
        return { ...p, stock: p.stock - qty };
      }
      return p;
    }));
  };

  return (
    <AppContext.Provider value={{
      products, setProducts,
      transactions, setTransactions,
      stockHistory, setStockHistory,
      finance, setFinance,
      processTransaction,
      handleWriteOff
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
