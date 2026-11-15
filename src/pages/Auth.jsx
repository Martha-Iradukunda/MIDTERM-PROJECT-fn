import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../state/app.jsx';
import { PasswordInput, Spinner, useTitle } from '../components/ui.jsx';

function AuthLayout({ children }) {
  return (
    <div className="auth-page">
      <div className="auth-side">
        <div className="copy">
          <h2>We bring you the best of the <b>best Classic Fashion</b>. First trusted website.</h2>
          <p style={{ color: '#e8d8c4' }}>Shop fashion, electronics, home, groceries and Rwandan crafts. Pay with Mobile Money or cash on delivery.</p>
        </div>
        <img src="/img/fashion.webp" alt="" />
      </div>
      <div className="auth-form"><div className="box">{children}</div></div>
    </div>
  );
}

function GoogleButton() {
  const { config } = useApp();
  if (!config?.features?.google) return null;
  return (
    <>
      <a href="/api/auth/google" className="btn block google-btn"><img src="/img/google-logo.png" alt="" /> Continue with Google</a>
      <div className="divider">or</div>
    </>
  );
}

function useAfterLogin() {
  const { signIn } = useApp();
  const nav = useNavigate();
  const [params] = useSearchParams();
  return async (session) => {
    await signIn(session);
    const next = params.get('next');
    if (session.user.must_update_password) nav('/account/security', { replace: true });
    else if (next && next.startsWith('/')) nav(next, { replace: true });
    else nav(session.user.role === 'admin' ? '/admin' : '/', { replace: true });
  };
}

export function Login() {
  useTitle('Log in');
  const { user, toast } = useApp();
  const [params] = useSearchParams();
  const done = useAfterLogin();
  const [f, setF] = useState({ email: '', password: '' });
  const [mfa, setMfa] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState(params.get('error') === 'google' ? 'Google sign-in did not work. Please try again or use your email.' : params.get('error') === 'disabled' ? 'This account is disabled. Please contact the shop.' : '');
  const [needsVerify, setNeedsVerify] = useState(false);
  const [busy, setBusy] = useState(false);
  if (user && !busy) return <Navigate to="/" replace />;

  const login = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await api('/auth/login', { method: 'POST', body: f });
      if (r.mfa) { setMfa(r.email); toast(r.message, 'info'); setBusy(false); return; }
      await done(r);
    } catch (err) {
      setError(err.message);
      setNeedsVerify(Boolean(err.data?.needsVerification));
      setBusy(false);
    }
  };
  const verifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try { await done(await api('/auth/mfa', { method: 'POST', body: { email: mfa, code } })); } catch (err) { setError(err.message); setBusy(false); }
  };
  const resend = async () => {
    try { const r = await api('/auth/resend-verification', { method: 'POST', body: { email: f.email } }); toast(r.message); } catch (err) { setError(err.message); }
  };

  if (mfa) {
    return (
      <AuthLayout>
        <h1 className="mb-0">Check your email</h1>
        <p className="muted mb-0">We sent a 6-digit code to <b>{mfa}</b>. It expires in 10 minutes.</p>
        <form className="stack" onSubmit={verifyCode}>
          <input className="code-input" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" required minLength={6} placeholder="••••••" aria-label="Code" autoFocus />
          {error && <div className="error-box">{error}</div>}
          <button type="submit" className="btn block lg" disabled={busy}>Verify and log in</button>
          <button type="button" className="link" onClick={() => { setMfa(null); setCode(''); }}>← Back</button>
        </form>
      </AuthLayout>
    );
  }
  return (
    <AuthLayout>
      <div><h1 className="mb-0">Welcome back</h1><p className="muted mb-0">Log in to your Rwamagana Mall account.</p></div>
      <GoogleButton />
      <form className="stack" onSubmit={login}>
        <label className="field">Email<input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required autoComplete="email" /></label>
        <label className="field"><span className="row between">Password <Link to="/forgot-password" className="link small">Forgot password?</Link></span><PasswordInput value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required autoComplete="current-password" /></label>
        {error && <div className="error-box">{error}{needsVerify && <> <button type="button" className="link" onClick={resend}>Send the link again</button></>}</div>}
        <button type="submit" className="btn block lg" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
      <p className="center mb-0">New here? <Link to={`/signup${params.get('next') ? `?next=${encodeURIComponent(params.get('next'))}` : ''}`} className="link">Create an account</Link></p>
    </AuthLayout>
  );
}

export function Signup() {
  useTitle('Create an account');
  const { user } = useApp();
  const done = useAfterLogin();
  const [f, setF] = useState({ username: '', email: '', phone: '', password: '' });
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState('');
  const [busy, setBusy] = useState(false);
  if (user && !busy) return <Navigate to="/" replace />;
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!agree) { setError('Please accept the terms to continue'); return; }
    setBusy(true);
    try {
      const r = await api('/auth/signup', { method: 'POST', body: f });
      if (r.needsVerification) { setSent(r.message); setBusy(false); return; }
      await done(r);
    } catch (err) { setError(err.message); setBusy(false); }
  };
  if (sent) {
    return (
      <AuthLayout>
        <div className="status-page"><img src="/img/email-check.png" alt="" /><h1>Check your inbox</h1><p className="muted">{sent}</p><Link to="/login" className="btn">Go to login</Link></div>
      </AuthLayout>
    );
  }
  return (
    <AuthLayout>
      <div><h1 className="mb-0">Join for free</h1><p className="muted mb-0">Create your Rwamagana Mall account in less than a minute.</p></div>
      <GoogleButton />
      <form className="stack" onSubmit={submit}>
        <label className="field">Full name<input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} required minLength={2} autoComplete="name" /></label>
        <label className="field">Email<input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required autoComplete="email" /></label>
        <label className="field">Phone number <span className="hint">Optional, for delivery</span><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="0788 123 456" inputMode="tel" autoComplete="tel" /></label>
        <label className="field">Password <span className="hint">At least 8 characters, with letters and numbers</span><PasswordInput value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required minLength={8} autoComplete="new-password" /></label>
        <label className="check small"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I accept the <Link to="/terms" className="link" target="_blank">terms &amp; conditions</Link></label>
        {error && <div className="error-box">{error}</div>}
        <button type="submit" className="btn block lg" disabled={busy}>{busy ? 'Creating your account…' : 'Create account'}</button>
      </form>
      <p className="center mb-0">Already have an account? <Link to="/login" className="link">Log in</Link></p>
    </AuthLayout>
  );
}

export function ForgotPassword() {
  useTitle('Forgot password');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try { setMsg(await api('/auth/forgot-password', { method: 'POST', body: { email } })); } catch (err) { setError(err.message); }
    setBusy(false);
  };
  return (
    <AuthLayout>
      <div><h1 className="mb-0">Forgot your password?</h1><p className="muted mb-0">Enter your email and we will send you a link to choose a new one.</p></div>
      {msg ? <div className={msg.mailDisabled ? 'info-box' : 'ok-box'}>{msg.message}</div> : (
        <form className="stack" onSubmit={submit}>
          <label className="field">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
          {error && <div className="error-box">{error}</div>}
          <button type="submit" className="btn block lg" disabled={busy}>Send reset link</button>
        </form>
      )}
      <p className="center mb-0"><Link to="/login" className="link">← Back to login</Link></p>
    </AuthLayout>
  );
}

export function ResetPassword() {
  useTitle('Choose a new password');
  const [params] = useSearchParams();
  const done = useAfterLogin();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (pw !== pw2) { setError('The two passwords are not the same'); return; }
    setBusy(true);
    try { await done(await api('/auth/reset-password', { method: 'POST', body: { token: params.get('token'), password: pw } })); } catch (err) { setError(err.message); setBusy(false); }
  };
  return (
    <AuthLayout>
      <div><h1 className="mb-0">Choose a new password</h1><p className="muted mb-0">At least 8 characters, with letters and numbers.</p></div>
      <form className="stack" onSubmit={submit}>
        <label className="field">New password<PasswordInput value={pw} onChange={(e) => setPw(e.target.value)} required minLength={8} autoComplete="new-password" /></label>
        <label className="field">Repeat new password<PasswordInput value={pw2} onChange={(e) => setPw2(e.target.value)} required minLength={8} autoComplete="new-password" /></label>
        {error && <div className="error-box">{error} <Link to="/forgot-password" className="link">Get a new link</Link></div>}
        <button type="submit" className="btn block lg" disabled={busy}>Save and log in</button>
      </form>
    </AuthLayout>
  );
}

export function VerifyEmail() {
  useTitle('Confirm email');
  const [params] = useSearchParams();
  const done = useAfterLogin();
  const [error, setError] = useState('');
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    api('/auth/verify-email', { method: 'POST', body: { token: params.get('token') } }).then(done).catch((e) => setError(e.message));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section className="section wrap">
      {error ? <div className="status-page"><img src="/img/payment-failed.jpg" alt="" /><h1>Link not valid</h1><p className="muted">{error}</p><Link to="/login" className="btn">Go to login</Link></div> : <Spinner />}
    </section>
  );
}

export function AuthCallback() {
  const done = useAfterLogin();
  const nav = useNavigate();
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
    if (!token) { nav('/login?error=google', { replace: true }); return; }
    localStorage.setItem('rm_token', JSON.stringify(token));
    api('/auth/me').then(({ user }) => done({ token, user })).catch(() => nav('/login?error=google', { replace: true }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <Spinner />;
}
