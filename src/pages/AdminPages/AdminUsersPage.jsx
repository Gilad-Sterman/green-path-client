import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Users, UserCheck, UserX, Search, Building2, RefreshCw } from 'lucide-react';
import RowActionsMenu from '../../components/RowActionsMenu';
import { fetchUsers, deactivateUserThunk, reactivateUserThunk } from '../../store/slices/usersSlice';
import useRelativeTime from '../../hooks/useRelativeTime';
import { fetchFactories } from '../../store/slices/factoriesSlice';

const ROLE_BADGE = {
  manager:        'badge--admin',
  employee:       'badge--green',
  internal_admin: 'badge--admin',
};

const ROLE_LABEL = {
  manager:        'מנהל/ת',
  employee:       'עובד/ת',
  internal_admin: 'מנהל מערכת',
};

const AdminUsersPage = () => {
  const dispatch = useDispatch();
  const { list: users, loading: usersLoading, lastFetched } = useSelector((s) => s.users);
  const refreshedLabel = useRelativeTime(lastFetched);
  const { list: factories, loading: factoriesLoading } = useSelector((s) => s.factories);

  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [factFilter, setFactFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  useEffect(() => {
    dispatch(fetchUsers());
    if (!factories.length) dispatch(fetchFactories());
  }, [dispatch]);

  const toggleActive = async (user) => {
    if (user.is_active) {
      await dispatch(deactivateUserThunk(user.id));
    } else {
      await dispatch(reactivateUserThunk(user.id));
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      if (q && !u.full_name.toLowerCase().includes(q) && !u.phone_number.includes(q)) return false;
      if (roleFilter && u.role !== roleFilter) return false;
      if (factFilter && u.factory_id !== factFilter) return false;
      if (activeFilter === 'active'   && !u.is_active) return false;
      if (activeFilter === 'inactive' &&  u.is_active) return false;
      return true;
    });
  }, [users, search, roleFilter, factFilter, activeFilter]);

  const loading = usersLoading || factoriesLoading;

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div>
          <h1>משתמשים</h1>
          <p className="page-subtitle">כל המנהלים והעובדים במערכת</p>
        </div>
        <div className="refresh-group">
          {refreshedLabel && <span className="last-refreshed">{refreshedLabel}</span>}
          <button
            className="btn-ghost btn-ghost--icon"
            onClick={() => dispatch(fetchUsers({ force: true }))}
            title="רענון"
            disabled={usersLoading}
          >
            <RefreshCw size={15} className={usersLoading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-bar__search">
          <Search size={15} className="filter-bar__icon" />
          <input
            type="text"
            placeholder="חיפוש לפי שם או טלפון..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">כל התפקידים</option>
          <option value="manager">מנהל/ת</option>
          <option value="employee">עובד/ת</option>
        </select>

        <select value={factFilter} onChange={(e) => setFactFilter(e.target.value)}>
          <option value="">כל המפעלים</option>
          {factories.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>

        <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
          <option value="">כל הסטטוסים</option>
          <option value="active">פעיל</option>
          <option value="inactive">לא פעיל</option>
        </select>

        <span className="filter-bar__count">{filtered.length} משתמשים</span>
      </div>

      {loading && <div className="loading-row">...טוען משתמשים</div>}

      {!loading && filtered.length === 0 && (
        <div className="empty-state">
          <Users size={38} />
          <p>לא נמצאו משתמשים התואמים את הסינון.</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>שם</th>
                <th>טלפון</th>
                <th>תפקיד</th>
                <th>מפעל</th>
                <th>סטטוס</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td className="td-primary">{u.full_name}</td>
                  <td className="td-muted">{u.phone_number}</td>
                  <td>
                    <span className={`badge ${ROLE_BADGE[u.role] || 'badge--neutral'}`}>
                      {ROLE_LABEL[u.role] || u.role}
                    </span>
                  </td>
                  <td>
                    {u.factory_id ? (
                      <Link to={`/admin/factories/${u.factory_id}`} className="table-link">
                        <Building2 size={13} />
                        {u.factory_name || u.factory_id.slice(0, 8)}
                      </Link>
                    ) : (
                      <span className="td-muted">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge--green' : 'badge--neutral'}`}>
                      {u.is_active ? 'פעיל' : 'לא פעיל'}
                    </span>
                  </td>
                  <td>
                    <RowActionsMenu items={[
                      u.is_active
                        ? { label: 'השהייה', icon: <UserX size={14} />, variant: 'danger',  onClick: () => toggleActive(u) }
                        : { label: 'הפעלה מחדש', icon: <UserCheck size={14} />, variant: 'success', onClick: () => toggleActive(u) },
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

export default AdminUsersPage;
