import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Plus, X, CheckCircle, AlertCircle, MapPin, Users, Eye, RefreshCw, Lock, Unlock, Flag, BarChart3, Loader2 } from 'lucide-react';
import RowActionsMenu from '../../components/RowActionsMenu';
import { fetchFactories, createFactoryThunk, clearFactoriesError, suspendFactoryThunk, unsuspendFactoryThunk } from '../../store/slices/factoriesSlice';
import { geocodeAddress } from '../../api/factories';
import useRelativeTime from '../../hooks/useRelativeTime';

const STATUS_BADGE = {
  active:    'badge--green',
  suspended: 'badge--warn',
  inactive:  'badge--neutral',
};

const STATUS_LABEL = {
  active:    'פעיל',
  suspended: 'מושהה',
  inactive:  'לא פעיל',
};

const COUNTRY_CODES = [
  { code: '+972', label: '🇮🇱 +972', minLen: 9 },
  { code: '+1',   label: '🇺🇸 +1',   minLen: 10 },
  { code: '+44',  label: '🇬🇧 +44',  minLen: 10 },
  { code: '+49',  label: '🇩🇪 +49',  minLen: 10 },
];

const formatRelativeTime = (ts) => {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'עכשיו';
  if (mins < 60) return `לפני ${mins} דק'`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `לפני ${hrs} שע'`;
  const days = Math.floor(hrs / 24);
  return days < 7 ? `לפני ${days} ימים` : new Date(ts).toLocaleDateString('he-IL');
};

const EMPTY_FORM = {
  name: '', company_id_number: '', address: '',
  geofence_lat: '', geofence_lng: '', geofence_radius_meters: '',
  manager_name: '', manager_email: '', manager_country: '+972', manager_local: '',
};

const FactoriesPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { list: factories, loading, error, lastFetched } = useSelector((state) => state.factories);
  const refreshedLabel = useRelativeTime(lastFetched);

  const [showForm, setShowForm]   = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [successMsg, setSuccess]  = useState('');
  const [formError, setFormError] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [geoState, setGeoState]   = useState(null);

  useEffect(() => {
    dispatch(fetchFactories());
  }, [dispatch]);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowForm(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFormError('');
    if (name === 'address') setGeoState(null);
  };

  const handleGeocode = async () => {
    if (!form.address.trim()) return;
    setGeocoding(true);
    setGeoState(null);
    try {
      const { data } = await geocodeAddress(form.address.trim());
      const { lat, lng, formatted_address } = data.data;
      setGeoState({ lat, lng, formatted_address });
      setForm((p) => ({
        ...p,
        geofence_lat: String(lat),
        geofence_lng: String(lng),
        geofence_radius_meters: p.geofence_radius_meters || '2000',
      }));
    } catch (err) {
      setGeoState({ error: err.response?.data?.error?.message || 'לא ניתן לאתר את הכתובת. נסה לפרט יותר.' });
    } finally {
      setGeocoding(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.name.trim() || !form.company_id_number.trim() || !form.address.trim()) {
      setFormError('שם מפעל, מזהה חברה וכתובת הם שדות חובה.');
      return;
    }
    if (!form.manager_name.trim() || !form.manager_local.trim() || !form.manager_email.trim()) {
      setFormError('שם מנהל/ת, אימייל ומספר טלפון הם שדות חובה.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.manager_email.trim())) {
      setFormError('יש להזין כתובת אימייל תקינה.');
      return;
    }

    const stripped = form.manager_local.replace(/^0/, '');
    const country   = COUNTRY_CODES.find((c) => c.code === form.manager_country);
    if (stripped.length < (country?.minLen ?? 7)) {
      setFormError(`מספר הטלפון חייב להכיל לפחות ${country?.minLen ?? 7} ספרות עבור ${form.manager_country}.`);
      return;
    }

    const payload = {
      name:               form.name.trim(),
      company_id_number:  form.company_id_number.trim(),
      address:            form.address.trim(),
      admin_user: {
        full_name:    form.manager_name.trim(),
        email:        form.manager_email.trim(),
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
      setSuccess(`המפעל "${form.name}" נוצר בהצלחה.`);
      setForm(EMPTY_FORM);
      setShowForm(false);
      setTimeout(() => setSuccess(''), 4000);
    } else {
      setFormError(result.payload || 'שגיאה ביצירת המפעל.');
    }
  };

  const handleSuspendConfirm = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    const thunk = confirmAction.type === 'suspend'
      ? suspendFactoryThunk({ id: confirmAction.factory.id, reason: suspendReason })
      : unsuspendFactoryThunk(confirmAction.factory.id);
    const result = await dispatch(thunk);
    setActionLoading(false);
    if (!result.error) {
      setSuccess(
        confirmAction.type === 'suspend'
          ? `המפעל "${confirmAction.factory.name}" נחסם בהצלחה.`
          : `המפעל "${confirmAction.factory.name}" שוחרר בהצלחה.`
      );
      setTimeout(() => setSuccess(''), 4000);
    } else {
      setFormError(result.payload || 'שגיאה בביצוע הפעולה.');
    }
    setConfirmAction(null);
    setSuspendReason('');
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setForm(EMPTY_FORM);
    setFormError('');
    setGeoState(null);
    dispatch(clearFactoriesError());
  };

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div>
          <h1>מפעלים</h1>
          <p className="page-subtitle">ניהול מפעלי המיחזור הרשומים במערכת</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="refresh-group">
            {refreshedLabel && <span className="last-refreshed">{refreshedLabel}</span>}
            <button
              className="btn-ghost btn-ghost--icon"
              onClick={() => dispatch(fetchFactories({ force: true }))}
              title="רענון"
              disabled={loading}
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>
          </div>
          <button className="btn-primary btn-primary--sm" onClick={() => setShowForm(true)}>
            <Plus size={16} />
            מפעל חדש
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
            <h3>יצירת מפעל חדש</h3>
            <button className="icon-btn" onClick={handleCloseForm} aria-label="סגור">
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

            <div className="form-split">
              {/* ── פרטי המפעל ── */}
              <div className="form-col">
                <div className="form-col__header">
                  <h4 className="form-col__title">פרטי המפעל</h4>
                  <p className="form-col__subtitle">כך תוכלו למצוא את המפעל במערכת</p>
                </div>

                <div className="form-field">
                  <label htmlFor="name">שם מפעל <span className="required">*</span></label>
                  <input
                    id="name" name="name" type="text"
                    placeholder='לדוגמה: מיחזור ירוק בע"מ'
                    value={form.name} onChange={handleChange} required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="company_id_number">מזהה (ח.פ.) <span className="required">*</span></label>
                  <input
                    id="company_id_number" name="company_id_number" type="text"
                    placeholder="לדוגמה: 515234567"
                    value={form.company_id_number} onChange={handleChange} required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="address">כתובת המפעל <span className="required">*</span></label>
                  <input
                    id="address" name="address" type="text"
                    placeholder="לדוגמה: 12 אזור תעשייה, תל אביב"
                    value={form.address} onChange={handleChange} required
                  />
                </div>

                <div className="form-field">
                  <button
                    type="button"
                    className="btn-geocode"
                    onClick={handleGeocode}
                    disabled={!form.address.trim() || geocoding}
                  >
                    {geocoding
                      ? <><Loader2 size={14} className="spin" /> מאתר מיקום...</>
                      : <><MapPin size={14} /> אתר מיקום אוטומטית</>}
                  </button>
                  {geoState?.error && (
                    <span className="geo-result geo-result--error">
                      <AlertCircle size={13} />
                      {geoState.error}
                    </span>
                  )}
                  {geoState?.lat && (
                    <span className="geo-result geo-result--success">
                      <CheckCircle size={13} />
                      {geoState.formatted_address}
                    </span>
                  )}
                </div>

                {geoState?.lat && (
                  <div className="form-field">
                    <label htmlFor="geofence_radius_meters">רדיוס גאופנס (מטרים)</label>
                    <input
                      id="geofence_radius_meters" name="geofence_radius_meters" type="number"
                      min="100" max="50000"
                      value={form.geofence_radius_meters} onChange={handleChange}
                    />
                    <span className="field-hint">ברירת מחדל: 2,000 מטר (2 ק"מ)</span>
                  </div>
                )}
              </div>

              <div className="form-col-divider" />

              {/* ── פרטי איש הקשר ── */}
              <div className="form-col">
                <div className="form-col__header">
                  <h4 className="form-col__title">פרטי איש הקשר</h4>
                  <p className="form-col__subtitle">יסומנו כמשתמש/ת הראשי/ת במפעל</p>
                </div>

                <div className="form-field">
                  <label htmlFor="manager_name">שם מנהל/ת המפעל <span className="required">*</span></label>
                  <input
                    id="manager_name" name="manager_name" type="text"
                    placeholder="לדוגמה: דוד כהן"
                    value={form.manager_name} onChange={handleChange} required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="manager_email">אימייל <span className="required">*</span></label>
                  <input
                    id="manager_email" name="manager_email" type="email"
                    placeholder="לדוגמה: david@factory.co.il"
                    value={form.manager_email} onChange={handleChange} required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="manager_local">טלפון מנהל/ת <span className="required">*</span></label>
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
            </div>

            <div className="form-actions">
              {/* <button type="button" className="btn-ghost" onClick={handleCloseForm} disabled={saving}>
                ביטול
              </button> */}
              <button
                type="submit"
                className="btn-primary"
                disabled={
                  saving ||
                  !geoState?.lat ||
                  !form.name.trim() ||
                  !form.company_id_number.trim() ||
                  !form.address.trim() ||
                  !form.manager_name.trim() ||
                  !form.manager_email.trim() ||
                  !form.manager_local.trim()
                }
              >
                {saving ? '...יוצר' : 'הוספת מפעל'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && <div className="loading-row">...טוען מפעלים</div>}

      {!loading && factories.length === 0 && !showForm && (
        <div className="empty-state">
          <Building2 size={40} />
          <p>אין מפעלים עדיין. צרו את הראשון.</p>
        </div>
      )}

      {!loading && factories.length > 0 && (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>שם מפעל</th>
                <th>ח.פ.</th>
                <th>איש קשר</th>
                <th>סטטוס</th>
                <th>עובדים</th>
                <th>מנהלים</th>
                <th>דגלים</th>
                <th>קרדיטים (ק"ג)</th>
                <th>פעילות אחרונה</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {factories.map((f) => (
                <tr key={f.id}>
                  <td className="td-primary">
                    <Link to={`/admin/factories/${f.id}`}>{f.name}</Link>
                  </td>
                  <td>{f.company_id_number}</td>
                  <td>{f.contact_name || <span className="td-muted">—</span>}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[f.status] || 'badge--neutral'}`}>
                      {STATUS_LABEL[f.status] || f.status}
                    </span>
                  </td>
                  <td>{f.employee_count ?? 0}</td>
                  <td>{f.manager_count ?? 0}</td>
                  <td>
                    {parseInt(f.open_flags_count) > 0
                      ? <span className="badge badge--warn">{f.open_flags_count}</span>
                      : <span className="td-muted">—</span>}
                  </td>
                  <td>
                    {parseFloat(f.total_credits_kg) > 0
                      ? Number(f.total_credits_kg).toLocaleString('he-IL')
                      : <span className="td-muted">—</span>}
                  </td>
                  <td className="td-muted">{formatRelativeTime(f.last_activity)}</td>
                  <td>
                    <RowActionsMenu items={[
                      f.status === 'active' && {
                        label: 'חסימת מפעל', icon: <Lock size={14} />, variant: 'danger',
                        onClick: () => setConfirmAction({ type: 'suspend', factory: f }),
                      },
                      f.status === 'suspended' && {
                        label: 'שחרור מפעל', icon: <Unlock size={14} />,
                        onClick: () => setConfirmAction({ type: 'unsuspend', factory: f }),
                      },
                      { label: 'צפייה בדגלים',   icon: <Flag size={14} />,     onClick: () => navigate(`/admin/flags?factory_id=${f.id}`) },
                      { label: 'דו"ח קרדיטים',   icon: <BarChart3 size={14} />, onClick: () => navigate(`/admin/reports?factory_id=${f.id}`) },
                      { label: 'צפייה בפרטים',   icon: <Eye size={14} />,      onClick: () => navigate(`/admin/factories/${f.id}`) },
                    ].filter(Boolean)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {confirmAction && (
        <div className="modal-overlay" onClick={() => !actionLoading && (setConfirmAction(null), setSuspendReason(''))}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{confirmAction.type === 'suspend' ? 'חסימת מפעל' : 'שחרור מפעל'}</h3>
            <p className="modal__body">
              {confirmAction.type === 'suspend'
                ? `חסימת המפעל תעצור את כל הפעילות החדשה של משתמשי "${confirmAction.factory.name}" במערכת.`
                : `שחרור המפעל יחזיר את משתמשי "${confirmAction.factory.name}" לפעילות במערכת.`}
            </p>
            {confirmAction.type === 'suspend' && (
              <div className="form-field">
                <label>סיבת חסימה <span className="required">*</span></label>
                <input
                  type="text"
                  placeholder='לדוגמה: הפרת תנאי שימוש'
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  autoFocus
                />
              </div>
            )}
            <div className="modal__actions">
              <button
                className="btn-ghost"
                onClick={() => { setConfirmAction(null); setSuspendReason(''); }}
                disabled={actionLoading}
              >
                ביטול
              </button>
              <button
                className={confirmAction.type === 'suspend' ? 'btn-danger' : 'btn-primary'}
                onClick={handleSuspendConfirm}
                disabled={actionLoading || (confirmAction.type === 'suspend' && !suspendReason.trim())}
              >
                {actionLoading ? '...' : confirmAction.type === 'suspend' ? 'כן, חסום' : 'כן, שחרר'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FactoriesPage;
