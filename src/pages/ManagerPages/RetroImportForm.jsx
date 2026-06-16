import { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { UploadCloud, FileSpreadsheet, Download, X, Loader } from 'lucide-react';
import { importRetroFile, clearError } from '../../store/slices/retroSlice';
import { downloadRetroTemplate } from '../../api/retro.js';

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const RetroImportForm = ({ onCancel }) => {
  const dispatch      = useDispatch();
  const { importLoading, error } = useSelector((s) => s.retro);
  const { user }      = useSelector((s) => s.auth);

  const [file,         setFile]         = useState(null);
  const [periodStart,  setPeriodStart]  = useState('');
  const [periodEnd,    setPeriodEnd]    = useState('');
  const [notes,        setNotes]        = useState('');
  const [dragOver,     setDragOver]     = useState(false);
  const [templateBusy, setTemplateBusy] = useState(false);
  const fileInputRef = useRef(null);

  const ACCEPTED = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
  ];

  const handleFileSelect = (f) => {
    if (!f) return;
    if (!ACCEPTED.includes(f.type) && !f.name.match(/\.(xlsx|csv)$/i)) return;
    setFile(f);
    dispatch(clearError());
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files[0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) return;

    const fd = new FormData();
    fd.append('file', file);
    if (periodStart) fd.append('period_start', periodStart);
    if (periodEnd)   fd.append('period_end',   periodEnd);
    if (notes)       fd.append('notes',        notes);
    if (user?.role === 'internal_admin' && user?.factory_id) {
      fd.append('factory_id', user.factory_id);
    }

    dispatch(importRetroFile(fd));
  };

  const handleTemplateDownload = async () => {
    try {
      setTemplateBusy(true);
      const res = await downloadRetroTemplate();
      triggerDownload(res.data, 'retro_import_template.xlsx');
    } catch {
    } finally {
      setTemplateBusy(false);
    }
  };

  return (
    <div className="retro-import-form">
      <div className="retro-import-form__header">
        <div>
          <h2 className="retro-import-form__title">ייבוא נתוני הסמכה היסטוריים</h2>
          <p className="retro-import-form__subtitle">
            העלו קובץ במבנה המוגדר לצורך קליטת נתוני עבר למערכת ההסמכה.
            המערכת תבדוק את הקובץ, תציג שגיאות במידת הצורך, ותייבא רק נתונים תקינים.
          </p>
        </div>
        {onCancel && (
          <button className="retro-import-form__close" onClick={onCancel} type="button">
            <X size={20} />
          </button>
        )}
      </div>

      <button
        type="button"
        className="retro-import-form__template-btn"
        onClick={handleTemplateDownload}
        disabled={templateBusy}
      >
        <Download size={16} />
        {templateBusy ? 'מוריד...' : 'הורדת תבנית קובץ'}
      </button>

      <form onSubmit={handleSubmit} className="retro-import-form__body">
        <div
          className={`retro-import-form__dropzone${dragOver ? ' retro-import-form__dropzone--active' : ''}${file ? ' retro-import-form__dropzone--has-file' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.csv"
            style={{ display: 'none' }}
            onChange={(e) => handleFileSelect(e.target.files[0])}
          />
          {file ? (
            <div className="retro-import-form__file-selected">
              <FileSpreadsheet size={28} />
              <span className="retro-import-form__file-name">{file.name}</span>
              <span className="retro-import-form__file-size">
                ({(file.size / 1024).toFixed(1)} KB)
              </span>
              <button
                type="button"
                className="retro-import-form__file-remove"
                onClick={(e) => { e.stopPropagation(); setFile(null); dispatch(clearError()); }}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="retro-import-form__dropzone-prompt">
              <UploadCloud size={36} />
              <p>גרור קובץ לכאן או לחץ לבחירה</p>
              <span>XLSX או CSV בלבד</span>
            </div>
          )}
        </div>

        <div className="retro-import-form__fields">
          <div className="retro-import-form__field-group">
            <label className="retro-import-form__label">
              תחילת תקופה
              <span className="retro-import-form__label-hint">(אופציונלי — נגזר מהקובץ)</span>
            </label>
            <input
              type="date"
              className="retro-import-form__input"
              value={periodStart}
              onChange={(e) => { setPeriodStart(e.target.value); dispatch(clearError()); }}
            />
          </div>

          <div className="retro-import-form__field-group">
            <label className="retro-import-form__label">
              סוף תקופה
              <span className="retro-import-form__label-hint">(אופציונלי — נגזר מהקובץ)</span>
            </label>
            <input
              type="date"
              className="retro-import-form__input"
              value={periodEnd}
              onChange={(e) => { setPeriodEnd(e.target.value); dispatch(clearError()); }}
            />
          </div>
        </div>

        <div className="retro-import-form__field-group">
          <label className="retro-import-form__label">הערות</label>
          <textarea
            className="retro-import-form__textarea"
            rows={3}
            placeholder="הערות אופציונליות לגבי הייבוא..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error && (
          <div className="retro-import-form__error-banner">
            {error}
          </div>
        )}

        <div className="retro-import-form__actions">
          {onCancel && (
            <button type="button" className="retro-import-form__btn-cancel" onClick={onCancel}>
              ביטול
            </button>
          )}
          <button
            type="submit"
            className="retro-import-form__btn-submit"
            disabled={!file || importLoading}
          >
            {importLoading ? (
              <><Loader size={16} className="spin" /> מעבד קובץ...</>
            ) : (
              <><UploadCloud size={16} /> בדיקה וייבוא</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RetroImportForm;
