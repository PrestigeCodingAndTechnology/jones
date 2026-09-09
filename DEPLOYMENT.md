# Jones Kicks Production Deployment Guide

The complete application requires Node.js and MongoDB. Do not deploy the project as a GitHub Pages site; GitHub Pages cannot run the ecommerce API, Paystack verification, MongoDB, administrator dashboard or email services.

## 1. Upload and install

```bash
cd /path/to/JonesKicks
node -v
npm -v
npm ci
```

Use Node.js 20.19+.

## 2. Create the private production environment

```bash
cp .env.example .env
nano .env
```

Minimum production configuration:

```env
NODE_ENV=production
PORT=5000
APP_URL=https://your-domain.example
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER/jones_kicks
SESSION_SECRET=PASTE_A_UNIQUE_RANDOM_SECRET_HERE
SESSION_TTL_HOURS=24
TRUST_PROXY=1

ADMIN_NAME=Jones Kicks Admin
ADMIN_EMAIL=owner@your-domain.example
ADMIN_PASSWORD=PASTE_A_UNIQUE_STRONG_PASSWORD_HERE

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

A strong session secret can be generated on the server with:

```bash
openssl rand -hex 48
```

Never commit `.env`, live Paystack keys, MongoDB credentials or SMTP credentials to Git.

## 3. Paystack live configuration

In the Paystack dashboard, copy the **live** key pair into the server secret configuration:

```text
PAYSTACK_PUBLIC_KEY  -> pk_live_...
PAYSTACK_SECRET_KEY  -> sk_live_...
```

The application deliberately refuses to boot in `NODE_ENV=production` with test keys, mismatched key environments, missing keys or placeholder-looking values.

Set the transaction callback to:

```text
https://your-domain.example/payment/callback
```

Set the Paystack webhook URL to:

```text
https://your-domain.example/api/payments/webhook
```

The secret key stays server-side. Paystack webhooks are accepted only when the HMAC-SHA512 `x-paystack-signature` is valid. Successful charge events are then independently verified with Paystack before the order can be marked paid.

Before opening the store to customers, validate live authentication without creating a charge:

```bash
npm run verify:paystack
```

Expected result includes:

```text
Paystack live authentication: PASS
No payment or charge was created by this check.
```

Then make one controlled low-value **real live checkout** through the deployed storefront and confirm all of the following in the Paystack dashboard and Jones Kicks admin:

- the exact order amount was charged;
- the callback returns to the Jones Kicks success page;
- the webhook reaches `/api/payments/webhook` successfully;
- the Jones Kicks order changes to paid/new only after verification;
- the transaction environment is live;
- the order notification/receipt is delivered when SMTP is enabled.

## 4. Validate the build before seeding

```bash
npm run verify
```

Then seed the initial catalogue/settings and first administrator:

```bash
npm run seed
```

Production seeding rejects the default/development admin password. The seed is idempotent for the catalogue/settings and does not overwrite an existing administrator password.

For an existing Jones Kicks database, stock is migrated automatically to per-size inventory when the server starts. You can run the same idempotent migration explicitly before restart:

```bash
npm run migrate:inventory
```

## 5. Start directly

```bash
npm start
```

Health checks:

```bash
curl -fsS http://127.0.0.1:5000/health
curl -fsS http://127.0.0.1:5000/ready
```

`/ready` returns HTTP 200 only when MongoDB is connected.

## 6. Ubuntu/VPS with PM2

```bash
sudo npm install -g pm2
pm2 start server.js --name jones-kicks
pm2 save
pm2 startup
```

Run the command printed by `pm2 startup`, then verify:

```bash
pm2 status
pm2 logs jones-kicks --lines 100
```

## 7. Nginx reverse proxy

Example HTTP server block before TLS is issued:

```nginx
server {
    listen 80;
    server_name your-domain.example www.your-domain.example;

    client_max_body_size 4m;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site and test Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Install a valid TLS certificate and make sure the public site resolves at the exact HTTPS `APP_URL` **before** using live Paystack. Keep `TRUST_PROXY=1` when Nginx is the single trusted reverse proxy.

After HTTPS is active, restart with the production environment:

```bash
pm2 restart jones-kicks --update-env
```

## 8. Docker deployment

```bash
docker build -t jones-kicks .
docker run -d \
  --name jones-kicks \
  --restart unless-stopped \
  --env-file .env \
  -p 5000:5000 \
  -v jones-kicks-uploads:/app/public/uploads \
  jones-kicks
```

Check readiness:

```bash
curl -fsS http://127.0.0.1:5000/ready
```

## 9. SMTP acceptance test

SMTP is used for verified-order notifications, customer receipts/status updates and owner contact-form alerts. After deployment, submit a controlled paid order and contact enquiry and confirm delivery to both owner and customer test inboxes. Payment processing does not become unverified merely because email delivery fails; email errors are handled separately.

Validate the configured SMTP login without sending an email:

```bash
npm run verify:email
```

## 10. Persistent product uploads

Administrator image uploads are stored in:

```text
public/uploads
```

On a VPS, include this directory in backups. On a container/PaaS with ephemeral filesystem, mount persistent storage at `/app/public/uploads` or move uploads to object storage.

## 11. Updating an existing deployment

```bash
git pull
npm ci --omit=dev
npm run verify
npm run verify:paystack
npm run verify:email
npm run migrate:inventory
pm2 restart jones-kicks --update-env
```

Run `npm run seed` only when you intentionally want to ensure the seed catalogue/settings exist.

## 12. Final launch checklist

- Production domain and `www`/non-`www` routing are correct.
- HTTPS certificate is valid.
- `NODE_ENV=production`.
- MongoDB is reachable, protected and backed up.
- `SESSION_SECRET` is unique and not a placeholder.
- Production admin password is strong and private.
- `PAYSTACK_PUBLIC_KEY` begins with `pk_live_` and is the real live public key.
- `PAYSTACK_SECRET_KEY` begins with `sk_live_` and is stored only as a server secret.
- `npm run verify:paystack` passes.
- Paystack callback is the exact production `/payment/callback` URL.
- Paystack webhook is the exact production `/api/payments/webhook` URL.
- A controlled real live checkout has passed end-to-end.
- A controlled refund has been confirmed before relying on refunds operationally.
- SMTP owner/customer delivery has been confirmed.
- `/ready` returns HTTP 200.
- Product add/edit/delete, image, delivery fee and per-size stock controls work from admin.
- A size with quantity 0 is visible as sold out; an unchecked size is removed from the storefront.
- Paid order fulfilment status changes and customer tracking work.
- Promotions, contact messages, subscribers and analytics are visible in admin.
- `public/uploads` is persistent and backed up.
