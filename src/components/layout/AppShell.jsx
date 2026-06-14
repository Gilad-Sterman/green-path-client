import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { AlertTriangle } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';

const AppShell = () => {
  const { user } = useSelector((state) => state.auth);
  const isMobile = user?.role === 'employee' || user?.role === 'manager';
  const isSuspended = user?.factory_status === 'suspended' && user?.role !== 'internal_admin';

  return (
    <div className={`app-shell${isMobile ? ' app-shell--mobile' : ' app-shell--desktop'}`}>
      {!isMobile && <Sidebar role={user?.role} />}

      <div className="app-shell__body">
        <Header showBrand={isMobile} />
        {isSuspended && (
          <div className="factory-suspended-banner">
            <AlertTriangle size={16} />
            <span>המפעל הושעה. כל הפעולות חסומות. פנה למנהל המערכת לפרטים.</span>
          </div>
        )}
        <main className="app-shell__main">
          <Outlet />
        </main>
        {isMobile && <BottomNav role={user?.role} />}
      </div>
    </div>
  );
};

export default AppShell;
