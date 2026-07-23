import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  CheckCircle, AlertTriangle, XCircle, Loader2, FileText, AlertCircle,
} from 'lucide-react';
import DocumentUploader from '../../components/DocumentUploader';

const RetroDocsStep = ({ onSubmit }) => {
  const { previewResult, importLoading, error: importError } = useSelector((s) => s.retro);

  const [invoiceDocIds, setInvoiceDocIds] = useState([]);
  const [labTestDocIds, setLabTestDocIds] = useState([]);

  if (!previewResult) return null;

  const { validCount, rejectedCount, flaggedCount, totalCredits, errors } = previewResult;
  const hasValid  = validCount > 0;
  const canSubmit = hasValid;

  const bannerCls = hasValid
    ? (rejectedCount > 0 ? 'retro-docs-step__banner--warn' : 'retro-docs-step__banner--ok')
    : 'retro-docs-step__banner--error';

  return (
    <div className="retro-docs-step">
      <div className="retro-docs-step__header">
        <h2 className="retro-docs-step__title">ייבוא נתוני הסמכה</h2>
        <div className="retro-docs-step__steps">
          <span className="retro-docs-step__step retro-docs-step__step--done">שלב 1: בדיקת קובץ ✓</span>
          <span className="retro-docs-step__step retro-docs-step__step--active">שלב 2: מסמכים נלווים</span>
        </div>
      </div>

      <div className={`retro-docs-step__banner ${bannerCls}`}>
        {hasValid ? (
          rejectedCount > 0 ? (
            <><AlertTriangle size={16} /> {validCount} רשומות תקינות · {rejectedCount} נדחו</>
          ) : (
            <><CheckCircle size={16} /> {validCount} רשומות תקינות{totalCredits > 0 ? ` · ${Number(totalCredits).toFixed(1)} קרדיטים צפויים` : ''}</>
          )
        ) : (
          <><XCircle size={16} /> לא נמצאו רשומות תקינות — יש לתקן את הקובץ</>
        )}
        {flaggedCount > 0 && <span className="retro-docs-step__flagged"> · {flaggedCount} חשד לכפילות</span>}
      </div>

      {errors && errors.length > 0 && (
        <div className="retro-docs-step__errors">
          {errors.slice(0, 10).map((e, i) => (
            <div key={i} className="retro-docs-step__error-row">
              <AlertCircle size={12} />
              <span>{e.message}</span>
            </div>
          ))}
          {errors.length > 10 && (
            <div className="retro-docs-step__errors-more">ועוד {errors.length - 10} שגיאות נוספות</div>
          )}
        </div>
      )}

      {hasValid && (
        <div className="retro-docs-step__docs">
          <div className="retro-docs-step__docs-title">
            <FileText size={15} />
            <span>מסמכים נלווים</span>
            <span className="retro-docs-step__docs-hint">ניתן להעלות חשבוניות או בדיקות מעבדה (אופציונלי)</span>
          </div>

          <div className="retro-docs-step__slot">
            <div className="retro-docs-step__slot-header">
              <span className="retro-docs-step__slot-label">
                חשבונית <span className="form-hint">(אופציונלי)</span>
              </span>
              {invoiceDocIds.length > 0 && (
                <span className="retro-docs-step__slot-ok">
                  <CheckCircle size={13} /> {invoiceDocIds.length === 1 ? 'הועלה' : `הועלו ${invoiceDocIds.length}`}
                </span>
              )}
            </div>
            <DocumentUploader
              documentType="retro_invoice"
              label="העלה חשבונית"
              hint="PDF, JPG, PNG · עד 30MB"
              onDocumentReady={(ids) => setInvoiceDocIds(ids)}
              multiple
              maxFiles={10}
              disabled={importLoading}
              skipOcr
            />
          </div>

          <div className="retro-docs-step__slot">
            <div className="retro-docs-step__slot-header">
              <span className="retro-docs-step__slot-label">
                בדיקת מעבדה <span className="form-hint">(אופציונלי)</span>
              </span>
              {labTestDocIds.length > 0 && (
                <span className="retro-docs-step__slot-ok">
                  <CheckCircle size={13} /> {labTestDocIds.length === 1 ? 'הועלה' : `הועלו ${labTestDocIds.length}`}
                </span>
              )}
            </div>
            <DocumentUploader
              documentType="lab_test"
              label="העלה בדיקת מעבדה"
              hint="PDF, JPG, PNG · עד 30MB"
              onDocumentReady={(ids) => setLabTestDocIds(ids)}
              multiple
              maxFiles={10}
              disabled={importLoading}
              skipOcr
            />
          </div>
        </div>
      )}

      {importError && !importLoading && (
        <div className="retro-docs-step__import-error">
          <AlertCircle size={14} /> {importError}
        </div>
      )}

      {hasValid && (
        <div className="retro-docs-step__actions">
          <button
            type="button"
            className="retro-docs-step__btn-submit"
            onClick={() => onSubmit(invoiceDocIds, labTestDocIds)}
            disabled={!canSubmit || importLoading}
          >
            {importLoading
              ? <><Loader2 size={16} className="spin" /> מייבא נתונים...</>
              : 'השלם ייבוא'}
          </button>
        </div>
      )}
    </div>
  );
};

export default RetroDocsStep;
