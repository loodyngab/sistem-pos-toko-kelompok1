import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Transaksi from './pages/Transaksi';
import Gudang from './pages/Gudang';
import Laporan from './pages/Laporan';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        <Route element={<DashboardLayout />}>
          <Route path="/transaksi" element={<Transaksi />} />
          <Route path="/gudang" element={<Gudang />} />
          <Route path="/laporan" element={<Laporan />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
