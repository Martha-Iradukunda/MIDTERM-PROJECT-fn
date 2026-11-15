import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import {
  FiHeart, FiShoppingCart, FiStar, FiEye, FiEyeOff, FiMinus, FiPlus, FiTag, FiMonitor, FiHome, FiShoppingBag, FiGift, FiFeather,
} from 'react-icons/fi';
import { GiLargeDress, GiConverseShoe, GiWheat, GiLipstick, GiBasket } from 'react-icons/gi';
import { useApp } from '../state/app.jsx';
import { rwf } from '../api.js';

const CAT_ICONS = { dress: GiLargeDress, shoe: GiConverseShoe, tv: FiMonitor, home: FiHome, wheat: GiWheat, lipstick: GiLipstick, basket: GiBasket, bag: FiShoppingBag, gift: FiGift, feather: FiFeather, tag: FiTag };
export const CATEGORY_ICON_NAMES = Object.keys(CAT_ICONS);
export function CategoryIcon({ name, ...rest }) {
  const I = CAT_ICONS[name] || FiTag;
  return <I aria-hidden="true" {...rest} />;
}

export function Stars({ value = 0, size = 15 }) {
  return (
    <span className="stars" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => <FiStar key={i} size={size} className={value >= i - 0.25 ? '' : 'off'} fill={value >= i - 0.25 ? 'currentColor' : 'none'} />)}
    </span>
  );
}

export function Price({ price, old }) {
  return <span className="price">{rwf(price)}{old > price && <span className="old">{rwf(old)}</span>}</span>;
}

export function ProductCard({ p }) {
  const { addToCart, toggleWish, wish } = useApp();
  const soldOut = p.quantity === 0;
  const off = p.old_price > p.price ? Math.round((1 - p.price / p.old_price) * 100) : 0;
  const on = wish.has(p.id);
  return (
    <article className="pcard">
      <Link to={`/product/${p.id}`} className="media" aria-label={p.name}>
        <img src={p.images?.[0] || '/img/empty.png'} alt={p.name} loading="lazy" width="400" height="400" />
      </Link>
      <div className="tags">
        {off > 0 && <span className="pill red">-{off}%</span>}
        {soldOut && <span className="pill dark">Sold out</span>}
        {!soldOut && p.quantity <= 5 && <span className="pill amber">Only {p.quantity} left</span>}
      </div>
      <button type="button" className={`wish ${on ? 'on' : ''}`} onClick={() => toggleWish(p)} aria-label={on ? 'Remove from wishlist' : 'Save to wishlist'} aria-pressed={on}>
        <FiHeart fill={on ? 'currentColor' : 'none'} />
      </button>
      <div className="body">
        {p.category_title && <span className="cat-name">{p.category_title}</span>}
        <Link to={`/product/${p.id}`} className="name">{p.name}</Link>
        {p.reviews_count > 0 && <span className="rating-line"><Stars value={p.rating} size={13} /> ({p.reviews_count})</span>}
        <div className="foot">
          <Price price={p.price} old={p.old_price} />
          <button type="button" className="add" disabled={soldOut} onClick={() => addToCart(p, 1)} aria-label={`Add ${p.name} to cart`} title={soldOut ? 'Sold out' : 'Add to cart'}>
            <FiShoppingCart />
          </button>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ items, loading, count = 8, empty }) {
  if (loading && !items?.length) {
    return (
      <div className="grid-products">
        {Array.from({ length: count }).map((_, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={i} className="pcard"><div className="media skel" /><div className="body"><div className="skel" style={{ height: 14, width: '50%' }} /><div className="skel" style={{ height: 18 }} /><div className="skel" style={{ height: 22, width: '60%', marginTop: 10 }} /></div></div>
        ))}
      </div>
    );
  }
  if (!items?.length) return empty || <Empty title="No results found..." text="Try another search or category." />;
  return <div className="grid-products">{items.map((p) => <ProductCard key={p.id} p={p} />)}</div>;
}

export function Empty({ title, text, children, img = '/img/empty.png' }) {
  return (
    <div className="empty">
      <img src={img} alt="" width="170" height="170" />
      <h3>{title}</h3>
      {text && <p className="muted">{text}</p>}
      {children}
    </div>
  );
}

export const Spinner = () => <div className="spinner" role="status" aria-label="Loading" />;

export function Pagination({ page, pages, onPage }) {
  if (!pages || pages <= 1) return null;
  const list = [];
  for (let i = 1; i <= pages; i += 1) if (i === 1 || i === pages || Math.abs(i - page) <= 1) list.push(i);
  const withGaps = [];
  list.forEach((n, i) => { if (i && n - list[i - 1] > 1) withGaps.push(`gap${n}`); withGaps.push(n); });
  return (
    <nav className="pagination" aria-label="Pages">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">‹</button>
      {withGaps.map((n) => (typeof n === 'string' ? <button type="button" key={n} disabled>…</button> : <button type="button" key={n} className={n === page ? 'on' : ''} onClick={() => onPage(n)} aria-current={n === page ? 'page' : undefined}>{n}</button>))}
      <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">›</button>
    </nav>
  );
}

export function PasswordInput(props) {
  const [show, setShow] = useState(false);
  return (
    <div className="password-wrap">
      <input {...props} type={show ? 'text' : 'password'} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <FiEyeOff /> : <FiEye />}</button>
    </div>
  );
}

export function Qty({ value, max = 999, onChange, small }) {
  return (
    <div className={`qty ${small ? 'sm' : ''}`}>
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} aria-label="Less"><FiMinus /></button>
      <input type="number" value={value} min={1} max={max} aria-label="Quantity" onChange={(e) => { const n = Number.parseInt(e.target.value, 10); if (n >= 1) onChange(Math.min(n, max)); }} />
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="More"><FiPlus /></button>
    </div>
  );
}

const STATUS_COLORS = { Pending: 'amber', Processing: 'blue', Shipped: 'blue', Delivered: 'green', Cancelled: 'red' };
export const StatusPill = ({ status }) => <span className={`pill ${STATUS_COLORS[status] || ''}`}>{status}</span>;
const PAY = { unpaid: ['Not paid', 'red'], submitted: ['Checking payment', 'amber'], paid: ['Paid', 'green'], refunded: ['Refunded', ''] };
export const PayPill = ({ status }) => <span className={`pill ${PAY[status]?.[1] || ''}`}>{PAY[status]?.[0] || status}</span>;
export const METHOD_NAMES = { momo: 'MTN MoMo', airtel: 'Airtel Money', cash: 'Cash on delivery', card: 'Card' };

/** Only render children for logged-in users (and optional roles). */
export function Guard({ roles, children }) {
  const { user, ready } = useApp();
  const loc = useLocation();
  if (!ready) return <Spinner />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Rwamagana Mall` : 'Rwamagana Mall · Shop online in Rwanda';
  }, [title]);
}
