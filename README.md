# Rwamagana Mall: the shop

Online shop for Rwamagana and the whole of Rwanda: fashion, shoes & bags, electronics, home & kitchen, groceries, beauty and Rwandan crafts.

**Live:** https://brogrammersmall.netlify.app

This repository is the shop that customers see (React 18 + Vite). The server and database code is in [MIDTERM-PROJECT-bn](https://github.com/Martha-Iradukunda/MIDTERM-PROJECT-bn). Netlify builds both into one website.

## What customers can do

- Browse and search products, filter by category, price, stock and deals, and sort them
- See product photos, stock, seller, reviews and similar products
- Use a cart (it works before logging in too) and a wishlist
- Check out with delivery to any district of Rwanda. The delivery fee is shown before paying.
- Pay with **MTN MoMo**, **Airtel Money** or **cash on delivery**, plus card when Stripe is connected
- Follow orders with a progress tracker and history, and cancel while an order is still pending
- Get notifications, chat with the shop, and write reviews after buying
- Manage their profile and photo, change their password, use 2-step login (when email is connected), and ask to become a seller

## Sellers and admins

- **Sellers:** a dashboard with sales charts, best sellers and low-stock alerts; add or edit products with photos; show or hide products; see the items they sold.
- **Admins:**
  - Orders: confirm Mobile Money payments, update delivery status, cancel orders
  - Users: roles, seller approvals, disabling accounts, temporary passwords
  - Products and categories
  - Customer chat inbox, contact messages and newsletter
  - Activity log
  - Shop settings: Mobile Money numbers, delivery fees, phone number and announcement bar

## How it is hosted (Netlify)

`netlify.toml` tells Netlify to:

1. build the shop (`npm run build`, published from `dist/`);
2. run `netlify-build.sh`, which downloads the server from MIDTERM-PROJECT-bn (branch `all-setup-features`);
3. run that server as a Netlify Function and send `/api/*`, `/media/*` and `/api-docs` to it.

Netlify settings (Site configuration › Environment variables):

| Name | What |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | the owner's admin login (setting a new password resets it once) |
| `PUBLIC_URL` | `https://brogrammersmall.netlify.app` (used in email links) |

A change to the server repo goes live at the next Netlify deploy. Push to this repo, or use "Trigger deploy" in Netlify.

## Run it on your computer

```bash
# 1. the server (see MIDTERM-PROJECT-bn), on http://localhost:5000
# 2. the shop:
npm install
npm run dev        # http://localhost:5173 (talks to the server on :5000)
```

## Images

The original project images are kept in `public/img`:
- `fashion.png`: the hero model
- `landing.jpg` and `landing.jpeg`: the promotional banners
- `logo.png` and `Frame.png`: the Rwamagana Mall logo (the cart with an "R"); the original "B" logo is kept as `logo-original.png` and `Frame-original.png`
- `empty.png`, `profile.jpeg` and `google-logo.png`: empty screens, default avatar and the Google button
- `payment-failed.jpg` (the red cross) and `email-check.png` (envelope with tick)

The `.webp` files are faster copies of the same pictures.

The starting product photos in `public/catalogue` come from Wikimedia Commons under free licences. Their authors are listed on the [Photo credits](https://brogrammersmall.netlify.app/credits) page.

© Rwamagana Mall · Powered by Martha Iradukunda
