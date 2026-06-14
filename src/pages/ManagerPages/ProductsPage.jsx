import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Plus, X, AlertCircle, RefreshCw, Pencil, Trash2, Upload, FileCheck, Loader2 } from 'lucide-react';
import RowActionsMenu from '../../components/RowActionsMenu';
import Toast from '../../components/Toast';
import useRelativeTime from '../../hooks/useRelativeTime';
import { uploadDocument, listDocuments } from '../../api/documents';
import {
  fetchProducts, createProductThunk, updateProductThunk,
  deactivateProductThunk, reactivateProductThunk, clearProductsError,
} from '../../store/slices/productsSlice';

const EMPTY_FORM = { name: '', sku: '', description: '', required_lab_tests: '', is_active: true };
const FILTERS = ['all', 'active', 'inactive'];
const FILTER_LABELS = { all: 'הכל', active: 'פעיל', inactive: 'לא פעיל' };

const RECIPE_MATERIALS = [
  { value: 'PET', label: 'PET', is_recycled: true },
  { value: 'HDPE', label: 'HDPE', is_recycled: true },
  { value: 'PP', label: 'PP', is_recycled: true },
  { value: 'LDPE', label: 'LDPE', is_recycled: true },
  { value: 'PVC', label: 'PVC', is_recycled: true },
  { value: 'PE', label: 'PE', is_recycled: true },
  { value: 'mixed', label: 'מעורב', is_recycled: true },
  { value: 'other', label: 'אחר', is_recycled: true },
  { value: 'virgin', label: 'וירג׳ין', is_recycled: false },
];
const EMPTY_RECIPE_ROW = { material_type: '', is_recycled: true, percent: '' };

const ProductsPage = () => {
  const dispatch = useDispatch();
  const { list: products, loading, error, lastFetched } = useSelector((s) => s.products);
  const refreshedLabel = useRelativeTime(lastFetched);

  const specFileRef = useRef(null);
  const labFileRef  = useRef(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [formError, setFormError] = useState('');
  const [filter, setFilter] = useState('active');
  const [recipe, setRecipe] = useState([{ ...EMPTY_RECIPE_ROW }]);

  const [specDocId, setSpecDocId]       = useState(null);
  const [specFileName, setSpecFileName] = useState('');
  const [specUploading, setSpecUploading] = useState(false);
  const [labDocId, setLabDocId]         = useState(null);
  const [labFileName, setLabFileName]   = useState('');
  const [labUploading, setLabUploading] = useState(false);
  const [editingDocs, setEditingDocs]   = useState({ spec: null, lab: null, loading: false });

  useEffect(() => { dispatch(fetchProducts()); }, [dispatch]);

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value })); setFormError('');
  };

  const addMaterial = () => setRecipe((p) => p.length < 6 ? [...p, { ...EMPTY_RECIPE_ROW }] : p);
  const removeMaterial = (idx) => setRecipe((p) => p.filter((_, i) => i !== idx));
  const updateRecipeMaterial = (idx, field, value) => {
    setRecipe((p) => p.map((r, i) => {
      if (i !== idx) return r;
      if (field === 'material_type') {
        const mat = RECIPE_MATERIALS.find((m) => m.value === value);
        return { ...r, material_type: value, is_recycled: mat ? mat.is_recycled : true };
      }
      return { ...r, [field]: value };
    }));
    setFormError('');
  };

  const handleEdit = async (p) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      sku: p.sku,
      description: p.description || '',
      required_lab_tests: (p.required_lab_tests || []).join(', '),
      is_active: p.is_active,
    });
    setRecipe(
      p.material_recipe?.length > 0
        ? p.material_recipe.map((r) => ({ ...r, percent: String(r.percent) }))
        : [{ ...EMPTY_RECIPE_ROW }]
    );
    setShowForm(true);
    setEditingDocs({ spec: null, lab: null, loading: true });
    try {
      const { data } = await listDocuments({ related_entity_type: 'product', related_entity_id: p.id });
      const docs = data?.data?.documents || [];
      setEditingDocs({
        spec: docs.find((d) => d.document_type === 'product_spec') || null,
        lab:  docs.find((d) => d.document_type === 'lab_test')     || null,
        loading: false,
      });
    } catch {
      setEditingDocs({ spec: null, lab: null, loading: false });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('יש להזין שם תוצ"ג.'); return; }
    if (form.name.trim().length > 30) { setFormError('שם תוצ"ג יכול להכיל עד 30 תווים.'); return; }
    if (!editingId && !specDocId) { setFormError('יש להעלות מפרט מוצר לפני שמירה.'); return; }
    // if (!form.sku.trim()) { setFormError('יש להזין מקטלג (SKU).'); return; }

    const validRecipe = recipe.filter((r) => r.material_type && r.percent);
    if (validRecipe.length === 0) { setFormError('יש להגדיר לפחות חומר מקור אחד.'); return; }
    const hasIncomplete = recipe.some((r) => (r.material_type && !r.percent) || (!r.material_type && r.percent));
    if (hasIncomplete) { setFormError('לכל שורת חומר יש לבחור חומר ואחוז.'); return; }
    const rSum = validRecipe.reduce((s, r) => s + parseFloat(r.percent), 0);
    if (Math.abs(rSum - 100) > 0.01) { setFormError(`סך האחוזים חייב להיות 100% (כרגע: ${rSum.toFixed(1)}%).`); return; }
    const rTypes = validRecipe.map((r) => r.material_type);
    if (new Set(rTypes).size !== rTypes.length) { setFormError('לא ניתן לבחור את אותו חומר יותר מפעם אחת.'); return; }
    const computedEligible = validRecipe.reduce((s, r) => s + (r.is_recycled ? parseFloat(r.percent) : 0), 0);

    const payload = {
      name: form.name.trim(),
      // sku: form.sku.trim(),
      description: form.description || undefined,
      // required_lab_tests: form.required_lab_tests.split(',').map((t) => t.trim()).filter(Boolean),
      material_recipe: validRecipe.map((r) => ({ material_type: r.material_type, is_recycled: r.is_recycled, percent: parseFloat(r.percent) })),
      eligible_percent: computedEligible,
      is_active: form.is_active,
      spec_document_ids: specDocId ? [specDocId] : [],
      lab_document_ids:  labDocId  ? [labDocId]  : [],
    };

    setSaving(true);
    const result = await dispatch(
      editingId ? updateProductThunk({ id: editingId, body: payload }) : createProductThunk(payload)
    );
    setSaving(false);

    const succeeded = editingId ? updateProductThunk.fulfilled.match(result) : createProductThunk.fulfilled.match(result);
    if (succeeded) {
      setToast(editingId ? `תוצ"ג "ע${form.name}" עודכן.` : `תוצ"ג "${form.name}" נוצר.`);
      handleClose();
    } else {
      setFormError(result.payload || (editingId ? 'עדכון נכשל.' : 'יצירת תוצ"ג נכשלה.'));
    }
  };

  const handleToggleActive = async (product) => {
    const thunk = product.is_active ? deactivateProductThunk : reactivateProductThunk;
    const result = await dispatch(thunk(product.id));
    if (thunk.fulfilled.match(result)) setToast(product.is_active ? `תוצ"ג "${product.name}" הושבת.` : `תוצ"ג "${product.name}" הופעל מחדש.`);
  };

  const handleSpecFile = async (e) => {
    const file = e.target.files?.[0];
    if (specFileRef.current) specFileRef.current.value = '';
    if (!file) return;
    setSpecUploading(true);
    setFormError('');
    try {
      const res = await uploadDocument(file, { document_type: 'product_spec' });
      setSpecDocId(res.data?.data?.document?.id || null);
      setSpecFileName(file.name);
    } catch {
      setFormError('העלאת מפרט המוצר נכשלה. נסה שנית.');
    } finally {
      setSpecUploading(false);
    }
  };

  const handleLabFile = async (e) => {
    const file = e.target.files?.[0];
    if (labFileRef.current) labFileRef.current.value = '';
    if (!file) return;
    setLabUploading(true);
    setFormError('');
    try {
      const res = await uploadDocument(file, { document_type: 'lab_test' });
      setLabDocId(res.data?.data?.document?.id || null);
      setLabFileName(file.name);
    } catch {
      setFormError('העלאת בדיקות המעבדה נכשלה. נסה שנית.');
    } finally {
      setLabUploading(false);
    }
  };

  const handleClose = () => {
    setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); setRecipe([{ ...EMPTY_RECIPE_ROW }]); setFormError('');
    setSpecDocId(null); setSpecFileName(''); setSpecUploading(false);
    setLabDocId(null); setLabFileName(''); setLabUploading(false);
    setEditingDocs({ spec: null, lab: null, loading: false });
    dispatch(clearProductsError());
  };

  const recipeSum = recipe.reduce((s, r) => s + (parseFloat(r.percent) || 0), 0);
  const eligiblePct = Math.abs(recipeSum - 100) < 0.01
    ? recipe.reduce((s, r) => s + (r.is_recycled ? (parseFloat(r.percent) || 0) : 0), 0)
    : null;

  const visible = products.filter((p) =>
    filter === 'all' ? true : filter === 'active' ? p.is_active : !p.is_active
  );

  return (
    <div className="manager-page">
      <div className="manager-page__header">
        <div>
          <h1>ניהול תוצ"ג</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="refresh-group">
            {refreshedLabel && <span className="last-refreshed">{refreshedLabel}</span>}
            <button className="btn-ghost btn-ghost--icon" onClick={() => dispatch(fetchProducts({ force: true }))} disabled={loading} title="רענן">
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>
      </div>
      <button className="btn-primary new-product-btn" onClick={() => setShowForm(true)}>
        <Plus size={16} /> תוצ"ג חדש
      </button>

      <Toast message={toast} onClose={() => setToast('')} />
      {error && <div className="alert alert--error"><AlertCircle size={16} />{error}</div>}

      {showForm && (
        <div className="form-card">
          <div className="form-card__header">
            <h3>{editingId ? 'עריכת תוצ"ג' : 'תוצ"ג חדש'}</h3>
            <button className="icon-btn" onClick={handleClose}><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="manager-form">
            {formError && <div className="alert alert--error"><AlertCircle size={15} />{formError}</div>}

            <div className="form-field">
              <label>שם תוצ"ג <span className="required">*</span></label>
              <input name="name" value={form.name} onChange={handleChange} placeholder="לדוגמה: rPET גרנולות" maxLength={30} disabled={!!editingId} />
            </div>
            {/* <div className="form-field">
              <label>מקטלג (SKU) <span className="required">*</span></label>
              <input name="sku" value={form.sku} onChange={handleChange} placeholder="לדוגמה: RPET-001" />
            </div> */}

            {/* <div className="form-field">
              <label>בדיקות מעבדה <span className="form-hint">(מופרדות בפסיק, אופציונלי)</span></label>
              <input
                name="required_lab_tests"
                value={form.required_lab_tests}
                onChange={handleChange}
                placeholder="לדוגמה: זיהום, לחות, ויסקוזיטה"
              />
            </div> */}

            <div className="components-section">
              <div className="components-section__header">
                <label>חומרים משתתפים <span className="required">*</span></label>
                <button type="button" className="btn-ghost btn-ghost--sm" onClick={addMaterial} disabled={recipe.length >= 6 || !!editingId}>
                  <Plus size={13} /> הוסף חומר
                </button>
              </div>
              {recipe.map((row, idx) => (
                <div key={idx} className="component-row">
                  <div className="component-row__select">
                    <select value={row.material_type} onChange={(e) => updateRecipeMaterial(idx, 'material_type', e.target.value)} disabled={!!editingId}>
                      <option value="">— בחר חומר —</option>
                      {RECIPE_MATERIALS.map((m) => (
                        <option key={m.value} value={m.value} disabled={recipe.some((r, i) => i !== idx && r.material_type === m.value)}>
                          {m.label}{!m.is_recycled ? ' (ממקור בתולי)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="component-row__weight">
                    <input
                      type="number" step="1" min="1" max="99"
                      placeholder="%"
                      value={row.percent}
                      onChange={(e) => updateRecipeMaterial(idx, 'percent', e.target.value)}
                      disabled={!!editingId}
                    />
                  </div>
                  {recipe.length > 1 && (
                    <button type="button" className="icon-btn icon-btn--danger" onClick={() => removeMaterial(idx)} title="הסר">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              {recipeSum > 0 && (
                <div className={`allocation-summary${Math.abs(recipeSum - 100) < 0.01 ? ' allocation-summary--ok' : ''}`}>
                  <span>סה"כ: <strong>{recipeSum.toFixed(0)}%</strong></span>
                  {eligiblePct !== null && (
                    <span style={{ marginRight: '12px' }}>אחוז זכאות: <strong>{eligiblePct.toFixed(0)}%</strong></span>
                  )}
                  {recipeSum > 100 && (
                    <span className="allocation-summary__warn" style={{ marginRight: '12px' }}>חורג מ-100%</span>
                  )}
                </div>
              )}
            </div>

            <div className="form-field">
              <label>תיאור</label>
              <textarea name="description" value={form.description} onChange={handleChange} placeholder="תיאור אופציונלי למוצר..." rows={2} maxLength={200} />
            </div>

            {editingId && (
              <div className="form-field">
                <label>מסמכים מצורפים</label>
                {editingDocs.loading ? (
                  <div className="file-upload-indicator file-upload-indicator--loading">
                    <Loader2 size={15} className="spin" />
                    <span>טוען מסמכים…</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className={`file-upload-indicator ${editingDocs.spec ? 'file-upload-indicator--done' : 'file-upload-indicator--empty'}`}>
                      <FileCheck size={14} />
                      <span className="file-upload-indicator__label">מפרט מוצר:</span>
                      <span className="file-upload-indicator__name">
                        {editingDocs.spec ? (editingDocs.spec.file_name || 'קובץ מצורף') : 'לא הועלה'}
                      </span>
                    </div>
                    <div className={`file-upload-indicator ${editingDocs.lab ? 'file-upload-indicator--done' : 'file-upload-indicator--empty'}`}>
                      <FileCheck size={14} />
                      <span className="file-upload-indicator__label">בדיקות מעבדה:</span>
                      <span className="file-upload-indicator__name">
                        {editingDocs.lab ? (editingDocs.lab.file_name || 'קובץ מצורף') : 'לא הועלו'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!editingId && (
              <>
                <div className="form-field">
                  <label>מפרט מוצר <span className="required">*</span></label>
                  <input
                    ref={specFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    style={{ display: 'none' }}
                    onChange={handleSpecFile}
                  />
                  {specUploading ? (
                    <div className="file-upload-indicator file-upload-indicator--loading">
                      <Loader2 size={15} className="spin" />
                      <span>מעלה קובץ…</span>
                    </div>
                  ) : specDocId ? (
                    <div className="file-upload-indicator file-upload-indicator--done">
                      <FileCheck size={15} />
                      <span className="file-upload-indicator__name">{specFileName}</span>
                      <button type="button" className="icon-btn" onClick={() => { setSpecDocId(null); setSpecFileName(''); }}>
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <button type="button" className="file-upload-btn" onClick={() => specFileRef.current?.click()}>
                      <Upload size={15} />
                      <span>העלאת מפרט מוצר (PDF / תמונה)</span>
                    </button>
                  )}
                </div>
                <div className="form-field">
                  <label>בדיקות מעבדה <span className="form-hint">(אופציונלי)</span></label>
                  <input
                    ref={labFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    style={{ display: 'none' }}
                    onChange={handleLabFile}
                  />
                  {labUploading ? (
                    <div className="file-upload-indicator file-upload-indicator--loading">
                      <Loader2 size={15} className="spin" />
                      <span>מעלה קובץ…</span>
                    </div>
                  ) : labDocId ? (
                    <div className="file-upload-indicator file-upload-indicator--done">
                      <FileCheck size={15} />
                      <span className="file-upload-indicator__name">{labFileName}</span>
                      <button type="button" className="icon-btn" onClick={() => { setLabDocId(null); setLabFileName(''); }}>
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <button type="button" className="file-upload-btn" onClick={() => labFileRef.current?.click()}>
                      <Upload size={15} />
                      <span>העלאת בדיקות מעבדה (PDF / תמונה)</span>
                    </button>
                  )}
                </div>
              </>
            )}

            <div className="form-field">
              <label>סטטוס</label>
              <button
                type="button"
                className={`status-toggle${form.is_active ? ' status-toggle--on' : ''}`}
                onClick={() => handleChange({ target: { name: 'is_active', value: !form.is_active } })}
                title={form.is_active ? 'לחץ להשבתה' : 'לחץ להפעלה'}
              >
                <span className="status-toggle__track">
                  <span className="status-toggle__thumb" />
                </span>
                <span className="status-toggle__label">{form.is_active ? 'פעיל' : 'לא פעיל'}</span>
              </button>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={handleClose} disabled={saving}>ביטול</button>
              <button type="submit" className="btn-primary" disabled={saving || specUploading || labUploading || (!editingId && !specDocId)}>{saving ? 'שומר…' : editingId ? 'שמור שינויים' : 'צור תוצ"ג'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="filter-tabs">
        {FILTERS.map((f) => (
          <button key={f} className={`filter-tab${filter === f ? ' filter-tab--active' : ''}`} onClick={() => setFilter(f)}>
            {FILTER_LABELS[f] || f}
            <span style={{ marginRight: '6px', opacity: 0.6, fontSize: '11px' }}>
              ({f === 'all' ? products.length : f === 'active' ? products.filter((p) => p.is_active).length : products.filter((p) => !p.is_active).length})
            </span>
          </button>
        ))}
      </div>

      {loading && <div className="loading-row">טוען תוצ"ג…</div>}

      {!loading && visible.length === 0 && (
        <div className="empty-state">
          <Box size={36} />
          <p>{filter === 'all' ? 'טרם נוצרו תוצ"גים. צור את הראשון.' : `אין תוצ"גים ${FILTER_LABELS[filter] || filter}.`}</p>
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div className="mobile-cards">
          {visible.map((p) => (
            <div key={p.id} className="mobile-card">
              <div className="mobile-card__header">
                <div style={{ display: 'flex', flexDirection: 'row', gap: '12px' }}>
                  <span className="mobile-card__title">{p.name}</span>
                  {p.eligible_percent != null && (
                    <div className="mobile-card__row">
                      <span className="mobile-card__label">אחוז זכאות: {parseFloat(p.eligible_percent).toFixed(0)}%</span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RowActionsMenu items={[
                    { label: 'עריכה / צפייה', icon: <Pencil size={14} />, onClick: () => handleEdit(p) },
                  ]} />
                </div>
              </div>
              <button
                className={`status-toggle${p.is_active ? ' status-toggle--on' : ''}`}
                onClick={() => handleToggleActive(p)}
                title={p.is_active ? 'לחץ להשבתה' : 'לחץ להפעלה'}
                aria-pressed={p.is_active}
              >
                <span className="status-toggle__track">
                  <span className="status-toggle__thumb" />
                </span>
                <span className="status-toggle__label">{p.is_active ? 'פעיל' : 'לא פעיל'}</span>
              </button>

              {/* {p.description && <p className="mobile-card__desc">{p.description}</p>} */}
              {/* {p.required_lab_tests?.length > 0 && (
                <div className="mobile-card__tags">
                  <span className="mobile-card__label">בדיקות:</span>
                  <div className="tag-list">
                    {p.required_lab_tests.map((t) => <span key={t} className="tag">{t}</span>)}
                  </div>
                </div>
              )} */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
