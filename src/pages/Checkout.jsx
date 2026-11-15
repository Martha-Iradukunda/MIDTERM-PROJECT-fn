import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { FiLock, FiCreditCard, FiDollarSign } from 'react-icons/fi';
import { api, rwf, store } from '../api.js';
import { useApp } from '../state/app.jsx';
import { useTitle } from '../components/ui.jsx';

export const DISTRICTS = ['Rwamagana', 'Bugesera', 'Gatsibo', 'Kayonza', 'Kirehe', 'Ngoma', 'Nyagatare', 'Gasabo', 'Kicukiro', 'Nyarugenge', 'Burera', 'Gakenke', 'Gicumbi', 'Musanze', 'Rulindo', 'Gisagara', 'Huye', 'Kamonyi', 'Muhanga', 'Nyamagabe', 'Nyanza', 'Nyaruguru', 'Ruhango', 'Karongi', 'Ngororero', 'Nyabihu', 'Nyamasheke', 'Rubavu', 'Rusizi', 'Rutsiro'];

export default function Checkout() {
  useTitle('Checkout');
  const { user, cart, config, loadCart, fail, toast } = useApp();
  const nav = useNavigate();
  const saved = store.get('rm_delivery', {});
  const [d, setD] = useState({ name: saved.name || user.username, phone: saved.phone || user.phone || '', district: saved.district || 'Rwamagana', sector: saved.sector || '', street: saved.street || '', notes: '' });
  const [method, setMethod] = useState('momo');
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/orders/quote?district=${encodeURIComponent(d.district)}`).then(setQuote).catch(() => {});
  }, [d.district, cart.subtotal]);

  if (!cart.items.length && !busy) return <Navigate to="/cart" replace />;
  const set = (k) => (e) => setD({ ...d, [k]: e.target.value });
  const methods = [
    ['momo', <span className="logo mtn" key="l">MoMo</span>, 'MTN Mobile Money', 'Pay to our MoMo number after you order, then send us the transaction ID.'],
    ['airtel', <span className="logo airtel" key="l">airtel</span>, 'Airtel Money', 'Pay to our Airtel Money number, then send us the transaction ID.'],
    ['cash', <span className="logo cash" key="l"><FiDollarSign /></span>, 'Cash on delivery', 'Pay in cash (or MoMo) when your order arrives.'],
  ];
  if (config?.features?.card) methods.push(['card', <span className="logo card" key="l"><FiCreditCard /></span>, 'Visa / Mastercard', 'Pay securely by card.']);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await api('/orders', { method: 'POST', body: { delivery: d, payment_method: method } });
      store.set('rm_delivery', { name: d.name, phone: d.phone, district: d.district, sector: d.sector, street: d.street });
      await loadCart();
      if (r.payUrl) { window.location.assign(r.payUrl); return; }
      toast(r.message);
      nav(`/orders/${r.order.id}?new=1`, { replace: true });
    } catch (err) {
      setError(err.message);
      fail(err);
      setBusy(false);
    }
  };

  return (
    <section className="section">
      <div className="wrap">
        <div className="steps mb"><span><i>1</i>Cart</span>›<span className="on"><i>2</i>Delivery &amp; payment</span>›<span><i>3</i>Done</span></div>
        <h1>Checkout</h1>
        <form className="cart-layout" onSubmit={submit}>
          <div className="stack">
            <div className="card stack">
              <h3 className="mb-0">Where should we deliver?</h3>
              <div className="form-grid">
                <label className="field">Full name<input value={d.name} onChange={set('name')} required minLength={2} autoComplete="name" /></label>
                <label className="field">Phone number<input value={d.phone} onChange={set('phone')} required placeholder="0788 123 456" inputMode="tel" autoComplete="tel" /></label>
                <label className="field">District<select value={d.district} onChange={set('district')}>{DISTRICTS.map((x) => <option key={x}>{x}</option>)}</select></label>
                <label className="field">Sector<input value={d.sector} onChange={set('sector')} placeholder="e.g. Kigabiro" /></label>
                <label className="field full">Street, house or landmark<input value={d.street} onChange={set('street')} required minLength={3} placeholder="e.g. Near the bus park, blue gate" autoComplete="street-address" /></label>
                <label className="field full">Notes for the delivery (optional)<textarea rows={2} value={d.notes} onChange={set('notes')} placeholder="Best time to deliver, directions…" maxLength={400} /></label>
              </div>
            </div>
            <div className="card stack">
              <h3 className="mb-0">How will you pay?</h3>
              <div className="pay-options" role="radiogroup">
                {methods.map(([id, logo, name, help]) => (
                  <label key={id} className={`pay-option ${method === id ? 'on' : ''}`}>
                    <input type="radio" name="pay" value={id} checked={method === id} onChange={() => setMethod(id)} className="sr-only" />
                    {logo}
                    <span className="grow"><b>{name}</b><span className="small muted" style={{ display: 'block' }}>{help}</span></span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <aside className="card shadow summary">
            <h3>Your order</h3>
            <div className="stack sm">
              {cart.items.map((i) => (
                <div key={i.product_id} className="row gap" style={{ flexWrap: 'nowrap' }}>
                  <img src={i.image} alt="" width="48" height="48" style={{ borderRadius: 8, objectFit: 'cover', flex: 'none' }} />
                  <span className="small grow">{i.quantity} × {i.name}</span>
                  <b className="small nowrap">{rwf(i.price * i.quantity)}</b>
                </div>
              ))}
            </div>
            <div className="line mt"><span>Items</span><b>{rwf(quote?.subtotal ?? cart.subtotal)}</b></div>
            <div className="line"><span>Delivery to {d.district}</span><b>{quote ? (quote.delivery_fee ? rwf(quote.delivery_fee) : 'Free') : '…'}</b></div>
            <div className="line total"><span>Total</span><span>{rwf(quote?.total ?? cart.subtotal)}</span></div>
            {error && <div className="error-box small mt">{error}</div>}
            <button type="submit" className="btn block lg mt" disabled={busy}>{busy ? 'Placing your order…' : <><FiLock /> Place order</>}</button>
            <p className="tiny muted mt mb-0">By placing your order you agree to our <Link to="/terms" className="link">terms</Link>.</p>
          </aside>
        </form>
      </div>
    </section>
  );
}
