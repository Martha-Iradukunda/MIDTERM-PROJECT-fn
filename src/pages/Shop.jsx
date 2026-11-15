import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiFilter, FiX } from 'react-icons/fi';
import { api, qs } from '../api.js';
import { ProductGrid, Pagination, Empty, useTitle } from '../components/ui.jsx';

const SORTS = [['new', 'Newest first'], ['popular', 'Best sellers'], ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low'], ['rating', 'Top rated'], ['name', 'Name A–Z']];
const PRICES = [['', '', 'Any price'], ['', '10000', 'Under 10,000 RWF'], ['10000', '50000', '10,000 – 50,000 RWF'], ['50000', '200000', '50,000 – 200,000 RWF'], ['200000', '', 'Over 200,000 RWF']];

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const [cats, setCats] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [min, setMin] = useState(params.get('min') || '');
  const [max, setMax] = useState(params.get('max') || '');
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const cat = cats.find((c) => c.slug === category);
  useTitle(q ? `Search: ${q}` : cat?.title || 'Shop');

  useEffect(() => { api('/categories').then(setCats).catch(() => {}); }, []);
  useEffect(() => { setMin(params.get('min') || ''); setMax(params.get('max') || ''); }, [params]);
  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    const query = Object.fromEntries(params.entries());
    api(`/products${qs({ limit: 12, ...query })}`, { signal: ctrl.signal })
      .then((r) => { setData(r); setLoading(false); })
      .catch((e) => { if (e.name !== 'AbortError') { setData({ items: [], total: 0, pages: 1, page: 1 }); setLoading(false); } });
    return () => ctrl.abort();
  }, [params]);

  const set = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
    setOpen(false);
  };
  const hasFilters = q || category || params.get('min') || params.get('max') || params.get('in_stock') || params.get('deals');

  return (
    <>
      <div className="page-head">
        <div className="wrap">
          <div className="crumbs"><Link to="/">Home</Link> / <span>Shop</span>{cat && <> / <span>{cat.title}</span></>}</div>
          <h1 className="mb-0">{q ? <>Results for “{q}”</> : params.get('deals') ? 'Deals' : cat?.title || 'All products'}</h1>
          {cat?.description && !q && <p className="muted mb-0" style={{ maxWidth: 720 }}>{cat.description}</p>}
        </div>
      </div>
      <section className="section tight">
        <div className="wrap shop-layout">
          <aside className={`filters ${open ? 'open' : ''}`} aria-label="Filters">
            <div>
              <h4>Categories</h4>
              <div className="filter-list">
                <button type="button" className={!category ? 'on' : ''} onClick={() => set({ category: '' })}>All products</button>
                {cats.map((c) => <button type="button" key={c.id} className={category === c.slug ? 'on' : ''} onClick={() => set({ category: c.slug })}>{c.title}<small>{c.products}</small></button>)}
              </div>
            </div>
            <div>
              <h4>Price</h4>
              <div className="filter-list">
                {PRICES.map(([a, b, label]) => <button type="button" key={label} className={(params.get('min') || '') === a && (params.get('max') || '') === b ? 'on' : ''} onClick={() => set({ min: a, max: b })}>{label}</button>)}
              </div>
              <form className="row gap-sm mt" onSubmit={(e) => { e.preventDefault(); set({ min, max }); }}>
                <input style={{ flex: '1 1 70px' }} inputMode="numeric" placeholder="Min" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))} aria-label="Minimum price" />
                <input style={{ flex: '1 1 70px' }} inputMode="numeric" placeholder="Max" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))} aria-label="Maximum price" />
                <button type="submit" className="btn sm dark">Go</button>
              </form>
            </div>
            <div className="stack sm">
              <label className="check"><input type="checkbox" checked={params.get('in_stock') === '1'} onChange={(e) => set({ in_stock: e.target.checked ? '1' : '' })} /> In stock only</label>
              <label className="check"><input type="checkbox" checked={params.get('deals') === '1'} onChange={(e) => set({ deals: e.target.checked ? '1' : '' })} /> Deals only</label>
            </div>
          </aside>
          <div>
            <div className="toolbar">
              <div className="row gap">
                <button type="button" className="btn ghost sm filter-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}><FiFilter /> Filters</button>
                <span className="muted">{data ? `${data.total} product${data.total === 1 ? '' : 's'}` : 'Loading…'}</span>
              </div>
              <select value={params.get('sort') || 'new'} onChange={(e) => set({ sort: e.target.value === 'new' ? '' : e.target.value })} aria-label="Sort by">
                {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            {hasFilters && (
              <div className="chip-row mb">
                {q && <button type="button" className="chip" onClick={() => set({ q: '' })}>“{q}” <FiX /></button>}
                {cat && <button type="button" className="chip" onClick={() => set({ category: '' })}>{cat.title} <FiX /></button>}
                {(params.get('min') || params.get('max')) && <button type="button" className="chip" onClick={() => set({ min: '', max: '' })}>{params.get('min') || 0} – {params.get('max') || '∞'} RWF <FiX /></button>}
                {params.get('in_stock') && <button type="button" className="chip" onClick={() => set({ in_stock: '' })}>In stock <FiX /></button>}
                {params.get('deals') && <button type="button" className="chip" onClick={() => set({ deals: '' })}>Deals <FiX /></button>}
                <button type="button" className="link small" onClick={() => setParams({})}>Clear all</button>
              </div>
            )}
            <div style={{ opacity: loading && data ? 0.55 : 1, transition: 'opacity .2s' }}>
              <ProductGrid
                items={data?.items}
                loading={loading}
                count={12}
                empty={<Empty title="No results found..." text="We could not find products that match. Try other words or remove some filters."><button type="button" className="btn" onClick={() => setParams({})}>See all products</button></Empty>}
              />
            </div>
            {data && <Pagination page={data.page} pages={data.pages} onPage={(p) => { set({ page: String(p) }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />}
          </div>
        </div>
      </section>
    </>
  );
}
