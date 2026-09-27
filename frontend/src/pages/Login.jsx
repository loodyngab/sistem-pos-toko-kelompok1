import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, User, Lock } from 'lucide-react';
import { login as loginApi } from '../services/api';

// Redirect setelah login ditentukan oleh ROLE YANG DIKEMBALIKAN BACKEND
// (dari akun yang berhasil login) — bukan dipilih manual oleh pengguna.
function redirectPathForRole(role) {
  if (['Owner', 'Kepala Toko', 'Bagian Keuangan', 'Akunting'].includes(role)) return '/laporan';
  if (['Kasir', 'Sales'].includes(role)) return '/transaksi';
  return '/gudang'; // Kepala Gudang
}

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Username dan password wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      const user = await loginApi(username.trim(), password);
      // loginApi sudah menyimpan token & role (dari backend) ke localStorage.
      // user.nama_role adalah role SEBENARNYA dari akun ini di database —
      // bukan sesuatu yang dipilih di form.
      navigate(redirectPathForRole(user.nama_role));
    } catch (err) {
      setError(err.message || 'Login gagal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] relative">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 to-slate-900/95 z-0"></div>

      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md z-10 border border-slate-100">
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
            <Store className="text-indigo-600" size={48} />
          </div>
        </div>
        <h2 className="text-2xl font-black text-center text-slate-800 mb-2">POS & Akuntansi Terintegrasi</h2>
        <p className="text-center text-slate-500 mb-8 font-medium">Masuk dengan akun Anda</p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                autoComplete="username"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                autoComplete="current-password"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-200 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 disabled:opacity-60"
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
