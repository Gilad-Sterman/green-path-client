import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Award, RefreshCw, AlertCircle, TrendingUp, Layers, RotateCcw, Scale } from 'lucide-react';
import useRelativeTime from '../../hooks/useRelativeTime';
import { fetchCredits, fetchCreditsSummary, clearCreditsError } from '../../store/slices/creditsSlice';

const FILTERS = ['all', 'operational', 'retroactive'];

const fmtKg   = (n) => n != null ? `${parseFloat(n).toLocaleString(undefined, { maximumFractionDigits: 2 })} kg` : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const shortId = (id) => id?.slice(0, 8).toUpperCase();

const SummaryCard = ({ icon: Icon, label, value, hint, variant }) => (
  <div className={`credits-summary-card${variant ? ` credits-summary-card--${variant}` : ''}`}>
    <div className="credits-summary-card__icon"><Icon size={20} /></div>
    <div>
      <p className="credits-summary-card__value">{value}</p>
      <p className="credits-summary-card__label">{label}</p>
      {hint && <p className="credits-summary-card__hint">{hint}</p>}
    </div>
  </div>
);

const CreditsPage = () => {
  const dispatch = useDispatch();
  const { list: credits, summary, loading, summaryLoading, error, lastFetched } = useSelector((s) => s.credits);
  const refreshedLabel = useRelativeTime(lastFetched);

  const [filter, setFilter] = useState('all');

  useEffect(() => {
    dispatch(fetchCredits({ force: false }));
    dispatch(fetchCreditsSummary());
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchCredits({ force: true }));
    dispatch(fetchCreditsSummary());
    dispatch(clearCreditsError());
  };

  const visible = credits.filter((c) => filter === 'all' || c.kind === filter);

  const remainingPct = summary
    ? Math.min(
        100,
        parseFloat(summary.total_eligible_input_kg) > 0
          ? (parseFloat(summary.remaining_balance_kg) / parseFloat(summary.total_eligible_input_kg)) * 100
          : 0
      )
    : null;

  return (
    <div className="manager-page">
      <div className="manager-page__header">
        <div>
          <h1>Credits Ledger</h1>
          <p className="page-subtitle">Recycling credits auto-generated from shipments</p>
        </div>
        <div className="refresh-group">
          {refreshedLabel && <span className="last-refreshed">{refreshedLabel}</span>}
          <button
            className="btn-ghost btn-ghost--icon"
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {error && <div className="alert alert--error"><AlertCircle size={16} />{error}</div>}

      <div className="credits-summary-grid">
        <SummaryCard
          icon={Award}
          label="Total Credits Issued"
          value={summaryLoading ? '…' : fmtKg(summary?.total_credits_kg)}
          hint={`${summary?.total_count || 0} credit entries`}
          variant="primary"
        />
        <SummaryCard
          icon={TrendingUp}
          label="Operational"
          value={summaryLoading ? '…' : fmtKg(summary?.operational_kg)}
          hint="From regular shipments"
        />
        <SummaryCard
          icon={RotateCcw}
          label="Retroactive"
          value={summaryLoading ? '…' : fmtKg(summary?.retroactive_kg)}
          hint="From retro certifications"
        />
        <SummaryCard
          icon={Scale}
          label="Remaining Balance"
          value={summaryLoading ? '…' : fmtKg(summary?.remaining_balance_kg)}
          hint={
            remainingPct != null
              ? `${remainingPct.toFixed(1)}% of eligible input unused`
              : 'Available to credit'
          }
          variant={remainingPct !== null && remainingPct < 10 ? 'warn' : undefined}
        />
      </div>

      {summary && (
        <div className="credits-balance-bar-wrap">
          <div className="credits-balance-bar">
            <div
              className="credits-balance-bar__fill"
              style={{
                width: `${Math.min(100, 100 - (remainingPct ?? 0)).toFixed(1)}%`,
              }}
            />
          </div>
          <p className="credits-balance-bar__label">
            <strong>{fmtKg(summary.total_credits_kg)}</strong> credited of{' '}
            <strong>{fmtKg(summary.total_eligible_input_kg)}</strong> total eligible input
          </p>
        </div>
      )}

      <div className="filter-tabs">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`filter-tab${filter === f ? ' filter-tab--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            <span style={{ marginRight: '6px', opacity: 0.6, fontSize: '11px' }}>
              ({f === 'all' ? credits.length : credits.filter((c) => c.kind === f).length})
            </span>
          </button>
        ))}
      </div>

      {loading && <div className="loading-row">Loading credits…</div>}

      {!loading && visible.length === 0 && (
        <div className="empty-state">
          <Award size={36} />
          <p>
            {credits.length === 0
              ? 'No credits yet. Credits are auto-generated when shipments are created.'
              : 'No credits match the current filter.'}
          </p>
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Credit ID</th>
                <th>Kind</th>
                <th>Source</th>
                <th>Source ID</th>
                <th>Eligible output</th>
                <th>Retroactive</th>
                <th>Issued</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.id}>
                  <td><code style={{ fontSize: '12px' }}>{shortId(c.id)}</code></td>
                  <td>
                    <span className={`badge ${c.kind === 'operational' ? 'badge--green' : 'badge--blue'}`}>
                      {c.kind}
                    </span>
                  </td>
                  <td className="td-muted" style={{ fontSize: '13px' }}>
                    {c.source_type?.replace(/_/g, ' ') || '—'}
                  </td>
                  <td>
                    {c.source_id
                      ? <code style={{ fontSize: '12px' }}>{shortId(c.source_id)}</code>
                      : '—'}
                  </td>
                  <td><strong>{fmtKg(c.eligible_output_kg)}</strong></td>
                  <td>
                    <span className={`badge ${c.retro ? 'badge--warn' : 'badge--neutral'}`}>
                      {c.retro ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CreditsPage;
