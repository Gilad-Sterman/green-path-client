import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Leaf, Phone, MessageSquare, ArrowRight, CheckCircle } from 'lucide-react';
import { sendOtpThunk, verifyOtpThunk } from '../../store/slices/authSlice';

const COUNTRY_CODES = [
  { code: '+972', label: '🇮🇱  +972', placeholder: '501234567',   minLen: 9 },
  { code: '+1',   label: '🇺🇸  +1',   placeholder: '2025550123',  minLen: 10 },
  { code: '+44',  label: '🇬🇧  +44',  placeholder: '7700900123',  minLen: 10 },
  { code: '+49',  label: '🇩🇪  +49',  placeholder: '15123456789', minLen: 10 },
];

const LoginPage = () => {
  const dispatch = useDispatch();

  const [step, setStep]             = useState('phone'); // 'phone' | 'otp'
  const [countryCode, setCountry]   = useState('+972');
  const [localNumber, setLocal]     = useState('');
  const [phone, setPhone]           = useState(''); // full E.164, set on submit
  const [code, setCode]             = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  const currentCountry = COUNTRY_CODES.find((c) => c.code === countryCode);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');

    const stripped = localNumber.replace(/^0/, '');
    const minLen = currentCountry?.minLen ?? 7;
    if (stripped.length < minLen) {
      setError(`Please enter a valid ${minLen}-digit number for ${countryCode}.`);
      return;
    }

    setLoading(true);
    const fullPhone = `${countryCode}${stripped}`;
    setPhone(fullPhone);
    try {
      await dispatch(sendOtpThunk(fullPhone)).unwrap();
      setStep('otp');
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to send code. Check the number and try again.');
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
      // Auth state updates → App.jsx router redirects to /
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('phone');
    setCode('');
    setError('');
    setPhone('');
  };

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-brand">
          <Leaf size={28} strokeWidth={2.5} />
          <span>GreenPath</span>
        </div>

        <div className="login-header">
          <h2>{step === 'phone' ? 'Sign in' : 'Enter your code'}</h2>
          <p>
            {step === 'phone'
              ? 'Enter your phone number to receive a 6-digit verification code.'
              : `We sent a code to ${phone}. It expires in 10 minutes.`}
          </p>
        </div>

        {error && <div className="login-error">{error}</div>}

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="login-form">
            <div className="form-field">
              <label htmlFor="local-number">Phone number</label>
              <div className="phone-input-wrap">
                <select
                  className="country-select"
                  value={countryCode}
                  onChange={(e) => setCountry(e.target.value)}
                  disabled={loading}
                  aria-label="Country code"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
                <div className="phone-divider" />
                <div className="phone-input-icon">
                  <Phone size={16} />
                </div>
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
              <span className="field-hint">Enter without leading zero. Your number must already be registered by your manager.</span>
            </div>

            <button type="submit" className="btn-primary" disabled={loading || !localNumber}>
              {loading ? 'Sending…' : 'Send verification code'}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="login-form">
            <div className="otp-sent-info">
              <CheckCircle size={16} />
              Code sent to {phone}
            </div>

            <div className="form-field">
              <label htmlFor="code">6-digit code</label>
              <div className="input-icon-wrap">
                <span className="input-icon"><MessageSquare size={17} /></span>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="000000"
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
              className="btn-primary"
              disabled={loading || code.length !== 6}
            >
              {loading ? 'Verifying…' : 'Verify & sign in'}
              {!loading && <ArrowRight size={17} />}
            </button>

            <button type="button" className="btn-ghost" onClick={handleBack} disabled={loading}>
              Use a different number
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
