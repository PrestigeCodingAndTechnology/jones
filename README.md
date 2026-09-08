# Jones Kicks Premium Ecommerce

A complete Jones Kicks ecommerce application built with Node.js, Express, EJS, MongoDB/Mongoose and ES6 JavaScript. The storefront remains a pure HTML/CSS/JavaScript experience; React is not used.

## Included

### Customer storefront

- Premium responsive homepage and hero slider
- Full 20-item Jones Kicks sneaker catalogue
- Search, category filters and price sorting
- Product details and quick view
- EU sizes 40–45
- Wishlist and persistent shopping bag
- Contact, delivery-address and delivery-note collection
- Per-product delivery fees shown in the product, bag and checkout
- Working promotion codes with minimum spend, scheduling and usage limits
- Server-authoritative product, delivery and total calculations
- Paystack checkout initialization, callback verification and signed webhook handling
- Order confirmation and customer email support
- Working contact-enquiry submission
- Private post-payment order lookup without exposing customer details publicly

### Secure administrator backend

- Database-backed administrator account and session management
- Salted `scrypt` password hashing
- Signed, secure, HTTP-only cookies and CSRF protection
- Login and API rate limiting
- Catalogue creation, editing, soft deletion and stock management
- Product image URL or validated JPG/PNG/WebP upload
- A customizable delivery fee for every product
- Real order centre with customer and delivery details
- Fulfilment status updates, customer status emails and status history
- Automatic stock reservation, rollback and paid-order cancellation restocking
- Paid-order revenue dashboard
- Privacy-preserving visitor, page, referrer and product-view analytics
- Promotion, customer-inbox and WhatsApp-subscriber management
- Store contact/social settings and administrator password changes
- SMTP owner/customer notifications with visible delivery status and retry
- Readiness/liveness probes, Docker image and one-command local stack

## Requirements

- Node.js 20.19 or newer
- MongoDB 7 or newer, locally or through MongoDB Atlas
- Paystack secret key for live payments
- SMTP account for email delivery

## Installation

```bash
npm install
cp .env.example .env
```

Edit `.env`, especially:

- `MONGODB_URI`
- `SESSION_SECRET` (at least 32 random characters in production)
- `ADMIN_EMAIL` and `ADMIN_PASSWORD`
- `APP_URL`
- `PAYMENT_MODE` and `PAYSTACK_SECRET_KEY`
- SMTP settings and `ORDER_NOTIFICATION_EMAIL`

Create the initial catalogue and administrator, then start the server, with one command:

```bash
npm run start:seeded
```

The seed is idempotent: running it again adds missing starter records without overwriting catalogue changes made in the admin dashboard. After initial setup, `npm start` starts only the server.

Open `http://localhost:5000` and use `#/admin` for the administration area.

### Start everything with Docker

Docker Compose starts MongoDB, creates the initial catalogue and administrator, and starts the web application:

```bash
docker compose up --build
```

Then open `http://localhost:5000`. To choose a different local administrator password:

```bash
ADMIN_PASSWORD='your-password' docker compose up --build
```

## Payments

Local development defaults to `PAYMENT_MODE=demo`. It exercises order creation, server-side totals, inventory updates and email handling without charging money.

For real payments:

1. Set `PAYMENT_MODE=paystack`.
2. Add `PAYSTACK_SECRET_KEY`.
3. Set `APP_URL` and `PAYSTACK_CALLBACK_URL` to the public HTTPS domain.
4. Add this webhook URL in the Paystack dashboard:

   `https://your-domain.example/api/payments/webhook`

The server initializes transactions privately, verifies the status and amount before marking an order paid, and validates the webhook's HMAC-SHA512 signature.

Paid-order confirmation also commits inventory atomically per product. If stock changed between checkout and payment, the order is marked **Needs review** instead of overselling. An administrator can restock and confirm it, or cancel it. Cancelling a committed paid order returns its stock; any monetary refund is processed separately in Paystack.

## Product delivery fees

Every product has its own `deliveryFee`. The administrator enters or changes it in the add/edit sneaker form. The customer UI shows the fee per pair, and both the browser and server calculate:

`total delivery = sum(product delivery fee × quantity)`

The server ignores prices and delivery fees supplied by the browser and recalculates the final amount from MongoDB before creating an order.

## Image storage

Uploaded images are validated and saved under `public/uploads`. This is suitable for a persistent VPS disk. For an ephemeral hosting platform, mount a persistent disk or replace the upload service with Cloudinary/S3-compatible object storage.

## Verification

```bash
npm run verify
```

## Deployment

GitHub Pages can display only the static preview in `index.html`; it cannot run Node.js or MongoDB. Deploy the complete application to a Node-capable service or VPS, configure MongoDB and environment variables, then point the production domain to that server.

See [DEPLOYMENT.md](DEPLOYMENT.md) for the production environment, Docker command, persistent-upload requirement, Paystack webhook and release checklist.
