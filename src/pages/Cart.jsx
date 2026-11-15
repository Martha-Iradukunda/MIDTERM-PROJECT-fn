import { Link, useNavigate } from 'react-router-dom';
import { FiTrash2, FiArrowRight, FiShield } from 'react-icons/fi';
import { rwf } from '../api.js';
import { useApp } from '../state/app.jsx';
import { Qty, Empty, useTitle } from '../components/ui.jsx';

export default function Cart() {
  useTitle('Your cart');
  const { cart, setQuantity, removeFromCart, clearCart, user, confirm, config } = useApp();
  const nav = useNavigate();
  const problems = cart.items.filter((i) => !i.available || i.stock === 0 || i.quantity > i.stock);
  const free = Number(config?.free_delivery_over) || 0;

  if (!cart.items.length) {
    return (
      <section className="section wrap">
        <Empty title="Your cart is empty" text="Looks like you have not added anything yet.">
          <Link to="/products" className="btn">Start shopping</Link>
        </Empty>
      </section>
    );
  }
  return (
    <section className="section">
      <div className="wrap">
        <div className="row between mb"><h1 className="mb-0">Your cart</h1><span className="muted">{cart.count} item{cart.count === 1 ? '' : 's'}</span></div>
        <div className="cart-layout">
          <div className="card">
            {cart.items.map((i) => {
              const bad = !i.available || i.stock === 0;
              return (
                <div className="cart-item" key={i.product_id}>
                  <Link to={`/product/${i.product_id}`}><img src={i.image || '/img/empty.png'} alt="" /></Link>
                  <div>
                    <Link to={`/product/${i.product_id}`} className="strong">{i.name}</Link>
                    <div className="small muted">Sold by {i.seller_shop || i.seller_name || 'Rwamagana Mall'}</div>
                    <div className="small"><b>{rwf(i.price)}</b> each</div>
                    {bad && <div className="small red strong">No longer available. Please remove it.</div>}
                    {!bad && i.quantity > i.stock && <div className="small red strong">Only {i.stock} left in stock.</div>}
                  </div>
                  <div className="end stack sm" style={{ justifyItems: 'end' }}>
                    {!bad && <Qty small value={i.quantity} max={i.stock || 999} onChange={(n) => setQuantity(i.product_id, n)} />}
                    <b>{rwf(i.price * i.quantity)}</b>
                    <button type="button" className="link small red" onClick={() => removeFromCart(i.product_id)}><FiTrash2 style={{ verticalAlign: 'middle' }} /> Remove</button>
                  </div>
                </div>
              );
            })}
            <div className="row between mt">
              <Link to="/products" className="link">← Continue shopping</Link>
              <button type="button" className="btn ghost sm" onClick={async () => { if (await confirm({ title: 'Empty your cart?', text: 'All items will be removed.', ok: 'Empty cart', danger: true })) clearCart(); }}>Empty cart</button>
            </div>
          </div>
          <aside className="card shadow summary">
            <h3>Order summary</h3>
            <div className="line"><span>Items ({cart.count})</span><b>{rwf(cart.subtotal)}</b></div>
            <div className="line"><span>Delivery</span><span className="muted small">Calculated at checkout</span></div>
            {free > 0 && cart.subtotal < free && <div className="info-box small mt">Add <b>{rwf(free - cart.subtotal)}</b> more for free delivery in Rwamagana.</div>}
            {free > 0 && cart.subtotal >= free && <div className="ok-box small mt">Free delivery in Rwamagana!</div>}
            <div className="line total"><span>Subtotal</span><span>{rwf(cart.subtotal)}</span></div>
            {problems.length > 0 && <div className="error-box small mt">Please fix the items marked in red before you check out.</div>}
            <button type="button" className="btn block lg mt" disabled={problems.length > 0} onClick={() => nav(user ? '/checkout' : '/login?next=/checkout')}>
              {user ? 'Checkout' : 'Log in to check out'} <FiArrowRight />
            </button>
            <p className="tiny muted center mt mb-0"><FiShield style={{ verticalAlign: 'middle' }} /> Pay with MTN MoMo, Airtel Money or cash on delivery</p>
          </aside>
        </div>
      </div>
    </section>
  );
}
