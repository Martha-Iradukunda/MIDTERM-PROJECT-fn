import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiTrash2 } from 'react-icons/fi';
import { api, timeAgo } from '../api.js';
import { useApp } from '../state/app.jsx';
import { Empty, Pagination, Spinner, useTitle } from '../components/ui.jsx';

export default function Notifications() {
  useTitle('Notifications');
  const { setUnread, on, confirm } = useApp();
  const nav = useNavigate();
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const load = useCallback(() => api(`/notifications?page=${page}`).then((d) => { setData(d); setUnread((u) => ({ ...u, notifications: d.unread })); }).catch(() => {}), [page, setUnread]);
  useEffect(() => { load(); return on((ev) => ev === 'notification' && load()); }, [load, on]);
  if (!data) return <Spinner />;
  const open = async (n) => {
    if (!n.read) await api(`/notifications/${n.id}/read`, { method: 'PATCH' }).catch(() => {});
    if (n.link) nav(n.link); else load();
  };
  const readAll = async () => { await api('/notifications/read-all', { method: 'PATCH' }); load(); };
  const remove = async (id) => { await api(`/notifications/${id}`, { method: 'DELETE' }); load(); };
  const clear = async () => { if (await confirm({ title: 'Delete all notifications?', ok: 'Delete all', danger: true })) { await api('/notifications', { method: 'DELETE' }); load(); } };
  return (
    <section className="section">
      <div className="wrap" style={{ maxWidth: 820 }}>
        <div className="row between mb gap"><h1 className="mb-0">Notifications</h1>
          {data.items.length > 0 && <div className="row gap-sm">{data.unread > 0 && <button type="button" className="btn ghost sm" onClick={readAll}>Mark all as read</button>}<button type="button" className="btn ghost sm" onClick={clear}>Delete all</button></div>}
        </div>
        {data.items.length === 0 ? <Empty title="No notifications" text="Order updates, price drops and messages will appear here." /> : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {data.items.map((n) => (
              <div key={n.id} className={`notif ${n.read ? '' : 'unread'}`} style={{ alignItems: 'center' }}>
                <span className={`dot ${n.read ? 'read' : ''}`} style={{ marginTop: 0 }} />
                <div className="grow" onClick={() => open(n)} onKeyDown={(e) => e.key === 'Enter' && open(n)} role="button" tabIndex={0}>
                  <b>{n.type}</b><div>{n.message}</div><div className="tiny muted">{timeAgo(n.created_at)}</div>
                </div>
                <button type="button" className="icon-btn on-light" onClick={() => remove(n.id)} aria-label="Delete notification"><FiTrash2 /></button>
              </div>
            ))}
          </div>
        )}
        <Pagination page={data.page} pages={data.pages} onPage={setPage} />
      </div>
    </section>
  );
}
