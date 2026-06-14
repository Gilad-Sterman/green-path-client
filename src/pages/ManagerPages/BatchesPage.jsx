import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Layers, Plus, AlertCircle, RefreshCw, XCircle, ChevronDown, ChevronUp, Lock, LockOpen, XOctagon } from 'lucide-react';
import RowActionsMenu from '../../components/RowActionsMenu';
import Toast from '../../components/Toast';
import useRelativeTime from '../../hooks/useRelativeTime';
import { fetchBatches, completeBatchThunk, cancelBatchThunk, blockBatchThunk, unblockBatchThunk, failBatchThunk } from '../../store/slices/batchesSlice';
import { fetchProducts } from '../../store/slices/productsSlice';
import { fetchIntakes } from '../../store/slices/intakesSlice';
import { getBatch } from '../../api/batches';
import BatchForm from './BatchForm';

const STATUS_BADGE = { in_progress: 'badge--warn', completed: 'badge--neutral', cancelled: 'badge--neutral', failed: 'badge--warn' };
const STATUS_HE = { in_progress: 'פעיל', completed: 'לא פעיל', cancelled: 'בוטל', failed: 'נפסלה' };
const FILTER_LABELS = { all: 'הכל', in_progress: 'בתהליך', completed: 'הושלם', cancelled: 'בוטל', failed: 'נפסלה' };
const FILTERS = ['all', 'in_progress', 'completed', 'cancelled', 'failed'];
const MATERIAL_TYPE_HE = {
  PET: 'PET', HDPE: 'HDPE', PP: 'PP', LDPE: 'LDPE',
  PVC: 'PVC', PE: 'PE', mixed: 'מעורב', other: 'אחר',
};

const fmtKg = (n) => n != null ? `${parseFloat(n).toLocaleString('he-IL', { maximumFractionDigits: 2 })} ק"ג` : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const shortId = (id) => id?.slice(0, 8).toUpperCase();

const BatchesPage = () => {
  const dispatch = useDispatch();
  const { list: batches, loading, error, lastFetched } = useSelector((s) => s.batches);
  const { list: products } = useSelector((s) => s.products);
  const { user } = useSelector((s) => s.auth);
  const isManager = user?.role !== 'employee';
  const refreshedLabel = useRelativeTime(lastFetched);

  const [searchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState('');
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [detailData, setDetailData] = useState({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    dispatch(fetchBatches({ force: false }));
    dispatch(fetchProducts());
  }, [dispatch]);

  useEffect(() => {
    if (searchParams.get('new') === '1') setShowForm(true);
  }, [searchParams]);

  const handleComplete = async (batch) => {
    const result = await dispatch(completeBatchThunk(batch.id));
    if (completeBatchThunk.fulfilled.match(result)) {
      setToast(`אצווה ${shortId(batch.id)} סומנה כהושלמה.`);
    } else {
      setToast(result.payload || 'סגירת האצווה נכשלה.');
    }
  };

  const handleCancel = (batch) => {
    setConfirm({
      title: 'ביטול אצווה',
      lines: ['ביטול האצווה ישחרר את המשקל המוקצה בחזרה לחומרי הגלם.'],
      warning: 'פעולה בלתי הפיכה.',
      label: 'בטל אצווה',
      danger: true,
      onConfirm: async () => {
        setConfirm(null);
        const result = await dispatch(cancelBatchThunk(batch.id));
        if (cancelBatchThunk.fulfilled.match(result)) {
          setToast(`אצווה ${shortId(batch.id)} בוטלה.`);
          dispatch(fetchIntakes({ force: true }));
        } else {
          setToast(result.payload || 'ביטול האצווה נכשל.');
        }
      },
    });
  };

  const handleBlock = (batch) => {
    setConfirm({
      title: 'השבתת אצווה',
      lines: ['לא תוכלו להשתמש בה עוד למשלוחים או לאצוות.'],
      label: 'השבת אצווה',
      danger: true,
      onConfirm: async () => {
        setConfirm(null);
        const result = await dispatch(blockBatchThunk(batch.id));
        if (blockBatchThunk.fulfilled.match(result)) {
          setToast(`אצווה ${shortId(batch.id)} הושבתה.`);
        } else {
          setToast(result.payload || 'השבתת האצווה נכשלה.');
        }
      },
    });
  };

  const handleUnblock = async (batch) => {
    const result = await dispatch(unblockBatchThunk(batch.id));
    if (unblockBatchThunk.fulfilled.match(result)) {
      setToast(`אצווה ${shortId(batch.id)} שוחררה.`);
    } else {
      setToast(result.payload || 'שחרור האצווה נכשל.');
    }
  };

  const handleFail = (batch) => {
    setConfirm({
      title: 'פסילת אצווה',
      lines: [
        'לא תוכלו להשתמש בה עוד למשלוחים.',
        'האצווה תמשיך להיות זמינה לשימוש בפתיחת אצוות.',
      ],
      warning: 'שימו לב: זוהי פעולה בלתי הפיכה.',
      label: 'פסול אצווה',
      danger: true,
      onConfirm: async () => {
        setConfirm(null);
        const result = await dispatch(failBatchThunk(batch.id));
        if (failBatchThunk.fulfilled.match(result)) {
          setToast(`אצווה ${shortId(batch.id)} נפסלה.`);
        } else {
          setToast(result.payload || 'פסילת האצווה נכשלה.');
        }
      },
    });
  };

  const toggleExpand = async (batchId) => {
    if (expandedId === batchId) { setExpandedId(null); return; }
    setExpandedId(batchId);
    if (detailData[batchId]) return;
    setDetailLoading(true);
    try {
      const { data } = await getBatch(batchId);
      setDetailData((p) => ({ ...p, [batchId]: data.data.batch }));
    } catch (_) { }
    setDetailLoading(false);
  };

  const handleBatchCreated = () => {
    setToast('אצווה נוצרה בהצלחה.');
    setShowForm(false);
    dispatch(fetchIntakes({ force: true }));
  };

  const visible = batches.filter((b) => filter === 'all' || b.status === filter);

  return (
    <div className="manager-page">
      <div className="manager-page__header">
        <div>
          <h1>אצוות מוצר</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="refresh-group">
            {refreshedLabel && <span className="last-refreshed">{refreshedLabel}</span>}
            <button className="btn-ghost btn-ghost--icon" onClick={() => dispatch(fetchBatches({ force: true }))} disabled={loading} title="רענן">
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>
      </div>
      <button className="btn-primary new-batch-btn" onClick={() => setShowForm(true)}>
        <Plus size={16} /> אצווה חדשה
      </button>

      <Toast message={toast} onClose={() => setToast('')} />
      {error && <div className="alert alert--error"><AlertCircle size={16} />{error}</div>}

      {showForm && (
        <BatchForm
          products={products}
          onClose={() => setShowForm(false)}
          onSuccess={handleBatchCreated}
        />
      )}

      <div className="filter-tabs">
        {FILTERS.map((f) => (
          <button key={f} className={`filter-tab${filter === f ? ' filter-tab--active' : ''}`} onClick={() => setFilter(f)}>
            {FILTER_LABELS[f] || f}
            <span style={{ marginRight: '6px', opacity: 0.6, fontSize: '11px' }}>
              ({f === 'all' ? batches.length : batches.filter((b) => b.status === f).length})
            </span>
          </button>
        ))}
      </div>

      {loading && <div className="loading-row">טוען אצוות…</div>}

      {!loading && visible.length === 0 && (
        <div className="empty-state">
          <Layers size={36} />
          <p>{batches.length === 0 ? 'טרם נוצרו אצוות. צור את הראשונה.' : 'אין אצוות התואמות לסינון הנוכחי.'}</p>
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div className="mobile-cards">
          {visible.map((b) => (
            <div key={b.id} className="mobile-card">
              <div className="mobile-card__header">
                <div>
                  <span className="mobile-card__title">{b.product_name}</span>
                  <code className="mobile-card__sku">{b.batch_code || shortId(b.id)}</code>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {b.is_active === false ? (
                    <span className="badge badge--warn">חסומה</span>
                  ) : b.status === 'in_progress' ? (
                    isManager ? (
                      <button className="status-toggle status-toggle--on" onClick={() => handleComplete(b)} title="לחץ לסיים אצווה" aria-pressed>
                        <span className="status-toggle__track"><span className="status-toggle__thumb" /></span>
                        <span className="status-toggle__label">פעיל</span>
                      </button>
                    ) : (
                      <span className="badge badge--green">פעיל</span>
                    )
                  ) : (
                    <span className={`badge ${STATUS_BADGE[b.status] || 'badge--neutral'}`}>
                      {STATUS_HE[b.status] || b.status}
                    </span>
                  )}
                  {isManager && (
                    b.is_active === false ? (
                      <RowActionsMenu items={[
                        { label: 'שחרר חסימה', icon: <LockOpen size={14} />, onClick: () => handleUnblock(b) },
                      ]} />
                    ) : b.status === 'in_progress' ? (
                      <RowActionsMenu items={[
                        { label: 'חסום אצווה', icon: <Lock size={14} />, onClick: () => handleBlock(b), danger: true },
                        { label: 'פסול אצווה', icon: <XOctagon size={14} />, onClick: () => handleFail(b), danger: true },
                        { label: 'בטל אצווה', icon: <XCircle size={14} />, onClick: () => handleCancel(b), danger: true },
                      ]} />
                    ) : null
                  )}
                </div>
              </div>
              <div className="mobile-card__row">
                <span className="mobile-card__label">משקל כולל:</span>
                <strong>{fmtKg(b.output_weight_kg)}</strong>
              </div>
              <div className="mobile-card__row">
                <span className="mobile-card__label">נוצל:</span>
                <span>{fmtKg(b.used_weight_kg)}</span>
              </div>
              <div className="mobile-card__row">
                <span className="mobile-card__label">נותר:</span>
                <strong>{fmtKg(b.remaining_weight_kg)}</strong>
              </div>
              <div className="mobile-card__row">
                <span className="mobile-card__label">תאריך אצווה:</span>
                <span>{fmtDate(b.batch_date || b.created_at)}</span>
              </div>
              <button
                className="btn-ghost btn-ghost--sm"
                style={{ marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                onClick={() => toggleExpand(b.id)}
              >
                {expandedId === b.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {expandedId === b.id ? 'סגור פירוט' : 'מקורות'}
              </button>
              {expandedId === b.id && (
                <div className="batch-card-detail">
                  {detailLoading && <span className="td-muted">טוען…</span>}
                  {detailData[b.id] && (
                    <>
                      {detailData[b.id].notes && (
                        <p className="batch-card-detail__notes"><strong>הערות:</strong> {detailData[b.id].notes}</p>
                      )}
                      {detailData[b.id].components?.map((c) => (
                        <div key={c.id} className="batch-card-detail__row">
                          <div>
                            {c.source_type === 'intake' ? (
                              <>
                                <code style={{ fontSize: '11px' }}>{c.delivery_note_number}</code>
                                <span className="tag" style={{ marginRight: '6px' }}>{MATERIAL_TYPE_HE[c.material_type] || c.material_type}</span>
                              </>
                            ) : (
                              <>
                                <code style={{ fontSize: '11px' }}>{c.source_batch_code}</code>
                                <span className="tag" style={{ marginRight: '6px' }}>אצווה</span>
                                {c.source_product_name && <span style={{ fontSize: '12px' }}>{c.source_product_name}</span>}
                              </>
                            )}
                          </div>
                          <strong>{fmtKg(c.weight_kg)}</strong>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {confirm && (
        <div className="confirm-overlay" onClick={() => setConfirm(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="confirm-modal__title">{confirm.title}</h3>
            {confirm.lines?.map((line, i) => (
              <p key={i} className="confirm-modal__line">{line}</p>
            ))}
            {confirm.warning && (
              <p className="confirm-modal__warn">{confirm.warning}</p>
            )}
            <div className="confirm-modal__actions">
              <button className="btn-ghost" onClick={() => setConfirm(null)}>ביטול</button>
              <button
                className={confirm.danger ? 'btn-danger' : 'btn-primary'}
                onClick={confirm.onConfirm}
              >
                {confirm.label}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchesPage;
