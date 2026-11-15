import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FiSearch, FiShoppingCart, FiBell, FiHeart, FiUser, FiPackage, FiLogOut, FiGrid, FiShield, FiMenu, FiX, FiMessageCircle, FiSend, FiSettings, FiShoppingBag,
} from 'react-icons/fi';
import { FaFacebookF, FaInstagram, FaXTwitter, FaWhatsapp, FaGithub } from 'react-icons/fa6';
import { useApp } from '../state/app.jsx';
import { api, avatarOf, timeAgo } from '../api.js';

function useOutside(ref, close) {
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) close(); };
    const esc = (e) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', fn);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fn); document.removeEventListener('keydown', esc); };
  }, [ref, close]);
}

function SearchBox({ className = '' }) {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const loc = useLocation();
  const [q, setQ] = useState('');
  useEffect(() => { if (loc.pathname === '/products') setQ(params.get('q') || ''); }, [loc.pathname, params]);
  return (
    <form className={`search ${className}`} role="search" onSubmit={(e) => { e.preventDefault(); nav(`/products${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`); }}>
      <input type="search" placeholder="Search Product" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" />
      <button type="submit" aria-label="Search"><FiSearch /></button>
    </form>
  );
}

function NotificationBell() {
  const { unread, setUnread } = useApp();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null);
  const ref = useRef(null);
  useOutside(ref, () => setOpen(false));
  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      try { const r = await api('/notifications?limit=8'); setItems(r.items); } catch { setItems([]); }
    }
  };
  const openOne = async (n) => {
    setOpen(false);
    if (!n.read) {
      api(`/notifications/${n.id}/read`, { method: 'PATCH' }).catch(() => {});
      setUnread((u) => ({ ...u, notifications: Math.max(0, u.notifications - 1) }));
    }
    nav(n.link || '/notifications');
  };
  const readAll = async () => {
    await api('/notifications/read-all', { method: 'PATCH' }).catch(() => {});
    setItems((list) => list?.map((n) => ({ ...n, read: true })));
    setUnread((u) => ({ ...u, notifications: 0 }));
  };
  return (
    <div className="menu-wrap" ref={ref}>
      <button type="button" className="icon-btn" onClick={toggle} aria-label={`Notifications${unread.notifications ? ` (${unread.notifications} new)` : ''}`} aria-expanded={open}>
        <FiBell size={21} />
        {unread.notifications > 0 && <span className="badge-dot">{unread.notifications > 99 ? '99+' : unread.notifications}</span>}
      </button>
      {open && (
        <div className="dropdown notif-panel">
          <header><b>Notifications</b>{unread.notifications > 0 && <button type="button" className="link small" onClick={readAll}>Mark all as read</button>}</header>
          <div className="notif-list">
            {!items && <div className="spinner" />}
            {items?.length === 0 && <p className="muted center" style={{ padding: 24 }}>No notifications yet.</p>}
            {items?.map((n) => (
              <div key={n.id} className={`notif ${n.read ? '' : 'unread'}`} onClick={() => openOne(n)} onKeyDown={(e) => e.key === 'Enter' && openOne(n)} role="button" tabIndex={0}>
                <span className={`dot ${n.read ? 'read' : ''}`} />
                <div><b className="small">{n.type}</b><div className="small">{n.message}</div><div className="tiny muted">{timeAgo(n.created_at)}</div></div>
              </div>
            ))}
          </div>
          <Link to="/notifications" className="center small strong" style={{ padding: 12, borderTop: '1px solid var(--line)' }} onClick={() => setOpen(false)}>See all notifications</Link>
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { user, logout, confirm, toast } = useApp();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutside(ref, () => setOpen(false));
  const signOut = async () => {
    setOpen(false);
    if (await confirm({ title: 'Log out?', text: 'Are you sure you want to sign out?', ok: 'Log out' })) {
      logout();
      toast('Come back soon! You are logged out.');
      nav('/');
    }
  };
  const go = () => setOpen(false);
  return (
    <div className="menu-wrap" ref={ref}>
      <button type="button" className="icon-btn" onClick={() => setOpen((o) => !o)} aria-label="My account" aria-expanded={open}>
        <img className="avatar" src={avatarOf(user)} alt="" width="36" height="36" />
      </button>
      {open && (
        <div className="dropdown">
          <div className="who"><img className="avatar md" src={avatarOf(user)} alt="" /><div className="grow"><b>{user.username}</b><div className="tiny muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div></div></div>
          <Link to="/orders" onClick={go}><FiPackage /> My orders</Link>
          <Link to="/wishlist" onClick={go}><FiHeart /> My wishlist</Link>
          <Link to="/account" onClick={go}><FiUser /> My profile</Link>
          <Link to="/account/security" onClick={go}><FiSettings /> Password &amp; security</Link>
          {(user.role === 'seller' || user.role === 'admin') && <><hr /><Link to="/seller" onClick={go}><FiShoppingBag /> My shop</Link></>}
          {user.role === 'admin' && <Link to="/admin" onClick={go}><FiShield /> Admin dashboard</Link>}
          {user.role === 'buyer' && <><hr /><Link to="/account/sell" onClick={go}><FiGrid /> Sell on Rwamagana Mall</Link></>}
          <hr />
          <button type="button" className="item" onClick={signOut}><FiLogOut /> Log out</button>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const { user, cart, config, ready } = useApp();
  const [menu, setMenu] = useState(false);
  const loc = useLocation();
  useEffect(() => setMenu(false), [loc.pathname]);
  return (
    <>
      {config?.announcement && <div className="announce">{config.announcement}</div>}
      <header className="site-header">
        <div className="wrap bar">
          <Link to="/" className="brand" aria-label="Rwamagana Mall home">
            <img src="/img/logo.png" alt="" width="44" height="44" />
            <span className="name"><span className="r">R</span>wamagana Mall</span>
          </Link>
          <nav className="main-nav" aria-label="Main">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/products" className={() => (loc.pathname === '/products' && !loc.search.includes('deals=1') ? 'active' : '')}>Shop</NavLink>
            <NavLink to="/products?deals=1" className={() => (loc.pathname === '/products' && loc.search.includes('deals=1') ? 'active' : '')}>Deals</NavLink>
            <NavLink to="/contact">Contact</NavLink>
          </nav>
          <SearchBox className="desktop" />
          <div className="head-icons">
            {user && <NotificationBell />}
            {user && <Link to="/wishlist" className="icon-btn" aria-label="Wishlist"><FiHeart size={21} /></Link>}
            <Link to="/cart" className="icon-btn" aria-label={`Cart, ${cart.count} items`}>
              <FiShoppingCart size={22} />
              {cart.count > 0 && <span className="badge-dot">{cart.count > 99 ? '99+' : cart.count}</span>}
            </Link>
            {ready && (user ? <UserMenu /> : (
              <>
                <Link to="/login" className="login-link">Login</Link>
                <Link to="/signup" className="login-link signup">Sign up</Link>
              </>
            ))}
            <button type="button" className="icon-btn burger" onClick={() => setMenu((m) => !m)} aria-label="Menu" aria-expanded={menu}>{menu ? <FiX size={22} /> : <FiMenu size={22} />}</button>
          </div>
        </div>
        <div className="wrap mobile-search"><SearchBox /></div>
        {menu && (
          <nav className="mobile-nav" aria-label="Mobile">
            <Link to="/">Home</Link>
            <Link to="/products">Shop</Link>
            <Link to="/products?deals=1">Deals</Link>
            <Link to="/contact">Contact</Link>
            {!user && <Link to="/signup">Sign up</Link>}
          </nav>
        )}
      </header>
    </>
  );
}

export function Footer() {
  const { config } = useApp();
  const wa = (config?.whatsapp || '').replace(/[^\d]/g, '');
  return (
    <footer className="site-footer">
      <div className="wrap cols">
        <div>
          <Link to="/" className="brand" style={{ color: '#fff' }}><img src="/img/logo.png" alt="" width="44" height="44" /><span><span className="r">R</span>wamagana Mall</span></Link>
          <p className="small" style={{ marginTop: 14 }}>{config?.tagline || 'Your online mall in Rwamagana: shop local, pay with MoMo, get it delivered.'}</p>
          <div className="socials">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><FaFacebookF /></a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><FaInstagram /></a>
            <a href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)"><FaXTwitter /></a>
            {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><FaWhatsapp /></a>}
            <a href="https://github.com/Martha-Iradukunda" target="_blank" rel="noopener noreferrer" aria-label="GitHub"><FaGithub /></a>
          </div>
        </div>
        <div>
          <h4>Shop</h4>
          <ul>
            <li><Link to="/products">All products</Link></li>
            <li><Link to="/products?deals=1">Deals</Link></li>
            <li><Link to="/products?sort=popular">Best sellers</Link></li>
            <li><Link to="/account/sell">Sell with us</Link></li>
          </ul>
        </div>
        <div>
          <h4>Help</h4>
          <ul>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/faq">FAQ</Link></li>
            <li><Link to="/terms">Terms &amp; Conditions</Link></li>
            <li><Link to="/contact">Contact us</Link></li>
          </ul>
        </div>
        <div>
          <h4>Visit or call us</h4>
          <ul className="small">
            <li>{config?.address}</li>
            <li>{config?.phone}</li>
            {config?.email && <li>{config.email}</li>}
            <li>{config?.opening_hours}</li>
          </ul>
          <div className="pay-logos" aria-label="Payment methods"><span className="mtn">MTN MoMo</span><span className="airtel">Airtel Money</span><span>Cash on delivery</span>{config?.features?.card && <span>Visa / Mastercard</span>}</div>
        </div>
      </div>
      <div className="wrap bottom">
        <span>© {new Date().getFullYear()} Rwamagana Mall. All rights reserved.</span>
        <span><Link to="/credits">Photo credits</Link> · Powered by Martha Iradukunda</span>
      </div>
    </footer>
  );
}

/** Floating support chat for logged-in customers (admins answer from Admin › Chat). */
export function ChatWidget() {
  const { user, on, unread, setUnread, socket, fail, realtime } = useApp();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const box = useRef(null);
  const loc = useLocation();
  const hidden = !user || user.role === 'admin' || /^\/(admin|seller|login|signup)/.test(loc.pathname);

  useEffect(() => {
    if (!open || !user) return undefined;
    const load = () => api('/chat').then((m) => { setMsgs(m); setUnread((u) => ({ ...u, chat: 0 })); });
    load().catch(fail);
    const poll = realtime ? null : setInterval(() => { if (!document.hidden) load().catch(() => {}); }, 4000);
    const off = on((ev, data) => {
      if (ev === 'chat' && data.room === user.id) {
        setMsgs((list) => (list.some((x) => x.id === data.id) ? list : [...list, data]));
        api('/chat').catch(() => {});
        setUnread((u) => ({ ...u, chat: 0 }));
      }
      if (ev === 'typing') { setTyping(true); setTimeout(() => setTyping(false), 2500); }
    });
    return () => { off(); if (poll) clearInterval(poll); };
  }, [open, user, on, setUnread, fail, realtime]);
  useEffect(() => { box.current?.scrollTo(0, box.current.scrollHeight); }, [msgs, typing, open]);

  if (hidden) return null;
  const send = async (e) => {
    e.preventDefault();
    const message = text.trim();
    if (!message) return;
    setText('');
    try {
      const m = await api('/chat', { method: 'POST', body: { message } });
      setMsgs((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]));
    } catch (err) { fail(err); setText(message); }
  };
  return (
    <>
      {open && (
        <div className="chat-box" role="dialog" aria-label="Chat with Rwamagana Mall">
          <header>
            <img src="/img/logo.png" alt="" width="34" height="34" style={{ background: '#fff', borderRadius: '50%', padding: 3 }} />
            <div className="grow"><b>Rwamagana Mall</b><div className="tiny" style={{ color: '#bbb' }}>We usually reply within minutes</div></div>
            <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Close chat"><FiX /></button>
          </header>
          <div className="chat-msgs" ref={box}>
            <div className="msg">Hello {user.username.split(' ')[0]}! 👋 How can we help you today? Ask about a product, your order or delivery.</div>
            {msgs.map((m) => (
              <div key={m.id} className={`msg ${m.sender_id === user.id ? 'mine' : ''}`}>{m.message}<small>{m.sender_id === user.id ? 'You' : m.sender_name} · {timeAgo(m.created_at)}</small></div>
            ))}
            {typing && <div className="msg muted small">typing…</div>}
          </div>
          <form className="chat-form" onSubmit={send}>
            <input value={text} onChange={(e) => { setText(e.target.value); if (socket) socket.emit('typing', user.id); }} placeholder="Write a message…" aria-label="Message" maxLength={2000} />
            <button type="submit" className="btn" style={{ borderRadius: 99, padding: '0 16px' }} aria-label="Send"><FiSend /></button>
          </form>
        </div>
      )}
      <button type="button" className="chat-fab" onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close chat' : 'Chat with us'}>
        {open ? <FiX /> : <FiMessageCircle />}
        {!open && unread.chat > 0 && <span className="badge-dot">{unread.chat}</span>}
      </button>
    </>
  );
}
