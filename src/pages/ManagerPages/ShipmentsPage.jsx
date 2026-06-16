import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Truck, Plus, AlertCircle, RefreshCw, Eye, X,
  CheckCircle2, XCircle, Send, FileText, Clock, AlertTriangle,
} from 'lucide-react';
import RowActionsMenu from '../../components/RowActionsMenu';
import Toast from '../../components/Toast';
import ShipmentDetailDrawer from '../../components/ShipmentDetailDrawer';
import useRelativeTime from '../../hooks/useRelativeTime';
import ShipmentForm from './ShipmentForm';
import {
  fetchShipments, updateShipmentStatusThunk,
} from '../../store/slices/shipmentsSlice';
import { fetchCustomers } from '../../store/slices/customersSlice';
import { fetchBatches } from '../../store/slices/batchesSlice';
import { getShipment, updateShipmentInvoice } from '../../api/shipments';

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
  const [showForm, setShowForm]         = useState(false);
  const [toast, setToast]               = useState('');
  const [filter, setFilter]             = useState('all');
  const [confirm, setConfirm]           = useState(null);
  const [viewingShipment, setViewingShipment] = useState(null);
  const [viewingDetail,   setViewingDetail]   = useState(null);
  const [viewingLoading,  setViewingLoading]  = useState(false);
  const [invoiceModal,    setInvoiceModal]    = useState(null);
  const [invoiceNumber,   setInvoiceNumber]   = useState('');
  const [invoiceDate,     setInvoiceDate]     = useState('');
  const [invoiceSaving,   setInvoiceSaving]   = useState(false);
  const [invoiceError,    setInvoiceError]    = useState('');

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
      } else {
        setToast(result.payload || 'עדכון סטטוס נכשל.');
      }
    });
  };

  const openDetail = async (s) => {
    setViewingShipment(s);
    setViewingDetail(null);
    setViewingLoading(true);
    try {
      const { data } = await getShipment(s.id);
      setViewingDetail(data.data.shipment);
    } catch (_) { }
    setViewingLoading(false);
  };

  const openInvoiceModal = (s) => {
    setInvoiceModal(s);
    setInvoiceNumber('');
    setInvoiceDate('');
    setInvoiceError('');
  };

  const handleInvoiceSubmit = async (e) => {
    e.preventDefault();
    if (!invoiceNumber.trim()) { setInvoiceError('יש להזין מספר חשבונית.'); return; }
    setInvoiceSaving(true);
    try {
      await updateShipmentInvoice(invoiceModal.id, {
        invoice_number: invoiceNumber.trim(),
        invoice_date:   invoiceDate || undefined,
      });
      setToast('חשבונית נשמרה בהצלחה.');
      dispatch(fetchShipments({ force: true }));
      setInvoiceModal(null);
    } catch (err) {
      setInvoiceError(err.response?.data?.error?.message || 'שמירת חשבונית נכשלה.');
    }
    setInvoiceSaving(false);
  };

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
                  {isManager && (
                    <RowActionsMenu items={[
                      { label: 'צפייה בפרטים', icon: <Eye size={14} />, onClick: () => openDetail(s) },
                      ...(s.invoice_status !== 'received' && s.status !== 'cancelled'
                        ? [{ label: 'הוספת חשבונית', icon: <FileText size={14} />, onClick: () => openInvoiceModal(s) }]
                        : []),
                      ...(STATUS_TRANSITIONS[s.status] || []).map((t) => ({
                        label: t.label, icon: t.icon, danger: t.danger,
                        onClick: () => handleStatusChange(s, t.status),
                      })),
                    ]} />
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
            </div>
          ))}
        </div>
      )}

      {/* Shipment detail drawer */}
      {viewingShipment && (
        <ShipmentDetailDrawer
          shipment={viewingDetail || viewingShipment}
          loading={viewingLoading}
          onClose={() => { setViewingShipment(null); setViewingDetail(null); }}
        />
      )}

      {/* Manual invoice modal */}
      {invoiceModal && (
        <div className="modal-overlay" onClick={() => setInvoiceModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3>הוספת חשבונית</h3>
              <button className="icon-btn" onClick={() => setInvoiceModal(null)} aria-label="סגור"><X size={18} /></button>
            </div>
            <div className="modal__body">
              <p style={{ fontSize: '13px', marginBottom: '12px', opacity: 0.7 }}>
                משלוח ללקוח <strong>{invoiceModal.customer_name}</strong>
              </p>
              <form onSubmit={handleInvoiceSubmit} className="manager-form">
                {invoiceError && (
                  <div className="alert alert--error"><AlertCircle size={15} />{invoiceError}</div>
                )}
                <div className="form-field">
                  <label>מספר חשבונית <span className="required">*</span></label>
                  <input
                    value={invoiceNumber}
                    onChange={(e) => { setInvoiceNumber(e.target.value); setInvoiceError(''); }}
                    placeholder="לדוגמא: INV-2024-001"
                    maxLength={60}
                  />
                </div>
                <div className="form-field">
                  <label>תאריך חשבונית <span className="form-hint">(אופציונלי)</span></label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn-ghost" onClick={() => setInvoiceModal(null)} disabled={invoiceSaving}>ביטול</button>
                  <button type="submit" className="btn-primary" disabled={invoiceSaving}>
                    {invoiceSaving ? 'שומר…' : 'שמור חשבונית'}
                  </button>
                </div>
              </form>
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

export default ShipmentsPage;
