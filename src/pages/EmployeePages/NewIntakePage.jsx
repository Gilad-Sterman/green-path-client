import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, CheckCircle2, Info, ScanLine, Loader2, X } from 'lucide-react';
import { createIntakeThunk, clearIntakesError } from '../../store/slices/intakesSlice';
import { fetchSuppliers } from '../../store/slices/suppliersSlice';
import { analyzeDocument } from '../../api/documents';

const MATERIAL_TYPES   = ['plastic', 'paper', 'metal', 'glass', 'textile', 'rubber', 'mixed', 'other'];
const MATERIAL_SOURCES = ['post_consumer', 'post_industrial', 'commercial', 'municipal', 'other'];
const MATERIAL_STATUSES = ['recycled', 'virgin', 'mixed'];

const today = () => new Date().toISOString().split('T')[0];

const EMPTY_FORM = {
  supplier_id: '', intake_date: today(), delivery_note_number: '',
  material_type: '', material_source: '', material_status: '',
  net_weight_kg: '', eligible_input_percent: '100', notes: '',
};

const CONFIDENCE_LABELS = {
  auto: { label: 'Auto-filled', cls: 'ocr-badge--auto' },
  warn: { label: 'Review',     cls: 'ocr-badge--warn' },
};

const parseDateValue = (raw) => {
  const ddmmyyyy = raw.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    return new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00`);
  }
  return new Date(raw);
};

const normalizeStr = (s) =>
  (s || '').toLowerCase().trim().replace(/[^\w\u0590-\u05FF\s]/gu, '').replace(/\s+/g, ' ');

const NewIntakePage = () => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { list: suppliers } = useSelector((s) => s.suppliers);
  const fileInputRef = useRef(null);

  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState(false);
  const [ocrLoading,      setOcrLoading]      = useState(false);
  const [ocrError,        setOcrError]        = useState('');
  const [ocrFields,       setOcrFields]       = useState(null);
  const [ocrSupplierHint, setOcrSupplierHint] = useState('');

  useEffect(() => {
    dispatch(fetchSuppliers());
    return () => dispatch(clearIntakesError());
  }, [dispatch]);

  const activeSuppliers = suppliers.filter((s) => s.is_active);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setError('');
    if (name === 'supplier_id') setOcrSupplierHint('');
    if (ocrFields?.[name]) {
      setOcrFields((prev) => { const next = { ...prev }; delete next[name]; return next; });
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = '';
    if (!file) return;

    setOcrLoading(true);
    setOcrError('');
    setOcrFields(null);
    setOcrSupplierHint('');

    try {
      const { data } = await analyzeDocument(file);
      const fields = data?.data?.fields || {};
      const filled = {};

      if (fields.delivery_note_number?.fill && fields.delivery_note_number.fill !== 'skip') {
        filled.delivery_note_number = fields.delivery_note_number;
        setForm((p) => ({ ...p, delivery_note_number: fields.delivery_note_number.value }));
      }
      if (fields.net_weight_kg?.fill && fields.net_weight_kg.fill !== 'skip') {
        const numVal = parseFloat(fields.net_weight_kg.value.replace(/[^0-9.]/g, ''));
        if (!isNaN(numVal)) {
          filled.net_weight_kg = fields.net_weight_kg;
          setForm((p) => ({ ...p, net_weight_kg: String(numVal) }));
        }
      }
      if (fields.intake_date?.fill && fields.intake_date.fill !== 'skip') {
        const parsed = parseDateValue(fields.intake_date.value);
        if (!isNaN(parsed.getTime())) {
          const iso = parsed.toISOString().split('T')[0];
          filled.intake_date = { ...fields.intake_date, value: iso };
          setForm((p) => ({ ...p, intake_date: iso }));
        }
      }
      if (fields.supplier_name?.fill && fields.supplier_name.fill !== 'skip') {
        const extracted = normalizeStr(fields.supplier_name.value);
        const currentSuppliers = suppliers.filter((s) => s.is_active);
        const match = currentSuppliers.find((s) => {
          const norm = normalizeStr(s.name);
          return norm === extracted || norm.includes(extracted) || extracted.includes(norm);
        });
        if (match) {
          filled.supplier_id = { value: match.name, confidence: fields.supplier_name.confidence, fill: fields.supplier_name.fill };
          setForm((p) => ({ ...p, supplier_id: match.id }));
        } else {
          setOcrSupplierHint(fields.supplier_name.value);
        }
      }

      setOcrFields(Object.keys(filled).length > 0 ? filled : null);
      if (Object.keys(filled).length === 0) setOcrError('Document analyzed but no fields could be extracted.');
    } catch (err) {
      setOcrError(err?.response?.data?.message || 'OCR failed. Please fill the form manually.');
    } finally {
      setOcrLoading(false);
    }
  };

  const eligibleKg = () => {
    const w = parseFloat(form.net_weight_kg);
    const p = parseFloat(form.eligible_input_percent);
    if (!isNaN(w) && !isNaN(p) && w > 0) return ((w * p) / 100).toFixed(2);
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.supplier_id)                 { setError('Please select a supplier.'); return; }
    if (!form.material_type)               { setError('Please select a material type.'); return; }
    if (!form.material_source)             { setError('Please select a material source.'); return; }
    if (!form.material_status)             { setError('Please select a material status.'); return; }
    if (!form.net_weight_kg)               { setError('Net weight is required.'); return; }
    if (!form.intake_date)                 { setError('Intake date is required.'); return; }
    if (!form.delivery_note_number.trim()) { setError('Delivery note number is required.'); return; }

    setSaving(true);
    const result = await dispatch(createIntakeThunk({
      supplier_id:            form.supplier_id,
      intake_date:            form.intake_date,
      delivery_note_number:   form.delivery_note_number.trim(),
      material_type:          form.material_type,
      material_source:        form.material_source,
      material_status:        form.material_status,
      net_weight_kg:          parseFloat(form.net_weight_kg),
      eligible_input_percent: parseFloat(form.eligible_input_percent),
      data_entry_profile:     'manual_capture',
      notes:                  form.notes || undefined,
    }));
    setSaving(false);

    if (createIntakeThunk.fulfilled.match(result)) {
      setSuccess(true);
    } else {
      setError(result.payload || 'Failed to record intake. Please try again.');
    }
  };

  if (success) {
    return (
      <div className="employee-page">
        <div className="intake-success">
          <div className="intake-success__icon">
            <CheckCircle2 size={48} />
          </div>
          <h2>Intake Recorded!</h2>
          <p>The delivery has been logged successfully.</p>
          <div className="intake-success__actions">
            <button className="btn-primary btn-primary--full" onClick={() => { setSuccess(false); setForm(EMPTY_FORM); }}>
              Record Another
            </button>
            <button className="btn-ghost btn-ghost--full" onClick={() => navigate('/intakes')}>
              View All Intakes
            </button>
            <button className="btn-ghost btn-ghost--full" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="employee-page">
      <div className="employee-page__nav">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <h2>New Intake</h2>
        <div style={{ width: '60px' }} />
      </div>

      {activeSuppliers.length === 0 && (
        <div className="alert alert--warn">
          <Info size={15} />
          No active suppliers available. Contact your manager.
        </div>
      )}

      {error && (
        <div className="alert alert--error">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      <div className="ocr-upload-banner">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
        {ocrLoading ? (
          <div className="ocr-upload-banner__scanning">
            <Loader2 size={18} className="ocr-spin" />
            <span>Analyzing document…</span>
          </div>
        ) : ocrFields ? (
          <div className="ocr-upload-banner__done">
            <CheckCircle2 size={16} />
            <span>Fields pre-filled from document</span>
            <button type="button" className="ocr-clear-btn" onClick={() => { setOcrFields(null); setForm(EMPTY_FORM); }}>
              <X size={14} /> Clear
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="ocr-upload-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <ScanLine size={18} />
            <span>Scan Delivery Note</span>
          </button>
        )}
        {ocrError && (
          <p className="ocr-upload-banner__error">{ocrError}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="employee-form">
        <div className="employee-form__field">
          <label>Supplier <span className="required">*</span>
            {ocrFields?.supplier_id && (
              <span className={`ocr-badge ${CONFIDENCE_LABELS[ocrFields.supplier_id.fill]?.cls}`}>
                {CONFIDENCE_LABELS[ocrFields.supplier_id.fill]?.label}
              </span>
            )}
          </label>
          <select name="supplier_id" value={form.supplier_id} onChange={handleChange}>
            <option value="">— Select supplier —</option>
            {activeSuppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {ocrSupplierHint && (
            <p className="ocr-supplier-hint">💡 Document mentions: <strong>{ocrSupplierHint}</strong></p>
          )}
        </div>

        <div className="employee-form__field">
          <label>Delivery note number <span className="required">*</span>
            {ocrFields?.delivery_note_number && (
              <span className={`ocr-badge ${CONFIDENCE_LABELS[ocrFields.delivery_note_number.fill]?.cls}`}>
                {CONFIDENCE_LABELS[ocrFields.delivery_note_number.fill]?.label}
              </span>
            )}
          </label>
          <input
            name="delivery_note_number"
            value={form.delivery_note_number}
            onChange={handleChange}
            placeholder="e.g. DN-2024-001"
            autoComplete="off"
          />
        </div>

        <div className="employee-form__row">
          <div className="employee-form__field">
            <label>Intake date <span className="required">*</span>
              {ocrFields?.intake_date && (
                <span className={`ocr-badge ${CONFIDENCE_LABELS[ocrFields.intake_date.fill]?.cls}`}>
                  {CONFIDENCE_LABELS[ocrFields.intake_date.fill]?.label}
                </span>
              )}
            </label>
            <input
              name="intake_date"
              type="date"
              value={form.intake_date}
              max={today()}
              onChange={handleChange}
            />
          </div>
          <div className="employee-form__field">
            <label>Material status <span className="required">*</span></label>
            <select name="material_status" value={form.material_status} onChange={handleChange}>
              <option value="">— Select —</option>
              {MATERIAL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="employee-form__row">
          <div className="employee-form__field">
            <label>Material type <span className="required">*</span></label>
            <select name="material_type" value={form.material_type} onChange={handleChange}>
              <option value="">— Select —</option>
              {MATERIAL_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="employee-form__field">
            <label>Material source <span className="required">*</span></label>
            <select name="material_source" value={form.material_source} onChange={handleChange}>
              <option value="">— Select —</option>
              {MATERIAL_SOURCES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        </div>

        <div className="employee-form__row">
          <div className="employee-form__field">
            <label>Net weight (kg) <span className="required">*</span>
              {ocrFields?.net_weight_kg && (
                <span className={`ocr-badge ${CONFIDENCE_LABELS[ocrFields.net_weight_kg.fill]?.cls}`}>
                  {CONFIDENCE_LABELS[ocrFields.net_weight_kg.fill]?.label}
                </span>
              )}
            </label>
            <input
              name="net_weight_kg"
              type="number" step="0.01" min="0.01"
              value={form.net_weight_kg}
              onChange={handleChange}
              placeholder="0.00"
              inputMode="decimal"
            />
          </div>
          <div className="employee-form__field">
            <label>Eligible % <span className="form-hint">(0–100)</span></label>
            <input
              name="eligible_input_percent"
              type="number" step="1" min="0" max="100"
              value={form.eligible_input_percent}
              onChange={handleChange}
              inputMode="numeric"
            />
          </div>
        </div>

        {eligibleKg() && (
          <div className="employee-form__eligible-preview">
            <CheckCircle2 size={14} />
            Eligible weight: <strong>{eligibleKg()} kg</strong>
          </div>
        )}

        <div className="employee-form__field">
          <label>Notes <span className="form-hint">(optional)</span></label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="Any additional notes about this delivery…"
            rows={3}
          />
        </div>

        <button
          type="submit"
          className="btn-primary btn-primary--full btn-primary--lg"
          disabled={saving || activeSuppliers.length === 0}
        >
          {saving ? 'Recording…' : 'Record Intake'}
        </button>
      </form>
    </div>
  );
};

export default NewIntakePage;
