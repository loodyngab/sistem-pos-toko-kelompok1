import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, UserCircle, Shield } from 'lucide-react';

const ROLES = [
  { id: 'Owner', desc: 'Akses: Dasbor kinerja & laporan keuangan' },
  { id: 'Kepala Toko', desc: 'Akses: Otorisasi diskon, void, hapus buku' },
  { id: 'Bagian Keuangan', desc: 'Akses: Likuiditas, AR/AP, arus kas' },
  { id: 'Akunting', desc: 'Akses: Posting, rekonsiliasi, neraca & laba rugi' },
  { id: 'Kepala Gudang', desc: 'Akses: Penerimaan, kartu stok, stok opname' },
  { id: 'Kasir', desc: 'Akses: Pembayaran & cetak struk/invoice' },
  { id: 'Sales', desc: 'Akses: Pencatatan order pelanggan' }
];

const Login = () => {
  const [role, setRole] = useState('Owner');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    localStorage.setItem('role', role);
    
    // Redirect based on primary menu access
    if (['Owner', 'Bagian Keuangan', 'Akunting'].includes(role)) {
      navigate('/laporan');
    } else if (['Kepala Toko', 'Kasir', 'Sales'].includes(role)) {
      navigate('/transaksi');
    } else {
      navigate('/gudang');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] relative">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 to-slate-900/95 z-0"></div>
      
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg z-10 border border-slate-100">
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
            <Store className="text-indigo-600" size={48} />
          </div>
        </div>
        <h2 className="text-2xl font-black text-center text-slate-800 mb-2">POS & Akuntansi Terintegrasi</h2>
        <p className="text-center text-slate-500 mb-8 font-medium">Sistem RBAC (Role-Based Access Control)</p>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Pilih Role Akses Anda:</label>
            <div className="space-y-3">
              {ROLES.map((r) => (
                <label 
                  key={r.id} 
                  className={`flex items-start gap-4 p-4 rounded-xl cursor-pointer border-2 transition-all ${
                    role === r.id 
                      ? 'border-indigo-600 bg-indigo-50/50' 
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="mt-0.5">
                    <input 
                      type="radio" 
                      name="role" 
                      value={r.id} 
                      checked={role === r.id}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      {r.id}
                      {role === r.id && <Shield size={14} className="text-indigo-600" />}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">{r.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex justify-center py-4 px-4 rounded-xl shadow-lg shadow-indigo-200 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
          >
            Otorisasi & Masuk Sistem
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
