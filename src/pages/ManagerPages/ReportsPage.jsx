import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BarChart3, Download, Award, Package, Truck, Scale, AlertCircle, RefreshCw } from 'lucide-react';
import { fetchReportSummary, fetchReportMonthly, fetchReportByType, clearReports } from '../../store/slices/reportsSlice';
import { downloadCreditsCSV } from '../../api/reports';

const fmtKg   = (n) => n != null ? `${parseFloat(n).toLocaleString(undefined, { maximumFractionDigits: 1 })} kg` : '—';
const fmtNum  = (n) => n != null ? parseInt(n).toLocaleString() : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—';

const QUICK_RANGES = [
  { label: 'This month',   getRange: () => { const n = new Date(); return { from: new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split('T')[0], to: n.toISOString().split('T')[0] }; } },
  { label: 'Last 3 months', getRange: () => { const n = new Date(); const f = new Date(n); f.setMonth(f.getMonth() - 3); return { from: f.toISOString().split('T')[0], to: n.toISOString().split('T')[0] }; } },
  { label: 'This year',    getRange: () => { const n = new Date(); return { from: `${n.getFullYear()}-01-01`, to: n.toISOString().split('T')[0] }; } },
  { label: 'All time',     getRange: () => ({ from: '', to: '' }) },
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

const MATERIAL_COLORS = {
  plastic: '#4caf50', paper: '#2196f3', metal: '#ff9800',
  glass: '#9c27b0', textile: '#e91e63', rubber: '#795548',
  mixed: '#607d8b', other: '#9e9e9e',
};

const ReportsPage = () => {
  const dispatch = useDispatch();
  const { summary, summaryLoading, monthly, monthlyLoading, byType, byTypeLoading, error } =
    useSelector((s) => s.reports);

  const [activeRange, setActiveRange]   = useState(1);
  const [from, setFrom]                 = useState('');
  const [to, setTo]                     = useState('');
  const [customActive, setCustomActive] = useState(false);
  const [exporting, setExporting]       = useState(false);
  const [exportError, setExportError]   = useState('');

  const fetchAll = useCallback((params) => {
    dispatch(fetchReportSummary(params));
    dispatch(fetchReportMonthly(params));
    dispatch(fetchReportByType(params));
  }, [dispatch]);

  useEffect(() => {
    const { from: f, to: t } = QUICK_RANGES[activeRange].getRange();
    setFrom(f); setTo(t); setCustomActive(false);
    fetchAll({ from: f || undefined, to: t || undefined });
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
    setExporting(true); setExportError('');
    try {
      const resp = await downloadCreditsCSV({ from: from || undefined, to: to || undefined });
      const url  = URL.createObjectURL(new Blob([resp.data], { type: 'text/csv' }));
      const a    = document.createElement('a');
      a.href = url;
      a.download = `greenpath-credits-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const maxTypeKg = byType.length ? Math.max(...byType.map((t) => parseFloat(t.total_kg))) : 1;

  const loading = summaryLoading || monthlyLoading || byTypeLoading;

  return (
    <div className="manager-page reports-page">
      <div className="manager-page__header">
        <div>
          <h1>Reports</h1>
          <p className="page-subtitle">Credits, intakes and shipments summary</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn-ghost btn-ghost--icon" onClick={() => applyQuick(activeRange)} title="Refresh" disabled={loading}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>
          <button className="btn-primary btn-primary--sm" onClick={handleExport} disabled={exporting}>
            <Download size={15} /> {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {(error || exportError) && (
        <div className="alert alert--error"><AlertCircle size={15} />{error || exportError}</div>
      )}

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
            Custom
          </button>
        </div>

        {customActive && (
          <div className="reports-custom-range">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} max={to || undefined} />
            <span>→</span>
            <input type="date" value={to}   onChange={(e) => setTo(e.target.value)}   min={from || undefined} />
            <button className="btn-primary btn-primary--sm" onClick={applyCustom} disabled={!from && !to}>Apply</button>
          </div>
        )}
      </div>

      {/* ── KPI cards ──────────────────────────────────────────────────── */}
      <div className="reports-kpi-grid">
        <KpiCard icon={Award}   label="Credits Issued"   value={summaryLoading ? '…' : fmtKg(summary?.total_credits_kg)}   variant="primary" hint={`${fmtNum(summary?.credits_count)} credit entries`} />
        <KpiCard icon={Package} label="Total Intake"     value={summaryLoading ? '…' : fmtKg(summary?.total_intake_kg)}    hint={`${fmtNum(summary?.intakes_count)} intakes`} />
        <KpiCard icon={Truck}   label="Shipments"        value={summaryLoading ? '…' : fmtNum(summary?.shipments_count)}   hint="In selected period" />
        <KpiCard icon={Scale}   label="Remaining Balance" value={summaryLoading ? '…' : fmtKg(summary?.remaining_balance_kg)} hint="Eligible input unused" variant={summary && parseFloat(summary.remaining_balance_kg) < 0 ? 'warn' : undefined} />
      </div>

      <div className="reports-grid">
        {/* ── Monthly trend ──────────────────────────────────────────── */}
        <div className="reports-section">
          <h3 className="reports-section__title">Monthly Credits</h3>
          {monthlyLoading && <div className="loading-row">Loading…</div>}
          {!monthlyLoading && monthly.length === 0 && (
            <p className="reports-empty">No credits in this period.</p>
          )}
          {!monthlyLoading && monthly.length > 0 && (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Total</th>
                    <th>Operational</th>
                    <th>Retroactive</th>
                    <th>Entries</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((m) => (
                    <tr key={m.month}>
                      <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(m.month + '-01')}</td>
                      <td><strong>{fmtKg(m.total_kg)}</strong></td>
                      <td className="td-muted">{fmtKg(m.operational_kg)}</td>
                      <td className="td-muted">{fmtKg(m.retroactive_kg)}</td>
                      <td className="td-muted">{m.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Intakes by material type ───────────────────────────────── */}
        <div className="reports-section">
          <h3 className="reports-section__title">Intakes by Material Type</h3>
          {byTypeLoading && <div className="loading-row">Loading…</div>}
          {!byTypeLoading && byType.length === 0 && (
            <p className="reports-empty">No intakes in this period.</p>
          )}
          {!byTypeLoading && byType.length > 0 && (
            <div className="reports-type-chart">
              {byType.map((t) => {
                const pct = maxTypeKg > 0 ? (parseFloat(t.total_kg) / maxTypeKg) * 100 : 0;
                return (
                  <div key={t.material_type} className="reports-type-row">
                    <span className="reports-type-label">{t.material_type}</span>
                    <div className="reports-type-bar-wrap">
                      <div
                        className="reports-type-bar"
                        style={{ width: `${pct.toFixed(1)}%`, backgroundColor: MATERIAL_COLORS[t.material_type] || '#607d8b' }}
                      />
                    </div>
                    <span className="reports-type-value">{fmtKg(t.total_kg)}</span>
                    <span className="reports-type-count">{t.count}×</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
