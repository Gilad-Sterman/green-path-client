import { useDispatch, useSelector } from 'react-redux';
import { LogOut, Bell, Leaf } from 'lucide-react';
import { logoutThunk } from '../../store/slices/authSlice';

const ROLE_LABELS = {
  employee:       'Employee',
  manager:        'Manager',
  internal_admin: 'Admin',
};

const Header = ({ showBrand = false }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  return (
    <header className="app-header">
      {showBrand && (
        <div className="app-header__brand">
          <Leaf size={20} strokeWidth={2.5} />
          <span>GreenPath</span>
        </div>
      )}

      <div className="app-header__spacer" />

      <div className="app-header__right">
        <button className="icon-btn" aria-label="Notifications">
          <Bell size={18} />
        </button>

        <div className="header-user">
          <span className="header-user__name">
            {user?.full_name?.split(' ')[0] || 'User'}
          </span>
          <span className={`badge badge--${user?.role === 'internal_admin' ? 'admin' : 'green'}`}>
            {ROLE_LABELS[user?.role] || user?.role}
          </span>
        </div>

        <button
          className="icon-btn icon-btn--danger"
          onClick={() => dispatch(logoutThunk())}
          aria-label="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
};

export default Header;
