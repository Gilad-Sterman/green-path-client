import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Users, Plus, X, AlertCircle, RefreshCw, PowerOff, Power, Pencil } from 'lucide-react';
import RowActionsMenu from '../../components/RowActionsMenu';
import Toast from '../../components/Toast';
import useRelativeTime from '../../hooks/useRelativeTime';
import {
  fetchCustomers, createCustomerThunk, updateCustomerThunk,
  deactivateCustomerThunk, reactivateCustomerThunk, clearCustomersError,
} from '../../store/slices/customersSlice';

const EMPTY_FORM = { name: '', contact_person: '', phone: '', email: '' };
const FILTERS = ['all', 'active', 'inactive'];

const CustomersPage = () => {
  const dispatch = useDispatch();
  const { list: customers, loading, error, lastFetched } = useSelector((s) => s.customers);
  const refreshedLabel = useRelativeTime(lastFetched);

  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState('');
  const [formError, setFormError] = useState('');
  const [filter, setFilter]       = useState('active');

  useEffect(() => { dispatch(fetchCustomers()); }, [dispatch]);

  const handleChange = (e) => { setForm((p) => ({ ...p, [e.target.name]: e.target.value })); setFormError(''); };

  const handleEdit = (c) => {
    setEditingId(c.id);
    setForm({ name: c.name, contact_person: c.contact_person || '', phone: c.phone || '', email: c.email || '' });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Customer name is required.'); return; }

    const payload = {
      name:           form.name.trim(),
      contact_person: form.contact_person || undefined,
      phone:          form.phone          || undefined,
      email:          form.email          || undefined,
    };

    setSaving(true);
    const result = await dispatch(
      editingId ? updateCustomerThunk({ id: editingId, body: payload }) : createCustomerThunk(payload)
    );
    setSaving(false);

    const succeeded = editingId ? updateCustomerThunk.fulfilled.match(result) : createCustomerThunk.fulfilled.match(result);
    if (succeeded) {
      setToast(editingId ? `Customer "${form.name}" updated.` : `Customer "${form.name}" created.`);
      handleClose();
    } else {
      setFormError(result.payload || (editingId ? 'Failed to update.' : 'Failed to create customer.'));
    }
  };

  const handleToggleActive = async (customer) => {
    const thunk = customer.is_active ? deactivateCustomerThunk : reactivateCustomerThunk;
    const result = await dispatch(thunk(customer.id));
    if (thunk.fulfilled.match(result)) setToast(customer.is_active ? 'Customer deactivated.' : 'Customer reactivated.');
  };

  const handleClose = () => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); setFormError(''); dispatch(clearCustomersError()); };

  const visible = customers.filter((c) =>
    filter === 'all' ? true : filter === 'active' ? c.is_active : !c.is_active
  );

  return (
    <div className="manager-page">
      <div className="manager-page__header">
        <div>
          <h1>Customers</h1>
          <p className="page-subtitle">Customers this factory ships recycled material to</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="refresh-group">
            {refreshedLabel && <span className="last-refreshed">{refreshedLabel}</span>}
            <button className="btn-ghost btn-ghost--icon" onClick={() => dispatch(fetchCustomers({ force: true }))} disabled={loading} title="Refresh">
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>
          </div>
          <button className="btn-primary btn-primary--sm" onClick={() => setShowForm(true)}>
            <Plus size={16} /> New Customer
          </button>
        </div>
      </div>

      <Toast message={toast} onClose={() => setToast('')} />
      {error && <div className="alert alert--error"><AlertCircle size={16} />{error}</div>}

      {showForm && (
        <div className="form-card">
          <div className="form-card__header">
            <h3>{editingId ? 'Edit Customer' : 'New Customer'}</h3>
            <button className="icon-btn" onClick={handleClose}><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="manager-form">
            {formError && <div className="alert alert--error"><AlertCircle size={15} />{formError}</div>}

            <div className="form-row">
              <div className="form-field">
                <label>Name <span className="required">*</span></label>
                <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. EcoTrade Ltd." />
              </div>
              <div className="form-field">
                <label>Contact person</label>
                <input name="contact_person" value={form.contact_person} onChange={handleChange} placeholder="e.g. Sara Levy" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Phone</label>
                <input name="phone" value={form.phone} onChange={handleChange} placeholder="+972501234567" />
              </div>
              <div className="form-field">
                <label>Email</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="contact@customer.com" />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={handleClose} disabled={saving}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Create customer'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="filter-tabs">
        {FILTERS.map((f) => (
          <button key={f} className={`filter-tab${filter === f ? ' filter-tab--active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span style={{ marginRight: '6px', opacity: 0.6, fontSize: '11px' }}>
              ({f === 'all' ? customers.length : f === 'active' ? customers.filter((c) => c.is_active).length : customers.filter((c) => !c.is_active).length})
            </span>
          </button>
        ))}
      </div>

      {loading && <div className="loading-row">Loading customers…</div>}

      {!loading && visible.length === 0 && (
        <div className="empty-state">
          <Users size={36} />
          <p>{filter === 'all' ? 'No customers yet. Add the first one.' : `No ${filter} customers.`}</p>
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
                <th>Email</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.id}>
                  <td className="td-primary">{c.name}</td>
                  <td>{c.contact_person || <span className="td-muted">—</span>}</td>
                  <td>{c.phone || <span className="td-muted">—</span>}</td>
                  <td>{c.email || <span className="td-muted">—</span>}</td>
                  <td>
                    <span className={`badge ${c.is_active ? 'badge--green' : 'badge--neutral'}`}>
                      {c.is_active ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td>
                    <RowActionsMenu items={[
                      { label: 'Edit', icon: <Pencil size={14} />, onClick: () => handleEdit(c) },
                      c.is_active
                        ? { label: 'Deactivate', icon: <PowerOff size={14} />, onClick: () => handleToggleActive(c), danger: true }
                        : { label: 'Reactivate', icon: <Power size={14} />,    onClick: () => handleToggleActive(c) },
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

export default CustomersPage;
