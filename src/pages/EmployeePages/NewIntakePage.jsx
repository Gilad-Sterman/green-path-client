import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, AlertCircle, CheckCircle2, Info, ScanLine, Loader2, X, MapPin, ArrowRight } from 'lucide-react';
import { createIntakeThunk, updateIntakeThunk, clearIntakesError } from '../../store/slices/intakesSlice';
import { fetchSuppliers } from '../../store/slices/suppliersSlice';
import { fetchFlagsSummary, invalidateFlags } from '../../store/slices/flagsSlice';
import { analyzeDocument, uploadDocument } from '../../api/documents';
import { retryWatcher } from '../../store/slices/geoSlice';

const MATERIAL_TYPES = ['PET', 'HDPE', 'PP', 'LDPE', 'PVC', 'PE', 'mixed', 'other'];

const MATERIAL_ALIASES = {
  PET: ['pet', 'פ.א.ט', 'polyethylene terephthalate'],
  HDPE: ['hdpe', 'high density polyethylene', 'פוליאתילן בצפיפות גבוהה'],
  PP: ['pp', 'polypropylene', 'פוליפרופילן'],
  LDPE: ['ldpe', 'low density polyethylene', 'פוליאתילן בצפיפות נמוכה'],
  PVC: ['pvc', 'פי.וי.סי', 'polyvinyl chloride'],
  PE: ['pe', 'polyethylene', 'פוליאתילן'],
  mixed: ['מעורב', 'mixed'],
};

const matchMaterialType = (hint = '') => {
  const lower = hint.toLowerCase();
  for (const [type, aliases] of Object.entries(MATERIAL_ALIASES)) {
    if (aliases.some((a) => lower.includes(a.toLowerCase()))) return type;
  }
  return null;
};



const today = () => new Date().toISOString().split('T')[0];

const EMPTY_FORM = {
  supplier_id: '', intake_date: today(), delivery_note_number: '',
  material_type: '', is_recycled: true,
  net_weight_kg: '', eligible_input_percent: '100', notes: '',
};

const MATERIAL_TYPE_HE = {
  PET: 'PET', HDPE: 'HDPE', PP: 'PP', LDPE: 'LDPE',
  PVC: 'PVC', PE: 'PE', mixed: 'מעורב', other: 'אחר',
};

const MATERIAL_SOURCE_HE = {
  post_consumer: 'פוסט-צרכני', post_industrial: 'פוסט-תעשייתי',
  commercial: 'מסחרי', municipal: 'עירוני', other: 'אחר',
};
const MATERIAL_STATUS_HE = { recycled: 'ממוחזר', virgin: 'גולמי', mixed: 'מעורב' };

const CONFIDENCE_LABELS = {
  auto: { label: 'מולא אוטומטית', cls: 'ocr-badge--auto' },
  warn: { label: 'לבדיקה', cls: 'ocr-badge--warn' },
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

const LOCATION_STATUS_LABEL = {
  pending: { text: 'מאתר מיקום…', cls: 'location-badge--pending' },
  granted: { text: 'מיקום זמין', cls: 'location-badge--granted' },
  denied: { text: 'שירותי מיקום לא אושרו', cls: 'location-badge--denied' },
  unavailable: { text: 'לא ניתן לאתר מיקום', cls: 'location-badge--unavailable' },
};

const NewIntakePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const editIntake = location.state?.intake || null;
  const editingId = editIntake?.id || null;
  const { list: suppliers } = useSelector((s) => s.suppliers);
  const { user } = useSelector((s) => s.auth);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState('');
  const [ocrFields, setOcrFields] = useState(null);
  const [editedOcrFields, setEditedOcrFields] = useState([]);
  const [ocrSupplierHint, setOcrSupplierHint] = useState('');
  const [ocrExtras, setOcrExtras] = useState(null);
  const [docId, setDocId] = useState(null);

  const geo = useSelector((state) => state.geo);

  useEffect(() => {
    dispatch(fetchSuppliers());
    return () => dispatch(clearIntakesError());
  }, [dispatch]);

  useEffect(() => {
    if (editIntake) {
      setForm({
        supplier_id: String(editIntake.supplier_id),
        intake_date: editIntake.intake_date?.split('T')[0] || today(),
        delivery_note_number: editIntake.delivery_note_number || '',
        material_type: editIntake.material_type || '',
        is_recycled: editIntake.is_recycled,
        net_weight_kg: String(editIntake.net_weight_kg),
        eligible_input_percent: String(editIntake.eligible_input_percent ?? 100),
        notes: editIntake.notes || '',
      });
    }
  }, [editIntake?.id]);

  const activeSuppliers = suppliers.filter((s) => s.is_active);

  const selectedSupplier = activeSuppliers.find((s) => s.id === form.supplier_id) || null;
  const availableMaterialTypes = selectedSupplier?.allowed_material_types?.length
    ? MATERIAL_TYPES.filter((t) => selectedSupplier.allowed_material_types.includes(t))
    : MATERIAL_TYPES;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setError('');
    if (ocrFields?.[name]) {
      setOcrFields((prev) => { const next = { ...prev }; delete next[name]; return next; });
      setEditedOcrFields((prev) => [...new Set([...prev, name])]);
    }
    if (name === 'supplier_id') {
      setOcrSupplierHint('');
      const newSupplier = activeSuppliers.find((s) => s.id === value);
      const newAllowed = newSupplier?.allowed_material_types?.length
        ? newSupplier.allowed_material_types
        : MATERIAL_TYPES;
      setForm((p) => ({
        ...p,
        supplier_id: value,
        material_type: newAllowed.includes(p.material_type) ? p.material_type : '',
      }));
      return;
    }
    setForm((p) => ({ ...p, [name]: value }));
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
    setOcrExtras(null);

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

      const extras = data?.data?.extras || {};
      if (Object.keys(extras).length > 0) setOcrExtras(extras);

      if (extras.material_hint) {
        const matched = matchMaterialType(extras.material_hint);
        if (matched) {
          const ocrSupplier = activeSuppliers.find((s) => s.id === form.supplier_id);
          const allowedForOcr = ocrSupplier?.allowed_material_types?.length
            ? ocrSupplier.allowed_material_types
            : MATERIAL_TYPES;
          if (allowedForOcr.includes(matched)) {
            filled.material_type = { value: matched, confidence: 0.80, fill: 'auto' };
            setForm((p) => ({ ...p, material_type: matched }));
          }
        }
      }

      setOcrFields(Object.keys(filled).length > 0 ? filled : null);
      if (Object.keys(filled).length === 0) setOcrError('המסמך נותח אך לא ניתן לחלץ שדות.');

      try {
        const uploadRes = await uploadDocument(file, { document_type: 'delivery_note' });
        setDocId(uploadRes.data?.data?.document?.id || null);
      } catch (_) { /* upload failure is non-blocking */ }
    } catch (err) {
      setOcrError(err?.response?.data?.message || 'ה-OCR נכשל. יש למלא את הטופס ידנית.');
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
    if (!form.supplier_id) { setError('יש לבחור ספק.'); return; }
    if (!form.material_type) { setError('יש לבחור סוג חומר.'); return; }
    // if (!form.material_source) { setError('יש לבחור מקור חומר.'); return; }
    // if (!form.material_status) { setError('יש לבחור סטטוס חומר.'); return; }
    if (!form.net_weight_kg) { setError('יש להזין משקל נטו.'); return; }
    if (!form.intake_date) { setError('יש להזין תאריך קליטה.'); return; }
    if (!form.delivery_note_number.trim()) { setError('יש להזין מספר תעודת משלוח.'); return; }

    const payload = {
      supplier_id: form.supplier_id,
      intake_date: form.intake_date,
      delivery_note_number: form.delivery_note_number.trim(),
      material_type: form.material_type,
      // material_source: form.material_source,
      // material_status: form.material_status,
      is_recycled: form.is_recycled,
      eligible_input_percent: form.is_recycled ? 100 : 0,
      net_weight_kg: parseFloat(form.net_weight_kg),
      data_entry_profile: editingId ? undefined : (!docId ? 'manual_capture' : editedOcrFields.length > 0 ? 'ocr_edited' : 'camera_upload'),
      notes: form.notes || undefined,
      document_ids: docId ? [docId] : [],
      ...(
        !editingId && geo.status === 'granted'
          ? { lat: geo.lat, lng: geo.lng }
          : {}
      ),
    };

    setSaving(true);
    const result = editingId
      ? await dispatch(updateIntakeThunk({ id: editingId, body: payload }))
      : await dispatch(createIntakeThunk(payload));
    setSaving(false);

    const ok = editingId
      ? updateIntakeThunk.fulfilled.match(result)
      : createIntakeThunk.fulfilled.match(result);

    if (ok) {
      if (editingId) {
        navigate('/intakes', { replace: true });
      } else {
        if (user?.role === 'manager' || user?.role === 'internal_admin') {
          dispatch(fetchFlagsSummary());
          dispatch(invalidateFlags());
        }
        setSuccess(true);
      }
    } else {
      setError(result.payload || 'שגיאה בשמירת הקליטה. נסה שוב.');
    }
  };

  if (success) {
    return (
      <div className="employee-page">
        <div className="intake-success">
          <div className="intake-success__icon">
            <CheckCircle2 size={48} />
          </div>
          <h2>קליטה נרשמה!</h2>
          <p>האספקה נרשמה בהצלחה במערכת.</p>
          <div className="intake-success__actions">
            <button className="btn-primary btn-primary--full" onClick={() => { setSuccess(false); setForm(EMPTY_FORM); }}>
              קלוט שוב
            </button>
            <button className="btn-ghost btn-ghost--full" onClick={() => navigate('/intakes')}>
              לרשימת קליטות
            </button>
            <button className="btn-ghost btn-ghost--full" onClick={() => navigate('/dashboard')}>
              לוח בקרה
            </button>
          </div>
        </div>
      </div>
    );
  }

  const locationBadge = !editingId ? LOCATION_STATUS_LABEL[geo.status] : null;

  return (
    <div className="employee-page">
      <div className="employee-page__nav">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowRight size={20} />
          <span>חזרה</span>
        </button>
        <h2>{editingId ? 'עריכת קליטה' : 'קליטה חדשה'}</h2>
        <div style={{ width: '60px' }} />
        {locationBadge && (
          <button
            type="button"
            className={`location-badge ${locationBadge.cls}`}
            onClick={() => dispatch(retryWatcher())}
            title={
              geo.status === 'denied'
                ? 'יש לאפשר מיקום בהגדרות הדפדפן ולנסות שוב'
                : 'לחץ לרענון מיקום'
            }
          >
            <MapPin size={13} />
            <span>{locationBadge.text}</span>
          </button>
        )}
      </div>

      {activeSuppliers.length === 0 && (
        <div className="alert alert--warn">
          <Info size={15} />
          אין ספקים פעילים. פנה למנהל שלך.
        </div>
      )}

      {error && (
        <div className="alert alert--error">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {!editingId && <div className="ocr-upload-banner">
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
            <span>מנתח מסמך…</span>
          </div>
        ) : ocrFields ? (
          <div className="ocr-upload-banner__done">
            <CheckCircle2 size={16} />
            <span>שדות מולאו אוטומטית מהמסמך</span>
            <button type="button" className="ocr-clear-btn" onClick={() => { setOcrFields(null); setOcrExtras(null); setOcrSupplierHint(''); setDocId(null); setForm(EMPTY_FORM); setEditedOcrFields([]); }}>
              <X size={14} /> נקה
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="ocr-upload-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <ScanLine size={18} />
            <span>סרוק תעודת משלוח</span>
          </button>
        )}
        {ocrError && (
          <p className="ocr-upload-banner__error">{ocrError}</p>
        )}
        {/* {ocrExtras && (
          <div className="ocr-extras">
            {ocrExtras.client_name && <span className="ocr-extras__chip"><strong>לקוח:</strong> {ocrExtras.client_name}</span>}
            {ocrExtras.carrier_name && <span className="ocr-extras__chip"><strong>מוביל:</strong> {ocrExtras.carrier_name}</span>}
            {ocrExtras.material_hint && <span className="ocr-extras__chip"><strong>חומר:</strong> {ocrExtras.material_hint}</span>}
          </div>
        )} */}
      </div>}

      <form onSubmit={handleSubmit} className="employee-form">
        <div className="employee-form__field">
          <label>ספק <span className="required">*</span>
            {ocrFields?.supplier_id && (
              <span className={`ocr-badge ${CONFIDENCE_LABELS[ocrFields.supplier_id.fill]?.cls}`}>
                {CONFIDENCE_LABELS[ocrFields.supplier_id.fill]?.label}
              </span>
            )}
          </label>
          <select name="supplier_id" value={form.supplier_id} onChange={handleChange}>
            <option value="">— בחר ספק —</option>
            {activeSuppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {ocrSupplierHint && (
            <p className="ocr-supplier-hint">💡 המסמך מציין ספק: <strong>{ocrSupplierHint}</strong></p>
          )}
        </div>

        {selectedSupplier && Array.isArray(selectedSupplier.allowed_material_types) && selectedSupplier.allowed_material_types.length === 0 && (
          <div className="alert alert--warn">
            <Info size={15} />
            לספק זה לא הוגדרו סוגי חומר מורשים. יש לעדכן את הגדרות הספק לפני ביצוע קליטה.
          </div>
        )}

        <div className="employee-form__field">
          <label>מספר תעודת משלוח <span className="required">*</span>
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
            placeholder="לדוגמה: TN-2024-001"
            autoComplete="off"
          />
        </div>

        <div className="employee-form__row">
          <div className="employee-form__field">
            <label>תאריך קליטה <span className="required">*</span>
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
          {/* <div className="employee-form__field">
            <label>סטטוס חומר <span className="required">*</span></label>
            <select name="material_status" value={form.material_status} onChange={handleChange}>
              <option value="">— בחר —</option>
              {MATERIAL_STATUSES.map((s) => <option key={s} value={s}>{MATERIAL_STATUS_HE[s] || s}</option>)}
            </select>
          </div> */}
        </div>

        {/* <div className="employee-form__row">
          <div className="employee-form__field">
            <label>סוג חומר גלם <span className="required">*</span>
              {ocrFields?.material_type && (
                <span className={`ocr-badge ${CONFIDENCE_LABELS[ocrFields.material_type.fill]?.cls}`}>
                  {CONFIDENCE_LABELS[ocrFields.material_type.fill]?.label}
                </span>
              )}
            </label>
            <select name="material_type" value={form.material_type} onChange={handleChange}>
              <option value="">— בחר סוג —</option>
              {MATERIAL_TYPES.map((t) => <option key={t} value={t}>{MATERIAL_TYPE_HE[t] || t}</option>)}
            </select>
          </div>
          <div className="employee-form__field">
            <label>מקור חומר <span className="required">*</span></label>
            <select name="material_source" value={form.material_source} onChange={handleChange}>
              <option value="">— בחר מקור —</option>
              {MATERIAL_SOURCES.map((s) => <option key={s} value={s}>{MATERIAL_SOURCE_HE[s] || s}</option>)}
            </select>
          </div>
        </div> */}
        <div className="employee-form__row">
          <div className="employee-form__field">
            <label>סוג חומר גלם <span className="required">*</span>
              {ocrFields?.material_type && (
                <span className={`ocr-badge ${CONFIDENCE_LABELS[ocrFields.material_type.fill]?.cls}`}>
                  {CONFIDENCE_LABELS[ocrFields.material_type.fill]?.label}
                </span>
              )}
            </label>
            <select name="material_type" value={form.material_type} onChange={handleChange}>
              <option value="">— בחר סוג —</option>
              {availableMaterialTypes.map((t) => <option key={t} value={t}>{MATERIAL_TYPE_HE[t] || t}</option>)}
            </select>
          </div>
          <div className="employee-form__field">
            <label>האם החומר ממוחזר? <span className="required">*</span></label>
            <button
              type="button"
              className={`status-toggle${form.is_recycled ? ' status-toggle--on' : ''}`}
              onClick={() => setForm((p) => ({ ...p, is_recycled: !p.is_recycled }))}
              title={form.is_recycled ? 'לחץ לסימון כלא ממוחזר' : 'לחץ לסימון כממוחזר'}
            >
              <span className="status-toggle__track">
                <span className="status-toggle__thumb" />
              </span>
              <span className="status-toggle__label">{form.is_recycled ? 'כן — ממוחזר (100% זכאות)' : 'לא — גולמי (0% זכאות)'}</span>
            </button>
          </div>
        </div>

        <div className="employee-form__row">
          <div className="employee-form__field">
            <label>משקל נטו (ק"ג) <span className="required">*</span>
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
          {/* <div className="employee-form__field">
            <label>אחוז זכאות <span className="form-hint">(0–100)</span></label>
            <input
              name="eligible_input_percent"
              type="number" step="1" min="0" max="100"
              value={form.eligible_input_percent}
              onChange={handleChange}
              inputMode="numeric"
            />
          </div> */}
        </div>

        {eligibleKg() && (
          <div className="employee-form__eligible-preview">
            <CheckCircle2 size={14} />
            משקל זכאי: <strong>{eligibleKg()} ק"ג</strong>
          </div>
        )}

        <div className="employee-form__field">
          <label>הערות <span className="form-hint">(אופציונלי)</span></label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="הערות נוספות על האספקה…"
            rows={3}
          />
        </div>

        <button
          type="submit"
          className="btn-primary btn-primary--full btn-primary--lg"
          disabled={saving || activeSuppliers.length === 0}
        >
          {saving ? 'שומר…' : editingId ? 'שמור שינויים' : 'שמור קליטה'}
        </button>
      </form>
    </div>
  );
};

export default NewIntakePage;
