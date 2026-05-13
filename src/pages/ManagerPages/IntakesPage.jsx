import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Package, Plus, X, AlertCircle, RefreshCw, Pencil, Info } from 'lucide-react';
import RowActionsMenu from '../../components/RowActionsMenu';
import Toast from '../../components/Toast';
import useRelativeTime from '../../hooks/useRelativeTime';
import { fetchIntakes, createIntakeThunk, updateIntakeThunk, clearIntakesError } from '../../store/slices/intakesSlice';
import { fetchSuppliers } from '../../store/slices/suppliersSlice';

const MATERIAL_TYPES   = ['plastic', 'paper', 'metal', 'glass', 'textile', 'rubber', 'mixed', 'other'];
const MATERIAL_SOURCES = ['post_consumer', 'post_industrial', 'commercial', 'municipal', 'other'];
const MATERIAL_STATUSES = ['recycled', 'virgin', 'mixed'];
const LOCATION_STATUSES = ['in_factory', 'out_of_factory', 'unknown'];
const DATA_ENTRY_PROFILES = ['manual_capture', 'trusted_capture', 'mixed_capture'];

const STATUS_BADGE = { recycled: 'badge--green', virgin: 'badge--neutral', mixed: 'badge--warn' };

const today = () => new Date().toISOString().split('T')[0];

const EMPTY_FORM = {
  supplier_id: '', intake_date: today(), delivery_note_number: '',
  material_type: '', material_source: '', material_status: '',
  location_status: '', net_weight_kg: '', eligible_input_percent: '100',
  data_entry_profile: 'manual_capture', notes: '',
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtKg   = (n) => n != null ? `${parseFloat(n).toLocaleString()} kg` : '—';

const FILTERS = ['all', 'recycled', 'virgin', 'mixed'];

const IntakesPage = () => {
  const dispatch = useDispatch();
  const { list: intakes, loading, error, lastFetched } = useSelector((s) => s.intakes);
  const { list: suppliers } = useSelector((s) => s.suppliers);
  const refreshedLabel = useRelativeTime(lastFetched);

  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState('');
  const [formError, setFormError]   = useState('');
  const [filter, setFilter]         = useState('all');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    dispatch(fetchIntakes({ force: false }));
    dispatch(fetchSuppliers());
  }, [dispatch]);

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setFormError('');
  };

  const handleEdit = (intake) => {
    setEditingId(intake.id);
    setForm({
      supplier_id:           intake.supplier_id,
      intake_date:           intake.intake_date?.split('T')[0] || today(),
      delivery_note_number:  intake.delivery_note_number,
      material_type:         intake.material_type,
      material_source:       intake.material_source,
      material_status:       intake.material_status,
      location_status:       intake.location_status  || '',
      net_weight_kg:         String(intake.net_weight_kg),
      eligible_input_percent: String(intake.eligible_input_percent ?? 100),
      data_entry_profile:    intake.data_entry_profile || 'manual_capture',
      notes:                 intake.notes || '',
    });
    setShowForm(true);
  };

  const eligiblePreview = () => {
    const w = parseFloat(form.net_weight_kg);
    const p = parseFloat(form.eligible_input_percent);
    if (!isNaN(w) && !isNaN(p) && w > 0) return ((w * p) / 100).toFixed(2);
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.supplier_id)              { setFormError('Supplier is required.'); return; }
    if (!form.material_type)            { setFormError('Material type is required.'); return; }
    if (!form.material_source)          { setFormError('Material source is required.'); return; }
    if (!form.material_status)          { setFormError('Material status is required.'); return; }
    if (!form.net_weight_kg)            { setFormError('Net weight is required.'); return; }
    if (!form.intake_date)              { setFormError('Intake date is required.'); return; }
    if (!form.delivery_note_number.trim()) { setFormError('Delivery note number is required.'); return; }

    const payload = {
      supplier_id:            form.supplier_id,
      intake_date:            form.intake_date,
      delivery_note_number:   form.delivery_note_number.trim(),
      material_type:          form.material_type,
      material_source:        form.material_source,
      material_status:        form.material_status,
      net_weight_kg:          parseFloat(form.net_weight_kg),
      eligible_input_percent: parseFloat(form.eligible_input_percent),
      data_entry_profile:     form.data_entry_profile || undefined,
      location_status:        form.location_status    || undefined,
      notes:                  form.notes              || undefined,
    };

    setSaving(true);
    const result = await dispatch(
      editingId ? updateIntakeThunk({ id: editingId, body: payload }) : createIntakeThunk(payload)
    );
    setSaving(false);

    const succeeded = editingId
      ? updateIntakeThunk.fulfilled.match(result)
      : createIntakeThunk.fulfilled.match(result);

    if (succeeded) {
      setToast(editingId ? 'Intake updated.' : 'Intake recorded successfully.');
      handleClose();
    } else {
      setFormError(result.payload || (editingId ? 'Failed to update.' : 'Failed to record intake.'));
    }
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    dispatch(clearIntakesError());
  };

  const visible = intakes.filter((i) => {
    if (filter !== 'all' && i.material_status !== filter) return false;
    if (typeFilter && i.material_type !== typeFilter) return false;
    return true;
  });

  const activeSuppliers = suppliers.filter((s) => s.is_active);

  return (
    <div className="manager-page">
      <div className="manager-page__header">
        <div>
          <h1>Raw Material Intakes</h1>
          <p className="page-subtitle">Record incoming raw material deliveries</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="refresh-group">
            {refreshedLabel && <span className="last-refreshed">{refreshedLabel}</span>}
            <button className="btn-ghost btn-ghost--icon" onClick={() => dispatch(fetchIntakes({ force: true }))} disabled={loading} title="Refresh">
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>
          </div>
          <button className="btn-primary btn-primary--sm" onClick={() => setShowForm(true)}>
            <Plus size={16} /> New Intake
          </button>
        </div>
      </div>

      <Toast message={toast} onClose={() => setToast('')} />
      {error && <div className="alert alert--error"><AlertCircle size={16} />{error}</div>}

      {showForm && (
        <div className="form-card">
          <div className="form-card__header">
            <h3>{editingId ? 'Edit Intake' : 'Record New Intake'}</h3>
            <button className="icon-btn" onClick={handleClose}><X size={18} /></button>
          </div>

          <form onSubmit={handleSubmit} className="manager-form">
            {formError && <div className="alert alert--error"><AlertCircle size={15} />{formError}</div>}

            {activeSuppliers.length === 0 && (
              <div className="alert alert--warn">
                <Info size={15} />
                No active suppliers found. Please add a supplier before recording an intake.
              </div>
            )}

            <div className="form-row">
              <div className="form-field">
                <label>Supplier <span className="required">*</span></label>
                <select name="supplier_id" value={form.supplier_id} onChange={handleChange}>
                  <option value="">— Select supplier —</option>
                  {activeSuppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Intake date <span className="required">*</span></label>
                <input name="intake_date" type="date" value={form.intake_date} max={today()} onChange={handleChange} />
              </div>
            </div>

            <div className="form-field">
              <label>Delivery note number <span className="required">*</span></label>
              <input
                name="delivery_note_number" value={form.delivery_note_number} onChange={handleChange}
                placeholder="e.g. DN-2024-001"
                style={{ maxWidth: '320px' }}
              />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Material type <span className="required">*</span></label>
                <select name="material_type" value={form.material_type} onChange={handleChange}>
                  <option value="">— Select type —</option>
                  {MATERIAL_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Material source <span className="required">*</span></label>
                <select name="material_source" value={form.material_source} onChange={handleChange}>
                  <option value="">— Select source —</option>
                  {MATERIAL_SOURCES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Material status <span className="required">*</span></label>
                <select name="material_status" value={form.material_status} onChange={handleChange}>
                  <option value="">— Select status —</option>
                  {MATERIAL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Location status</label>
                <select name="location_status" value={form.location_status} onChange={handleChange}>
                  <option value="">— Optional —</option>
                  {LOCATION_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Net weight (kg) <span className="required">*</span></label>
                <input
                  name="net_weight_kg" type="number" step="0.01" min="0.01"
                  value={form.net_weight_kg} onChange={handleChange}
                  placeholder="e.g. 500.00"
                />
              </div>
              <div className="form-field">
                <label>Eligible input % <span className="form-hint">(0–100)</span></label>
                <input
                  name="eligible_input_percent" type="number" step="0.01" min="0" max="100"
                  value={form.eligible_input_percent} onChange={handleChange}
                />
                {eligiblePreview() && (
                  <span className="field-hint">
                    → Eligible weight: <strong>{eligiblePreview()} kg</strong>
                    {parseFloat(form.eligible_input_percent) < 100 && (
                      <span className="field-hint-warn"> · Partial eligibility</span>
                    )}
                  </span>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Data entry profile</label>
                <select name="data_entry_profile" value={form.data_entry_profile} onChange={handleChange}>
                  {DATA_ENTRY_PROFILES.map((p) => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Notes</label>
                <input name="notes" value={form.notes} onChange={handleChange} placeholder="Optional notes…" />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={handleClose} disabled={saving}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving || activeSuppliers.length === 0}>
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Record intake'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="intakes-filters">
        <div className="filter-tabs">
          {FILTERS.map((f) => (
            <button key={f} className={`filter-tab${filter === f ? ' filter-tab--active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              <span style={{ marginLeft: '6px', opacity: 0.6, fontSize: '11px' }}>
                ({f === 'all' ? intakes.length : intakes.filter((i) => i.material_status === f).length})
              </span>
            </button>
          ))}
        </div>
        <select
          className="filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All types</option>
          {MATERIAL_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
        </select>
      </div>

      {loading && <div className="loading-row">Loading intakes…</div>}

      {!loading && visible.length === 0 && (
        <div className="empty-state">
          <Package size={36} />
          <p>{intakes.length === 0 ? 'No intakes recorded yet. Record the first one.' : 'No intakes match the current filter.'}</p>
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Supplier</th>
                <th>Type</th>
                <th>Source</th>
                <th>Net weight</th>
                <th>Eligible weight</th>
                <th>Delivery note</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((i) => (
                <tr key={i.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(i.intake_date)}</td>
                  <td className="td-primary">{i.supplier_name || '—'}</td>
                  <td>
                    <span className="tag">{i.material_type}</span>
                  </td>
                  <td className="td-muted">{i.material_source?.replace(/_/g, ' ') || '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtKg(i.net_weight_kg)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {fmtKg(i.eligible_weight_kg)}
                    {parseFloat(i.eligible_input_percent) < 100 && (
                      <span className="td-muted" style={{ fontSize: '11px', marginLeft: '4px' }}>
                        ({i.eligible_input_percent}%)
                      </span>
                    )}
                  </td>
                  <td><code style={{ fontSize: '12px' }}>{i.delivery_note_number}</code></td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[i.material_status] || 'badge--neutral'}`}>
                      {i.material_status}
                    </span>
                  </td>
                  <td>
                    <RowActionsMenu items={[
                      { label: 'Edit', icon: <Pencil size={14} />, onClick: () => handleEdit(i) },
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

export default IntakesPage;
