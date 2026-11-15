import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  FiGrid, FiShoppingBag, FiUsers, FiBox, FiTag, FiMessageCircle, FiMail, FiSend, FiActivity, FiSettings, FiSearch, FiUserPlus, FiTrash2, FiEdit2, FiCheck, FiX, FiKey, FiInbox, FiShoppingCart,
} from 'react-icons/fi';
import { api, qs, rwf, dateOf, timeAgo, avatarOf } from '../api.js';
import { useApp } from '../state/app.jsx';
import { Spinner, Pagination, Empty, StatusPill, PayPill, METHOD_NAMES, CategoryIcon, CATEGORY_ICON_NAMES, useTitle } from '../components/ui.jsx';
import { StatsView, ProductsTable } from '../seller/Seller.jsx';
import { OrderView } from '../pages/OrderDetail.jsx';

function useQueryState() {
  const [params, setParams] = useSearchParams();
  const set = (k, v) => { const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); if (k !== 'page') n.delete('page'); setParams(n); };
  return [params, set, setParams];
}

function Dashboard() {
  useTitle('Admin dashboard');
  return (
    <StatsView admin>
      {(s) => (
        <>
          <div className="dash-head"><div><h1>Dashboard</h1><p className="muted mb-0">Everything happening at Rwamagana Mall.</p></div><Link to="/seller/products/new" className="btn">Add a product</Link></div>
          <div className="stats">
            <Link to="/admin/orders?payment=submitted" className={`stat ${s.todo.payments_to_confirm ? 'alert' : ''}`}><span className="k"><FiCheck /> Payments to confirm</span><span className="v">{s.todo.payments_to_confirm}</span></Link>
            <Link to="/admin/orders?status=Pending" className={`stat ${s.todo.pending ? 'alert' : ''}`}><span className="k"><FiShoppingBag /> New orders</span><span className="v">{s.todo.pending}</span><span className="tiny muted">{s.todo.in_progress} in progress</span></Link>
            <Link to="/admin/chat" className={`stat ${s.todo.unread_chat ? 'alert' : ''}`}><span className="k"><FiMessageCircle /> Unread chat</span><span className="v">{s.todo.unread_chat}</span></Link>
            <Link to="/admin/users?filter=requests" className={`stat ${s.people.seller_requests ? 'alert' : ''}`}><span className="k"><FiUserPlus /> Seller requests</span><span className="v">{s.people.seller_requests}</span></Link>
            <Link to="/admin/messages" className={`stat ${s.todo.messages ? 'alert' : ''}`}><span className="k"><FiInbox /> New messages</span><span className="v">{s.todo.messages}</span></Link>
            <Link to="/admin/users" className="stat"><span className="k"><FiUsers /> Customers</span><span className="v">{s.people.buyers}</span><span className="tiny muted">{s.people.sellers} sellers · {s.people.new_this_week} new this week</span></Link>
            <Link to="/admin/subscribers" className="stat"><span className="k"><FiMail /> Subscribers</span><span className="v">{s.todo.subscribers}</span></Link>
            <div className="stat"><span className="k"><FiShoppingCart /> Active carts</span><span className="v">{s.todo.active_carts}</span></div>
          </div>
        </>
      )}
    </StatsView>
  );
}

function Orders() {
  useTitle('Orders');
  const [params, set] = useQueryState();
  const { on } = useApp();
  const [data, setData] = useState(null);
  const [q, setQ] = useState(params.get('q') || '');
  useEffect(() => {
    const load = () => api(`/orders/all${qs(Object.fromEntries(params.entries()))}`).then(setData).catch(() => setData({ items: [] }));
    load();
    return on((ev) => ev === 'order' && load());
  }, [params, on]);
  return (
    <div className="stack">
      <div className="dash-head"><h1>Orders</h1>
        <form className="row gap-sm" onSubmit={(e) => { e.preventDefault(); set('q', q.trim()); }}><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order no., name, phone" style={{ width: 230 }} aria-label="Search orders" /><button type="submit" className="btn sm dark" aria-label="Search"><FiSearch /></button></form>
      </div>
      <div className="row gap between">
        <div className="tabs" style={{ margin: 0 }}>{[['', 'All'], ['Pending', 'New'], ['Processing', 'Preparing'], ['Shipped', 'On the way'], ['Delivered', 'Delivered'], ['Cancelled', 'Cancelled']].map(([k, l]) => <button type="button" key={k} className={(params.get('status') || '') === k ? 'on' : ''} onClick={() => set('status', k)}>{l}</button>)}</div>
        <select value={params.get('payment') || ''} onChange={(e) => set('payment', e.target.value)} style={{ width: 'auto' }} aria-label="Payment"><option value="">Any payment</option><option value="submitted">To confirm</option><option value="unpaid">Not paid</option><option value="paid">Paid</option><option value="refunded">Refunded</option></select>
      </div>
      {!data ? <Spinner /> : data.items.length === 0 ? <Empty title="No orders found" /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
            <tbody>
              {data.items.map((o) => (
                <tr key={o.id}>
                  <td><Link to={`/admin/orders/${o.id}`} className="link">#{o.order_no}</Link><div className="tiny muted">{timeAgo(o.created_at)}</div></td>
                  <td className="small">{o.buyer_name}<div className="tiny muted">{o.delivery_district}</div></td>
                  <td>{o.item_count}</td>
                  <td className="nowrap"><b>{rwf(o.total)}</b></td>
                  <td><div className="stack sm"><PayPill status={o.payment_status} /><span className="tiny muted">{METHOD_NAMES[o.payment_method]}{o.payment_ref ? ` · ${o.payment_ref}` : ''}</span></div></td>
                  <td><StatusPill status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onPage={(p) => set('page', String(p))} />}
    </div>
  );
}

function NewUser({ close, done }) {
  const { fail } = useApp();
  const [f, setF] = useState({ username: '', email: '', phone: '', role: 'seller', password: '' });
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { done(await api('/admin/users', { method: 'POST', body: f })); } catch (err) { fail(err); setBusy(false); }
  };
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <form className="modal" onSubmit={submit}>
        <h3>Create an account</h3>
        <label className="field">Name<input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} required minLength={2} /></label>
        <label className="field">Email<input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></label>
        <label className="field">Phone (optional)<input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
        <label className="field">Role<select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="buyer">Customer (buyer)</option><option value="seller">Seller</option><option value="admin">Admin</option></select></label>
        <label className="field">Password <span className="hint">Leave empty to create a temporary one</span><input value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} minLength={8} /></label>
        <div className="row end gap"><button type="button" className="btn ghost" onClick={close}>Cancel</button><button type="submit" className="btn" disabled={busy}>Create</button></div>
      </form>
    </div>
  );
}

function Users() {
  useTitle('Users');
  const { user: me, toast, fail, confirm } = useApp();
  const [params, set, setParams] = useQueryState();
  const [data, setData] = useState(null);
  const [q, setQ] = useState(params.get('q') || '');
  const [adding, setAdding] = useState(false);
  const tab = (k, v) => { const n = new URLSearchParams(); if (k) n.set(k, v); if (params.get('q')) n.set('q', params.get('q')); setParams(n); };
  const load = useCallback(() => api(`/admin/users${qs(Object.fromEntries(params.entries()))}`).then(setData).catch(() => setData({ items: [] })), [params]);
  useEffect(() => { load(); }, [load]);
  const patch = async (u, body, msg) => {
    try { const r = await api(`/admin/users/${u.id}`, { method: 'PATCH', body }); toast(msg || r.message); load(); } catch (e) { fail(e); }
  };
  const seller = async (u, approve) => {
    let body = { approve };
    if (!approve) { const reason = await confirm({ title: 'Decline this request?', ok: 'Decline', danger: true, input: true, placeholder: 'Reason for the person (optional)' }); if (!reason) return; body = { approve, reason: reason === true ? '' : reason }; }
    try { const r = await api(`/admin/users/${u.id}/seller`, { method: 'POST', body }); toast(r.message); load(); } catch (e) { fail(e); }
  };
  const showPassword = (r, u) => confirm({ title: 'Temporary password', text: `${r.emailed ? 'It was also emailed. ' : ''}Give this password to ${u.username || u.email}: ${r.tempPassword} — they will be asked to choose their own after logging in.`, ok: 'Done', cancel: 'Close' });
  const reset = async (u) => {
    if (!(await confirm({ title: `Reset ${u.username}'s password?`, text: 'A temporary password will be created and they will be logged out.', ok: 'Reset password' }))) return;
    try { const r = await api(`/admin/users/${u.id}/reset-password`, { method: 'POST' }); showPassword(r, u); } catch (e) { fail(e); }
  };
  const disable = async (u) => {
    if (u.disabled) return patch(u, { disabled: false }, `${u.username} can log in again`);
    const reason = await confirm({ title: `Disable ${u.username}?`, text: 'They will be logged out and cannot log in.', ok: 'Disable', danger: true, input: true, placeholder: 'Reason (optional)' });
    if (reason) patch(u, { disabled: true, reason: reason === true ? '' : reason }, `${u.username} is disabled`);
    return null;
  };
  const remove = async (u) => {
    if (!(await confirm({ title: `Delete ${u.username}?`, text: 'This cannot be undone.', ok: 'Delete', danger: true }))) return;
    try { const r = await api(`/admin/users/${u.id}`, { method: 'DELETE' }); toast(r.message); load(); } catch (e) { fail(e); }
  };
  return (
    <div className="stack">
      <div className="dash-head"><h1>Users</h1><button type="button" className="btn" onClick={() => setAdding(true)}><FiUserPlus /> New account</button></div>
      <div className="row gap between">
        <div className="tabs" style={{ margin: 0 }}>
          {[['', '', 'All'], ['role', 'buyer', 'Customers'], ['role', 'seller', 'Sellers'], ['role', 'admin', 'Admins'], ['filter', 'requests', `Seller requests${data?.requests ? ` (${data.requests})` : ''}`], ['filter', 'disabled', 'Disabled']].map(([k, v, l]) => (
            <button type="button" key={l} className={(k ? params.get(k) === v : !params.get('role') && !params.get('filter')) ? 'on' : ''} onClick={() => tab(k, v)}>{l}</button>
          ))}
        </div>
        <form className="row gap-sm" onSubmit={(e) => { e.preventDefault(); set('q', q.trim()); }}><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, phone" style={{ width: 220 }} aria-label="Search users" /><button type="submit" className="btn sm dark" aria-label="Search"><FiSearch /></button></form>
      </div>
      {!data ? <Spinner /> : data.items.length === 0 ? <Empty title="No users found" /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>User</th><th>Role</th><th>Orders</th><th>Joined</th><th /></tr></thead>
            <tbody>
              {data.items.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="cell-user"><img className="avatar" src={avatarOf(u)} alt="" /><span><b>{u.username}</b>{u.disabled && <> <span className="pill red">Disabled</span></>}<div className="tiny muted">{u.email}{u.phone && ` · ${u.phone}`}</div></span></div>
                    {u.seller_request && u.role === 'buyer' && (
                      <div className="info-box small mt"><b>Wants to sell as “{u.shop_name}”</b><div>{u.seller_request}</div>
                        <div className="row gap-sm mt"><button type="button" className="btn sm green" onClick={() => seller(u, true)}><FiCheck /> Approve</button><button type="button" className="btn sm ghost" onClick={() => seller(u, false)}><FiX /> Decline</button></div></div>
                    )}
                  </td>
                  <td>
                    <select value={u.role} disabled={u.id === me.id} onChange={(e) => patch(u, { role: e.target.value })} style={{ width: 'auto', minHeight: 34, padding: '4px 8px' }} aria-label="Role">
                      <option value="buyer">Buyer</option><option value="seller">Seller</option><option value="admin">Admin</option>
                    </select>
                    {u.role !== 'buyer' && u.products > 0 && <div className="tiny muted">{u.products} products</div>}
                  </td>
                  <td>{u.orders}</td>
                  <td className="small nowrap">{dateOf(u.created_at)}</td>
                  <td>
                    {u.id !== me.id && (
                      <div className="actions">
                        <button type="button" className="btn sm ghost" onClick={() => reset(u)} title="Reset password" aria-label="Reset password"><FiKey /></button>
                        <button type="button" className={`btn sm ${u.disabled ? 'green' : 'ghost'}`} onClick={() => disable(u)}>{u.disabled ? 'Enable' : 'Disable'}</button>
                        <button type="button" className="btn sm ghost" onClick={() => remove(u)} aria-label="Delete"><FiTrash2 /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onPage={(p) => set('page', String(p))} />}
      {adding && <NewUser close={() => setAdding(false)} done={(r) => { setAdding(false); load(); showPassword(r, r.user); }} />}
    </div>
  );
}

function Categories() {
  useTitle('Categories');
  const { toast, fail, confirm } = useApp();
  const [cats, setCats] = useState(null);
  const [edit, setEdit] = useState(null);
  const load = () => api('/categories').then(setCats).catch(() => setCats([]));
  useEffect(() => { load(); }, []);
  const save = async (e) => {
    e.preventDefault();
    try {
      const r = await api(edit.id ? `/admin/categories/${edit.id}` : '/admin/categories', { method: edit.id ? 'PATCH' : 'POST', body: edit });
      toast(r.message); setEdit(null); load();
    } catch (err) { fail(err); }
  };
  const remove = async (c) => {
    if (!(await confirm({ title: `Delete "${c.title}"?`, ok: 'Delete', danger: true }))) return;
    try { const r = await api(`/admin/categories/${c.id}`, { method: 'DELETE' }); toast(r.message); load(); } catch (err) { fail(err); }
  };
  if (!cats) return <Spinner />;
  return (
    <div className="stack">
      <div className="dash-head"><h1>Categories</h1><button type="button" className="btn" onClick={() => setEdit({ title: '', description: '', icon: 'tag', position: cats.length + 1 })}>New category</button></div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Category</th><th>Products</th><th>Order</th><th /></tr></thead>
          <tbody>
            {cats.map((c) => (
              <tr key={c.id}>
                <td><div className="cell-user"><span className="cat" style={{ padding: 0, border: 0 }}><span className="ic" style={{ width: 42, height: 42, fontSize: '1.2rem' }}><CategoryIcon name={c.icon} /></span></span><span><b>{c.title}</b><div className="tiny muted" style={{ maxWidth: 420 }}>{c.description}</div></span></div></td>
                <td><Link to={`/products?category=${c.slug}`} className="link">{c.products}</Link></td>
                <td>{c.position}</td>
                <td><div className="actions"><button type="button" className="btn sm ghost" onClick={() => setEdit({ ...c })} aria-label="Edit"><FiEdit2 /></button><button type="button" className="btn sm ghost" onClick={() => remove(c)} aria-label="Delete"><FiTrash2 /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && (
        <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && setEdit(null)}>
          <form className="modal" onSubmit={save}>
            <h3>{edit.id ? 'Edit category' : 'New category'}</h3>
            <label className="field">Name<input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} required minLength={2} /></label>
            <label className="field">Description<textarea rows={3} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></label>
            <div className="field">Icon<div className="row gap-sm">{CATEGORY_ICON_NAMES.map((n) => <button type="button" key={n} className={`btn sm ${edit.icon === n ? '' : 'ghost'}`} onClick={() => setEdit({ ...edit, icon: n })} aria-label={n}><CategoryIcon name={n} /></button>)}</div></div>
            <label className="field">Position in the list<input type="number" min={0} value={edit.position} onChange={(e) => setEdit({ ...edit, position: e.target.value })} /></label>
            <div className="row end gap"><button type="button" className="btn ghost" onClick={() => setEdit(null)}>Cancel</button><button type="submit" className="btn">Save</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

function Chat() {
  useTitle('Customer chat');
  const { room } = useParams();
  const nav = useNavigate();
  const { user, on, socket, fail, loadUnread, realtime } = useApp();
  const [threads, setThreads] = useState(null);
  const [thread, setThread] = useState(null);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const box = useRef(null);
  const loadThreads = useCallback(() => api('/chat/threads').then(setThreads).catch(() => setThreads([])), []);
  const loadThread = useCallback(() => { if (room) api(`/chat/threads/${room}`).then((t) => { setThread(t); loadThreads(); loadUnread(); }).catch(fail); }, [room, loadThreads, loadUnread, fail]);
  useEffect(() => { loadThreads(); }, [loadThreads]);
  useEffect(() => {
    if (realtime) return undefined;
    const t = setInterval(() => {
      if (document.hidden) return;
      loadThreads();
      if (room) api(`/chat/threads/${room}`).then((th) => setThread((cur) => (cur && th.messages.length !== cur.messages.length ? th : cur))).catch(() => {});
    }, 5000);
    return () => clearInterval(t);
  }, [realtime, room, loadThreads]);
  useEffect(() => { setThread(null); loadThread(); }, [loadThread]);
  useEffect(() => on((ev, d) => {
    if (ev === 'chat') { if (d.room === room) setThread((t) => (t && !t.messages.some((m) => m.id === d.id) ? { ...t, messages: [...t.messages, d] } : t)); loadThreads(); if (d.room === room) api(`/chat/threads/${room}`).then(() => loadUnread()).catch(() => {}); }
    if (ev === 'typing' && d.room === room) { setTyping(true); setTimeout(() => setTyping(false), 2500); }
  }), [on, room, loadThreads, loadUnread]);
  useEffect(() => { box.current?.scrollTo(0, box.current.scrollHeight); }, [thread, typing]);
  const send = async (e) => {
    e.preventDefault();
    const message = text.trim();
    if (!message) return;
    setText('');
    try { const m = await api(`/chat/threads/${room}`, { method: 'POST', body: { message } }); setThread((t) => (t.messages.some((x) => x.id === m.id) ? t : { ...t, messages: [...t.messages, m] })); } catch (err) { fail(err); setText(message); }
  };
  return (
    <div className="stack">
      <div className="dash-head"><h1>Customer chat</h1></div>
      <div className="chat-inbox">
        <div className="threads">
          {!threads ? <Spinner /> : threads.length === 0 ? <p className="muted center" style={{ padding: 24 }}>No conversations yet.</p> : threads.map((t) => (
            <div key={t.room} className={`thread ${t.room === room ? 'on' : ''}`} onClick={() => nav(`/admin/chat/${t.room}`)} onKeyDown={(e) => e.key === 'Enter' && nav(`/admin/chat/${t.room}`)} role="button" tabIndex={0}>
              <img className="avatar" src={avatarOf(t)} alt="" />
              <div className="grow" style={{ minWidth: 0 }}><div className="row between"><b className="small">{t.username}</b><span className="tiny muted">{timeAgo(t.created_at)}</span></div><div className="last">{t.message}</div></div>
              {t.unread > 0 && <span className="badge-dot" style={{ position: 'static' }}>{t.unread}</span>}
            </div>
          ))}
        </div>
        <div className="chat-pane">
          {!room ? <Empty title="Choose a conversation" text="Messages from customers appear on the left." /> : !thread ? <Spinner /> : (
            <>
              <div className="row gap" style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}><img className="avatar" src={avatarOf(thread.customer)} alt="" /><div className="grow"><b>{thread.customer.username}</b><div className="tiny muted">{thread.customer.email}{thread.customer.phone && ` · ${thread.customer.phone}`}</div></div><Link to={`/admin/users?q=${encodeURIComponent(thread.customer.email)}`} className="btn sm ghost">Profile</Link></div>
              <div className="chat-msgs" ref={box}>
                {thread.messages.map((m) => <div key={m.id} className={`msg ${m.from_staff ? 'mine' : ''}`}>{m.message}<small>{m.sender_id === user.id ? 'You' : m.sender_name} · {timeAgo(m.created_at)}</small></div>)}
                {typing && <div className="msg muted small">typing…</div>}
              </div>
              <form className="chat-form" onSubmit={send}><input value={text} onChange={(e) => { setText(e.target.value); socket?.emit('typing', room); }} placeholder="Write a reply…" aria-label="Reply" /><button type="submit" className="btn" aria-label="Send"><FiSend /></button></form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Messages() {
  useTitle('Messages');
  const { toast, fail, confirm } = useApp();
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const load = useCallback(() => api(`/admin/messages?page=${page}`).then(setData).catch(() => setData({ items: [] })), [page]);
  useEffect(() => { load(); }, [load]);
  const mark = async (m) => { await api(`/admin/messages/${m.id}`, { method: 'PATCH', body: { handled: !m.handled } }).catch(fail); load(); };
  const remove = async (m) => { if (await confirm({ title: 'Delete this message?', ok: 'Delete', danger: true })) { await api(`/admin/messages/${m.id}`, { method: 'DELETE' }).catch(fail); toast('Message deleted'); load(); } };
  if (!data) return <Spinner />;
  return (
    <div className="stack">
      <div className="dash-head"><h1>Contact messages</h1></div>
      {data.items.length === 0 ? <Empty title="No messages" text="Messages sent from the Contact page appear here." /> : data.items.map((m) => (
        <div className="card" key={m.id} style={{ opacity: m.handled ? 0.65 : 1 }}>
          <div className="row between gap"><div><b>{m.name}</b> <span className="small muted">{m.email}{m.phone && ` · ${m.phone}`}</span><div className="tiny muted">{timeAgo(m.created_at)}</div></div>
            <div className="row gap-sm">{m.handled ? <span className="pill green">Done</span> : <span className="pill amber">New</span>}<button type="button" className="btn sm ghost" onClick={() => mark(m)}>{m.handled ? 'Mark as new' : 'Mark as done'}</button><a className="btn sm ghost" href={`mailto:${m.email}`}>Reply</a><button type="button" className="btn sm ghost" onClick={() => remove(m)} aria-label="Delete"><FiTrash2 /></button></div></div>
          <p className="mt mb-0" style={{ whiteSpace: 'pre-wrap' }}>{m.message}</p>
        </div>
      ))}
      <Pagination page={data.page} pages={data.pages} onPage={setPage} />
    </div>
  );
}

function Subscribers() {
  useTitle('Newsletter');
  const { toast, fail, confirm } = useApp();
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [f, setF] = useState({ subject: '', body: '' });
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api(`/subscribers?page=${page}`).then(setData).catch(() => setData({ items: [], newsletters: [] })), [page]);
  useEffect(() => { load(); }, [load]);
  const send = async (e) => {
    e.preventDefault();
    if (!(await confirm({ title: 'Send the newsletter?', text: 'It will be emailed to every confirmed subscriber.', ok: 'Send now' }))) return;
    setBusy(true);
    try { const r = await api('/subscribers/send', { method: 'POST', body: f }); toast(r.message); setF({ subject: '', body: '' }); load(); } catch (err) { fail(err); }
    setBusy(false);
  };
  const remove = async (s) => { if (await confirm({ title: `Remove ${s.email}?`, ok: 'Remove', danger: true })) { await api(`/subscribers/${s.id}`, { method: 'DELETE' }).catch(fail); load(); } };
  if (!data) return <Spinner />;
  return (
    <div className="stack">
      <div className="dash-head"><h1>Newsletter</h1><span className="pill amber">{data.total} subscribers</span></div>
      <form className="card stack" onSubmit={send}>
        <h3 className="mb-0">Write a newsletter</h3>
        {!data.mail && <div className="info-box small">Sending needs an email account. It is not connected yet (see the README). You can still collect subscribers.</div>}
        <label className="field">Subject<input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} required minLength={3} placeholder="e.g. New kitenge collection has arrived!" /></label>
        <label className="field">Message<textarea rows={6} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} required minLength={10} /></label>
        <div><button type="submit" className="btn" disabled={busy || !data.mail}><FiSend /> Send to subscribers</button></div>
      </form>
      {data.newsletters?.length > 0 && <div className="card"><h3>Sent</h3>{data.newsletters.map((n) => <div key={n.id} className="row between small" style={{ padding: '6px 0', borderTop: '1px solid var(--line)' }}><b>{n.subject}</b><span className="muted">{n.sent_to} people · {dateOf(n.created_at)}</span></div>)}</div>}
      {data.items.length === 0 ? <Empty title="No subscribers yet" text="People join from the “HEAR FROM US.” form on the home page." /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Email</th><th>Name</th><th>Status</th><th>Joined</th><th /></tr></thead>
            <tbody>{data.items.map((s) => <tr key={s.id}><td>{s.email}</td><td>{[s.first_name, s.last_name].filter(Boolean).join(' ') || '–'}</td><td>{s.verified ? <span className="pill green">Confirmed</span> : <span className="pill">Waiting</span>}</td><td className="small">{dateOf(s.created_at)}</td><td><div className="actions"><button type="button" className="btn sm ghost" onClick={() => remove(s)} aria-label="Remove"><FiTrash2 /></button></div></td></tr>)}</tbody>
          </table>
        </div>
      )}
      <Pagination page={data.page} pages={data.pages} onPage={setPage} />
    </div>
  );
}

function Logs() {
  useTitle('Activity');
  const [params, set] = useQueryState();
  const [data, setData] = useState(null);
  const [q, setQ] = useState(params.get('q') || '');
  useEffect(() => { api(`/admin/logs${qs(Object.fromEntries(params.entries()))}`).then(setData).catch(() => setData({ items: [] })); }, [params]);
  return (
    <div className="stack">
      <div className="dash-head"><h1>Activity log</h1>
        <form className="row gap-sm" onSubmit={(e) => { e.preventDefault(); set('q', q.trim()); }}><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search activity" style={{ width: 220 }} aria-label="Search activity" /><button type="submit" className="btn sm dark" aria-label="Search"><FiSearch /></button></form>
      </div>
      {!data ? <Spinner /> : data.items.length === 0 ? <Empty title="Nothing found" /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>When</th><th>Who</th><th>What</th><th>Details</th><th>IP</th></tr></thead>
            <tbody>{data.items.map((l) => <tr key={l.id}><td className="small nowrap">{dateOf(l.created_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td><td className="small">{l.username || 'Visitor'}{l.role && <div className="tiny muted">{l.role}</div>}</td><td><span className="pill">{l.action}</span></td><td className="small">{l.detail}</td><td className="tiny muted">{l.ip}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onPage={(p) => set('page', String(p))} />}
    </div>
  );
}

const SETTING_FIELDS = [
  ['Shop', [['shop_name', 'Shop name'], ['tagline', 'Tagline', 'textarea'], ['announcement', 'Announcement bar (top of every page)', 'textarea']]],
  ['Contact', [['phone', 'Phone number'], ['whatsapp', 'WhatsApp number (with country code, e.g. 250788…)'], ['email', 'Email (contact messages are copied here)'], ['address', 'Address'], ['opening_hours', 'Opening hours']]],
  ['Mobile Money', [['momo_number', 'MTN MoMo number customers pay to'], ['momo_name', 'Name on the MoMo account'], ['airtel_number', 'Airtel Money number']]],
  ['Delivery', [['delivery_fee_local', 'Delivery fee in Rwamagana (RWF)', 'number'], ['delivery_fee_other', 'Delivery fee elsewhere in Rwanda (RWF)', 'number'], ['free_delivery_over', 'Free delivery in Rwamagana from (RWF, 0 = never)', 'number'], ['delivery_days_local', 'Days to deliver in Rwamagana', 'number'], ['delivery_days_other', 'Days to deliver elsewhere', 'number']]],
];

function Settings() {
  useTitle('Settings');
  const { toast, fail } = useApp();
  const [s, setS] = useState(null);
  const [features, setFeatures] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { api('/admin/settings').then((r) => { setS(r.settings); setFeatures(r.features); }).catch(fail); }, [fail]);
  if (!s) return <Spinner />;
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { const r = await api('/admin/settings', { method: 'PUT', body: s }); setS(r.settings); toast(`${r.message}. Refresh the page to see changes everywhere.`); } catch (err) { fail(err); }
    setBusy(false);
  };
  return (
    <form className="stack" onSubmit={save}>
      <div className="dash-head"><h1>Shop settings</h1><button type="submit" className="btn" disabled={busy}>Save settings</button></div>
      {SETTING_FIELDS.map(([title, fields]) => (
        <div className="card form-grid" key={title}>
          <h3 className="full mb-0">{title}</h3>
          {fields.map(([k, label, type]) => (
            <label key={k} className={`field ${type === 'textarea' ? 'full' : ''}`}>{label}
              {type === 'textarea' ? <textarea rows={2} value={s[k] || ''} onChange={(e) => setS({ ...s, [k]: e.target.value })} /> : <input type={type || 'text'} min={0} value={s[k] || ''} onChange={(e) => setS({ ...s, [k]: e.target.value })} />}
            </label>
          ))}
        </div>
      ))}
      <div className="card stack sm">
        <h3 className="mb-0">Connected services</h3>
        <div className="row gap">{[['email', 'Email (verification, receipts, newsletter)'], ['google', 'Google sign-in'], ['card', 'Card payments (Stripe)']].map(([k, l]) => <span key={k} className={`pill ${features[k] ? 'green' : ''}`}>{features[k] ? '✓' : '○'} {l}</span>)}</div>
        <p className="small muted mb-0">The shop works fully without them. To connect one later, see “Optional services” in the README.</p>
      </div>
      <div><button type="submit" className="btn lg" disabled={busy}>Save settings</button></div>
    </form>
  );
}

export default function Admin() {
  const { unread } = useApp();
  return (
    <section className="section">
      <div className="wrap dash">
        <nav className="side-nav" aria-label="Admin">
          <span className="title">Admin</span>
          <NavLink to="/admin" end><FiGrid /> Dashboard</NavLink>
          <NavLink to="/admin/orders"><FiShoppingBag /> Orders</NavLink>
          <NavLink to="/admin/products"><FiBox /> Products</NavLink>
          <NavLink to="/admin/categories"><FiTag /> Categories</NavLink>
          <NavLink to="/admin/users"><FiUsers /> Users</NavLink>
          <NavLink to="/admin/chat"><FiMessageCircle /> Chat {unread.chat > 0 && <span className="count">{unread.chat}</span>}</NavLink>
          <NavLink to="/admin/messages"><FiInbox /> Messages</NavLink>
          <NavLink to="/admin/subscribers"><FiMail /> Newsletter</NavLink>
          <NavLink to="/admin/logs"><FiActivity /> Activity</NavLink>
          <NavLink to="/admin/settings"><FiSettings /> Settings</NavLink>
        </nav>
        <div>
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:id" element={<OrderView admin />} />
            <Route path="products" element={<><div className="dash-head"><h1>All products</h1><Link to="/seller/products/new" className="btn">Add a product</Link></div><ProductsTable admin /></>} />
            <Route path="categories" element={<Categories />} />
            <Route path="users" element={<Users />} />
            <Route path="chat" element={<Chat />} />
            <Route path="chat/:room" element={<Chat />} />
            <Route path="messages" element={<Messages />} />
            <Route path="subscribers" element={<Subscribers />} />
            <Route path="logs" element={<Logs />} />
            <Route path="settings" element={<Settings />} />
          </Routes>
        </div>
      </div>
    </section>
  );
}
