import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Truck, Plus, AlertCircle, RefreshCw, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Send, FileText, Clock, AlertTriangle,
} from 'lucide-react';
import RowActionsMenu from '../../components/RowActionsMenu';
import Toast from '../../components/Toast';
import useRelativeTime from '../../hooks/useRelativeTime';
import ShipmentForm from './ShipmentForm';
import {
  fetchShipments, updateShipmentStatusThunk,
} from '../../store/slices/shipmentsSlice';
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

const ShipmentsPage = () => {
  const dispatch = useDispatch();
  const { list: shipments, loading, error, lastFetched } = useSelector((s) => s.shipments);
  const { user } = useSelector((s) => s.auth);
  const isManager = user?.role !== 'employee';
  const refreshedLabel = useRelativeTime(lastFetched);

  const [searchParams] = useSearchParams();
  const [showForm, setShowForm]     = useState(false);
  const [toast, setToast]           = useState('');
  const [filter, setFilter]         = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [detailData, setDetailData] = useState({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirm, setConfirm]       = useState(null);

  useEffect(() => {
    dispatch(fetchShipments({ force: false }));
    dispatch(fetchCustomers());
    dispatch(fetchBatches({ force: false }));
  }, [dispatch]);

  useEffect(() => {
    if (searchParams.get('new') === '1') setShowForm(true);
  }, [searchParams]);

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

  const visible = shipments.filter((s) => filter === 'all' || s.status === filter);

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
        <ShipmentForm
          onClose={() => setShowForm(false)}
          onSuccess={(msg) => { setToast(msg); setShowForm(false); dispatch(fetchShipments({ force: true })); }}
        />
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
                  {isManager && STATUS_TRANSITIONS[s.status] && (
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
              {s.delivery_note_number && (
                <div className="mobile-card__row">
                  <span className="mobile-card__label">תעודת משלוח:</span>
                  <code style={{ fontSize: '11px' }}>{s.delivery_note_number}</code>
                </div>
              )}
              <div className="shipment-invoice-row">
                <span className="shipment-invoice-row__label">
                  <FileText size={12} /> חשבונית
                </span>
                {s.invoice_status === 'received' ? (
                  <span className="shipment-invoice-status shipment-invoice-status--received">
                    <CheckCircle2 size={12} /> {s.invoice_number}
                  </span>
                ) : s.invoice_status === 'failed' ? (
                  <span className="shipment-invoice-status shipment-invoice-status--failed">
                    <AlertTriangle size={12} /> שגיאה בסנכרון
                  </span>
                ) : (
                  <span className="shipment-invoice-status shipment-invoice-status--pending">
                    <Clock size={12} /> ממתין לחשבשבת
                  </span>
                )}
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
                      {detailData[s.id].lab_test_number && (
                        <p className="batch-card-detail__notes">
                          <strong>בדיקת מעבדה:</strong> {detailData[s.id].lab_test_number}
                        </p>
                      )}
                      {detailData[s.id].notes && (
                        <p className="batch-card-detail__notes"><strong>הערות:</strong> {detailData[s.id].notes}</p>
                      )}
                      {detailData[s.id].invoice_status === 'received' && detailData[s.id].invoice_number && (
                        <div className="shipment-invoice-detail">
                          <CheckCircle2 size={13} className="shipment-invoice-detail__icon shipment-invoice-detail__icon--ok" />
                          <div>
                            <strong>חשבונית {detailData[s.id].invoice_number}</strong>
                            {detailData[s.id].invoice_date && (
                              <span className="td-muted" style={{ marginRight: '6px', fontSize: '11px' }}>
                                {fmtDate(detailData[s.id].invoice_date)}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {detailData[s.id].items?.map((it) => (
                        <div key={it.id} className="batch-card-detail__row">
                          <div>
                            <code style={{ fontSize: '11px' }}>{shortId(it.batch_id)}</code>
                            <span className="tag" style={{ marginRight: '6px' }}>{it.product_sku || it.product_name || '—'}</span>
                            {it.eligible_percent != null && (
                              <span className="td-muted" style={{ fontSize: '11px', marginRight: '4px' }}>
                                {it.eligible_percent}%
                              </span>
                            )}
                          </div>
                          <div style={{ textAlign: 'left', fontSize: '12px' }}>
                            <strong>{fmtKg(it.weight_kg)}</strong>
                            {it.credit > 0 && (
                              <div className="td-muted">קרדיט: {fmtKg(it.credit)}</div>
                            )}
                          </div>
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
