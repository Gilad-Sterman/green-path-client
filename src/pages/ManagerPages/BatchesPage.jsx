import { useEffect, useState, useCallback, Fragment } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Layers, Plus, X, AlertCircle, RefreshCw, CheckCircle2, XCircle, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import RowActionsMenu from '../../components/RowActionsMenu';
import Toast from '../../components/Toast';
import useRelativeTime from '../../hooks/useRelativeTime';
import { fetchBatches, createBatchThunk, completeBatchThunk, cancelBatchThunk, clearBatchesError } from '../../store/slices/batchesSlice';
import { fetchProducts } from '../../store/slices/productsSlice';
import { fetchIntakes } from '../../store/slices/intakesSlice';
import { getBatch } from '../../api/batches';

const STATUS_BADGE  = { in_progress: 'badge--warn', completed: 'badge--green', cancelled: 'badge--neutral' };
const STATUS_HE     = { in_progress: 'בתהליך', completed: 'הושלם', cancelled: 'בוטל' };
const FILTER_LABELS = { all: 'הכל', in_progress: 'בתהליך', completed: 'הושלם', cancelled: 'בוטל' };
const FILTERS       = ['all', 'in_progress', 'completed', 'cancelled'];
const MATERIAL_TYPE_HE = {
  plastic: 'פלסטיק', paper: 'נייר / קרטון', metal: 'מתכת',
  glass: 'זכוכית', textile: 'טקסטיל', rubber: 'גומי', mixed: 'מעורב', other: 'אחר',
};

const fmtKg   = (n) => n != null ? `${parseFloat(n).toLocaleString('he-IL', { maximumFractionDigits: 2 })} ק"ג` : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const shortId = (id) => id?.slice(0, 8).toUpperCase();

const EMPTY_FORM = { product_id: '', output_weight_kg: '', notes: '' };
const EMPTY_COMP = { intake_id: '', weight_kg: '' };

const BatchesPage = () => {
  const dispatch = useDispatch();
  const { list: batches, loading, error, lastFetched } = useSelector((s) => s.batches);
  const { list: products } = useSelector((s) => s.products);
  const { list: intakes }  = useSelector((s) => s.intakes);
  const refreshedLabel = useRelativeTime(lastFetched);

  const [searchParams] = useSearchParams();
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [components, setComponents]   = useState([{ ...EMPTY_COMP }]);
  const [saving, setSaving]           = useState(false);
  const [toast, setToast]             = useState('');
  const [formError, setFormError]     = useState('');
  const [filter, setFilter]           = useState('all');
  const [expandedId, setExpandedId]   = useState(null);
  const [detailData, setDetailData]   = useState({});
  const [detailLoading, setDetailLoading] = useState(false);

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

  const addComponent    = () => setComponents((p) => [...p, { ...EMPTY_COMP }]);
  const removeComponent = (idx) => setComponents((p) => p.filter((_, i) => i !== idx));
  const updateComponent = (idx, field, value) => {
    setComponents((p) => p.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
    setFormError('');
  };

  const totalAllocated = components.reduce((sum, c) => sum + (parseFloat(c.weight_kg) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.product_id)        { setFormError('יש לבחור מוצר.'); return; }
    if (!form.output_weight_kg)  { setFormError('יש להזין משקל אצווה כולל.'); return; }

    const validComps = components.filter((c) => c.intake_id && c.weight_kg);
    if (validComps.length === 0) { setFormError('יש להגדיר לפחות מקור קליטה אחד.'); return; }

    const hasIncomplete = components.some((c) => (c.intake_id && !c.weight_kg) || (!c.intake_id && c.weight_kg));
    if (hasIncomplete) { setFormError('לכל מקור קליטה יש להזין גם קליטה וגם משקל.'); return; }

    const sumComps = validComps.reduce((s, c) => s + parseFloat(c.weight_kg), 0);
    const target   = parseFloat(form.output_weight_kg);
    if (Math.abs(sumComps - target) > 0.01) {
      setFormError(`סך משקלי המקורות (${sumComps.toFixed(2)}) חייב להיות שווה למשקל האצווה הכולל (${target.toFixed(2)}).`);
      return;
    }

    const payload = {
      product_id:       form.product_id,
      output_weight_kg: parseFloat(form.output_weight_kg),
      notes:            form.notes || undefined,
      components:       validComps.map((c) => ({
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

  const handleCancel = async (batch) => {
    const result = await dispatch(cancelBatchThunk(batch.id));
    if (cancelBatchThunk.fulfilled.match(result)) {
      setToast(`אצווה ${shortId(batch.id)} בוטלה.`);
      dispatch(fetchIntakes({ force: true }));
    } else {
      setToast(result.payload || 'ביטול האצווה נכשל.');
    }
  };

  const toggleExpand = useCallback(async (batchId) => {
    if (expandedId === batchId) { setExpandedId(null); return; }
    setExpandedId(batchId);
    if (detailData[batchId]) return;
    setDetailLoading(true);
    try {
      const { data } = await getBatch(batchId);
      setDetailData((p) => ({ ...p, [batchId]: data.data.batch }));
    } catch (_) {}
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
          <p className="page-subtitle">שיוך קליטות חומר גלם לאצוות ייצור</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="refresh-group">
            {refreshedLabel && <span className="last-refreshed">{refreshedLabel}</span>}
            <button className="btn-ghost btn-ghost--icon" onClick={() => dispatch(fetchBatches({ force: true }))} disabled={loading} title="רענן">
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>
          </div>
          <button className="btn-primary btn-primary--sm" onClick={() => setShowForm(true)}>
            <Plus size={16} /> אצווה חדשה
          </button>
        </div>
      </div>

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

            <div className="form-row">
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
                    const diff   = Math.abs(totalAllocated - target);
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
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th></th>
                <th>מזהה אצווה</th>
                <th>מוצר</th>
                <th>משקל כולל</th>
                <th>נוצל</th>
                <th>נותר</th>
                <th>סטטוס</th>
                <th>תאריך יצירה</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((b) => (
                <Fragment key={b.id}>
                  <tr className={expandedId === b.id ? 'row--expanded' : ''}>
                    <td style={{ width: '32px', cursor: 'pointer' }} onClick={() => toggleExpand(b.id)}>
                      {expandedId === b.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </td>
                    <td><code style={{ fontSize: '12px' }}>{shortId(b.id)}</code></td>
                    <td className="td-primary">
                      {b.product_name}
                      <span className="td-muted" style={{ fontSize: '11px', marginLeft: '6px' }}>{b.product_sku}</span>
                    </td>
                    <td>{fmtKg(b.output_weight_kg)}</td>
                    <td>{fmtKg(b.used_weight_kg)}</td>
                    <td>{fmtKg(b.remaining_weight_kg)}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[b.status] || 'badge--neutral'}`}>
                        {STATUS_HE[b.status] || b.status}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(b.created_at)}</td>
                    <td>
                      {b.status === 'in_progress' && (
                        <RowActionsMenu items={[
                          { label: 'סמן כהושלם', icon: <CheckCircle2 size={14} />, onClick: () => handleComplete(b) },
                          { label: 'בטל אצווה',  icon: <XCircle size={14} />,     onClick: () => handleCancel(b), danger: true },
                        ]} />
                      )}
                    </td>
                  </tr>

                  {expandedId === b.id && (
                    <tr className="row--detail">
                      <td colSpan={9}>
                        <div className="batch-detail">
                          {detailLoading && <span className="td-muted">טוען פירוט…</span>}
                          {detailData[b.id] && (
                            <>
                              {detailData[b.id].notes && (
                                <p className="batch-detail__notes"><strong>הערות:</strong> {detailData[b.id].notes}</p>
                              )}
                              <table className="components-table">
                                <thead>
                                  <tr>
                                    <th>תעודת משלוח</th>
                                    <th>ספק</th>
                                    <th>סוג חומר</th>
                                    <th>משקל מוקצה</th>
                                    <th>תאריך קליטה</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {detailData[b.id].components?.map((c) => (
                                    <tr key={c.id}>
                                      <td><code style={{ fontSize: '12px' }}>{c.delivery_note_number}</code></td>
                                      <td>{c.supplier_name || '—'}</td>
                                      <td><span className="tag">{MATERIAL_TYPE_HE[c.material_type] || c.material_type}</span></td>
                                      <td>{fmtKg(c.weight_kg)}</td>
                                      <td>{fmtDate(c.intake_date)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BatchesPage;
