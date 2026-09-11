import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [client, styles, publicRoutes, adminRoutes] = await Promise.all([
  readFile(new URL("../assets/js/app.js", import.meta.url), "utf8"),
  readFile(new URL("../assets/css/styles.css", import.meta.url), "utf8"),
  readFile(new URL("../src/routes/public.js", import.meta.url), "utf8"),
  readFile(new URL("../src/routes/admin.js", import.meta.url), "utf8"),
]);

test("every rendered delegated action has a click handler", () => {
  const delegatedActions = [
    "cart-open",
    "layer-close",
    "menu",
    "search-trigger",
    "hero-dot",
    "quick",
    "size",
    "add",
    "wish",
    "filter",
    "clear-filter",
    "qty",
    "remove",
    "promo",
    "promo-remove",
    "order-page",
    "admin-tab",
    "admin-logout",
    "new-product",
    "add-custom-size",
    "remove-custom-size",
    "edit-product",
    "delete-product",
    "new-coupon",
    "edit-coupon",
    "delete-coupon",
    "message-status",
    "delete-message",
    "subscriber-toggle",
    "delete-subscriber",
    "confirm-delete",
    "order-view",
    "refund-order",
    "save-order",
    "toggle-setting",
  ];

  for (const action of delegatedActions) {
    assert.match(client, new RegExp(`data-${action}(?:=|[ >])`));
    assert.match(client, new RegExp(`matches\\(\"\\[data-${action}\\]`));
  }
  assert.match(client, /closest\("\[data-route\]"\)/);
});

test("every customer and admin form is connected to a submit action", () => {
  const delegatedForms = [
    "shop-search",
    "admin-product-search",
    "admin-order-search",
    "newsletter-form",
    "contact-form",
    "checkout-form",
    "admin-login",
    "coupon-form",
    "settings-form",
    "password-form",
    "track-order-form",
  ];
  for (const id of delegatedForms) {
    assert.match(client, new RegExp(`id=\\\"${id}\\\"`));
    assert.match(client, new RegExp(`f\\.id === \\"${id}\\"`));
  }

  assert.match(client, /id="product-form" novalidate/);
  assert.match(client, /productForm\.addEventListener\("submit"/);
  assert.match(client, /saveButton\.addEventListener\("click"/);
  assert.match(client, /void saveProduct\(productForm\)/);
  assert.doesNotMatch(client, /requestSubmit/);
});

test("backend-required UI actions have matching API routes", () => {
  const contracts = [
    [client, "/api/session", publicRoutes, '"/session"'],
    [client, "/api/products/", publicRoutes, '"/products/:identifier"'],
    [client, "/api/orders/quote", publicRoutes, '"/orders/quote"'],
    [client, "/api/orders", publicRoutes, '"/orders"'],
    [client, "/api/orders/lookup", publicRoutes, '"/orders/lookup"'],
    [client, "/api/analytics/visit", publicRoutes, '"/analytics/visit"'],
    [client, "/api/contact", publicRoutes, '"/contact"'],
    [client, "/api/subscribers", publicRoutes, '"/subscribers"'],
    [client, "/api/admin/dashboard", adminRoutes, '"/dashboard"'],
    [client, "/api/admin/products", adminRoutes, '"/products"'],
    [client, "/api/admin/orders/", adminRoutes, '"/orders/:reference/status"'],
    [client, "/api/admin/coupons", adminRoutes, '"/coupons"'],
    [client, "/api/admin/messages/", adminRoutes, '"/messages/:id/status"'],
    [client, "/api/admin/subscribers/", adminRoutes, '"/subscribers/:id"'],
    [client, "/api/admin/settings", adminRoutes, '"/settings"'],
    [
      client,
      "/api/admin/account/password",
      adminRoutes,
      '"/account/password"',
    ],
  ];

  for (const [uiSource, uiPath, routeSource, routePath] of contracts) {
    assert.ok(uiSource.includes(uiPath), `missing UI API call ${uiPath}`);
    assert.ok(routeSource.includes(routePath), `missing server route ${routePath}`);
  }
});

test("mobile branding and audited interaction feedback remain enabled", () => {
  assert.match(styles, /@media\(max-width:860px\)\{\.brand-word\{display:inline-flex\}/);
  assert.match(client, /withFormBusy\(f, "Saving…"/);
  assert.match(client, /withButtonBusy\(t, "Deleting…"/);
  assert.match(client, /runRouteEffects/);
  assert.match(client, /new Date\(b\.createdAt\)\.getTime\(\)/);
  assert.match(client, /\?category=" \+ encodeURIComponent\(state\.filter\)/);
});
