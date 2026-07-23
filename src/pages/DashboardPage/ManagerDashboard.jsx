import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Layers, Truck, Award, Flag, Users, Box,
  Building2, BarChart3, Users2, AlertTriangle,
  Plus, Settings,
} from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchIntakes } from '../../store/slices/intakesSlice';
import { fetchBatches } from '../../store/slices/batchesSlice';
import { fetchCreditsSummary } from '../../store/slices/creditsSlice';
import { fetchFlagsSummary } from '../../store/slices/flagsSlice';

const PERIODS = [
  { key: 'day', label: 'יום' },
  { key: 'week', label: 'שבוע' },
  { key: 'month', label: 'חודש' },
  { key: 'year', label: 'השנה' },
  { key: 'custom', label: 'טווח מותאם' },
];

const MGMT_TILES = [
  { to: '/suppliers', icon: Building2, label: 'הגדרת ספקים ולקוחות' },
  { to: '/intakes', icon: Package, label: 'ניהול כניסות' },
  { to: '/batches', icon: Layers, label: 'ניהול אצוות' },
  { to: '/products', icon: Box, label: 'הגדרת תוצ"ג' },
  { to: '/shipments', icon: Truck, label: 'משלוחים' },
  // { to: '/credits', icon: Award, label: 'קרדיטים' },
  // { to: '/reports', icon: BarChart3, label: 'דו"ח' },
  { to: '/retro-intake', icon: Flag, label: 'העלאת נתוני הסמכה (רטרו)' },
  { to: '/settings', icon: Settings, label: 'הגדרות' },
];

const getPeriodStart = (p) => {
  if (p === 'day') return new Date(new Date().setHours(0, 0, 0, 0));
  if (p === 'week') return new Date(Date.now() - 7 * 86400000);
  if (p === 'month') return new Date(Date.now() - 30 * 86400000);
  if (p === 'year') return new Date(new Date().getFullYear(), 0, 1);
  return new Date(Date.now() - 30 * 86400000);
};

const fmtKg = (n) =>
  n > 0
    ? `${n.toLocaleString('he-IL', { maximumFractionDigits: 0 })} ק"ג`
    : '0 ק"ג';

const ManagerDashboard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);

  const { list: intakes, loading: intakesLoading } = useSelector((s) => s.intakes);
  const { list: batches, loading: batchesLoading } = useSelector((s) => s.batches);
  const { summary: creditsSummary, summaryLoading } = useSelector((s) => s.credits);
  const { summary: flagsSummary } = useSelector((s) => s.flags);

  const [period, setPeriod] = useState('day');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo] = useState('');

  useEffect(() => {
    dispatch(fetchIntakes());
    dispatch(fetchBatches({ force: false }));
    dispatch(fetchFlagsSummary());
  }, [dispatch]);

  const isCustom = period === 'custom';

  useEffect(() => {
    if (isCustom && !(appliedFrom && appliedTo)) return; // wait for Apply
    dispatch(fetchCreditsSummary(
      isCustom
        ? { date_from: effectiveFrom.toISOString(), date_to: effectiveTo.toISOString() }
        : { date_from: getPeriodStart(period).toISOString() }
    ));
  }, [dispatch, period, isCustom, appliedFrom, appliedTo]);

  const openFlags = flagsSummary?.open ?? null;

  const effectiveFrom = isCustom && appliedFrom
    ? new Date(appliedFrom)
    : getPeriodStart(period);
  const effectiveTo = isCustom && appliedTo
    ? new Date(new Date(appliedTo).setHours(23, 59, 59, 999))
    : new Date();

  const batchesInPeriod = batches.filter((b) => {
    const d = new Date(b.created_at);
    return d >= effectiveFrom && d <= effectiveTo;
  }).length;
  const intakeWeightInPeriod = intakes
    .filter((i) => {
      const d = new Date(i.created_at);
      return d >= effectiveFrom && d <= effectiveTo;
    })
    .reduce((s, i) => s + parseFloat(i.eligible_weight_kg || 0), 0);

  const isLoading = intakesLoading || batchesLoading;

  return (
    <div className="mgr-dashboard">

      <div className="mgr-dashboard__header">
        <div>
          <h1>לוח בקרה</h1>
          <p className="mgr-dashboard__subtitle">
            {user?.factory_name || 'המפעל'} · {user?.full_name}
          </p>
        </div>
        {openFlags > 0 && (
          <Link to="/flags" className="mgr-flags-alert">
            <AlertTriangle size={14} />
            {openFlags} דגלים פתוחים
          </Link>
        )}
      </div>

      <p className="mgr-section-title">פעולות ייצור</p>
      <div className="production-actions">
        <Link to="/intakes/new" className="prod-action prod-action">
          <div className="prod-action__icon"><Plus size={22} /></div>
          <div>
            <p className="prod-action__title">קליטת חומר למחסן</p>
          </div>
        </Link>
        <Link to="/batches?new=1" className="prod-action">
          <div className="prod-action__icon"><Plus size={22} /></div>
          <div>
            <p className="prod-action__title">יצירת אצוות מוצר</p>
          </div>
        </Link>
        <Link to="/shipments?new=1" className="prod-action">
          <div className="prod-action__icon"><Plus size={22} /></div>
          <div>
            <p className="prod-action__title">יצירת משלוח ללקוח</p>
          </div>
        </Link>
      </div>

      <p className="mgr-section-title">פעולות ניהול</p>
      <div className="mgmt-grid">
        {MGMT_TILES.map(({ to, icon: Icon, label }) => (
          <Link key={to} to={to} className="mgmt-tile">
            {/* <div className="mgmt-tile__icon"><Icon size={18} /></div> */}
            <span className="mgmt-tile__label">{label}</span>
          </Link>
        ))}
      </div>

      <div className="mgr-summary__header">
        <p className="mgr-section-title">סיכום {PERIODS.find(p => p.key === period)?.label}</p>
        <div className="period-tabs">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              className={`period-tab${period === key ? ' period-tab--active' : ''}`}
              onClick={() => setPeriod(key)}
            >
              {label}
            </button>
          ))}
        </div>
        {isCustom && (
          <div className="custom-date-range">
            <label>
              מתאריך
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            </label>
            <label>
              עד תאריך
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </label>
            <button
              type="button"
              className="custom-date-range__apply"
              disabled={!customFrom || !customTo}
              onClick={() => { setAppliedFrom(customFrom); setAppliedTo(customTo); }}
            >
              החל
            </button>
          </div>
        )}
      </div>

      <div className="dashboard__kpis">
        <div className="kpi-card">
          <span className="kpi-card__label">אצוות שנוצרו</span>
          <span className="kpi-card__value">{isLoading ? '…' : batchesInPeriod}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-card__label">חומר גלם שנקלט</span>
          <span className="kpi-card__value">{isLoading ? '…' : fmtKg(intakeWeightInPeriod)}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-card__label">משקל משלוחים זכאי</span>
          <span className="kpi-card__value">
            {summaryLoading ? '…' : fmtKg(parseFloat(creditsSummary?.total_credits_kg || 0))}
          </span>
        </div>
        <Link to="/flags" className={`kpi-card kpi-card--link`}>
          <span className="kpi-card__label">דגלים פתוחים</span>
          <span className="kpi-card__value underline">{openFlags === null ? '…' : openFlags} דגלים פתוחים</span>
        </Link>
      </div>
    </div>
  );
};

export default ManagerDashboard;
