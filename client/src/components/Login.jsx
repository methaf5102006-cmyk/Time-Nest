import { useState } from 'react';
import api from '../api/api';
import '../styles/login.css';

const Svg = ({ children }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
const MailIcon = () => (<Svg><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></Svg>);
const LockIcon = () => (<Svg><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></Svg>);
const KeyIcon = () => (<Svg><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M16 7l3 3" /></Svg>);
const EyeIcon = () => (<Svg><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></Svg>);
const EyeOffIcon = () => (<Svg><path d="M17.94 17.94A10.9 10.9 0 0 1 12 19c-6.5 0-10-7-10-7a18 18 0 0 1 4.06-5.06M9.9 4.24A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-2.16 3.19M14.12 14.12A3 3 0 0 1 9.88 9.88M1 1l22 22" /></Svg>);
const CalendarIcon = () => (<Svg><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Svg>);

export default function Login({ onLoggedIn }) {
  const [step, setStep] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const finish = (token) => {
    localStorage.setItem('token', token);
    onLoggedIn();
  };

  const signIn = async (e) => {
    if (e) e.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    try {
      const res = await api.post('/auth/login', {
        email,
        password,
        deviceToken: localStorage.getItem('deviceToken') || '',
      });
      if (res.data.token) {
        finish(res.data.token);
      } else {
        setInfo(res.data.message);
        setStep('code');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Cannot reach the server.');
    }
    setBusy(false);
  };

  const verify = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api.post('/auth/verify-otp', { email, code });
      if (res.data.deviceToken) localStorage.setItem('deviceToken', res.data.deviceToken);
      finish(res.data.token);
    } catch (err) {
      setError(err.response?.data?.message || 'Cannot reach the server.');
    }
    setBusy(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo"><CalendarIcon /></div>

        {step === 'login' ? (
          <form onSubmit={signIn}>
            <h1>Admin Sign In</h1>
            <p className="login-sub">Timetable Management System</p>
            {error && <div className="login-error">{error}</div>}

            <label>Email address</label>
            <div className="input-wrap">
              <span className="input-icon"><MailIcon /></span>
              <input type="email" placeholder="admin@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
            </div>

            <label>Password</label>
            <div className="input-wrap">
              <span className="input-icon"><LockIcon /></span>
              <input type={showPw ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" className="eye-btn" onClick={() => setShowPw(!showPw)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                {showPw ? "🙈" : "👁"}
              </button>
            </div>

            <button className="login-btn" type="submit" disabled={busy}>
              {busy ? 'Checking...' : 'Sign in'}
            </button>
            <div className="login-foot">Authorized administrators only</div>
          </form>
        ) : (
          <form onSubmit={verify}>
            <h1>Verify your email</h1>
            <p className="login-sub">Enter the 6 digit code sent to {email}. This is needed only once on this device.</p>
            {info && <div className="login-info">{info}</div>}
            {error && <div className="login-error">{error}</div>}

            <label>6 digit code</label>
            <div className="input-wrap">
              <span className="input-icon"><KeyIcon /></span>
              <input
                className="otp-input"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
                required
              />
            </div>

            <button className="login-btn" type="submit" disabled={busy || code.length !== 6}>
              {busy ? 'Checking...' : 'Verify and sign in'}
            </button>
            <div className="login-links">
              <button type="button" className="link-btn" onClick={signIn} disabled={busy}>Send a new code</button>
              <button type="button" className="link-btn" onClick={() => { setStep('login'); setCode(''); setError(''); setInfo(''); }}>Back</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

