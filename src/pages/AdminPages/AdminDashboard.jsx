import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Users, BarChart3, HeadphonesIcon, RefreshCw } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchFactories } from '../../store/slices/factoriesSlice';
import useRelativeTime from '../../hooks/useRelativeTime';

const QUICK_LINKS = [
  { to: '/admin/factories', icon: Building2,       label: 'Factories',  desc: 'Create and manage recycling factories' },
  { to: '/admin/users',     icon: Users,           label: 'Users',      desc: 'Manage managers and employees' },
  { to: '/admin/reports',   icon: BarChart3,       label: 'Reports',    desc: 'Platform-wide credit reports' },
  { to: '/admin/support',   icon: HeadphonesIcon,  label: 'Support',    desc: 'Handle factory support requests' },
];

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const { user }                    = useSelector((state) => state.auth);
  const { list: factories, loading, lastFetched } = useSelector((state) => state.factories);
  const refreshedLabel = useRelativeTime(lastFetched);

  useEffect(() => {
    dispatch(fetchFactories());
  }, [dispatch]);

  const activeFactories  = factories.filter((f) => f.status === 'active').length;
  const totalActiveUsers = factories.reduce((sum, f) => sum + parseInt(f.active_user_count || 0), 0);

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <div>
          <h1>Platform Overview</h1>
          <p className="dashboard__subtitle">Internal Admin · {user?.full_name}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="refresh-group">
            {refreshedLabel && <span className="last-refreshed">{refreshedLabel}</span>}
            <button
              className="btn-ghost btn-ghost--icon"
              title="Refresh"
              disabled={loading}
              onClick={() => dispatch(fetchFactories({ force: true }))}
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>
          </div>
          <span className="badge badge--admin">Internal Admin</span>
        </div>
      </div>

      <div className="dashboard__kpis">
        <div className="kpi-card">
          <span className="kpi-card__label">Active Factories</span>
          <span className="kpi-card__value">{loading ? '…' : activeFactories}</span>
          <span className="kpi-card__hint">of {factories.length} total</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-card__label">Active Users</span>
          <span className="kpi-card__value">{loading ? '…' : totalActiveUsers}</span>
          <span className="kpi-card__hint">across all factories</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-card__label">Credits Issued (All)</span>
          <span className="kpi-card__value">—</span>
          <span className="kpi-card__hint">Available after shipments module</span>
        </div>
        <div className="kpi-card kpi-card--warn">
          <span className="kpi-card__label">Open Flags</span>
          <span className="kpi-card__value">—</span>
          <span className="kpi-card__hint">Available after flags module</span>
        </div>
      </div>

      <h2 className="dashboard__section-title">Admin Actions</h2>
      <div className="dashboard__links">
        {QUICK_LINKS.map(({ to, icon: Icon, label, desc }) => (
          <Link key={to} to={to} className="quick-link">
            <div className="quick-link__icon quick-link__icon--admin"><Icon size={20} /></div>
            <div>
              <p className="quick-link__label">{label}</p>
              <p className="quick-link__desc">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
