import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Flag, RefreshCw, AlertCircle, CheckCircle2, X, AlertTriangle, Info } from 'lucide-react';
import Toast from '../../components/Toast';
import useRelativeTime from '../../hooks/useRelativeTime';
import {
  fetchFlags, fetchFlagsSummary, resolveFlagThunk, dismissFlagThunk, clearFlagsError,
} from '../../store/slices/flagsSlice';

const STATUS_FILTERS = ['all', 'open', 'resolved', 'dismissed'];
const STATUS_LABELS  = { all: 'הכל', open: 'פתוח', resolved: 'מטופל', dismissed: 'בוטל' };
const STATUS_BADGE   = { open: 'badge--warn', resolved: 'badge--green', dismissed: 'badge--neutral' };

const SEVERITY_HE    = { critical: 'קריטי', high: 'גבוה', medium: 'בינוני', low: 'נמוך' };
const SEVERITY_BADGE = { critical: 'badge--critical', high: 'badge--high', medium: 'badge--warn', low: 'badge--neutral' };
const SEVERITY_ICON  = {
  critical: <AlertCircle size={13} />,
  high:     <AlertTriangle size={13} />,
  medium:   <AlertTriangle size={13} />,
  low:      <Info size={13} />,
};

const REASON_HE = {
  'mass-balance-exceeded':   'חריגת מאזן חומר',
  'duplicate-delivery-note': 'תעודת משלוח כפולה',
  'batch-overused':          'שימוש יתר באצווה',
  'incompatible-supplier':   'ספק לא תואם',
  'missing-document':        'מסמך חסר',
  'ocr-mismatch':            'אי-התאמת OCR',
  'out-of-factory':          'פעולה מחוץ למפעל',
  'inactive-product':        'תוצ"ג לא פעיל',
  'weight-discrepancy':      'פער משקל בין ספק לשקילה פנימית',
};

const ENTITY_HE = {
  intake: 'קליטה', batch: 'אצווה', shipment: 'משלוח', credit: 'קרדיט', document: 'מסמך',
};

const RESOLUTION_HE = {
  approved_exception: 'אושרה כחריגה',
  corrected:          'תוקן',
  dismissed:          'בוטל',
};

const RESOLUTIONS = [
  { value: 'approved_exception', label: 'אושרה כחריגה — הסיבה מקובלת' },
  { value: 'corrected',          label: 'תוקן — הבעיה הבסיסית טופלה' },
];

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  : '—';
const shortId = (id) => id?.slice(0, 8).toUpperCase();

const FlagsPage = () => {
  const dispatch = useDispatch();
  const { list: flags, summary, loading, error, lastFetched } = useSelector((s) => s.flags);
  const refreshedLabel = useRelativeTime(lastFetched);

  const [statusFilter,   setStatusFilter]   = useState('open');
  const [severityFilter, setSeverityFilter] = useState('');
  const [entityFilter,   setEntityFilter]   = useState('');
  const [toast,          setToast]          = useState('');

  const [resolveModal,   setResolveModal]   = useState(null);
  const [resolution,     setResolution]     = useState('approved_exception');
  const [resolveNote,    setResolveNote]    = useState('');
  const [saving,         setSaving]         = useState(false);
  const [modalError,     setModalError]     = useState('');
  const [confirmDismiss, setConfirmDismiss] = useState(null);

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
      setToast(`הדגל טופל — ${RESOLUTION_HE[resolution]}.`);
      dispatch(fetchFlagsSummary());
      closeModal();
    } else {
      setModalError(result.payload || 'שגיאה בטיפול בדגל.');
    }
  };

  const handleDismiss = async () => {
    if (!confirmDismiss) return;
    const result = await dispatch(dismissFlagThunk({ id: confirmDismiss.id }));
    if (dismissFlagThunk.fulfilled.match(result)) {
      setToast('הדגל בוטל.');
      dispatch(fetchFlagsSummary());
    } else {
      setToast(result.payload || 'שגיאה בביטול דגל.');
    }
    setConfirmDismiss(null);
  };

  const visible = flags.filter((f) => {
    if (statusFilter !== 'all' && f.status !== statusFilter) return false;
    if (severityFilter && f.severity !== severityFilter)      return false;
    if (entityFilter   && f.entity_type !== entityFilter)     return false;
    return true;
  });

  return (
    <div className="manager-page">
      <div className="manager-page__header">
        <div>
          <h1>ניהול דגלים</h1>
        </div>
        <div className="refresh-group">
          {refreshedLabel && <span className="last-refreshed">{refreshedLabel}</span>}
          <button
            className="btn-ghost btn-ghost--icon"
            onClick={handleRefresh}
            disabled={loading}
            title="רענן"
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* {summary && (
        <div className="flags-summary-strip">
          <div className="flags-summary-strip__item flags-summary-strip__item--open">
            <span className="flags-summary-strip__count">{summary.open}</span>
            <span className="flags-summary-strip__label">פתוחים</span>
          </div>
          <div className="flags-summary-strip__item">
            <span className="flags-summary-strip__count">{summary.resolved}</span>
            <span className="flags-summary-strip__label">מטופלים</span>
          </div>
          <div className="flags-summary-strip__item">
            <span className="flags-summary-strip__count">{summary.dismissed}</span>
            <span className="flags-summary-strip__label">בוטלו</span>
          </div>
        </div>
      )} */}

      {error && <div className="alert alert--error"><AlertCircle size={16} />{error}</div>}
      <Toast message={toast} onClose={() => setToast('')} />

      <div className="flags-filters">
        <div className="filter-tabs">
          {STATUS_FILTERS.map((f) => {
            const count = f === 'all' ? flags.length : flags.filter((fl) => fl.status === f).length;
            return (
              <button
                key={f}
                className={`filter-tab${statusFilter === f ? ' filter-tab--active' : ''}`}
                onClick={() => setStatusFilter(f)}
              >
                {STATUS_LABELS[f]}
                <span style={{ marginRight: '6px', opacity: 0.6, fontSize: '11px' }}>({count})</span>
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select className="filter-select" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
            <option value="">כל החומרות</option>
            <option value="critical">קריטי</option>
            <option value="high">גבוה</option>
            <option value="medium">בינוני</option>
            <option value="low">נמוך</option>
          </select>
          <select className="filter-select" value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}>
            <option value="">כל הישויות</option>
            <option value="intake">קליטה</option>
            <option value="batch">אצווה</option>
            <option value="shipment">משלוח</option>
            <option value="credit">קרדיט</option>
            <option value="document">מסמך</option>
          </select>
        </div>
      </div>

      {loading && <div className="loading-row">טוען דגלים…</div>}

      {!loading && visible.length === 0 && (
        <div className="empty-state">
          <Flag size={36} />
          <p>{flags.length === 0 ? 'אין דגלים — כל המערכות תקינות.' : 'אין דגלים התואמים לסינון.'}</p>
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div className="mobile-cards">
          {visible.map((f) => (
            <div
              key={f.id}
              className={`mobile-card${f.status === 'open' && f.severity === 'critical' ? ' mobile-card--critical' : ''}`}
            >
              <div className="mobile-card__header">
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className={`badge flag-severity ${SEVERITY_BADGE[f.severity] || 'badge--neutral'}`}>
                    {SEVERITY_ICON[f.severity]} {SEVERITY_HE[f.severity] || f.severity}
                  </span>
                  <span className={`badge ${STATUS_BADGE[f.status] || 'badge--neutral'}`}>
                    {STATUS_LABELS[f.status] || f.status}
                  </span>
                </div>
                {f.status === 'open' && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn-ghost btn-ghost--sm"
                      onClick={() => openResolveModal(f)}
                      title="טפל בדגל"
                    >
                      <CheckCircle2 size={13} /> טפל
                    </button>
                    <button
                      className="btn-ghost btn-ghost--sm btn-ghost--danger"
                      onClick={() => setConfirmDismiss(f)}
                      title="בטל דגל"
                    >
                      <X size={13} /> בטל
                    </button>
                  </div>
                )}
              </div>

              <div className="mobile-card__row">
                <span className="mobile-card__label">סיבה:</span>
                <span>{REASON_HE[f.reason] || f.reason}</span>
              </div>
              <div className="mobile-card__row">
                <span className="mobile-card__label">ישות:</span>
                <span>
                  {ENTITY_HE[f.entity_type] || f.entity_type}&nbsp;
                  <code style={{ fontSize: '12px' }}>{shortId(f.entity_id)}</code>
                </span>
              </div>
              <div className="mobile-card__row">
                <span className="mobile-card__label">נוצר:</span>
                <span>{fmtDate(f.created_at)}</span>
              </div>

              {f.status !== 'open' && (
                <>
                  <div className="mobile-card__row">
                    <span className="mobile-card__label">{'טופל ע"י:'}</span>
                    <span>
                      {f.resolved_by_name || '—'}
                      {f.resolution && (
                        <span className="badge badge--neutral" style={{ marginRight: '6px' }}>
                          {RESOLUTION_HE[f.resolution] || f.resolution}
                        </span>
                      )}
                    </span>
                  </div>
                  {f.resolution_note && (
                    <div className="mobile-card__row">
                      <span className="mobile-card__label">הערה:</span>
                      <span style={{ fontSize: '12px' }}>{f.resolution_note}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {resolveModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3>טיפול בדגל</h3>
              <button className="icon-btn" onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="modal__body">
              <div style={{ marginBottom: '12px' }}>
                <strong>{REASON_HE[resolveModal.reason] || resolveModal.reason}</strong>
                <span style={{ marginRight: '8px', fontSize: '13px', opacity: 0.6 }}>
                  · {ENTITY_HE[resolveModal.entity_type] || resolveModal.entity_type} {shortId(resolveModal.entity_id)}
                </span>
              </div>
              <form onSubmit={handleResolve} className="manager-form">
                {modalError && (
                  <div className="alert alert--error"><AlertCircle size={15} />{modalError}</div>
                )}
                <div className="form-field">
                  <label>סוג טיפול <span className="required">*</span></label>
                  <select value={resolution} onChange={(e) => setResolution(e.target.value)}>
                    {RESOLUTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label>הערה <span className="form-hint">(אופציונלי)</span></label>
                  <textarea
                    value={resolveNote}
                    onChange={(e) => setResolveNote(e.target.value)}
                    placeholder="הוסף הסבר לצורך לוג הביקורת…"
                    rows={3}
                  />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn-ghost" onClick={closeModal} disabled={saving}>ביטול</button>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? 'מטפל…' : 'סמן כמטופל'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {confirmDismiss && (
        <div className="confirm-overlay" onClick={() => setConfirmDismiss(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h4>ביטול דגל</h4>
            <p>האם לבטל את הדגל <strong>{REASON_HE[confirmDismiss.reason] || confirmDismiss.reason}</strong>? פעולה זו אינה ניתנת לביטול.</p>
            <div className="confirm-modal__actions">
              <button className="btn-ghost" onClick={() => setConfirmDismiss(null)}>חזור</button>
              <button className="btn-danger" onClick={handleDismiss}>בטל דגל</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlagsPage;
