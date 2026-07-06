import { useDispatch, useSelector } from 'react-redux';
import { LogOut, Bell, Leaf } from 'lucide-react';
import { logoutThunk } from '../../store/slices/authSlice';
import { retryWatcher } from '../../store/slices/geoSlice';

const ROLE_LABELS = {
  employee:       'עובד',
  manager:        'מנהל',
  internal_admin: 'אדמין',
};

const GEO_STATUS_CONFIG = {
  idle:        { label: 'מיקום לא פעיל', mod: 'idle',      clickable: false },
  pending:     { label: 'מחפש מיקום...',  mod: 'pending',   clickable: false },
  granted:     { label: 'מיקום פעיל',    mod: 'granted',   clickable: false },
  denied:      { label: 'מיקום נחסם',    mod: 'denied',    clickable: true  },
  unavailable: { label: 'מיקום לא זמין', mod: 'denied',    clickable: false },
};

const Header = ({ showBrand = false }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { status: geoStatus, watcherActive } = useSelector((state) => state.geo);

  const isLocationUser = user?.role === 'employee' || user?.role === 'manager';
  const effectiveStatus = !watcherActive ? 'idle' : (geoStatus || 'idle');
  const geoConfig = GEO_STATUS_CONFIG[effectiveStatus] || GEO_STATUS_CONFIG.idle;

  return (
    <header className="app-header">
      {showBrand && (
        <div className="app-header__brand">
          <Leaf size={20} strokeWidth={2.5} />
          <span>ATERUM</span>
        </div>
      )}

      <div className="app-header__spacer" />

      <div className="app-header__right">
        {isLocationUser && (
          <button
            className={`geo-status-pill geo-status-pill--${geoConfig.mod}`}
            onClick={geoConfig.clickable ? () => dispatch(retryWatcher()) : undefined}
            title={geoConfig.clickable ? 'לחץ לנסות שוב' : geoConfig.label}
            style={{ cursor: geoConfig.clickable ? 'pointer' : 'default' }}
          >
            <span className="geo-status-pill__dot" />
            <span className="geo-status-pill__label">{geoConfig.label}</span>
          </button>
        )}

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
