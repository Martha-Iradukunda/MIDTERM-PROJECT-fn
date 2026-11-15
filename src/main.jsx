import { StrictMode, Suspense, lazy, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import './styles.css';
import { AppProvider } from './state/app.jsx';
import { Header, Footer, ChatWidget } from './components/layout.jsx';
import { Guard, Spinner } from './components/ui.jsx';
import Home from './pages/Home.jsx';
import Shop from './pages/Shop.jsx';
import Product from './pages/Product.jsx';
import Cart from './pages/Cart.jsx';
import { Login, Signup, ForgotPassword, ResetPassword, VerifyEmail, AuthCallback } from './pages/Auth.jsx';
import { About, Faq, Terms, Contact, Credits, SubscribeConfirm, Unsubscribe, NotFound } from './pages/Info.jsx';

const Checkout = lazy(() => import('./pages/Checkout.jsx'));
const Orders = lazy(() => import('./pages/Orders.jsx'));
const OrderDetail = lazy(() => import('./pages/OrderDetail.jsx'));
const Wishlist = lazy(() => import('./pages/Wishlist.jsx'));
const Account = lazy(() => import('./pages/Account.jsx'));
const Notifications = lazy(() => import('./pages/Notifications.jsx'));
const Seller = lazy(() => import('./seller/Seller.jsx'));
const Admin = lazy(() => import('./admin/Admin.jsx'));

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function App() {
  return (
    <>
      <ScrollTop />
      <Header />
      <main id="main">
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Shop />} />
            <Route path="/product/:id" element={<Product />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/about" element={<About />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/credits" element={<Credits />} />
            <Route path="/subscribe/confirm" element={<SubscribeConfirm />} />
            <Route path="/subscribe/unsubscribe" element={<Unsubscribe />} />
            <Route path="/checkout" element={<Guard><Checkout /></Guard>} />
            <Route path="/orders" element={<Guard><Orders /></Guard>} />
            <Route path="/orders/:id" element={<Guard><OrderDetail /></Guard>} />
            <Route path="/wishlist" element={<Guard><Wishlist /></Guard>} />
            <Route path="/notifications" element={<Guard><Notifications /></Guard>} />
            <Route path="/account/*" element={<Guard><Account /></Guard>} />
            <Route path="/seller/*" element={<Guard roles={['seller', 'admin']}><Seller /></Guard>} />
            <Route path="/admin/*" element={<Guard roles={['admin']}><Admin /></Guard>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <ChatWidget />
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </StrictMode>,
);
