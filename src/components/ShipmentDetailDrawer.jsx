import { X, CheckCircle2, Clock, AlertTriangle, FileText, Loader2 } from 'lucide-react';

const fmtKg   = (n) => n != null ? `${parseFloat(n).toLocaleString('he-IL', { maximumFractionDigits: 2 })} ק"ג` : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const shortId = (id) => id?.slice(0, 8).toUpperCase();

const STATUS_HE    = { created: 'נוצר', shipped: 'נשלח', delivered: 'נמסר', cancelled: 'בוטל' };
const STATUS_BADGE = { created: 'badge--warn', shipped: 'badge--blue', delivered: 'badge--green', cancelled: 'badge--neutral' };

const ShipmentDetailDrawer = ({ shipment, loading, onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div>
            <h3>{shipment?.customer_name || '—'}</h3>
            {shipment && (
              <code className="mobile-card__sku" style={{ fontSize: '11px' }}>{shortId(shipment.id)}</code>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {shipment && (
              <span className={`badge ${STATUS_BADGE[shipment.status] || 'badge--neutral'}`}>
                {STATUS_HE[shipment.status] || shipment.status}
              </span>
            )}
            <button className="icon-btn" onClick={onClose} aria-label="סגור"><X size={18} /></button>
          </div>
        </div>

        <div className="modal__body">
          {loading && (
            <div className="loading-row">
              <Loader2 size={16} className="spin" /> טוען פרטי משלוח…
            </div>
          )}

          {!loading && shipment && (
            <>
              {/* Meta block */}
              <div className="detail-section">
                <div className="detail-section__grid">
                  <div className="detail-section__item">
                    <span className="detail-section__label">תאריך משלוח</span>
                    <span>{fmtDate(shipment.shipment_date)}</span>
                  </div>
                  <div className="detail-section__item">
                    <span className="detail-section__label">כתובת יעד</span>
                    <span>{shipment.destination_address || '—'}</span>
                  </div>
                  {shipment.delivery_note_number && (
                    <div className="detail-section__item">
                      <span className="detail-section__label">תעודת משלוח</span>
                      <code style={{ fontSize: '11px' }}>{shipment.delivery_note_number}</code>
                    </div>
                  )}
                  {shipment.lab_test_number && (
                    <div className="detail-section__item">
                      <span className="detail-section__label">בדיקת מעבדה</span>
                      <code style={{ fontSize: '11px' }}>{shipment.lab_test_number}</code>
                    </div>
                  )}
                  <div className="detail-section__item">
                    <span className="detail-section__label">יציאה כשירה</span>
                    <strong>{fmtKg(shipment.eligible_output_kg)}</strong>
                  </div>
                  <div className="detail-section__item">
                    <span className="detail-section__label">קרדיט שנוצר</span>
                    <strong>{fmtKg(shipment.total_credit)}</strong>
                  </div>
                </div>
                {shipment.notes && (
                  <p className="detail-section__notes"><strong>הערות:</strong> {shipment.notes}</p>
                )}
              </div>

              {/* Batch items */}
              {Array.isArray(shipment.items) && shipment.items.length > 0 && (
                <div className="detail-section">
                  <h4 className="detail-section__title">אצוות במשלוח</h4>
                  <div className="detail-items">
                    {shipment.items.map((it) => (
                      <div key={it.id} className="detail-items__row">
                        <div>
                          <code style={{ fontSize: '11px' }}>{shortId(it.batch_id)}</code>
                          <span className="tag" style={{ marginRight: '6px' }}>{it.product_name || '—'}</span>
                          {it.eligible_percent != null && (
                            <span className="td-muted" style={{ fontSize: '11px' }}>
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
                  </div>
                </div>
              )}

              {/* Invoice section */}
              <div className="detail-section">
                <h4 className="detail-section__title">
                  <FileText size={14} style={{ marginLeft: '4px' }} /> חשבונית
                </h4>
                {shipment.invoice_status === 'received' ? (
                  <div className="shipment-invoice-detail">
                    <CheckCircle2 size={14} className="shipment-invoice-detail__icon shipment-invoice-detail__icon--ok" />
                    <div>
                      <strong>חשבונית {shipment.invoice_number}</strong>
                      {shipment.invoice_date && (
                        <span className="td-muted" style={{ marginRight: '8px', fontSize: '12px' }}>
                          {fmtDate(shipment.invoice_date)}
                        </span>
                      )}
                    </div>
                  </div>
                ) : shipment.invoice_status === 'failed' ? (
                  <div className="shipment-invoice-status shipment-invoice-status--failed">
                    <AlertTriangle size={14} /> שגיאה בסנכרון עם חשבשבת
                  </div>
                ) : (
                  <div className="shipment-invoice-status shipment-invoice-status--pending">
                    <Clock size={14} /> ממתין לחשבשבת
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShipmentDetailDrawer;
