import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Building2, Users, Plus, X, AlertCircle, RefreshCw, Pencil } from 'lucide-react';
import RowActionsMenu from '../../components/RowActionsMenu';
import Toast from '../../components/Toast';
import useRelativeTime from '../../hooks/useRelativeTime';
import {
  fetchSuppliers, createSupplierThunk, updateSupplierThunk,
  deactivateSupplierThunk, reactivateSupplierThunk, clearSuppliersError,
} from '../../store/slices/suppliersSlice';
import {
  fetchCustomers, createCustomerThunk, updateCustomerThunk,
  deactivateCustomerThunk, reactivateCustomerThunk, clearCustomersError,
} from '../../store/slices/customersSlice';

const MATERIAL_TYPES   = ['PET', 'HDPE', 'PP', 'LDPE', 'PVC', 'PE', 'mixed', 'other'];
const MATERIAL_SOURCES = ['post_consumer', 'post_industrial', 'commercial', 'municipal', 'other'];

const MATERIAL_TYPE_HE = {
  PET: 'PET', HDPE: 'HDPE', PP: 'PP', LDPE: 'LDPE',
  PVC: 'PVC', PE: 'PE', mixed: 'מעורב', other: 'אחר',
};
const MATERIAL_SOURCE_HE = {
  post_consumer: 'פוסט-צרכני', post_industrial: 'פוסט-תעשייתי',
  commercial: 'מסחרי', municipal: 'עירוני', other: 'אחר',
};

const FILTERS       = ['all', 'active', 'inactive'];
const FILTER_LABELS = { all: 'הכל', active: 'פעיל', inactive: 'לא פעיל' };

const EMPTY_SUPPLIER = { name: '', contact_person: '', phone: '', email: '', erp_id: '', allowed_material_types: [], allowed_material_sources: [] };
const EMPTY_CUSTOMER = { name: '', contact_person: '', phone: '', email: '' };

const SuppliersPage = () => {
  const dispatch = useDispatch();
  const { list: suppliers, loading: suppLoading, error: suppError, lastFetched: suppFetched } = useSelector((s) => s.suppliers);
  const { list: customers, loading: custLoading, error: custError, lastFetched: custFetched } = useSelector((s) => s.customers);

  const [tab, setTab]             = useState('suppliers');
  const [filter, setFilter]       = useState('all');
  const [showForm, setShowForm]   = useState(false);
  const [formType, setFormType]   = useState('supplier');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]           = useState(EMPTY_SUPPLIER);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState('');
  const [formError, setFormError] = useState('');

  const loading     = tab === 'suppliers' ? suppLoading : custLoading;
  const error       = tab === 'suppliers' ? suppError   : custError;
  const lastFetched = tab === 'suppliers' ? suppFetched : custFetched;
  const refreshedLabel = useRelativeTime(lastFetched);

  useEffect(() => {
    dispatch(fetchSuppliers({ force: false }));
    dispatch(fetchCustomers({ force: false }));
  }, [dispatch]);

  const handleChange = (e) => { setForm((p) => ({ ...p, [e.target.name]: e.target.value })); setFormError(''); };

  const toggleArray = (field, value) => {
    setForm((p) => ({
      ...p,
      [field]: p[field].includes(value) ? p[field].filter((v) => v !== value) : [...p[field], value],
    }));
  };

  const openSupplierForm = (s = null) => {
    setFormType('supplier');
    setEditingId(s?.id || null);
    setForm(s ? {
      name: s.name, contact_person: s.contact_person || '', phone: s.phone || '',
      email: s.email || '', erp_id: s.erp_id || '',
      allowed_material_types: s.allowed_material_types || [],
      allowed_material_sources: s.allowed_material_sources || [],
    } : EMPTY_SUPPLIER);
    setShowForm(true);
  };

  const openCustomerForm = (c = null) => {
    setFormType('customer');
    setEditingId(c?.id || null);
    setForm(c ? { name: c.name, contact_person: c.contact_person || '', phone: c.phone || '', email: c.email || '' } : EMPTY_CUSTOMER);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('יש להזין שם.'); return; }
    setSaving(true);

    if (formType === 'supplier') {
      const payload = {
        name: form.name.trim(), contact_person: form.contact_person || undefined,
        phone: form.phone || undefined, email: form.email || undefined,
        erp_id: form.erp_id || undefined,
        allowed_material_types: form.allowed_material_types,
        allowed_material_sources: form.allowed_material_sources,
      };
      const result = await dispatch(editingId ? updateSupplierThunk({ id: editingId, body: payload }) : createSupplierThunk(payload));
      const ok = editingId ? updateSupplierThunk.fulfilled.match(result) : createSupplierThunk.fulfilled.match(result);
      if (ok) { setToast(editingId ? `ספק "${form.name}" עודכן.` : `ספק "${form.name}" נוצר.`); handleClose(); }
      else setFormError(result.payload || 'שגיאה בשמירה.');
    } else {
      const payload = { name: form.name.trim(), contact_person: form.contact_person || undefined, phone: form.phone || undefined, email: form.email || undefined };
      const result = await dispatch(editingId ? updateCustomerThunk({ id: editingId, body: payload }) : createCustomerThunk(payload));
      const ok = editingId ? updateCustomerThunk.fulfilled.match(result) : createCustomerThunk.fulfilled.match(result);
      if (ok) { setToast(editingId ? `לקוח "${form.name}" עודכן.` : `לקוח "${form.name}" נוצר.`); handleClose(); }
      else setFormError(result.payload || 'שגיאה בשמירה.');
    }
    setSaving(false);
  };

  const handleToggleSupplier = async (s) => {
    const thunk = s.is_active ? deactivateSupplierThunk : reactivateSupplierThunk;
    const result = await dispatch(thunk(s.id));
    if (thunk.fulfilled.match(result)) setToast(s.is_active ? `ספק "${s.name}" הושבת.` : `ספק "${s.name}" הופעל.`);
  };

  const handleToggleCustomer = async (c) => {
    const thunk = c.is_active ? deactivateCustomerThunk : reactivateCustomerThunk;
    const result = await dispatch(thunk(c.id));
    if (thunk.fulfilled.match(result)) setToast(c.is_active ? `לקוח "${c.name}" הושבת.` : `לקוח "${c.name}" הופעל.`);
  };

  const handleClose = () => {
    setShowForm(false); setEditingId(null); setForm(EMPTY_SUPPLIER); setFormError('');
    dispatch(clearSuppliersError()); dispatch(clearCustomersError());
  };

  const filterFn = (item) => filter === 'all' ? true : filter === 'active' ? item.is_active : !item.is_active;
  const visibleSuppliers = suppliers.filter(filterFn);
  const visibleCustomers = customers.filter(filterFn);
  const visible = tab === 'suppliers' ? visibleSuppliers : visibleCustomers;
  const currentList = tab === 'suppliers' ? suppliers : customers;

  return (
    <div className="manager-page">
      <div className="manager-page__header">
        <div>
          <h1>ניהול ספקים ולקוחות</h1>
        </div>
        <div className="refresh-group">
          {refreshedLabel && <span className="last-refreshed">{refreshedLabel}</span>}
          <button
            className="btn-ghost btn-ghost--icon"
            onClick={() => tab === 'suppliers' ? dispatch(fetchSuppliers({ force: true })) : dispatch(fetchCustomers({ force: true }))}
            disabled={loading}
            title="רענן"
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      <div className="partners-add-btns">
        <button className="btn-primary new-supplier-btn" onClick={() => openSupplierForm()}>
          <Plus size={16} />הוספת ספק 
        </button>
        <button className="btn-primary new-customer-btn" onClick={() => openCustomerForm()}>
          <Plus size={16} />הוספת לקוח 
        </button>
      </div>

      <Toast message={toast} onClose={() => setToast('')} />
      {error && <div className="alert alert--error"><AlertCircle size={16} />{error}</div>}

      <div className="partners-tabs">
        <button className={`partners-tab${tab === 'suppliers' ? ' partners-tab--active' : ''}`} onClick={() => setTab('suppliers')}>
           ספקים
          <span className="partners-tab__count">({suppliers.length})</span>
        </button>
        <button className={`partners-tab${tab === 'customers' ? ' partners-tab--active' : ''}`} onClick={() => setTab('customers')}>
           לקוחות
          <span className="partners-tab__count">({customers.length})</span>
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <div className="form-card__header">
            <h3>{formType === 'supplier' ? (editingId ? 'עריכת ספק' : 'ספק חדש') : (editingId ? 'עריכת לקוח' : 'לקוח חדש')}</h3>
            <button className="icon-btn" onClick={handleClose}><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="manager-form">
            {formError && <div className="alert alert--error"><AlertCircle size={15} />{formError}</div>}

              <div className="form-field">
                <label>שם <span className="required">*</span></label>
                <input name="name" value={form.name} onChange={handleChange}
                  placeholder={formType === 'supplier' ? 'לדוגמה: כפלסטיק בע"מ' : 'לדוגמה: EcoTrade בע"מ'} />
              </div>
              <div className="form-field">
                <label>איש קשר</label>
                <input name="contact_person" value={form.contact_person} onChange={handleChange} placeholder="לדוגמה: אבי כהן" />
              </div>

              <div className="form-field">
                <label>טלפון</label>
                <input name="phone" value={form.phone} onChange={handleChange} placeholder="+972501234567" />
              </div>
              <div className="form-field">
                <label>אימייל</label>
                <input name="email" type="email" value={form.email} onChange={handleChange}
                  placeholder={formType === 'supplier' ? 'supplier@example.com' : 'customer@example.com'} />
              </div>

            {formType === 'supplier' && (
              <>
                <div className="form-field">
                  <label>קוד ERP <span className="form-hint">(אופציונלי)</span></label>
                  <input name="erp_id" value={form.erp_id} onChange={handleChange} placeholder="לדוגמה: SUP-001" style={{ maxWidth: '280px' }} />
                </div>
                <div className="form-field">
                  <label>סוגי חומר מותרים</label>
                  <div className="checkbox-group">
                    {MATERIAL_TYPES.map((t) => (
                      <label key={t} className="checkbox-item">
                        <input type="checkbox" checked={form.allowed_material_types.includes(t)} onChange={() => toggleArray('allowed_material_types', t)} />
                        {MATERIAL_TYPE_HE[t] || t}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-field">
                  <label>מקורות חומר מותרים</label>
                  <div className="checkbox-group">
                    {MATERIAL_SOURCES.map((s) => (
                      <label key={s} className="checkbox-item">
                        <input type="checkbox" checked={form.allowed_material_sources.includes(s)} onChange={() => toggleArray('allowed_material_sources', s)} />
                        {MATERIAL_SOURCE_HE[s] || s}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={handleClose} disabled={saving}>ביטול</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'שומר…' : editingId ? 'שמור שינויים' : formType === 'supplier' ? 'צור ספק' : 'צור לקוח'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="filter-tabs">
        {FILTERS.map((f) => {
          const count = f === 'all' ? currentList.length : f === 'active' ? currentList.filter((x) => x.is_active).length : currentList.filter((x) => !x.is_active).length;
          return (
            <button key={f} className={`filter-tab${filter === f ? ' filter-tab--active' : ''}`} onClick={() => setFilter(f)}>
              {FILTER_LABELS[f]}
              <span style={{ marginRight: '6px', opacity: 0.6, fontSize: '11px' }}>({count})</span>
            </button>
          );
        })}
      </div>

      {loading && <div className="loading-row">טוען…</div>}

      {!loading && visible.length === 0 && (
        <div className="empty-state">
          {tab === 'suppliers' ? <Building2 size={36} /> : <Users size={36} />}
          <p>
            {currentList.length === 0
              ? (tab === 'suppliers' ? 'טרם נוספו ספקים.' : 'טרם נוספו לקוחות.')
              : `אין ${FILTER_LABELS[filter]} ${tab === 'suppliers' ? 'ספקים' : 'לקוחות'}.`}
          </p>
        </div>
      )}

      {!loading && visible.length > 0 && tab === 'suppliers' && (
        <div className="mobile-cards">
          {visibleSuppliers.map((s) => (
            <div key={s.id} className="mobile-card">
              <div className="mobile-card__header">
                <div>
                  <span className="mobile-card__title">{s.name}</span>
                  {s.erp_id && <code className="mobile-card__sku">{s.erp_id}</code>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    className={`status-toggle${s.is_active ? ' status-toggle--on' : ''}`}
                    onClick={() => handleToggleSupplier(s)}
                    title={s.is_active ? 'לחץ להשבתה' : 'לחץ להפעלה'}
                    aria-pressed={s.is_active}
                  >
                    <span className="status-toggle__track"><span className="status-toggle__thumb" /></span>
                    <span className="status-toggle__label">{s.is_active ? 'פעיל' : 'לא פעיל'}</span>
                  </button>
                  <RowActionsMenu items={[
                    { label: 'עריכה', icon: <Pencil size={14} />, onClick: () => openSupplierForm(s) },
                  ]} />
                </div>
              </div>
              {s.contact_person && (
                <div className="mobile-card__row">
                  <span className="mobile-card__label">איש קשר:</span>
                  <span>{s.contact_person}</span>
                </div>
              )}
              {s.phone && (
                <div className="mobile-card__row">
                  <span className="mobile-card__label">טלפון:</span>
                  <span>{s.phone}</span>
                </div>
              )}
              {s.allowed_material_types?.length > 0 && (
                <div className="mobile-card__tags">
                  <span className="mobile-card__label">חומרים:</span>
                  <div className="tag-list">
                    {s.allowed_material_types.map((t) => <span key={t} className="tag">{MATERIAL_TYPE_HE[t] || t}</span>)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && visible.length > 0 && tab === 'customers' && (
        <div className="mobile-cards">
          {visibleCustomers.map((c) => (
            <div key={c.id} className="mobile-card">
              <div className="mobile-card__header">
                <div>
                  <span className="mobile-card__title">{c.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    className={`status-toggle${c.is_active ? ' status-toggle--on' : ''}`}
                    onClick={() => handleToggleCustomer(c)}
                    title={c.is_active ? 'לחץ להשבתה' : 'לחץ להפעלה'}
                    aria-pressed={c.is_active}
                  >
                    <span className="status-toggle__track"><span className="status-toggle__thumb" /></span>
                    <span className="status-toggle__label">{c.is_active ? 'פעיל' : 'לא פעיל'}</span>
                  </button>
                  <RowActionsMenu items={[
                    { label: 'עריכה', icon: <Pencil size={14} />, onClick: () => openCustomerForm(c) },
                  ]} />
                </div>
              </div>
              {c.contact_person && (
                <div className="mobile-card__row">
                  <span className="mobile-card__label">איש קשר:</span>
                  <span>{c.contact_person}</span>
                </div>
              )}
              {c.phone && (
                <div className="mobile-card__row">
                  <span className="mobile-card__label">טלפון:</span>
                  <span>{c.phone}</span>
                </div>
              )}
              {c.email && (
                <div className="mobile-card__row">
                  <span className="mobile-card__label">אימייל:</span>
                  <span>{c.email}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuppliersPage;
