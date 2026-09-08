# Production deployment

Jones Kicks runs as a standard Node.js web service and connects to MongoDB. The included Dockerfile can be deployed to any container host or VPS.

## Required production configuration

Set these environment variables in the hosting dashboard. Never commit the real values.

```dotenv
NODE_ENV=production
PORT=5000
APP_URL=https://shop.example.com
MONGODB_URI=mongodb+srv://...
MONGODB_TRANSACTIONS=true
SESSION_SECRET=a-unique-random-secret-of-at-least-32-characters
ORDER_ACCESS_TTL_HOURS=720
ADMIN_NAME=Jones Kicks Admin
ADMIN_EMAIL=owner@example.com
ADMIN_PASSWORD=a-unique-password-of-at-least-12-characters
PAYMENT_MODE=paystack
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_CALLBACK_URL=https://shop.example.com/payment/callback
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=Jones Kicks <orders@example.com>
ORDER_NOTIFICATION_EMAIL=owner@example.com
TRUST_PROXY=1
```

Generate `SESSION_SECRET` locally with:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

## Container deployment

Build and run the application after supplying the production variables:

```bash
docker build -t jones-kicks .
docker run --env-file .env -p 5000:5000 -v jones_uploads:/app/public/uploads jones-kicks
```

The container safely runs the idempotent seed before starting. Existing catalogue edits, stock, prices and delivery fees are preserved.

Production defaults to MongoDB transactions for crash-safe payment, inventory and order updates. MongoDB Atlas supports them. If a self-hosted database is used, configure it as a replica set; disable `MONGODB_TRANSACTIONS` only when the database genuinely cannot support transactions.

Use `/health` for liveness and `/ready` for database readiness.

## Paystack

In the Paystack dashboard, register:

```text
https://shop.example.com/api/payments/webhook
```

The application initializes payments on the server, validates webhook signatures, and verifies the paid amount, currency and reference before confirming an order.

## Uploaded product images

`public/uploads` must use persistent storage. The Docker example mounts a named volume. On an ephemeral platform, attach a persistent disk at `/app/public/uploads` or replace the upload service with object storage.

## Release checklist

```bash
npm ci
npm run verify
```

Then confirm that:

- MongoDB is reachable from the service.
- the first seed completes successfully;
- the administrator can sign in at `/#/admin`;
- a low-value real Paystack transaction completes and appears in Orders;
- owner and customer emails are delivered;
- the Paystack webhook receives HTTP 200;
- HTTPS is enabled before accepting customer information.
