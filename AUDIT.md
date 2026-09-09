# Jones Kicks Production Audit

Audit date: 9 September 2026
Build: 6.0.0 — Product CRUD and per-size inventory release

## Scope reviewed

Storefront, product catalogue, mobile branding, cart, per-product delivery fees, checkout, Paystack initialization/verification/webhooks/refunds, order lifecycle, inventory handling, customer order tracking, administrator authentication, product CRUD, promotions, contact messages, subscribers, analytics, email integration, upload validation, production environment controls and deployment configuration.

## Product CRUD and inventory changes completed in this release

- Repaired administrator product create, edit and soft-delete API/UI flows and added route-level CRUD tests.
- Replaced the fixed 40–45 list and single shared stock input with selectable stock per size.
- Quantity `0` keeps a selected size visible as sold out; removing the selection hides that size from customers.
- Persisted canonical `sizeInventory` entries in MongoDB and server-derived legacy `sizes`/total `stock` values.
- Added an idempotent startup migration that preserves the total stock of older products while distributing it across their sizes.
- Added customer-side sold-out indicators and prevented sold-out size selection before add-to-cart.
- Added server-authoritative quote validation and atomic payment/restock updates for the exact ordered size.
- Added optimistic-concurrency version increments so catalogue edits cannot silently overwrite payment-time stock changes.
- Added cache-busted production CSS/JavaScript asset URLs.
- Updated vulnerable transitive packages; the production dependency audit reports zero known vulnerabilities.

## Payment changes completed in this release

- Removed the demo-payment API route and every client-side simulated-success payment path.
- Changed order persistence to Paystack-only payment provider state.
- Added required `PAYSTACK_PUBLIC_KEY` + `PAYSTACK_SECRET_KEY` paired configuration.
- Added live/test key-prefix and same-environment validation.
- Production now refuses all test Paystack keys and requires `pk_live_...` + `sk_live_...`.
- Production rejects missing or placeholder-looking Paystack keys.
- Production requires a real HTTPS `APP_URL` and the same-origin `/payment/callback` Paystack callback.
- Kept transaction initialization on the backend so the browser never controls the authoritative amount or receives the secret key.
- Added Paystack transaction-domain verification so a test-domain transaction cannot settle a live-production order.
- Verification now requires exact Paystack status, amount, currency, reference and matching customer email.
- Added Paystack transaction ID persistence as a string.
- Webhook charge processing continues to require a valid HMAC-SHA512 signature and server re-verification.
- Refund webhook processing now also validates the Paystack environment when provided.
- Removed demo refund behavior; administrator refunds use Paystack only.
- Added `npm run verify:paystack`, which authenticates a configured live secret against Paystack without creating a charge.
- Checkout is disabled if the backend or Paystack configuration is unavailable; it never falls back to a fake payment.

## Other hardening retained/completed

- Custom delivery fee per product in product data, administrator CRUD and checkout calculations.
- Server-authoritative quote and promotion calculations.
- Unpaid-order fulfilment guard.
- Inventory compensation/restoration logic for fulfilment/cancellation paths.
- Late payments on cancelled orders are routed to `Needs review` rather than silently resurrecting fulfilment.
- Signed customer order-access token and multi-factor order lookup (reference/email/phone).
- Salted `scrypt` administrator passwords, signed cookies, CSRF protection, rate limiting and CSP/security headers.
- Production seeding rejects default/placeholder administrator passwords.
- Request IDs are sanitized before being reflected in response headers.
- GitHub Pages auto-deployment workflow was removed because it could publish only the non-transactional static preview, not the production ecommerce application.

## Verification performed in this workspace

- Clean `npm ci`: PASS.
- `npm run check`: PASS — 56 required files and 52 critical feature assertions.
- `npm test`: PASS — 33 tests, 33 passed, 0 failed.
- Product-route tests cover administrator create/read/edit/delete behavior and persisted size inventory.
- Inventory tests cover schema normalization, legacy migration, exact-size quoting, sold-out rejection, atomic decrement and cancellation restock.
- Paystack tests cover exact amount/reference/currency/customer matching, environment mismatch rejection and safe checkout-origin validation.
- Production environment tests cover HTTPS, matching live keys, same-origin callback and required SMTP configuration.
- `npm audit --omit=dev`: PASS — 0 known vulnerabilities.
- All 28 bundled image files pass full decode checks.
- JavaScript syntax checks for modified server/client/test files: PASS.
- Source scan for old demo-payment route/token/simulated-success configuration: PASS.

## Live acceptance checks that require the real deployment

Real live credentials were not embedded in this archive and should never be sent in chat or committed to the project. After placing the real keys in private hosting environment variables, run:

```bash
npm run verify:paystack
```

Then complete one controlled real checkout and confirm callback, webhook, paid-order state and Paystack dashboard reconciliation. Also confirm one controlled refund, SMTP delivery, final MongoDB persistence, reverse-proxy/TLS behavior and persistent product-upload storage.

These are production-environment acceptance checks; the application code does not contain a demo-payment fallback.
