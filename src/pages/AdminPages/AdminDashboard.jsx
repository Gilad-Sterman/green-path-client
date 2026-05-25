import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Users, BarChart3, HeadphonesIcon, RefreshCw, AlertTriangle, Check } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchFactories } from '../../store/slices/factoriesSlice';
import { fetchCreditsSummary } from '../../store/slices/creditsSlice';
import { fetchFlagsSummary } from '../../store/slices/flagsSlice';
import useRelativeTime from '../../hooks/useRelativeTime';

const DATE_PERIODS = [
  { key: 'day', label: 'יום אחרון' },
  { key: 'week', label: 'שבוע אחרון' },
  { key: 'month', label: 'חודש אחרון' },
  { key: 'all', label: 'כל הזמן' },
];

const getDateFrom = (period) => {
  const ms = 86400000;
  if (period === 'day') return new Date(Date.now() - ms).toISOString();
  if (period === 'week') return new Date(Date.now() - 7 * ms).toISOString();
  if (period === 'month') return new Date(Date.now() - 30 * ms).toISOString();
  return null;
};

const fmtKg = (n) =>
  n != null ? `${parseFloat(n).toLocaleString('he-IL', { maximumFractionDigits: 0 })} ק"ג` : '—';

const QUICK_LINKS = [
  { to: '/admin/factories', icon: Building2, label: 'מפעלים', desc: 'ניהול מפעלי המיחזור' },
  { to: '/admin/users', icon: Users, label: 'משתמשים', desc: 'ניהול מנהלים ועובדים' },
  { to: '/admin/reports', icon: BarChart3, label: 'דוחות', desc: 'דוחות קרדיטים כלל-מערכתיים' },
  { to: '/admin/support', icon: HeadphonesIcon, label: 'תמיכה', desc: 'פניות תמיכה ממפעלים' },
];

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { list: factories, loading, lastFetched } = useSelector((s) => s.factories);
  const { summary: creditsSummary, summaryLoading: creditsLoading } = useSelector((s) => s.credits);
  const { summary: flagsSummary } = useSelector((s) => s.flags);
  const refreshedLabel = useRelativeTime(lastFetched);

  const [activeTab, setActiveTab] = useState('factories');
  const [datePeriod, setDatePeriod] = useState('all');

  useEffect(() => {
    dispatch(fetchFactories());
  }, [dispatch]);

  useEffect(() => {
    const date_from = getDateFrom(datePeriod);
    const params = date_from ? { date_from } : {};
    dispatch(fetchCreditsSummary(params));
    dispatch(fetchFlagsSummary(params));
  }, [datePeriod, dispatch]);

  const handleRefresh = () => {
    dispatch(fetchFactories({ force: true }));
    const date_from = getDateFrom(datePeriod);
    const params = date_from ? { date_from } : {};
    dispatch(fetchCreditsSummary(params));
    dispatch(fetchFlagsSummary(params));
  };

  // ── מפעלים tab KPIs (derived from factory list = current state) ────────────
  const totalFactories = factories.length;
  const activeFactories = factories.filter((f) => f.status === 'active').length;
  const suspendedFactories = factories.filter((f) => f.status === 'suspended').length;
  const totalEmployees = factories.reduce((s, f) => s + parseInt(f.employee_count || 0), 0);
  const totalManagers = factories.reduce((s, f) => s + parseInt(f.manager_count || 0), 0);

  // ── דגלים tab KPIs (date-filtered from backend) ───────────────────────────
  const totalCreditsKg = creditsSummary?.total_credits_kg ?? null;
  const totalEligibleKg = creditsSummary?.total_eligible_input_kg ?? null;
  const openFlags = flagsSummary?.open ?? null;
  const resolvedFlags = (flagsSummary?.resolved ?? 0) + (flagsSummary?.dismissed ?? 0);
  const totalFlags = flagsSummary?.total ?? null;

  return (
    <div className="dashboard">

      <div className="dashboard__header">
        <div>
          <h1>מטריקות</h1>
          <p className="dashboard__subtitle">מנהל מערכת · {user?.full_name}</p>
        </div>
        <div className="dashboard__header-actions">
          <div className="refresh-group">
            {refreshedLabel && <span className="last-refreshed">{refreshedLabel}</span>}
            <button
              className="btn-ghost btn-ghost--icon"
              title="רענן"
              disabled={loading}
              onClick={handleRefresh}
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard__date-filter">
        {DATE_PERIODS.map(({ key, label }) => (
          <button
            key={key}
            className={`date-filter-btn${datePeriod === key ? ' date-filter-btn--active' : ''}`}
            onClick={() => setDatePeriod(key)}
          >
            {label}
            {key === datePeriod && <span className="date-filter-btn__active-indicator"><Check size={16} /></span>}
          </button>
        ))}
      </div>

      <div className="dashboard__tabs">
        <button
          className={`dashboard__tab${activeTab === 'factories' ? ' dashboard__tab--active' : ''}`}
          onClick={() => setActiveTab('factories')}
        >
          מפעלים
          {activeTab === 'factories' && <span className="dashboard__tab__active-indicator"><Check size={16} /></span>}
        </button>
        <button
          className={`dashboard__tab${activeTab === 'flags' ? ' dashboard__tab--active' : ''}`}
          onClick={() => setActiveTab('flags')}
        >
          דגלים
          {activeTab === 'flags' && <span className="dashboard__tab__active-indicator"><Check size={16} /></span>}
        </button>
      </div>

      {activeTab === 'factories' && (
        <>
          <div className="dashboard__kpis">
            <div className="kpi-card">
              <span className="kpi-card__value">{loading ? '…' : totalFactories}</span>
              <span className="kpi-card__label">סה״כ מפעלים</span>
              <span className="kpi-card__hint">{loading ? '…' : activeFactories} פעילים</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-card__value">{loading ? '…' : totalEmployees}</span>
              <span className="kpi-card__label">סה״כ עובדים</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-card__value">{loading ? '…' : totalManagers}</span>
              <span className="kpi-card__label">סה״כ מנהלים</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-card__value">{creditsLoading ? '…' : fmtKg(totalEligibleKg)}</span>
              <span className="kpi-card__label">סה"כ ק"ג זכאי</span>
              <span className="kpi-card__hint">חומר גלם שנקלט</span>
            </div>
          </div>
        </>
      )}

      {activeTab === 'flags' && (
        <>
          <p className="dashboard__section-title">חומרים וקרדיטים</p>
          <div className="dashboard__kpis">
            <div className="kpi-card">
              <span className="kpi-card__label">סה"כ קרדיטים</span>
              <span className="kpi-card__value">{creditsLoading ? '…' : fmtKg(totalCreditsKg)}</span>
              <span className="kpi-card__hint">קרדיטים שהונפקו</span>
            </div>
          </div>

          <p className="dashboard__section-title">דגלים</p>
          <div className="dashboard__kpis">
            <div className="kpi-card">
              <span className="kpi-card__label">סה"כ דגלים</span>
              <span className="kpi-card__value">{totalFlags === null ? '…' : totalFlags}</span>
              <span className="kpi-card__hint">בטווח שנבחר</span>
            </div>
            <Link
              to="/admin/flags"
              className={`kpi-card kpi-card--link${openFlags > 0 ? ' kpi-card--warn' : ''}`}
            >
              <span className="kpi-card__label">מחכים לפתרון</span>
              <span className="kpi-card__value">{openFlags === null ? '…' : openFlags}</span>
              <span className="kpi-card__hint">{openFlags > 0 ? 'דורש טיפול' : 'הכל תקין'}</span>
            </Link>
            <div className="kpi-card">
              <span className="kpi-card__label">פתורים</span>
              <span className="kpi-card__value">{resolvedFlags}</span>
              <span className="kpi-card__hint">נסגרו או בוטלו</span>
            </div>
          </div>
        </>
      )}

      {/* <h2 className="dashboard__section-title">פעולות מנהל</h2> */}
      {/* <div className="dashboard__links">
        {QUICK_LINKS.map(({ to, icon: Icon, label, desc }) => (
          <Link key={to} to={to} className="quick-link">
            <div className="quick-link__icon quick-link__icon--admin"><Icon size={20} /></div>
            <div>
              <p className="quick-link__label">{label}</p>
              <p className="quick-link__desc">{desc}</p>
            </div>
          </Link>
        ))}
      </div> */}

    </div>
  );
};

export default AdminDashboard;
