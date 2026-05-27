import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Layers, Plus, X, AlertCircle, RefreshCw, XCircle, ChevronDown, ChevronUp, Trash2, Lock, LockOpen, XOctagon } from 'lucide-react';
import RowActionsMenu from '../../components/RowActionsMenu';
import Toast from '../../components/Toast';
import useRelativeTime from '../../hooks/useRelativeTime';
import { fetchBatches, createBatchThunk, completeBatchThunk, cancelBatchThunk, blockBatchThunk, unblockBatchThunk, failBatchThunk, clearBatchesError } from '../../store/slices/batchesSlice';
import { fetchProducts } from '../../store/slices/productsSlice';
import { fetchIntakes } from '../../store/slices/intakesSlice';
import { getBatch } from '../../api/batches';

const STATUS_BADGE = { in_progress: 'badge--warn', completed: 'badge--neutral', cancelled: 'badge--neutral', failed: 'badge--warn' };
const STATUS_HE = { in_progress: 'פעיל', completed: 'לא פעיל', cancelled: 'בוטל', failed: 'נפסלה' };
const FILTER_LABELS = { all: 'הכל', in_progress: 'בתהליך', completed: 'הושלם', cancelled: 'בוטל', failed: 'נפסלה' };
const FILTERS = ['all', 'in_progress', 'completed', 'cancelled', 'failed'];
const MATERIAL_TYPE_HE = {
  plastic: 'פלסטיק', paper: 'נייר / קרטון', metal: 'מתכת',
  glass: 'זכוכית', textile: 'טקסטיל', rubber: 'גומי', mixed: 'מעורב', other: 'אחר',
};

const fmtKg = (n) => n != null ? `${parseFloat(n).toLocaleString('he-IL', { maximumFractionDigits: 2 })} ק"ג` : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const shortId = (id) => id?.slice(0, 8).toUpperCase();

const EMPTY_FORM = { product_id: '', output_weight_kg: '', notes: '' };
const EMPTY_COMP = { intake_id: '', weight_kg: '' };

const BatchesPage = () => {
  const dispatch = useDispatch();
  const { list: batches, loading, error, lastFetched } = useSelector((s) => s.batches);
  const { list: products } = useSelector((s) => s.products);
  const { list: intakes } = useSelector((s) => s.intakes);
  const refreshedLabel = useRelativeTime(lastFetched);

  const [searchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [components, setComponents] = useState([{ ...EMPTY_COMP }]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [formError, setFormError] = useState('');
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [detailData, setDetailData] = useState({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    dispatch(fetchBatches({ force: false }));
    dispatch(fetchProducts());
    dispatch(fetchIntakes({ force: false }));
  }, [dispatch]);

  useEffect(() => {
    if (searchParams.get('new') === '1') setShowForm(true);
  }, [searchParams]);

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setFormError('');
  };

  const addComponent = () => setComponents((p) => [...p, { ...EMPTY_COMP }]);
  const removeComponent = (idx) => setComponents((p) => p.filter((_, i) => i !== idx));
  const updateComponent = (idx, field, value) => {
    setComponents((p) => p.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
    setFormError('');
  };

  const totalAllocated = components.reduce((sum, c) => sum + (parseFloat(c.weight_kg) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.product_id) { setFormError('יש לבחור מוצר.'); return; }
    if (!form.output_weight_kg) { setFormError('יש להזין משקל אצווה כולל.'); return; }

    const validComps = components.filter((c) => c.intake_id && c.weight_kg);
    if (validComps.length === 0) { setFormError('יש להגדיר לפחות מקור קליטה אחד.'); return; }

    const hasIncomplete = components.some((c) => (c.intake_id && !c.weight_kg) || (!c.intake_id && c.weight_kg));
    if (hasIncomplete) { setFormError('לכל מקור קליטה יש להזין גם קליטה וגם משקל.'); return; }

    const sumComps = validComps.reduce((s, c) => s + parseFloat(c.weight_kg), 0);
    const target = parseFloat(form.output_weight_kg);
    if (Math.abs(sumComps - target) > 0.01) {
      setFormError(`סך משקלי המקורות (${sumComps.toFixed(2)}) חייב להיות שווה למשקל האצווה הכולל (${target.toFixed(2)}).`);
      return;
    }

    const payload = {
      product_id: form.product_id,
      output_weight_kg: parseFloat(form.output_weight_kg),
      notes: form.notes || undefined,
      components: validComps.map((c) => ({
        intake_id: c.intake_id,
        weight_kg: parseFloat(c.weight_kg),
      })),
    };

    setSaving(true);
    const result = await dispatch(createBatchThunk(payload));
    setSaving(false);

    if (createBatchThunk.fulfilled.match(result)) {
      setToast('אצווה נוצרה בהצלחה.');
      handleClose();
      dispatch(fetchIntakes({ force: true }));
    } else {
      setFormError(result.payload || 'יצירת האצווה נכשלה.');
    }
  };

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

  const toggleExpand = useCallback(async (batchId) => {
    if (expandedId === batchId) { setExpandedId(null); return; }
    setExpandedId(batchId);
    if (detailData[batchId]) return;
    setDetailLoading(true);
    try {
      const { data } = await getBatch(batchId);
      setDetailData((p) => ({ ...p, [batchId]: data.data.batch }));
    } catch (_) { }
    setDetailLoading(false);
  }, [expandedId, detailData]);

  const handleClose = () => {
    setShowForm(false);
    setForm(EMPTY_FORM);
    setComponents([{ ...EMPTY_COMP }]);
    setFormError('');
    dispatch(clearBatchesError());
  };

  const visible = batches.filter((b) => filter === 'all' || b.status === filter);
  const activeProducts = products.filter((p) => p.is_active);

  const usedIntakeIds = components.map((c) => c.intake_id).filter(Boolean);

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
        <div className="form-card">
          <div className="form-card__header">
            <h3>יצירת אצווה חדשה</h3>
            <button className="icon-btn" onClick={handleClose}><X size={18} /></button>
          </div>

          <form onSubmit={handleSubmit} className="manager-form">
            {formError && <div className="alert alert--error"><AlertCircle size={15} />{formError}</div>}

            <div className="form-field">
              <label>תוצ"ג יעד <span className="required">*</span></label>
              <select name="product_id" value={form.product_id} onChange={handleChange}>
                <option value="">— בחר מוצר —</option>
                {activeProducts.map((p) => (
                  <option key={p.id} value={p.id}>{`${p.name} (${p.sku})`}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>משקל אצווה כולל (ק"ג) <span className="required">*</span></label>
              <input
                name="output_weight_kg" type="number" step="0.01" min="0.01"
                value={form.output_weight_kg} onChange={handleChange}
                placeholder="לדוגמה: 480.00"
              />
            </div>

            <div className="form-field">
              <label>הערות</label>
              <input name="notes" value={form.notes} onChange={handleChange} placeholder="הערות נוספות לאצווה…" />
            </div>

            <div className="components-section">
              <div className="components-section__header">
                <label>מקורות קליטה <span className="required">*</span></label>
                <button type="button" className="btn-ghost btn-ghost--sm" onClick={addComponent}>
                  <Plus size={13} /> הוסף קליטה
                </button>
              </div>

              {components.map((comp, idx) => {
                const selectedIntake = intakes.find((i) => i.id === comp.intake_id);
                const availableIntakes = intakes.filter(
                  (i) => i.eligible_weight_kg > 0 && (!usedIntakeIds.includes(i.id) || i.id === comp.intake_id)
                );

                return (
                  <div key={idx} className="component-row">
                    <div className="component-row__select">
                      <select
                        value={comp.intake_id}
                        onChange={(e) => updateComponent(idx, 'intake_id', e.target.value)}
                      >
                        <option value="">— בחר קליטה —</option>
                        {availableIntakes.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.delivery_note_number} · {i.supplier_name} · {MATERIAL_TYPE_HE[i.material_type] || i.material_type} · {fmtKg(i.eligible_weight_kg)} זמין
                          </option>
                        ))}
                      </select>
                      {selectedIntake && (
                        <span className="field-hint">
                          זמין לשיוך: <strong>{fmtKg(selectedIntake.eligible_weight_kg)}</strong>
                        </span>
                      )}
                    </div>
                    <div className="component-row__weight">
                      <input
                        type="number" step="0.01" min="0.01"
                        placeholder={'משקל ק"ג'}
                        value={comp.weight_kg}
                        onChange={(e) => updateComponent(idx, 'weight_kg', e.target.value)}
                      />
                    </div>
                    {components.length > 1 && (
                      <button type="button" className="icon-btn icon-btn--danger" onClick={() => removeComponent(idx)} title="הסר">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}

              {totalAllocated > 0 && (
                <div className="allocation-summary">
                  <span>סה"כ מוקצה: <strong>{fmtKg(totalAllocated)}</strong></span>
                  {form.output_weight_kg && (() => {
                    const target = parseFloat(form.output_weight_kg);
                    const diff = Math.abs(totalAllocated - target);
                    return (
                      <span className={diff > 0.01 ? 'allocation-summary__warn' : 'allocation-summary__ok'} style={{ marginRight: '12px' }}>
                        יעד: <strong>{fmtKg(target)}</strong>
                        {diff > 0.01 && <span> · הפרש: {fmtKg(diff)}</span>}
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={handleClose} disabled={saving}>ביטול</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'יוצר…' : 'צור אצווה'}
              </button>
            </div>
          </form>
        </div>
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
                  <code className="mobile-card__sku">{shortId(b.id)} · {b.product_sku}</code>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {b.is_active === false ? (
                    <span className="badge badge--warn">חסומה</span>
                  ) : b.status === 'in_progress' ? (
                    <button className="status-toggle status-toggle--on" onClick={() => handleComplete(b)} title="לחץ לסיים אצווה" aria-pressed>
                      <span className="status-toggle__track"><span className="status-toggle__thumb" /></span>
                      <span className="status-toggle__label">פעיל</span>
                    </button>
                  ) : (
                    <span className={`badge ${STATUS_BADGE[b.status] || 'badge--neutral'}`}>
                      {STATUS_HE[b.status] || b.status}
                    </span>
                  )}
                  {b.is_active === false ? (
                    <RowActionsMenu items={[
                      { label: 'שחרר חסימה', icon: <LockOpen size={14} />, onClick: () => handleUnblock(b) },
                    ]} />
                  ) : b.status === 'in_progress' ? (
                    <RowActionsMenu items={[
                      { label: 'חסום אצווה', icon: <Lock size={14} />, onClick: () => handleBlock(b), danger: true },
                      { label: 'פסול אצווה', icon: <XOctagon size={14} />, onClick: () => handleFail(b), danger: true },
                      { label: 'בטל אצווה', icon: <XCircle size={14} />, onClick: () => handleCancel(b), danger: true },
                    ]} />
                  ) : null}
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
                <span className="mobile-card__label">תאריך:</span>
                <span>{fmtDate(b.created_at)}</span>
              </div>
              <button
                className="btn-ghost btn-ghost--sm"
                style={{ marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                onClick={() => toggleExpand(b.id)}
              >
                {expandedId === b.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {expandedId === b.id ? 'סגור פירוט' : 'מקורות קליטה'}
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
                            <code style={{ fontSize: '11px' }}>{c.delivery_note_number}</code>
                            <span className="tag" style={{ marginRight: '6px' }}>{MATERIAL_TYPE_HE[c.material_type] || c.material_type}</span>
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
