import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Flag, RefreshCw, AlertCircle, CheckCircle2, X, AlertTriangle, Info } from 'lucide-react';
import RowActionsMenu from '../../components/RowActionsMenu';
import Toast from '../../components/Toast';
import useRelativeTime from '../../hooks/useRelativeTime';
import {
  fetchFlags, fetchFlagsSummary, resolveFlagThunk, dismissFlagThunk, clearFlagsError,
} from '../../store/slices/flagsSlice';

const STATUS_FILTERS = ['all', 'open', 'resolved', 'dismissed'];
const SEVERITY_BADGE = {
  critical: 'badge--critical',
  high:     'badge--high',
  medium:   'badge--warn',
  low:      'badge--neutral',
};
const SEVERITY_ICON = {
  critical: <AlertCircle size={14} />,
  high:     <AlertTriangle size={14} />,
  medium:   <AlertTriangle size={14} />,
  low:      <Info size={14} />,
};
const RESOLUTIONS = [
  { value: 'approved_exception', label: 'Approved exception — accepted as-is' },
  { value: 'corrected',          label: 'Corrected — underlying issue was fixed' },
];

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';
const shortId = (id) => id?.slice(0, 8).toUpperCase();

const FlagsPage = () => {
  const dispatch = useDispatch();
  const { list: flags, summary, loading, error, lastFetched } = useSelector((s) => s.flags);
  const refreshedLabel = useRelativeTime(lastFetched);

  const [statusFilter,   setStatusFilter]   = useState('open');
  const [severityFilter, setSeverityFilter] = useState('');
  const [toast,          setToast]          = useState('');

  const [resolveModal, setResolveModal] = useState(null); // { id, reason }
  const [resolution,   setResolution]   = useState('approved_exception');
  const [resolveNote,  setResolveNote]  = useState('');
  const [saving,       setSaving]       = useState(false);
  const [modalError,   setModalError]   = useState('');

  useEffect(() => {
    dispatch(fetchFlags({ force: false }));
    dispatch(fetchFlagsSummary());
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchFlags({ force: true }));
    dispatch(fetchFlagsSummary());
    dispatch(clearFlagsError());
  };

  const openResolveModal = (flag) => {
    setResolveModal(flag);
    setResolution('approved_exception');
    setResolveNote('');
    setModalError('');
  };

  const closeModal = () => { setResolveModal(null); setSaving(false); setModalError(''); };

  const handleResolve = async (e) => {
    e.preventDefault();
    setSaving(true);
    setModalError('');
    const result = await dispatch(resolveFlagThunk({
      id: resolveModal.id,
      resolution,
      resolution_note: resolveNote,
    }));
    setSaving(false);
    if (resolveFlagThunk.fulfilled.match(result)) {
      setToast(`Flag resolved — ${resolution.replace(/_/g, ' ')}.`);
      dispatch(fetchFlagsSummary());
      closeModal();
    } else {
      setModalError(result.payload || 'Failed to resolve flag.');
    }
  };

  const handleDismiss = async (flag) => {
    const result = await dispatch(dismissFlagThunk({ id: flag.id }));
    if (dismissFlagThunk.fulfilled.match(result)) {
      setToast(`Flag ${shortId(flag.id)} dismissed.`);
      dispatch(fetchFlagsSummary());
    } else {
      setToast(result.payload || 'Failed to dismiss flag.');
    }
  };

  const visible = flags.filter((f) => {
    if (statusFilter !== 'all' && f.status !== statusFilter) return false;
    if (severityFilter && f.severity !== severityFilter)      return false;
    return true;
  });

  return (
    <div className="manager-page">
      <div className="manager-page__header">
        <div>
          <h1>Flags</h1>
          <p className="page-subtitle">Anomalies and rule violations requiring review</p>
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

      {summary && (
        <div className="flags-summary-strip">
          <div className="flags-summary-strip__item flags-summary-strip__item--open">
            <span className="flags-summary-strip__count">{summary.open}</span>
            <span className="flags-summary-strip__label">Open</span>
          </div>
          <div className="flags-summary-strip__item">
            <span className="flags-summary-strip__count">{summary.resolved}</span>
            <span className="flags-summary-strip__label">Resolved</span>
          </div>
          <div className="flags-summary-strip__item">
            <span className="flags-summary-strip__count">{summary.dismissed}</span>
            <span className="flags-summary-strip__label">Dismissed</span>
          </div>
        </div>
      )}

      {error && <div className="alert alert--error"><AlertCircle size={16} />{error}</div>}
      <Toast message={toast} onClose={() => setToast('')} />

      <div className="flags-filters">
        <div className="filter-tabs">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              className={`filter-tab${statusFilter === f ? ' filter-tab--active' : ''}`}
              onClick={() => setStatusFilter(f)}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              <span style={{ marginRight: '6px', opacity: 0.6, fontSize: '11px' }}>
                ({f === 'all' ? flags.length : flags.filter((fl) => fl.status === f).length})
              </span>
            </button>
          ))}
        </div>
        <select
          className="filter-select"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
        >
          <option value="">All severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {loading && <div className="loading-row">Loading flags…</div>}

      {!loading && visible.length === 0 && (
        <div className="empty-state">
          <Flag size={36} />
          <p>
            {flags.length === 0
              ? 'No flags — all systems normal.'
              : 'No flags match the current filter.'}
          </p>
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Reason</th>
                <th>Entity</th>
                <th>Entity ID</th>
                <th>Status</th>
                <th>Resolved by</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((f) => (
                <tr key={f.id} className={f.status === 'open' && f.severity === 'critical' ? 'row--critical' : ''}>
                  <td>
                    <span className={`badge flag-severity ${SEVERITY_BADGE[f.severity] || 'badge--neutral'}`}>
                      {SEVERITY_ICON[f.severity]}
                      {f.severity}
                    </span>
                  </td>
                  <td className="td-primary">{f.reason?.replace(/-/g, ' ')}</td>
                  <td>
                    <span className="tag">{f.entity_type}</span>
                  </td>
                  <td>
                    <code style={{ fontSize: '12px' }}>{shortId(f.entity_id)}</code>
                  </td>
                  <td>
                    <span className={`badge ${f.status === 'open' ? 'badge--warn' : f.status === 'resolved' ? 'badge--green' : 'badge--neutral'}`}>
                      {f.status}
                    </span>
                  </td>
                  <td className="td-muted" style={{ fontSize: '13px' }}>
                    {f.resolved_by_name || '—'}
                    {f.resolution && (
                      <span className="tag" style={{ marginLeft: '6px' }}>
                        {f.resolution.replace(/_/g, ' ')}
                      </span>
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(f.created_at)}</td>
                  <td>
                    {f.status === 'open' && (
                      <RowActionsMenu items={[
                        {
                          label:   'Resolve',
                          icon:    <CheckCircle2 size={14} />,
                          onClick: () => openResolveModal(f),
                        },
                        {
                          label:   'Dismiss',
                          icon:    <X size={14} />,
                          variant: 'danger',
                          onClick: () => handleDismiss(f),
                        },
                      ]} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {resolveModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3>Resolve Flag</h3>
              <button className="icon-btn" onClick={closeModal}><X size={18} /></button>
            </div>

            <div className="modal__body">
              <p className="modal__desc">
                <strong>{resolveModal.reason?.replace(/-/g, ' ')}</strong>
                <span className="td-muted" style={{ marginLeft: '8px' }}>
                  · {resolveModal.entity_type} {shortId(resolveModal.entity_id)}
                </span>
              </p>

              <form onSubmit={handleResolve} className="manager-form">
                {modalError && (
                  <div className="alert alert--error"><AlertCircle size={15} />{modalError}</div>
                )}

                <div className="form-field">
                  <label>Resolution type <span className="required">*</span></label>
                  <select value={resolution} onChange={(e) => setResolution(e.target.value)}>
                    {RESOLUTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Note <span className="form-hint">(optional)</span></label>
                  <textarea
                    value={resolveNote}
                    onChange={(e) => setResolveNote(e.target.value)}
                    placeholder="Add context for the audit log…"
                    rows={3}
                  />
                </div>

                <div className="form-actions">
                  <button type="button" className="btn-ghost" onClick={closeModal} disabled={saving}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? 'Resolving…' : 'Mark as resolved'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlagsPage;
