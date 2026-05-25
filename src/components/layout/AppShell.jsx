import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';

const AppShell = () => {
  const { user } = useSelector((state) => state.auth);
  const isMobile = user?.role === 'employee' || user?.role === 'manager';

  return (
    <div className={`app-shell${isMobile ? ' app-shell--mobile' : ' app-shell--desktop'}`}>
      {!isMobile && <Sidebar role={user?.role} />}

      <div className="app-shell__body">
        <Header showBrand={isMobile} />
        <main className="app-shell__main">
          <Outlet />
        </main>
        {isMobile && <BottomNav role={user?.role} />}
      </div>
    </div>
  );
};

export default AppShell;
