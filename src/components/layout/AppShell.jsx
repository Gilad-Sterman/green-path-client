import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';

const AppShell = () => {
  const { user } = useSelector((state) => state.auth);
  const isEmployee = user?.role === 'employee';

  return (
    <div className={`app-shell${isEmployee ? ' app-shell--mobile' : ' app-shell--desktop'}`}>
      {!isEmployee && <Sidebar role={user?.role} />}

      <div className="app-shell__body">
        <Header showBrand={isEmployee} />
        <main className="app-shell__main">
          <Outlet />
        </main>
        {isEmployee && <BottomNav />}
      </div>
    </div>
  );
};

export default AppShell;
