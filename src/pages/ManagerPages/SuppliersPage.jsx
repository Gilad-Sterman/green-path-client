import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Building2, Plus, X, AlertCircle, RefreshCw, PowerOff, Power, Pencil } from 'lucide-react';
import RowActionsMenu from '../../components/RowActionsMenu';
import Toast from '../../components/Toast';
import useRelativeTime from '../../hooks/useRelativeTime';
import {
  fetchSuppliers, createSupplierThunk, updateSupplierThunk,
  deactivateSupplierThunk, reactivateSupplierThunk, clearSuppliersError,
} from '../../store/slices/suppliersSlice';

const MATERIAL_TYPES   = ['plastic', 'paper', 'metal', 'glass', 'textile', 'rubber', 'mixed', 'other'];
const MATERIAL_SOURCES = ['post_consumer', 'post_industrial', 'commercial', 'municipal', 'other'];

const EMPTY_FORM = {
  name: '', contact_person: '', phone: '', email: '', erp_id: '',
  allowed_material_types: [], allowed_material_sources: [],
};

const FILTERS = ['all', 'active', 'inactive'];

const SuppliersPage = () => {
  const dispatch = useDispatch();
  const { list: suppliers, loading, error, lastFetched } = useSelector((s) => s.suppliers);
  const refreshedLabel = useRelativeTime(lastFetched);

  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState('');
  const [formError, setFormError] = useState('');
  const [filter, setFilter]       = useState('active');

  useEffect(() => { dispatch(fetchSuppliers()); }, [dispatch]);

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setFormError('');
  };

  const toggleArray = (field, value) => {
    setForm((p) => ({
      ...p,
      [field]: p[field].includes(value)
        ? p[field].filter((v) => v !== value)
        : [...p[field], value],
    }));
  };

  const handleEdit = (s) => {
    setEditingId(s.id);
    setForm({
      name:                     s.name,
      contact_person:           s.contact_person  || '',
      phone:                    s.phone           || '',
      email:                    s.email           || '',
      erp_id:                   s.erp_id          || '',
      allowed_material_types:   s.allowed_material_types  || [],
      allowed_material_sources: s.allowed_material_sources || [],
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Supplier name is required.'); return; }

    const payload = {
      name:                     form.name.trim(),
      contact_person:           form.contact_person || undefined,
      phone:                    form.phone          || undefined,
      email:                    form.email          || undefined,
      erp_id:                   form.erp_id         || undefined,
      allowed_material_types:   form.allowed_material_types,
      allowed_material_sources: form.allowed_material_sources,
    };

    setSaving(true);
    const result = await dispatch(
      editingId
        ? updateSupplierThunk({ id: editingId, body: payload })
        : createSupplierThunk(payload)
    );
    setSaving(false);

    const succeeded = editingId
      ? updateSupplierThunk.fulfilled.match(result)
      : createSupplierThunk.fulfilled.match(result);

    if (succeeded) {
      setToast(editingId ? `Supplier "${form.name}" updated.` : `Supplier "${form.name}" created.`);
      handleClose();
    } else {
      setFormError(result.payload || (editingId ? 'Failed to update.' : 'Failed to create supplier.'));
    }
  };

  const handleToggleActive = async (supplier) => {
    const thunk = supplier.is_active ? deactivateSupplierThunk : reactivateSupplierThunk;
    const result = await dispatch(thunk(supplier.id));
    if (thunk.fulfilled.match(result)) {
      setToast(supplier.is_active ? 'Supplier deactivated.' : 'Supplier reactivated.');
    }
  };

  const handleClose = () => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); setFormError(''); dispatch(clearSuppliersError()); };

  const visible = suppliers.filter((s) =>
    filter === 'all' ? true : filter === 'active' ? s.is_active : !s.is_active
  );

  return (
    <div className="manager-page">
      <div className="manager-page__header">
        <div>
          <h1>Suppliers</h1>
          <p className="page-subtitle">Raw material suppliers for this factory</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="refresh-group">
            {refreshedLabel && <span className="last-refreshed">{refreshedLabel}</span>}
            <button className="btn-ghost btn-ghost--icon" onClick={() => dispatch(fetchSuppliers({ force: true }))} disabled={loading} title="Refresh">
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>
          </div>
          <button className="btn-primary btn-primary--sm" onClick={() => setShowForm(true)}>
            <Plus size={16} /> New Supplier
          </button>
        </div>
      </div>

      <Toast message={toast} onClose={() => setToast('')} />
      {error && <div className="alert alert--error"><AlertCircle size={16} />{error}</div>}

      {showForm && (
        <div className="form-card">
          <div className="form-card__header">
            <h3>{editingId ? 'Edit Supplier' : 'New Supplier'}</h3>
            <button className="icon-btn" onClick={handleClose}><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="manager-form">
            {formError && <div className="alert alert--error"><AlertCircle size={15} />{formError}</div>}

            <div className="form-row">
              <div className="form-field">
                <label>Name <span className="required">*</span></label>
                <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Kaplastics Ltd." />
              </div>
              <div className="form-field">
                <label>Contact person</label>
                <input name="contact_person" value={form.contact_person} onChange={handleChange} placeholder="e.g. Avi Cohen" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Phone</label>
                <input name="phone" value={form.phone} onChange={handleChange} placeholder="+972501234567" />
              </div>
              <div className="form-field">
                <label>Email</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="contact@supplier.com" />
              </div>
            </div>

            <div className="form-field">
              <label>ERP ID <span className="form-hint">(optional)</span></label>
              <input name="erp_id" value={form.erp_id} onChange={handleChange} placeholder="e.g. SUP-001" style={{ maxWidth: '280px' }} />
            </div>

            <div className="form-field">
              <label>Allowed material types</label>
              <div className="checkbox-group">
                {MATERIAL_TYPES.map((t) => (
                  <label key={t} className="checkbox-item">
                    <input type="checkbox" checked={form.allowed_material_types.includes(t)} onChange={() => toggleArray('allowed_material_types', t)} />
                    {t.replace('_', ' ')}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-field">
              <label>Allowed material sources</label>
              <div className="checkbox-group">
                {MATERIAL_SOURCES.map((s) => (
                  <label key={s} className="checkbox-item">
                    <input type="checkbox" checked={form.allowed_material_sources.includes(s)} onChange={() => toggleArray('allowed_material_sources', s)} />
                    {s.replace(/_/g, ' ')}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={handleClose} disabled={saving}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Create supplier'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="filter-tabs">
        {FILTERS.map((f) => (
          <button key={f} className={`filter-tab${filter === f ? ' filter-tab--active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span style={{ marginLeft: '6px', opacity: 0.6, fontSize: '11px' }}>
              ({f === 'all' ? suppliers.length : f === 'active' ? suppliers.filter((s) => s.is_active).length : suppliers.filter((s) => !s.is_active).length})
            </span>
          </button>
        ))}
      </div>

      {loading && <div className="loading-row">Loading suppliers…</div>}

      {!loading && visible.length === 0 && (
        <div className="empty-state">
          <Building2 size={36} />
          <p>{filter === 'all' ? 'No suppliers yet. Add the first one.' : `No ${filter} suppliers.`}</p>
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Phone</th>
                <th>Material types</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr key={s.id}>
                  <td className="td-primary">{s.name}</td>
                  <td>{s.contact_person || <span className="td-muted">—</span>}</td>
                  <td>{s.phone || <span className="td-muted">—</span>}</td>
                  <td>
                    {s.allowed_material_types?.length > 0
                      ? <div className="tag-list">{s.allowed_material_types.map((t) => <span key={t} className="tag">{t}</span>)}</div>
                      : <span className="td-muted">—</span>}
                  </td>
                  <td>
                    <span className={`badge ${s.is_active ? 'badge--green' : 'badge--neutral'}`}>
                      {s.is_active ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td>
                    <RowActionsMenu items={[
                      { label: 'Edit', icon: <Pencil size={14} />, onClick: () => handleEdit(s) },
                      s.is_active
                        ? { label: 'Deactivate', icon: <PowerOff size={14} />, onClick: () => handleToggleActive(s), danger: true }
                        : { label: 'Reactivate', icon: <Power size={14} />,    onClick: () => handleToggleActive(s) },
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

export default SuppliersPage;
