import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, AlertCircle, RefreshCw, Pencil, Scale } from 'lucide-react';
import RowActionsMenu from '../../components/RowActionsMenu';
import useRelativeTime from '../../hooks/useRelativeTime';
import Toast from '../../components/Toast';
import InternalWeighingModal from '../../components/InternalWeighingModal';
import { fetchIntakes } from '../../store/slices/intakesSlice';

const MATERIAL_TYPES = ['plastic', 'paper', 'metal', 'glass', 'textile', 'rubber', 'mixed', 'other'];

const STATUS_BADGE = { recycled: 'badge--green', virgin: 'badge--neutral', mixed: 'badge--warn' };

const MATERIAL_TYPE_HE = {
  plastic: 'פלסטיק', paper: 'נייר / קרטון', metal: 'מתכת',
  glass: 'זכוכית', textile: 'טקסטיל', rubber: 'גומי', mixed: 'מעורב', other: 'אחר',
};
const MATERIAL_STATUS_HE = { recycled: 'ממוחזר', virgin: 'גולמי', mixed: 'מעורב' };
const FILTER_LABELS = { all: 'הכל', recycled: 'ממוחזר', virgin: 'גולמי', mixed: 'מעורב' };


const fmtDate = (d) => d ? new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const fmtKg = (n) => n != null ? `${parseFloat(n).toLocaleString('he-IL', { maximumFractionDigits: 2 })} ק"ג` : '—';

const FILTERS = ['all', 'recycled', 'virgin', 'mixed'];

const IntakesPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list: intakes, loading, error, lastFetched } = useSelector((s) => s.intakes);
  const { user } = useSelector((s) => s.auth);
  const isManager = user?.role === 'manager' || user?.role === 'internal_admin';
  const refreshedLabel = useRelativeTime(lastFetched);

  const [filter,         setFilter]         = useState('all');
  const [typeFilter,     setTypeFilter]     = useState('');
  const [weighingIntake, setWeighingIntake] = useState(null);
  const [toast,          setToast]          = useState('');

  useEffect(() => {
    dispatch(fetchIntakes({ force: false }));
  }, [dispatch]);




  const visible = intakes.filter((i) => {
    if (filter !== 'all' && i.material_status !== filter) return false;
    if (typeFilter && i.material_type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="manager-page">
      <div className="manager-page__header">
        <div>
          <h1>ניהול כניסות</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="refresh-group">
            {refreshedLabel && <span className="last-refreshed">{refreshedLabel}</span>}
            <button className="btn-ghost btn-ghost--icon" onClick={() => dispatch(fetchIntakes({ force: true }))} disabled={loading} title="רענן">
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>
      </div>
      {isManager && (
        <button className="btn-primary new-intake-btn" onClick={() => navigate('/intakes/new')}>
          <Plus size={16} /> קליטת חומר למחסן
        </button>
      )}

      {error && <div className="alert alert--error"><AlertCircle size={16} />{error}</div>}

      <div className="intakes-filters">
        <div className="filter-tabs">
          {FILTERS.map((f) => (
            <button key={f} className={`filter-tab${filter === f ? ' filter-tab--active' : ''}`} onClick={() => setFilter(f)}>
              {FILTER_LABELS[f] || f}
              <span style={{ marginRight: '6px', opacity: 0.6, fontSize: '11px' }}>
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
          <option value="">כל הסוגים</option>
          {MATERIAL_TYPES.map((t) => <option key={t} value={t}>{MATERIAL_TYPE_HE[t] || t}</option>)}
        </select>
      </div>

      {loading && <div className="loading-row">טוען קליטות…</div>}

      {!loading && visible.length === 0 && (
        <div className="empty-state">
          <Package size={36} />
          <p>{intakes.length === 0 ? 'טרם נרשמו קליטות. רשום את הראשונה.' : 'אין קליטות התואמות לסינון הנוכחי.'}</p>
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div className="intake-cards">
          {visible.map((i) => (
            <div key={i.id} className="intake-card">
              <div className="intake-card__top">
                <div>
                  <span className="intake-card__supplier">{i.supplier_name || '—'}</span>
                  <span className="intake-card__date">{fmtDate(i.intake_date)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`badge ${STATUS_BADGE[i.material_status] || 'badge--neutral'}`}>
                    {MATERIAL_STATUS_HE[i.material_status] || i.material_status}
                  </span>
                  {isManager && (
                    <RowActionsMenu items={[
                      { label: 'עריכה', icon: <Pencil size={14} />, onClick: () => navigate('/intakes/new', { state: { intake: i } }) },
                      { label: 'הוספת שקילה פנימית', icon: <Scale size={14} />, onClick: () => setWeighingIntake(i) },
                    ]} />
                  )}
                </div>
              </div>
              <div className="intake-card__row">
                <span className="tag">{MATERIAL_TYPE_HE[i.material_type] || i.material_type}</span>
                <span className="intake-card__weight">{fmtKg(i.net_weight_kg)}</span>
              </div>
              {i.eligible_weight_kg != null && (
                <div className="intake-card__row">
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>משקל זכאי:</span>
                  <span style={{ fontSize: '12px' }}>
                    {fmtKg(i.eligible_weight_kg)}
                    {parseFloat(i.eligible_input_percent) < 100 && (
                      <span style={{ fontSize: '11px', opacity: 0.65, marginRight: '3px' }}>({i.eligible_input_percent}%)</span>
                    )}
                  </span>
                </div>
              )}
              {i.has_internal_weighing && (
                <div className="intake-card__row intake-card__row--weighing">
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>שקילה פנימית:</span>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>{fmtKg(i.internal_weight_kg)}</span>
                </div>
              )}
              <div className="intake-card__meta">
                <span>תעודה: <code>{i.delivery_note_number}</code></span>
                {i.created_by_name && <span>הוזן ע"י: {i.created_by_name}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      <Toast message={toast} onClose={() => setToast('')} />
      {weighingIntake && (
        <InternalWeighingModal
          intake={weighingIntake}
          onClose={() => setWeighingIntake(null)}
          onSuccess={() => setToast(`שקילה פנימית נוספה בהצלחה לקליטה מ-${weighingIntake.supplier_name || ''}.`)}
        />
      )}
    </div>
  );
};

export default IntakesPage;
