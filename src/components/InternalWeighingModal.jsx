import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { X, Upload, Loader2, AlertCircle, CheckCircle2, Scale, Plus, Trash2 } from 'lucide-react';
import { uploadDocument, analyzeDocument } from '../api/documents';
import { addWeighingThunk } from '../store/slices/intakesSlice';
import { fetchFlagsSummary } from '../store/slices/flagsSlice';

const OCR_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const parseDDMMYYYY = (str) => {
  if (!str) return '';
  const parts = str.split('/');
  if (parts.length !== 3) return '';
  const [d, m, y] = parts;
  if (!d || !m || !y) return '';
  return `${y.length === 2 ? '20' + y : y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
};

const fmtKg = (n) =>
  n != null ? `${parseFloat(n).toLocaleString('he-IL', { maximumFractionDigits: 2 })} ק"ג` : '—';

let _entryId = 0;
const newEntry = () => ({
  id: ++_entryId,
  docId: null,
  fileName: '',
  weight: '',
  sourceType: 'manual',
  ocrDone: false,
  uploading: false,
  error: '',
});

const InternalWeighingModal = ({ intake, onClose, onSuccess }) => {
  const dispatch = useDispatch();

  const [entries,     setEntries]     = useState([newEntry()]);
  const [sharedDate,  setSharedDate]  = useState('');
  const [notes,       setNotes]       = useState('');
  const [saving,      setSaving]      = useState(false);
  const [formError,   setFormError]   = useState('');

  const today        = new Date().toISOString().split('T')[0];
  const anyUploading = entries.some((e) => e.uploading);
  const hasEmptyRow  = entries.some((e) => !e.docId && !e.uploading);
  const validEntries = entries.filter((e) => e.docId);
  const totalWeight  = validEntries.reduce((sum, e) => sum + (parseFloat(e.weight) || 0), 0);

  const updateEntry = (id, patch) =>
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const removeEntry = (id) =>
    setEntries((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev));

  const handleFile = async (entryId, file) => {
    if (!file) return;
    updateEntry(entryId, { uploading: true, error: '', docId: null, fileName: file.name, ocrDone: false });

    const canOcr = OCR_MIME.includes(file.type);
    const [uploadResult, ocrResult] = await Promise.allSettled([
      uploadDocument(file, { document_type: 'weighing_document' }),
      canOcr ? analyzeDocument(file, 'weighing_document') : Promise.reject(null),
    ]);

    if (uploadResult.status !== 'fulfilled') {
      updateEntry(entryId, {
        uploading: false,
        error: uploadResult.reason?.response?.data?.error?.message || 'שגיאה בהעלאת המסמך.',
      });
      return;
    }

    const docId = uploadResult.value?.data?.data?.document?.id;
    const patch = { uploading: false, docId };

    if (ocrResult.status === 'fulfilled') {
      const fields = ocrResult.value?.data?.data?.fields || {};
      let didFill = false;
      if (fields.measured_weight?.value) {
        patch.weight = fields.measured_weight.value;
        didFill = true;
      }
      if (fields.weighing_date?.value) {
        const converted = parseDDMMYYYY(fields.weighing_date.value);
        if (converted && !sharedDate) { setSharedDate(converted); didFill = true; }
      }
      if (didFill) { patch.sourceType = 'ocr'; patch.ocrDone = true; }
    }

    updateEntry(entryId, patch);
  };

  const derivedSourceType = () => {
    if (entries.some((e) => e.sourceType === 'ocr_edited')) return 'ocr_edited';
    if (validEntries.length > 0 && validEntries.every((e) => e.sourceType === 'ocr')) return 'ocr';
    return 'manual';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (validEntries.length === 0) { setFormError('יש להעלות לפחות מסמך שקילה אחד.'); return; }
    if (hasEmptyRow)               { setFormError('יש להעלות מסמך לכל שורה שנוספה, או להסיר אותה.'); return; }
    const missingWeight = validEntries.some((e) => !e.weight || parseFloat(e.weight) <= 0);
    if (missingWeight)             { setFormError('יש להזין משקל לכל מסמך שהועלה.'); return; }
    if (totalWeight <= 0)          { setFormError('יש להזין משקל תקין וגדול מאפס.'); return; }
    if (!sharedDate)               { setFormError('יש להזין תאריך שקילה.'); return; }

    setSaving(true);
    const result = await dispatch(addWeighingThunk({
      intakeId: intake.id,
      body: {
        document_id:        validEntries[0].docId,
        measured_weight:    totalWeight,
        weighing_date:      sharedDate,
        source_type:        derivedSourceType(),
        notes:              notes.trim() || undefined,
        extra_document_ids: validEntries.slice(1).map((e) => e.docId),
      },
    }));
    setSaving(false);

    if (addWeighingThunk.fulfilled.match(result)) {
      dispatch(fetchFlagsSummary());
      onSuccess?.();
      onClose();
    } else {
      setFormError(result.payload || 'שגיאה בשמירת השקילה.');
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="iw-modal">
        <div className="iw-modal__header">
          <span className="iw-modal__title"><Scale size={15} /> הוספת שקילה פנימית</span>
          <button className="icon-btn" onClick={onClose} aria-label="סגור"><X size={16} /></button>
        </div>

        <div className="iw-modal__info">
          <span>{intake.supplier_name || '—'}</span>
          <span className="iw-modal__info-sep">·</span>
          <span>{fmtKg(intake.net_weight_kg)}</span>
          {intake.has_internal_weighing && (
            <><span className="iw-modal__info-sep">·</span><span>קודם: {fmtKg(intake.internal_weight_kg)}</span></>
          )}
        </div>

        <form onSubmit={handleSubmit} className="iw-modal__body">
          {formError && (
            <p className="iw-modal__error"><AlertCircle size={12} /> {formError}</p>
          )}

          <div className="iw-entries">
            {entries.map((entry) => (
              <div key={entry.id} className="iw-entry">
                <label className={`iw-file-btn iw-entry__file${entry.uploading ? ' iw-file-btn--busy' : entry.docId ? ' iw-file-btn--done' : ''}`}>
                  {entry.uploading ? (
                    <><Loader2 size={12} className="spin" /> מעלה…</>
                  ) : entry.docId ? (
                    <><CheckCircle2 size={12} /> {entry.fileName}</>
                  ) : (
                    <><Upload size={12} /> העלה מסמך</>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    style={{ display: 'none' }}
                    onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; handleFile(entry.id, f); }}
                    disabled={entry.uploading || saving}
                  />
                </label>

                <input
                  className="iw-entry__weight"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder='ק"ג'
                  value={entry.weight}
                  onChange={(e) => {
                    updateEntry(entry.id, {
                      weight: e.target.value,
                      sourceType: entry.sourceType === 'ocr' ? 'ocr_edited' : entry.sourceType,
                    });
                    setFormError('');
                  }}
                  disabled={saving}
                />

                {entries.length > 1 && (
                  <button
                    type="button"
                    className="icon-btn icon-btn--danger iw-entry__remove"
                    onClick={() => removeEntry(entry.id)}
                    title="הסר"
                    disabled={saving}
                  >
                    <Trash2 size={13} />
                  </button>
                )}

                {entry.error && (
                  <p className="iw-modal__error iw-entry__msg"><AlertCircle size={12} /> {entry.error}</p>
                )}
                {entry.ocrDone && !entry.error && (
                  <p className="iw-ocr-hint iw-entry__msg">חולץ אוטומטית — ניתן לערוך</p>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            className="btn-ghost btn-ghost--sm iw-add-btn"
            onClick={() => setEntries((prev) => [...prev, newEntry()])}
            disabled={anyUploading || saving || entries.length >= 10 || !entries[entries.length - 1].docId}
          >
            <Plus size={13} /> הוסף מסמך נוסף
          </button>

          {totalWeight > 0 && (
            <div className="iw-total">
              <span>סה&quot;כ משקל שקילה</span>
              <strong>{fmtKg(totalWeight)}</strong>
            </div>
          )}

          <div className="iw-modal__field">
            <label>תאריך שקילה <span className="required">*</span></label>
            <input
              type="date"
              value={sharedDate}
              max={today}
              onChange={(e) => { setSharedDate(e.target.value); setFormError(''); }}
              disabled={saving}
            />
          </div>

          <div className="iw-modal__actions">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
              ביטול
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving || anyUploading || hasEmptyRow || validEntries.length === 0 || totalWeight <= 0 || !sharedDate}
            >
              {saving ? 'שומר…' : 'הוסף שקילה'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InternalWeighingModal;
