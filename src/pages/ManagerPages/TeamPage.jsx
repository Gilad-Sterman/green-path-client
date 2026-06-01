import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Users, Plus, X, AlertCircle, RefreshCw } from 'lucide-react';
import Toast from '../../components/Toast';
import useRelativeTime from '../../hooks/useRelativeTime';
import {
  fetchUsers, createUserThunk, deactivateUserThunk, reactivateUserThunk,
  clearUsersError,
} from '../../store/slices/usersSlice';

const EMPTY_FORM = { full_name: '', phone_number: '' };

const ROLE_HE    = { employee: 'עובד', manager: 'מנהל', internal_admin: 'אדמין' };
const ROLE_BADGE = { employee: 'badge--neutral', manager: 'badge--blue', internal_admin: 'badge--warn' };

const STATUS_FILTERS = ['all', 'active', 'inactive'];
const STATUS_LABELS  = { all: 'הכל', active: 'פעיל', inactive: 'לא פעיל' };

const normalizePhone = (raw) => {
  const s = raw.replace(/[\s\-().]/g, '');
  if (/^\+972\d{9}$/.test(s))  return s;            // +972XXXXXXXXX
  if (/^972\d{9}$/.test(s))    return '+' + s;       // 972XXXXXXXXX
  if (/^0\d{9}$/.test(s))      return '+972' + s.slice(1); // 05XXXXXXXX
  if (/^\d{9}$/.test(s))       return '+972' + s;    // 5XXXXXXXX
  return null;
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const TeamPage = () => {
  const dispatch = useDispatch();
  const { list: users, loading, error, lastFetched } = useSelector((s) => s.users);
  const { user: currentUser } = useSelector((s) => s.auth);
  const refreshedLabel = useRelativeTime(lastFetched);

  const [searchParams] = useSearchParams();

  const [showForm,     setShowForm]     = useState(false);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [formError,    setFormError]    = useState('');
  const [toast,        setToast]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState('all');
  const [roleFilter,    setRoleFilter]    = useState('');

  useEffect(() => {
    dispatch(fetchUsers({ force: false }));
  }, [dispatch]);

  useEffect(() => {
    if (searchParams.get('invite') === '1') setShowForm(true);
  }, [searchParams]);

  const handleChange = (e) => { setForm((p) => ({ ...p, [e.target.name]: e.target.value })); setFormError(''); };

  const handleClose = () => {
    setShowForm(false); setForm(EMPTY_FORM); setFormError('');
    dispatch(clearUsersError());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim())    { setFormError('יש להזין שם מלא.'); return; }
    if (!form.phone_number.trim()) { setFormError('יש להזין מספר טלפון.'); return; }
    const normalized = normalizePhone(form.phone_number.trim());
    if (!normalized) {
      setFormError('מספר הטלפון אינו תקין. לדוגמה: 0501234567 או 501234567 או +972501234567');
      return;
    }
    setSaving(true);
    const result = await dispatch(createUserThunk({
      full_name: form.full_name.trim(), phone_number: normalized, role: 'employee',
    }));
    setSaving(false);
    if (createUserThunk.fulfilled.match(result)) {
      setToast(`${form.full_name.trim()} נוסף/ה לצוות.`);
      handleClose();
    } else {
      setFormError(result.payload || 'שגיאה בהוספת עובד.');
    }
  };

  const handleToggleActive = async (user) => {
    const thunk = user.is_active ? deactivateUserThunk : reactivateUserThunk;
    const result = await dispatch(thunk(user.id));
    if (thunk.fulfilled.match(result)) {
      setToast(user.is_active ? `${user.full_name} הושבת/ה.` : `${user.full_name} הופעל/ה.`);
    }
  };

  const visible = users.filter((u) => {
    if (u.id === currentUser?.id)                    return false;
    if (statusFilter === 'active'   && !u.is_active) return false;
    if (statusFilter === 'inactive' && u.is_active)  return false;
    if (roleFilter && u.role !== roleFilter)          return false;
    return true;
  });

  return (
    <div className="manager-page">
      <div className="manager-page__header">
        <div>
          <h1>ניהול צוות</h1>
        </div>
        <div className="refresh-group">
          {refreshedLabel && <span className="last-refreshed">{refreshedLabel}</span>}
          <button
            className="btn-ghost btn-ghost--icon"
            onClick={() => dispatch(fetchUsers({ force: true }))}
            disabled={loading}
            title="רענן"
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      <button className="btn-primary new-team-btn" onClick={() => setShowForm(true)}>
        <Plus size={16} /> הוספת עובד
      </button>

      <Toast message={toast} onClose={() => setToast('')} />
      {error && <div className="alert alert--error"><AlertCircle size={16} />{error}</div>}

      {showForm && (
        <div className="form-card">
          <div className="form-card__header">
            <h3>הוספת עובד חדש</h3>
            <button className="icon-btn" onClick={handleClose}><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="manager-form">
            {formError && <div className="alert alert--error"><AlertCircle size={15} />{formError}</div>}

            <div className="form-field">
              <label>שם מלא <span className="required">*</span></label>
              <input name="full_name" value={form.full_name} onChange={handleChange} placeholder="לדוגמה: דוד כהן" autoComplete="off" />
            </div>
            <div className="form-field">
              <label>מספר טלפון <span className="required">*</span></label>
              <input name="phone_number" value={form.phone_number} onChange={handleChange} placeholder="0501234567" autoComplete="off" inputMode="tel" />
              <span className="field-hint">ניתן להזין: 05… / 5… / 972… / +972…</span>
            </div>
            <div className="form-field" style={{ maxWidth: '200px' }}>
              <label>תפקיד</label>
              <input value="עובד" disabled style={{ background: '#f5f5f5', color: '#888' }} />
              <span className="field-hint">מנהלים יכולים להוסיף עובדים בלבד</span>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={handleClose} disabled={saving}>ביטול</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'מוסיף…' : 'הוסף עובד'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="team-filters">
        <div className="filter-tabs">
          {STATUS_FILTERS.map((f) => {
            const others = users.filter((u) => u.id !== currentUser?.id);
            const count = f === 'all' ? others.length : f === 'active' ? others.filter((u) => u.is_active).length : others.filter((u) => !u.is_active).length;
            return (
              <button key={f} className={`filter-tab${statusFilter === f ? ' filter-tab--active' : ''}`} onClick={() => setStatusFilter(f)}>
                {STATUS_LABELS[f]}
                <span style={{ marginRight: '6px', opacity: 0.6, fontSize: '11px' }}>({count})</span>
              </button>
            );
          })}
        </div>
        <select className="filter-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">כל התפקידים</option>
          <option value="employee">עובד</option>
          <option value="manager">מנהל</option>
        </select>
      </div>

      {loading && <div className="loading-row">טוען צוות…</div>}

      {!loading && visible.length === 0 && (
        <div className="empty-state">
          <Users size={36} />
          <p>{users.length === 0 ? 'טרם נוספו חברי צוות. הוסף את הראשון.' : 'אין משתמשים התואמים לסינון.'}</p>
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div className="mobile-cards">
          {visible.map((u) => (
            <div key={u.id} className="mobile-card">
              <div className="mobile-card__header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="mobile-card__title">{u.full_name}</span>
                  <span className={`badge ${ROLE_BADGE[u.role] || 'badge--neutral'}`}>
                    {ROLE_HE[u.role] || u.role}
                  </span>
                </div>
                <button
                  className={`status-toggle${u.is_active ? ' status-toggle--on' : ''}`}
                  onClick={() => handleToggleActive(u)}
                  title={u.is_active ? 'לחץ להשבתה' : 'לחץ להפעלה'}
                  aria-pressed={u.is_active}
                >
                  <span className="status-toggle__track"><span className="status-toggle__thumb" /></span>
                  <span className="status-toggle__label">{u.is_active ? 'פעיל' : 'לא פעיל'}</span>
                </button>
              </div>
              <div className="mobile-card__row">
                <span className="mobile-card__label">טלפון:</span>
                <code style={{ fontSize: '13px' }}>{u.phone_number}</code>
              </div>
              <div className="mobile-card__row">
                <span className="mobile-card__label">הצטרף/ה:</span>
                <span>{fmtDate(u.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamPage;
