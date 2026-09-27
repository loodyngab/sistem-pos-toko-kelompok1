import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, ShoppingCart, Package, FileText, LogOut, ShieldCheck } from 'lucide-react';
import { logout } from '../services/api';

// Disesuaikan dengan allowRoles di backend. Kepala Toko tidak punya izin
// transaksi apa pun di backend, jadi menu Transaksi tidak ditampilkan.
const ROLE_MENUS = {
  'Owner': ['/laporan', '/transaksi', '/gudang'],
  'Kepala Toko': ['/laporan', '/gudang'],
  'Bagian Keuangan': ['/laporan'],
  'Akunting': ['/laporan'],
  'Kepala Gudang': ['/gudang', '/transaksi'],
  'Kasir': ['/transaksi'],
  'Sales': ['/transaksi'],
};

const Sidebar = ({ role }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // hapus token + role
    navigate('/');
  };

  const allMenus = [
    { path: '/transaksi', name: 'Transaksi & POS', icon: <ShoppingCart size={20} /> },
    { path: '/gudang', name: 'Inventori Gudang', icon: <Package size={20} /> },
    { path: '/laporan', name: 'Laporan & Keuangan', icon: <FileText size={20} /> },
  ];

  const allowedPaths = ROLE_MENUS[role] || [];
  const menus = allMenus.filter(m => allowedPaths.includes(m.path));

  return (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl">
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="bg-indigo-600 p-2 rounded-xl">
          <Home className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white leading-tight">Sistem POS</h1>
          <p className="text-xs text-slate-400">Terintegrasi</p>
        </div>
      </div>
      
      <div className="p-4 flex flex-col flex-1">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-2">Menu Utama</p>
        <nav className="flex-1 space-y-1">
          {menus.map((menu) => {
            const isActive = location.pathname === menu.path;
            return (
              <Link
                key={menu.path}
                to={menu.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/50'
                    : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                {menu.icon}
                <span className="font-medium text-sm">{menu.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-slate-800 pt-4">
          <div className="px-4 py-3 mb-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={14} className="text-emerald-400" />
              <p className="text-xs text-slate-400">Otoritas Akses:</p>
            </div>
            <p className="text-sm font-bold text-white">{role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-colors duration-200"
          >
            <LogOut size={18} />
            <span className="font-medium text-sm">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
