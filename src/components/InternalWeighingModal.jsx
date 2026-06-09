import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { X, Upload, Loader2, AlertCircle, CheckCircle2, Scale } from 'lucide-react';
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

const InternalWeighingModal = ({ intake, onClose, onSuccess }) => {
  const dispatch = useDispatch();

  const [docId,       setDocId]       = useState(null);
  const [fileName,    setFileName]    = useState('');
  const [uploading,   setUploading]   = useState(false);
  const [ocrDone,     setOcrDone]     = useState(false);
  const [fileError,   setFileError]   = useState('');

  const [measuredWeight, setMeasuredWeight] = useState('');
  const [weighingDate,   setWeighingDate]   = useState('');
  const [sourceType,     setSourceType]     = useState('manual');
  const [notes,          setNotes]          = useState('');

  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setFileError('');
    setDocId(null);
    setFileName(file.name);
    setOcrDone(false);
    setUploading(true);

    const canOcr = OCR_MIME.includes(file.type);

    const [uploadResult, ocrResult] = await Promise.allSettled([
      uploadDocument(file, { document_type: 'weighing_document' }),
      canOcr ? analyzeDocument(file, 'weighing_document') : Promise.reject(null),
    ]);

    setUploading(false);

    if (uploadResult.status !== 'fulfilled') {
      setFileError(
        uploadResult.reason?.response?.data?.error?.message || 'שגיאה בהעלאת המסמך.'
      );
      return;
    }

    setDocId(uploadResult.value?.data?.data?.document?.id);

    if (ocrResult.status === 'fulfilled') {
      const fields = ocrResult.value?.data?.data?.fields || {};
      let didFill = false;
      if (fields.measured_weight?.value) {
        setMeasuredWeight(fields.measured_weight.value);
        didFill = true;
      }
      if (fields.weighing_date?.value) {
        const converted = parseDDMMYYYY(fields.weighing_date.value);
        if (converted) { setWeighingDate(converted); didFill = true; }
      }
      if (didFill) { setSourceType('ocr'); setOcrDone(true); }
    }
  };

  const handleWeightChange = (v) => {
    setMeasuredWeight(v);
    if (sourceType === 'ocr') setSourceType('ocr_edited');
    setFormError('');
  };

  const handleDateChange = (v) => {
    setWeighingDate(v);
    if (sourceType === 'ocr') setSourceType('ocr_edited');
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!docId)                              { setFormError('יש להעלות מסמך שקילה.'); return; }
    const w = parseFloat(measuredWeight);
    if (isNaN(w) || w <= 0)                 { setFormError('יש להזין משקל תקין וגדול מאפס.'); return; }
    if (!weighingDate)                       { setFormError('יש להזין תאריך שקילה.'); return; }

    setSaving(true);
    const result = await dispatch(addWeighingThunk({
      intakeId: intake.id,
      body: {
        document_id:     docId,
        measured_weight: w,
        weighing_date:   weighingDate,
        source_type:     sourceType,
        notes:           notes.trim() || undefined,
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
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
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

          <label className={`iw-file-btn${uploading ? ' iw-file-btn--busy' : docId ? ' iw-file-btn--done' : ''}`}>
            {uploading ? (
              <><Loader2 size={13} className="spin" /> מעלה ומנתח…</>
            ) : docId ? (
              <><CheckCircle2 size={13} /> {fileName}</>
            ) : (
              <><Upload size={13} /> העלה תמונה / PDF</>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              style={{ display: 'none' }}
              onChange={handleFile}
              disabled={uploading || saving}
            />
          </label>
          {fileError && <p className="iw-modal__error"><AlertCircle size={12} /> {fileError}</p>}
          {ocrDone && <p className="iw-ocr-hint">נתונים חולצו אוטומטית — ניתן לערוך</p>}

          <div className="iw-modal__fields-row">
            <div className="iw-modal__field">
              <label>משקל (ק"ג) <span className="required">*</span></label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={measuredWeight}
                onChange={(e) => handleWeightChange(e.target.value)}
                placeholder="17850"
                disabled={saving}
              />
            </div>
            <div className="iw-modal__field">
              <label>תאריך <span className="required">*</span></label>
              <input
                type="date"
                value={weighingDate}
                max={today}
                onChange={(e) => handleDateChange(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <div className="iw-modal__actions">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
              ביטול
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving || uploading || !docId}
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
