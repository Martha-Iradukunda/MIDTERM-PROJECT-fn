import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiHeart, FiShoppingCart, FiTruck, FiSmartphone, FiRefreshCw, FiShoppingBag, FiEdit2, FiStar, FiTrash2 } from 'react-icons/fi';
import { api, avatarOf, dateOf, rwf } from '../api.js';
import { useApp } from '../state/app.jsx';
import { Price, Stars, Qty, ProductGrid, Spinner, Empty, Pagination, useTitle } from '../components/ui.jsx';

function Reviews({ product, myReview, canReview, onChange }) {
  const { user, toast, fail, confirm } = useApp();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ rating: myReview?.rating || 0, feedback: myReview?.feedback || '' });
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api(`/products/${product.id}/reviews?page=${page}`).then(setData).catch(() => setData({ items: [], counts: {}, average: 0, total: 0 })), [product.id, page]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setForm({ rating: myReview?.rating || 0, feedback: myReview?.feedback || '' }); }, [myReview]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.rating) { fail({ message: 'Please choose 1 to 5 stars' }); return; }
    setBusy(true);
    try {
      const r = await api(`/products/${product.id}/reviews`, { method: 'POST', body: form });
      toast(r.message);
      setEditing(false);
      load();
      onChange();
    } catch (err) { fail(err); }
    setBusy(false);
  };
  const remove = async (id) => {
    if (!(await confirm({ title: 'Delete review?', ok: 'Delete', danger: true }))) return;
    try { await api(`/reviews/${id}`, { method: 'DELETE' }); toast('Review deleted'); load(); onChange(); } catch (err) { fail(err); }
  };
  if (!data) return <Spinner />;
  const showForm = canReview && (!myReview || editing);
  return (
    <div className="reviews-layout">
      <div className="card">
        <div className="row gap"><span style={{ fontSize: '2.6rem', fontWeight: 800, lineHeight: 1 }}>{data.average || '–'}</span><div><Stars value={data.average} size={18} /><div className="small muted">{data.total} review{data.total === 1 ? '' : 's'}</div></div></div>
        <div className="dist mt">
          {[5, 4, 3, 2, 1].map((s) => (
            <div className="line" key={s}><span>{s} <FiStar size={12} fill="currentColor" className="amber" /></span><span className="bar"><i style={{ width: `${data.total ? (data.counts[s] / data.total) * 100 : 0}%` }} /></span><span className="muted small">{data.counts[s] || 0}</span></div>
          ))}
        </div>
        {!user && <p className="small muted mt mb-0"><Link to={`/login?next=/product/${product.id}`} className="link">Log in</Link> to review products you bought.</p>}
        {user && !canReview && user.id !== product.seller_id && <p className="small muted mt mb-0">You can review this product after you order it.</p>}
      </div>
      <div>
        {myReview && !editing && (
          <div className="info-box mb row between gap">
            <div><b>Your review</b> <Stars value={myReview.rating} /><div className="small">{myReview.feedback}</div></div>
            <div className="row gap-sm"><button type="button" className="btn sm ghost" onClick={() => setEditing(true)}><FiEdit2 /> Edit</button><button type="button" className="btn sm ghost" onClick={() => remove(myReview.id)} aria-label="Delete my review"><FiTrash2 /></button></div>
          </div>
        )}
        {showForm && (
          <form className="card stack mb" onSubmit={submit}>
            <b>{myReview ? 'Edit your review' : 'Write a review'}</b>
            <div className="star-input" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((s) => <button type="button" key={s} className={form.rating >= s ? 'on' : ''} onClick={() => setForm({ ...form, rating: s })} aria-label={`${s} star${s > 1 ? 's' : ''}`} aria-checked={form.rating === s} role="radio">★</button>)}
            </div>
            <textarea value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })} placeholder="What did you like? How is the quality?" maxLength={1000} required minLength={3} aria-label="Your review" />
            <div className="row gap"><button type="submit" className="btn" disabled={busy}>{myReview ? 'Save review' : 'Post review'}</button>{editing && <button type="button" className="btn ghost" onClick={() => setEditing(false)}>Cancel</button>}</div>
          </form>
        )}
        {data.items.length === 0 ? <p className="muted">No reviews yet. Be the first to share your opinion after you buy.</p> : data.items.map((r) => (
          <div className="review" key={r.id}>
            <div className="row gap"><img className="avatar" src={avatarOf(r)} alt="" /><div className="grow"><b>{r.username}</b><div className="row gap-sm"><Stars value={r.rating} size={13} /><span className="tiny muted">{dateOf(r.created_at)}</span></div></div>
              {user?.role === 'admin' && r.user_id !== user.id && <button type="button" className="btn sm ghost" onClick={() => remove(r.id)} aria-label="Delete review"><FiTrash2 /></button>}
            </div>
            <p className="mt mb-0">{r.feedback}</p>
          </div>
        ))}
        <Pagination page={data.page} pages={data.pages} onPage={setPage} />
      </div>
    </div>
  );
}

export default function Product() {
  const { id } = useParams();
  const nav = useNavigate();
  const { addToCart, toggleWish, wish, config } = useApp();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [img, setImg] = useState(0);
  const [qty, setQty] = useState(1);
  const load = useCallback(() => api(`/products/${id}`).then((d) => { setData(d); setError(null); }).catch(setError), [id]);
  useEffect(() => { setData(null); setImg(0); setQty(1); load(); }, [load]);
  useTitle(data?.product?.name || 'Product');

  if (error) return <div className="section wrap"><Empty title="This product is not available" text={error.message}><Link to="/products" className="btn">Continue shopping</Link></Empty></div>;
  if (!data) return <Spinner />;
  const p = data.product;
  const soldOut = p.quantity === 0;
  const off = p.old_price > p.price ? Math.round((1 - p.price / p.old_price) * 100) : 0;
  const onWish = wish.has(p.id);
  const buyNow = async () => { if (await addToCart(p, qty)) nav('/cart'); };

  return (
    <>
      <section className="section tight">
        <div className="wrap">
          <div className="crumbs"><Link to="/">Home</Link> / <Link to="/products">Shop</Link>{p.category_slug && <> / <Link to={`/products?category=${p.category_slug}`}>{p.category_title}</Link></>}</div>
          <div className="product-layout mt">
            <div className="gallery">
              <div className="main"><img src={p.images[img] || '/img/empty.png'} alt={p.name} width="700" height="700" /></div>
              {p.images.length > 1 && (
                <div className="thumbs">
                  {p.images.map((src, i) => <button type="button" key={src} className={i === img ? 'on' : ''} onClick={() => setImg(i)} aria-label={`Photo ${i + 1}`}><img src={src} alt="" /></button>)}
                </div>
              )}
            </div>
            <div className="buy-box stack">
              {!p.available && <div className="error-box">This product is hidden from the shop. Only you can see it.</div>}
              <div className="row gap-sm">
                {p.category_title && <span className="pill">{p.category_title}</span>}
                {off > 0 && <span className="pill red">Save {off}%</span>}
                {soldOut ? <span className="pill dark">Sold out</span> : p.quantity <= 5 ? <span className="pill amber">Only {p.quantity} left</span> : <span className="pill green">In stock</span>}
              </div>
              <h1 className="mb-0">{p.name}</h1>
              {p.reviews_count > 0 && <a href="#reviews" className="rating-line"><Stars value={p.rating} /> {p.rating} · {p.reviews_count} review{p.reviews_count === 1 ? '' : 's'}</a>}
              <Price price={p.price} old={p.old_price} />
              <div className="small muted">Sold by <b>{p.seller_shop || p.seller_name}</b>{p.sold > 0 && <> · {p.sold} sold</>}</div>
              {!soldOut && (
                <div className="row gap">
                  <Qty value={qty} max={p.quantity} onChange={setQty} />
                  <button type="button" className="btn lg grow" onClick={() => addToCart(p, qty)}><FiShoppingCart /> Add to cart</button>
                </div>
              )}
              <div className="row gap">
                {!soldOut && <button type="button" className="btn dark lg grow" onClick={buyNow}><FiShoppingBag /> Buy now</button>}
                <button type="button" className="btn ghost lg" onClick={() => toggleWish(p)} aria-pressed={onWish}><FiHeart fill={onWish ? 'currentColor' : 'none'} className={onWish ? 'red' : ''} /> {onWish ? 'Saved' : 'Save'}</button>
              </div>
              {data.canManage && <Link to={`/seller/products/${p.id}/edit`} className="btn ghost"><FiEdit2 /> Edit this product</Link>}
              <div className="facts">
                <div><FiTruck /><span>Delivery in Rwamagana: <b>{rwf(config?.delivery_fee_local)}</b>{Number(config?.free_delivery_over) > 0 && <> (free over {rwf(config.free_delivery_over)})</>}. Rest of Rwanda: <b>{rwf(config?.delivery_fee_other)}</b>.</span></div>
                <div><FiSmartphone /><span>Pay with MTN MoMo, Airtel Money or cash on delivery.</span></div>
                <div><FiRefreshCw /><span>Not what you expected? Contact us within 3 days of delivery.</span></div>
              </div>
              <div>
                <h3 className="mt">Description</h3>
                <p className="desc">{p.description}</p>
                {p.exp_date && <p className="small muted">Best before: {dateOf(p.exp_date)}</p>}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="section soft-bg" id="reviews">
        <div className="wrap">
          <h2>Customer reviews</h2>
          <Reviews product={p} myReview={data.myReview} canReview={data.canReview} onChange={load} />
        </div>
      </section>
      {data.related.length > 0 && (
        <section className="section">
          <div className="wrap">
            <h2>You may also like</h2>
            <ProductGrid items={data.related} />
          </div>
        </section>
      )}
    </>
  );
}
