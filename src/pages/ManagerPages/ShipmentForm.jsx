import { useState, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Trash2, AlertCircle, Eye, X } from 'lucide-react';
import DocumentUploader from '../../components/DocumentUploader';
import BatchViewerModal from '../../components/BatchViewerModal';
import {
  createShipmentThunk,
  clearShipmentsError,
} from '../../store/slices/shipmentsSlice';
import { invalidateCredits } from '../../store/slices/creditsSlice';
import { fetchBatches } from '../../store/slices/batchesSlice';
import { fetchFlagsSummary, invalidateFlags } from '../../store/slices/flagsSlice';

const ACCEPT_EXCEL = [
  'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
].join(',');

const EMPTY_ITEM = { batch_id: '', weight_kg: '' };

const fmtKg      = (n) => n != null ? `${parseFloat(n).toLocaleString('he-IL', { maximumFractionDigits: 2 })} ק"ג` : '—';
const shortId    = (id) => id?.slice(0, 8).toUpperCase();
const toInputDate = (ddmmyyyy) => {
  if (!ddmmyyyy) return '';
  const [d, m, y] = ddmmyyyy.split('/');
  if (!d || !m || !y) return '';
  return `${y.padStart(4, '20')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
};

const ShipmentForm = ({ onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const { list: customers } = useSelector((s) => s.customers);
  const { list: batches }   = useSelector((s) => s.batches);

  const [form, setForm] = useState({
    customer_id: '', shipment_date: '', delivery_note_number: '', lab_test_number: '', destination_address: '', notes: '',
  });
  const [items, setItems]           = useState([{ ...EMPTY_ITEM }]);
  const [docs, setDocs]             = useState({ lab_test: null, delivery_note: null, extra: null });
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState('');
  const [ocrFilled, setOcrFilled]     = useState(null);
  const [ocrLabFilled, setOcrLabFilled] = useState(false);
  const [labTestOcrPct, setLabTestOcrPct] = useState(null);
  const [viewingBatch, setViewingBatch] = useState(null);

  useEffect(() => {
    dispatch(fetchBatches({ force: true }));
  }, [dispatch]);

  const activeCustomers  = customers.filter((c) => c.is_active);
  const shippableBatches = batches.filter(
    (b) => b.status !== 'cancelled' && b.status !== 'failed' &&
      b.is_active !== false && parseFloat(b.remaining_weight_kg) > 0
  );
  const usedBatchIds = items.map((it) => it.batch_id).filter(Boolean);

  const getBatchData = useCallback(
    (batchId) => batches.find((b) => b.id === batchId),
    [batches]
  );

  const computeItem = (item) => {
    const batch = getBatchData(item.batch_id);
    if (!batch) return { eligible_percent: 0, credit: 0, remaining_after: null, low_remaining: false, overweight: false };
    const ep        = parseFloat(batch.eligible_percent || 0);
    const w         = parseFloat(item.weight_kg) || 0;
    const remaining = parseFloat(batch.remaining_weight_kg);
    return {
      eligible_percent: ep,
      credit:           w > 0 ? parseFloat((w * ep / 100).toFixed(2)) : 0,
      remaining_after:  w > 0 ? remaining - w : null,
      low_remaining:    remaining <= 200,
      overweight:       w > 0 && w > remaining,
    };
  };

  const totalWeight = items.reduce((s, it) => s + (parseFloat(it.weight_kg) || 0), 0);
  const totalCredit = items.reduce((s, it) => s + computeItem(it).credit, 0);

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setFormError('');
  };

  const addItem = () => {
    if (items.length >= 10) { setFormError('ניתן להוסיף עד 10 אצוות למשלוח.'); return; }
    setItems((p) => [...p, { ...EMPTY_ITEM }]);
  };
  const removeItem = (idx) => setItems((p) => p.filter((_, i) => i !== idx));
  const updateItem = (idx, field, value) => {
    setItems((p) => p.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!docs.lab_test)      { setFormError('יש לצרף בדיקת מעבדה לפני יצירת המשלוח.'); return; }
    if (!docs.delivery_note) { setFormError('יש לצרף תעודת משלוח לפני יצירת המשלוח.'); return; }
    if (!form.customer_id)   { setFormError('יש לבחור לקוח.'); return; }
    if (!form.shipment_date) { setFormError('יש להזין תאריך משלוח.'); return; }
    if (!form.delivery_note_number.trim()) { setFormError('יש להזין מספר תעודת משלוח.'); return; }
    if (!form.lab_test_number.trim()) { setFormError('יש להזין מספר בדיקת מעבדה.'); return; }
    if (!form.destination_address.trim()) { setFormError('יש להזין כתובת יעד.'); return; }

    const validItems = items.filter((it) => it.batch_id && it.weight_kg);
    if (validItems.length === 0) { setFormError('יש לבחור לפחות אצווה אחת.'); return; }

    const hasIncomplete = items.some((it) => (it.batch_id && !it.weight_kg) || (!it.batch_id && it.weight_kg));
    if (hasIncomplete) { setFormError('כל שורה חייבת לכלול אצווה ומשקל.'); return; }

    for (const it of validItems) {
      const batch = getBatchData(it.batch_id);
      if (batch && parseFloat(it.weight_kg) > parseFloat(batch.remaining_weight_kg)) {
        setFormError(`משקל הגבוה מהיתרה הזמינה באצווה ${batch.batch_code || shortId(it.batch_id)}.`);
        return;
      }
    }

    const document_ids = [docs.lab_test, docs.delivery_note, docs.extra].filter(Boolean);

    setSaving(true);
    const result = await dispatch(createShipmentThunk({
      customer_id:           form.customer_id,
      shipment_date:         form.shipment_date,
      destination_address:   form.destination_address.trim(),
      delivery_note_number:  form.delivery_note_number.trim(),
      lab_test_number:       form.lab_test_number.trim(),
      notes:                form.notes || undefined,
      lab_test_recycled_percent: labTestOcrPct,
      document_ids,
      items: validItems.map((it) => ({
        batch_id:  it.batch_id,
        weight_kg: parseFloat(it.weight_kg),
      })),
    }));
    setSaving(false);

    if (createShipmentThunk.fulfilled.match(result)) {
      dispatch(invalidateCredits());
      dispatch(fetchBatches({ force: true }));
      dispatch(fetchFlagsSummary());
      dispatch(invalidateFlags());
      onSuccess?.('משלוח נוצר — זיכויים נוצרו אוטומטית.');
    } else {
      setFormError(result.payload || 'יצירת המשלוח נכשלה.');
    }
  };

  const handleClose = () => {
    dispatch(clearShipmentsError());
    onClose();
  };


  const mandatoryDocsDone = docs.lab_test && docs.delivery_note;

  return (
    <>
      <div className="form-card">
        <div className="form-card__header">
          <h3>יצירת משלוח חדש</h3>
          <button className="icon-btn" onClick={handleClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="manager-form">
          {formError && (
            <div className="alert alert--error"><AlertCircle size={15} />{formError}</div>
          )}

          {/* ── Mandatory documents ── */}
          <div className="shipment-docs-section">
            <p className="shipment-docs-section__title">מסמכי חובה</p>

            <div className="shipment-doc-slot">
              <label className="shipment-doc-slot__label">
                בדיקת מעבדה <span className="required">*</span>
              </label>
              <DocumentUploader
                documentType="lab_test"
                label="צרף בדיקת מעבדה"
                hint="JPG, PNG, PDF, Excel · עד 1MB"
                accept={ACCEPT_EXCEL}
                maxSizeMb={1}
                onDocumentReady={(id, ocrFields) => {
                  setDocs((p) => ({ ...p, lab_test: id }));
                  setFormError('');
                  if (!id) {
                    setOcrLabFilled(false);
                    setLabTestOcrPct(null);
                    return;
                  }
                  if (!ocrFields) return;
                  if (ocrFields.recycled_content_percent?.value) {
                    setLabTestOcrPct(parseFloat(ocrFields.recycled_content_percent.value));
                  }
                  if (ocrFields.lab_test_number?.value) {
                    setForm((p) => ({
                      ...p,
                      ...(p.lab_test_number ? {} : { lab_test_number: ocrFields.lab_test_number.value }),
                    }));
                    setOcrLabFilled((prev) => prev || !form.lab_test_number);
                  }
                }}
                disabled={saving}
              />
            </div>

            <div className="shipment-doc-slot">
              <label className="shipment-doc-slot__label">
                תעודת משלוח <span className="required">*</span>
              </label>
              <DocumentUploader
                documentType="delivery_note"
                label="צרף תעודת משלוח"
                hint="JPG, PNG, PDF · עד 1MB"
                maxSizeMb={1}
                onDocumentReady={(id, ocrFields) => {
                  setDocs((p) => ({ ...p, delivery_note: id }));
                  setFormError('');
                  if (!id || !ocrFields) { setOcrFilled(null); return; }
                  const matchedCustomer = ocrFields.customer_name?.value
                    ? customers.find((c) => c.name.toLowerCase().includes(ocrFields.customer_name.value.toLowerCase()) ||
                        ocrFields.customer_name.value.toLowerCase().includes(c.name.toLowerCase()))
                    : null;
                  const filled = {};
                  if (ocrFields.delivery_note_number?.value) filled.delivery_note_number = ocrFields.delivery_note_number.value;
                  if (ocrFields.destination_address?.value)  filled.destination_address  = ocrFields.destination_address.value;
                  if (ocrFields.shipment_date?.value)        filled.shipment_date        = toInputDate(ocrFields.shipment_date.value);
                  if (matchedCustomer)                       filled.customer_id          = matchedCustomer.id;
                  if (Object.keys(filled).length === 0) return;
                  setForm((p) => ({
                    ...p,
                    ...(filled.delivery_note_number && !p.delivery_note_number ? { delivery_note_number: filled.delivery_note_number } : {}),
                    ...(filled.destination_address  && !p.destination_address  ? { destination_address:  filled.destination_address  } : {}),
                    ...(filled.shipment_date        && !p.shipment_date        ? { shipment_date:        filled.shipment_date        } : {}),
                    ...(filled.customer_id          && !p.customer_id          ? { customer_id:          filled.customer_id          } : {}),
                  }));
                  setOcrFilled(filled);
                }}
                disabled={saving}
              />
            </div>

            {mandatoryDocsDone && (
              <div className="shipment-doc-slot">
                <label className="shipment-doc-slot__label">
                  מסמך נוסף <span className="form-hint">(אופציונלי)</span>
                </label>
                <DocumentUploader
                  documentType="other"
                  label="צרף מסמך נוסף"
                  hint="JPG, PNG, PDF, Excel · עד 1MB"
                  accept={ACCEPT_EXCEL}
                  maxSizeMb={1}
                  onDocumentReady={(id) => setDocs((p) => ({ ...p, extra: id }))}
                  disabled={saving}
                />
              </div>
            )}
          </div>

          {/* ── Form fields ── */}
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
              name="shipment_date" type="date"
              value={form.shipment_date} onChange={handleChange}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="form-field">
            <label>מספר תעודת משלוח <span className="required">*</span></label>
            <input
              name="delivery_note_number"
              value={form.delivery_note_number} onChange={handleChange}
              placeholder="לדוגמה: DN-2026-0042"
            />
            <span className="field-hint">ישמש כעוגן לצימוד חשבונית מחשבשבת</span>
          </div>

          <div className="form-field">
            <label>מספר בדיקת מעבדה <span className="required">*</span></label>
            <input
              name="lab_test_number"
              value={form.lab_test_number} onChange={handleChange}
              placeholder="לדוגמה: LAB-2026-0042"
            />
          </div>

          <div className="form-field">
            <label>כתובת יעד <span className="required">*</span></label>
            <input
              name="destination_address"
              value={form.destination_address} onChange={handleChange}
              placeholder="לדוגמה: רחוב התעשייה 12, תל אביב"
            />
          </div>

          <div className="form-field">
            <label>הערות</label>
            <input name="notes" value={form.notes} onChange={handleChange} placeholder="הערות אופציונליות…" />
          </div>

          {/* ── Batch lines ── */}
          <div className="components-section">
            <div className="components-section__header">
              <label>
                אצוות משלוח <span className="required">*</span>
                <span className="form-hint"> ({items.length}/10)</span>
              </label>
              <button
                type="button"
                className="btn-ghost btn-ghost--sm"
                onClick={addItem}
                disabled={items.length >= 10}
              >
                <Plus size={13} /> הוסף אצווה
              </button>
            </div>

            {items.map((item, idx) => {
              const batch = getBatchData(item.batch_id);
              const { eligible_percent, credit, remaining_after, low_remaining, overweight } = computeItem(item);
              const weight = parseFloat(item.weight_kg) || 0;
              const availableBatches = shippableBatches.filter(
                (b) => !usedBatchIds.includes(b.id) || b.id === item.batch_id
              );

              return (
                <div
                  key={idx}
                  className={`shipment-line-row${overweight ? ' shipment-line-row--error' : ''}`}
                >
                  {/* Row top: batch select + actions */}
                  <div className="shipment-line-row__top">
                    <select
                      value={item.batch_id}
                      onChange={(e) => updateItem(idx, 'batch_id', e.target.value)}
                    >
                      <option value="">— בחר אצווה —</option>
                      {availableBatches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.batch_code || shortId(b.id)} · {b.product_name} · {fmtKg(b.remaining_weight_kg)} נותר
                        </option>
                      ))}
                    </select>

                    <div className="shipment-line-row__actions">
                      {item.batch_id && (
                        <button
                          type="button"
                          className="icon-btn"
                          title="צפה בפרטי אצווה"
                          onClick={() => setViewingBatch(item.batch_id)}
                        >
                          <Eye size={15} />
                        </button>
                      )}
                      {items.length > 1 && (
                        <button
                          type="button"
                          className="icon-btn icon-btn--danger"
                          onClick={() => removeItem(idx)}
                          title="הסר שורה"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Batch meta: product name + eligible% + low-remaining badge */}
                  {batch && (
                    <div className="shipment-line-row__meta">
                      <span className="shipment-line-row__product">{batch.product_name}</span>
                      <span className="tag">זכאות {eligible_percent}%</span>
                      {low_remaining && (
                        <span className="badge badge--warn">יתרה נמוכה</span>
                      )}
                    </div>
                  )}

                  {/* Weight input + hints + credit */}
                  <div className="shipment-line-row__bottom">
                    <div className="shipment-line-row__weight-group">
                      <input
                        type="number" step="0.01" min="0.01"
                        placeholder='משקל ק"ג'
                        value={item.weight_kg}
                        onChange={(e) => updateItem(idx, 'weight_kg', e.target.value)}
                        className={overweight ? 'input--error' : ''}
                      />
                      {batch && weight > 0 && (
                        <span className={`field-hint${overweight ? ' field-hint--error' : ''}`}>
                          {overweight
                            ? `חריגה · יתרה: ${fmtKg(batch.remaining_weight_kg)}`
                            : `יתרה לאחר שימוש: ${fmtKg(remaining_after)}`
                          }
                        </span>
                      )}
                    </div>
                    {credit > 0 && (
                      <span className="shipment-line-row__credit">
                        קרדיט: <strong>{fmtKg(credit)}</strong>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Summary footer */}
            {totalWeight > 0 && (
              <div className="shipment-summary-footer">
                <div className="shipment-summary-footer__item">
                  <span>סה"כ משקל</span>
                  <strong>{fmtKg(totalWeight)}</strong>
                </div>
                <div className="shipment-summary-footer__item shipment-summary-footer__item--credit">
                  <span>סה"כ קרדיטים</span>
                  <strong>{fmtKg(totalCredit)}</strong>
                </div>
              </div>
            )}
          </div>

          {(ocrFilled || ocrLabFilled) && (
            <div className="ocr-upload-banner__done">
              <span>שדות מולאו אוטומטית ממסמכי המשלוח</span>
              <button
                type="button"
                className="ocr-clear-btn"
                onClick={() => {
                  setForm((p) => ({
                    ...p,
                    ...(ocrFilled?.delivery_note_number ? { delivery_note_number: '' } : {}),
                    ...(ocrFilled?.destination_address  ? { destination_address:  '' } : {}),
                    ...(ocrFilled?.shipment_date        ? { shipment_date:        '' } : {}),
                    ...(ocrFilled?.customer_id          ? { customer_id:          '' } : {}),
                    ...(ocrLabFilled                    ? { lab_test_number:      '' } : {}),
                  }));
                  setOcrFilled(null);
                  setOcrLabFilled(false);
                  setLabTestOcrPct(null);
                }}
              >
                <X size={14} /> נקה
              </button>
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn-ghost" onClick={handleClose} disabled={saving}>
              ביטול
            </button>
            <button type="submit" className="btn-primary" disabled={!mandatoryDocsDone || saving}>
              {saving ? 'יוצר…' : 'צור משלוח'}
            </button>
          </div>

          {!mandatoryDocsDone && (
            <p className="field-hint" style={{ textAlign: 'center', marginTop: 0 }}>
              יש לצרף בדיקת מעבדה ותעודת משלוח להפעלת הכפתור
            </p>
          )}
        </form>
      </div>

      {viewingBatch && (
        <BatchViewerModal
          batchId={viewingBatch}
          batches={batches}
          onClose={() => setViewingBatch(null)}
        />
      )}
    </>
  );
};

export default ShipmentForm;
