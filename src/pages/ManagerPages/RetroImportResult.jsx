import { useSelector } from 'react-redux';
import { CheckCircle, AlertTriangle, XCircle, Download, Eye, Plus } from 'lucide-react';
import { downloadErrorReport } from '../../api/retro.js';

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const RetroImportResult = ({ onViewBatch, onNewImport }) => {
  const { importResult } = useSelector((s) => s.retro);

  if (!importResult) return null;

  const { success, batch, validCount, rejectedCount, flaggedCount, totalCredits, errors } = importResult;

  const handleDownloadErrors = async () => {
    if (!batch?.id) return;
    try {
      const res = await downloadErrorReport(batch.id);
      triggerDownload(res.data, `error_report_${batch.id}.xlsx`);
    } catch {
    }
  };

  return (
    <div className="retro-result">
      <div className={`retro-result__banner retro-result__banner--${success ? 'success' : 'error'}`}>
        {success ? (
          rejectedCount > 0 ? (
            <><AlertTriangle size={22} /> הייבוא הושלם עם שגיאות</>
          ) : (
            <><CheckCircle size={22} /> הייבוא הושלם בהצלחה</>
          )
        ) : (
          <><XCircle size={22} /> הייבוא נכשל — לא נמצאו רשומות תקינות</>
        )}
      </div>

      <div className="retro-result__stats">
        <div className="retro-result__stat retro-result__stat--valid">
          <span className="retro-result__stat-value">{validCount}</span>
          <span className="retro-result__stat-label">רשומות תקינות</span>
        </div>
        <div className="retro-result__stat retro-result__stat--rejected">
          <span className="retro-result__stat-value">{rejectedCount}</span>
          <span className="retro-result__stat-label">רשומות שנדחו</span>
        </div>
        {flaggedCount > 0 && (
          <div className="retro-result__stat retro-result__stat--flagged">
            <span className="retro-result__stat-value">{flaggedCount}</span>
            <span className="retro-result__stat-label">חשד לכפילות</span>
          </div>
        )}
        {success && totalCredits > 0 && (
          <div className="retro-result__stat retro-result__stat--credits">
            <span className="retro-result__stat-value">{Number(totalCredits).toFixed(1)}</span>
            <span className="retro-result__stat-label">קרדיטים שנוצרו (ק"ג)</span>
          </div>
        )}
      </div>

      {errors && errors.length > 0 && (
        <div className="retro-result__errors">
          <div className="retro-result__errors-header">
            <h4>פירוט שגיאות ({errors.length})</h4>
            {success && batch?.id && (
              <button
                type="button"
                className="retro-result__download-btn"
                onClick={handleDownloadErrors}
              >
                <Download size={15} /> הורדת דו"ח שגיאות
              </button>
            )}
          </div>
          <div className="retro-result__errors-list">
            {errors.slice(0, 50).map((err, idx) => (
              <div key={idx} className="retro-result__error-row">
                <span className="retro-result__error-field">{err.field}</span>
                <span className="retro-result__error-msg">{err.message}</span>
              </div>
            ))}
            {errors.length > 50 && (
              <div className="retro-result__errors-more">
                ועוד {errors.length - 50} שגיאות נוספות — הורד את דו"ח השגיאות לפירוט מלא
              </div>
            )}
          </div>
        </div>
      )}

      <div className="retro-result__actions">
        <button
          type="button"
          className="retro-result__btn-secondary"
          onClick={onNewImport}
        >
          <Plus size={16} /> ייבוא חדש
        </button>
        {success && batch?.id && (
          <button
            type="button"
            className="retro-result__btn-primary"
            onClick={() => onViewBatch(batch.id)}
          >
            <Eye size={16} /> צפייה בנתוני הייבוא
          </button>
        )}
      </div>
    </div>
  );
};

export default RetroImportResult;
