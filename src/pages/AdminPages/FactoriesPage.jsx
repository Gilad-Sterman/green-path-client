import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Plus, X, CheckCircle, AlertCircle, MapPin, Users, Eye, RefreshCw } from 'lucide-react';
import RowActionsMenu from '../../components/RowActionsMenu';
import { fetchFactories, createFactoryThunk, clearFactoriesError } from '../../store/slices/factoriesSlice';
import useRelativeTime from '../../hooks/useRelativeTime';

const STATUS_BADGE = {
  active:    'badge--green',
  suspended: 'badge--warn',
  inactive:  'badge--neutral',
};

const COUNTRY_CODES = [
  { code: '+972', label: '🇮🇱 +972', minLen: 9 },
  { code: '+1',   label: '🇺🇸 +1',   minLen: 10 },
  { code: '+44',  label: '🇬🇧 +44',  minLen: 10 },
  { code: '+49',  label: '🇩🇪 +49',  minLen: 10 },
];

const EMPTY_FORM = {
  name: '', company_id_number: '', address: '',
  geofence_lat: '', geofence_lng: '', geofence_radius_meters: '',
  manager_name: '', manager_country: '+972', manager_local: '',
};

const FactoriesPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { list: factories, loading, error, lastFetched } = useSelector((state) => state.factories);
  const refreshedLabel = useRelativeTime(lastFetched);

  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [successMsg, setSuccess]  = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    dispatch(fetchFactories());
  }, [dispatch]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.name.trim() || !form.company_id_number.trim() || !form.address.trim()) {
      setFormError('Factory name, company ID, and address are required.');
      return;
    }
    if (!form.manager_name.trim() || !form.manager_local.trim()) {
      setFormError('Manager name and phone number are required.');
      return;
    }

    const stripped = form.manager_local.replace(/^0/, '');
    const country   = COUNTRY_CODES.find((c) => c.code === form.manager_country);
    if (stripped.length < (country?.minLen ?? 7)) {
      setFormError(`Manager phone must be at least ${country?.minLen ?? 7} digits for ${form.manager_country}.`);
      return;
    }

    const payload = {
      name:               form.name.trim(),
      company_id_number:  form.company_id_number.trim(),
      address:            form.address.trim(),
      admin_user: {
        full_name:    form.manager_name.trim(),
        phone_number: `${form.manager_country}${stripped}`,
      },
    };

    const lat = parseFloat(form.geofence_lat);
    const lng = parseFloat(form.geofence_lng);
    if (form.geofence_lat && form.geofence_lng && !isNaN(lat) && !isNaN(lng)) {
      payload.geofence_center = { lat, lng };
    }
    if (form.geofence_radius_meters) {
      payload.geofence_radius_meters = parseFloat(form.geofence_radius_meters);
    }

    setSaving(true);
    const result = await dispatch(createFactoryThunk(payload));
    setSaving(false);

    if (createFactoryThunk.fulfilled.match(result)) {
      setSuccess(`Factory "${form.name}" created successfully.`);
      setForm(EMPTY_FORM);
      setShowForm(false);
      setTimeout(() => setSuccess(''), 4000);
    } else {
      setFormError(result.payload || 'Failed to create factory.');
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setForm(EMPTY_FORM);
    setFormError('');
    dispatch(clearFactoriesError());
  };

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div>
          <h1>Factories</h1>
          <p className="page-subtitle">Manage recycling facilities registered on the platform</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="refresh-group">
            {refreshedLabel && <span className="last-refreshed">{refreshedLabel}</span>}
            <button
              className="btn-ghost btn-ghost--icon"
              onClick={() => dispatch(fetchFactories({ force: true }))}
              title="Refresh"
              disabled={loading}
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>
          </div>
          <button className="btn-primary btn-primary--sm" onClick={() => setShowForm(true)}>
            <Plus size={16} />
            New Factory
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="alert alert--success">
          <CheckCircle size={16} />
          {successMsg}
        </div>
      )}

      {error && (
        <div className="alert alert--error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {showForm && (
        <div className="form-card">
          <div className="form-card__header">
            <h3>Create New Factory</h3>
            <button className="icon-btn" onClick={handleCloseForm} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="factory-form">
            {formError && (
              <div className="alert alert--error">
                <AlertCircle size={15} />
                {formError}
              </div>
            )}

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="name">Factory name <span className="required">*</span></label>
                <input
                  id="name" name="name" type="text"
                  placeholder="e.g. Green Recycling Ltd."
                  value={form.name} onChange={handleChange} required
                />
              </div>
              <div className="form-field">
                <label htmlFor="company_id_number">Company ID number <span className="required">*</span></label>
                <input
                  id="company_id_number" name="company_id_number" type="text"
                  placeholder="e.g. 515234567"
                  value={form.company_id_number} onChange={handleChange} required
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="address">Address <span className="required">*</span></label>
              <input
                id="address" name="address" type="text"
                placeholder="e.g. 12 Industrial Zone, Tel Aviv"
                value={form.address} onChange={handleChange} required
              />
            </div>

            <div className="form-section-label">
              <Users size={14} />
              Factory Manager
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="manager_name">Manager full name <span className="required">*</span></label>
                <input
                  id="manager_name" name="manager_name" type="text"
                  placeholder="e.g. David Cohen"
                  value={form.manager_name} onChange={handleChange} required
                />
              </div>
              <div className="form-field">
                <label htmlFor="manager_local">Manager phone <span className="required">*</span></label>
                <div className="phone-input-wrap">
                  <select
                    className="country-select"
                    value={form.manager_country}
                    onChange={(e) => setForm((p) => ({ ...p, manager_country: e.target.value }))}
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                  <span className="phone-divider" />
                  <input
                    id="manager_local" name="manager_local" type="tel"
                    placeholder="501234567"
                    value={form.manager_local}
                    onChange={(e) => setForm((p) => ({ ...p, manager_local: e.target.value.replace(/[^0-9]/g, '') }))}
                  />
                </div>
              </div>
            </div>

            <div className="form-section-label">
              <MapPin size={14} />
              Geofence (optional)
            </div>

            <div className="form-row form-row--three">
              <div className="form-field">
                <label htmlFor="geofence_lat">Latitude</label>
                <input
                  id="geofence_lat" name="geofence_lat" type="number" step="any"
                  placeholder="32.0853"
                  value={form.geofence_lat} onChange={handleChange}
                />
              </div>
              <div className="form-field">
                <label htmlFor="geofence_lng">Longitude</label>
                <input
                  id="geofence_lng" name="geofence_lng" type="number" step="any"
                  placeholder="34.7818"
                  value={form.geofence_lng} onChange={handleChange}
                />
              </div>
              <div className="form-field">
                <label htmlFor="geofence_radius_meters">Radius (meters)</label>
                <input
                  id="geofence_radius_meters" name="geofence_radius_meters" type="number"
                  placeholder="500"
                  value={form.geofence_radius_meters} onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={handleCloseForm} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Creating…' : 'Create factory'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && <div className="loading-row">Loading factories…</div>}

      {!loading && factories.length === 0 && !showForm && (
        <div className="empty-state">
          <Building2 size={40} />
          <p>No factories yet. Create the first one.</p>
        </div>
      )}

      {!loading && factories.length > 0 && (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Company ID</th>
                <th>Address</th>
                <th>Users</th>
                <th>Geofence</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {factories.map((f) => (
                <tr key={f.id}>
                  <td className="td-primary">
                    <Link to={`/admin/factories/${f.id}`} className="table-link">{f.name}</Link>
                  </td>
                  <td>{f.company_id_number}</td>
                  <td className="td-muted">{f.address}</td>
                  <td>{f.active_user_count ?? 0}</td>
                  <td>
                    {f.geofence_center
                      ? `${f.geofence_center.lat}, ${f.geofence_center.lng}`
                      : <span className="td-muted">—</span>}
                  </td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[f.status] || 'badge--neutral'}`}>
                      {f.status}
                    </span>
                  </td>
                  <td>
                    <RowActionsMenu items={[
                      { label: 'View details', icon: <Eye size={14} />, onClick: () => navigate(`/admin/factories/${f.id}`) },
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

export default FactoriesPage;
