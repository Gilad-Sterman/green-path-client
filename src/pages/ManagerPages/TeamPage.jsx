import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Users, Plus, X, AlertCircle, RefreshCw, UserCheck, UserX } from 'lucide-react';
import RowActionsMenu from '../../components/RowActionsMenu';
import Toast from '../../components/Toast';
import useRelativeTime from '../../hooks/useRelativeTime';
import {
  fetchUsers, createUserThunk, deactivateUserThunk, reactivateUserThunk, clearUsersError,
} from '../../store/slices/usersSlice';

const EMPTY_FORM = { full_name: '', phone_number: '' };

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const TeamPage = () => {
  const dispatch = useDispatch();
  const { list: users, loading, error, lastFetched } = useSelector((s) => s.users);
  const refreshedLabel = useRelativeTime(lastFetched);

  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState('');
  const [toast,      setToast]      = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [roleFilter,   setRoleFilter]   = useState('');

  useEffect(() => {
    dispatch(fetchUsers({ force: false }));
  }, [dispatch]);

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setFormError('');
  };

  const handleClose = () => {
    setShowForm(false);
    setForm(EMPTY_FORM);
    setFormError('');
    dispatch(clearUsersError());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim())    { setFormError('Full name is required.'); return; }
    if (!form.phone_number.trim()) { setFormError('Phone number is required.'); return; }
    if (!/^\+[1-9]\d{6,14}$/.test(form.phone_number.trim())) {
      setFormError('Phone must be in E.164 format, e.g. +972501234567');
      return;
    }

    setSaving(true);
    const result = await dispatch(createUserThunk({
      full_name:    form.full_name.trim(),
      phone_number: form.phone_number.trim(),
      role:         'employee',
    }));
    setSaving(false);

    if (createUserThunk.fulfilled.match(result)) {
      setToast(`${form.full_name.trim()} added to your team.`);
      handleClose();
    } else {
      setFormError(result.payload || 'Failed to add employee.');
    }
  };

  const handleDeactivate = async (user) => {
    const result = await dispatch(deactivateUserThunk(user.id));
    if (deactivateUserThunk.fulfilled.match(result)) {
      setToast(`${user.full_name} deactivated.`);
    } else {
      setToast(result.payload || 'Failed to deactivate user.');
    }
  };

  const handleReactivate = async (user) => {
    const result = await dispatch(reactivateUserThunk(user.id));
    if (reactivateUserThunk.fulfilled.match(result)) {
      setToast(`${user.full_name} reactivated.`);
    } else {
      setToast(result.payload || 'Failed to reactivate user.');
    }
  };

  const visible = users.filter((u) => {
    if (statusFilter === 'active'   && !u.is_active)  return false;
    if (statusFilter === 'inactive' && u.is_active)   return false;
    if (roleFilter && u.role !== roleFilter)           return false;
    return true;
  });

  const activeCount   = users.filter((u) => u.is_active).length;
  const inactiveCount = users.filter((u) => !u.is_active).length;

  return (
    <div className="manager-page">
      <div className="manager-page__header">
        <div>
          <h1>Team</h1>
          <p className="page-subtitle">Manage employees at your factory</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="refresh-group">
            {refreshedLabel && <span className="last-refreshed">{refreshedLabel}</span>}
            <button
              className="btn-ghost btn-ghost--icon"
              onClick={() => dispatch(fetchUsers({ force: true }))}
              disabled={loading}
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>
          </div>
          <button className="btn-primary btn-primary--sm" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Add Employee
          </button>
        </div>
      </div>

      <Toast message={toast} onClose={() => setToast('')} />
      {error && <div className="alert alert--error"><AlertCircle size={16} />{error}</div>}

      {showForm && (
        <div className="form-card">
          <div className="form-card__header">
            <h3>Add New Employee</h3>
            <button className="icon-btn" onClick={handleClose}><X size={18} /></button>
          </div>

          <form onSubmit={handleSubmit} className="manager-form">
            {formError && (
              <div className="alert alert--error"><AlertCircle size={15} />{formError}</div>
            )}

            <div className="form-row">
              <div className="form-field">
                <label>Full name <span className="required">*</span></label>
                <input
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  placeholder="e.g. David Cohen"
                  autoComplete="off"
                />
              </div>
              <div className="form-field">
                <label>Phone number <span className="required">*</span></label>
                <input
                  name="phone_number"
                  value={form.phone_number}
                  onChange={handleChange}
                  placeholder="+972501234567"
                  autoComplete="off"
                  inputMode="tel"
                />
                <span className="field-hint">E.164 format — include country code</span>
              </div>
            </div>

            <div className="form-field" style={{ maxWidth: '200px' }}>
              <label>Role</label>
              <input value="Employee" disabled style={{ background: '#f5f5f5', color: '#888' }} />
              <span className="field-hint">Managers can only add employees</span>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={handleClose} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Adding…' : 'Add Employee'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="team-filters">
        <div className="filter-tabs">
          {[
            { key: 'all',      label: 'All',      count: users.length },
            { key: 'active',   label: 'Active',   count: activeCount },
            { key: 'inactive', label: 'Inactive', count: inactiveCount },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              className={`filter-tab${statusFilter === key ? ' filter-tab--active' : ''}`}
              onClick={() => setStatusFilter(key)}
            >
              {label}
              <span style={{ marginRight: '6px', opacity: 0.6, fontSize: '11px' }}>({count})</span>
            </button>
          ))}
        </div>
        <select
          className="filter-select"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All roles</option>
          <option value="employee">Employee</option>
          <option value="manager">Manager</option>
        </select>
      </div>

      {loading && <div className="loading-row">Loading team…</div>}

      {!loading && visible.length === 0 && (
        <div className="empty-state">
          <Users size={36} />
          <p>
            {users.length === 0
              ? 'No team members yet. Add your first employee.'
              : 'No users match the current filter.'}
          </p>
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Added</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((u) => (
                <tr key={u.id}>
                  <td className="td-primary">{u.full_name}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>{u.phone_number}</td>
                  <td>
                    <span className={`badge ${u.role === 'manager' ? 'badge--blue' : 'badge--neutral'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge--green' : 'badge--neutral'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(u.created_at)}</td>
                  <td>
                    <RowActionsMenu items={[
                      u.is_active
                        ? {
                            label:   'Deactivate',
                            icon:    <UserX size={14} />,
                            variant: 'danger',
                            onClick: () => handleDeactivate(u),
                          }
                        : {
                            label:   'Reactivate',
                            icon:    <UserCheck size={14} />,
                            onClick: () => handleReactivate(u),
                          },
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

export default TeamPage;
