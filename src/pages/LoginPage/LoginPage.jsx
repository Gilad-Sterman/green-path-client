import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Leaf, Phone, MessageSquare, ArrowRight } from 'lucide-react';
import { sendOtpThunk, verifyOtpThunk } from '../../store/slices/authSlice';

const COUNTRY_CODES = [
  { code: '+972', label: '🇮🇱  +972', placeholder: '501234567',   minLen: 9 },
  { code: '+1',   label: '🇺🇸  +1',   placeholder: '2025550123',  minLen: 10 },
  { code: '+44',  label: '🇬🇧  +44',  placeholder: '7700900123',  minLen: 10 },
  { code: '+49',  label: '🇩🇪  +49',  placeholder: '15123456789', minLen: 10 },
];

const COUNTDOWN_START = 59;

const ERRORS = {
  phone_format:  'שגיאה | יש להזין מספר טלפון תקין בעל קידומת ישראלית (ולא 0).',
  phone_invalid: 'שגיאה | יש להזין מספר טלפון תקין.',
  terms:         'שגיאה | יש לאשר תנאי שימוש ומדיניות הפרטיות.',
  code_invalid:  'שגיאה | יש להזין את הקוד שקיבלת למכשיר שהזנת.',
  code_limit:    'שגיאה | ניתן לבצע עד שלוש ניסיונות התחברות. יש להמתין 15 דקות בטרם ניסיון חוזר.',
  code_expired:  'שגיאה | פג תוקף הקוד, נא לבקש קוד חדש.',
  code_wrong:    'שגיאה | קוד שגוי, נסו שוב.',
};

const mapServerError = (err) => {
  const msg = typeof err === 'string' ? err.toLowerCase() : '';
  if (msg.includes('expired'))                                     return 'code_expired';
  if (msg.includes('attempt') || msg.includes('limit') || msg.includes('too many')) return 'code_limit';
  if (msg.includes('invalid') || msg.includes('incorrect') || msg.includes('wrong')) return 'code_wrong';
  return 'code_invalid';
};

const formatCountdown = (secs) =>
  `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

const LoginPage = () => {
  const dispatch = useDispatch();

  const [step, setStep]           = useState('phone');
  const [countryCode, setCountry] = useState('+972');
  const [localNumber, setLocal]   = useState('');
  const [phone, setPhone]         = useState('');
  const [code, setCode]           = useState('');
  const [termsAccepted, setTerms] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [errorKey, setError]      = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const currentCountry = COUNTRY_CODES.find((c) => c.code === countryCode);
  const stripped       = localNumber.replace(/^0/, '');
  const isPhoneValid   = stripped.length >= (currentCountry?.minLen ?? 7);
  const canSend        = isPhoneValid && termsAccepted;

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');

    if (!isPhoneValid) {
      setError(countryCode === '+972' ? 'phone_format' : 'phone_invalid');
      return;
    }
    if (!termsAccepted) {
      setError('terms');
      return;
    }

    setLoading(true);
    const fullPhone = `${countryCode}${stripped}`;
    setPhone(fullPhone);
    try {
      await dispatch(sendOtpThunk(fullPhone)).unwrap();
      setStep('otp');
      setCountdown(COUNTDOWN_START);
    } catch (err) {
      setError('phone_invalid');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setCode('');
    setLoading(true);
    try {
      await dispatch(sendOtpThunk(phone)).unwrap();
      setCountdown(COUNTDOWN_START);
    } catch (err) {
      setError('phone_invalid');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await dispatch(verifyOtpThunk({ phone_number: phone, code })).unwrap();
    } catch (err) {
      setError(mapServerError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('phone');
    setCode('');
    setError('');
    setPhone('');
    setCountdown(0);
  };

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-brand">
          <Leaf size={28} strokeWidth={2.5} />
          <span>ATERUM</span>
        </div>

        <div className="login-header">
          <h3>ברוכים הבאים ל-ATERUM</h3>
        </div>

        {errorKey && (
          <div className="tooltip-bubble">{ERRORS[errorKey]}</div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="login-form">
            <div className="form-field">
              <label htmlFor="local-number">מספר טלפון</label>
              <div className="phone-input-wrap">
                <select
                  className="country-select"
                  value={countryCode}
                  onChange={(e) => setCountry(e.target.value)}
                  disabled={loading}
                  aria-label="קידומת מדינה"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
                <div className="phone-divider" />
                {/* <div className="phone-input-icon">
                  <Phone size={16} />
                </div> */}
                <input
                  id="local-number"
                  type="tel"
                  placeholder={currentCountry?.placeholder}
                  value={localNumber}
                  onChange={(e) => setLocal(e.target.value.replace(/[^0-9]/g, ''))}
                  autoFocus
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="terms-row">
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                onChange={(e) => setTerms(e.target.checked)}
                disabled={loading}
              />
              <label htmlFor="terms">
                אני מאשר/ת את תנאי השימוש ומדיניות הפרטיות של ATERUM
              </label>
            </div>

            <button
              type="submit"
              className={`btn-login${canSend && !loading ? ' btn-login--active' : ' btn-login--disabled'}`}
              disabled={loading || !canSend}
            >
              {loading ? '...שולח' : 'שלחו לי קוד'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="login-form">
            <div className="otp-info">
              <p>שלחנו קוד למספר <span>{phone}</span></p>
              <button type="button" className="link-btn" onClick={handleBack} disabled={loading}>
                לא המספר הנכון?
              </button>
            </div>

            <div className="form-field">
              <label htmlFor="code">קוד</label>
              <div className="input-icon-wrap">
                <span className="input-icon"><MessageSquare size={17} /></span>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="••••••"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              className={`btn-login${code.length === 6 && !loading ? ' btn-login--active' : ' btn-login--disabled'}`}
              disabled={loading || code.length !== 6}
            >
              {loading ? '...מאמת' : 'כניסה'}
            </button>

            <button
              type="button"
              className={`btn-login ${countdown === 0 && !loading ? ' btn-login--active' : ' btn-login--disabled'}`}
              disabled={loading || countdown > 0}
              onClick={handleResendOtp}
            >
              לא קיבלתי, שלחו שוב
            </button>

            {countdown > 0 && (
              <div className="otp-countdown">{formatCountdown(countdown)}</div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
