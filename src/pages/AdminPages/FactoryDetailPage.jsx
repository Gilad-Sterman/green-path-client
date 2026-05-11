import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft, Building2, MapPin, Users, Plus, X,
  CheckCircle, AlertCircle, UserCheck, UserX, RefreshCw,
} from 'lucide-react';
import RowActionsMenu from '../../components/RowActionsMenu';
import { fetchFactory } from '../../store/slices/factoriesSlice';
import { fetchUsers, createUserThunk, deactivateUserThunk, reactivateUserThunk } from '../../store/slices/usersSlice';
import useRelativeTime from '../../hooks/useRelativeTime';

const ROLE_BADGE = {
  manager:        'badge--admin',
  employee:       'badge--green',
  internal_admin: 'badge--admin',
};

const COUNTRY_CODES = [
  { code: '+972', label: '🇮🇱 +972', minLen: 9 },
  { code: '+1',   label: '🇺🇸 +1',   minLen: 10 },
  { code: '+44',  label: '🇬🇧 +44',  minLen: 10 },
];

const EMPTY_USER = { full_name: '', country: '+972', local: '', role: 'employee' };

const FactoryDetailPage = () => {
  const { id }     = useParams();
  const dispatch   = useDispatch();
  const { current: factory, loading: factoryLoading }        = useSelector((s) => s.factories);
  const { list: users, loading: usersLoading, lastFetched }   = useSelector((s) => s.users);
  const refreshedLabel = useRelativeTime(lastFetched);

  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY_USER);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccess]  = useState('');

  useEffect(() => {
    dispatch(fetchFactory(id));
    dispatch(fetchUsers({ factory_id: id }));
  }, [dispatch, id]);

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setFormError('');
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.full_name.trim() || !form.local.trim()) {
      setFormError('Name and phone number are required.');
      return;
    }
    const cc      = COUNTRY_CODES.find((c) => c.code === form.country);
    const stripped = form.local.replace(/^0/, '');
    if (stripped.length < (cc?.minLen ?? 7)) {
      setFormError(`Phone must be at least ${cc?.minLen ?? 7} digits for ${form.country}.`);
      return;
    }
    setSaving(true);
    const result = await dispatch(createUserThunk({
      full_name:    form.full_name.trim(),
      phone_number: `${form.country}${stripped}`,
      role:         form.role,
      factory_id:   id,
    }));
    setSaving(false);
    if (createUserThunk.fulfilled.match(result)) {
      setSuccess(`${form.role === 'manager' ? 'Manager' : 'Employee'} "${form.full_name}" added.`);
      setForm(EMPTY_USER);
      setShowForm(false);
      setTimeout(() => setSuccess(''), 4000);
    } else {
      setFormError(result.payload || 'Failed to add user.');
    }
  };

  const toggleActive = async (user) => {
    if (user.is_active) {
      await dispatch(deactivateUserThunk(user.id));
    } else {
      await dispatch(reactivateUserThunk(user.id));
    }
  };

  if (factoryLoading) return <div className="loading-row">Loading factory…</div>;
  if (!factory) return <div className="loading-row">Factory not found.</div>;

  const managers   = users.filter((u) => u.role === 'manager');
  const employees  = users.filter((u) => u.role === 'employee');

  return (
    <div className="admin-page">
      <Link to="/admin/factories" className="back-link">
        <ArrowLeft size={16} />
        Back to Factories
      </Link>

      <div className="admin-page__header" style={{ marginTop: '16px' }}>
        <div>
          <h1>{factory.name}</h1>
          <p className="page-subtitle">Company ID: {factory.company_id_number}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="refresh-group">
            {refreshedLabel && <span className="last-refreshed">{refreshedLabel}</span>}
            <button
              className="btn-ghost btn-ghost--icon"
              title="Refresh"
              disabled={factoryLoading || usersLoading}
              onClick={() => {
                dispatch(fetchFactory({ id, force: true }));
                dispatch(fetchUsers({ factory_id: id, force: true }));
              }}
            >
              <RefreshCw size={15} className={(factoryLoading || usersLoading) ? 'spin' : ''} />
            </button>
          </div>
          <span className={`badge ${factory.status === 'active' ? 'badge--green' : 'badge--warn'}`}>
            {factory.status}
          </span>
        </div>
      </div>

      {successMsg && (
        <div className="alert alert--success">
          <CheckCircle size={15} /> {successMsg}
        </div>
      )}

      <div className="detail-cards">
        <div className="detail-card">
          <div className="detail-card__icon"><Building2 size={18} /></div>
          <div>
            <p className="detail-card__label">Address</p>
            <p className="detail-card__value">{factory.address}</p>
          </div>
        </div>

        <div className="detail-card">
          <div className="detail-card__icon"><Users size={18} /></div>
          <div>
            <p className="detail-card__label">Active Users</p>
            <p className="detail-card__value">{factory.active_user_count ?? 0}</p>
          </div>
        </div>

        {factory.geofence_center && (
          <div className="detail-card">
            <div className="detail-card__icon"><MapPin size={18} /></div>
            <div>
              <p className="detail-card__label">Geofence</p>
              <p className="detail-card__value">
                {factory.geofence_center.lat}, {factory.geofence_center.lng}
                {factory.geofence_radius_meters && ` · ${factory.geofence_radius_meters}m`}
              </p>
            </div>
          </div>
        )}

        <div className="detail-card">
          <div className="detail-card__icon"><CheckCircle size={18} /></div>
          <div>
            <p className="detail-card__label">Created</p>
            <p className="detail-card__value">
              {new Date(factory.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      <div className="section-header">
        <h2>Team</h2>
        <button className="btn-primary btn-primary--sm" onClick={() => setShowForm(true)}>
          <Plus size={15} /> Add User
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <div className="form-card__header">
            <h3>Add Team Member</h3>
            <button className="icon-btn" onClick={() => { setShowForm(false); setForm(EMPTY_USER); setFormError(''); }}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleAddUser} className="factory-form">
            {formError && <div className="alert alert--error"><AlertCircle size={15} /> {formError}</div>}
            <div className="form-row">
              <div className="form-field">
                <label>Full name <span className="required">*</span></label>
                <input name="full_name" type="text" placeholder="e.g. Sarah Levi"
                  value={form.full_name} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Role <span className="required">*</span></label>
                <select name="role" value={form.role} onChange={handleChange}>
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
            </div>
            <div className="form-field">
              <label>Phone number <span className="required">*</span></label>
              <div className="phone-input-wrap">
                <select className="country-select" value={form.country}
                  onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}>
                  {COUNTRY_CODES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
                <span className="phone-divider" />
                <input type="tel" placeholder="501234567" value={form.local}
                  onChange={(e) => setForm((p) => ({ ...p, local: e.target.value.replace(/[^0-9]/g, '') }))} />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Adding…' : 'Add user'}</button>
            </div>
          </form>
        </div>
      )}

      {usersLoading && <div className="loading-row">Loading users…</div>}

      {!usersLoading && (
        <>
          {managers.length > 0 && (
            <div className="users-section">
              <h3 className="users-section__title">Managers</h3>
              <UserTable users={managers} onToggle={toggleActive} />
            </div>
          )}
          {employees.length > 0 && (
            <div className="users-section">
              <h3 className="users-section__title">Employees</h3>
              <UserTable users={employees} onToggle={toggleActive} />
            </div>
          )}
          {users.length === 0 && !showForm && (
            <div className="empty-state">
              <Users size={36} />
              <p>No team members yet. Add the first one.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const UserTable = ({ users, onToggle }) => (
  <div className="data-table-wrap">
    <table className="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Phone</th>
          <th>Role</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.id}>
            <td className="td-primary">{u.full_name}</td>
            <td className="td-muted">{u.phone_number}</td>
            <td><span className={`badge ${ROLE_BADGE[u.role] || 'badge--neutral'}`}>{u.role}</span></td>
            <td>
              <span className={`badge ${u.is_active ? 'badge--green' : 'badge--neutral'}`}>
                {u.is_active ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td>
              <RowActionsMenu items={[
                u.is_active
                  ? { label: 'Deactivate', icon: <UserX size={14} />, variant: 'danger',  onClick: () => onToggle(u) }
                  : { label: 'Reactivate', icon: <UserCheck size={14} />, variant: 'success', onClick: () => onToggle(u) },
              ]} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default FactoryDetailPage;
