import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { AlertTriangle, MapPin } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';
import GeoWatcher from '../GeoWatcher';
import { activateWatcher } from '../../store/slices/geoSlice';

const AppShell = () => {
  const dispatch   = useDispatch();
  const { user }   = useSelector((state) => state.auth);
  const { watcherActive, retryCount } = useSelector((state) => state.geo);

  const isMobile             = user?.role === 'employee' || user?.role === 'manager';
  const isLocationUser       = isMobile;
  const isSuspended          = user?.factory_status === 'suspended' && user?.role !== 'internal_admin';
  const showLocationPrompt   = isLocationUser && !watcherActive;

  useEffect(() => {
    if (!isLocationUser || !navigator?.permissions) return;
    navigator.permissions.query({ name: 'geolocation' })
      .then((result) => { if (result.state === 'granted') dispatch(activateWatcher()); })
      .catch(() => {});
  }, [isLocationUser, dispatch]);

  return (
    <div className={`app-shell${isMobile ? ' app-shell--mobile' : ' app-shell--desktop'}`}>
      {!isMobile && <Sidebar role={user?.role} />}
      {isLocationUser && watcherActive && <GeoWatcher key={retryCount} />}

      <div className="app-shell__body">
        <Header showBrand={isMobile} />
        {showLocationPrompt && (
          <div className="location-prompt-banner">
            <div className="location-prompt-banner__content">
              <MapPin size={18} className="location-prompt-banner__icon" />
              <div>
                <strong>נדרש אישור מיקום</strong>
                <p>GreenPath צריך גישה למיקומך כדי לאמת שאתה נמצא במפעל בעת קליטת חומרים.</p>
              </div>
            </div>
            <button
              className="btn-primary btn-primary--sm"
              onClick={() => dispatch(activateWatcher())}
            >
              אפשר מיקום
            </button>
          </div>
        )}
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
