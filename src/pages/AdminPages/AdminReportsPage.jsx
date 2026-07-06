import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, Award, Building2, Package, Scale, AlertCircle, RefreshCw, Download } from 'lucide-react';
import { fetchReportSummary, fetchReportFactories, clearReports } from '../../store/slices/reportsSlice';
import { downloadCreditsCSV } from '../../api/reports';

const fmtKg  = (n) => n != null ? `${parseFloat(n).toLocaleString('he-IL', { maximumFractionDigits: 1 })} ק"ג` : '—';
const fmtNum = (n) => n != null ? parseInt(n).toLocaleString() : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—';

const QUICK_RANGES = [
  { label: 'החודש',       getRange: () => { const n = new Date(); return { from: new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split('T')[0], to: n.toISOString().split('T')[0] }; } },
  { label: '3 חודשים אחרונים', getRange: () => { const n = new Date(); const f = new Date(n); f.setMonth(f.getMonth() - 3); return { from: f.toISOString().split('T')[0], to: n.toISOString().split('T')[0] }; } },
  { label: 'השנה',        getRange: () => { const n = new Date(); return { from: `${n.getFullYear()}-01-01`, to: n.toISOString().split('T')[0] }; } },
  { label: 'כל הזמן',    getRange: () => ({ from: '', to: '' }) },
];

const KpiCard = ({ icon: Icon, label, value, hint, variant }) => (
  <div className={`report-kpi${variant ? ` report-kpi--${variant}` : ''}`}>
    <div className="report-kpi__icon"><Icon size={20} /></div>
    <div>
      <p className="report-kpi__value">{value ?? '—'}</p>
      <p className="report-kpi__label">{label}</p>
      {hint && <p className="report-kpi__hint">{hint}</p>}
    </div>
  </div>
);

const AdminReportsPage = () => {
  const dispatch = useDispatch();
  const { summary, summaryLoading, factories, factoriesLoading, error } = useSelector((s) => s.reports);

  const [activeRange, setActiveRange]   = useState(3);
  const [from, setFrom]                 = useState('');
  const [to, setTo]                     = useState('');
  const [customActive, setCustomActive] = useState(false);
  const [exporting, setExporting]       = useState(false);
  const [searchParams] = useSearchParams();
  const [factoryFilter, setFactoryFilter] = useState(() => searchParams.get('factory_id') || '');

  const fetchAll = useCallback((params) => {
    dispatch(fetchReportSummary(params));
    dispatch(fetchReportFactories(params));
  }, [dispatch]);

  useEffect(() => {
    fetchAll({});
    return () => { dispatch(clearReports()); };
  }, []);

  const applyQuick = (idx) => {
    setActiveRange(idx); setCustomActive(false);
    const { from: f, to: t } = QUICK_RANGES[idx].getRange();
    setFrom(f); setTo(t);
    fetchAll({ from: f || undefined, to: t || undefined });
  };

  const applyCustom = () => {
    setActiveRange(-1); setCustomActive(false);
    fetchAll({ from: from || undefined, to: to || undefined });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const resp = await downloadCreditsCSV({ from: from || undefined, to: to || undefined });
      const url  = URL.createObjectURL(new Blob([resp.data], { type: 'text/csv' }));
      const a    = document.createElement('a');
      a.href = url;
      a.download = `aterum-platform-credits-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* silent */ } finally { setExporting(false); }
  };

  const loading = summaryLoading || factoriesLoading;
  const filteredFactories = factoryFilter
    ? factories.filter((f) => String(f.factory_id) === String(factoryFilter))
    : factories;
  const maxFactoryKg = filteredFactories.length ? Math.max(...filteredFactories.map((f) => parseFloat(f.total_credits_kg || 0))) : 1;

  const selectedFactory = factoryFilter ? filteredFactories[0] : null;
  const kpiCredits     = selectedFactory ? selectedFactory.total_credits_kg       : summary?.total_credits_kg;
  const kpiIntake      = selectedFactory ? selectedFactory.total_eligible_input_kg : summary?.total_intake_kg;
  const kpiBalance     = selectedFactory ? selectedFactory.remaining_balance_kg   : summary?.remaining_balance_kg;
  const kpiCreditsCount = selectedFactory ? selectedFactory.credits_count          : summary?.credits_count;
  const kpiIntakesCount = selectedFactory ? selectedFactory.intakes_count          : summary?.intakes_count;
  const kpiFactoriesCount = selectedFactory ? '1' : fmtNum(factories.length);

  return (
    <div className="admin-page reports-page">
      <div className="admin-page__header">
        <div>
          <h1>דוחות פלטפורמה</h1>
          <p className="page-subtitle">קרדיטים ופעילות בכלל המפעלים</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn-ghost btn-ghost--icon" onClick={() => applyQuick(activeRange)} disabled={loading} title="רענן">
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>
          <button className="btn-primary btn-primary--sm" onClick={handleExport} disabled={exporting}>
            <Download size={15} /> {exporting ? 'מייצא…' : 'ייצוא CSV'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert--error"><AlertCircle size={15} />{error}</div>}

      {/* ── Date range bar ─────────────────────────────────────────────── */}
      <div className="reports-date-bar">
        <div className="reports-quick-btns">
          {QUICK_RANGES.map((r, i) => (
            <button
              key={r.label}
              className={`reports-quick-btn${activeRange === i && !customActive ? ' reports-quick-btn--active' : ''}`}
              onClick={() => applyQuick(i)}
            >
              {r.label}
            </button>
          ))}
          <button
            className={`reports-quick-btn${customActive ? ' reports-quick-btn--active' : ''}`}
            onClick={() => setCustomActive((v) => !v)}
          >
            טווח מותאם
          </button>
        </div>

        {customActive && (
          <div className="reports-custom-range">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} max={to || undefined} />
            <span>→</span>
            <input type="date" value={to}   onChange={(e) => setTo(e.target.value)}   min={from || undefined} />
            <button className="btn-primary btn-primary--sm" onClick={applyCustom} disabled={!from && !to}>החל</button>
          </div>
        )}
      </div>

      {/* ── Platform KPI cards ─────────────────────────────────────────── */}
      <div className="reports-kpi-grid">
        <KpiCard icon={Award}     label="סה״כ קרדיטים"        value={loading ? '…' : fmtKg(kpiCredits)}     variant="primary" hint={`${fmtNum(kpiCreditsCount)} רשומות`} />
        <KpiCard icon={Package}   label="סה״כ משקל קליטה"     value={loading ? '…' : fmtKg(kpiIntake)}      hint={`${fmtNum(kpiIntakesCount)} קליטות`} />
        <KpiCard icon={Building2} label={selectedFactory ? 'מפעל נבחר' : 'מפעלים פעילים'} value={loading ? '…' : kpiFactoriesCount} hint={selectedFactory ? selectedFactory.factory_name : 'עם קרדיטים שהונפקו'} />
        <KpiCard icon={Scale}     label="יתרה"               value={loading ? '…' : fmtKg(kpiBalance)}     hint="חומר גלם זכאי שלא נוצל" />
      </div>

      {/* ── Per-factory breakdown ──────────────────────────────────────── */}
      <div className="reports-section">
        <div className="reports-section__header">
          <h3 className="reports-section__title">פירוט לפי מפעל</h3>
          {factories.length > 0 && (
            <select
              className="reports-factory-filter"
              value={factoryFilter}
              onChange={(e) => setFactoryFilter(e.target.value)}
            >
              <option value="">כל המפעלים</option>
              {factories.map((f) => (
                <option key={f.factory_id} value={f.factory_id}>{f.factory_name}</option>
              ))}
            </select>
          )}
        </div>
        {factoriesLoading && <div className="loading-row">טוען…</div>}
        {!factoriesLoading && factories.length === 0 && (
          <p className="reports-empty">אין נתוני מפעל זמינים.</p>
        )}
        {!factoriesLoading && filteredFactories.length === 0 && factories.length > 0 && (
          <p className="reports-empty">אין נתונים למפעל הנבחר.</p>
        )}
        {!factoriesLoading && filteredFactories.length > 0 && (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>מפעל</th>
                  <th>כתובת</th>
                  <th>סה״כ קרדיטים</th>
                  <th>תפעולי</th>
                  <th>חומר גלם זכאי</th>
                  <th>יתרה</th>
                  <th>קליטות</th>
                  <th>רשומות</th>
                  <th>פעילות</th>
                </tr>
              </thead>
              <tbody>
                {filteredFactories.map((f) => {
                  const pct = maxFactoryKg > 0 ? (parseFloat(f.total_credits_kg) / maxFactoryKg) * 100 : 0;
                  const balanceNeg = parseFloat(f.remaining_balance_kg) < 0;
                  return (
                    <tr key={f.factory_id}>
                      <td className="td-primary">{f.factory_name}</td>
                      <td className="td-muted" style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.address || '—'}</td>
                      <td><strong>{fmtKg(f.total_credits_kg)}</strong></td>
                      <td className="td-muted">{fmtKg(f.operational_kg)}</td>
                      <td className="td-muted">{fmtKg(f.total_eligible_input_kg)}</td>
                      <td className={balanceNeg ? 'td-error' : 'td-muted'}>{fmtKg(f.remaining_balance_kg)}</td>
                      <td className="td-muted">{fmtNum(f.intakes_count)}</td>
                      <td className="td-muted">{fmtNum(f.credits_count)}</td>
                      <td>
                        <div className="factory-activity-bar">
                          <div className="factory-activity-bar__fill" style={{ width: `${pct.toFixed(1)}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReportsPage;
