import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft, Building2, MapPin, Users, Plus, X,
  CheckCircle, AlertCircle, UserCheck, UserX, RefreshCw, Pencil, Flag, Download, Scale,
} from 'lucide-react';
import RowActionsMenu from '../../components/RowActionsMenu';
import { fetchFactory, updateFactoryThunk } from '../../store/slices/factoriesSlice';
import { fetchUsers, createUserThunk, deactivateUserThunk, reactivateUserThunk } from '../../store/slices/usersSlice';
import { getLedgerBalance } from '../../api/ledger';
import useRelativeTime from '../../hooks/useRelativeTime';

const ROLE_BADGE = {
  manager:        'badge--admin',
  employee:       'badge--green',
  internal_admin: 'badge--admin',
};

const ROLE_HE = { manager: 'מנהל', employee: 'עובד', internal_admin: 'אדמין' };
const STATUS_HE = { active: 'פעיל', suspended: 'חסום', inactive: 'לא פעיל' };

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

  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState(EMPTY_USER);
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState('');
  const [successMsg, setSuccess]      = useState('');
  const [showEditForm, setShowEditForm] = useState(false);
  const [editForm, setEditForm]       = useState({ name: '', company_id_number: '', address: '', geofence_radius_meters: '' });
  const [editSaving, setEditSaving]   = useState(false);
  const [editError, setEditError]     = useState('');
  const [balance, setBalance]         = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchFactory(id));
    dispatch(fetchUsers({ factory_id: id }));
    setBalanceLoading(true);
    getLedgerBalance({ factory_id: id })
      .then(({ data }) => setBalance(data.data.balance))
      .catch(() => setBalance(null))
      .finally(() => setBalanceLoading(false));
  }, [dispatch, id]);

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setFormError('');
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.full_name.trim() || !form.local.trim()) {
      setFormError('שם ומספר טלפון הם שדות חובה.');
      return;
    }
    const cc      = COUNTRY_CODES.find((c) => c.code === form.country);
    const stripped = form.local.replace(/^0/, '');
    if (stripped.length < (cc?.minLen ?? 7)) {
      setFormError(`מספר הטלפון חייב להכיל לפחות ${cc?.minLen ?? 7} ספרות.`);
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
      setSuccess(`${form.role === 'manager' ? 'מנהל' : 'עובד'} "${form.full_name}" נוסף בהצלחה.`);
      setForm(EMPTY_USER);
      setShowForm(false);
      setTimeout(() => setSuccess(''), 4000);
    } else {
      setFormError(result.payload || 'הוספת המשתמש נכשלה.');
    }
  };

  const openEditForm = () => {
    setEditForm({
      name:                   factory.name || '',
      company_id_number:      factory.company_id_number || '',
      address:                factory.address || '',
      geofence_radius_meters: factory.geofence_radius_meters ? String(factory.geofence_radius_meters) : '',
    });
    setEditError('');
    setShowEditForm(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) { setEditError('שם מפעל הוא שדה חובה.'); return; }
    setEditSaving(true);
    const body = {
      name:             editForm.name.trim(),
      company_id_number: editForm.company_id_number.trim() || undefined,
      address:          editForm.address.trim() || undefined,
    };
    if (editForm.geofence_radius_meters) body.geofence_radius_meters = parseFloat(editForm.geofence_radius_meters);
    const result = await dispatch(updateFactoryThunk({ id, body }));
    setEditSaving(false);
    if (updateFactoryThunk.fulfilled.match(result)) {
      dispatch(fetchFactory({ id, force: true }));
      setSuccess('פרטי המפעל עודכנו בהצלחה.');
      setShowEditForm(false);
      setTimeout(() => setSuccess(''), 4000);
    } else {
      setEditError(result.payload || 'שגיאה בעדכון המפעל.');
    }
  };

  const toggleActive = async (user) => {
    if (user.is_active) {
      await dispatch(deactivateUserThunk(user.id));
    } else {
      await dispatch(reactivateUserThunk(user.id));
    }
  };

  if (factoryLoading) return <div className="loading-row">טוען פרטי מפעל…</div>;
  if (!factory) return <div className="loading-row">המפעל לא נמצא.</div>;

  const managers   = users.filter((u) => u.role === 'manager');
  const employees  = users.filter((u) => u.role === 'employee');

  return (
    <div className="admin-page">
      <Link to="/admin/factories" className="back-link">
        <ArrowLeft size={16} />
        חזרה למפעלים
      </Link>

      <div className="admin-page__header" style={{ marginTop: '16px' }}>
        <div>
          <h1>{factory.name}</h1>
          <p className="page-subtitle">מ.ח.: {factory.company_id_number}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to={`/admin/flags?factory_id=${id}`} className="btn-ghost btn-ghost--sm">
            <Flag size={14} />
            צפייה בדגלים
          </Link>
          <Link to={`/admin/reports?factory_id=${id}`} className="btn-ghost btn-ghost--sm">
            <Download size={14} />
            דו"ח קרדיטים
          </Link>
          <button className="btn-ghost btn-ghost--sm" onClick={openEditForm}>
            <Pencil size={14} />
            ערוך פרטים
          </button>
          <div className="refresh-group">
            {refreshedLabel && <span className="last-refreshed">{refreshedLabel}</span>}
            <button
              className="btn-ghost btn-ghost--icon"
              title="רענן"
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
            {STATUS_HE[factory.status] || factory.status}
          </span>
        </div>
      </div>

      {successMsg && (
        <div className="alert alert--success">
          <CheckCircle size={15} /> {successMsg}
        </div>
      )}

      {showEditForm && (
        <div className="form-card" style={{ marginBottom: '24px' }}>
          <div className="form-card__header">
            <h3>עריכת פרטי מפעל</h3>
            <button className="icon-btn" onClick={() => setShowEditForm(false)}><X size={18} /></button>
          </div>
          <form onSubmit={handleEditSubmit} className="factory-form">
            {editError && <div className="alert alert--error"><AlertCircle size={15} /> {editError}</div>}
            <div className="form-field">
              <label>שם מפעל <span className="required">*</span></label>
              <input
                value={editForm.name}
                onChange={(e) => { setEditForm((p) => ({ ...p, name: e.target.value })); setEditError(''); }}
                placeholder='לדוגמה: מיחזור ירוק בע"מ'
              />
            </div>
            <div className="form-field">
              <label>מזהה (ח.פ.)</label>
              <input
                value={editForm.company_id_number}
                onChange={(e) => setEditForm((p) => ({ ...p, company_id_number: e.target.value }))}
                placeholder="לדוגמה: 515234567"
              />
            </div>
            <div className="form-field">
              <label>כתובת</label>
              <input
                value={editForm.address}
                onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="לדוגמה: 12 אזור תעשייה, תל אביב"
              />
            </div>
            {factory.geofence_center && (
              <div className="form-field">
                <label>רדיוס גאופנס (מטרים)</label>
                <input
                  type="number" min="100" max="50000"
                  value={editForm.geofence_radius_meters}
                  onChange={(e) => setEditForm((p) => ({ ...p, geofence_radius_meters: e.target.value }))}
                />
                <span className="field-hint">עכשווית: {factory.geofence_radius_meters ?? 2000}מ</span>
              </div>
            )}
            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={() => setShowEditForm(false)} disabled={editSaving}>ביטול</button>
              <button type="submit" className="btn-primary" disabled={editSaving || !editForm.name.trim()}>
                {editSaving ? 'שומר…' : 'שמור שינויים'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="detail-cards">
        <div className="detail-card">
          <div className="detail-card__icon"><Building2 size={18} /></div>
          <div>
            <p className="detail-card__label">כתובת</p>
            <p className="detail-card__value">{factory.address}</p>
          </div>
        </div>

        <div className="detail-card">
          <div className="detail-card__icon"><Users size={18} /></div>
          <div>
            <p className="detail-card__label">משתמשים פעילים</p>
            <p className="detail-card__value">{factory.active_user_count ?? 0}</p>
          </div>
        </div>

        {factory.geofence_center && (
          <div className="detail-card">
            <div className="detail-card__icon"><MapPin size={18} /></div>
            <div>
              <p className="detail-card__label">גאופנס</p>
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
            <p className="detail-card__label">נוצר בתאריך</p>
            <p className="detail-card__value">
              {new Date(factory.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      <div className="factory-audit-block">
        <span className="factory-audit-block__item">
          <strong>נוצר על ידי:</strong> {factory.creator_name || '—'}
        </span>
        <span className="factory-audit-block__sep">·</span>
        <span className="factory-audit-block__item">
          <strong>בתאריך ושעה:</strong> {new Date(factory.created_at).toLocaleString('he-IL')}
        </span>
      </div>

      <div className="factory-balance-section">
        <div className="section-header section-header--tight">
          <h2><Scale size={16} style={{ marginLeft: '6px' }} />יתרת חשבון</h2>
        </div>
        {balanceLoading && <div className="loading-row">טוען יתרה…</div>}
        {!balanceLoading && balance && (
          <div className="balance-cards">
            <div className="balance-card">
              <span className="balance-card__label">חומר גלם שנקלט</span>
              <span className="balance-card__value">{parseFloat(balance.total_input_kg || 0).toLocaleString('he-IL', { maximumFractionDigits: 1 })} ק"ג</span>
            </div>
            <div className="balance-card balance-card--credits">
              <span className="balance-card__label">קרדיטים שהונפקו</span>
              <span className="balance-card__value">{parseFloat(balance.total_output_kg || 0).toLocaleString('he-IL', { maximumFractionDigits: 1 })} ק"ג</span>
            </div>
            <div className={`balance-card${parseFloat(balance.remaining_balance_kg) < 0 ? ' balance-card--negative' : ' balance-card--positive'}`}>
              <span className="balance-card__label">יתרה</span>
              <span className="balance-card__value">{parseFloat(balance.remaining_balance_kg || 0).toLocaleString('he-IL', { maximumFractionDigits: 1 })} ק"ג</span>
            </div>
          </div>
        )}
        {!balanceLoading && !balance && (
          <p className="td-muted" style={{ fontSize: '13px' }}>לא נמצאו נתוני יתרה למפעל זה.</p>
        )}
      </div>

      <div className="section-header">
        <h2>צוות</h2>
        <button className="btn-primary btn-primary--sm" onClick={() => setShowForm(true)}>
          <Plus size={15} /> הוסף משתמש
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <div className="form-card__header">
            <h3>הוספת איש צוות</h3>
            <button className="icon-btn" onClick={() => { setShowForm(false); setForm(EMPTY_USER); setFormError(''); }}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleAddUser} className="factory-form">
            {formError && <div className="alert alert--error"><AlertCircle size={15} /> {formError}</div>}
            <div className="form-row">
              <div className="form-field">
                <label>שם מלא <span className="required">*</span></label>
                <input name="full_name" type="text" placeholder="לדוגמה: שרה לוי"
                  value={form.full_name} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>תפקיד <span className="required">*</span></label>
                <select name="role" value={form.role} onChange={handleChange}>
                  <option value="employee">עובד</option>
                  <option value="manager">מנהל</option>
                </select>
              </div>
            </div>
            <div className="form-field">
              <label>מספר טלפון <span className="required">*</span></label>
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
              <button type="button" className="btn-ghost" onClick={() => setShowForm(false)} disabled={saving}>ביטול</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'מוסיף…' : 'הוסף'}</button>
            </div>
          </form>
        </div>
      )}

      {usersLoading && <div className="loading-row">טוען משתמשים…</div>}

      {!usersLoading && (
        <>
          {managers.length > 0 && (
            <div className="users-section">
              <h3 className="users-section__title">מנהלים</h3>
              <UserTable users={managers} onToggle={toggleActive} />
            </div>
          )}
          {employees.length > 0 && (
            <div className="users-section">
              <h3 className="users-section__title">עובדים</h3>
              <UserTable users={employees} onToggle={toggleActive} />
            </div>
          )}
          {users.length === 0 && !showForm && (
            <div className="empty-state">
              <Users size={36} />
              <p>אין אנשי צוות עדיין. הוסף את הראשון.</p>
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
          <th>שם</th>
          <th>טלפון</th>
          <th>תפקיד</th>
          <th>סטטוס</th>
          <th>פעולה</th>
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.id}>
            <td className="td-primary">{u.full_name}</td>
            <td className="td-muted">{u.phone_number}</td>
            <td><span className={`badge ${ROLE_BADGE[u.role] || 'badge--neutral'}`}>{ROLE_HE[u.role] || u.role}</span></td>
            <td>
              <span className={`badge ${u.is_active ? 'badge--green' : 'badge--neutral'}`}>
                {u.is_active ? 'פעיל' : 'לא פעיל'}
              </span>
            </td>
            <td>
              <RowActionsMenu items={[
                u.is_active
                  ? { label: 'השהה', icon: <UserX size={14} />, variant: 'danger',  onClick: () => onToggle(u) }
                  : { label: 'הפעל מחדש', icon: <UserCheck size={14} />, variant: 'success', onClick: () => onToggle(u) },
              ]} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default FactoryDetailPage;
