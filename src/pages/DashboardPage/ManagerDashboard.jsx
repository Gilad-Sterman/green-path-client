import { Package, Layers, Truck, Award, Flag, Users } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

const QUICK_LINKS = [
  { to: '/intakes',   icon: Package, label: 'Intakes',   desc: 'Record raw material intake' },
  { to: '/batches',   icon: Layers,  label: 'Batches',   desc: 'Manage production batches' },
  { to: '/shipments', icon: Truck,   label: 'Shipments', desc: 'Create shipments & credits' },
  { to: '/credits',   icon: Award,   label: 'Credits',   desc: 'View credits ledger' },
  { to: '/suppliers', icon: Users,   label: 'Suppliers', desc: 'Manage suppliers' },
  { to: '/flags',     icon: Flag,    label: 'Flags',     desc: 'Review anomalies' },
];

const ManagerDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const firstName = user?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <div>
          <h1>Welcome back, {firstName}</h1>
          <p className="dashboard__subtitle">
            {user?.factory_name || 'Factory'} · Manager Portal
          </p>
        </div>
      </div>

      <div className="dashboard__kpis">
        <div className="kpi-card">
          <span className="kpi-card__label">Total Intakes</span>
          <span className="kpi-card__value">—</span>
          <span className="kpi-card__hint">Coming soon</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-card__label">Active Batches</span>
          <span className="kpi-card__value">—</span>
          <span className="kpi-card__hint">Coming soon</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-card__label">Credits Issued</span>
          <span className="kpi-card__value">—</span>
          <span className="kpi-card__hint">Coming soon</span>
        </div>
        <div className="kpi-card kpi-card--warn">
          <span className="kpi-card__label">Open Flags</span>
          <span className="kpi-card__value">—</span>
          <span className="kpi-card__hint">Coming soon</span>
        </div>
      </div>

      <h2 className="dashboard__section-title">Quick Access</h2>
      <div className="dashboard__links">
        {QUICK_LINKS.map(({ to, icon: Icon, label, desc }) => (
          <Link key={to} to={to} className="quick-link">
            <div className="quick-link__icon"><Icon size={20} /></div>
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

export default ManagerDashboard;
