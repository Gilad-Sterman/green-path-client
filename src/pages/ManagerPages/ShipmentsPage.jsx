import { useEffect, useState, useCallback, Fragment } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Truck, Plus, X, AlertCircle, RefreshCw, ChevronDown, ChevronUp, Trash2,
  Package2, CheckCircle2, XCircle, Send,
} from 'lucide-react';
import RowActionsMenu from '../../components/RowActionsMenu';
import Toast from '../../components/Toast';
import useRelativeTime from '../../hooks/useRelativeTime';
import {
  fetchShipments, createShipmentThunk, updateShipmentStatusThunk, clearShipmentsError,
} from '../../store/slices/shipmentsSlice';
import { invalidateCredits } from '../../store/slices/creditsSlice';
import { fetchCustomers } from '../../store/slices/customersSlice';
import { fetchBatches } from '../../store/slices/batchesSlice';
import { getShipment } from '../../api/shipments';

const STATUS_BADGE = {
  created:   'badge--warn',
  shipped:   'badge--blue',
  delivered: 'badge--green',
  cancelled: 'badge--neutral',
};

const STATUS_TRANSITIONS = {
  created: [
    { status: 'shipped',   label: 'Mark as shipped',    icon: <Send size={14} /> },
    { status: 'cancelled', label: 'Cancel shipment',    icon: <XCircle size={14} />, danger: true },
  ],
  shipped: [
    { status: 'delivered', label: 'Mark as delivered',  icon: <CheckCircle2 size={14} /> },
    { status: 'cancelled', label: 'Cancel shipment',    icon: <XCircle size={14} />, danger: true },
  ],
};

const FILTERS = ['all', 'created', 'shipped', 'delivered', 'cancelled'];

const fmtKg   = (n) => n != null ? `${parseFloat(n).toLocaleString(undefined, { maximumFractionDigits: 2 })} kg` : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const shortId = (id) => id?.slice(0, 8).toUpperCase();

const EMPTY_FORM = { customer_id: '', shipment_date: '', destination_address: '', notes: '' };
const EMPTY_ITEM = { batch_id: '', weight_kg: '' };

const ShipmentsPage = () => {
  const dispatch = useDispatch();
  const { list: shipments, loading, error, lastFetched } = useSelector((s) => s.shipments);
  const { list: customers } = useSelector((s) => s.customers);
  const { list: batches }   = useSelector((s) => s.batches);
  const refreshedLabel = useRelativeTime(lastFetched);

  const [searchParams] = useSearchParams();
  const [showForm, setShowForm]         = useState(false);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [items, setItems]               = useState([{ ...EMPTY_ITEM }]);
  const [saving, setSaving]             = useState(false);
  const [toast, setToast]               = useState('');
  const [formError, setFormError]       = useState('');
  const [filter, setFilter]             = useState('all');
  const [expandedId, setExpandedId]     = useState(null);
  const [detailData, setDetailData]     = useState({});
  const [detailLoading, setDetailLoading] = useState(false);

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

  const addItem    = () => setItems((p) => [...p, { ...EMPTY_ITEM }]);
  const removeItem = (idx) => setItems((p) => p.filter((_, i) => i !== idx));
  const updateItem = (idx, field, value) => {
    setItems((p) => p.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
    setFormError('');
  };

  const usedBatchIds = items.map((it) => it.batch_id).filter(Boolean);

  const totalShipWeight = items.reduce((sum, it) => sum + (parseFloat(it.weight_kg) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_id)              { setFormError('Customer is required.'); return; }
    if (!form.shipment_date)            { setFormError('Shipment date is required.'); return; }
    if (!form.destination_address.trim()) { setFormError('Destination address is required.'); return; }

    const validItems = items.filter((it) => it.batch_id && it.weight_kg);
    if (validItems.length === 0)        { setFormError('At least one batch item is required.'); return; }
    const hasIncomplete = items.some((it) => (it.batch_id && !it.weight_kg) || (!it.batch_id && it.weight_kg));
    if (hasIncomplete)                  { setFormError('Each item needs both a batch and a weight.'); return; }

    const payload = {
      customer_id:         form.customer_id,
      shipment_date:       form.shipment_date,
      destination_address: form.destination_address.trim(),
      notes:               form.notes || undefined,
      items:               validItems.map((it) => ({
        batch_id:  it.batch_id,
        weight_kg: parseFloat(it.weight_kg),
      })),
    };

    setSaving(true);
    const result = await dispatch(createShipmentThunk(payload));
    setSaving(false);

    if (createShipmentThunk.fulfilled.match(result)) {
      setToast('Shipment created — credits auto-generated.');
      dispatch(invalidateCredits());
      dispatch(fetchBatches({ force: true }));
      handleClose();
    } else {
      setFormError(result.payload || 'Failed to create shipment.');
    }
  };

  const handleStatusChange = async (shipment, status) => {
    const result = await dispatch(updateShipmentStatusThunk({ id: shipment.id, status }));
    if (updateShipmentStatusThunk.fulfilled.match(result)) {
      const label = status.charAt(0).toUpperCase() + status.slice(1);
      setToast(`Shipment ${shortId(shipment.id)} marked as ${label}.`);
      if (detailData[shipment.id]) {
        setDetailData((p) => ({ ...p, [shipment.id]: { ...p[shipment.id], status } }));
      }
    } else {
      setToast(result.payload || 'Failed to update status.');
    }
  };

  const toggleExpand = useCallback(async (shipmentId) => {
    if (expandedId === shipmentId) { setExpandedId(null); return; }
    setExpandedId(shipmentId);
    if (detailData[shipmentId]) return;
    setDetailLoading(true);
    try {
      const { data } = await getShipment(shipmentId);
      setDetailData((p) => ({ ...p, [shipmentId]: data.data.shipment }));
    } catch (_) {}
    setDetailLoading(false);
  }, [expandedId, detailData]);

  const handleClose = () => {
    setShowForm(false);
    setForm(EMPTY_FORM);
    setItems([{ ...EMPTY_ITEM }]);
    setFormError('');
    dispatch(clearShipmentsError());
  };

  const visible = shipments.filter((s) => filter === 'all' || s.status === filter);
  const activeCustomers = customers.filter((c) => c.is_active);
  const shippableBatches = batches.filter(
    (b) => b.status !== 'cancelled' && parseFloat(b.remaining_weight_kg) > 0
  );

  return (
    <div className="manager-page">
      <div className="manager-page__header">
        <div>
          <h1>Shipments</h1>
          <p className="page-subtitle">Ship batches to customers and generate recycling credits</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="refresh-group">
            {refreshedLabel && <span className="last-refreshed">{refreshedLabel}</span>}
            <button
              className="btn-ghost btn-ghost--icon"
              onClick={() => dispatch(fetchShipments({ force: true }))}
              disabled={loading}
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>
          </div>
          <button className="btn-primary btn-primary--sm" onClick={() => setShowForm(true)}>
            <Plus size={16} /> New Shipment
          </button>
        </div>
      </div>

      <Toast message={toast} onClose={() => setToast('')} />
      {error && <div className="alert alert--error"><AlertCircle size={16} />{error}</div>}

      {showForm && (
        <div className="form-card">
          <div className="form-card__header">
            <h3>Create New Shipment</h3>
            <button className="icon-btn" onClick={handleClose}><X size={18} /></button>
          </div>

          <form onSubmit={handleSubmit} className="manager-form">
            {formError && (
              <div className="alert alert--error"><AlertCircle size={15} />{formError}</div>
            )}

            <div className="form-row">
              <div className="form-field">
                <label>Customer <span className="required">*</span></label>
                <select name="customer_id" value={form.customer_id} onChange={handleChange}>
                  <option value="">— Select customer —</option>
                  {activeCustomers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Shipment date <span className="required">*</span></label>
                <input
                  name="shipment_date"
                  type="date"
                  value={form.shipment_date}
                  onChange={handleChange}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div className="form-field">
              <label>Destination address <span className="required">*</span></label>
              <input
                name="destination_address"
                value={form.destination_address}
                onChange={handleChange}
                placeholder="e.g. 12 Industrial St, Tel Aviv"
              />
            </div>

            <div className="form-field">
              <label>Notes</label>
              <input name="notes" value={form.notes} onChange={handleChange} placeholder="Optional notes…" />
            </div>

            <div className="components-section">
              <div className="components-section__header">
                <label>Batch items <span className="required">*</span></label>
                <button type="button" className="btn-ghost btn-ghost--sm" onClick={addItem}>
                  <Plus size={13} /> Add batch
                </button>
              </div>

              {items.map((item, idx) => {
                const selectedBatch  = batches.find((b) => b.id === item.batch_id);
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
                        <option value="">— Select batch —</option>
                        {availableBatches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {shortId(b.id)} · {b.product_name} · {fmtKg(b.remaining_weight_kg)} remaining
                          </option>
                        ))}
                      </select>
                      {selectedBatch && (
                        <span className="field-hint">
                          Remaining: <strong>{fmtKg(selectedBatch.remaining_weight_kg)}</strong>
                          <span className="td-muted" style={{ marginLeft: '6px' }}>
                            · {selectedBatch.product_sku}
                          </span>
                        </span>
                      )}
                    </div>
                    <div className="component-row__weight">
                      <input
                        type="number" step="0.01" min="0.01"
                        placeholder="Weight kg"
                        value={item.weight_kg}
                        onChange={(e) => updateItem(idx, 'weight_kg', e.target.value)}
                      />
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        className="icon-btn icon-btn--danger"
                        onClick={() => removeItem(idx)}
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}

              {totalShipWeight > 0 && (
                <div className="allocation-summary">
                  <span>Total shipment weight: <strong>{totalShipWeight.toFixed(2)} kg</strong></span>
                  <span className="td-muted" style={{ marginLeft: '12px' }}>
                    Credits will be auto-generated on save
                  </span>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={handleClose} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Creating…' : 'Create shipment'}
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
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            <span style={{ marginRight: '6px', opacity: 0.6, fontSize: '11px' }}>
              ({f === 'all' ? shipments.length : shipments.filter((s) => s.status === f).length})
            </span>
          </button>
        ))}
      </div>

      {loading && <div className="loading-row">Loading shipments…</div>}

      {!loading && visible.length === 0 && (
        <div className="empty-state">
          <Truck size={36} />
          <p>
            {shipments.length === 0
              ? 'No shipments yet. Create the first one.'
              : 'No shipments match the current filter.'}
          </p>
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th></th>
                <th>Shipment ID</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Eligible output</th>
                <th>Status</th>
                <th>Destination</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <Fragment key={s.id}>
                  <tr className={expandedId === s.id ? 'row--expanded' : ''}>
                    <td style={{ width: '32px', cursor: 'pointer' }} onClick={() => toggleExpand(s.id)}>
                      {expandedId === s.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </td>
                    <td><code style={{ fontSize: '12px' }}>{shortId(s.id)}</code></td>
                    <td className="td-primary">{s.customer_name}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(s.shipment_date)}</td>
                    <td>{fmtKg(s.eligible_output_kg)}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[s.status] || 'badge--neutral'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="td-truncate" title={s.destination_address}>
                      {s.destination_address}
                    </td>
                    <td>
                      {STATUS_TRANSITIONS[s.status] && (
                        <RowActionsMenu
                          items={STATUS_TRANSITIONS[s.status].map((t) => ({
                            label:   t.label,
                            icon:    t.icon,
                            variant: t.danger ? 'danger' : undefined,
                            onClick: () => handleStatusChange(s, t.status),
                          }))}
                        />
                      )}
                    </td>
                  </tr>

                  {expandedId === s.id && (
                    <tr className="row--detail">
                      <td colSpan={8}>
                        <div className="batch-detail">
                          {detailLoading && <span className="td-muted">Loading items…</span>}
                          {detailData[s.id] && (
                            <>
                              {detailData[s.id].notes && (
                                <p className="batch-detail__notes">
                                  <strong>Notes:</strong> {detailData[s.id].notes}
                                </p>
                              )}
                              <p className="batch-detail__notes">
                                <strong>Destination:</strong> {detailData[s.id].destination_address}
                              </p>
                              <table className="components-table">
                                <thead>
                                  <tr>
                                    <th>Batch ID</th>
                                    <th>Product</th>
                                    <th>SKU</th>
                                    <th>Weight shipped</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {detailData[s.id].items?.map((it) => (
                                    <tr key={it.id}>
                                      <td><code style={{ fontSize: '12px' }}>{shortId(it.batch_id)}</code></td>
                                      <td>{it.product_name || '—'}</td>
                                      <td><span className="tag">{it.product_sku || '—'}</span></td>
                                      <td>{fmtKg(it.weight_kg)}</td>
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

export default ShipmentsPage;
