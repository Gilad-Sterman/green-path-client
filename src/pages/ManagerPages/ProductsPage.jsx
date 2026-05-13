import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Plus, X, AlertCircle, RefreshCw, PowerOff, Power, Pencil } from 'lucide-react';
import RowActionsMenu from '../../components/RowActionsMenu';
import Toast from '../../components/Toast';
import useRelativeTime from '../../hooks/useRelativeTime';
import {
  fetchProducts, createProductThunk, updateProductThunk,
  deactivateProductThunk, reactivateProductThunk, clearProductsError,
} from '../../store/slices/productsSlice';

const EMPTY_FORM = { name: '', sku: '', description: '', required_lab_tests: '' };
const FILTERS = ['all', 'active', 'inactive'];

const ProductsPage = () => {
  const dispatch = useDispatch();
  const { list: products, loading, error, lastFetched } = useSelector((s) => s.products);
  const refreshedLabel = useRelativeTime(lastFetched);

  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState('');
  const [formError, setFormError] = useState('');
  const [filter, setFilter]       = useState('active');

  useEffect(() => { dispatch(fetchProducts()); }, [dispatch]);

  const handleChange = (e) => { setForm((p) => ({ ...p, [e.target.name]: e.target.value })); setFormError(''); };

  const handleEdit = (p) => {
    setEditingId(p.id);
    setForm({
      name:               p.name,
      sku:                p.sku,
      description:        p.description || '',
      required_lab_tests: (p.required_lab_tests || []).join(', '),
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Product name is required.'); return; }
    if (!form.sku.trim())  { setFormError('SKU is required.'); return; }

    const payload = {
      name:               form.name.trim(),
      sku:                form.sku.trim(),
      description:        form.description || undefined,
      required_lab_tests: form.required_lab_tests.split(',').map((t) => t.trim()).filter(Boolean),
    };

    setSaving(true);
    const result = await dispatch(
      editingId ? updateProductThunk({ id: editingId, body: payload }) : createProductThunk(payload)
    );
    setSaving(false);

    const succeeded = editingId ? updateProductThunk.fulfilled.match(result) : createProductThunk.fulfilled.match(result);
    if (succeeded) {
      setToast(editingId ? `Product "${form.name}" updated.` : `Product "${form.name}" created.`);
      handleClose();
    } else {
      setFormError(result.payload || (editingId ? 'Failed to update.' : 'Failed to create product.'));
    }
  };

  const handleToggleActive = async (product) => {
    const thunk = product.is_active ? deactivateProductThunk : reactivateProductThunk;
    const result = await dispatch(thunk(product.id));
    if (thunk.fulfilled.match(result)) setToast(product.is_active ? 'Product deactivated.' : 'Product reactivated.');
  };

  const handleClose = () => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); setFormError(''); dispatch(clearProductsError()); };

  const visible = products.filter((p) =>
    filter === 'all' ? true : filter === 'active' ? p.is_active : !p.is_active
  );

  return (
    <div className="manager-page">
      <div className="manager-page__header">
        <div>
          <h1>Products</h1>
          <p className="page-subtitle">Finished goods catalog — used when creating batches</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="refresh-group">
            {refreshedLabel && <span className="last-refreshed">{refreshedLabel}</span>}
            <button className="btn-ghost btn-ghost--icon" onClick={() => dispatch(fetchProducts({ force: true }))} disabled={loading} title="Refresh">
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>
          </div>
          <button className="btn-primary btn-primary--sm" onClick={() => setShowForm(true)}>
            <Plus size={16} /> New Product
          </button>
        </div>
      </div>

      <Toast message={toast} onClose={() => setToast('')} />
      {error && <div className="alert alert--error"><AlertCircle size={16} />{error}</div>}

      {showForm && (
        <div className="form-card">
          <div className="form-card__header">
            <h3>{editingId ? 'Edit Product' : 'New Product'}</h3>
            <button className="icon-btn" onClick={handleClose}><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="manager-form">
            {formError && <div className="alert alert--error"><AlertCircle size={15} />{formError}</div>}

            <div className="form-row">
              <div className="form-field">
                <label>Product name <span className="required">*</span></label>
                <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. rPET Pellets" />
              </div>
              <div className="form-field">
                <label>SKU <span className="required">*</span></label>
                <input name="sku" value={form.sku} onChange={handleChange} placeholder="e.g. RPET-001" />
              </div>
            </div>

            <div className="form-field">
              <label>Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} placeholder="Optional product description…" rows={2} />
            </div>

            <div className="form-field">
              <label>Required lab tests <span className="form-hint">(comma-separated, optional)</span></label>
              <input
                name="required_lab_tests"
                value={form.required_lab_tests}
                onChange={handleChange}
                placeholder="e.g. contamination, moisture, viscosity"
              />
            </div>

            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={handleClose} disabled={saving}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Create product'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="filter-tabs">
        {FILTERS.map((f) => (
          <button key={f} className={`filter-tab${filter === f ? ' filter-tab--active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span style={{ marginLeft: '6px', opacity: 0.6, fontSize: '11px' }}>
              ({f === 'all' ? products.length : f === 'active' ? products.filter((p) => p.is_active).length : products.filter((p) => !p.is_active).length})
            </span>
          </button>
        ))}
      </div>

      {loading && <div className="loading-row">Loading products…</div>}

      {!loading && visible.length === 0 && (
        <div className="empty-state">
          <Box size={36} />
          <p>{filter === 'all' ? 'No products yet. Create the first one.' : `No ${filter} products.`}</p>
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Description</th>
                <th>Lab tests</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id}>
                  <td className="td-primary">{p.name}</td>
                  <td><code style={{ fontSize: '12px' }}>{p.sku}</code></td>
                  <td className="td-muted">{p.description || <span className="td-muted">—</span>}</td>
                  <td>
                    {p.required_lab_tests?.length > 0
                      ? <div className="tag-list">{p.required_lab_tests.map((t) => <span key={t} className="tag">{t}</span>)}</div>
                      : <span className="td-muted">—</span>}
                  </td>
                  <td>
                    <span className={`badge ${p.is_active ? 'badge--green' : 'badge--neutral'}`}>
                      {p.is_active ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td>
                    <RowActionsMenu items={[
                      { label: 'Edit', icon: <Pencil size={14} />, onClick: () => handleEdit(p) },
                      p.is_active
                        ? { label: 'Deactivate', icon: <PowerOff size={14} />, onClick: () => handleToggleActive(p), danger: true }
                        : { label: 'Reactivate', icon: <Power size={14} />,    onClick: () => handleToggleActive(p) },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
