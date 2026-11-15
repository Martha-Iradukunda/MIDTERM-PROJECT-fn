import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, dateOf, rwf } from '../api.js';
import { useApp } from '../state/app.jsx';
import { Empty, Pagination, Spinner, StatusPill, PayPill, METHOD_NAMES, useTitle } from '../components/ui.jsx';

export default function Orders() {
  useTitle('My orders');
  const { on } = useApp();
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  useEffect(() => {
    const load = () => api(`/orders?page=${page}`).then(setData).catch(() => setData({ items: [] }));
    load();
    return on((ev) => { if (ev === 'order') load(); });
  }, [page, on]);
  if (!data) return <Spinner />;
  return (
    <section className="section">
      <div className="wrap" style={{ maxWidth: 900 }}>
        <h1>My orders</h1>
        {data.items.length === 0 ? (
          <Empty title="No orders yet" text="When you buy something, you can follow it here."><Link to="/products" className="btn">Start shopping</Link></Empty>
        ) : (
          <div className="stack">
            {data.items.map((o) => (
              <Link to={`/orders/${o.id}`} className="card order-card" key={o.id}>
                <div className="row between gap">
                  <div><b>Order #{o.order_no}</b><div className="small muted">{dateOf(o.created_at)} · {METHOD_NAMES[o.payment_method]}</div></div>
                  <div className="row gap-sm"><StatusPill status={o.status} /><PayPill status={o.payment_status} /></div>
                </div>
                <div className="row between gap">
                  <div className="thumbs">{(o.items || []).slice(0, 5).map((i) => <img key={i.product_id + i.name} src={i.image || '/img/empty.png'} alt={i.name} title={`${i.quantity} × ${i.name}`} />)}{o.items?.length > 5 && <span className="pill">+{o.items.length - 5}</span>}</div>
                  <div className="right"><b>{rwf(o.total)}</b>{o.status !== 'Delivered' && o.status !== 'Cancelled' && o.expected_delivery && <div className="tiny muted">Expected {dateOf(o.expected_delivery)}</div>}</div>
                </div>
              </Link>
            ))}
            <Pagination page={data.page} pages={data.pages} onPage={setPage} />
          </div>
        )}
      </div>
    </section>
  );
}
