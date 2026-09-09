# Jones Kicks — Production Ecommerce

Jones Kicks is a complete sneaker ecommerce application built with Node.js, Express, EJS, MongoDB/Mongoose and browser-native JavaScript. React is not used. The live storefront is rendered by EJS and backed by the API modules under `src/`; `index.html` is only a non-transactional design preview.

## Customer features

- Responsive premium storefront with hero slider, catalogue, search, category filters, sorting, quick view and product pages.
- Per-product EU sizes with live stock per size, including custom numeric and decimal sizes outside the default 40–45 set. Sold-out sizes remain visible but disabled, while sizes the administrator removes are hidden.
- Wishlist/favourites and persistent shopping bag.
- Server-authoritative pricing. The browser cannot choose product prices, delivery fees, discounts or final totals.
- Custom delivery fee per product, editable from the administrator product form and charged per pair.
- Percentage/fixed promo codes with minimum spend, maximum discount, date windows and usage limits.
- Checkout for name, email, phone, delivery address, city/state and delivery note.
- Paystack-only online payment flow. There is no simulated-success or demo-payment endpoint.
- Customer payment confirmation only after Paystack server verification.
- Order receipt/status history and private post-checkout order access token.
- Order tracking using reference + checkout email + phone number.
- Contact enquiry and WhatsApp/drop-list subscription forms.
- Customer confirmation/status emails when SMTP is configured.
- Privacy-preserving visitor/page analytics.

## Administrator features

- Database-backed administrator account with salted `scrypt` password hashing.
- Signed, HTTP-only, secure-in-production sessions and CSRF protection.
- Login/API rate limiting, CSP/security headers and request-ID handling.
- Dashboard metrics for products, orders, paid revenue, visitors, low stock, messages, subscribers and promotions.
- Product create/edit/soft-delete, featured flag, prices, description, image and per-product delivery-fee management.
- Size-inventory editor with default EU 40–45 controls plus validated custom sizes from 1–100 (up to two decimal places), independent stock quantities and complete add/remove controls. Total product stock is server-derived.
- Signature-validated JPG/PNG/WebP image uploads.
- Order centre with customer/delivery details, line items, discounts, payment/refund state and status history.
- Fulfilment workflow with unpaid-order guards, cancellation controls and inventory restoration.
- Paystack full-refund initiation for cancelled paid orders plus refund webhook lifecycle tracking.
- Promotion management, contact-message inbox and subscriber management.
- Sales/traffic analytics and store/notification settings.
- Administrator password change.

## Live Paystack architecture

The production payment path is intentionally **Paystack only**.

1. The browser submits the cart/customer details to Jones Kicks.
2. The server reloads product data from MongoDB and calculates the authoritative amount, delivery fees and promotion discount.
3. The server initializes the transaction with Paystack using `PAYSTACK_SECRET_KEY` and stores the returned access code/reference.
4. The customer is sent to the secure Paystack checkout URL.
5. Paystack callback and signed webhook paths re-query Paystack before an order can become paid.
6. Verification requires successful status, exact reference, exact NGN amount, matching customer email and the correct Paystack environment (`live` in production).
7. Inventory/fulfilment and order emails run only after verified finalization.

Both `PAYSTACK_PUBLIC_KEY` and `PAYSTACK_SECRET_KEY` must be configured as a matching pair. Production startup accepts only `pk_live_...` and `sk_live_...` credentials. The public key is safe to expose as frontend configuration; the secret key is never returned to browser code or committed to the repository.

### Production payment fail-safes

Production startup refuses to run when any of these are true:

- Paystack public or secret key is missing.
- A test key is used in production.
- Public/secret keys are from different environments.
- A placeholder-looking key is used.
- `APP_URL` is not a real HTTPS public URL.
- `PAYSTACK_CALLBACK_URL` is not the `/payment/callback` route on `APP_URL`.
- `SESSION_SECRET` is weak/default/placeholder-like.
- MongoDB or SMTP owner-notification configuration is missing.

`npm run verify:paystack` authenticates the configured **live secret key** against Paystack without creating a charge. A controlled real payment should still be completed after deployment to validate the final domain, callback, webhook, Paystack account/channel configuration and settlement path.

## Requirements

- Node.js 20.19 or newer.
- MongoDB 7+ or MongoDB Atlas.
- A Paystack account with live API keys for production.
- SMTP credentials and an owner notification email (required in production).
- HTTPS for the production domain.

## Local development

```bash
npm ci
cp .env.example .env
# Edit .env and configure MongoDB. Use a Paystack TEST key pair for local payment QA.
npm run seed
npm run verify
npm start
```

Open:

```text
Store: http://localhost:5000
Admin: http://localhost:5000/admin
```

For auto-reload:

```bash
npm run dev
```

Or start the application and MongoDB together with Docker:

```bash
cp .env.example .env
# Edit .env first, then:
docker compose run --rm app npm run seed
docker compose up --build
```

If Paystack keys are blank, the catalogue still loads but checkout remains disabled. There is no fake-payment fallback.

## Production environment

Do not commit the real `.env`. Configure secrets in your hosting platform or a private server `.env` file.

```env
NODE_ENV=production
PORT=5000
APP_URL=https://your-domain.example
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER/jones_kicks
SESSION_SECRET=YOUR_RANDOM_64_PLUS_CHARACTER_SECRET
SESSION_TTL_HOURS=24
TRUST_PROXY=1

ADMIN_NAME=Jones Kicks Admin
ADMIN_EMAIL=owner@your-domain.example
ADMIN_PASSWORD=YOUR_UNIQUE_STRONG_ADMIN_PASSWORD

PAYSTACK_PUBLIC_KEY=pk_live_YOUR_REAL_PUBLIC_KEY
PAYSTACK_SECRET_KEY=sk_live_YOUR_REAL_SECRET_KEY
PAYSTACK_CALLBACK_URL=https://your-domain.example/payment/callback

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM="Jones Kicks <orders@your-domain.example>"
ORDER_NOTIFICATION_EMAIL=orders@your-domain.example
```

Set the Paystack dashboard webhook to:

```text
https://your-domain.example/api/payments/webhook
```

## First production start

```bash
npm ci
npm run verify
npm run verify:paystack
npm run verify:email
npm run seed
npm start
```

When dependencies are installed, also run the full smoke suite:

```bash
npm test
```

## Available verification commands

```bash
npm run check             # required files + critical feature wiring
npm run test:core         # behavioral tests, including Paystack verification rules
npm test                  # core tests + Express/EJS smoke test
npm run verify:paystack   # live Paystack authentication check; creates no charge
npm run verify:email      # SMTP authentication check; sends no email
npm run migrate:inventory # migrate an older catalogue to stock per size
npm run verify            # project check + all tests + production dependency audit
```

## Product images

Admin uploads are stored in `public/uploads`. Use persistent disk storage on the production server/container and back this directory up. On an ephemeral platform, mount persistent storage or replace the upload service with object storage before relying on admin uploads.

## Health endpoints

```text
GET /health
GET /ready
```

`/ready` returns HTTP 200 only when MongoDB is connected. Health output also reports whether Paystack is configured as `paystack-live`, `paystack-test` or unconfigured; it never exposes a key.

## Deployment

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for the complete VPS/Nginx, Docker, Paystack, SMTP and launch checklist.
