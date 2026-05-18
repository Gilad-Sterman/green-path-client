import { useEffect } from 'react';
import { Package, Layers, Truck, Award, Flag, Users } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchIntakes }        from '../../store/slices/intakesSlice';
import { fetchBatches }        from '../../store/slices/batchesSlice';
import { fetchCreditsSummary } from '../../store/slices/creditsSlice';
import { fetchFlagsSummary }   from '../../store/slices/flagsSlice';

const QUICK_LINKS = [
  { to: '/intakes',   icon: Package, label: 'Intakes',   desc: 'Record raw material intake' },
  { to: '/batches',   icon: Layers,  label: 'Batches',   desc: 'Manage production batches' },
  { to: '/shipments', icon: Truck,   label: 'Shipments', desc: 'Create shipments & credits' },
  { to: '/credits',   icon: Award,   label: 'Credits',   desc: 'View credits ledger' },
  { to: '/suppliers', icon: Users,   label: 'Suppliers', desc: 'Manage suppliers' },
  { to: '/flags',     icon: Flag,    label: 'Flags',     desc: 'Review anomalies' },
];

const fmtKg = (n) =>
  n != null
    ? `${parseFloat(n).toLocaleString(undefined, { maximumFractionDigits: 0 })} kg`
    : '—';

const ManagerDashboard = () => {
  const dispatch  = useDispatch();
  const { user }  = useSelector((s) => s.auth);
  const firstName = user?.full_name?.split(' ')[0] || 'there';

  const { list: intakes,  loading: intakesLoading }  = useSelector((s) => s.intakes);
  const { list: batches,  loading: batchesLoading }  = useSelector((s) => s.batches);
  const { summary: creditsSummary, summaryLoading }  = useSelector((s) => s.credits);
  const { summary: flagsSummary }                    = useSelector((s) => s.flags);

  useEffect(() => {
    dispatch(fetchIntakes());
    dispatch(fetchBatches({ force: false }));
    dispatch(fetchCreditsSummary());
    dispatch(fetchFlagsSummary());
  }, [dispatch]);

  const activeBatches = batches.filter((b) => b.status === 'in_progress').length;
  const openFlags     = flagsSummary?.open ?? null;

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
          <span className="kpi-card__value">
            {intakesLoading ? '…' : intakes.length}
          </span>
          <span className="kpi-card__hint">Raw material records</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-card__label">Active Batches</span>
          <span className="kpi-card__value">
            {batchesLoading ? '…' : activeBatches}
          </span>
          <span className="kpi-card__hint">In progress</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-card__label">Credits Issued</span>
          <span className="kpi-card__value">
            {summaryLoading ? '…' : fmtKg(creditsSummary?.total_credits_kg)}
          </span>
          <span className="kpi-card__hint">
            {creditsSummary
              ? `${fmtKg(creditsSummary.remaining_balance_kg)} remaining`
              : 'Eligible output'}
          </span>
        </div>

        <Link to="/flags" className={`kpi-card kpi-card--link${openFlags > 0 ? ' kpi-card--warn' : ''}`}>
          <span className="kpi-card__label">Open Flags</span>
          <span className="kpi-card__value">
            {openFlags === null ? '…' : openFlags}
          </span>
          <span className="kpi-card__hint">
            {openFlags > 0 ? 'Requires attention' : 'All clear'}
          </span>
        </Link>
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
