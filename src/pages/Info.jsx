import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiPhone, FiMapPin, FiClock, FiMail, FiMessageCircle } from 'react-icons/fi';
import { api } from '../api.js';
import { useApp } from '../state/app.jsx';
import { Spinner, useTitle } from '../components/ui.jsx';

function Page({ title, eyebrow, children, wide }) {
  useTitle(title);
  return (
    <>
      <div className="page-head"><div className="wrap">{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1 className="mb-0">{title}</h1></div></div>
      <section className="section"><div className="wrap" style={{ maxWidth: wide ? 1100 : 820 }}>{children}</div></section>
    </>
  );
}

export function About() {
  return (
    <Page title="About Us" eyebrow="Rwamagana Mall">
      <div className="promos mb-lg" style={{ marginBottom: 32 }}>
        <div className="promo" style={{ minHeight: 260 }}><img src="/img/landing-phone.webp" alt="" /><div className="in"><h3>Shopping made simple</h3></div></div>
        <div className="promo" style={{ minHeight: 260 }}><img src="/img/landing-fresh.webp" alt="" /><div className="in"><h3>Fresh and local</h3></div></div>
      </div>
      <p className="lead" style={{ fontSize: '1.15rem' }}>Rwamagana Mall is an online shop for the people of Rwamagana and the whole of Rwanda. We offer classic and modern fashion, together with electronics, home and kitchen goods, groceries, beauty products and crafts made by Rwandan artisans.</p>
      <p>We started as a team project to make shopping easier for families who do not have time to go from shop to shop. Today, local sellers list their products with us, and customers order from their phone and pay the way they already pay every day: MTN MoMo, Airtel Money or cash on delivery.</p>
      <h2 className="mt-lg">What we promise</h2>
      <div className="features" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="card"><h3>Real products</h3><p className="small muted mb-0">Every seller is checked by our team before they can sell.</p></div>
        <div className="card"><h3>Fair prices</h3><p className="small muted mb-0">Prices in Rwandan francs, with delivery costs shown before you pay.</p></div>
        <div className="card"><h3>Real help</h3><p className="small muted mb-0">Chat with us, call us or visit us in Rwamagana town.</p></div>
      </div>
      <div className="row gap mt-lg"><Link to="/products" className="btn">Start shopping</Link><Link to="/account/sell" className="btn ghost">Sell with us</Link></div>
    </Page>
  );
}

const FAQS = [
  ['How do I order?', 'Add products to your cart, press Checkout, enter where we should deliver and choose how you will pay. You will see your order and its progress in "My orders".'],
  ['How do I pay with MTN MoMo or Airtel Money?', 'After you order, your order page shows our Mobile Money number and the exact amount. Send the money, then type the transaction ID from the SMS. We confirm it and start preparing your order.'],
  ['Can I pay when the order arrives?', 'Yes. Choose "Cash on delivery" and pay the driver in cash or with Mobile Money when your order arrives.'],
  ['How much is delivery?', 'Delivery costs are shown at checkout before you pay. In Rwamagana, delivery is free for bigger orders.'],
  ['How long does delivery take?', 'Usually the same or next day in Rwamagana, and 2 to 3 days in other districts. Your order page shows the expected date.'],
  ['Can I cancel my order?', 'Yes, from your order page, as long as we have not started preparing it. After that, chat with us and we will help.'],
  ['What if a product is not what I expected?', 'Contact us within 3 days of delivery. If the product is damaged or not as described, we will replace it or give your money back.'],
  ['How can I sell on Rwamagana Mall?', 'Create an account, then open "Sell on Rwamagana Mall" in your account menu and tell us about your shop. Our team will review your request.'],
  ['I forgot my password', 'Use "Forgot password?" on the login page. If you do not get an email, chat with us or call us and we will help you.'],
];

export function Faq() {
  return (
    <Page title="Frequently asked questions" eyebrow="Help">
      <div className="stack">
        {FAQS.map(([q, a]) => (
          <details key={q} className="card">
            <summary className="strong" style={{ cursor: 'pointer' }}>{q}</summary>
            <p className="mt mb-0">{a}</p>
          </details>
        ))}
      </div>
      <p className="mt-lg">Still have a question? <Link to="/contact" className="link">Contact us</Link>.</p>
    </Page>
  );
}

export function Terms() {
  return (
    <Page title="Terms & Conditions" eyebrow="Help">
      <div className="stack">
        <p className="muted">Last updated: November 2026</p>
        <h3>1. Who we are</h3><p>Rwamagana Mall is an online marketplace based in Rwamagana, Eastern Province, Rwanda. By using this website you accept these terms.</p>
        <h3>2. Your account</h3><p>Keep your password private. You are responsible for orders placed from your account. We may disable accounts that misuse the shop.</p>
        <h3>3. Prices and payment</h3><p>All prices are in Rwandan francs (RWF). The total, including delivery, is shown before you place your order. You can pay with MTN MoMo, Airtel Money, cash on delivery, or by card when available. An order is prepared after the payment is confirmed, except for cash on delivery.</p>
        <h3>4. Delivery</h3><p>We deliver to the address you give us. Delivery dates are estimates. If we cannot reach you, we will contact you by phone to arrange a new time.</p>
        <h3>5. Cancellations and returns</h3><p>You can cancel an order before we start preparing it. If a product arrives damaged or is not as described, tell us within 3 days of delivery and we will replace it or refund you.</p>
        <h3>6. Sellers</h3><p>Sellers must describe their products honestly, keep stock up to date and prepare orders on time. We may remove products that break these rules.</p>
        <h3>7. Your data</h3><p>We use your details only to run your account, deliver your orders and, if you subscribe, send you our newsletter. We do not sell your data. You can ask us to delete your account at any time.</p>
        <h3>8. Contact</h3><p>Questions about these terms? <Link to="/contact" className="link">Contact us</Link>.</p>
      </div>
    </Page>
  );
}

export function Contact() {
  const { config, user, toast, fail } = useApp();
  const [f, setF] = useState({ name: user?.username || '', email: user?.email || '', phone: user?.phone || '', message: '' });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { const r = await api('/contact', { method: 'POST', body: f }); toast(r.message); setSent(true); } catch (err) { fail(err); }
    setBusy(false);
  };
  const wa = (config?.whatsapp || '').replace(/[^\d]/g, '');
  return (
    <Page title="Contact us" eyebrow="We are here to help" wide>
      <div className="two-col">
        <div className="stack">
          <div className="card row gap top"><FiMapPin size={22} className="amber-dark" /><div><b>Visit us</b><div>{config?.address}</div></div></div>
          <div className="card row gap top"><FiPhone size={22} className="amber-dark" /><div><b>Call us</b><div>{config?.phone}</div>{wa && <a className="link small" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a>}</div></div>
          {config?.email && <div className="card row gap top"><FiMail size={22} className="amber-dark" /><div><b>Email</b><div>{config.email}</div></div></div>}
          <div className="card row gap top"><FiClock size={22} className="amber-dark" /><div><b>Opening hours</b><div>{config?.opening_hours}</div></div></div>
          {user && <div className="card row gap top"><FiMessageCircle size={22} className="amber-dark" /><div><b>Live chat</b><div className="small muted">Use the chat button at the bottom right of the screen.</div></div></div>}
        </div>
        {sent ? <div className="card status-page"><img src="/img/email-check.png" alt="" /><h2>Message sent</h2><p className="muted">Thank you! We will get back to you soon.</p></div> : (
          <form className="card stack" onSubmit={submit}>
            <h3 className="mb-0">Send us a message</h3>
            <label className="field">Name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required minLength={2} /></label>
            <div className="form-grid">
              <label className="field">Email<input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></label>
              <label className="field">Phone (optional)<input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} inputMode="tel" /></label>
            </div>
            <label className="field">Message<textarea rows={5} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} required minLength={10} maxLength={3000} /></label>
            <div><button type="submit" className="btn" disabled={busy}>Send message</button></div>
          </form>
        )}
      </div>
    </Page>
  );
}

function TokenAction({ path, title, okImg = '/img/email-check.png' }) {
  useTitle(title);
  const [params] = useSearchParams();
  const [state, setState] = useState(null);
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    api(path, { method: 'POST', body: { token: params.get('token') } }).then((r) => setState({ ok: true, msg: r.message })).catch((e) => setState({ ok: false, msg: e.message }));
  }, [path, params]);
  if (!state) return <Spinner />;
  return (
    <section className="section wrap">
      <div className="status-page">
        <img src={state.ok ? okImg : '/img/payment-failed.jpg'} alt="" />
        <h1>{state.ok ? title : 'Link not valid'}</h1>
        <p className="muted">{state.msg}</p>
        <Link to="/products" className="btn">Continue shopping</Link>
      </div>
    </section>
  );
}
export const SubscribeConfirm = () => <TokenAction path="/subscribers/confirm" title="Subscription confirmed" />;
export const Unsubscribe = () => <TokenAction path="/subscribers/unsubscribe" title="Unsubscribed" />;

export function Credits() {
  const [list, setList] = useState(null);
  useEffect(() => { fetch('/catalogue/credits.json').then((r) => r.json()).then(setList).catch(() => setList([])); }, []);
  return (
    <Page title="Photo credits" eyebrow="Thank you">
      <p>The starting product photos come from Wikimedia Commons and are used under their free licences. Thank you to the photographers.</p>
      {!list ? <Spinner /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Photo</th><th>Author</th><th>Licence</th></tr></thead>
            <tbody>{list.map((c) => <tr key={c.image}><td><div className="cell-user"><img className="thumb" src={c.image} alt="" loading="lazy" /><a className="link small" href={c.source} target="_blank" rel="noopener noreferrer">{c.title}</a></div></td><td className="small">{c.author}</td><td className="small nowrap">{c.license}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </Page>
  );
}

export function NotFound() {
  useTitle('Page not found');
  return (
    <section className="section wrap">
      <div className="status-page">
        <img src="/img/empty.png" alt="" />
        <h1>Page not found</h1>
        <p className="muted">The page you are looking for does not exist or was moved.</p>
        <div className="row gap"><Link to="/" className="btn">Go home</Link><Link to="/products" className="btn ghost">Shop</Link></div>
      </div>
    </section>
  );
}
