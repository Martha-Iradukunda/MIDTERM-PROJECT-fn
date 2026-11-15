import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { FiCheck, FiPackage, FiTruck, FiHome, FiPhone, FiMapPin, FiCopy, FiPrinter } from 'react-icons/fi';
import { api, dateOf, rwf } from '../api.js';
import { useApp } from '../state/app.jsx';
import { Spinner, Empty, StatusPill, PayPill, METHOD_NAMES, useTitle } from '../components/ui.jsx';

const STEPS = [['Pending', 'Ordered', FiCheck], ['Processing', 'Preparing', FiPackage], ['Shipped', 'On the way', FiTruck], ['Delivered', 'Delivered', FiHome]];

function Tracker({ status }) {
  const at = STEPS.findIndex(([s]) => s === status);
  return (
    <div className="tracker" aria-label={`Order status: ${status}`}>
      {STEPS.map(([s, label, Icon], i) => <div key={s} className={`st ${i <= at ? 'done' : ''}`}><i><Icon /></i>{label}</div>)}
    </div>
  );
}

function PayBox({ order, pay, onDone }) {
  const { toast, fail } = useApp();
  const [ref, setRef] = useState('');
  const [busy, setBusy] = useState(false);
  const isMomo = order.payment_method === 'momo';
  const number = isMomo ? pay.momo_number : pay.airtel_number;
  const copy = (t) => navigator.clipboard?.writeText(t).then(() => toast('Copied'));
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { const r = await api(`/orders/${order.id}/payment`, { method: 'POST', body: { reference: ref } }); toast(r.message); onDone(r.order); } catch (err) { fail(err); }
    setBusy(false);
  };
  const payCard = async () => {
    setBusy(true);
    try { const r = await api(`/orders/${order.id}/card`, { method: 'POST' }); window.location.assign(r.url); } catch (err) { fail(err); setBusy(false); }
  };
  if (order.payment_method === 'cash') {
    return <div className="pay-box"><b>Cash on delivery</b><p className="mb-0">Please have <b>{rwf(order.total)}</b> ready when your order arrives. You can also pay the driver with Mobile Money.</p></div>;
  }
  if (order.payment_method === 'card') {
    return <div className="pay-box stack sm"><b>Card payment</b><p className="mb-0">Your card payment was not completed yet.</p>{pay.card && <button type="button" className="btn" onClick={payCard} disabled={busy}>Pay {rwf(order.total)} by card</button>}</div>;
  }
  return (
    <div className="pay-box stack sm">
      <b>Pay {rwf(order.total)} with {METHOD_NAMES[order.payment_method]}</b>
      {order.payment_status === 'submitted' ? (
        <p className="mb-0">Thank you! We received your transaction ID <b>{order.payment_ref}</b> and are checking the payment. You will get a notification when it is confirmed.</p>
      ) : (
        <>
          {number ? (
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              <li>{isMomo ? <>Dial <span className="ussd">*182*1*1*{number.replace(/\s/g, '')}*{order.total}#</span> <button type="button" className="link small" onClick={() => copy(`*182*1*1*${number.replace(/\s/g, '')}*${order.total}#`)}><FiCopy /> copy</button></> : <>Dial <span className="ussd">*500#</span> and send money to <b>{number}</b></>}</li>
              <li>Send <b>{rwf(order.total)}</b> to <b>{number}</b>{pay.momo_name && isMomo && <> ({pay.momo_name})</>}.</li>
              <li>Enter the transaction ID from the confirmation SMS below.</li>
            </ol>
          ) : (
            <p className="mb-0">Call us on <b>{pay.phone}</b> to get our {METHOD_NAMES[order.payment_method]} number, then send the transaction ID below. Order number: <b>#{order.order_no}</b>.</p>
          )}
          <form className="row gap" onSubmit={submit}>
            <input className="grow" style={{ flex: '1 1 200px' }} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Transaction ID, e.g. 12345678901" required minLength={4} aria-label="Transaction ID" />
            <button type="submit" className="btn" disabled={busy}>I have paid</button>
          </form>
          {pay.card && <button type="button" className="link small" onClick={payCard}>Or pay by card instead</button>}
        </>
      )}
    </div>
  );
}

function AdminControls({ order, onDone }) {
  const { toast, fail, confirm } = useApp();
  const [status, setStatus] = useState(order.status === 'Cancelled' ? 'Pending' : order.status);
  const [note, setNote] = useState('');
  const [eta, setEta] = useState(order.expected_delivery || '');
  const [busy, setBusy] = useState(false);
  const run = async (path, body, method = 'POST') => {
    setBusy(true);
    try { const r = await api(`/orders/${order.id}${path}`, { method, body }); toast(r.message); onDone(r.order); setNote(''); } catch (err) { fail(err); }
    setBusy(false);
  };
  if (order.status === 'Cancelled') return <div className="card"><b>This order is cancelled.</b></div>;
  return (
    <div className="card stack">
      <h3 className="mb-0">Manage this order</h3>
      {order.payment_status !== 'paid' && (
        <div className="info-box stack sm">
          <b>{order.payment_status === 'submitted' ? `Customer says they paid. Transaction ID: ${order.payment_ref}` : 'Not paid yet'}</b>
          <div className="row gap">
            <button type="button" className="btn green sm" disabled={busy} onClick={async () => { if (await confirm({ title: 'Confirm payment?', text: `Confirm that ${rwf(order.total)} was received for order #${order.order_no}.`, ok: 'Payment received' })) run('/confirm-payment', {}); }}>Confirm payment received</button>
            {order.payment_status === 'submitted' && <button type="button" className="btn ghost sm" disabled={busy} onClick={async () => { const reason = await confirm({ title: 'Payment not found?', text: 'The customer will be asked to check the transaction ID.', ok: 'Send', input: true, placeholder: 'Reason (optional)' }); if (reason) run('/reject-payment', { reason: reason === true ? '' : reason }); }}>Payment not found</button>}
          </div>
        </div>
      )}
      <form className="form-grid" onSubmit={(e) => { e.preventDefault(); run('/status', { status, note, expected_delivery: eta || undefined }, 'PATCH'); }}>
        <label className="field">Status<select value={status} onChange={(e) => setStatus(e.target.value)}>{['Pending', 'Processing', 'Shipped', 'Delivered'].map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="field">Expected delivery<input type="date" value={eta} onChange={(e) => setEta(e.target.value)} /></label>
        <label className="field full">Message to the customer (optional)<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. The driver will call you before arriving" maxLength={300} /></label>
        <div className="full row gap"><button type="submit" className="btn" disabled={busy}>Update order</button>
          <button type="button" className="btn ghost" disabled={busy} onClick={async () => { const reason = await confirm({ title: 'Cancel this order?', text: 'Stock goes back to the shop and the customer is told.', ok: 'Cancel order', danger: true, input: true, placeholder: 'Reason for the customer (optional)' }); if (reason) run('/cancel', { reason: reason === true ? '' : reason }); }}>Cancel order</button>
        </div>
      </form>
    </div>
  );
}

export function OrderView({ admin = false }) {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const { user, on, toast, fail, confirm } = useApp();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(() => api(`/orders/${id}`).then(setData).catch(setError), [id]);
  useTitle(data ? `Order #${data.order.order_no}` : 'Order');

  useEffect(() => {
    load();
    return on((ev, d) => { if (ev === 'order' && d.id === id) load(); });
  }, [load, on, id]);
  // Coming back from the card payment page.
  useEffect(() => {
    const sid = params.get('paid');
    if (sid) {
      api(`/orders/${id}/card/confirm`, { method: 'POST', body: { session_id: sid } })
        .then((r) => { toast(r.message); setData((d) => (d ? { ...d, order: r.order } : d)); })
        .catch(fail)
        .finally(() => setParams({}, { replace: true }));
    }
    if (params.get('payment') === 'cancelled') { fail({ message: 'The card payment was cancelled. You can try again or choose another way to pay.' }); setParams({}, { replace: true }); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <div className="section wrap"><Empty title="Order not found" text={error.message}><Link to="/orders" className="btn">My orders</Link></Empty></div>;
  if (!data) return <Spinner />;
  const o = data.order;
  const mine = o.buyer_id === user.id;
  const setOrder = (order) => setData((d) => ({ ...d, order }));
  const cancel = async () => {
    const reason = await confirm({ title: 'Cancel this order?', text: 'You can only cancel before we start preparing it.', ok: 'Cancel order', cancel: 'Keep order', danger: true, input: true, placeholder: 'Why are you cancelling? (optional)' });
    if (!reason) return;
    try { const r = await api(`/orders/${o.id}/cancel`, { method: 'POST', body: { reason: reason === true ? '' : reason } }); toast(r.message); setOrder(r.order); } catch (err) { fail(err); }
  };
  const items = o.items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <div className="stack">
      {params.get('new') && mine && <div className="ok-box"><b>Thank you for your order!</b> We have received it and will contact you on {o.delivery_phone}.</div>}
      <div className="dash-head">
        <div>
          <div className="crumbs">{admin ? <Link to="/admin/orders">Orders</Link> : <Link to="/orders">My orders</Link>} / <span>#{o.order_no}</span></div>
          <h1>Order #{o.order_no}</h1>
          <div className="small muted">Placed {dateOf(o.created_at, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}{admin && <> by <b>{o.buyer_name}</b> ({o.buyer_email})</>}</div>
        </div>
        <div className="row gap-sm"><StatusPill status={o.status} /><PayPill status={o.payment_status} /><button type="button" className="btn ghost sm" onClick={() => window.print()}><FiPrinter /> Print</button></div>
      </div>
      {o.status !== 'Cancelled' && <div className="card"><Tracker status={o.status} />{o.expected_delivery && o.status !== 'Delivered' && <p className="center small muted mb-0 mt">Expected delivery: <b>{dateOf(o.expected_delivery, { weekday: 'long', day: 'numeric', month: 'long' })}</b></p>}</div>}
      {mine && o.status !== 'Cancelled' && o.payment_status !== 'paid' && <PayBox order={o} pay={data.pay} onDone={setOrder} />}
      {admin && <AdminControls order={o} onDone={setOrder} />}
      <div className="cart-layout">
        <div className="card">
          <h3>Items</h3>
          {o.items.map((i) => (
            <div className="cart-item" key={i.id}>
              {i.product_id ? <Link to={`/product/${i.product_id}`}><img src={i.image || '/img/empty.png'} alt="" /></Link> : <img src={i.image || '/img/empty.png'} alt="" />}
              <div><b>{i.name}</b><div className="small muted">Sold by {i.seller_shop || i.seller_name || 'Rwamagana Mall'}</div><div className="small">{i.quantity} × {rwf(i.price)}</div>
                {mine && o.status === 'Delivered' && i.product_id && <Link to={`/product/${i.product_id}#reviews`} className="link small">Write a review</Link>}
              </div>
              <b className="end">{rwf(i.price * i.quantity)}</b>
            </div>
          ))}
          <div className="summary" style={{ position: 'static' }}>
            <div className="line mt"><span>Items</span><b>{rwf(items)}</b></div>
            {o.subtotal === items && <div className="line"><span>Delivery</span><b>{o.delivery_fee ? rwf(o.delivery_fee) : 'Free'}</b></div>}
            {o.subtotal === items && <div className="line total"><span>Total</span><span>{rwf(o.total)}</span></div>}
          </div>
        </div>
        <aside className="stack">
          <div className="card stack sm">
            <h3 className="mb-0">Delivery</h3>
            <div><b>{o.delivery_name}</b></div>
            <div className="row gap-sm"><FiPhone className="amber-dark" /> {o.delivery_phone}</div>
            <div className="row gap-sm top"><FiMapPin className="amber-dark" style={{ marginTop: 4 }} /> <span className="grow">{o.delivery_street}{o.delivery_sector && `, ${o.delivery_sector}`}, {o.delivery_district}</span></div>
            {o.delivery_notes && <div className="small muted">“{o.delivery_notes}”</div>}
            <div className="small">Payment: <b>{METHOD_NAMES[o.payment_method]}</b>{o.payment_ref && <> · Ref {o.payment_ref}</>}</div>
          </div>
          <div className="card">
            <h3>History</h3>
            <ul className="timeline">
              {[...o.events].reverse().map((e, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <li key={i}><span className="dot" /><div><b>{e.status}</b><div className="small">{e.note}</div><div className="tiny muted">{dateOf(e.created_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}{admin && e.by_name && ` · ${e.by_name}`}</div></div></li>
              ))}
            </ul>
          </div>
          {mine && o.status === 'Pending' && o.payment_status !== 'paid' && <button type="button" className="btn ghost" onClick={cancel}>Cancel order</button>}
          {mine && <p className="small muted center mb-0">Questions about this order? Use the chat button or call {data.pay.phone}.</p>}
        </aside>
      </div>
    </div>
  );
}

export default function OrderDetail() {
  return <section className="section"><div className="wrap"><OrderView /></div></section>;
}
