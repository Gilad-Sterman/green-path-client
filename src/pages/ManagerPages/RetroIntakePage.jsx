import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Plus, ChevronLeft, AlertTriangle, CheckCircle, XCircle,
  Clock, FileText, Download,
} from 'lucide-react';
import {
  fetchRetroIntakes,
  fetchRetroIntakeById,
  clearImportResult,
  clearSelectedBatch,
} from '../../store/slices/retroSlice';
import { downloadErrorReport } from '../../api/retro.js';
import RetroImportForm   from './RetroImportForm';
import RetroImportResult from './RetroImportResult';

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const STATUS_MAP = {
  processing:             { label: 'בעיבוד',           icon: <Clock size={13} />,         cls: 'neutral' },
  completed:              { label: 'הושלם',            icon: <CheckCircle size={13} />,   cls: 'green'   },
  completed_with_errors:  { label: 'הושלם עם שגיאות', icon: <AlertTriangle size={13} />, cls: 'warn'    },
  rejected:               { label: 'נדחה',             icon: <XCircle size={13} />,       cls: 'red'     },
  failed:                 { label: 'נכשל',             icon: <XCircle size={13} />,       cls: 'red'     },
};

const fmtDate = (d) => {
  if (!d) return '—';
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return String(d);
  return parsed.toLocaleDateString('he-IL');
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_MAP[status] || { label: status, cls: 'neutral' };
  return (
    <span className={`retro-badge retro-badge--${cfg.cls}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

const RecordStatusBadge = ({ status }) => {
  const map = {
    imported: { label: 'תקין',   cls: 'green'   },
    flagged:  { label: 'מסומן',  cls: 'warn'    },
    rejected: { label: 'נדחה',   cls: 'red'     },
  };
  const cfg = map[status] || { label: status, cls: 'neutral' };
  return <span className={`retro-badge retro-badge--${cfg.cls}`}>{cfg.label}</span>;
};

const RetroIntakePage = () => {
  const dispatch = useDispatch();
  const { batches, selectedBatch, records, loading, detailLoading, importResult } =
    useSelector((s) => s.retro);

  const [view, setView] = useState('list');
  const [recordFilter, setRecordFilter] = useState('all');
  const [errorDownloading, setErrorDownloading] = useState(null);

  useEffect(() => {
    dispatch(fetchRetroIntakes({}));
  }, [dispatch]);

  useEffect(() => {
    if (importResult) setView('result');
  }, [importResult]);

  const handleViewBatch = (id) => {
    dispatch(fetchRetroIntakeById({ id }));
    setView('detail');
    setRecordFilter('all');
  };

  const handleBack = () => {
    dispatch(clearSelectedBatch());
    dispatch(clearImportResult());
    setView('list');
  };

  const handleNewImport = () => {
    dispatch(clearImportResult());
    setView('import');
  };

  const handleDownloadErrors = async (batchId) => {
    try {
      setErrorDownloading(batchId);
      const res = await downloadErrorReport(batchId);
      triggerDownload(res.data, `error_report_${batchId}.xlsx`);
    } catch {
    } finally {
      setErrorDownloading(null);
    }
  };

  const filteredRecords = records.filter(r => {
    if (recordFilter === 'all') return true;
    return r.status === recordFilter;
  });

  if (view === 'import') {
    return (
      <div className="retro-page">
        <RetroImportForm onCancel={handleBack} />
      </div>
    );
  }

  if (view === 'result') {
    return (
      <div className="retro-page">
        <div className="retro-page__back">
          <button className="retro-back-btn" onClick={handleBack}>
            <ChevronLeft size={18} /> חזרה לרשימה
          </button>
        </div>
        <RetroImportResult
          onViewBatch={handleViewBatch}
          onNewImport={handleNewImport}
        />
      </div>
    );
  }

  if (view === 'detail') {
    return (
      <div className="retro-page">
        <div className="retro-page__back">
          <button className="retro-back-btn" onClick={handleBack}>
            <ChevronLeft size={18} /> חזרה לרשימה
          </button>
        </div>

        {detailLoading ? (
          <div className="retro-detail__loading">טוען נתונים...</div>
        ) : selectedBatch ? (
          <div className="retro-detail">
            <div className="retro-detail__header">
              <div className="retro-detail__header-left">
                <h2 className="retro-detail__title">פרטי ייבוא</h2>
                <StatusBadge status={selectedBatch.status} />
              </div>
              {selectedBatch.rejected_records > 0 && (
                <button
                  className="retro-detail__download-btn"
                  onClick={() => handleDownloadErrors(selectedBatch.id)}
                  disabled={errorDownloading === selectedBatch.id}
                >
                  <Download size={15} />
                  {errorDownloading === selectedBatch.id ? 'מוריד...' : 'דו"ח שגיאות'}
                </button>
              )}
            </div>

            <div className="retro-detail__meta-grid">
              <div className="retro-detail__meta-item">
                <span className="retro-detail__meta-label">תקופה</span>
                <span className="retro-detail__meta-value">
                  {fmtDate(selectedBatch.period_start)} – {fmtDate(selectedBatch.period_end)}
                </span>
              </div>
              <div className="retro-detail__meta-item">
                <span className="retro-detail__meta-label">הוגש על ידי</span>
                <span className="retro-detail__meta-value">{selectedBatch.submitted_by_name}</span>
              </div>
              <div className="retro-detail__meta-item">
                <span className="retro-detail__meta-label">תאריך ייבוא</span>
                <span className="retro-detail__meta-value">
                  {fmtDate(selectedBatch.created_at)}
                </span>
              </div>
              {selectedBatch.notes && (
                <div className="retro-detail__meta-item retro-detail__meta-item--wide">
                  <span className="retro-detail__meta-label">הערות</span>
                  <span className="retro-detail__meta-value">{selectedBatch.notes}</span>
                </div>
              )}
            </div>

            <div className="retro-detail__stats">
              <div className="retro-detail__stat">
                <span className="retro-detail__stat-num">{selectedBatch.valid_records}</span>
                <span className="retro-detail__stat-lbl">רשומות תקינות</span>
              </div>
              <div className="retro-detail__stat">
                <span className="retro-detail__stat-num retro-detail__stat-num--warn">
                  {selectedBatch.rejected_records}
                </span>
                <span className="retro-detail__stat-lbl">רשומות שנדחו</span>
              </div>
              <div className="retro-detail__stat">
                <span className="retro-detail__stat-num retro-detail__stat-num--credits">
                  {Number(selectedBatch.total_calculated_credits || 0).toFixed(1)}
                </span>
                <span className="retro-detail__stat-lbl">קרדיטים שנוצרו (ק"ג)</span>
              </div>
            </div>

            <div className="retro-detail__records">
              <div className="retro-detail__records-header">
                <h3>רשומות ({records.length})</h3>
                <div className="retro-detail__filter-tabs">
                  {['all', 'imported', 'flagged', 'rejected'].map(f => (
                    <button
                      key={f}
                      className={`retro-filter-tab${recordFilter === f ? ' retro-filter-tab--active' : ''}`}
                      onClick={() => setRecordFilter(f)}
                    >
                      {{ all: 'הכל', imported: 'תקינות', flagged: 'מסומנות', rejected: 'נדחו' }[f]}
                    </button>
                  ))}
                </div>
              </div>

              {filteredRecords.length === 0 ? (
                <div className="retro-detail__empty">אין רשומות להצגה</div>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="retro-detail__record-cards mobile-cards">
                    {filteredRecords.map((r) => (
                      <div
                        key={r.id}
                        className={`mobile-card retro-detail__record-card retro-detail__record-card--${r.status}`}
                      >
                        <div className="mobile-card__header">
                          <div>
                            <span className="mobile-card__title">{r.party_name}</span>
                            <span className="mobile-card__sku">
                              {r.record_type === 'inbound' ? 'כניסה' : 'יציאה'} · {fmtDate(r.date)}
                            </span>
                          </div>
                          <RecordStatusBadge status={r.status} />
                        </div>
                        <div className="mobile-card__row">
                          <span className="mobile-card__label">חומר</span>
                          <span>{r.material_type} / {r.material_classification}</span>
                        </div>
                        <div className="mobile-card__row">
                          <span className="mobile-card__label">משקל</span>
                          <span>{r.weight ? `${Number(r.weight).toLocaleString()} ק"ג` : '—'}</span>
                        </div>
                        {r.calculated_credits > 0 && (
                          <div className="mobile-card__row">
                            <span className="mobile-card__label">קרדיטים</span>
                            <span>{Number(r.calculated_credits).toFixed(1)}</span>
                          </div>
                        )}
                        <div className="mobile-card__row">
                          <span className="mobile-card__label">חשבונית</span>
                          <span>{r.invoice_number || '—'}</span>
                        </div>
                        {Array.isArray(r.errors) && r.errors.length > 0 && (
                          <div className="retro-detail__errors-tooltip">
                            {r.errors.map((e, i) => (
                              <div key={i} className="retro-detail__error-item">{e.message}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="retro-detail__table-wrap">
                    <table className="retro-detail__table">
                      <thead>
                        <tr>
                          <th>שורה</th>
                          <th>סוג</th>
                          <th>תאריך</th>
                          <th>סוג חומר</th>
                          <th>סיווג</th>
                          <th>ספק/לקוח</th>
                          <th>חשבונית</th>
                          <th>משקל</th>
                          <th>קרדיטים</th>
                          <th>סטטוס</th>
                          <th>שגיאות</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRecords.map((r) => (
                          <tr key={r.id} className={`retro-detail__row retro-detail__row--${r.status}`}>
                            <td>{r.row_index}</td>
                            <td>{r.record_type === 'inbound' ? 'כניסה' : 'יציאה'}</td>
                            <td>{fmtDate(r.date)}</td>
                            <td>{r.material_type}</td>
                            <td>{r.material_classification}</td>
                            <td>{r.party_name}</td>
                            <td>{r.invoice_number}</td>
                            <td>{r.weight ? `${Number(r.weight).toLocaleString()} ק"ג` : '—'}</td>
                            <td>{r.calculated_credits > 0 ? Number(r.calculated_credits).toFixed(1) : '—'}</td>
                            <td><RecordStatusBadge status={r.status} /></td>
                            <td className="retro-detail__errors-cell">
                              {Array.isArray(r.errors) && r.errors.length > 0 ? (
                                <div className="retro-detail__errors-tooltip">
                                  {r.errors.map((e, i) => (
                                    <div key={i} className="retro-detail__error-item">{e.message}</div>
                                  ))}
                                </div>
                              ) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="retro-page">
      <div className="retro-page__header">
        <div>
          <h1 className="retro-page__title">ייבוא נתוני הסמכה</h1>
          <p className="retro-page__subtitle">היסטוריית קליטות רטרואקטיביות</p>
        </div>
        <button className="retro-page__new-btn" onClick={handleNewImport}>
          <Plus size={18} /> ייבוא חדש
        </button>
      </div>

      {loading ? (
        <div className="retro-list__loading">טוען...</div>
      ) : batches.length === 0 ? (
        <div className="retro-list__empty">
          <FileText size={40} />
          <h3>אין ייבואים עדיין</h3>
          <p>לחץ על "ייבוא חדש" כדי להתחיל</p>
          <button className="retro-page__new-btn" onClick={handleNewImport}>
            <Plus size={16} /> ייבוא חדש
          </button>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="retro-list__cards mobile-cards">
            {batches.map((batch) => (
              <div
                key={batch.id}
                className="mobile-card retro-list__card"
                onClick={() => handleViewBatch(batch.id)}
              >
                <div className="mobile-card__header">
                  <div>
                    <span className="mobile-card__title">
                      {fmtDate(batch.period_start)} – {fmtDate(batch.period_end)}
                    </span>
                    <span className="mobile-card__sku">{batch.submitted_by_name}</span>
                  </div>
                  <StatusBadge status={batch.status} />
                </div>
                <div className="mobile-card__row">
                  <span className="mobile-card__label">רשומות תקינות</span>
                  <span className="retro-list__cell--valid">{batch.valid_records}</span>
                </div>
                {batch.rejected_records > 0 && (
                  <div className="mobile-card__row">
                    <span className="mobile-card__label">רשומות שנדחו</span>
                    <span className="retro-list__cell--warn">{batch.rejected_records}</span>
                  </div>
                )}
                {batch.total_calculated_credits > 0 && (
                  <div className="mobile-card__row">
                    <span className="mobile-card__label">קרדיטים</span>
                    <span>{Number(batch.total_calculated_credits).toFixed(1)} ק"ג</span>
                  </div>
                )}
                <div className="mobile-card__row">
                  <span className="mobile-card__label">תאריך ייבוא</span>
                  <span>{new Date(batch.created_at).toLocaleDateString('he-IL')}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="retro-list__table-wrap">
            <table className="retro-list__table">
              <thead>
                <tr>
                  <th>תקופה</th>
                  <th>הוגש על ידי</th>
                  <th>רשומות תקינות</th>
                  <th>רשומות שנדחו</th>
                  <th>קרדיטים שנוצרו</th>
                  <th>סטטוס</th>
                  <th>תאריך ייבוא</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch.id} className="retro-list__row">
                    <td>{fmtDate(batch.period_start)} – {fmtDate(batch.period_end)}</td>
                    <td>{batch.submitted_by_name}</td>
                    <td className="retro-list__cell--valid">{batch.valid_records}</td>
                    <td className={`retro-list__cell${batch.rejected_records > 0 ? ' retro-list__cell--warn' : ''}`}>
                      {batch.rejected_records}
                    </td>
                    <td>{batch.total_calculated_credits ? `${Number(batch.total_calculated_credits).toFixed(1)} ק"ג` : '—'}</td>
                    <td><StatusBadge status={batch.status} /></td>
                    <td>{new Date(batch.created_at).toLocaleDateString('he-IL')}</td>
                    <td>
                      <button className="retro-list__action-btn" onClick={() => handleViewBatch(batch.id)}>
                        צפייה
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default RetroIntakePage;
