import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Truck, Plus, X, AlertCircle, RefreshCw, ChevronDown, ChevronUp, Trash2,
  CheckCircle2, XCircle, Send,
} from 'lucide-react';
import RowActionsMenu from '../../components/RowActionsMenu';
import DocumentUploader from '../../components/DocumentUploader';
import Toast from '../../components/Toast';
import useRelativeTime from '../../hooks/useRelativeTime';
import {
  fetchShipments, createShipmentThunk, updateShipmentStatusThunk, clearShipmentsError,
} from '../../store/slices/shipmentsSlice';
import { fetchFlagsSummary, invalidateFlags } from '../../store/slices/flagsSlice';
import { invalidateCredits } from '../../store/slices/creditsSlice';
import { fetchCustomers } from '../../store/slices/customersSlice';
import { fetchBatches } from '../../store/slices/batchesSlice';
import { getShipment } from '../../api/shipments';

const STATUS_BADGE = {
  created: 'badge--warn',
  shipped: 'badge--blue',
  delivered: 'badge--green',
  cancelled: 'badge--neutral',
};
const STATUS_HE = { created: 'נוצר', shipped: 'נשלח', delivered: 'נמסר', cancelled: 'בוטל' };

const STATUS_TRANSITIONS = {
  created: [
    { status: 'shipped', label: 'סמן כנשלח', icon: <Send size={14} /> },
    { status: 'cancelled', label: 'בטל משלוח', icon: <XCircle size={14} />, danger: true },
  ],
  shipped: [
    { status: 'delivered', label: 'סמן כנמסר', icon: <CheckCircle2 size={14} /> },
    { status: 'cancelled', label: 'בטל משלוח', icon: <XCircle size={14} />, danger: true },
  ],
};

const FILTERS = ['all', 'created', 'shipped', 'delivered', 'cancelled'];
const FILTER_LABELS = { all: 'הכל', created: 'נוצר', shipped: 'נשלח', delivered: 'נמסר', cancelled: 'בוטל' };

const fmtKg = (n) => n != null ? `${parseFloat(n).toLocaleString('he-IL', { maximumFractionDigits: 2 })} ק"ג` : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const shortId = (id) => id?.slice(0, 8).toUpperCase();

const EMPTY_FORM = { customer_id: '', shipment_date: '', destination_address: '', notes: '' };
const EMPTY_ITEM = { batch_id: '', weight_kg: '' };

const ShipmentsPage = () => {
  const dispatch = useDispatch();
  const { list: shipments, loading, error, lastFetched } = useSelector((s) => s.shipments);
  const { list: customers } = useSelector((s) => s.customers);
  const { list: batches } = useSelector((s) => s.batches);
  const refreshedLabel = useRelativeTime(lastFetched);

  const [searchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [shipmentDocId, setShipmentDocId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [formError, setFormError] = useState('');
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [detailData, setDetailData] = useState({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    dispatch(fetchShipments({ force: false }));
    dispatch(fetchCustomers());
    dispatch(fetchBatches({ force: false }));
  }, [dispatch]);

  useEffect(() => {
    if (searchParams.get('new') === '1') setShowForm(true);
  }, [searchParams]);

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setFormError('');
  };

  const addItem = () => setItems((p) => [...p, { ...EMPTY_ITEM }]);
  const removeItem = (idx) => setItems((p) => p.filter((_, i) => i !== idx));
  const updateItem = (idx, field, value) => {
    setItems((p) => p.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
    setFormError('');
  };

  const usedBatchIds = items.map((it) => it.batch_id).filter(Boolean);

  const totalShipWeight = items.reduce((sum, it) => sum + (parseFloat(it.weight_kg) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_id) { setFormError('יש לבחור לקוח.'); return; }
    if (!form.shipment_date) { setFormError('יש להזין תאריך משלוח.'); return; }
    if (!form.destination_address.trim()) { setFormError('יש להזין כתובת יעד.'); return; }

    const validItems = items.filter((it) => it.batch_id && it.weight_kg);
    if (validItems.length === 0) { setFormError('יש לבחור לפחות אצווה אחת.'); return; }
    const hasIncomplete = items.some((it) => (it.batch_id && !it.weight_kg) || (!it.batch_id && it.weight_kg));
    if (hasIncomplete) { setFormError('כל שורה חייבת לכלול אצווה ומשקל.'); return; }

    const payload = {
      customer_id: form.customer_id,
      shipment_date: form.shipment_date,
      destination_address: form.destination_address.trim(),
      notes: form.notes || undefined,
      document_ids: shipmentDocId ? [shipmentDocId] : [],
      items: validItems.map((it) => ({
        batch_id: it.batch_id,
        weight_kg: parseFloat(it.weight_kg),
      })),
    };

    setSaving(true);
    const result = await dispatch(createShipmentThunk(payload));
    setSaving(false);

    if (createShipmentThunk.fulfilled.match(result)) {
      setToast('משלוח נוצר — זיכויים נוצרו אוטומטית.');
      dispatch(invalidateCredits());
      dispatch(fetchBatches({ force: true }));
      dispatch(fetchFlagsSummary());
      dispatch(invalidateFlags());
      handleClose();
    } else {
      setFormError(result.payload || 'יצירת המשלוח נכשלה.');
    }
  };

  const handleStatusChange = (shipment, status) => {
    if (status === 'cancelled') {
      setConfirm({
        title: 'ביטול משלוח',
        lines: ['ביטול המשלוח הוא פעולה סופית.'],
        warning: 'פעולה בלתי הפיכה.',
        label: 'בטל משלוח',
        danger: true,
        onConfirm: async () => {
          setConfirm(null);
          const result = await dispatch(updateShipmentStatusThunk({ id: shipment.id, status }));
          if (updateShipmentStatusThunk.fulfilled.match(result)) {
            setToast(`משלוח ${shortId(shipment.id)} בוטל.`);
            if (detailData[shipment.id]) setDetailData((p) => ({ ...p, [shipment.id]: { ...p[shipment.id], status } }));
          } else {
            setToast(result.payload || 'עדכון סטטוס נכשל.');
          }
        },
      });
      return;
    }
    dispatch(updateShipmentStatusThunk({ id: shipment.id, status })).then((result) => {
      if (updateShipmentStatusThunk.fulfilled.match(result)) {
        setToast(`משלוח ${shortId(shipment.id)} עודכן ל${STATUS_HE[status]}.`);
        if (detailData[shipment.id]) setDetailData((p) => ({ ...p, [shipment.id]: { ...p[shipment.id], status } }));
      } else {
        setToast(result.payload || 'עדכון סטטוס נכשל.');
      }
    });
  };

  const toggleExpand = useCallback(async (shipmentId) => {
    if (expandedId === shipmentId) { setExpandedId(null); return; }
    setExpandedId(shipmentId);
    if (detailData[shipmentId]) return;
    setDetailLoading(true);
    try {
      const { data } = await getShipment(shipmentId);
      setDetailData((p) => ({ ...p, [shipmentId]: data.data.shipment }));
    } catch (_) { }
    setDetailLoading(false);
  }, [expandedId, detailData]);

  const handleClose = () => {
    setShowForm(false);
    setForm(EMPTY_FORM);
    setItems([{ ...EMPTY_ITEM }]);
    setShipmentDocId(null);
    setFormError('');
    dispatch(clearShipmentsError());
  };

  const visible = shipments.filter((s) => filter === 'all' || s.status === filter);
  const activeCustomers = customers.filter((c) => c.is_active);
  const shippableBatches = batches.filter(
    (b) => b.status !== 'cancelled' && b.status !== 'failed' &&
      b.is_active !== false && parseFloat(b.remaining_weight_kg) > 0
  );

  return (
    <div className="manager-page">
      <div className="manager-page__header">
        <div>
          <h1>משלוחים</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="refresh-group">
            {refreshedLabel && <span className="last-refreshed">{refreshedLabel}</span>}
            <button
              className="btn-ghost btn-ghost--icon"
              onClick={() => dispatch(fetchShipments({ force: true }))}
              disabled={loading}
              title="רענן"
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>
      </div>
      <button className="btn-primary new-shipment-btn" onClick={() => setShowForm(true)}>
        <Plus size={16} /> משלוח חדש
      </button>

      <Toast message={toast} onClose={() => setToast('')} />
      {error && <div className="alert alert--error"><AlertCircle size={16} />{error}</div>}

      {showForm && (
        <div className="form-card">
          <div className="form-card__header">
            <h3>יצירת משלוח חדש</h3>
            <button className="icon-btn" onClick={handleClose}><X size={18} /></button>
          </div>

          <form onSubmit={handleSubmit} className="manager-form">
            {formError && (
              <div className="alert alert--error"><AlertCircle size={15} />{formError}</div>
            )}

            <div className="form-field">
              <label>לקוח <span className="required">*</span></label>
              <select name="customer_id" value={form.customer_id} onChange={handleChange}>
                <option value="">— בחר לקוח —</option>
                {activeCustomers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>תאריך משלוח <span className="required">*</span></label>
              <input
                name="shipment_date"
                type="date"
                value={form.shipment_date}
                onChange={handleChange}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="form-field">
              <label>כתובת יעד <span className="required">*</span></label>
              <input
                name="destination_address"
                value={form.destination_address}
                onChange={handleChange}
                placeholder="לדוגמה: רחוב התעשייה 12, תל אביב"
              />
            </div>

            <div className="form-field">
              <label>הערות</label>
              <input name="notes" value={form.notes} onChange={handleChange} placeholder="הערות אופציונליות…" />
            </div>

            <div className="form-field">
              <label>מסמך משלוח <span className="form-hint">(אופציונלי — חשבונית / תעודת משלוח)</span></label>
              <DocumentUploader
                documentType="invoice_out"
                label="צרף מסמך"
                onDocumentReady={(id) => setShipmentDocId(id)}
                disabled={saving}
              />
            </div>

            <div className="components-section">
              <div className="components-section__header">
                <label>אצוות משלוח <span className="required">*</span></label>
                <button type="button" className="btn-ghost btn-ghost--sm" onClick={addItem}>
                  <Plus size={13} /> הוסף אצווה
                </button>
              </div>

              {items.map((item, idx) => {
                const selectedBatch = batches.find((b) => b.id === item.batch_id);
                const availableBatches = shippableBatches.filter(
                  (b) => !usedBatchIds.includes(b.id) || b.id === item.batch_id
                );

                return (
                  <div key={idx} className="component-row">
                    <div className="component-row__select">
                      <select
                        value={item.batch_id}
                        onChange={(e) => updateItem(idx, 'batch_id', e.target.value)}
                      >
                        <option value="">— בחר אצווה —</option>
                        {availableBatches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {shortId(b.id)} · {b.product_name} · {fmtKg(b.remaining_weight_kg)} נותר
                          </option>
                        ))}
                      </select>
                      {selectedBatch && (
                        <span className="field-hint">
                          יתרה: <strong>{fmtKg(selectedBatch.remaining_weight_kg)}</strong>
                          <span className="td-muted" style={{ marginRight: '6px' }}>
                            · {selectedBatch.product_sku}
                          </span>
                        </span>
                      )}
                    </div>
                    <div className="component-row__weight">
                      <input
                        type="number" step="0.01" min="0.01"
                        placeholder='משקל ק"ג'
                        value={item.weight_kg}
                        onChange={(e) => updateItem(idx, 'weight_kg', e.target.value)}
                      />
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        className="icon-btn icon-btn--danger"
                        onClick={() => removeItem(idx)}
                        title="הסר"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}

              {totalShipWeight > 0 && (
                <div className="allocation-summary">
                  <span>סך משקל המשלוח: <strong>{fmtKg(totalShipWeight)}</strong></span>
                  <span className="td-muted" style={{ marginRight: '12px' }}>
                    זיכויים ייווצרו אוטומטית בשמירה
                  </span>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={handleClose} disabled={saving}>
                ביטול
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'יוצר…' : 'צור משלוח'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="filter-tabs">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`filter-tab${filter === f ? ' filter-tab--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {FILTER_LABELS[f]}
            <span style={{ marginRight: '6px', opacity: 0.6, fontSize: '11px' }}>
              ({f === 'all' ? shipments.length : shipments.filter((s) => s.status === f).length})
            </span>
          </button>
        ))}
      </div>

      {loading && <div className="loading-row">טוען משלוחים…</div>}

      {!loading && visible.length === 0 && (
        <div className="empty-state">
          <Truck size={36} />
          <p>
            {shipments.length === 0
              ? 'טרם נוצרו משלוחים. צור את הראשון.'
              : 'אין משלוחים התואמים לסינון הנוכחי.'}
          </p>
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div className="mobile-cards">
          {visible.map((s) => (
            <div key={s.id} className="mobile-card">
              <div className="mobile-card__header">
                <div>
                  <span className="mobile-card__title">{s.customer_name}</span>
                  <code className="mobile-card__sku">{shortId(s.id)}</code>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`badge ${STATUS_BADGE[s.status] || 'badge--neutral'}`}>
                    {STATUS_HE[s.status] || s.status}
                  </span>
                  {STATUS_TRANSITIONS[s.status] && (
                    <RowActionsMenu items={STATUS_TRANSITIONS[s.status].map((t) => ({
                      label: t.label, icon: t.icon, danger: t.danger,
                      onClick: () => handleStatusChange(s, t.status),
                    }))} />
                  )}
                </div>
              </div>
              <div className="mobile-card__row">
                <span className="mobile-card__label">תאריך:</span>
                <span>{fmtDate(s.shipment_date)}</span>
              </div>
              <div className="mobile-card__row">
                <span className="mobile-card__label">יציאה כשירה:</span>
                <strong>{fmtKg(s.eligible_output_kg)}</strong>
              </div>
              <div className="mobile-card__row">
                <span className="mobile-card__label">יעד:</span>
                <span>{s.destination_address}</span>
              </div>
              <button
                className="btn-ghost btn-ghost--sm"
                style={{ marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                onClick={() => toggleExpand(s.id)}
              >
                {expandedId === s.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {expandedId === s.id ? 'סגור פירוט' : 'אצוות משלוח'}
              </button>
              {expandedId === s.id && (
                <div className="batch-card-detail">
                  {detailLoading && <span className="td-muted">טוען…</span>}
                  {detailData[s.id] && (
                    <>
                      {detailData[s.id].notes && (
                        <p className="batch-card-detail__notes"><strong>הערות:</strong> {detailData[s.id].notes}</p>
                      )}
                      {detailData[s.id].items?.map((it) => (
                        <div key={it.id} className="batch-card-detail__row">
                          <div>
                            <code style={{ fontSize: '11px' }}>{shortId(it.batch_id)}</code>
                            <span className="tag" style={{ marginRight: '6px' }}>{it.product_sku || '—'}</span>
                          </div>
                          <strong>{fmtKg(it.weight_kg)}</strong>
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

export default ShipmentsPage;
