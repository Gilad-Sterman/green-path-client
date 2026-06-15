import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Layers, Plus, AlertCircle, RefreshCw, ChevronDown, ChevronUp, Lock, LockOpen, XOctagon, Search } from 'lucide-react';
import RowActionsMenu from '../../components/RowActionsMenu';
import Toast from '../../components/Toast';
import useRelativeTime from '../../hooks/useRelativeTime';
import { fetchBatches, blockBatchThunk, unblockBatchThunk, failBatchThunk, addBatchWasteThunk } from '../../store/slices/batchesSlice';
import { fetchProducts } from '../../store/slices/productsSlice';
import { fetchIntakes } from '../../store/slices/intakesSlice';
import { getBatch } from '../../api/batches';
import BatchForm from './BatchForm';

const STATUS_BADGE      = { in_progress: 'badge--green', completed: 'badge--blue', failed: 'badge--warn' };
const STATUS_HE         = { in_progress: 'בתהליך', completed: 'הושלם', failed: 'נפסלה' };
const STATUS_CHIPS      = ['in_progress', 'completed', 'failed'];
const STATUS_CHIP_LABELS = { in_progress: 'בתהליך', completed: 'הושלם', failed: 'נפסלה' };
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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [detailData, setDetailData] = useState({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [blockModal, setBlockModal] = useState(null);
  const [blockReason, setBlockReason] = useState('');
  const [wasteModal, setWasteModal] = useState(null);
  const [wasteInput, setWasteInput] = useState('');
  const [wasteSaving, setWasteSaving] = useState(false);

  useEffect(() => {
    dispatch(fetchBatches({ force: false }));
    dispatch(fetchProducts());
  }, [dispatch]);

  useEffect(() => {
    if (searchParams.get('new') === '1') setShowForm(true);
  }, [searchParams]);

  const handleBlock = (batch) => { setBlockReason(''); setBlockModal(batch); };

  const handleBlockSubmit = async () => {
    if (!blockReason.trim()) return;
    const captured = blockModal;
    setBlockModal(null);
    const result = await dispatch(blockBatchThunk({ id: captured.id, reason: blockReason.trim() }));
    if (blockBatchThunk.fulfilled.match(result)) {
      setToast(`אצווה ${shortId(captured.id)} הושבתה.`);
    } else {
      setToast(result.payload || 'השבתת האצווה נכשלה.');
    }
  };

  const handleWaste = (batch) => { setWasteInput(''); setWasteModal(batch); };

  const handleWasteSubmit = async () => {
    const kg = parseFloat(wasteInput);
    if (!kg || kg <= 0) return;
    setWasteSaving(true);
    const captured = wasteModal;
    setWasteModal(null);
    const result = await dispatch(addBatchWasteThunk({ id: captured.id, waste_kg: kg }));
    setWasteSaving(false);
    if (addBatchWasteThunk.fulfilled.match(result)) {
      setToast(`פחת עודכן לאצווה ${shortId(captured.id)}.`);
    } else {
      setToast(result.payload || 'עדכון הפחת נכשל.');
    }
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
    dispatch(fetchBatches({ force: true }));
    dispatch(fetchIntakes({ force: true }));
  };

  const visible = batches.filter((b) => {
    const matchStatus = statusFilter.length === 0 || statusFilter.includes(b.status);
    const q = search.toLowerCase();
    const matchSearch = !q || b.product_name?.toLowerCase().includes(q) || b.batch_code?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

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

      <div className="batch-search-row">
        <div className="batch-search-input">
          <Search size={14} />
          <input
            placeholder="חיפוש לפי מוצר / קוד אצווה…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="batch-status-chips">
          {STATUS_CHIPS.map((s) => (
            <button
              key={s}
              className={`status-chip${statusFilter.includes(s) ? ' status-chip--active' : ''}`}
              onClick={() => setStatusFilter((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s])}
            >
              {STATUS_CHIP_LABELS[s]}
              <span className="status-chip__count">({batches.filter((b) => b.status === s).length})</span>
            </button>
          ))}
        </div>
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
                        { label: 'הוסף פחת', icon: <Layers size={14} />, onClick: () => handleWaste(b) },
                        { label: 'חסום אצווה', icon: <Lock size={14} />, onClick: () => handleBlock(b), danger: true },
                        { label: 'פסול אצווה', icon: <XOctagon size={14} />, onClick: () => handleFail(b), danger: true },
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
              {parseFloat(b.waste_weight_kg) > 0 && (
                <div className="mobile-card__row">
                  <span className="mobile-card__label">פחת:</span>
                  <span>{fmtKg(b.waste_weight_kg)}</span>
                </div>
              )}
              {b.block_reason && (
                <div className="mobile-card__row">
                  <span className="mobile-card__label">סיבת חסימה:</span>
                  <span className="td-muted">{b.block_reason}</span>
                </div>
              )}
              {b.creator_name && (
                <div className="mobile-card__row">
                  <span className="mobile-card__label">נוצר ע"י:</span>
                  <span>{b.creator_name}</span>
                </div>
              )}
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
                      {detailData[b.id].components?.length > 0 && (
                        <p className="batch-card-detail__section-title">מקורות חומר:</p>
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
                      {detailData[b.id].usages?.length > 0 && (
                        <>
                          <p className="batch-card-detail__section-title">שימושים במשלוחים:</p>
                          {detailData[b.id].usages.map((u, i) => (
                            <div key={i} className="batch-card-detail__row">
                              <div>
                                <span style={{ fontSize: '12px' }}>{u.customer_name}</span>
                                <span className="td-muted" style={{ fontSize: '11px', marginRight: '4px' }}>{fmtDate(u.shipment_date)}</span>
                              </div>
                              <strong>{fmtKg(u.weight_kg)}</strong>
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {blockModal && (
        <div className="confirm-overlay" onClick={() => setBlockModal(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="confirm-modal__title">חסימת אצווה</h3>
            <p className="confirm-modal__line">האצווה לא תהיה זמינה למשלוחים או לאצוות נוספות.</p>
            <div className="form-field" style={{ marginTop: '12px' }}>
              <label>סיבת החסימה <span className="required">*</span></label>
              <input
                autoFocus
                placeholder="לדוגמה: זיהום בחומר, בעיית איכות…"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBlockSubmit()}
              />
            </div>
            <div className="confirm-modal__actions">
              <button className="btn-ghost" onClick={() => setBlockModal(null)}>ביטול</button>
              <button className="btn-danger" onClick={handleBlockSubmit} disabled={!blockReason.trim()}>חסום אצווה</button>
            </div>
          </div>
        </div>
      )}

      {wasteModal && (
        <div className="confirm-overlay" onClick={() => { if (!wasteSaving) setWasteModal(null); }}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="confirm-modal__title">עדכון פחת</h3>
            <p className="confirm-modal__line">יתרה נוכחית: <strong>{fmtKg(wasteModal.remaining_weight_kg)}</strong></p>
            <div className="form-field" style={{ marginTop: '12px' }}>
              <label>משקל פחת להוסיף (ק"ג) <span className="required">*</span></label>
              <input
                autoFocus
                type="number"
                step="0.01"
                min="0.01"
                placeholder="לדוגמה: 5.5"
                value={wasteInput}
                onChange={(e) => setWasteInput(e.target.value)}
              />
            </div>
            <div className="confirm-modal__actions">
              <button className="btn-ghost" onClick={() => setWasteModal(null)} disabled={wasteSaving}>ביטול</button>
              <button
                className="btn-primary"
                onClick={handleWasteSubmit}
                disabled={wasteSaving || !wasteInput || parseFloat(wasteInput) <= 0}
              >
                {wasteSaving ? 'שומר…' : 'עדכן פחת'}
              </button>
            </div>
          </div>
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
