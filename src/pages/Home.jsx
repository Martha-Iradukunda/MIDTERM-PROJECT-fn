import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiTruck, FiSmartphone, FiShield, FiMessageCircle, FiArrowRight, FiCheckCircle } from 'react-icons/fi';
import { api, rwf } from '../api.js';
import { useApp } from '../state/app.jsx';
import { ProductGrid, CategoryIcon, useTitle } from '../components/ui.jsx';

export function NewsletterForm() {
  const { toast, fail } = useApp();
  const [f, setF] = useState({ firstName: '', lastName: '', email: '' });
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api('/subscribers', { method: 'POST', body: f });
      toast(r.message);
      setF({ firstName: '', lastName: '', email: '' });
    } catch (err) { fail(err); }
    setBusy(false);
  };
  return (
    <form onSubmit={submit}>
      <input placeholder="First name" value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} aria-label="First name" />
      <input placeholder="Last name" value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} aria-label="Last name" />
      <input type="email" required placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} aria-label="Email" />
      <button type="submit" className="btn dark" disabled={busy}>Subscribe</button>
    </form>
  );
}

export default function Home() {
  useTitle('');
  const [recent, setRecent] = useState(null);
  const [popular, setPopular] = useState(null);
  const [deals, setDeals] = useState(null);
  const [cats, setCats] = useState([]);
  const [hero, setHero] = useState([]);
  useEffect(() => {
    api('/products?limit=8&sort=new').then((r) => setRecent(r.items)).catch(() => setRecent([]));
    api('/products?limit=4&sort=popular').then((r) => setPopular(r.items)).catch(() => setPopular([]));
    api('/products?limit=4&deals=1&sort=popular').then((r) => setDeals(r.items)).catch(() => setDeals([]));
    api('/categories').then(setCats).catch(() => {});
    api('/products?limit=12&featured=1&sort=popular').then((r) => setHero(r.items.filter((p) => /crafts|groceries/.test(p.category_slug)).slice(0, 2))).catch(() => {});
  }, []);

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div className="text">
            <span className="hero-tag"><i /> Rwamagana&apos;s online mall</span>
            <h1>Everything you love, <b>delivered to your door</b> anywhere in Rwanda.</h1>
            <p className="lead">Fashion, electronics, home essentials, fresh groceries and handmade Rwandan crafts from local sellers you can trust. Pay with MTN MoMo, Airtel Money or cash when it arrives.</p>
            <div className="row gap">
              <Link to="/products" className="btn lg">Start shopping</Link>
              <Link to="/signup" className="btn lg outline">Create a free account</Link>
            </div>
            <div className="chips">
              <span><FiCheckCircle /> Pay with MoMo or cash</span>
              <span><FiCheckCircle /> Delivery across Rwanda</span>
              <span><FiCheckCircle /> Real people on chat</span>
            </div>
          </div>
          <div className="hero-art">
            <div className="arch"><img src="/img/fashion.webp" alt="Woman in a classic beige suit and sunglasses" width="420" height="520" fetchpriority="high" /></div>
            <div className="seal"><div><span>MoMo</span>accepted</div></div>
            {hero[0] && <Link to={`/product/${hero[0].id}`} className="float f1"><img src={hero[0].images[0]} alt="" /><span>{hero[0].name}<b>{rwf(hero[0].price)}</b></span></Link>}
            {hero[1] && <Link to={`/product/${hero[1].id}`} className="float f2"><img src={hero[1].images[0]} alt="" /><span>{hero[1].name}<b>{rwf(hero[1].price)}</b></span></Link>}
          </div>
        </div>
      </section>

      <section className="section tight">
        <div className="wrap features">
          <div className="feature"><span className="ic"><FiTruck /></span><div><b>Fast delivery</b><span className="small muted">Same or next day in Rwamagana, 2–3 days elsewhere.</span></div></div>
          <div className="feature"><span className="ic"><FiSmartphone /></span><div><b>Mobile Money</b><span className="small muted">MTN MoMo, Airtel Money or cash on delivery.</span></div></div>
          <div className="feature"><span className="ic"><FiShield /></span><div><b>Trusted sellers</b><span className="small muted">Every seller is checked by our team.</span></div></div>
          <div className="feature"><span className="ic"><FiMessageCircle /></span><div><b>Help on chat</b><span className="small muted">Ask us anything, we answer fast.</span></div></div>
        </div>
      </section>

      {cats.length > 0 && (
        <section className="section soft-bg">
          <div className="wrap">
            <div className="row between mb"><h2 className="mb-0">Shop by category</h2><Link to="/products" className="link">All products <FiArrowRight style={{ verticalAlign: 'middle' }} /></Link></div>
            <div className="cats">
              {cats.map((c) => (
                <Link key={c.id} to={`/products?category=${c.slug}`} className="cat">
                  <span className="ic"><CategoryIcon name={c.icon} /></span>
                  {c.title}
                  <small>{c.products} item{c.products === 1 ? '' : 's'}</small>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="wrap">
          <div className="row between mb"><h2 className="mb-0">New arrivals</h2><Link to="/products?sort=new" className="link">See all <FiArrowRight style={{ verticalAlign: 'middle' }} /></Link></div>
          <ProductGrid items={recent} loading={!recent} count={8} />
        </div>
      </section>

      <section className="section tight">
        <div className="wrap promos">
          <Link to="/products?category=fashion" className="promo">
            <img src="/img/landing-phone.webp" alt="" loading="lazy" />
            <div className="in"><span className="eyebrow">New in: clothing</span><h3>Shop the new season from your phone</h3><span className="btn sm">Shop fashion</span></div>
          </Link>
          <Link to="/products?category=groceries" className="promo">
            <img src="/img/landing-fresh.webp" alt="" loading="lazy" />
            <div className="in"><span className="eyebrow">Fresh every day</span><h3>Groceries from Rwandan farms</h3><span className="btn sm">Shop groceries</span></div>
          </Link>
        </div>
      </section>

      {deals?.length > 0 && (
        <section className="section">
          <div className="wrap">
            <div className="row between mb"><h2 className="mb-0">Deals of the week</h2><Link to="/products?deals=1" className="link">All deals <FiArrowRight style={{ verticalAlign: 'middle' }} /></Link></div>
            <ProductGrid items={deals} />
          </div>
        </section>
      )}

      <section className="section soft-bg">
        <div className="wrap">
          <div className="row between mb"><h2 className="mb-0">Best sellers</h2><Link to="/products?sort=popular" className="link">See all <FiArrowRight style={{ verticalAlign: 'middle' }} /></Link></div>
          <ProductGrid items={popular} loading={!popular} count={4} />
        </div>
      </section>

      <section className="section newsletter">
        <div className="wrap">
          <h2>Stay in the loop</h2>
          <p className="muted">Be the first to know about new arrivals, weekly deals and local makers. One short email, no spam.</p>
          <NewsletterForm />
        </div>
      </section>
    </>
  );
}
