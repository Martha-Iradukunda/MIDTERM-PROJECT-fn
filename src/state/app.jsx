import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { api, getToken, setToken, store } from '../api.js';

const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

const GUEST_CART = 'rm_guest_cart';
const emptyCart = { items: [], subtotal: 0, count: 0 };

function guestCartView(list) {
  const items = list.map((i) => ({ ...i, available: true }));
  return {
    items,
    subtotal: items.reduce((s, i) => s + i.price * Math.min(i.quantity, i.stock || i.quantity), 0),
    count: items.reduce((s, i) => s + i.quantity, 0),
  };
}

export function AppProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [cart, setCart] = useState(emptyCart);
  const [wish, setWish] = useState(() => new Set());
  const [unread, setUnread] = useState({ notifications: 0, chat: 0 });
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [socket, setSocket] = useState(null);
  const listeners = useRef(new Set());

  // ---------- toasts & confirm ----------
  const toast = useCallback((message, type = 'success') => {
    if (!message) return;
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t.slice(-3), { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), type === 'error' ? 6000 : 3800);
  }, []);
  const fail = useCallback((e) => toast(e?.message || 'Something went wrong', 'error'), [toast]);

  /** confirm({ title, text, ok, danger, input }) → Promise<false | true | string> */
  const confirm = useCallback((opts) => new Promise((resolve) => setDialog({ ...opts, resolve })), []);

  // ---------- data loaders ----------
  const loadCart = useCallback(async () => {
    if (!getToken()) return setCart(guestCartView(store.get(GUEST_CART, [])));
    try { setCart(await api('/cart')); } catch { /* ignore */ }
    return null;
  }, []);
  const loadWish = useCallback(async () => {
    if (!getToken()) return setWish(new Set());
    try { setWish(new Set(await api('/wishlist/ids'))); } catch { /* ignore */ }
    return null;
  }, []);
  const loadUnread = useCallback(async () => {
    if (!getToken()) return setUnread({ notifications: 0, chat: 0 });
    try {
      const [n, c] = await Promise.all([api('/notifications?limit=1'), api('/chat/unread')]);
      setUnread({ notifications: n.unread, chat: c.unread });
    } catch { /* ignore */ }
    return null;
  }, []);

  const afterLogin = useCallback(async () => {
    const guest = store.get(GUEST_CART, []);
    if (guest.length) {
      try {
        setCart(await api('/cart/merge', { method: 'POST', body: { items: guest.map((g) => ({ productId: g.product_id, quantity: g.quantity })) } }));
        store.set(GUEST_CART, null);
      } catch { /* ignore */ }
    } else await loadCart();
    loadWish();
    loadUnread();
  }, [loadCart, loadWish, loadUnread]);

  const signIn = useCallback(async ({ token, user: u }) => {
    setToken(token);
    setUser(u);
    await afterLogin();
  }, [afterLogin]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setWish(new Set());
    setUnread({ notifications: 0, chat: 0 });
    setCart(guestCartView(store.get(GUEST_CART, [])));
  }, []);

  // ---------- start-up ----------
  useEffect(() => {
    api('/config').then(setConfig).catch(() => setConfig({ features: {} }));
    (async () => {
      if (getToken()) {
        try {
          const { user: u } = await api('/auth/me');
          setUser(u);
          await afterLogin();
        } catch (e) {
          if (e.status === 401 || e.status === 403) logout();
        }
      } else loadCart();
      setReady(true);
    })();
    const onLogout = () => logout();
    window.addEventListener('rm:logout', onLogout);
    return () => window.removeEventListener('rm:logout', onLogout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- live updates ----------
  // With a long-running server, updates arrive instantly over a socket. On Netlify (no sockets),
  // the shop checks every few seconds and raises the same events.
  const fan = useCallback((ev, data) => listeners.current.forEach((fn) => fn(ev, data)), []);
  const realtime = config?.features?.realtime;
  useEffect(() => {
    if (!config || !realtime) return undefined;
    const s = io({ auth: { token: getToken() }, transports: ['websocket', 'polling'] });
    setSocket(s);
    s.on('notification', (n) => {
      setUnread((u) => ({ ...u, notifications: u.notifications + 1 }));
      toast(n.message, 'info');
    });
    s.on('chat', (m) => {
      if (m.sender_id !== user?.id) setUnread((u) => ({ ...u, chat: u.chat + 1 }));
    });
    ['chat', 'order', 'typing', 'notification'].forEach((ev) => s.on(ev, (data) => fan(ev, data)));
    return () => { s.disconnect(); setSocket(null); };
  }, [config, realtime, user?.id, toast, fan]);

  const seen = useRef({ notifications: null, chat: null });
  useEffect(() => {
    if (!config || realtime || !user) return undefined;
    seen.current = { notifications: null, chat: null };
    let stop = false;
    const tick = async () => {
      if (document.hidden) return;
      try {
        const [n, c] = await Promise.all([api('/notifications?limit=1'), api('/chat/unread')]);
        if (stop) return;
        const prev = seen.current;
        if (prev.notifications !== null && n.unread > prev.notifications && n.items[0]) {
          toast(n.items[0].message, 'info');
          fan('notification', n.items[0]);
          fan('order', {});
        }
        if (prev.chat !== null && c.unread > prev.chat) fan('chat', { poll: true });
        seen.current = { notifications: n.unread, chat: c.unread };
        setUnread({ notifications: n.unread, chat: c.unread });
      } catch { /* offline for a moment */ }
    };
    tick();
    const t = setInterval(tick, 12000);
    return () => { stop = true; clearInterval(t); };
  }, [config, realtime, user, toast, fan]);

  /** Subscribe to socket events: on((event, data) => …) → unsubscribe */
  const on = useCallback((fn) => {
    listeners.current.add(fn);
    return () => listeners.current.delete(fn);
  }, []);

  // ---------- cart ----------
  const addToCart = useCallback(async (product, quantity = 1) => {
    if (!getToken()) {
      const list = store.get(GUEST_CART, []);
      const found = list.find((i) => i.product_id === product.id);
      const nextQty = Math.min((found?.quantity || 0) + quantity, product.quantity);
      if (nextQty <= (found?.quantity || 0)) { toast(`Only ${product.quantity} in stock`, 'error'); return false; }
      const item = { product_id: product.id, quantity: nextQty, name: product.name, price: product.price, old_price: product.old_price, image: product.images?.[0], stock: product.quantity, seller_shop: product.seller_shop, seller_name: product.seller_name };
      const next = found ? list.map((i) => (i.product_id === product.id ? item : i)) : [...list, item];
      store.set(GUEST_CART, next);
      setCart(guestCartView(next));
      toast(`"${product.name}" was added to your cart`);
      return true;
    }
    try {
      const c = await api('/cart', { method: 'POST', body: { productId: product.id, quantity } });
      setCart(c);
      toast(c.message);
      return true;
    } catch (e) { fail(e); return false; }
  }, [toast, fail]);

  const setQuantity = useCallback(async (productId, quantity) => {
    if (!getToken()) {
      const next = store.get(GUEST_CART, []).map((i) => (i.product_id === productId ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock || quantity)) } : i));
      store.set(GUEST_CART, next);
      return setCart(guestCartView(next));
    }
    try { setCart(await api(`/cart/${productId}`, { method: 'PATCH', body: { quantity } })); } catch (e) { fail(e); }
    return null;
  }, [fail]);

  const removeFromCart = useCallback(async (productId) => {
    if (!getToken()) {
      const next = store.get(GUEST_CART, []).filter((i) => i.product_id !== productId);
      store.set(GUEST_CART, next);
      return setCart(guestCartView(next));
    }
    try { setCart(await api(`/cart/${productId}`, { method: 'DELETE' })); } catch (e) { fail(e); }
    return null;
  }, [fail]);

  const clearCart = useCallback(async () => {
    if (!getToken()) { store.set(GUEST_CART, null); return setCart(emptyCart); }
    try { setCart(await api('/cart', { method: 'DELETE' })); } catch (e) { fail(e); }
    return null;
  }, [fail]);

  // ---------- wishlist ----------
  const toggleWish = useCallback(async (product) => {
    if (!getToken()) { toast('Log in to save products to your wishlist', 'info'); return null; }
    const has = wish.has(product.id);
    try {
      const r = await api(`/wishlist/${product.id}`, { method: has ? 'DELETE' : 'POST' });
      setWish((w) => { const n = new Set(w); if (has) n.delete(product.id); else n.add(product.id); return n; });
      toast(r.message);
      return !has;
    } catch (e) { fail(e); return null; }
  }, [wish, toast, fail]);

  const value = useMemo(() => ({
    config, user, setUser, ready, signIn, logout,
    cart, loadCart, addToCart, setQuantity, removeFromCart, clearCart,
    wish, toggleWish, loadWish,
    unread, setUnread, loadUnread,
    socket, realtime, on, toast, fail, confirm,
  }), [realtime, config, user, ready, signIn, logout, cart, loadCart, addToCart, setQuantity, removeFromCart, clearCart, wish, toggleWish, loadWish, unread, loadUnread, socket, on, toast, fail, confirm]);

  return (
    <AppCtx.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>)}
      </div>
      {dialog && <Dialog {...dialog} close={(v) => { dialog.resolve(v); setDialog(null); }} />}
    </AppCtx.Provider>
  );
}

function Dialog({ title, text, ok = 'OK', cancel = 'Cancel', danger, input, placeholder, close }) {
  const [val, setVal] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus();
    const esc = (e) => e.key === 'Escape' && close(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [close]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && close(false)}>
      <form className="modal" role="dialog" aria-modal="true" aria-label={title} onSubmit={(e) => { e.preventDefault(); close(input ? val.trim() || true : true); }}>
        {title && <h3>{title}</h3>}
        {text && <p className="muted">{text}</p>}
        {input && <textarea ref={ref} rows={3} value={val} placeholder={placeholder} onChange={(e) => setVal(e.target.value)} />}
        <div className="row end gap">
          <button type="button" className="btn ghost" onClick={() => close(false)}>{cancel}</button>
          <button type="submit" ref={input ? null : ref} className={`btn ${danger ? 'danger' : ''}`}>{ok}</button>
        </div>
      </form>
    </div>
  );
}
