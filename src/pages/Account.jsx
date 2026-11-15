import { useState } from 'react';
import { NavLink, Route, Routes, Link } from 'react-router-dom';
import { FiUser, FiLock, FiShoppingBag, FiPackage, FiHeart, FiBell, FiCamera } from 'react-icons/fi';
import { api, avatarOf, dateOf, setToken, shrinkImage } from '../api.js';
import { useApp } from '../state/app.jsx';
import { PasswordInput, useTitle } from '../components/ui.jsx';

function Profile() {
  useTitle('My profile');
  const { user, setUser, toast, fail } = useApp();
  const [f, setF] = useState({ username: user.username, phone: user.phone || '', gender: user.gender || 'none' });
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { const r = await api('/account', { method: 'PATCH', body: f }); setUser(r.user); toast(r.message); } catch (err) { fail(err); }
    setBusy(false);
  };
  const photo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('image', await shrinkImage(file, 600));
    try { const r = await api('/account/avatar', { method: 'POST', body: fd }); setUser(r.user); toast(r.message); } catch (err) { fail(err); }
    e.target.value = '';
  };
  return (
    <div className="stack">
      <h1>My profile</h1>
      <div className="card row gap">
        <img className="avatar lg" src={avatarOf(user)} alt="" />
        <div className="grow"><b style={{ fontSize: '1.2rem' }}>{user.username}</b><div className="muted">{user.email}</div><div className="small muted">Member since {dateOf(user.created_at, { month: 'long', year: 'numeric' })} · <span className="pill">{user.role}</span></div></div>
        <label className="btn ghost"><FiCamera /> Change photo<input type="file" accept="image/*" hidden onChange={photo} /></label>
      </div>
      <form className="card form-grid" onSubmit={save}>
        <label className="field">Full name<input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} required minLength={2} /></label>
        <label className="field">Email<input value={user.email} disabled /></label>
        <label className="field">Phone number<input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="0788 123 456" inputMode="tel" /></label>
        <label className="field">Gender<select value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })}><option value="none">Prefer not to say</option><option value="female">Female</option><option value="male">Male</option></select></label>
        <div className="full"><button type="submit" className="btn" disabled={busy}>Save changes</button></div>
      </form>
    </div>
  );
}

function Security() {
  useTitle('Password & security');
  const { user, setUser, toast, fail, config, confirm, logout } = useApp();
  const [f, setF] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const change = async (e) => {
    e.preventDefault();
    if (f.newPassword !== f.confirm) { fail({ message: 'The two new passwords are not the same' }); return; }
    setBusy(true);
    try {
      const r = await api('/account/password', { method: 'PATCH', body: { currentPassword: f.currentPassword, newPassword: f.newPassword } });
      setToken(r.token);
      setUser(r.user);
      toast(r.message);
      setF({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) { fail(err); }
    setBusy(false);
  };
  const mfa = async () => {
    try { const r = await api('/account/mfa', { method: 'PATCH', body: { enabled: !user.mfa_enabled } }); setUser(r.user); toast(r.message); } catch (err) { fail(err); }
  };
  const everywhere = async () => {
    if (!(await confirm({ title: 'Log out on all devices?', text: 'You will need to log in again everywhere, including here.', ok: 'Log out everywhere', danger: true }))) return;
    try { const r = await api('/auth/logout-everywhere', { method: 'POST' }); toast(r.message); logout(); } catch (err) { fail(err); }
  };
  return (
    <div className="stack">
      <h1>Password &amp; security</h1>
      {user.must_update_password && <div className="info-box"><b>Please choose a new password</b> to keep your account safe.</div>}
      <form className="card stack" onSubmit={change} style={{ maxWidth: 560 }}>
        <h3 className="mb-0">{user.has_password ? 'Change password' : 'Create a password'}</h3>
        {!user.has_password && <p className="small muted mb-0">You signed in with Google. Add a password to also log in with your email.</p>}
        {user.has_password && <label className="field">Current password<PasswordInput value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} required autoComplete="current-password" /></label>}
        <label className="field">New password <span className="hint">At least 8 characters, with letters and numbers</span><PasswordInput value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} required minLength={8} autoComplete="new-password" /></label>
        <label className="field">Repeat new password<PasswordInput value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} required minLength={8} autoComplete="new-password" /></label>
        <div><button type="submit" className="btn" disabled={busy}>Save password</button></div>
      </form>
      <div className="card stack" style={{ maxWidth: 560 }}>
        <h3 className="mb-0">2-step login</h3>
        <p className="small muted mb-0">When it is on, we email you a 6-digit code each time you log in.</p>
        {config?.features?.email ? (
          <div className="row between gap"><span>{user.mfa_enabled ? <span className="pill green">On</span> : <span className="pill">Off</span>}</span><button type="button" className="btn ghost sm" onClick={mfa}>{user.mfa_enabled ? 'Turn off' : 'Turn on'}</button></div>
        ) : <p className="small mb-0">Available once the shop connects an email account.</p>}
      </div>
      <div className="card stack" style={{ maxWidth: 560 }}>
        <h3 className="mb-0">Devices</h3>
        <p className="small muted mb-0">Lost a phone or used a shared computer? Log out everywhere.</p>
        <div><button type="button" className="btn ghost sm" onClick={everywhere}>Log out on all devices</button></div>
      </div>
    </div>
  );
}

function Sell() {
  useTitle('Sell on Rwamagana Mall');
  const { user, setUser, toast, fail } = useApp();
  const [f, setF] = useState({ shop_name: user.shop_name || '', about: '', phone: user.phone || '' });
  const [busy, setBusy] = useState(false);
  if (user.role !== 'buyer') {
    return <div className="stack"><h1>Your shop</h1><div className="ok-box">Your account can sell. <Link to="/seller" className="link">Open your seller dashboard →</Link></div></div>;
  }
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { const r = await api('/account/seller-request', { method: 'POST', body: f }); setUser(r.user); toast(r.message); } catch (err) { fail(err); }
    setBusy(false);
  };
  return (
    <div className="stack">
      <h1>Sell on Rwamagana Mall</h1>
      <p className="muted">Reach customers in Rwamagana and across Rwanda. We handle the shop, payments and delivery requests; you add your products and prepare orders.</p>
      {user.seller_request ? (
        <div className="info-box"><b>Your request was sent.</b> Our team is reviewing it and will notify you soon.<div className="small mt">Shop name: {user.shop_name}</div></div>
      ) : (
        <form className="card form-grid" onSubmit={submit} style={{ maxWidth: 680 }}>
          <label className="field">Shop name<input value={f.shop_name} onChange={(e) => setF({ ...f, shop_name: e.target.value })} required minLength={2} placeholder="e.g. Uwase Fashion" /></label>
          <label className="field">Phone number<input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} required placeholder="0788 123 456" inputMode="tel" /></label>
          <label className="field full">What will you sell?<textarea value={f.about} onChange={(e) => setF({ ...f, about: e.target.value })} required minLength={10} maxLength={380} placeholder="e.g. Kitenge dresses and bags made in Rwamagana" /></label>
          <div className="full"><button type="submit" className="btn" disabled={busy}>Send my request</button></div>
        </form>
      )}
    </div>
  );
}

export default function Account() {
  const { user, unread } = useApp();
  return (
    <section className="section">
      <div className="wrap dash">
        <nav className="side-nav" aria-label="My account">
          <span className="title">My account</span>
          <NavLink to="/account" end><FiUser /> Profile</NavLink>
          <NavLink to="/account/security"><FiLock /> Password &amp; security</NavLink>
          <NavLink to="/orders"><FiPackage /> My orders</NavLink>
          <NavLink to="/wishlist"><FiHeart /> Wishlist</NavLink>
          <NavLink to="/notifications"><FiBell /> Notifications {unread.notifications > 0 && <span className="count">{unread.notifications}</span>}</NavLink>
          <NavLink to={user.role === 'buyer' ? '/account/sell' : '/seller'}><FiShoppingBag /> {user.role === 'buyer' ? 'Sell with us' : 'My shop'}</NavLink>
        </nav>
        <div>
          <Routes>
            <Route index element={<Profile />} />
            <Route path="security" element={<Security />} />
            <Route path="sell" element={<Sell />} />
          </Routes>
        </div>
      </div>
    </section>
  );
}
