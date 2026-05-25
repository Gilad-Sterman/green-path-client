import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, AlertCircle, RefreshCw, Pencil } from 'lucide-react';
import RowActionsMenu from '../../components/RowActionsMenu';
import useRelativeTime from '../../hooks/useRelativeTime';
import { fetchIntakes } from '../../store/slices/intakesSlice';

const MATERIAL_TYPES   = ['plastic', 'paper', 'metal', 'glass', 'textile', 'rubber', 'mixed', 'other'];

const STATUS_BADGE = { recycled: 'badge--green', virgin: 'badge--neutral', mixed: 'badge--warn' };

const MATERIAL_TYPE_HE = {
  plastic: 'פלסטיק', paper: 'נייר / קרטון', metal: 'מתכת',
  glass: 'זכוכית', textile: 'טקסטיל', rubber: 'גומי', mixed: 'מעורב', other: 'אחר',
};
const MATERIAL_SOURCE_HE = {
  post_consumer: 'פוסט-צרכני', post_industrial: 'פוסט-תעשייתי',
  commercial: 'מסחרי', municipal: 'עירוני', other: 'אחר',
};
const MATERIAL_STATUS_HE = { recycled: 'ממוחזר', virgin: 'גולמי', mixed: 'מעורב' };
const FILTER_LABELS = { all: 'הכל', recycled: 'ממוחזר', virgin: 'גולמי', mixed: 'מעורב' };


const fmtDate = (d) => d ? new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const fmtKg   = (n) => n != null ? `${parseFloat(n).toLocaleString('he-IL', { maximumFractionDigits: 2 })} ק"ג` : '—';

const FILTERS = ['all', 'recycled', 'virgin', 'mixed'];

const IntakesPage = () => {
  const dispatch = useDispatch();
  const navigate  = useNavigate();
  const { list: intakes, loading, error, lastFetched } = useSelector((s) => s.intakes);
  const { user } = useSelector((s) => s.auth);
  const isManager = user?.role === 'manager' || user?.role === 'internal_admin';
  const refreshedLabel = useRelativeTime(lastFetched);

  const [filter, setFilter]         = useState('all');
  const [typeFilter, setTypeFilter] = useState('');

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
          <h1>קליטות חומר גלם</h1>
          <p className="page-subtitle">תיעוד כניסות חומר גלם למחסן</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="refresh-group">
            {refreshedLabel && <span className="last-refreshed">{refreshedLabel}</span>}
            <button className="btn-ghost btn-ghost--icon" onClick={() => dispatch(fetchIntakes({ force: true }))} disabled={loading} title="רענן">
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>
          </div>
          {isManager && (
            <button className="btn-primary btn-primary--sm" onClick={() => navigate('/intakes/new')}>
              <Plus size={16} /> קליטה חדשה
            </button>
          )}
        </div>
      </div>

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
        <>
          {/* ── Desktop table ───────────────────────────────────────── */}
          <div className="data-table-wrap hide-on-mobile">
            <table className="data-table">
              <thead>
                <tr>
                  <th>תאריך</th>
                  <th>ספק</th>
                  <th>סוג חומר</th>
                  <th>מקור</th>
                  <th>משקל נטו</th>
                  <th>משקל זכאי</th>
                  <th>תעודת משלוח</th>
                  <th>סטטוס</th>
                  {isManager && <th>נרשם ע"י</th>}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((i) => (
                  <tr key={i.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(i.intake_date)}</td>
                    <td className="td-primary">{i.supplier_name || '—'}</td>
                    <td><span className="tag">{MATERIAL_TYPE_HE[i.material_type] || i.material_type}</span></td>
                    <td className="td-muted">{MATERIAL_SOURCE_HE[i.material_source] || i.material_source || '—'}</td>
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
                        {MATERIAL_STATUS_HE[i.material_status] || i.material_status}
                      </span>
                    </td>
                    {isManager && (
                      <td className="td-muted" style={{ fontSize: '12px' }}>
                        {i.created_by_name || '—'}
                      </td>
                    )}
                    <td>
                      {isManager && (
                        <RowActionsMenu items={[
                          { label: 'עריכה', icon: <Pencil size={14} />, onClick: () => navigate('/intakes/new', { state: { intake: i } }) },
                        ]} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile cards ────────────────────────────────────────── */}
          <div className="intake-cards show-on-mobile">
            {visible.map((i) => (
              <div key={i.id} className="intake-card">
                <div className="intake-card__top">
                  <div>
                    <span className="intake-card__supplier">{i.supplier_name || '—'}</span>
                    <span className="intake-card__date">{fmtDate(i.intake_date)}</span>
                  </div>
                  <span className={`badge ${STATUS_BADGE[i.material_status] || 'badge--neutral'}`}>
                    {MATERIAL_STATUS_HE[i.material_status] || i.material_status}
                  </span>
                </div>
                <div className="intake-card__row">
                  <span className="tag">{MATERIAL_TYPE_HE[i.material_type] || i.material_type}</span>
                  <span className="intake-card__weight">{fmtKg(i.net_weight_kg)}</span>
                </div>
                <div className="intake-card__meta">
                  <span>תעודה: <code>{i.delivery_note_number}</code></span>
                  {i.created_by_name && <span>הוזן ע"י: {i.created_by_name}</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default IntakesPage;
