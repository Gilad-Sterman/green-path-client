import { useEffect, useState } from 'react';
import { X, Package } from 'lucide-react';
import { getBatch } from '../api/batches';

const STATUS_HE = {
  in_progress: 'פעיל',
  completed:   'הושלם',
  cancelled:   'בוטל',
  failed:      'נפסלה',
};

const fmtKg   = (n) => n != null ? `${parseFloat(n).toLocaleString('he-IL', { maximumFractionDigits: 2 })} ק"ג` : '—';
const shortId = (id) => id?.slice(0, 8).toUpperCase();

const BatchViewerModal = ({ batchId, batches, onClose }) => {
  const cached = batches?.find((b) => b.id === batchId);
  const [detail, setDetail]   = useState(cached || null);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (!batchId) return;
    setLoading(true);
    getBatch(batchId)
      .then(({ data }) => setDetail(data.data.batch))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [batchId]);

  if (!batchId) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card batch-viewer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-card__header">
          <div className="modal-card__title-group">
            <Package size={18} />
            <h3>פרטי אצווה</h3>
          </div>
          <button className="icon-btn" onClick={onClose} title="סגור">
            <X size={18} />
          </button>
        </div>

        {loading && !detail && (
          <p className="td-muted" style={{ padding: '16px 0' }}>טוען פרטים…</p>
        )}

        {detail && (
          <>
            <div className="batch-viewer-modal__meta">
              <code className="batch-viewer-modal__code">
                {detail.batch_code || shortId(detail.id)}
              </code>
              <span className="batch-viewer-modal__product">{detail.product_name}</span>
              <span className={`badge badge--${detail.status === 'in_progress' ? 'green' : 'neutral'}`}>
                {STATUS_HE[detail.status] || detail.status}
              </span>
            </div>

            <div className="batch-viewer-modal__kpis">
              <div className="batch-viewer-modal__kpi">
                <span>משקל כולל</span>
                <strong>{fmtKg(detail.output_weight_kg)}</strong>
              </div>
              <div className="batch-viewer-modal__kpi">
                <span>נוצל עד כה</span>
                <strong>{fmtKg(detail.used_weight_kg)}</strong>
              </div>
              <div className="batch-viewer-modal__kpi">
                <span>יתרה זמינה</span>
                <strong className="batch-viewer-modal__remaining">{fmtKg(detail.remaining_weight_kg)}</strong>
              </div>
              <div className="batch-viewer-modal__kpi">
                <span>אחוז זכאות</span>
                <strong>{detail.eligible_percent ?? '—'}%</strong>
              </div>
            </div>

            {detail.product_sku && (
              <p className="td-muted" style={{ fontSize: '12px', marginTop: '4px' }}>
                מק"ט: {detail.product_sku}
              </p>
            )}

            {Array.isArray(detail.usages) && detail.usages.length > 0 && (
              <div className="batch-viewer-modal__usages">
                <p className="batch-viewer-modal__usages-title">שימושים קודמים</p>
                {detail.usages.map((u, i) => (
                  <div key={i} className="batch-viewer-modal__usage-row">
                    <div className="batch-viewer-modal__usage-left">
                      <span className="batch-viewer-modal__usage-customer">{u.customer_name || '—'}</span>
                      <span className="td-muted" style={{ fontSize: '11px' }}>
                        {u.shipment_date ? new Date(u.shipment_date).toLocaleDateString('he-IL') : '—'}
                      </span>
                    </div>
                    <div className="batch-viewer-modal__usage-right">
                      <strong>{fmtKg(u.weight_kg)}</strong>
                      {u.credit > 0 && (
                        <span className="td-muted" style={{ fontSize: '11px' }}>
                          קרדיט: {fmtKg(u.credit)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {Array.isArray(detail.usages) && detail.usages.length === 0 && (
              <p className="td-muted" style={{ fontSize: '12px', marginTop: '4px' }}>
                אין שימושים קודמים
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BatchViewerModal;
