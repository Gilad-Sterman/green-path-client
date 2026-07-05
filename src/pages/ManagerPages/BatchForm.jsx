import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { X, AlertCircle, Plus, Trash2, Loader2 } from 'lucide-react';
import { createBatchThunk } from '../../store/slices/batchesSlice';
import { generateBatchCode, getBatchSources } from '../../api/batches';

const fmtKg = (n) =>
  n != null
    ? `${parseFloat(n).toLocaleString('he-IL', { maximumFractionDigits: 2 })} ק"ג`
    : '—';

const todayStr = () => new Date().toISOString().split('T')[0];

const EMPTY_SOURCE = { source_id: '', weight_kg: '', source_type: 'intake' };

const BatchForm = ({ products = [], onClose, onSuccess }) => {
  const dispatch = useDispatch();

  const [productId,           setProductId]           = useState('');
  const [batchDate,           setBatchDate]           = useState(todayStr());
  const [batchCode,           setBatchCode]           = useState('');
  const [autoCode,            setAutoCode]            = useState('');
  const [codeManuallyEdited,  setCodeManuallyEdited]  = useState(false);
  const [codeLoading,         setCodeLoading]         = useState(false);
  const [sources,             setSources]             = useState([{ ...EMPTY_SOURCE }]);
  const [availableIntakes,    setAvailableIntakes]    = useState([]);
  const [availableBatches,    setAvailableBatches]    = useState([]);
  const [sourcesLoading,      setSourcesLoading]      = useState(false);
  const [forConsolidation,    setForConsolidation]    = useState(false);
  const [notes,               setNotes]               = useState('');
  const [saving,              setSaving]              = useState(false);
  const [formError,           setFormError]           = useState('');

  // Auto-generate batch code when form opens or date changes
  useEffect(() => {
    let cancelled = false;
    const fetchCode = async () => {
      setCodeLoading(true);
      try {
        const { data } = await generateBatchCode({ date: batchDate });
        if (!cancelled) {
          const code = data.data.batch_code;
          setAutoCode(code);
          if (!codeManuallyEdited) setBatchCode(code);
        }
      } catch (_) {}
      finally { if (!cancelled) setCodeLoading(false); }
    };
    fetchCode();
    return () => { cancelled = true; };
  }, [batchDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch available sources when product changes
  useEffect(() => {
    if (!productId) {
      setAvailableIntakes([]);
      setAvailableBatches([]);
      setSources([{ ...EMPTY_SOURCE }]);
      return;
    }
    let cancelled = false;
    const fetchSources = async () => {
      setSourcesLoading(true);
      try {
        const { data } = await getBatchSources({ product_id: productId });
        if (!cancelled) {
          setAvailableIntakes(data.data.intakes || []);
          setAvailableBatches(data.data.batches || []);
          setSources([{ ...EMPTY_SOURCE }]);
        }
      } catch (_) {}
      finally { if (!cancelled) setSourcesLoading(false); }
    };
    fetchSources();
    return () => { cancelled = true; };
  }, [productId]);

  const usedSourceIds    = sources.map((s) => s.source_id).filter(Boolean);
  const totalWeight      = sources.reduce((sum, s) => sum + (parseFloat(s.weight_kg) || 0), 0);
  const wasCodeEdited    = codeManuallyEdited && batchCode.trim() !== autoCode;

  const addSource = () => {
    if (sources.length >= 6) return;
    setSources((p) => [...p, { ...EMPTY_SOURCE }]);
  };

  const removeSource = (idx) => setSources((p) => p.filter((_, i) => i !== idx));

  const updateSource = (idx, field, val) => {
    setSources((p) => p.map((s, i) => (i === idx ? { ...s, [field]: val } : s)));
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!productId)        { setFormError('יש לבחור מוצר.'); return; }
    if (!batchCode.trim()) { setFormError('יש להזין קוד אצווה.'); return; }
    if (new Date(batchDate) > new Date()) { setFormError('תאריך האצווה לא יכול להיות בעתיד.'); return; }

    const validSources = sources.filter((s) => s.source_id && s.weight_kg);
    if (validSources.length === 0) { setFormError('יש להוסיף לפחות מקור חומר אחד.'); return; }

    const hasMismatch = sources.some(
      (s) => (s.source_id && !s.weight_kg) || (!s.source_id && s.weight_kg)
    );
    if (hasMismatch) { setFormError('לכל שורת מקור יש להזין גם מקור וגם משקל.'); return; }

    const payload = {
      product_id:        productId,
      batch_code:        batchCode.trim(),
      batch_date:        batchDate,
      notes:             notes.trim() || undefined,
      for_consolidation: forConsolidation,
      sources:           validSources.map((s) => ({
        source_type: s.source_type,
        source_id:   s.source_id,
        weight_kg:   parseFloat(s.weight_kg),
      })),
    };

    setSaving(true);
    const result = await dispatch(createBatchThunk(payload));
    setSaving(false);

    if (createBatchThunk.fulfilled.match(result)) {
      onSuccess?.(result.payload);
    } else {
      setFormError(result.payload || 'יצירת האצווה נכשלה. נסה שוב.');
    }
  };

  const activeProducts = products.filter((p) => p.is_active);

  return (
    <div className="form-card">
      <div className="form-card__header">
        <h3>יצירת אצווה חדשה</h3>
        <button className="icon-btn" type="button" onClick={onClose} aria-label="סגור">
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="manager-form">
        {formError && (
          <div className="alert alert--error">
            <AlertCircle size={15} /> {formError}
          </div>
        )}

        {/* Batch code + date */}
        <div className="form-row form-row--2col">
          <div className="form-field">
            <label>
              קוד אצווה <span className="required">*</span>
              {wasCodeEdited && <span className="field-badge--edited"> · נערך ידנית</span>}
            </label>
            {codeLoading ? (
              <div className="field-loading">
                <Loader2 size={14} className="spin" /> טוען קוד…
              </div>
            ) : (
              <input
                value={batchCode}
                maxLength={40}
                placeholder="PR-01062026-001"
                onChange={(e) => {
                  setBatchCode(e.target.value);
                  setCodeManuallyEdited(true);
                  setFormError('');
                }}
              />
            )}
          </div>

          <div className="form-field">
            <label>תאריך אצווה <span className="required">*</span></label>
            <input
              type="date"
              value={batchDate}
              max={todayStr()}
              onChange={(e) => setBatchDate(e.target.value)}
            />
          </div>
        </div>

        {/* Product */}
        <div className="form-field">
          <label>תוצ&quot;ג יעד <span className="required">*</span></label>
          <select
            value={productId}
            onChange={(e) => { setProductId(e.target.value); setFormError(''); }}
          >
            <option value="">— בחר מוצר —</option>
            {activeProducts.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
            ))}
          </select>
        </div>

        {/* Source rows */}
        {productId && (
          <div className="components-section">
            <div className="components-section__header">
              <label>
                מקורות חומר <span className="required">*</span>
                <span className="field-hint-inline"> (עד 6)</span>
              </label>
              <button
                type="button"
                className="btn-ghost btn-ghost--sm"
                onClick={addSource}
                disabled={sources.length >= 6}
              >
                <Plus size={13} /> הוסף מקור
              </button>
            </div>

            {sourcesLoading && (
              <div className="loading-row">
                <Loader2 size={14} className="spin" /> טוען מקורות זמינים…
              </div>
            )}

            {!sourcesLoading && sources.map((src, idx) => {
              const rowOptions      = src.source_type === 'batch' ? availableBatches : availableIntakes;
              const selected        = rowOptions.find((o) => o.source_id === src.source_id);
              const filteredOptions = rowOptions.filter(
                (o) => !usedSourceIds.includes(o.source_id) || o.source_id === src.source_id
              );
              return (
                <div key={idx} className="component-row">
                  <div className="component-row__type">
                    <select
                      value={src.source_type}
                      onChange={(e) => {
                        const t = e.target.value;
                        setSources((p) => p.map((s, i) => i === idx ? { ...s, source_type: t, source_id: '' } : s));
                      }}
                    >
                      <option value="intake">חומר גלם</option>
                      <option value="batch">אצווה</option>
                    </select>
                  </div>
                  <div className="component-row__select">
                    <select
                      value={src.source_id}
                      onChange={(e) => updateSource(idx, 'source_id', e.target.value)}
                    >
                      <option value="">— בחר {src.source_type === 'batch' ? 'אצווה' : 'קליטת חומר גלם'} —</option>
                      {filteredOptions.map((o) => (
                        <option key={o.source_id} value={o.source_id}>
                          {o.label}
                          {src.source_type === 'intake' && o.material_type ? ` · ${o.material_type}` : ''}
                          {src.source_type === 'intake' && o.supplier_name ? ` · ${o.supplier_name}` : ''}
                          {src.source_type === 'batch'  && o.product_name  ? ` (${o.product_name})` : ''}
                          {' · יתרה: '}{fmtKg(o.remaining_kg)}
                        </option>
                      ))}
                    </select>
                    {selected && (
                      <span className="field-hint">
                        יתרה זמינה: <strong>{fmtKg(selected.remaining_kg)}</strong>
                      </span>
                    )}
                  </div>

                  <div className="component-row__weight">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder='משקל ק"ג'
                      value={src.weight_kg}
                      onChange={(e) => updateSource(idx, 'weight_kg', e.target.value)}
                    />
                    {selected && src.weight_kg && (
                      <span
                        className="field-hint"
                        style={{
                          marginTop: '4px',
                          display: 'block',
                          color: selected.remaining_kg - parseFloat(src.weight_kg) < 0 ? 'var(--color-danger)' : 'var(--color-text-muted)'
                        }}
                      >
                        יתרה לאחר שימוש: <strong>{fmtKg(selected.remaining_kg - parseFloat(src.weight_kg))}</strong>
                      </span>
                    )}
                  </div>

                  {sources.length > 1 && (
                    <button
                      type="button"
                      className="icon-btn icon-btn--danger"
                      onClick={() => removeSource(idx)}
                      title="הסר שורה"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}

            {totalWeight > 0 && (
              <div className="allocation-summary">
                סה&quot;כ משקל אצווה: <strong>{fmtKg(totalWeight)}</strong>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="form-field">
          <label>הערות</label>
          <input
            value={notes}
            maxLength={500}
            placeholder="הערות לאצווה…"
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* For consolidation toggle */}
        <div className="form-field form-field--toggle">
          <span className="form-field__label">מיועד להאחדה <span className="required">*</span></span>
          <button
            type="button"
            role="switch"
            aria-checked={forConsolidation}
            className={`toggle-btn${forConsolidation ? ' toggle-btn--on' : ''}`}
            onClick={() => setForConsolidation((p) => !p)}
          >
            <span className="toggle-btn__track"><span className="toggle-btn__thumb" /></span>
            <span className="toggle-btn__label">{forConsolidation ? 'כן' : 'לא'}</span>
          </button>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
            ביטול
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
          >
            {saving ? 'יוצר אצווה…' : 'צור אצווה'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BatchForm;
