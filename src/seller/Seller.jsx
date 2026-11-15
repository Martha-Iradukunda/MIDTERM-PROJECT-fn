import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FiGrid, FiBox, FiPlus, FiShoppingBag, FiTrendingUp, FiPackage, FiAlertTriangle, FiEdit2, FiTrash2, FiEye, FiEyeOff, FiX, FiSearch, FiDollarSign, FiShield } from 'react-icons/fi';
import { api, qs, rwf, dateOf, shrinkImage } from '../api.js';
import { useApp } from '../state/app.jsx';
import { Spinner, Pagination, Empty, StatusPill, PayPill, useTitle } from '../components/ui.jsx';

// ---------- shared: chart, stats, product table ----------
export function BarChart({ series, valueKey = 'revenue', format = (v) => v }) {
  const [hover, setHover] = useState(null);
  if (!series?.length) return null;
  const W = 720;
  const H = 220;
  const pad = { l: 8, r: 8, t: 20, b: 26 };
  const max = Math.max(1, ...series.map((s) => Number(s[valueKey])));
  const bw = (W - pad.l - pad.r) / series.length;
  const every = Math.ceil(series.length / 8);
  return (
    <div style={{ position: 'relative' }}>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Sales chart">
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} />
        {series.map((s, i) => {
          const h = ((H - pad.t - pad.b) * Number(s[valueKey])) / max;
          return (
            <g key={s.day} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={pad.l + i * bw} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="transparent" />
              <rect className="b" x={pad.l + i * bw + bw * 0.15} y={H - pad.b - h} width={bw * 0.7} height={Math.max(h, Number(s[valueKey]) ? 2 : 0)} rx={Math.min(4, bw * 0.2)} />
              {i % every === 0 && <text x={pad.l + i * bw + bw / 2} y={H - 8} textAnchor="middle">{new Date(s.day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</text>}
            </g>
          );
        })}
      </svg>
      {hover !== null && <div className="pill dark" style={{ position: 'absolute', top: 0, left: `${((hover + 0.5) / series.length) * 100}%`, transform: 'translateX(-50%)' }}>{dateOf(series[hover].day)}: {format(series[hover][valueKey])} · {series[hover].orders} order{series[hover].orders === 1 ? '' : 's'}</div>}
    </div>
  );
}

export function StatsView({ admin = false, children }) {
  const [range, setRange] = useState(30);
  const [s, setS] = useState(null);
  useEffect(() => { api(`/stats?range=${range}${admin ? '' : '&mine=1'}`).then(setS).catch(() => setS(false)); }, [range, admin]);
  if (s === null) return <Spinner />;
  if (!s) return <Empty title="Could not load statistics" />;
  const base = admin ? '/admin' : '/seller';
  return (
    <div className="stack">
      {children?.(s)}
      <div className="stats">
        <div className="stat dark"><span className="k"><FiDollarSign /> Total sales</span><span className="v">{rwf(s.totals.revenue)}</span></div>
        <div className="stat"><span className="k"><FiShoppingBag /> Orders</span><span className="v">{s.totals.orders}</span></div>
        <div className="stat"><span className="k"><FiPackage /> Items sold</span><span className="v">{s.totals.items_sold}</span></div>
        <Link to={`${base}/products`} className="stat"><span className="k"><FiBox /> Products</span><span className="v">{s.products.total}</span><span className="tiny muted">{s.products.available} visible · {s.products.out_of_stock} sold out{s.products.expired ? ` · ${s.products.expired} expired` : ''}</span></Link>
      </div>
      <div className="card">
        <div className="row between gap mb"><h3 className="mb-0">Sales: {rwf(s.rangeTotals.revenue)} in the last {s.range} days</h3>
          <div className="tabs" style={{ margin: 0 }}>{[7, 30, 90, 365].map((r) => <button type="button" key={r} className={range === r ? 'on' : ''} onClick={() => setRange(r)}>{r === 365 ? '1 year' : `${r} days`}</button>)}</div>
        </div>
        <BarChart series={s.series} format={rwf} />
      </div>
      <div className="two-col">
        <div className="card">
          <h3>Best sellers</h3>
          {s.top.length === 0 ? <p className="muted mb-0">No sales yet.</p> : s.top.map((t) => (
            <div key={t.product_id || t.name} className="row gap" style={{ padding: '8px 0', borderTop: '1px solid var(--line)', flexWrap: 'nowrap' }}>
              <img src={t.image || '/img/empty.png'} alt="" width="44" height="44" style={{ borderRadius: 8, objectFit: 'cover' }} />
              <span className="grow small strong">{t.name}</span><span className="small nowrap">{t.sold} sold</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h3><FiAlertTriangle className="amber-dark" style={{ verticalAlign: 'middle' }} /> Low stock</h3>
          {s.lowStock.length === 0 ? <p className="muted mb-0">All products have enough stock.</p> : s.lowStock.map((p) => (
            <Link to={`/seller/products/${p.id}/edit`} key={p.id} className="row gap" style={{ padding: '8px 0', borderTop: '1px solid var(--line)', flexWrap: 'nowrap' }}>
              <img src={p.image || '/img/empty.png'} alt="" width="44" height="44" style={{ borderRadius: 8, objectFit: 'cover' }} />
              <span className="grow small strong">{p.name}</span><span className={`pill ${p.quantity ? 'amber' : 'red'}`}>{p.quantity ? `${p.quantity} left` : 'Sold out'}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProductsTable({ admin = false }) {
  const { toast, fail, confirm } = useApp();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [q, setQ] = useState(params.get('q') || '');
  const page = Number(params.get('page')) || 1;
  const state = params.get('state') || '';
  const load = () => api(`/products/mine${qs({ page, q: params.get('q'), state, all: admin ? '1' : '' })}`).then(setData).catch(() => setData({ items: [] }));
  useEffect(() => { load(); }, [params]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k, v) => { const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); if (k !== 'page') n.delete('page'); setParams(n); };
  const toggle = async (p) => {
    try { const r = await api(`/products/${p.id}/available`, { method: 'PATCH', body: { available: !p.available } }); toast(r.message); load(); } catch (e) { fail(e); }
  };
  const remove = async (p) => {
    if (!(await confirm({ title: `Delete "${p.name}"?`, text: 'It will be removed from the shop for good. Past orders keep their details.', ok: 'Delete', danger: true }))) return;
    try { const r = await api(`/products/${p.id}`, { method: 'DELETE' }); toast(r.message); load(); } catch (e) { fail(e); }
  };
  return (
    <div className="stack">
      <div className="row between gap">
        <div className="tabs" style={{ margin: 0 }}>
          {[['', 'All'], ['hidden', 'Hidden'], ['out', 'Sold out'], ['expired', 'Expired']].map(([k, l]) => <button type="button" key={k} className={state === k ? 'on' : ''} onClick={() => set('state', k)}>{l}</button>)}
        </div>
        <form className="row gap-sm" onSubmit={(e) => { e.preventDefault(); set('q', q.trim()); }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" style={{ width: 220 }} aria-label="Search products" />
          <button type="submit" className="btn sm dark" aria-label="Search"><FiSearch /></button>
        </form>
      </div>
      {!data ? <Spinner /> : data.items.length === 0 ? (
        <Empty title="No products here" text={admin ? 'Try another filter.' : 'Add your first product to start selling.'}>{!admin && <Link to="/seller/products/new" className="btn"><FiPlus /> Add a product</Link>}</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Sold</th><th>Status</th>{admin && <th>Seller</th>}<th /></tr></thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p.id}>
                  <td><Link to={`/product/${p.id}`} className="cell-user"><img className="thumb" src={p.images[0] || '/img/empty.png'} alt="" /><span><b>{p.name}</b><div className="tiny muted">{p.category_title}</div></span></Link></td>
                  <td className="nowrap">{rwf(p.price)}{p.old_price > p.price && <div className="tiny muted" style={{ textDecoration: 'line-through' }}>{rwf(p.old_price)}</div>}</td>
                  <td>{p.quantity === 0 ? <span className="pill red">0</span> : p.quantity <= 5 ? <span className="pill amber">{p.quantity}</span> : p.quantity}</td>
                  <td>{p.sold}</td>
                  <td>{p.exp_date && new Date(p.exp_date) < new Date(new Date().toDateString()) ? <span className="pill red">Expired</span> : p.available ? <span className="pill green">Visible</span> : <span className="pill">Hidden</span>}{p.featured && <> <span className="pill amber">Featured</span></>}</td>
                  {admin && <td className="small">{p.seller_shop || p.seller_name}</td>}
                  <td>
                    <div className="actions">
                      <button type="button" className="btn sm ghost" onClick={() => toggle(p)} title={p.available ? 'Hide from the shop' : 'Show in the shop'} aria-label={p.available ? 'Hide' : 'Show'}>{p.available ? <FiEyeOff /> : <FiEye />}</button>
                      <Link to={`/seller/products/${p.id}/edit`} className="btn sm ghost" aria-label="Edit"><FiEdit2 /></Link>
                      <button type="button" className="btn sm ghost" onClick={() => remove(p)} aria-label="Delete"><FiTrash2 /></button>
                    </div>
                  </td>
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

// ---------- product form ----------
function ProductForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user, toast, fail } = useApp();
  useTitle(id ? 'Edit product' : 'Add a product');
  const [cats, setCats] = useState([]);
  const [f, setF] = useState({ name: '', description: '', price: '', old_price: '', quantity: '1', category_id: '', exp_date: '', featured: false });
  const [keep, setKeep] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api('/categories').then(setCats).catch(() => {}); }, []);
  useEffect(() => {
    if (!id) return;
    api(`/products/${id}`).then(({ product: p }) => {
      setF({ name: p.name, description: p.description, price: String(p.price), old_price: p.old_price ? String(p.old_price) : '', quantity: String(p.quantity), category_id: String(p.category_id || ''), exp_date: p.exp_date || '', featured: p.featured });
      setKeep(p.images);
      setLoading(false);
    }).catch((e) => { fail(e); nav('/seller/products'); });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => files.forEach((x) => URL.revokeObjectURL(x.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Spinner />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const addFiles = (e) => {
    const list = [...e.target.files].slice(0, 8 - keep.length - files.length).map((file) => ({ file, url: URL.createObjectURL(file) }));
    setFiles([...files, ...list]);
    e.target.value = '';
  };
  const total = keep.length + files.length;
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!total) { setError('Please add at least one photo'); return; }
    setBusy(true);
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => { if (k !== 'featured' || user.role === 'admin') fd.append(k, typeof v === 'boolean' ? String(v) : v); });
    if (id) fd.append('keep', JSON.stringify(keep));
    for (const x of files) fd.append('images', await shrinkImage(x.file));
    try {
      const r = await api(id ? `/products/${id}` : '/products', { method: id ? 'PATCH' : 'POST', body: fd });
      toast(r.message);
      nav(`/product/${r.product.id}`);
    } catch (err) { setError(err.message); setBusy(false); }
  };
  return (
    <form className="stack" onSubmit={submit}>
      <div className="dash-head"><h1>{id ? 'Edit product' : 'Add a product'}</h1><Link to="/seller/products" className="btn ghost sm">Cancel</Link></div>
      <div className="card stack">
        <h3 className="mb-0">Photos <span className="hint">Up to 8. The first photo is shown in the shop.</span></h3>
        <div className="uploader">
          {keep.map((src, i) => (
            <div className="img" key={src}><img src={src} alt="" />{i === 0 && <span className="pill dark first">Main</span>}
              <button type="button" className="x" onClick={() => setKeep(keep.filter((k) => k !== src))} aria-label="Remove photo"><FiX /></button></div>
          ))}
          {files.map((x, i) => (
            <div className="img" key={x.url}><img src={x.url} alt="" />{!keep.length && i === 0 && <span className="pill dark first">Main</span>}
              <button type="button" className="x" onClick={() => setFiles(files.filter((y) => y !== x))} aria-label="Remove photo"><FiX /></button></div>
          ))}
          {total < 8 && <label className="add"><span><FiPlus size={24} /><br />Add photos</span><input type="file" accept="image/*" multiple hidden onChange={addFiles} /></label>}
        </div>
      </div>
      <div className="card form-grid">
        <label className="field full">Product name<input value={f.name} onChange={set('name')} required minLength={2} maxLength={160} placeholder="e.g. Kitenge maxi dress" /></label>
        <label className="field full">Description<textarea rows={5} value={f.description} onChange={set('description')} required minLength={10} maxLength={5000} placeholder="Material, size, colour, what is included…" /></label>
        <label className="field">Category<select value={f.category_id} onChange={set('category_id')} required><option value="">Choose a category</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
        <label className="field">Quantity in stock<input type="number" min={0} value={f.quantity} onChange={set('quantity')} required /></label>
        <label className="field">Price (RWF)<input type="number" min={1} value={f.price} onChange={set('price')} required /></label>
        <label className="field">Old price (RWF) <span className="hint">Optional, to show a discount</span><input type="number" min={0} value={f.old_price} onChange={set('old_price')} /></label>
        <label className="field">Expiry date <span className="hint">Optional, for food and cosmetics</span><input type="date" value={f.exp_date} onChange={set('exp_date')} /></label>
        {user.role === 'admin' && <label className="check" style={{ alignSelf: 'end', paddingBottom: 10 }}><input type="checkbox" checked={f.featured} onChange={set('featured')} /> Featured product</label>}
      </div>
      {error && <div className="error-box">{error}</div>}
      <div className="row gap"><button type="submit" className="btn lg" disabled={busy}>{busy ? 'Saving…' : id ? 'Save changes' : 'Add to the shop'}</button></div>
    </form>
  );
}

// ---------- sales (items to prepare) ----------
function Sales() {
  useTitle('My sales');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const { on } = useApp();
  useEffect(() => {
    const load = () => api(`/orders/sales${qs({ status, page })}`).then(setData).catch(() => setData({ items: [] }));
    load();
    return on((ev) => ev === 'order' && load());
  }, [status, page, on]);
  return (
    <div className="stack">
      <div className="dash-head"><h1>My sales</h1></div>
      <div className="tabs">{[['', 'All'], ['Pending', 'New'], ['Processing', 'Preparing'], ['Shipped', 'On the way'], ['Delivered', 'Delivered'], ['Cancelled', 'Cancelled']].map(([k, l]) => <button type="button" key={k} className={status === k ? 'on' : ''} onClick={() => { setStatus(k); setPage(1); }}>{l}</button>)}</div>
      {!data ? <Spinner /> : data.items.length === 0 ? <Empty title="No sales here yet" text="When customers order your products, they appear here." /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Item</th><th>Order</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {data.items.map((i) => (
                <tr key={i.id}>
                  <td><div className="cell-user"><img className="thumb" src={i.image || '/img/empty.png'} alt="" /><span><b>{i.quantity} × {i.name}</b><div className="tiny muted">{rwf(i.price)} each</div></span></div></td>
                  <td><Link to={`/orders/${i.order_id}`} className="link">#{i.order_no}</Link><div className="tiny muted">{dateOf(i.created_at)}</div></td>
                  <td className="small">{i.delivery_name}<div className="tiny muted">{i.delivery_phone} · {i.delivery_district}</div></td>
                  <td className="nowrap"><b>{rwf(i.price * i.quantity)}</b></td>
                  <td><div className="stack sm"><StatusPill status={i.status} /><PayPill status={i.payment_status} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onPage={setPage} />}
    </div>
  );
}

function Overview() {
  const { user } = useApp();
  useTitle('My shop');
  return (
    <StatsView>
      {() => (
        <div className="dash-head">
          <div><h1>Hello, {user.username.split(' ')[0]}</h1><p className="muted mb-0">Here is how {user.shop_name || 'your shop'} is doing.</p></div>
          <Link to="/seller/products/new" className="btn"><FiPlus /> Add a product</Link>
        </div>
      )}
    </StatsView>
  );
}

export default function Seller() {
  const { user } = useApp();
  return (
    <section className="section">
      <div className="wrap dash">
        <nav className="side-nav" aria-label="My shop">
          <span className="title">{user.shop_name || 'My shop'}</span>
          <NavLink to="/seller" end><FiGrid /> Overview</NavLink>
          <NavLink to="/seller/products" end><FiBox /> My products</NavLink>
          <NavLink to="/seller/products/new"><FiPlus /> Add a product</NavLink>
          <NavLink to="/seller/orders"><FiTrendingUp /> My sales</NavLink>
          {user.role === 'admin' && <NavLink to="/admin"><FiShield /> Admin</NavLink>}
        </nav>
        <div>
          <Routes>
            <Route index element={<Overview />} />
            <Route path="products" element={<><div className="dash-head"><h1>My products</h1><Link to="/seller/products/new" className="btn"><FiPlus /> Add a product</Link></div><ProductsTable /></>} />
            <Route path="products/new" element={<ProductForm key="new" />} />
            <Route path="products/:id/edit" element={<ProductForm key="edit" />} />
            <Route path="orders" element={<Sales />} />
          </Routes>
        </div>
      </div>
    </section>
  );
}
