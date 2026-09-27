import { Outlet, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { AppProvider } from '../context/AppContext';

const DashboardLayout = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState(null);

  useEffect(() => {
    const currentRole = localStorage.getItem('role');
    if (!currentRole) {
      navigate('/');
    } else {
      setRole(currentRole);
    }
  }, [navigate]);

  if (!role) return null;

  return (
    <AppProvider>
      <div className="flex h-screen bg-slate-50 font-sans">
        <Sidebar role={role} />
        <div className="flex-1 overflow-auto bg-slate-50">
          <div className="p-8 max-w-7xl mx-auto">
            <Outlet context={{ role }} />
          </div>
        </div>
      </div>
    </AppProvider>
  );
};

export default DashboardLayout;
