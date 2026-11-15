import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../state/app.jsx';
import { ProductGrid, Empty, Spinner, useTitle } from '../components/ui.jsx';

export default function Wishlist() {
  useTitle('My wishlist');
  const { wish, confirm, toast, fail, loadWish } = useApp();
  const [items, setItems] = useState(null);
  useEffect(() => { api('/wishlist').then(setItems).catch(() => setItems([])); }, []);
  if (!items) return <Spinner />;
  const shown = items.filter((p) => wish.has(p.id));
  const clear = async () => {
    if (!(await confirm({ title: 'Clear your wishlist?', ok: 'Clear', danger: true }))) return;
    try { const r = await api('/wishlist', { method: 'DELETE' }); toast(r.message); setItems([]); loadWish(); } catch (e) { fail(e); }
  };
  return (
    <section className="section">
      <div className="wrap">
        <div className="row between mb"><h1 className="mb-0">My wishlist</h1>{shown.length > 0 && <button type="button" className="btn ghost sm" onClick={clear}>Clear wishlist</button>}</div>
        <ProductGrid items={shown} empty={<Empty title="Your wishlist is empty" text="Tap the heart on any product to save it for later."><Link to="/products" className="btn">Discover products</Link></Empty>} />
      </div>
    </section>
  );
}
