import { useRef, useState } from 'react';
import { Paperclip, X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { uploadDocument } from '../api/documents';

const ACCEPT_DEFAULT = 'image/jpeg,image/png,image/webp,application/pdf';

const DocumentUploader = ({
  documentType,
  label        = 'צרף מסמך',
  hint,
  accept       = ACCEPT_DEFAULT,
  onDocumentReady,
  disabled     = false,
  maxSizeMb    = null,
  multiple     = false,
  maxFiles     = 1,
  skipOcr      = false,
}) => {
  const fileInputRef  = useRef(null);
  const [uploading,   setUploading]   = useState(false);
  const [attached,    setAttached]    = useState(null);   // single mode: { id, name }
  const [attachedList, setAttachedList] = useState([]);   // multi mode:  [{ id, name }]
  const [uploadError, setUploadError] = useState('');

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    fileInputRef.current.value = '';
    if (!file) return;

    if (maxSizeMb && file.size > maxSizeMb * 1024 * 1024) {
      setUploadError(`גודל הקובץ חורג מהמותר (${maxSizeMb}MB).`);
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const meta = { document_type: documentType };
      if (skipOcr) meta.skip_ocr = 'true';
      const { data } = await uploadDocument(file, meta);
      const doc = data?.data?.document;

      if (multiple) {
        const next = [...attachedList, { id: doc.id, name: file.name }];
        setAttachedList(next);
        onDocumentReady?.(next.map((d) => d.id));
      } else {
        setAttached({ id: doc.id, name: file.name });
        onDocumentReady?.(doc.id, doc.ocr_fields || null);
      }
    } catch (err) {
      setUploadError(err?.response?.data?.error?.message || 'העלאה נכשלה. נסה שוב.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setAttached(null);
    setUploadError('');
    onDocumentReady?.(null, null);
  };

  const handleRemoveOne = (id) => {
    const next = attachedList.filter((d) => d.id !== id);
    setAttachedList(next);
    setUploadError('');
    onDocumentReady?.(next.map((d) => d.id));
  };

  // ── Multi-file render ───────────────────────────────────────────────────────
  if (multiple) {
    const atMax = attachedList.length >= maxFiles;
    return (
      <div className="doc-uploader">
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        {attachedList.length > 0 && (
          <div className="doc-uploader__list">
            {attachedList.map((doc) => (
              <div key={doc.id} className="doc-uploader__attached">
                <CheckCircle2 size={14} className="doc-uploader__ok-icon" />
                <span className="doc-uploader__name">{doc.name}</span>
                <button
                  type="button"
                  className="doc-uploader__remove"
                  onClick={() => handleRemoveOne(doc.id)}
                  disabled={disabled || uploading}
                  title="הסר מסמך"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {uploading ? (
          <div className="doc-uploader__loading">
            <Loader2 size={15} className="spin" />
            <span>מעלה מסמך…</span>
          </div>
        ) : (
          <button
            type="button"
            className="btn-ghost btn-ghost--sm doc-uploader__btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || atMax}
            title={atMax ? `הגעת למקסימום קבצים (${maxFiles})` : undefined}
          >
            <Paperclip size={14} />
            {attachedList.length === 0 ? label : 'הוסף מסמך נוסף'}
          </button>
        )}

        {attachedList.length > 0 && (
          <p className="doc-uploader__hint">{attachedList.length}/{maxFiles} מסמכים</p>
        )}

        {hint && attachedList.length === 0 && !uploading && (
          <p className="doc-uploader__hint">{hint}</p>
        )}

        {uploadError && (
          <p className="doc-uploader__error"><AlertCircle size={12} /> {uploadError}</p>
        )}
      </div>
    );
  }

  // ── Single-file render (existing behavior, unchanged) ─────────────────────
  return (
    <div className="doc-uploader">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {uploading ? (
        <div className="doc-uploader__loading">
          <Loader2 size={15} className="spin" />
          <span>מעלה מסמך…</span>
        </div>
      ) : attached ? (
        <div className="doc-uploader__attached">
          <CheckCircle2 size={14} className="doc-uploader__ok-icon" />
          <span className="doc-uploader__name">{attached.name}</span>
          <button
            type="button"
            className="doc-uploader__remove"
            onClick={handleRemove}
            title="הסר מסמך"
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn-ghost btn-ghost--sm doc-uploader__btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          <Paperclip size={14} /> {label}
        </button>
      )}

      {hint && !attached && !uploading && (
        <p className="doc-uploader__hint">{hint}</p>
      )}

      {uploadError && (
        <p className="doc-uploader__error">
          <AlertCircle size={12} /> {uploadError}
        </p>
      )}
    </div>
  );
};

export default DocumentUploader;
