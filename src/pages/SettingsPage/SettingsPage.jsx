import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { UserPlus, Trash2 } from 'lucide-react';
import { deactivateSelfThunk } from '../../store/slices/authSlice';
import Toast from '../../components/Toast';

const SettingsPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const isManager = user?.role !== 'employee';

  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = () => {
    setConfirm({
      title: 'מחיקת חשבון',
      lines: [
        'פעולה זו תבטל את הגישה שלך למערכת לאלתר.',
        'כל הנתונים שיצרת יישמרו במערכת לצורכי ביקורת.',
      ],
      warning: 'לא ניתן לבטל פעולה זו.',
      label: 'מחק חשבון',
      danger: true,
      onConfirm: async () => {
        setConfirm(null);
        setDeleting(true);
        const result = await dispatch(deactivateSelfThunk());
        if (deactivateSelfThunk.fulfilled.match(result)) {
          navigate('/login', { replace: true });
        } else {
          setToast(result.payload || 'מחיקת החשבון נכשלה, נסה שוב.');
          setDeleting(false);
        }
      },
    });
  };

  return (
    <div className="manager-page" style={{ maxWidth: 560, margin: '0 auto' }}>
      <div className="manager-page__header">
        <div>
          <h1>הגדרות</h1>
          <p className="mgr-dashboard__subtitle">{user?.full_name}</p>
        </div>
      </div>

      <Toast message={toast} onClose={() => setToast('')} />

      {isManager && (
        <>
          <div className="production-actions">
            <Link to="/team?invite=1" className="prod-action">
              <div className="prod-action__icon"><UserPlus size={22} /></div>
              <div>
                <p className="prod-action__title">הזמנת משתמשים</p>
              </div>
            </Link>
          </div>

          <div className="mgmt-grid" style={{ marginTop: 16 }}>
            <Link to="/team" className="mgmt-tile">
              <span className="mgmt-tile__label">ניהול משתמשים</span>
            </Link>
            <a href="mailto:support@greenpath.co.il" className="mgmt-tile">
              <span className="mgmt-tile__label">יצירת קשר עם התמיכה</span>
            </a>
          </div>
        </>
      )}

      <p className="mgr-section-title" style={!isManager ? { marginTop: 0 } : {}}>חשבון</p>
      <div className="settings-danger-zone">
        <div className="settings-danger-zone__info">
          <p className="settings-danger-zone__title">מחיקת חשבון</p>
          <p className="settings-danger-zone__desc">
            החשבון יושהה לצמיתות. כל הנתונים שיצרת יישמרו.
          </p>
        </div>
        <button
          className="btn-danger"
          onClick={handleDeleteAccount}
          disabled={deleting}
        >
          <Trash2 size={15} />
          {deleting ? 'מוחק…' : 'מחק חשבון'}
        </button>
      </div>

      {confirm && (
        <div className="confirm-overlay" onClick={() => setConfirm(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="confirm-modal__title">{confirm.title}</h3>
            {confirm.lines?.map((line, i) => (
              <p key={i} className="confirm-modal__line">{line}</p>
            ))}
            {confirm.warning && (
              <p className="confirm-modal__warn">{confirm.warning}</p>
            )}
            <div className="confirm-modal__actions">
              <button className="btn-ghost" onClick={() => setConfirm(null)}>ביטול</button>
              <button
                className={confirm.danger ? 'btn-danger' : 'btn-primary'}
                onClick={confirm.onConfirm}
              >
                {confirm.label}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
