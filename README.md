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
- Server-authoritative product, delivery and total calculations
- Paystack checkout initialization, callback verification and signed webhook handling
- Order confirmation and customer email support
- Working contact-enquiry submission

### Secure administrator backend

- Database-backed administrator account and session management
- Salted `scrypt` password hashing
- Signed, secure, HTTP-only cookies and CSRF protection
- Login and API rate limiting
- Catalogue creation, editing, soft deletion and stock management
- Product image URL or validated JPG/PNG/WebP upload
- A customizable delivery fee for every product
- Real order centre with customer and delivery details
- Fulfilment status updates and status history
- Paid-order revenue dashboard
- Privacy-preserving unique-visitor and page-view analytics
- Store details and order-notification settings
- SMTP owner/customer notifications

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

Create the initial catalogue, settings and administrator:

```bash
npm run seed
```

Start the application:

```bash
npm start
```

Open `http://localhost:5000` and use `#/admin` for the administration area.

## Payments

Local development defaults to `PAYMENT_MODE=demo`. It exercises order creation, server-side totals, inventory updates and email handling without charging money.

For real payments:

1. Set `PAYMENT_MODE=paystack`.
2. Add `PAYSTACK_SECRET_KEY`.
3. Set `APP_URL` and `PAYSTACK_CALLBACK_URL` to the public HTTPS domain.
4. Add this webhook URL in the Paystack dashboard:

   `https://your-domain.example/api/payments/webhook`

The server initializes transactions privately, verifies the status and amount before marking an order paid, and validates the webhook's HMAC-SHA512 signature.

## Product delivery fees

Every product has its own `deliveryFee`. The administrator enters or changes it in the add/edit sneaker form. The customer UI shows the fee per pair, and both the browser and server calculate:

`total delivery = sum(product delivery fee × quantity)`

The server ignores prices and delivery fees supplied by the browser and recalculates the final amount from MongoDB before creating an order.

## Image storage

Uploaded images are validated and saved under `public/uploads`. This is suitable for a persistent VPS disk. For an ephemeral hosting platform, mount a persistent disk or replace the upload service with Cloudinary/S3-compatible object storage.

## Verification

```bash
npm test
npm run check
```

## Deployment note

GitHub Pages can display only the static preview in `index.html`; it cannot run Node.js or MongoDB. Deploy the complete application to a Node-capable service or VPS, configure MongoDB and environment variables, then point the production domain to that server.
