(function clientApp() {
  "use strict";
  const K = {
    products: "jk_products_v7",
    cart: "jk_cart_v2",
    orders: "jk_orders_v2",
    views: "jk_views_v2",
    wish: "jk_wishlist_v2",
    settings: "jk_settings_v2",
    visitor: "jk_visitor_id",
    orderToken: "jk_order_token",
  };
  const runtime = {
    api: Boolean(
      document.querySelector('meta[name="jk-api"][content="enabled"]'),
    ),
    csrfToken: "",
    adminAuthenticated: false,
    paymentConfigured: false,
    paymentEnvironment: "unconfigured",
    paystackPublicKey: "",
  };
  const imageRoot = runtime.api ? "/assets/images/" : "assets/images/";
  const fallback = [
    imageRoot + "pics4.jpeg",
    imageRoot + "pics13.jpeg",
    imageRoot + "pics21.jpeg",
    imageRoot + "pics10.jpeg",
    imageRoot + "pics15.jpeg",
    imageRoot + "pics19.jpeg",
    imageRoot + "pics22.jpeg",
    imageRoot + "pics8.jpeg",
    imageRoot + "pics3.jpeg",
    imageRoot + "logo.jpeg",
  ];
  const pics = [
    "pics1.jpeg",
    "pics2.jpeg",
    "pics3.jpeg",
    "pics10.jpeg",
    "pics11.jpeg",
    "pics12.jpeg",
    "pics7.jpeg",
    "pics8.jpeg",
    "pics13.jpeg",
    "pics14.jpeg",
    "pics15.jpeg",
    "pics16.jpeg",
    "pics17.jpeg",
    "pics18.jpeg",
    "pics19.jpeg",
    "pics20.jpeg",
    "pics21.jpeg",
    "pics22.jpeg",
    "pics23.jpeg",
    "pics24.jpeg",
  ];
  const source = [
    ["PUMA", "Lifestyle", 48000, 58000, "New"],
    ["ADDIDAS SAMBA", "Lifestyle", 45000, 52000, "Bestseller"],
    ["ASICS", "Performance", 52000, 60000, "New"],
    ["HELIOT EMIL", "Limited", 68000, 76000, "Limited"],
    ["CHANNEL", "Luxury", 72000, 82000, "Premium"],
    ["TIMBERLAND", "Boots", 75000, 84000, "Icon"],
    ["LAVIN BURGUNDY", "Luxury", 85000, 95000, "Limited"],
    ["NIKE NOCTA", "Limited", 65000, 75000, "Hot"],
    ["AIR JORDAN 4", "Jordan", 58000, 67000, "Bestseller"],
    ["SUPREME X NIKE", "Limited", 70000, 80000, "Limited"],
    ["NIKE SB LOW", "Nike", 52000, 61000, "Hot"],
    ["NIKE AIRFORCE", "Nike", 45000, 52000, "Icon"],
    ["NEW ASICS", "Performance", 50000, 58000, "New"],
    ["NIKE AIR JORDAN", "Jordan", 58000, 67000, "Classic"],
    ["NEW CONVERSE", "Lifestyle", 42000, 49000, "New"],
    ["VANS HYLANE", "Lifestyle", 43000, 50000, "New"],
    ["NEW BALANCE 9060", "Lifestyle", 55000, 64000, "Bestseller"],
    ["NIKE AIR MAX", "Nike", 56000, 65000, "Hot"],
    ["NIKE SB", "Nike", 46000, 53000, "Everyday"],
    ["NEW BALANCE", "Lifestyle", 54000, 62000, "New"],
  ];
  const seeded = source.map(function (x, i) {
    return {
      id: "jk-" + String(i + 1).padStart(2, "0"),
      name: x[0],
      category: x[1],
      price: x[2],
      comparePrice: x[3],
      deliveryFee: 3500,
      tag: x[4],
      image: imageRoot + pics[i],
      fallback: fallback[i % fallback.length],
      sizes: [40, 41, 42, 43, 44, 45],
      stock: i === 9 ? 4 : 8 + ((i * 3) % 14),
      description:
        "A carefully selected statement pair made for confident everyday rotation, premium comfort and unmistakable street presence.",
      featured: i < 8,
      active: true,
      createdAt: Date.now() - i * 86400000,
    };
  });
  const defaults = {
    storeName: "Jones Kicks",
    phone: "0905 857 9374",
    notificationEmail: "",
    viewTracking: true,
    orderAlerts: true,
  };
  const state = {
    products: read(K.products, seeded),
    cart: read(K.cart, []),
    orders: read(K.orders, []),
    views: read(K.views, { total: 0, days: {} }),
    wish: read(K.wish, []),
    settings: read(K.settings, defaults),
    filter: "All",
    query: "",
    sort: "featured",
    size: null,
    adminTab: "dashboard",
    adminSearch: "",
    orderSearch: "",
    orderStatus: "",
    orderPaymentStatus: "",
    orderPage: 1,
    orderPages: 1,
    orderTotal: 0,
    upload: "",
    paymentBusy: false,
    hero: 0,
    timer: null,
    dashboard: null,
    analytics: null,
    messages: [],
    subscribers: [],
    coupons: [],
    promo: null,
    quote: null,
    trackedOrder: null,
    admin: null,
    adminLoading: false,
  };
  function read(key, f) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : JSON.parse(JSON.stringify(f));
    } catch (_) {
      return JSON.parse(JSON.stringify(f));
    }
  }
  function save(key, v) {
    try {
      localStorage.setItem(key, JSON.stringify(v));
      return true;
    } catch (_) {
      toast("This browser could not save the change.", "!");
      return false;
    }
  }
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>'"]/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      }[c];
    });
  }
  function safe(v, f) {
    const s = String(v || "");
    return /^https?:\/\//i.test(s) ||
      /^data:image\/(jpeg|png|webp|gif);base64,/i.test(s) ||
      /^\/?(?:assets\/images|uploads)\/[a-z0-9._/-]+$/i.test(s)
      ? esc(s)
      : esc(f || fallback[0]);
  }
  function money(v) {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(Number(v || 0));
  }
  function phoneHref(value) {
    return "tel:" + String(value || "").replace(/[^+\d]/g, "");
  }
  function day(off) {
    const d = new Date();
    d.setDate(d.getDate() + (off || 0));
    return d.toISOString().slice(0, 10);
  }
  function date(v) {
    return new Intl.DateTimeFormat("en-NG", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(v));
  }
  function product(id) {
    return state.products.find(function (p) {
      return p.id === id;
    });
  }
  const DEFAULT_SNEAKER_SIZES = [40, 41, 42, 43, 44, 45];
  const MAX_PRODUCT_SIZES = 30;
  function normalizeClientSize(value) {
    const blankOrBoolean =
        value == null ||
        typeof value === "boolean" ||
        (typeof value === "string" && value.trim() === ""),
      size = blankOrBoolean ? Number.NaN : Number(value),
      rounded = Math.round(size * 100) / 100;
    return Number.isFinite(size) &&
      size >= 1 &&
      size <= 100 &&
      Math.abs(size - rounded) <= Number.EPSILON * 100
      ? rounded
      : null;
  }
  function formatSize(value) {
    const size = normalizeClientSize(value);
    return size == null ? "" : String(size);
  }
  function sizeInventoryFor(p) {
    if (p && Array.isArray(p.sizeInventory) && p.sizeInventory.length) {
      return p.sizeInventory
        .map(function (entry) {
          return {
            size: normalizeClientSize(entry.size),
            stock: Math.max(0, Math.floor(Number(entry.stock || 0))),
          };
        })
        .filter(function (entry, index, entries) {
          return (
            entry.size != null &&
            entries.findIndex(function (candidate) {
              return candidate.size === entry.size;
            }) === index
          );
        })
        .sort(function (a, b) {
          return a.size - b.size;
        });
    }
    const sizes = Array.isArray(p && p.sizes) && p.sizes.length
        ? p.sizes.map(normalizeClientSize).filter(function (size) {
            return size != null;
          })
        : DEFAULT_SNEAKER_SIZES,
      total = Math.max(0, Math.floor(Number((p && p.stock) || 0))),
      base = sizes.length ? Math.floor(total / sizes.length) : 0,
      remainder = sizes.length ? total % sizes.length : 0;
    return sizes.map(function (size, index) {
      return { size: size, stock: base + (index < remainder ? 1 : 0) };
    });
  }
  function stockForSize(p, size) {
    const normalizedSize = normalizeClientSize(size);
    const entry = sizeInventoryFor(p).find(function (candidate) {
      return candidate.size === normalizedSize;
    });
    return entry ? entry.stock : 0;
  }
  function sizeButtons(p) {
    return sizeInventoryFor(p)
      .map(function (entry) {
        const soldOut = entry.stock < 1;
        return (
          '<button class="size-btn ' +
          (soldOut ? "sold-out" : "") +
          '" data-size="' +
          formatSize(entry.size) +
          '" type="button" ' +
          (soldOut
            ? 'disabled aria-disabled="true" title="Size ' +
              formatSize(entry.size) +
              ' is sold out"'
            : 'aria-label="Select EU size ' + formatSize(entry.size) + '"') +
          "><span>" +
          formatSize(entry.size) +
          "</span>" +
          (soldOut ? "<small>Sold out</small>" : "") +
          "</button>"
        );
      })
      .join("");
  }
  function sizeStockSummary(p) {
    return sizeInventoryFor(p)
      .map(function (entry) {
        return "EU " + formatSize(entry.size) + ": " + entry.stock;
      })
      .join(" • ");
  }
  function sizeStockBadges(p) {
    return sizeInventoryFor(p)
      .map(function (entry) {
        return (
          '<span class="size-stock-badge ' +
          (entry.stock < 1 ? "sold-out" : "") +
          '">EU ' +
          formatSize(entry.size) +
          " · " +
          entry.stock +
          "</span>"
        );
      })
      .join("");
  }
  function count() {
    return state.cart.reduce(function (n, x) {
      return n + x.qty;
    }, 0);
  }
  function cartHasInventoryIssue() {
    return state.cart.some(function (item) {
      const p = product(item.productId);
      return !p || stockForSize(p, item.size) < Number(item.qty || 0);
    });
  }
  function subtotal() {
    return state.cart.reduce(function (n, x) {
      const p = product(x.productId);
      return n + (p ? p.price * x.qty : 0);
    }, 0);
  }
  function delivery() {
    return state.cart.reduce(function (n, x) {
      const p = product(x.productId);
      return n + (p ? Number(p.deliveryFee || 0) * x.qty : 0);
    }, 0);
  }
  function total() {
    return subtotal() + delivery();
  }
  function discount() {
    return state.quote ? Number(state.quote.discount || 0) : 0;
  }
  function grandTotal() {
    return state.quote ? Number(state.quote.total || 0) : total();
  }
  function quotedSubtotal() {
    return state.quote ? Number(state.quote.subtotal || 0) : subtotal();
  }
  function quotedDelivery() {
    return state.quote ? Number(state.quote.deliveryFee || 0) : delivery();
  }
  function clearQuote() {
    state.quote = null;
    state.promo = null;
  }
  async function api(path, options) {
    const config = Object.assign({ headers: {} }, options || {});
    config.headers = Object.assign(
      { Accept: "application/json" },
      config.headers || {},
    );
    if (config.body && typeof config.body !== "string") {
      config.headers["Content-Type"] = "application/json";
      config.body = JSON.stringify(config.body);
    }
    if (
      !["GET", "HEAD"].includes(String(config.method || "GET").toUpperCase()) &&
      runtime.csrfToken
    )
      config.headers["x-csrf-token"] = runtime.csrfToken;
    const response = await fetch(path, config),
      payload =
        response.status === 204
          ? {}
          : await response.json().catch(function () {
              return {};
            });
    if (!response.ok)
      throw new Error(payload.error || "The request could not be completed.");
    return payload;
  }
  function visitorId() {
    let id = localStorage.getItem(K.visitor);
    if (!id) {
      id =
        window.crypto && crypto.randomUUID
          ? crypto.randomUUID()
          : "visitor-" + Date.now() + "-" + Math.random().toString(36).slice(2);
      localStorage.setItem(K.visitor, id);
    }
    return id;
  }
  function trackVisit(path) {
    if (
      runtime.api &&
      runtime.csrfToken &&
      state.settings.viewTracking !== false
    )
      api("/api/analytics/visit", {
        method: "POST",
        body: {
          visitorId: visitorId(),
          path: path,
          referrer: document.referrer,
        },
      }).catch(function () {});
  }
  function migrateCart() {
    state.cart = state.cart
      .map(function (item) {
        if (product(item.productId)) return item;
        const match = /^jk-(\d{2})$/.exec(item.productId),
          legacy = match && seeded[Number(match[1]) - 1],
          replacement =
            legacy &&
            state.products.find(function (p) {
              return p.name === legacy.name;
            });
        return replacement
          ? Object.assign({}, item, { productId: replacement.id })
          : null;
      })
      .filter(Boolean);
    state.wish = state.wish
      .map(function (id) {
        if (product(id)) return id;
        const match = /^jk-(\d{2})$/.exec(id),
          legacy = match && seeded[Number(match[1]) - 1],
          replacement =
            legacy &&
            state.products.find(function (p) {
              return p.name === legacy.name;
            });
        return replacement ? replacement.id : null;
      })
      .filter(Boolean);
    save(K.cart, state.cart);
    save(K.wish, state.wish);
  }
  function url() {
    let p = runtime.api
      ? location.pathname + location.search
      : location.hash.slice(1) || "/";
    if (!p.startsWith("/")) p = "/" + p;
    return new URL(p, "https://joneskick.local");
  }
  function href(p) {
    return runtime.api ? p : "#" + p;
  }
  function go(p) {
    close();
    if (!runtime.api) {
      if (location.hash === "#" + p) render();
      else location.hash = p;
    } else {
      history.pushState({}, "", p);
      render();
    }
    trackVisit(p.split("?")[0]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function icon(n) {
    const m = {
      menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
      bag: '<path d="M6 8h12l1 12H5L6 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',
      heart:
        '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.7-7.5 1.1-1.1a5.5 5.5 0 0 0 0-7.8Z"/>',
      close: '<path d="m6 6 12 12M18 6 6 18"/>',
      arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
      user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    };
    return (
      '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      (m[n] || "") +
      "</svg>"
    );
  }
  function brand() {
    return '<span class="brand-mark" aria-hidden="true"></span><span class="brand-word"><span>JONES</span> <em>KICKS</em></span>';
  }
  function img(p) {
    return (
      '<img src="' +
      safe(p.image, p.fallback) +
      '" data-fallback="' +
      safe(p.fallback, fallback[0]) +
      '" alt="' +
      esc(p.name) +
      '" loading="lazy">'
    );
  }
  function card(p, i) {
    const sold = p.stock < 1,
      w = state.wish.includes(p.id);
    return (
      '<article class="product-card" data-aos="fade-up" data-aos-delay="' +
      Math.min(i * 45, 220) +
      '"><div class="product-media">' +
      img(p) +
      '<span class="product-tag ' +
      (sold ? "sold" : "") +
      '">' +
      esc(sold ? "Sold out" : p.tag) +
      '</span><div class="product-actions"><button class="btn btn-light" data-quick="' +
      esc(p.id) +
      '" ' +
      (sold ? "disabled" : "") +
      ">" +
      (sold ? "Unavailable" : "Choose size") +
      '</button><button class="wish-btn ' +
      (w ? "active" : "") +
      '" data-wish="' +
      esc(p.id) +
      '" aria-label="Save ' +
      esc(p.name) +
      '">' +
      icon("heart") +
      '</button></div></div><div class="product-info"><p class="product-category">' +
      esc(p.category) +
      '</p><a class="product-name" href="' +
      href("/product/" + p.id) +
      '" data-route="/product/' +
      esc(p.id) +
      '"><strong>' +
      esc(p.name) +
      '</strong></a><div class="product-bottom"><div><span class="price">' +
      money(p.price) +
      '</span><span class="compare">' +
      money(p.comparePrice) +
      '</span></div><span class="rating">★★★★★</span></div></div></article>'
    );
  }
  function header(path) {
    const a = function (p) {
      return path === p || (p !== "/" && path.startsWith(p)) ? "active" : "";
    };
    document.getElementById("site-header").innerHTML =
      '<div class="announcement">New-season drops available • Product-specific sizes • Order securely online</div><div class="site-header"><div class="container header-inner"><button class="header-action menu-btn" data-menu aria-label="Open menu">' +
      icon("menu") +
      '</button><a class="brand" href="' +
      href("/") +
      '" data-route="/" aria-label="Jones Kicks home">' +
      brand() +
      '</a><nav class="nav"><a class="' +
      a("/") +
      '" href="' +
      href("/") +
      '" data-route="/">Home</a><a class="' +
      a("/shop") +
      '" href="' +
      href("/shop") +
      '" data-route="/shop">Sneakers</a><a class="' +
      a("/about") +
      '" href="' +
      href("/about") +
      '" data-route="/about">Our story</a><a class="' +
      a("/contact") +
      '" href="' +
      href("/contact") +
      '" data-route="/contact">Contact</a><a class="' +
      a("/track-order") +
      '" href="' +
      href("/track-order") +
      '" data-route="/track-order">Track order</a></nav><div class="header-actions"><button class="header-action" data-search-trigger aria-label="Search">' +
      icon("search") +
      '</button><a class="header-action" href="' +
      href("/wishlist") +
      '" data-route="/wishlist" aria-label="Saved favourites">' +
      icon("heart") +
      (state.wish.length
        ? '<span class="badge">' + state.wish.length + "</span>"
        : "") +
      '</a><a class="header-action" href="' +
      href("/admin") +
      '" data-route="/admin" aria-label="Admin">' +
      icon("user") +
      '</a><button class="header-action" data-cart-open aria-label="Shopping bag">' +
      icon("bag") +
      (count() ? '<span class="badge">' + count() + "</span>" : "") +
      '</button></div></div></div><nav class="mobile-nav" id="mobile-nav"><a href="' +
      href("/") +
      '" data-route="/">Home</a><a href="' +
      href("/shop") +
      '" data-route="/shop">Sneakers</a><a href="' +
      href("/about") +
      '" data-route="/about">Our story</a><a href="' +
      href("/contact") +
      '" data-route="/contact">Contact</a><a href="' +
      href("/wishlist") +
      '" data-route="/wishlist">Saved favourites</a><a href="' +
      href("/track-order") +
      '" data-route="/track-order">Track order</a><a href="' +
      href("/admin") +
      '" data-route="/admin">Admin</a></nav>';
  }
  function footer() {
    const phone = state.settings.phone || defaults.phone;
    document.getElementById("site-footer").innerHTML =
      '<footer class="site-footer"><div class="container"><div class="footer-top"><div class="footer-brand"><a class="brand" href="' +
      href("/") +
      '" data-route="/">' +
      brand() +
      '</a><p>Premium sneakers selected for people who move differently. Fresh silhouettes, confident style and a smoother way to order.</p></div><div><p class="footer-title">Shop</p><div class="footer-links"><a href="' +
      href("/shop") +
      '" data-route="/shop">All sneakers</a><a href="' +
      href("/shop?category=Nike") +
      '" data-route="/shop?category=Nike">Nike</a><a href="' +
      href("/shop?category=Jordan") +
      '" data-route="/shop?category=Jordan">Jordan</a><a href="' +
      href("/cart") +
      '" data-route="/cart">Shopping bag</a></div></div><div><p class="footer-title">Company</p><div class="footer-links"><a href="' +
      href("/about") +
      '" data-route="/about">Our story</a><a href="' +
      href("/contact") +
      '" data-route="/contact">Contact</a><a href="' +
      href("/track-order") +
      '" data-route="/track-order">Track an order</a><a href="' +
      href("/admin") +
      '" data-route="/admin">Admin access</a></div></div><div><p class="footer-title">Connect</p><div class="footer-links"><a href="https://wa.me/message/6BIGK72XFX23L1" target="_blank" rel="noopener">WhatsApp</a><a href="https://www.instagram.com/teejonesonly" target="_blank" rel="noopener">Instagram</a><a href="https://www.tiktok.com/@tee_jones247" target="_blank" rel="noopener">TikTok</a><a href="' +
      esc(phoneHref(phone)) +
      '">' +
      esc(phone) +
      '</a></div></div></div><div class="footer-bottom"><span>© ' +
      new Date().getFullYear() +
      " " +
      esc(state.settings.storeName || "Jones Kicks") +
      ". All rights reserved.</span><span>Premium sneakers • Sizes shown per pair</span></div></div></footer>";
  }
  function slide(i, k, t, o, c, image, fb) {
    return (
      '<div class="hero-slide ' +
      (i === 0 ? "active" : "") +
      '" data-hero-slide="' +
      i +
      '"><div class="hero-image"><img src="' +
      image +
      '" data-fallback="' +
      fb +
      '" alt="Jones Kicks premium collection"></div><div class="container"><div class="hero-content"><p class="eyebrow hero-kicker animate__animated animate__fadeInUp">' +
      k +
      '</p><h1 class="display hero-title animate__animated animate__fadeInUp">' +
      t +
      ' <span class="outline">' +
      o +
      '</span></h1><p class="hero-copy">' +
      c +
      '</p><div class="hero-actions"><a class="btn btn-acid" href="' +
      href("/shop") +
      '" data-route="/shop">Shop the collection ' +
      icon("arrow") +
      '</a><a class="btn btn-outline" href="' +
      href("/about") +
      '" data-route="/about">Discover Jones Kicks</a></div></div></div></div>'
    );
  }
  function home() {
    const featured = state.products
      .filter(function (p) {
        return p.featured;
      })
      .slice(0, 8);
    return (
      '<section class="hero">' +
      slide(
        0,
        "New season collection",
        "STEP INTO",
        "YOUR STYLE",
        "Top silhouettes, confident comfort and the freshest street-ready pairs — all in one premium collection.",
        imageRoot + "pics4.jpeg",
        fallback[0],
      ) +
      slide(
        1,
        "Curated weekly",
        "BUILT FOR",
        "THE BOLD",
        "Discover statement sneakers that turn everyday movement into personal expression.",
        imageRoot + "pics13.jpeg",
        fallback[3],
      ) +
      slide(
        2,
        "Sizes for every pair",
        "FIND YOUR",
        "PERFECT PAIR",
        "Choose your size, add delivery details and place your order in a few simple steps.",
        imageRoot + "pics21.jpeg",
        fallback[7],
      ) +
      '<div class="hero-meta"><div class="hero-pager"><button class="hero-dot active" data-hero-dot="0"></button><button class="hero-dot" data-hero-dot="1"></button><button class="hero-dot" data-hero-dot="2"></button></div><div class="hero-stat"><strong>EU</strong><span>Custom<br>sizes</span></div></div></section><div class="marquee"><div class="marquee-track"><span>Fresh drops</span><span>Premium selection</span><span>Secure ordering</span><span>Product-specific sizes</span><span>Style without limits</span><span>Fresh drops</span><span>Premium selection</span><span>Secure ordering</span><span>Product-specific sizes</span><span>Style without limits</span></div></div><section class="section-sm"><div class="container"><div class="trust-grid" data-aos="fade-up"><div class="trust-item"><span class="trust-icon">✦</span><h3>Freshly curated</h3><p>A focused edit of standout everyday and limited silhouettes.</p></div><div class="trust-item"><span class="trust-icon">⌁</span><h3>Easy size selection</h3><p>Choose from every EU size currently offered for the sneaker.</p></div><div class="trust-item"><span class="trust-icon">✓</span><h3>Smooth ordering</h3><p>Bag your pair, add delivery details and confirm in minutes.</p></div><div class="trust-item"><span class="trust-icon">↗</span><h3>Human support</h3><p>Need help? Continue the conversation directly on WhatsApp.</p></div></div></div></section><section class="section"><div class="container"><div class="section-head"><div><p class="eyebrow">Shop the drop</p><h2 class="display section-title">Fresh on the shelf</h2></div><p class="section-copy">Meet the pairs currently setting the pace. Choose a sneaker, select your size and build your rotation.</p></div><div class="product-grid">' +
      featured.map(card).join("") +
      '</div><div style="text-align:center;margin-top:40px"><a class="btn btn-outline" href="' +
      href("/shop") +
      '" data-route="/shop">View all sneakers ' +
      icon("arrow") +
      '</a></div></div></section><section class="section-sm"><div class="container"><div class="category-strip"><a class="category-card" href="' +
      href("/shop?category=Limited") +
      '" data-route="/shop?category=Limited" data-aos="fade-up"><img src="' +
      imageRoot +
      'pics10.jpeg" data-fallback="' +
      fallback[4] +
      '" alt="Limited collection"><div class="category-content"><h3>Limited heat</h3><p>Statement pairs for a rotation nobody forgets.</p><span class="btn btn-light">Shop limited</span></div></a><a class="category-card" href="' +
      href("/shop?category=Nike") +
      '" data-route="/shop?category=Nike" data-aos="fade-up"><img src="' +
      imageRoot +
      'pics15.jpeg" data-fallback="' +
      fallback[6] +
      '" alt="Nike collection"><div class="category-content"><h3>Nike edit</h3><p>Icons, Dunks and everyday favourites.</p><span class="btn btn-light">Explore Nike</span></div></a><a class="category-card" href="' +
      href("/shop?category=Lifestyle") +
      '" data-route="/shop?category=Lifestyle" data-aos="fade-up"><img src="' +
      imageRoot +
      'pics21.jpeg" data-fallback="' +
      fallback[9] +
      '" alt="Lifestyle collection"><div class="category-content"><h3>Daily rotation</h3><p>Comfort that still knows how to make an entrance.</p><span class="btn btn-light">Shop lifestyle</span></div></a></div></div></section><section class="story section"><div class="container story-grid"><div class="story-collage" data-aos="fade-right"><div class="story-main"><img src="' +
      imageRoot +
      'logo.jpeg" data-fallback="' +
      fallback[1] +
      '" alt="Jones Kicks culture"></div><div class="story-card"><strong>20+</strong><span>fresh styles in the current collection</span></div></div><div data-aos="fade-left"><p class="eyebrow">More than footwear</p><h2 class="display story-title">Your plug for premium sneakers.</h2><p class="story-copy">Jones Kicks was built for people who want the freshest pairs without unnecessary stress. From iconic classics to new-season releases, every selection is made to help you step up your style.</p><ul class="story-list"><li>Curated silhouettes for modern street style</li><li>Every available size shown before checkout</li><li>Direct support before and after your order</li></ul><a class="btn btn-acid" href="' +
      href("/about") +
      '" data-route="/about">Read our story</a></div></div></section><section class="section"><div class="container"><div class="testimonial-grid"><div class="quote-card" data-aos="fade-up"><div class="quote-stars">★★★★★</div><p class="quote-text">“The process was straightforward, the size was right and the pair looked even better in person. Jones Kicks is now my first stop.”</p><div class="quote-person"><span class="avatar">TO</span><div><strong>Tobi O.</strong><span>Verified customer</span></div></div></div><div class="newsletter-card" data-aos="fade-up"><h3>Be first to the next drop.</h3><p>Get new-arrival updates and private offers sent to your WhatsApp.</p><form class="newsletter-form" id="newsletter-form"><input name="phone" inputmode="tel" placeholder="Your WhatsApp number" required><button class="btn btn-light">Join</button></form></div></div></div></section>'
    );
  }
  function shop(u) {
    const c = u.searchParams.get("category");
    if (c) state.filter = c;
    let list = state.products.slice();
    if (state.filter !== "All")
      list = list.filter(function (p) {
        return p.category.toLowerCase() === state.filter.toLowerCase();
      });
    if (state.query)
      list = list.filter(function (p) {
        return (p.name + " " + p.category)
          .toLowerCase()
          .includes(state.query.toLowerCase());
      });
    if (state.sort === "low")
      list.sort(function (a, b) {
        return a.price - b.price;
      });
    if (state.sort === "high")
      list.sort(function (a, b) {
        return b.price - a.price;
      });
    if (state.sort === "new")
      list.sort(function (a, b) {
        return b.createdAt - a.createdAt;
      });
    const cats = ["All"].concat(
      Array.from(
        new Set(
          state.products.map(function (p) {
            return p.category;
          }),
        ),
      ),
    );
    return (
      '<section class="page-hero"><div class="container"><div class="breadcrumbs"><a href="' +
      href("/") +
      '" data-route="/">Home</a><span>/</span><span>Sneakers</span></div><p class="eyebrow">The full collection</p><h1 class="display page-title">Find your next pair.</h1></div></section><div class="shop-toolbar"><div class="container toolbar-row"><form class="search-box" id="shop-search"><input name="query" type="search" value="' +
      esc(state.query) +
      '" placeholder="Search sneakers"><button>' +
      icon("search") +
      '</button></form><div class="filter-chips">' +
      cats
        .map(function (x) {
          return (
            '<button class="filter-chip ' +
            (state.filter === x ? "active" : "") +
            '" data-filter="' +
            esc(x) +
            '">' +
            esc(x) +
            "</button>"
          );
        })
        .join("") +
      '</div><select class="select-control" id="sort-select"><option value="featured">Featured</option><option value="new" ' +
      (state.sort === "new" ? "selected" : "") +
      '>Newest</option><option value="low" ' +
      (state.sort === "low" ? "selected" : "") +
      '>Price: low</option><option value="high" ' +
      (state.sort === "high" ? "selected" : "") +
      '>Price: high</option></select></div></div><section class="section-sm"><div class="container"><div class="results-line"><span>' +
      list.length +
      ' sneakers found</span><span>Available sizes are shown on every sneaker</span></div><div class="product-grid">' +
      (list.length
        ? list.map(card).join("")
        : '<div class="empty-state"><h2>No sneakers found</h2><p>Try another keyword or clear the current filter.</p><button class="btn btn-outline" data-clear-filter>Clear filters</button></div>') +
      "</div></div></section>"
    );
  }
  function detail(id) {
    const p = product(id);
    if (!p) return notFound();
    const related = state.products
      .filter(function (x) {
        return x.id !== id && x.category === p.category;
      })
      .slice(0, 4);
    return (
      '<section class="detail-layout"><div class="detail-gallery"><div class="breadcrumbs"><a href="' +
      href("/") +
      '" data-route="/">Home</a><span>/</span><a href="' +
      href("/shop") +
      '" data-route="/shop">Sneakers</a><span>/</span><span>' +
      esc(p.name) +
      '</span></div><div class="detail-image">' +
      img(p) +
      '<span class="product-tag">' +
      esc(p.tag) +
      '</span></div></div><div class="detail-panel"><div class="detail-inner"><p class="eyebrow">' +
      esc(p.category) +
      '</p><h1 class="display detail-name">' +
      esc(p.name) +
      '</h1><div><span class="price detail-price">' +
      money(p.price) +
      '</span><span class="compare">' +
      money(p.comparePrice) +
      '</span></div><p class="detail-desc">' +
      esc(p.description) +
      '</p><div class="size-label"><span>Select your size</span><span>Unavailable sizes are marked sold out</span></div><div class="size-grid">' +
      sizeButtons(p) +
      '</div><div class="detail-actions"><button class="btn btn-acid btn-block" data-add="' +
      esc(p.id) +
      '" disabled>Add to bag</button><button class="round-btn ' +
      (state.wish.includes(p.id) ? "active" : "") +
      '" data-wish="' +
      esc(p.id) +
      '">' +
      icon("heart") +
      '</button></div><div class="detail-meta"><div><strong>Availability</strong><span>' +
      (p.stock
        ? p.stock + " pairs currently available"
        : "Currently sold out") +
      "</span></div><div><strong>Delivery fee</strong><span>" +
      money(p.deliveryFee || 0) +
      " per pair</span></div><div><strong>Ordering</strong><span>Select size, add delivery details and complete checkout</span></div><div><strong>Support</strong><span>Size help available on WhatsApp</span></div></div></div></div></section>" +
      (related.length
        ? '<section class="section"><div class="container"><div class="section-head"><div><p class="eyebrow">You may also like</p><h2 class="display section-title">Keep exploring</h2></div></div><div class="product-grid">' +
          related.map(card).join("") +
          "</div></div></section>"
        : "")
    );
  }
  function rows(mini) {
    return state.cart
      .map(function (x) {
        const p = product(x.productId);
        if (!p) return "";
        const available = stockForSize(p, x.size),
          stockWarning =
            available < x.qty
              ? '<span class="cart-stock-warning">' +
                (available < 1
                  ? "This size is now sold out"
                  : "Only " + available + " left in this size") +
                "</span>"
              : "";
        if (mini)
          return (
            '<div class="mini-item"><div class="mini-thumb">' +
            img(p) +
            "</div><div><h4>" +
            esc(p.name) +
            "</h4><p>Size " +
            x.size +
            " • Qty " +
            x.qty +
            " • Delivery " +
            money((p.deliveryFee || 0) * x.qty) +
            "</p>" +
            stockWarning +
            "</div><strong>" +
            money(p.price * x.qty) +
            "</strong></div>"
          );
        return (
          '<div class="cart-row"><div class="cart-thumb">' +
          img(p) +
          '</div><div><h3 class="cart-name">' +
          esc(p.name) +
          '</h3><div class="cart-meta">Size: EU ' +
          x.size +
          " • " +
          esc(p.category) +
          " • Delivery " +
          money((p.deliveryFee || 0) * x.qty) +
          "</div>" +
          stockWarning +
          '<div class="qty"><button data-qty="down" data-line="' +
          esc(x.productId) +
          "|" +
          x.size +
          '">−</button><span>' +
          x.qty +
          '</span><button data-qty="up" data-line="' +
          esc(x.productId) +
          "|" +
          x.size +
          '" ' +
          (x.qty >= available ? "disabled" : "") +
          '>+</button></div></div><div class="cart-price"><strong>' +
          money(p.price * x.qty) +
          '</strong><button class="remove-link" data-remove="' +
          esc(x.productId) +
          "|" +
          x.size +
          '">Remove</button></div></div>'
        );
      })
      .join("");
  }
  function summary(button) {
    return (
      '<div class="panel summary"><h2>Order summary</h2><div class="summary-line"><span>Products</span><strong>' +
      money(quotedSubtotal()) +
      '</strong></div><div class="summary-line"><span>Product delivery fees</span><strong>' +
      money(quotedDelivery()) +
      '</strong></div>' +
      (discount()
        ? '<div class="summary-line discount-line"><span>Promo ' +
          esc(state.promo?.code || "") +
          '</span><strong>−' +
          money(discount()) +
          "</strong></div>"
        : "") +
      '<p class="summary-help">Delivery is calculated from the fee set by the admin for each pair.</p><div class="promo"><input id="promo-code" value="' +
      esc(state.promo?.code || "") +
      '" placeholder="Promo code"><button data-promo>' +
      (state.promo ? "Recheck" : "Apply") +
      "</button>" +
      (state.promo
        ? '<button class="promo-remove" data-promo-remove type="button">Remove</button>'
        : "") +
      '</div><div class="summary-line total"><span>Total</span><strong>' +
      money(grandTotal()) +
      "</strong></div>" +
      button +
      '<p class="secure-note">Secure order flow • Payment details are handled by Paystack</p></div>'
    );
  }
  function cart() {
    if (!state.cart.length)
      return (
        '<section class="success-wrap"><div class="success-card"><span class="success-icon">⌁</span><p class="eyebrow">Your bag</p><h1 class="display">Nothing here yet.</h1><p class="muted">Your next favourite pair is waiting in the collection.</p><a class="btn btn-acid" href="' +
        href("/shop") +
        '" data-route="/shop">Browse sneakers</a></div></section>'
      );
    return (
      '<section class="page-hero"><div class="container"><div class="breadcrumbs"><a href="' +
      href("/") +
      '" data-route="/">Home</a><span>/</span><span>Shopping bag</span></div><p class="eyebrow">Your selection</p><h1 class="display page-title">Shopping bag.</h1></div></section><section class="section-sm"><div class="container cart-layout"><div class="panel"><div class="panel-head"><h2>' +
      count() +
      " item" +
      (count() === 1 ? "" : "s") +
      ' in your bag</h2></div><div class="cart-list">' +
      rows(false) +
      "</div></div>" +
      summary(
        '<a class="btn btn-acid btn-block" href="' +
          href("/checkout") +
          '" data-route="/checkout">Continue to checkout</a>',
      ) +
      "</div></section>"
    );
  }
  function checkout() {
    if (!state.cart.length) return cart();
    const paymentIssue = url().searchParams.get("payment"),
      inventoryReady = !cartHasInventoryIssue(),
      keyMatchesEnvironment =
        (runtime.paymentEnvironment === "live" &&
          /^pk_live_[A-Za-z0-9]+$/.test(runtime.paystackPublicKey)) ||
        (runtime.paymentEnvironment === "test" &&
          /^pk_test_[A-Za-z0-9]+$/.test(runtime.paystackPublicKey)),
      paymentReady =
        runtime.api &&
        runtime.paymentConfigured &&
        keyMatchesEnvironment &&
        inventoryReady,
      paymentNote = !inventoryReady
        ? "Update your bag before payment because a selected size is sold out or has insufficient stock."
        : !runtime.api
        ? "Catalogue preview only. Start the Node.js backend to enable secure Paystack checkout."
        : !paymentReady
          ? "Secure Paystack checkout is not configured on this server yet."
          : runtime.paymentEnvironment === "live"
            ? "Live Paystack checkout is ready. You will be redirected to Paystack to complete payment securely."
            : "Paystack test checkout is active for local QA. Production startup only accepts live Paystack keys.";
    return (
      '<section class="page-hero"><div class="container"><div class="breadcrumbs"><a href="' +
      href("/cart") +
      '" data-route="/cart">Bag</a><span>/</span><span>Checkout</span></div><p class="eyebrow">One final step</p><h1 class="display page-title">Delivery & payment.</h1></div></section><section class="section-sm"><div class="container checkout-layout"><form class="panel checkout-form" id="checkout-form">' +
      (paymentIssue
        ? '<div class="payment-alert"><strong>Payment was not completed.</strong><span>Your bag is still here. Confirm your details and try again, or contact Jones Kicks if you were debited.</span></div>'
        : "") +
      '<div class="form-section"><div class="form-section-head"><span class="step-no">01</span><h2>Contact information</h2></div><div class="field-grid"><div class="field"><label>Full name</label><input name="fullName" autocomplete="name" required placeholder="Your full name"></div><div class="field"><label>Email address</label><input name="email" type="email" autocomplete="email" required placeholder="you@example.com"></div><div class="field full"><label>Phone number</label><input name="phone" autocomplete="tel" inputmode="tel" required placeholder="e.g. 0801 234 5678"></div></div></div><div class="form-section"><div class="form-section-head"><span class="step-no">02</span><h2>Delivery details</h2></div><div class="field-grid"><div class="field full"><label>Delivery address</label><input name="address" autocomplete="street-address" required placeholder="House number, street and area"></div><div class="field"><label>City / town</label><input name="city" required></div><div class="field"><label>State</label><input name="region" required></div><div class="field full"><label>Delivery note (optional)</label><textarea name="notes" placeholder="Landmark or helpful instruction"></textarea></div></div></div><div class="form-section"><div class="form-section-head"><span class="step-no">03</span><h2>Payment method</h2></div><label class="payment-option"><input type="radio" name="payment" value="online" checked><span><strong>Paystack secure payment</strong><span>Choose card, bank transfer, USSD or another available Paystack channel.</span></span></label><p class="prototype-note">' +
      esc(paymentNote) +
      '</p></div><button class="btn btn-acid btn-block" type="submit"' +
      (paymentReady ? "" : " disabled") +
      ">" +
      (paymentReady ? "Pay securely • " + money(grandTotal()) : "Paystack checkout unavailable") +
      '</button></form><aside class="panel checkout-summary"><div class="admin-card-head"><h3>Your order</h3><a href="' +
      href("/cart") +
      '" data-route="/cart">Edit bag</a></div><div class="mini-items">' +
      rows(true) +
      '</div><div class="summary-line"><span>Products</span><strong>' +
      money(quotedSubtotal()) +
      '</strong></div><div class="summary-line"><span>Product delivery fees</span><strong>' +
      money(quotedDelivery()) +
      '</strong></div>' +
      (discount()
        ? '<div class="summary-line discount-line"><span>Promo ' +
          esc(state.promo?.code || "") +
          '</span><strong>−' +
          money(discount()) +
          "</strong></div>"
        : "") +
      '<div class="promo checkout-promo"><input id="promo-code" value="' +
      esc(state.promo?.code || "") +
      '" placeholder="Promo code"><button data-promo type="button">' +
      (state.promo ? "Recheck" : "Apply") +
      "</button>" +
      (state.promo
        ? '<button class="promo-remove" data-promo-remove type="button">Remove</button>'
        : "") +
      '</div><div class="summary-line total"><span>Total</span><strong>' +
      money(grandTotal()) +
      "</strong></div></aside></div></section>"
    );
  }
  function success(u) {
    const ref =
        u.searchParams.get("order") ||
        sessionStorage.getItem("jk_last_order") ||
        "JK-PREVIEW",
      o = state.orders.find(function (x) {
        return x.id === ref;
      }),
      paid = Boolean(
        o && String(o.paymentStatus || "").toLowerCase().includes("paid"),
      );
    let eyebrow = "Secure verification",
      title = "Confirming your order.",
      lead =
        "We are loading the private order record before showing a payment confirmation.",
      note = runtime.api
        ? "If this page was opened directly and verification cannot complete, use Track Order with your order reference, checkout email and phone number."
        : "This order belongs to the static interface preview.";

    if (o && paid && o.status === "Needs review") {
      eyebrow = "Payment confirmed";
      title = "Payment received. We are reviewing your order.";
      lead =
        "Your payment is verified, but the order needs a stock or fulfilment check before it can be reserved for delivery.";
    } else if (o && paid) {
      eyebrow = "Payment confirmed";
      title = "Your pair is reserved.";
      lead =
        "Thanks for shopping Jones Kicks. Keep your order reference below — you can use it to check fulfilment and delivery progress at any time.";
    } else if (o) {
      eyebrow = "Payment pending";
      title = "Your order is recorded.";
      lead =
        "The order exists, but payment has not yet been verified. Do not treat it as paid until the status below changes to paid.";
    }

    return (
      '<section class="success-wrap"><div class="success-card animate__animated animate__fadeInUp"><span class="success-icon">' +
      (paid ? "✓" : "↻") +
      '</span><p class="eyebrow">' +
      esc(eyebrow) +
      '</p><h1 class="display">' +
      esc(title) +
      '</h1><p class="muted">' +
      esc(lead) +
      '</p><span class="order-ref">Order ' +
      esc(ref) +
      "</span>" +
      (o
        ? '<div class="receipt-summary"><div class="summary-line"><span>Payment</span><strong>' +
          esc(o.paymentStatus) +
          '</strong></div><div class="summary-line"><span>Fulfilment</span><strong>' +
          esc(o.status) +
          '</strong></div>' +
          (o.promoCode
            ? '<div class="summary-line"><span>Promo</span><strong>' +
              esc(o.promoCode) +
              "</strong></div>"
            : "") +
          (Number(o.discount || 0)
            ? '<div class="summary-line discount-line"><span>Discount</span><strong>−' +
              money(o.discount) +
              "</strong></div>"
            : "") +
          '<div class="summary-line total"><span>Total</span><strong>' +
          money(o.total) +
          "</strong></div></div>" +
          orderTimeline(o)
        : '<p class="muted">Verified order details are not available in this browser session yet.</p>') +
      '<div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:22px"><a class="btn btn-acid" href="' +
      href("/track-order") +
      '" data-route="/track-order">Track this order</a><a class="btn btn-outline" href="' +
      href("/shop") +
      '" data-route="/shop">Continue shopping</a><a class="btn btn-outline" href="https://wa.me/message/6BIGK72XFX23L1" target="_blank" rel="noopener">Chat on WhatsApp</a></div><p class="prototype-note" style="text-align:left">' +
      esc(note) +
      "</p></div></section>"
    );
  }
  function about() {
    return (
      '<section class="about-hero"><div class="about-copy"><p class="eyebrow">Meet Jones Kicks</p><h1 class="display">Style starts from the ground up.</h1><p>Hey there — welcome to Jones Kicks, your plug for premium sneakers. We bring together classic styles and fresh releases so you can step confidently without overcomplicating the search.</p><a class="btn btn-acid" href="' +
      href("/shop") +
      '" data-route="/shop">Explore sneakers</a></div><div class="about-visual"><img src="' +
      imageRoot +
      'pics4.jpeg" data-fallback="' +
      fallback[2] +
      '" alt="Jones Kicks style"><div class="about-badge"><strong>EU</strong><span>Every available size, clearly displayed</span></div></div></section><section class="section"><div class="container"><div class="section-head"><div><p class="eyebrow">What guides us</p><h2 class="display section-title">Made for better steps.</h2></div><p class="section-copy">A focused collection, a clearer way to choose and a human team when you need help.</p></div><div class="values-grid"><article class="value-card"><span class="value-no">01</span><h3>Fresh selection</h3><p>Wearable classics, standout drops and versatile daily pairs.</p></article><article class="value-card"><span class="value-no">02</span><h3>Simple experience</h3><p>From selecting size to adding your address, ordering feels quick and clear.</p></article><article class="value-card"><span class="value-no">03</span><h3>Personal support</h3><p>Questions about a pair or size? We are one WhatsApp message away.</p></article></div></div></section>'
    );
  }
  function contact() {
    const phone = state.settings.phone || defaults.phone;
    return `<section class="page-hero"><div class="container"><div class="breadcrumbs"><a href="${href("/")}" data-route="/">Home</a><span>/</span><span>Contact</span></div><p class="eyebrow">Talk to us</p><h1 class="display page-title">We are one message away.</h1></div></section><section class="section-sm"><div class="container contact-layout"><div class="contact-card"><p class="eyebrow">Jones Kicks support</p><h2 class="display">Let us help you find the pair.</h2><div class="contact-links"><a class="contact-link" href="${esc(phoneHref(phone))}"><div><strong>Call us</strong><span>${esc(phone)}</span></div><b>↗</b></a><a class="contact-link" href="https://wa.me/message/6BIGK72XFX23L1" target="_blank" rel="noopener"><div><strong>WhatsApp</strong><span>Fast order and sizing support</span></div><b>↗</b></a><a class="contact-link" href="https://www.instagram.com/teejonesonly" target="_blank" rel="noopener"><div><strong>Instagram</strong><span>@teejonesonly</span></div><b>↗</b></a><a class="contact-link" href="https://www.tiktok.com/@tee_jones247" target="_blank" rel="noopener"><div><strong>TikTok</strong><span>@tee_jones247</span></div><b>↗</b></a></div></div><form class="contact-form-card" id="contact-form"><p class="eyebrow">Send an enquiry</p><h2 style="margin:0 0 26px;font-size:27px">How can we help?</h2><div class="field-grid"><div class="field"><label>Your name</label><input name="name" required></div><div class="field"><label>Phone number</label><input name="phone" required></div><div class="field full"><label>Message</label><textarea name="message" required placeholder="Tell us the sneaker or size you need"></textarea></div></div><button class="btn btn-acid" style="margin-top:20px">Send enquiry</button><p class="prototype-note">Your enquiry is saved securely for Jones Kicks support.</p></form></div></section>`;
  }
  function wishlist() {
    const list = state.products.filter(function (p) {
      return state.wish.includes(p.id) && p.active !== false;
    });
    if (!list.length)
      return (
        '<section class="success-wrap"><div class="success-card"><span class="success-icon">♡</span><p class="eyebrow">Saved favourites</p><h1 class="display">Your shortlist is empty.</h1><p class="muted">Tap the heart on any sneaker to keep it here for later.</p><a class="btn btn-acid" href="' +
        href("/shop") +
        '" data-route="/shop">Explore sneakers</a></div></section>'
      );
    return (
      '<section class="page-hero"><div class="container"><div class="breadcrumbs"><a href="' +
      href("/") +
      '" data-route="/">Home</a><span>/</span><span>Favourites</span></div><p class="eyebrow">Your saved pairs</p><h1 class="display page-title">Favourites.</h1></div></section><section class="section-sm"><div class="container"><div class="section-head"><div><h2>' +
      list.length +
      " saved pair" +
      (list.length === 1 ? "" : "s") +
      '</h2></div><a class="btn btn-outline" href="' +
      href("/shop") +
      '" data-route="/shop">Keep browsing</a></div><div class="product-grid">' +
      list.map(card).join("") +
      "</div></div></section>"
    );
  }
  function orderTimeline(order) {
    const history = (order && order.statusHistory) || [];
    if (!history.length) return "";
    return (
      '<div class="order-timeline">' +
      history
        .map(function (entry, index) {
          return (
            '<div class="timeline-step ' +
            (index === history.length - 1 ? "current" : "") +
            '"><span></span><div><strong>' +
            esc(entry.status) +
            "</strong><small>" +
            date(entry.changedAt) +
            "</small></div></div>"
          );
        })
        .join("") +
      "</div>"
    );
  }
  function trackOrder() {
    const o = state.trackedOrder;
    return (
      '<section class="page-hero"><div class="container"><div class="breadcrumbs"><a href="' +
      href("/") +
      '" data-route="/">Home</a><span>/</span><span>Track order</span></div><p class="eyebrow">Delivery updates</p><h1 class="display page-title">Track your order.</h1></div></section><section class="section-sm"><div class="container track-layout"><form class="panel checkout-form" id="track-order-form"><div class="form-section"><div class="form-section-head"><span class="step-no">01</span><h2>Find your order</h2></div><p class="muted">Enter the same email and phone number used at checkout.</p><div class="field-grid"><div class="field full"><label>Order reference</label><input name="reference" required placeholder="JK-20260907-XXXXXXXX"></div><div class="field"><label>Email address</label><input name="email" type="email" required></div><div class="field"><label>Phone number</label><input name="phone" required></div></div></div><button class="btn btn-acid btn-block">Check order status</button></form><aside class="panel tracking-result">' +
      (o
        ? '<p class="eyebrow">Order ' +
          esc(o.reference) +
          '</p><h2 style="margin-top:8px">' +
          esc(o.status) +
          '</h2><div class="summary-line"><span>Payment</span><strong>' +
          esc(o.paymentStatus) +
          '</strong></div><div class="summary-line"><span>Total</span><strong>' +
          money(o.total) +
          '</strong></div><div class="summary-line"><span>Placed</span><strong>' +
          date(o.createdAt) +
          "</strong></div>" +
          orderTimeline(o)
        : '<div class="empty-state"><span class="success-icon">↗</span><h2>Your delivery journey will appear here.</h2><p>We will show payment confirmation and every fulfilment update recorded by Jones Kicks.</p></div>') +
      "</aside></div></section>"
    );
  }
  function notFound() {
    return (
      '<section class="success-wrap"><div class="success-card"><span class="success-icon">?</span><p class="eyebrow">404</p><h1 class="display">Wrong turn.</h1><p class="muted">The page does not exist, but the latest sneakers are right this way.</p><a class="btn btn-acid" href="' +
      href("/shop") +
      '" data-route="/shop">Shop sneakers</a></div></section>'
    );
  }
  function adminLogin() {
    const access = runtime.api
      ? '<div class="demo-credentials"><strong>Protected administrator access</strong><br>Use the administrator account created with <code>npm run seed</code>.</div>'
      : '<div class="demo-credentials"><strong>Static preview access</strong><br>Email: admin@joneskick.com<br>Password: admin123</div>';
    return (
      '<div class="admin-login"><section class="admin-login-art"><a class="brand" href="' +
      href("/") +
      '" data-route="/">' +
      brand() +
      '</a><div><p class="eyebrow">Store command centre</p><h1 class="display">Manage every move.</h1><p>Catalogue, incoming orders, sales activity and store visibility — together in one clean workspace.</p></div></section><section class="admin-login-panel"><form class="login-box" id="admin-login"><a class="brand" href="' +
      href("/") +
      '" data-route="/">' +
      brand() +
      '</a><h2>Welcome back</h2><p>Sign in to open the admin dashboard.</p><div class="field"><label>Email address</label><input name="email" type="email" autocomplete="username" required placeholder="admin@joneskick.com"></div><div class="field" style="margin-top:15px"><label>Password</label><input name="password" type="password" autocomplete="current-password" required placeholder="••••••••"></div><button class="btn btn-acid btn-block" style="margin-top:21px">Sign in securely</button>' +
      access +
      "</form></section></div>"
    );
  }
  function sidebar() {
    const items = [
      ["dashboard", "⌂", "Overview"],
      ["catalogue", "◇", "Catalogue"],
      ["orders", "▤", "Orders"],
      ["promotions", "%", "Promotions"],
      ["messages", "✉", "Messages"],
      ["subscribers", "+", "Subscribers"],
      ["analytics", "↗", "Analytics"],
      ["settings", "⚙", "Settings"],
    ];
    return (
      '<aside class="admin-sidebar"><a class="brand" href="' +
      href("/") +
      '" data-route="/">' +
      brand() +
      '</a><nav class="admin-nav">' +
      items
        .map(function (x) {
          return (
            '<button class="' +
            (state.adminTab === x[0] ? "active" : "") +
            '" data-admin-tab="' +
            x[0] +
            '"><span class="nav-symbol">' +
            x[1] +
            "</span><span>" +
            x[2] +
            "</span></button>"
          );
        })
        .join("") +
      '</nav><div class="admin-sidebar-foot"><button data-admin-logout>Sign out</button></div></aside>'
    );
  }
  function viewDays() {
    const x = [];
    for (let i = -6; i <= 0; i++) {
      const k = day(i),
        d = new Date(k + "T12:00:00");
      x.push({
        key: k,
        label: d.toLocaleDateString("en-NG", { weekday: "short" }),
        count: Number(state.views.days[k] || 0),
      });
    }
    return x;
  }
  function ordersTable(list) {
    if (!list.length)
      return '<div class="empty-state" style="padding:45px 20px"><h2>No orders yet</h2><p>Customer orders will appear here after checkout begins.</p></div>';
    return (
      '<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th></tr></thead><tbody>' +
      list
        .map(function (o) {
          const paid = String(o.paymentStatus || "")
            .toLowerCase()
            .includes("paid");
          return (
            '<tr><td><button style="border:0;background:none;padding:0;cursor:pointer" data-order-view="' +
            esc(o.id) +
            '"><strong>' +
            esc(o.id) +
            "</strong></button></td><td>" +
            esc(o.customer.fullName) +
            '<br><span class="muted">' +
            esc(o.customer.phone) +
            "</span></td><td><strong>" +
            money(o.total) +
            '</strong></td><td><span class="status ' +
            (paid ? "" : "pending") +
            '">' +
            esc(o.paymentStatus) +
            '</span></td><td><span class="status ' +
            (o.status === "New" ? "pending" : "") +
            '">' +
            esc(o.status) +
            "</span></td><td>" +
            date(o.createdAt) +
            "</td></tr>"
          );
        })
        .join("") +
      "</tbody></table></div>"
    );
  }
  function dashboard() {
    const metrics = state.dashboard && state.dashboard.metrics,
      rev = metrics
        ? metrics.revenue
        : state.orders.reduce(function (n, o) {
            return n + Number(o.total || 0);
          }, 0),
      orderCount = metrics ? metrics.orders : state.orders.length,
      visitorCount = metrics
        ? metrics.totalVisitors
        : Number(state.views.total || 0),
      catalogueCount = metrics ? metrics.products : state.products.length,
      fresh = metrics
        ? Number(metrics.newOrders || 0)
        : state.orders.filter(function (o) {
            return o.status === "New";
          }).length,
      days = viewDays(),
      max = Math.max.apply(
        null,
        days
          .map(function (x) {
            return x.count;
          })
          .concat([1]),
      ),
      top = state.products.slice(0, 5);
    return (
      '<div class="admin-heading"><div><h2>Store overview</h2><p>Live catalogue, payment, order and visitor activity.</p></div><button class="btn btn-acid" data-new-product>Add sneaker</button></div><div class="kpi-grid"><div class="kpi"><div class="kpi-top"><span>Unique visitors</span><span class="kpi-icon">↗</span></div><strong>' +
      Number(visitorCount).toLocaleString() +
      '</strong><small>Tracked across the website</small></div><div class="kpi"><div class="kpi-top"><span>Total orders</span><span class="kpi-icon">▤</span></div><strong>' +
      orderCount +
      "</strong><small>" +
      fresh +
      ' new paid orders</small></div><div class="kpi"><div class="kpi-top"><span>Paid revenue</span><span class="kpi-icon">₦</span></div><strong>' +
      money(rev) +
      '</strong><small>Verified payment value</small></div><div class="kpi"><div class="kpi-top"><span>Catalogue</span><span class="kpi-icon">◇</span></div><strong>' +
      catalogueCount +
      '</strong><small>Active sneaker styles</small></div></div><div class="ops-strip"><button data-admin-tab="catalogue"><strong>' +
      Number(metrics?.lowStock || 0) +
      '</strong><span>Low stock</span></button><button data-admin-tab="messages"><strong>' +
      Number(metrics?.newMessages || 0) +
      '</strong><span>New messages</span></button><button data-admin-tab="subscribers"><strong>' +
      Number(metrics?.subscribers || 0) +
      '</strong><span>Active subscribers</span></button><button data-admin-tab="promotions"><strong>' +
      Number(metrics?.coupons || 0) +
      '</strong><span>Active promos</span></button></div><div class="admin-grid"><div class="admin-card"><div class="admin-card-head"><h3>Unique visitors • Last 7 days</h3><button data-admin-tab="analytics">View report</button></div><div class="chart">' +
      days
        .map(function (x) {
          return (
            '<div class="chart-col"><div class="chart-bar" style="height:' +
            Math.max(5, Math.round((x.count / max) * 100)) +
            '%"></div><span>' +
            x.label +
            "</span></div>"
          );
        })
        .join("") +
      '</div></div><div class="admin-card"><div class="admin-card-head"><h3>Catalogue snapshot</h3><button data-admin-tab="catalogue">Manage</button></div><div class="top-products">' +
      top
        .map(function (p) {
          return (
            '<div class="top-product">' +
            img(p) +
            "<div><h4>" +
            esc(p.name) +
            "</h4><p>" +
            p.stock +
            " pairs in stock<br>" +
            esc(sizeStockSummary(p)) +
            "</p></div><strong>" +
            money(p.price) +
            "</strong></div>"
          );
        })
        .join("") +
      '</div></div></div><div class="admin-card" style="margin-top:14px"><div class="admin-card-head"><h3>Recent orders</h3><button data-admin-tab="orders">View all</button></div>' +
      ordersTable(state.orders.slice(0, 5)) +
      "</div>"
    );
  }
  function catalogue() {
    const q = state.adminSearch.toLowerCase(),
      list = state.products.filter(function (p) {
        return (p.name + " " + p.category).toLowerCase().includes(q);
      });
    return (
      '<div class="admin-heading"><div><h2>Sneaker catalogue</h2><p>Add pairs and update prices, delivery fees, pictures, descriptions and stock for every size.</p></div><button class="btn btn-acid" data-new-product>Add sneaker</button></div><div class="table-card"><div class="table-tools"><form class="search-box" id="admin-product-search"><input name="query" value="' +
      esc(state.adminSearch) +
      '" placeholder="Search catalogue"><button>' +
      icon("search") +
      '</button></form><span class="muted">' +
      list.length +
      ' products</span></div><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Product</th><th>Price</th><th>Delivery fee</th><th>Sizes</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead><tbody>' +
      list
        .map(function (p) {
          const inventory = sizeInventoryFor(p),
            soldOutSizes = inventory.filter(function (entry) {
              return entry.stock < 1;
            }).length,
            lowSizes = inventory.filter(function (entry) {
              return entry.stock === 1;
            }).length,
            s =
              p.stock < 1
                ? "Sold out"
                : soldOutSizes
                  ? "Size sold out"
                  : lowSizes
                    ? "Low by size"
                    : "Active";
          return (
            '<tr><td><div class="table-product">' +
            img(p) +
            "<div><strong>" +
            esc(p.name) +
            "</strong><span>" +
            esc(p.category) +
            "</span></div></div></td><td><strong>" +
            money(p.price) +
            '</strong><br><span class="muted"><s>' +
            money(p.comparePrice) +
            "</s></span></td><td><strong>" +
            money(p.deliveryFee || 0) +
            '</strong><br><span class="muted">per pair</span></td><td><div class="size-stock-badges" title="' +
            esc(sizeStockSummary(p)) +
            '">' +
            sizeStockBadges(p) +
            "</div></td><td>" +
            p.stock +
            '</td><td><span class="status ' +
            (s === "Sold out" ? "sold" : s !== "Active" ? "low" : "") +
            '">' +
            s +
            '</span></td><td><div class="actions"><button class="icon-btn" data-edit-product="' +
            esc(p.id) +
            '">Edit</button><button class="icon-btn" data-delete-product="' +
            esc(p.id) +
            '">Delete</button></div></td></tr>'
          );
        })
        .join("") +
      "</tbody></table></div></div>"
    );
  }
  function orders() {
    return (
      '<div class="admin-heading"><div><h2>Orders</h2><p>Search customer orders, filter payment/fulfilment and update delivery progress.</p></div><span class="status pending">' +
      state.orders.filter(function (o) {
        return o.status === "New";
      }).length +
      ' new on this page</span></div><div class="table-card"><form class="order-tools" id="admin-order-search"><input name="search" value="' +
      esc(state.orderSearch) +
      '" placeholder="Reference, customer, phone or email"><select name="status"><option value="">All fulfilment</option>' +
      ["Awaiting payment", "New", "Confirmed", "Processing", "Dispatched", "Completed", "Cancelled", "Needs review"]
        .map(function (status) {
          return '<option value="' + esc(status) + '" ' + (state.orderStatus === status ? "selected" : "") + '>' + esc(status) + "</option>";
        })
        .join("") +
      '</select><select name="paymentStatus"><option value="">All payments</option>' +
      ["pending", "processing", "paid", "failed", "refunded"]
        .map(function (status) {
          return '<option value="' + esc(status) + '" ' + (state.orderPaymentStatus === status ? "selected" : "") + '>' + esc(status) + "</option>";
        })
        .join("") +
      '</select><button class="btn btn-outline">Apply</button></form><div class="data-table-wrap">' +
      ordersTable(state.orders) +
      '</div><div class="table-pagination"><span>' +
      Number(state.orderTotal || state.orders.length).toLocaleString() +
      ' matching orders</span><div><button class="icon-btn" data-order-page="' +
      Math.max(1, state.orderPage - 1) +
      '" ' +
      (state.orderPage <= 1 ? "disabled" : "") +
      '>Previous</button><span>Page ' +
      state.orderPage +
      " of " +
      Math.max(1, state.orderPages) +
      '</span><button class="icon-btn" data-order-page="' +
      Math.min(Math.max(1, state.orderPages), state.orderPage + 1) +
      '" ' +
      (state.orderPage >= state.orderPages ? "disabled" : "") +
      '>Next</button></div></div></div>'
    );
  }
  function promotions() {
    if (!state.coupons.length)
      return (
        '<div class="admin-heading"><div><h2>Promotions</h2><p>Create discount codes customers can apply in the bag or at checkout.</p></div><button class="btn btn-acid" data-new-coupon>Create promo code</button></div><div class="admin-card empty-state"><span class="success-icon">%</span><h2>No promo codes yet.</h2><p>Create your first percentage or fixed-value discount.</p></div>'
      );
    return (
      '<div class="admin-heading"><div><h2>Promotions</h2><p>Manage promo codes, validity windows and usage limits.</p></div><button class="btn btn-acid" data-new-coupon>Create promo code</button></div><div class="table-card"><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Code</th><th>Discount</th><th>Minimum</th><th>Usage</th><th>Validity</th><th>Status</th><th>Actions</th></tr></thead><tbody>' +
      state.coupons
        .map(function (c) {
          const expired = c.endsAt && new Date(c.endsAt) < new Date(),
            status = !c.active ? "Inactive" : expired ? "Expired" : "Active";
          return (
            '<tr><td><strong>' +
            esc(c.code) +
            '</strong><br><span class="muted">' +
            esc(c.description || "Customer promotion") +
            '</span></td><td><strong>' +
            (c.type === "percentage" ? esc(c.value) + "%" : money(c.value)) +
            '</strong><br><span class="muted">' +
            (c.maxDiscount ? "Cap " + money(c.maxDiscount) : "No cap") +
            '</span></td><td>' +
            money(c.minSubtotal || 0) +
            '</td><td>' +
            Number(c.usedCount || 0) +
            (c.usageLimit ? " / " + Number(c.usageLimit) : " / ∞") +
            '</td><td><span class="muted">' +
            (c.startsAt ? date(c.startsAt) : "Immediately") +
            " → " +
            (c.endsAt ? date(c.endsAt) : "No expiry") +
            '</span></td><td><span class="status ' +
            (status === "Active" ? "" : "pending") +
            '">' +
            status +
            '</span></td><td><div class="actions"><button class="icon-btn" data-edit-coupon="' +
            esc(c._id || c.id) +
            '">Edit</button><button class="icon-btn" data-delete-coupon="' +
            esc(c._id || c.id) +
            '">Disable</button></div></td></tr>'
          );
        })
        .join("") +
      "</tbody></table></div></div>"
    );
  }
  function messages() {
    if (!state.messages.length)
      return '<div class="admin-heading"><div><h2>Customer messages</h2><p>Enquiries submitted from the contact page appear here.</p></div></div><div class="admin-card empty-state"><h2>No enquiries yet.</h2><p>New customer messages will appear here automatically.</p></div>';
    return (
      '<div class="admin-heading"><div><h2>Customer messages</h2><p>Review contact enquiries and keep their handling status organised.</p></div><span class="status pending">' +
      state.messages.filter(function (m) {
        return m.status === "New";
      }).length +
      ' new</span></div><div class="table-card"><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Customer</th><th>Message</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead><tbody>' +
      state.messages
        .map(function (m) {
          return (
            '<tr><td><strong>' +
            esc(m.name) +
            '</strong><br><span class="muted">' +
            esc(m.phone) +
            '</span></td><td><div class="message-preview">' +
            esc(m.message) +
            '</div></td><td><span class="status ' +
            (m.status === "New" ? "pending" : "") +
            '">' +
            esc(m.status) +
            '</span></td><td>' +
            date(m.createdAt) +
            '</td><td><div class="actions"><button class="icon-btn" data-message-status="' +
            esc(m._id || m.id) +
            '" data-status="Read">Read</button><button class="icon-btn" data-message-status="' +
            esc(m._id || m.id) +
            '" data-status="Closed">Close</button><button class="icon-btn" data-delete-message="' +
            esc(m._id || m.id) +
            '">Delete</button></div></td></tr>'
          );
        })
        .join("") +
      "</tbody></table></div></div>"
    );
  }
  function subscribers() {
    return (
      '<div class="admin-heading"><div><h2>Drop-list subscribers</h2><p>WhatsApp numbers collected from the storefront newsletter form.</p></div><span class="status">' +
      state.subscribers.filter(function (s) {
        return s.active;
      }).length +
      ' active</span></div>' +
      (!state.subscribers.length
        ? '<div class="admin-card empty-state"><h2>No subscribers yet.</h2><p>Newsletter sign-ups will appear here.</p></div>'
        : '<div class="table-card"><div class="data-table-wrap"><table class="data-table"><thead><tr><th>WhatsApp number</th><th>Source</th><th>Joined</th><th>Status</th><th>Actions</th></tr></thead><tbody>' +
          state.subscribers
            .map(function (s) {
              return (
                '<tr><td><strong>' +
                esc(s.phone) +
                '</strong></td><td>' +
                esc(s.source || "storefront") +
                '</td><td>' +
                date(s.createdAt) +
                '</td><td><span class="status ' +
                (s.active ? "" : "pending") +
                '">' +
                (s.active ? "Active" : "Paused") +
                '</span></td><td><div class="actions"><button class="icon-btn" data-subscriber-toggle="' +
                esc(s._id || s.id) +
                '" data-active="' +
                (s.active ? "false" : "true") +
                '">' +
                (s.active ? "Pause" : "Activate") +
                '</button><button class="icon-btn" data-delete-subscriber="' +
                esc(s._id || s.id) +
                '">Delete</button></div></td></tr>'
              );
            })
            .join("") +
          "</tbody></table></div></div>")
    );
  }
  function analytics() {
    const days = viewDays(),
      max = Math.max.apply(
        null,
        days
          .map(function (x) {
            return x.count;
          })
          .concat([1]),
      ),
      report = state.analytics || {},
      visitors = Number(report.totalVisitors ?? state.views.total ?? 0),
      paidOrders = Number(
        report.paidOrders ?? state.dashboard?.metrics?.paidOrders ?? 0,
      ),
      revenue = Number(report.revenue ?? state.dashboard?.metrics?.revenue ?? 0),
      conversion = Number(
        report.conversionRate ?? (visitors ? (paidOrders / visitors) * 100 : 0),
      ),
      topPaths = report.topPaths || [],
      referrers = report.referrers || [];
    return (
      '<div class="admin-heading"><div><h2>Website & sales analytics</h2><p>See traffic, conversion and verified paid-order performance.</p></div><span class="status">Tracking ' +
      (state.settings.viewTracking ? "on" : "off") +
      '</span></div><div class="kpi-grid"><div class="kpi"><div class="kpi-top"><span>Unique visitors</span><span class="kpi-icon">↗</span></div><strong>' +
      visitors.toLocaleString() +
      '</strong><small>Selected 30-day period</small></div><div class="kpi"><div class="kpi-top"><span>Paid orders</span><span class="kpi-icon">▤</span></div><strong>' +
      paidOrders.toLocaleString() +
      '</strong><small>Verified payments</small></div><div class="kpi"><div class="kpi-top"><span>Paid revenue</span><span class="kpi-icon">₦</span></div><strong>' +
      money(revenue) +
      '</strong><small>After promo discounts</small></div><div class="kpi"><div class="kpi-top"><span>Conversion</span><span class="kpi-icon">%</span></div><strong>' +
      conversion.toFixed(2) +
      '%</strong><small>Paid orders ÷ unique visitors</small></div></div><div class="admin-grid"><div class="admin-card"><div class="admin-card-head"><h3>Unique visitors • Last 7 days</h3><span class="muted">Privacy-preserving counts</span></div><div class="chart" style="height:330px">' +
      days
        .map(function (x) {
          return (
            '<div class="chart-col"><div class="chart-bar" style="height:' +
            Math.max(5, Math.round((x.count / max) * 100)) +
            '%"></div><span>' +
            x.label +
            "<br>" +
            x.count +
            "</span></div>"
          );
        })
        .join("") +
      '</div></div><div class="admin-card"><div class="admin-card-head"><h3>Sales summary</h3><span class="muted">Last 30 days</span></div><div class="metric-list"><div><span>All orders started</span><strong>' +
      Number(report.totalOrders || 0).toLocaleString() +
      '</strong></div><div><span>Average paid order</span><strong>' +
      money(report.averageOrderValue || 0) +
      '</strong></div><div><span>Promo discounts granted</span><strong>' +
      money(report.discounts || 0) +
      '</strong></div><div><span>Recorded page views</span><strong>' +
      Number(report.pageViews || 0).toLocaleString() +
      '</strong></div></div></div></div><div class="admin-grid" style="margin-top:14px"><div class="admin-card"><div class="admin-card-head"><h3>Top pages</h3><span class="muted">Visitor reach</span></div>' +
      (topPaths.length
        ? '<div class="metric-list">' +
          topPaths
            .map(function (x) {
              return '<div><span>' + esc(x._id || "/") + '</span><strong>' + Number(x.visitors || 0).toLocaleString() + "</strong></div>";
            })
            .join("") +
          "</div>"
        : '<p class="muted">No page data yet.</p>') +
      '</div><div class="admin-card"><div class="admin-card-head"><h3>Top referrers</h3><span class="muted">Traffic sources</span></div>' +
      (referrers.length
        ? '<div class="metric-list">' +
          referrers
            .map(function (x) {
              return '<div><span>' + esc(x._id || "Direct") + '</span><strong>' + Number(x.visitors || 0).toLocaleString() + "</strong></div>";
            })
            .join("") +
          "</div>"
        : '<p class="muted">Most current visits are direct or have no referrer.</p>') +
      '</div></div><p class="prototype-note">Visitor identifiers are hashed before storage; raw visitor IDs and IP addresses are not retained in analytics records.</p>'
    );
  }
  function settings() {
    return (
      '<div class="admin-heading"><div><h2>Store settings</h2><p>Manage customer contact, notifications and administrator security.</p></div></div><form id="settings-form"><div class="settings-grid"><section class="settings-card"><h3>Store profile</h3><p>Basic customer-facing details.</p><div class="field"><label>Store name</label><input name="storeName" value="' +
      esc(state.settings.storeName) +
      '"></div><div class="field"><label>Customer phone</label><input name="phone" value="' +
      esc(state.settings.phone) +
      '"></div></section><section class="settings-card"><h3>Order email notifications</h3><p>Set the inbox that receives paid-order alerts.</p><div class="field"><label>Notification email</label><input name="notificationEmail" type="email" value="' +
      esc(state.settings.notificationEmail) +
      '" placeholder="orders@yourdomain.com"><small>SMTP credentials must also be configured on the server.</small></div><div class="toggle-row"><div><strong>New-order alerts</strong><span>Email the owner after confirmed payment</span></div><button type="button" class="toggle ' +
      (state.settings.orderAlerts ? "on" : "") +
      '" data-toggle-setting="orderAlerts"></button></div><div class="toggle-row"><div><strong>Website view tracking</strong><span>Measure unique visitors and page views</span></div><button type="button" class="toggle ' +
      (state.settings.viewTracking ? "on" : "") +
      '" data-toggle-setting="viewTracking"></button></div></section></div><button class="btn btn-acid" style="margin-top:18px">Save settings</button></form><form id="password-form" class="settings-card password-card" style="margin-top:22px"><h3>Administrator password</h3><p>Use at least 12 characters for the live store.</p><div class="field-grid"><div class="field"><label>Current password</label><input name="currentPassword" type="password" autocomplete="current-password" required></div><div class="field"><label>New password</label><input name="newPassword" type="password" autocomplete="new-password" minlength="12" required></div></div><button class="btn btn-outline" style="margin-top:18px">Update password</button></form>'
    );
  }
  function admin() {
    const authenticated = runtime.api
      ? runtime.adminAuthenticated
      : sessionStorage.getItem("jk_admin_auth") === "true";
    if (!authenticated) return adminLogin();
    const title = {
        dashboard: "Overview",
        catalogue: "Catalogue",
        orders: "Orders",
        promotions: "Promotions",
        messages: "Messages",
        subscribers: "Subscribers",
        analytics: "Analytics",
        settings: "Settings",
      },
      content = state.adminLoading
        ? '<div class="admin-loading"><span></span><p>Loading secure store data…</p></div>'
        : state.adminTab === "catalogue"
          ? catalogue()
          : state.adminTab === "orders"
            ? orders()
            : state.adminTab === "promotions"
              ? promotions()
              : state.adminTab === "messages"
                ? messages()
                : state.adminTab === "subscribers"
                  ? subscribers()
            : state.adminTab === "analytics"
              ? analytics()
              : state.adminTab === "settings"
                ? settings()
                : dashboard();
    return (
      '<div class="admin-shell">' +
      sidebar() +
      '<div class="admin-main"><header class="admin-topbar"><h1>' +
      (title[state.adminTab] || "Overview") +
      '</h1><div class="admin-user"><span class="avatar">JK</span><div><strong>' +
      esc(state.admin?.name || "Store Admin") +
      '</strong><span>Jones Kicks</span></div></div></header><main class="admin-content">' +
      content +
      "</main></div></div>"
    );
  }
  function renderAdmin() {
    clearInterval(state.timer);
    document.body.classList.add("admin-body");
    document.getElementById("site-header").innerHTML = "";
    document.getElementById("site-footer").innerHTML = "";
    document.getElementById("app").innerHTML = admin();
    document.title = "Admin • Jones Kicks";
  }
  function render() {
    close();
    state.size = null;
    const u = url(),
      path = u.pathname.replace(/\/$/, "") || "/";
    if (path.startsWith("/admin")) {
      renderAdmin();
      if (
        runtime.api &&
        runtime.adminAuthenticated &&
        !state.adminLoading &&
        !state.dashboard
      )
        void loadAdminTab("dashboard");
      return;
    }
    document.body.classList.remove("admin-body");
    header(path);
    footer();
    const app = document.getElementById("app");
    if (path === "/") {
      app.innerHTML = home();
      document.title = "Jones Kicks • Premium Sneakers";
      startHero();
    } else if (path === "/shop") {
      app.innerHTML = shop(u);
      document.title = "Shop Sneakers • Jones Kicks";
    } else if (path.startsWith("/product/")) {
      const id = decodeURIComponent(path.split("/").pop());
      app.innerHTML = detail(id);
      const p = product(id);
      document.title = p
        ? p.name + " • Jones Kicks"
        : "Not found • Jones Kicks";
    } else if (path === "/cart") {
      app.innerHTML = cart();
      document.title = "Shopping Bag • Jones Kicks";
    } else if (path === "/checkout") {
      app.innerHTML = checkout();
      document.title = "Checkout • Jones Kicks";
    } else if (path === "/order-success") {
      const paidReference = u.searchParams.get("order");
      if (
        runtime.api &&
        paidReference &&
        paidReference === sessionStorage.getItem("jk_last_order")
      ) {
        state.cart = [];
        save(K.cart, state.cart);
        header(path);
      }
      app.innerHTML = success(u);
      if (
        runtime.api &&
        paidReference &&
        !state.orders.some(function (order) {
          return order.id === paidReference;
        })
      )
        void loadCustomerOrder(paidReference);
      document.title = "Order received • Jones Kicks";
    } else if (path === "/about") {
      app.innerHTML = about();
      document.title = "Our Story • Jones Kicks";
    } else if (path === "/contact") {
      app.innerHTML = contact();
      document.title = "Contact • Jones Kicks";
    } else if (path === "/wishlist") {
      app.innerHTML = wishlist();
      document.title = "Saved Favourites • Jones Kicks";
    } else if (path === "/track-order") {
      app.innerHTML = trackOrder();
      document.title = "Track Order • Jones Kicks";
    } else {
      app.innerHTML = notFound();
      document.title = "Not found • Jones Kicks";
    }
    setTimeout(function () {
      if (window.AOS) {
        window.AOS.init({ duration: 720, once: true, offset: 40 });
        window.AOS.refreshHard();
      }
    }, 30);
  }
  function startHero() {
    clearInterval(state.timer);
    state.hero = 0;
    state.timer = setInterval(function () {
      showHero((state.hero + 1) % 3);
    }, 6200);
  }
  function showHero(i) {
    state.hero = i;
    document.querySelectorAll("[data-hero-slide]").forEach(function (x) {
      x.classList.toggle("active", Number(x.dataset.heroSlide) === i);
    });
    document.querySelectorAll("[data-hero-dot]").forEach(function (x) {
      x.classList.toggle("active", Number(x.dataset.heroDot) === i);
    });
  }
  function drawer() {
    document.getElementById("cart-drawer").innerHTML =
      '<div class="drawer-head"><h2>Your bag (' +
      count() +
      ')</h2><button class="round-btn" data-layer-close>' +
      icon("close") +
      "</button></div>" +
      (state.cart.length
        ? '<div class="drawer-body"><div class="cart-list" style="padding:0">' +
          rows(false) +
          '</div></div><div class="drawer-foot"><div class="summary-line total" style="margin:0 0 14px"><span>Subtotal</span><strong>' +
          money(subtotal()) +
          '</strong></div><a class="btn btn-acid btn-block" href="' +
          href("/cart") +
          '" data-route="/cart">View bag & checkout</a></div>'
        : '<div class="drawer-empty"><div><span class="success-icon">⌁</span><h3>Your bag is empty</h3><p class="muted">Start with a fresh pair from the collection.</p><a class="btn btn-acid" href="' +
          href("/shop") +
          '" data-route="/shop">Shop sneakers</a></div></div>');
  }
  function openCart() {
    drawer();
    document.getElementById("drawer-backdrop").classList.add("open");
    document.getElementById("cart-drawer").classList.add("open");
    document.body.classList.add("locked");
  }
  function close() {
    document.body.classList.remove("locked");
    ["drawer-backdrop", "cart-drawer", "modal-wrap"].forEach(function (id) {
      const n = document.getElementById(id);
      if (n) n.classList.remove("open");
    });
    const n = document.getElementById("mobile-nav");
    if (n) n.classList.remove("open");
  }
  function modal(content, cls) {
    const w = document.getElementById("modal-wrap");
    w.innerHTML =
      '<div class="modal ' +
      (cls || "") +
      '" role="dialog" aria-modal="true"><button class="modal-close" data-layer-close>' +
      icon("close") +
      "</button>" +
      content +
      "</div>";
    w.classList.add("open");
    document.body.classList.add("locked");
  }
  function quick(id) {
    const p = product(id);
    if (!p) return;
    state.size = null;
    modal(
      '<div class="quick-layout"><div class="quick-image">' +
        img(p) +
        '<span class="product-tag">' +
        esc(p.tag) +
        '</span></div><div class="quick-content"><p class="eyebrow">' +
        esc(p.category) +
        "</p><h2>" +
        esc(p.name) +
        '</h2><div><span class="price">' +
        money(p.price) +
        '</span><span class="compare">' +
        money(p.comparePrice) +
        "</span></div><p>" +
        esc(p.description) +
        "</p><p><strong>Delivery fee: " +
        money(p.deliveryFee || 0) +
        ' per pair</strong></p><div class="size-label"><span>Choose size</span><span>Sold-out sizes cannot be selected</span></div><div class="size-grid">' +
        sizeButtons(p) +
        '</div><button class="btn btn-acid btn-block" data-add="' +
        esc(p.id) +
        '" disabled>Add to bag</button><a style="margin-top:14px;text-align:center;font-size:9px;font-weight:800" href="' +
        href("/product/" + p.id) +
        '" data-route="/product/' +
        esc(p.id) +
        '">VIEW FULL DETAILS</a></div></div>',
    );
  }
  function add(id) {
    const p = product(id);
    if (!p || !state.size)
      return toast("Choose your preferred size first.", "!");
    const available = stockForSize(p, state.size);
    if (available < 1)
      return toast("This sneaker is sold out in size " + state.size + ".", "!");
    const x = state.cart.find(function (i) {
      return i.productId === id && i.size === state.size;
    });
    if (x && x.qty >= Math.min(available, 10))
      return toast("You have reached the available quantity for this pair.", "!");
    if (x) x.qty++;
    else state.cart.push({ productId: id, size: state.size, qty: 1 });
    clearQuote();
    save(K.cart, state.cart);
    close();
    header(url().pathname);
    toast(p.name + " • Size " + state.size + " added to your bag.", "✓");
    setTimeout(openCart, 300);
  }
  function qty(line, dir) {
    const x = line.split("|"),
      item = state.cart.find(function (i) {
        return i.productId === x[0] && i.size === Number(x[1]);
      });
    if (!item) return;
    const p = product(item.productId);
    if (
      dir === "up" &&
      p &&
      item.qty >= Math.min(stockForSize(p, item.size), 10)
    )
      return toast(
        "No more stock is available in size " + item.size + ".",
        "!",
      );
    item.qty += dir === "up" ? 1 : -1;
    if (item.qty <= 0)
      state.cart = state.cart.filter(function (i) {
        return i !== item;
      });
    clearQuote();
    save(K.cart, state.cart);
    if (document.getElementById("cart-drawer").classList.contains("open")) {
      drawer();
      header(url().pathname);
    } else render();
  }
  function remove(line) {
    const x = line.split("|");
    state.cart = state.cart.filter(function (i) {
      return !(i.productId === x[0] && i.size === Number(x[1]));
    });
    clearQuote();
    save(K.cart, state.cart);
    toast("Item removed from your bag.", "✓");
    if (document.getElementById("cart-drawer").classList.contains("open")) {
      drawer();
      header(url().pathname);
    } else render();
  }
  function wish(id) {
    state.wish = state.wish.includes(id)
      ? state.wish.filter(function (x) {
          return x !== id;
        })
      : state.wish.concat(id);
    save(K.wish, state.wish);
    render();
    toast(
      state.wish.includes(id)
        ? "Saved to favourites."
        : "Removed from favourites.",
      "♥",
    );
  }
  function snapshotForm(id) {
    const form = document.getElementById(id);
    if (!form) return null;
    const values = {};
    Array.from(form.elements).forEach(function (field) {
      if (!field.name) return;
      if (field.type === "radio" || field.type === "checkbox") {
        if (field.checked) values[field.name] = field.value;
      } else values[field.name] = field.value;
    });
    return values;
  }
  function restoreForm(id, values) {
    const form = document.getElementById(id);
    if (!form || !values) return;
    Array.from(form.elements).forEach(function (field) {
      if (!field.name || values[field.name] == null) return;
      if (field.type === "radio" || field.type === "checkbox")
        field.checked = field.value === values[field.name];
      else field.value = values[field.name];
    });
  }
  async function applyPromo(remove) {
    const savedCheckout = snapshotForm("checkout-form");
    if (remove) {
      clearQuote();
      render();
      restoreForm("checkout-form", savedCheckout);
      toast("Promo code removed.", "✓");
      return;
    }
    const field = document.getElementById("promo-code"),
      code = String(field ? field.value : "")
        .trim()
        .toUpperCase();
    if (!code) return toast("Enter a promo code first.", "!");
    if (!runtime.api)
      return toast("Promo codes are available on the live store.", "i");
    try {
      const quote = await api("/api/orders/quote", {
        method: "POST",
        body: { items: state.cart, promoCode: code },
      });
      state.quote = quote;
      state.promo = { code: quote.promoCode || code };
      render();
      restoreForm("checkout-form", savedCheckout);
      toast(
        quote.discount
          ? "Promo applied. You saved " + money(quote.discount) + "."
          : "Promo code checked.",
        "✓",
      );
    } catch (error) {
      toast(error.message, "!");
    }
  }
  async function payment(customer) {
    if (state.paymentBusy) return;
    if (!runtime.api) {
      toast("Secure checkout requires the Jones Kicks backend.", "!");
      return;
    }
    if (!runtime.paymentConfigured) {
      toast("Paystack checkout is not configured on this server.", "!");
      return;
    }

    state.paymentBusy = true;
    modal(
      '<div class="payment-modal"><div class="payment-brand"><a class="brand">' +
        brand() +
        '</a><span class="status pending">Secure Paystack checkout</span></div><div class="payment-amount"><span>Confirming total</span><strong>' +
        money(grandTotal()) +
        '</strong></div><div class="admin-loading compact"><span></span><p>Preparing your verified Paystack transaction…</p></div></div>',
      "payment-modal",
    );
    try {
      const verifiedQuote = await api("/api/orders/quote", {
        method: "POST",
        body: {
          items: state.cart,
          promoCode: state.promo?.code || "",
        },
      });
      state.quote = verifiedQuote;
      if (verifiedQuote.promoCode) {
        state.promo = { code: verifiedQuote.promoCode };
      }
      const payload = await api("/api/orders", {
        method: "POST",
        body: {
          customer: customer,
          items: state.cart,
          paymentMethod: customer.payment,
          promoCode: state.promo?.code || "",
        },
      });
      if (
        payload.payment?.mode !== "paystack" ||
        !/^https:\/\//i.test(String(payload.payment?.authorizationUrl || ""))
      ) {
        throw new Error("Paystack did not return a secure checkout URL.");
      }
      sessionStorage.setItem("jk_last_order", payload.order.reference);
      sessionStorage.setItem(K.orderToken, payload.orderToken);
      window.location.assign(payload.payment.authorizationUrl);
    } catch (error) {
      state.paymentBusy = false;
      close();
      toast(error.message, "!");
    }
  }

  function sizeInventoryEditorRow(size, entry) {
    const normalized = normalizeClientSize(size),
      label = formatSize(normalized),
      enabled = Boolean(entry),
      custom = !DEFAULT_SNEAKER_SIZES.includes(normalized),
      stock = enabled ? entry.stock : 0;
    return (
      '<div class="size-inventory-row ' +
      (custom ? "custom-size-row" : "") +
      '" data-size-row data-size-value="' +
      esc(label) +
      '"><label class="size-enable-label"><input class="size-enable" data-size-toggle type="checkbox" ' +
      (enabled ? "checked" : "") +
      '><span class="size-inventory-number">EU ' +
      esc(label) +
      '</span></label><span class="size-inventory-status">' +
      (enabled ? (stock < 1 ? "Shown as sold out" : "Available") : "Hidden") +
      '</span><input class="size-stock-input" data-size-stock type="number" min="0" max="100000" step="1" inputmode="numeric" value="' +
      esc(stock) +
      '" aria-label="Stock for EU size ' +
      esc(label) +
      '" ' +
      (enabled ? "required" : "disabled") +
      '><span class="size-inventory-unit">pairs</span>' +
      (custom
        ? '<button class="remove-custom-size" type="button" data-remove-custom-size aria-label="Remove custom size ' +
          esc(label) +
          '">×</button>'
        : "") +
      "</div>"
    );
  }
  function showProductFormError(form, message) {
    const notice = form && form.querySelector("[data-product-form-error]");
    if (notice) {
      notice.hidden = !message;
      notice.textContent = message || "";
    }
    if (message) toast(message, "!");
  }
  function addCustomProductSize() {
    const input = document.getElementById("custom-sneaker-size"),
      form = input && input.closest("form"),
      editor = form && form.querySelector("[data-size-inventory-editor]"),
      size = normalizeClientSize(input && input.value);
    if (!form || !editor) return;
    if (size == null) {
      showProductFormError(
        form,
        "Enter a custom numeric size from 1 to 100, using no more than two decimal places.",
      );
      input.focus();
      return;
    }
    const rows = Array.from(editor.querySelectorAll("[data-size-row]"));
    if (rows.length >= MAX_PRODUCT_SIZES) {
      showProductFormError(form, "A sneaker can have at most 30 sizes.");
      return;
    }
    const duplicate = rows.some(function (row) {
      return normalizeClientSize(row.dataset.sizeValue) === size;
    });
    if (duplicate) {
      showProductFormError(
        form,
        "EU size " + formatSize(size) + " is already listed.",
      );
      return;
    }
    editor.insertAdjacentHTML(
      "beforeend",
      sizeInventoryEditorRow(size, { size: size, stock: 0 }),
    );
    input.value = "";
    showProductFormError(form, "");
    const addedRows = editor.querySelectorAll("[data-size-row]");
    addedRows[addedRows.length - 1]?.querySelector("[data-size-stock]")?.focus();
  }
  function editProduct(id) {
    const p = id ? product(id) : null;
    const currentInventory = p ? sizeInventoryFor(p) : [],
      editorSizes = Array.from(
        new Set(
          DEFAULT_SNEAKER_SIZES.concat(
            currentInventory.map(function (entry) {
              return entry.size;
            }),
          ),
        ),
      ).sort(function (left, right) {
        return left - right;
      }),
      sizeEditor = editorSizes
        .map(function (size) {
          const entry = currentInventory.find(function (item) {
            return item.size === size;
          });
          return sizeInventoryEditorRow(size, entry);
        })
        .join("");
    state.upload = "";
    modal(
      '<form class="admin-modal" id="product-form"><h2>' +
        (p ? "Edit sneaker" : "Add new sneaker") +
        '</h2><input type="hidden" name="id" value="' +
        esc(p ? p.id : "") +
        '"><div class="field-grid"><div class="field full"><label>Product name</label><input name="name" required value="' +
        esc(p ? p.name : "") +
        '"></div><div class="field"><label>Category</label><input name="category" required value="' +
        esc(p ? p.category : "Lifestyle") +
        '"></div><div class="field"><label>Badge</label><input name="tag" value="' +
        esc(p ? p.tag : "New") +
        '"></div><div class="field"><label>Selling price (₦)</label><input name="price" type="number" min="0" step="1" required value="' +
        esc(p ? p.price : "") +
        '"></div><div class="field"><label>Previous price (₦)</label><input name="comparePrice" type="number" min="0" step="1" value="' +
        esc(p ? p.comparePrice : "") +
        '"></div><div class="field"><label>Delivery fee per pair (₦)</label><input name="deliveryFee" type="number" min="0" step="1" required value="' +
        esc(p ? p.deliveryFee : 0) +
        '"><small>This exact fee follows the product into cart, checkout and the order.</small></div><div class="field full"><label>Available sizes and stock</label><div class="size-inventory-editor" data-size-inventory-editor>' +
        sizeEditor +
        '</div><div class="custom-size-adder"><div><strong>Add a custom size</strong><small>Examples: 39, 39.5, 46 or 47.5</small></div><input id="custom-sneaker-size" type="number" min="1" max="100" step="0.01" inputmode="decimal" placeholder="e.g. 46.5" aria-label="Custom sneaker size"><button class="btn btn-outline" type="button" data-add-custom-size>Add size</button></div><small>Check every size you offer. Enter 0 to keep a size visible as sold out; uncheck it to hide it. Custom sizes can also be removed completely.</small></div><div class="field full"><label>Image URL</label><input name="image" value="' +
        esc(p ? p.image : "") +
        '"></div><div class="field full"><label>Or upload product image</label><input id="product-image-upload" type="file" accept="image/png,image/jpeg,image/webp"><small>JPG, PNG or WebP; maximum 1.5 MB.</small></div><div class="field full"><label>Description</label><textarea name="description" required>' +
        esc(p ? p.description : "") +
        '</textarea></div><div class="field full"><label class="check-row"><input name="featured" type="checkbox" ' +
        (!p || p.featured ? "checked" : "") +
        '> <span>Feature this sneaker in priority storefront listings</span></label></div></div><p class="form-error" data-product-form-error role="alert" hidden></p><div class="modal-actions"><button type="button" class="btn btn-outline" data-layer-close>Cancel</button><button type="submit" class="btn btn-acid">Save sneaker</button></div></form>',
      "admin-modal",
    );
  }
  async function saveProduct(form) {
    const d = new FormData(form),
      old = product(String(d.get("id"))),
      sizeInventory = Array.from(form.querySelectorAll("[data-size-row]"))
        .filter(function (row) {
          return Boolean(row.querySelector("[data-size-toggle]")?.checked);
        })
        .map(function (row) {
          return {
            size: normalizeClientSize(row.dataset.sizeValue),
            stock: Number(row.querySelector("[data-size-stock]")?.value),
          };
        }),
      payload = {
        name: String(d.get("name")).trim(),
        category: String(d.get("category")).trim(),
        tag: String(d.get("tag") || "New").trim(),
        price: Number(d.get("price")),
        comparePrice: Number(d.get("comparePrice")) || Number(d.get("price")),
        deliveryFee: Number(d.get("deliveryFee")),
        sizeInventory: sizeInventory,
        image: String(d.get("image") || (old && old.image) || fallback[0]),
        imageData: state.upload,
        description: String(d.get("description")).trim(),
        featured: d.get("featured") === "on",
      };
    if (!sizeInventory.length) {
      showProductFormError(form, "Choose at least one sneaker size.");
      return;
    }
    if (
      sizeInventory.length > MAX_PRODUCT_SIZES ||
      sizeInventory.some(function (entry) {
        return entry.size == null;
      }) ||
      new Set(
        sizeInventory.map(function (entry) {
          return entry.size;
        }),
      ).size !== sizeInventory.length
    ) {
      showProductFormError(
        form,
        "Use no more than 30 unique numeric sizes from 1 to 100.",
      );
      return;
    }
    if (
      sizeInventory.some(function (entry) {
        return !Number.isInteger(entry.stock) || entry.stock < 0 || entry.stock > 100000;
      })
    ) {
      showProductFormError(
        form,
        "Enter a valid whole-number stock quantity for every selected size.",
      );
      return;
    }
    if (
      sizeInventory.reduce(function (total, entry) {
        return total + entry.stock;
      }, 0) > 100000
    ) {
      showProductFormError(form, "Total stock cannot exceed 100,000 pairs.");
      return;
    }
    showProductFormError(form, "");
    if (form.dataset.saving === "true") return;
    const submitButton = form.querySelector('button[type="submit"], button:not([type])'),
      submitLabel = submitButton ? submitButton.textContent : "";
    form.dataset.saving = "true";
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = old ? "Saving changes…" : "Adding sneaker…";
    }
    if (runtime.api) {
      try {
        const result = await api(
            old
              ? "/api/admin/products/" + encodeURIComponent(old.id)
              : "/api/admin/products",
            { method: old ? "PATCH" : "POST", body: payload },
          ),
          p = result.product;
        const savedIndex = state.products.findIndex(function (item) {
          return String(item.id) === String(p.id);
        });
        if (savedIndex >= 0) state.products[savedIndex] = p;
        else state.products.unshift(p);
        close();
        toast(old ? "Sneaker updated." : "New sneaker added.", "✓");
        renderAdmin();
      } catch (error) {
        showProductFormError(form, error.message);
      } finally {
        form.dataset.saving = "false";
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = submitLabel;
        }
      }
      return;
    }
    const p = Object.assign(
      {
        id: old ? old.id : "jk-" + Date.now().toString(36),
        fallback: old
          ? old.fallback
          : fallback[state.products.length % fallback.length],
        sizes: sizeInventory.map(function (entry) {
          return entry.size;
        }),
        stock: sizeInventory.reduce(function (total, entry) {
          return total + entry.stock;
        }, 0),
        featured: old ? old.featured : true,
        active: true,
        createdAt: old ? old.createdAt : Date.now(),
      },
      payload,
      { image: state.upload || payload.image },
    );
    delete p.imageData;
    const localIndex = state.products.findIndex(function (item) {
      return String(item.id) === String(p.id);
    });
    if (localIndex >= 0) state.products[localIndex] = p;
    else state.products.unshift(p);
    if (save(K.products, state.products)) {
      close();
      toast(old ? "Sneaker updated." : "New sneaker added.", "✓");
      renderAdmin();
    }
    form.dataset.saving = "false";
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = submitLabel;
    }
  }
  function askDelete(id) {
    const p = product(id);
    if (p)
      modal(
        '<div class="admin-modal"><h2>Remove sneaker?</h2><p class="muted">' +
          esc(p.name) +
          ' will be removed from the live catalogue.</p><div class="modal-actions"><button class="btn btn-outline" data-layer-close>Cancel</button><button class="btn btn-danger" data-confirm-delete="' +
          esc(id) +
          '">Remove product</button></div></div>',
        "admin-modal",
      );
  }
  async function del(id) {
    if (runtime.api) {
      try {
        await api("/api/admin/products/" + encodeURIComponent(id), {
          method: "DELETE",
        });
      } catch (error) {
        toast(error.message, "!");
        return;
      }
    }
    state.products = state.products.filter(function (p) {
      return p.id !== id;
    });
    state.cart = state.cart.filter(function (x) {
      return x.productId !== id;
    });
    save(K.products, state.products);
    save(K.cart, state.cart);
    close();
    renderAdmin();
    toast("Sneaker removed.", "✓");
  }
  function editCoupon(id) {
    const c = id
      ? state.coupons.find(function (item) {
          return String(item._id || item.id) === String(id);
        })
      : null;
    const localDate = function (value) {
      if (!value) return "";
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return "";
      const offset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - offset).toISOString().slice(0, 16);
    };
    modal(
      '<form class="admin-modal" id="coupon-form"><h2>' +
        (c ? "Edit promo code" : "Create promo code") +
        '</h2><input type="hidden" name="id" value="' +
        esc(c ? c._id || c.id : "") +
        '"><div class="field-grid"><div class="field"><label>Promo code</label><input name="code" maxlength="32" required value="' +
        esc(c ? c.code : "") +
        '" placeholder="WELCOME10"></div><div class="field"><label>Discount type</label><select name="type"><option value="percentage" ' +
        (!c || c.type === "percentage" ? "selected" : "") +
        '>Percentage</option><option value="fixed" ' +
        (c && c.type === "fixed" ? "selected" : "") +
        '>Fixed amount</option></select></div><div class="field"><label>Discount value</label><input name="value" type="number" min="1" step="1" required value="' +
        esc(c ? c.value : 10) +
        '"></div><div class="field"><label>Minimum product subtotal (₦)</label><input name="minSubtotal" type="number" min="0" step="1" value="' +
        esc(c ? c.minSubtotal || 0 : 0) +
        '"></div><div class="field"><label>Maximum discount (₦)</label><input name="maxDiscount" type="number" min="0" step="1" value="' +
        esc(c ? c.maxDiscount || 0 : 0) +
        '"><small>Use 0 for no cap.</small></div><div class="field"><label>Usage limit</label><input name="usageLimit" type="number" min="0" step="1" value="' +
        esc(c ? c.usageLimit || 0 : 0) +
        '"><small>Use 0 for unlimited.</small></div><div class="field"><label>Starts at</label><input name="startsAt" type="datetime-local" value="' +
        esc(localDate(c && c.startsAt)) +
        '"></div><div class="field"><label>Ends at</label><input name="endsAt" type="datetime-local" value="' +
        esc(localDate(c && c.endsAt)) +
        '"></div><div class="field full"><label>Description</label><input name="description" maxlength="180" value="' +
        esc(c ? c.description || "" : "") +
        '" placeholder="Private drop discount"></div><div class="field full"><label class="check-row"><input name="active" type="checkbox" ' +
        (!c || c.active ? "checked" : "") +
        '> <span>Promo code is active</span></label></div></div><div class="modal-actions"><button type="button" class="btn btn-outline" data-layer-close>Cancel</button><button class="btn btn-acid">Save promo</button></div></form>',
      "admin-modal",
    );
  }
  async function saveCoupon(form) {
    const d = new FormData(form),
      id = String(d.get("id") || ""),
      payload = {
        code: String(d.get("code") || "").trim(),
        type: String(d.get("type") || "percentage"),
        value: Number(d.get("value")),
        minSubtotal: Number(d.get("minSubtotal") || 0),
        maxDiscount: Number(d.get("maxDiscount") || 0),
        usageLimit: Number(d.get("usageLimit") || 0),
        startsAt: String(d.get("startsAt") || ""),
        endsAt: String(d.get("endsAt") || ""),
        description: String(d.get("description") || "").trim(),
        active: d.get("active") === "on",
      };
    if (!runtime.api)
      return toast("Promo management requires the live backend.", "i");
    try {
      const result = await api(
        id
          ? "/api/admin/coupons/" + encodeURIComponent(id)
          : "/api/admin/coupons",
        { method: id ? "PATCH" : "POST", body: payload },
      );
      const saved = result.coupon;
      const index = state.coupons.findIndex(function (c) {
        return String(c._id || c.id) === String(saved._id || saved.id);
      });
      if (index >= 0) state.coupons[index] = saved;
      else state.coupons.unshift(saved);
      close();
      renderAdmin();
      toast(id ? "Promo code updated." : "Promo code created.", "✓");
    } catch (error) {
      toast(error.message, "!");
    }
  }
  async function disableCoupon(id) {
    if (!runtime.api) return;
    try {
      await api("/api/admin/coupons/" + encodeURIComponent(id), {
        method: "DELETE",
      });
      const c = state.coupons.find(function (item) {
        return String(item._id || item.id) === String(id);
      });
      if (c) c.active = false;
      renderAdmin();
      toast("Promo code disabled.", "✓");
    } catch (error) {
      toast(error.message, "!");
    }
  }
  async function updateMessageStatus(id, status) {
    if (!runtime.api) return;
    try {
      const result = await api(
        "/api/admin/messages/" + encodeURIComponent(id) + "/status",
        { method: "PATCH", body: { status: status } },
      );
      const index = state.messages.findIndex(function (m) {
        return String(m._id || m.id) === String(id);
      });
      if (index >= 0) state.messages[index] = result.message;
      renderAdmin();
      toast("Message marked " + status.toLowerCase() + ".", "✓");
    } catch (error) {
      toast(error.message, "!");
    }
  }
  async function deleteMessage(id) {
    if (!runtime.api) return;
    try {
      await api("/api/admin/messages/" + encodeURIComponent(id), {
        method: "DELETE",
      });
      state.messages = state.messages.filter(function (m) {
        return String(m._id || m.id) !== String(id);
      });
      renderAdmin();
      toast("Message deleted.", "✓");
    } catch (error) {
      toast(error.message, "!");
    }
  }
  async function toggleSubscriber(id, active) {
    if (!runtime.api) return;
    try {
      const result = await api(
        "/api/admin/subscribers/" + encodeURIComponent(id),
        { method: "PATCH", body: { active: active } },
      );
      const index = state.subscribers.findIndex(function (s) {
        return String(s._id || s.id) === String(id);
      });
      if (index >= 0) state.subscribers[index] = result.subscriber;
      renderAdmin();
      toast(active ? "Subscriber activated." : "Subscriber paused.", "✓");
    } catch (error) {
      toast(error.message, "!");
    }
  }
  async function deleteSubscriber(id) {
    if (!runtime.api) return;
    try {
      await api("/api/admin/subscribers/" + encodeURIComponent(id), {
        method: "DELETE",
      });
      state.subscribers = state.subscribers.filter(function (s) {
        return String(s._id || s.id) !== String(id);
      });
      renderAdmin();
      toast("Subscriber deleted.", "✓");
    } catch (error) {
      toast(error.message, "!");
    }
  }
  function allowedOrderStatusOptions(o) {
    const current = String(o.status || ""),
      paid = String(o.paymentStatus || "").toLowerCase() === "paid";
    if (current === "Completed" || current === "Cancelled") return [current];
    if (!paid) return [current, "Cancelled"].filter(function (value, index, list) {
      return value && list.indexOf(value) === index;
    });
    const transitions = {
      New: ["New", "Confirmed", "Processing", "Cancelled", "Needs review"],
      Confirmed: ["Confirmed", "Processing", "Cancelled", "Needs review"],
      Processing: ["Processing", "Dispatched", "Cancelled", "Needs review"],
      Dispatched: ["Dispatched", "Completed", "Needs review"],
    };
    if (current === "Needs review") {
      const history = Array.isArray(o.statusHistory) ? o.statusHistory : [];
      let previous = "";
      for (let index = history.length - 2; index >= 0; index -= 1) {
        const candidate = String(history[index]?.status || "");
        if (
          candidate &&
          !["Awaiting payment", "Needs review", "Cancelled", "Completed"].includes(candidate)
        ) {
          previous = candidate;
          break;
        }
      }
      return ["Needs review", previous || "New", "Cancelled"];
    }
    return transitions[current] || [current, "Needs review", "Cancelled"];
  }
  function openOrder(id) {
    const o = state.orders.find(function (x) {
      return x.id === id;
    });
    if (!o) return;
    const customer = o.customer || {};
    modal(
      '<div class="admin-modal"><div class="admin-card-head"><div><p class="eyebrow">Fulfilment</p><h2 style="margin:0">Order ' +
        esc(o.id) +
        '</h2></div><span class="status ' +
        (o.status === "New" ? "pending" : "") +
        '">' +
        esc(o.status) +
        '</span></div><div class="field-grid order-detail-grid"><div><p class="muted">Customer</p><strong>' +
        esc(customer.fullName || "Customer") +
        "</strong><br>" +
        esc(customer.email || "") +
        "<br>" +
        esc(customer.phone || "") +
        '</div><div><p class="muted">Order total</p><strong>' +
        money(o.total) +
        "</strong><br>" +
        esc(o.paymentStatus) +
        (o.promoCode
          ? '<br><span class="muted">Promo ' + esc(o.promoCode) + " • −" + money(o.discount || 0) + "</span>"
          : "") +
        '</div><div class="field full"><p class="muted">Delivery address</p><strong>' +
        esc(customer.address || "") +
        (customer.city ? ", " + esc(customer.city) : "") +
        (customer.region ? ", " + esc(customer.region) : "") +
        '</strong></div>' +
        (customer.notes
          ? '<div class="field full"><p class="muted">Delivery note</p><div class="message-preview expanded">' +
            esc(customer.notes) +
            "</div></div>"
          : "") +
        '</div><div class="mini-items" style="margin-top:24px">' +
        o.items
          .map(function (x) {
            const p = product(x.productId) || {
              name: x.name,
              image: x.image,
              fallback: x.image,
            };
            return (
              '<div class="mini-item"><div class="mini-thumb">' +
              img(p) +
              "</div><div><h4>" +
              esc(x.name || p.name) +
              "</h4><p>Size " +
              x.size +
              " • Qty " +
              (x.qty || x.quantity) +
              " • Delivery " +
              money(
                x.lineDeliveryFee ||
                  Number(x.deliveryFee || 0) * (x.qty || x.quantity || 1),
              ) +
              "</p></div><strong>" +
              money(
                x.lineSubtotal ||
                  Number(x.price || p.price || 0) * (x.qty || x.quantity || 1),
              ) +
              "</strong></div>"
            );
          })
          .join("") +
        '</div><div class="receipt-summary admin-receipt"><div class="summary-line"><span>Products</span><strong>' +
        money(o.subtotal || 0) +
        '</strong></div><div class="summary-line"><span>Delivery</span><strong>' +
        money(o.deliveryFee || o.delivery || 0) +
        '</strong></div>' +
        (Number(o.discount || 0)
          ? '<div class="summary-line discount-line"><span>Discount</span><strong>−' +
            money(o.discount) +
            "</strong></div>"
          : "") +
        '<div class="summary-line total"><span>Total</span><strong>' +
        money(o.total) +
        '</strong></div></div>' +
        orderTimeline(o) +
        '<div class="field"><label>Order status</label><select id="order-status">' +
        allowedOrderStatusOptions(o)
          .map(function (status) {
            return (
              '<option value="' +
              esc(status) +
              '" ' +
              (o.status === status ? "selected" : "") +
              ">" +
              esc(status) +
              "</option>"
            );
          })
          .join("") +
        '</select><small>Only valid fulfilment transitions are shown. Unpaid orders cannot enter fulfilment. Cancelling a paid reserved order returns its committed stock automatically.</small></div>' +
        (o.refund && o.refund.status
          ? '<div class="field"><label>Refund</label><div class="message-preview expanded"><strong>' +
            esc(o.refund.status) +
            '</strong>' +
            (o.refund.amount ? ' • ' + money(o.refund.amount) : '') +
            (o.refund.reason ? '<br><span class="muted">' + esc(o.refund.reason) + '</span>' : '') +
            '</div></div>'
          : '') +
        (o.status === "Cancelled" && String(o.paymentStatus || "").toLowerCase() === "paid" && !(o.refund && o.refund.status)
          ? '<div class="field"><label for="refund-reason">Full refund reason</label><textarea id="refund-reason" rows="3" maxlength="300" placeholder="Reason shown in the refund record"></textarea><small>Refunds are submitted securely through Paystack. The payment is marked refunded only after Paystack reports a processed refund.</small></div>'
          : '') +
        '<div class="modal-actions"><button class="btn btn-outline" data-layer-close>Close</button>' +
        (o.status === "Cancelled" && String(o.paymentStatus || "").toLowerCase() === "paid" && !(o.refund && o.refund.status)
          ? '<button class="btn btn-outline" data-refund-order="' + esc(o.id) + '">Issue full refund</button>'
          : '') +
        '<button class="btn btn-acid" data-save-order="' +
        esc(o.id) +
        '">Save status</button></div></div>',
      "admin-modal",
    );
  }
  async function refundOrder(id) {
    const order = state.orders.find(function (x) {
      return x.id === id;
    });
    if (!order || !runtime.api) return;
    const reasonField = document.getElementById("refund-reason");
    const reason = String(reasonField ? reasonField.value : "").trim();
    if (reason.length < 3) {
      toast("Enter a refund reason.", "!");
      if (reasonField) reasonField.focus();
      return;
    }
    if (
      !window.confirm(
        "Issue a full refund for " +
          id +
          "? This submits a financial refund request to Paystack.",
      )
    )
      return;
    try {
      const result = await api(
        "/api/admin/orders/" + encodeURIComponent(id) + "/refund",
        { method: "POST", body: { reason: reason } },
      );
      state.orders[state.orders.indexOf(order)] = result.order;
      close();
      renderAdmin();
      toast(
        result.order.paymentStatus === "refunded"
          ? "Refund processed."
          : "Refund submitted to Paystack.",
        "✓",
      );
    } catch (error) {
      toast(error.message, "!");
    }
  }
  async function saveOrderStatus(id, status) {
    const o = state.orders.find(function (x) {
      return x.id === id;
    });
    if (!o) return;
    if (runtime.api) {
      try {
        const result = await api(
          "/api/admin/orders/" + encodeURIComponent(id) + "/status",
          { method: "PATCH", body: { status: status } },
        );
        state.orders[state.orders.indexOf(o)] = result.order;
      } catch (error) {
        toast(error.message, "!");
        return;
      }
    } else {
      o.status = status;
      save(K.orders, state.orders);
    }
    close();
    renderAdmin();
    toast("Order status updated.", "✓");
  }
  async function loadOrders(page) {
    if (!runtime.api) return;
    const params = new URLSearchParams();
    params.set("page", String(Math.max(1, Number(page || 1))));
    if (state.orderSearch) params.set("search", state.orderSearch);
    if (state.orderStatus) params.set("status", state.orderStatus);
    if (state.orderPaymentStatus)
      params.set("paymentStatus", state.orderPaymentStatus);
    const data = await api("/api/admin/orders?" + params.toString());
    state.orders = data.orders || [];
    state.orderPage = Number(data.page || 1);
    state.orderPages = Math.max(1, Number(data.pages || 1));
    state.orderTotal = Number(data.total || 0);
  }
  async function loadAdminTab(tab) {
    state.adminTab = tab;
    if (!runtime.api) {
      renderAdmin();
      return;
    }
    state.adminLoading = true;
    renderAdmin();
    try {
      if (tab === "dashboard") {
        const data = await api("/api/admin/dashboard");
        state.dashboard = data;
        state.orders = data.recentOrders || [];
        state.views = { total: data.metrics.totalVisitors, days: {} };
        (data.daily || []).forEach(function (x) {
          state.views.days[x._id] = x.visitors;
        });
      } else if (tab === "catalogue") {
        const data = await api("/api/admin/products");
        state.products = data.products;
      } else if (tab === "orders") {
        await loadOrders(state.orderPage);
      } else if (tab === "promotions") {
        const data = await api("/api/admin/coupons");
        state.coupons = data.coupons || [];
      } else if (tab === "messages") {
        const data = await api("/api/admin/messages");
        state.messages = data.messages || [];
      } else if (tab === "subscribers") {
        const data = await api("/api/admin/subscribers");
        state.subscribers = data.subscribers || [];
      } else if (tab === "analytics") {
        const data = await api("/api/admin/analytics?days=30");
        state.analytics = data;
        state.views = { total: data.totalVisitors, days: {} };
        (data.daily || []).forEach(function (x) {
          state.views.days[x._id] = x.visitors;
        });
      } else if (tab === "settings") {
        const data = await api("/api/admin/settings");
        state.settings = Object.assign({}, state.settings, data.settings);
      }
    } catch (error) {
      if (/sign-in/i.test(error.message)) {
        runtime.adminAuthenticated = false;
      }
      toast(error.message, "!");
    } finally {
      state.adminLoading = false;
      renderAdmin();
    }
  }
  async function login(form) {
    const d = new FormData(form);
    if (runtime.api) {
      try {
        const result = await api("/api/admin/login", {
          method: "POST",
          body: { email: d.get("email"), password: d.get("password") },
        });
        runtime.adminAuthenticated = true;
        state.admin = result.admin;
        toast("Welcome to the store dashboard.", "✓");
        await loadAdminTab("dashboard");
      } catch (error) {
        toast(error.message, "!");
      }
      return;
    }
    if (
      String(d.get("email")).toLowerCase() === "admin@joneskick.com" &&
      String(d.get("password")) === "admin123"
    ) {
      sessionStorage.setItem("jk_admin_auth", "true");
      renderAdmin();
      toast("Welcome to the store dashboard.", "✓");
    } else toast("Use the static preview access details shown below.", "!");
  }
  async function logout() {
    if (runtime.api) {
      try {
        await api("/api/admin/logout", { method: "POST" });
      } catch (error) {
        toast(error.message, "!");
        return;
      }
      runtime.adminAuthenticated = false;
      state.admin = null;
      state.dashboard = null;
      state.orders = [];
    } else sessionStorage.removeItem("jk_admin_auth");
    state.adminTab = "dashboard";
    renderAdmin();
  }
  async function saveSettings(form) {
    const d = new FormData(form),
      payload = {
        storeName: String(d.get("storeName") || "Jones Kicks"),
        phone: String(d.get("phone") || ""),
        notificationEmail: String(d.get("notificationEmail") || ""),
        orderAlerts: Boolean(state.settings.orderAlerts),
        viewTracking: Boolean(state.settings.viewTracking),
      };
    if (runtime.api) {
      try {
        const result = await api("/api/admin/settings", {
          method: "PUT",
          body: payload,
        });
        state.settings = Object.assign({}, state.settings, result.settings);
        toast("Store settings saved.", "✓");
      } catch (error) {
        toast(error.message, "!");
      }
      return;
    }
    state.settings = Object.assign({}, state.settings, payload);
    save(K.settings, state.settings);
    toast("Store settings saved.", "✓");
  }
  async function sendContact(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    if (runtime.api) {
      try {
        const result = await api("/api/contact", {
          method: "POST",
          body: data,
        });
        form.reset();
        toast(result.message || "Your enquiry has been received.", "✓");
      } catch (error) {
        toast(error.message, "!");
      }
      return;
    }
    form.reset();
    toast("Enquiry captured in this static preview.", "✓");
  }
  async function subscribe(form) {
    const phone = new FormData(form).get("phone");
    if (runtime.api) {
      try {
        const result = await api("/api/subscribers", {
          method: "POST",
          body: { phone: phone },
        });
        form.reset();
        toast(result.message, "✓");
      } catch (error) {
        toast(error.message, "!");
      }
      return;
    }
    form.reset();
    toast("You are on the static preview drop list.", "✓");
  }
  async function lookupOrder(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    if (!runtime.api) {
      toast("Order tracking requires the live backend.", "i");
      return;
    }
    try {
      const result = await api("/api/orders/lookup", {
        method: "POST",
        body: data,
      });
      state.trackedOrder = result.order;
      render();
      toast("Order status loaded.", "✓");
    } catch (error) {
      state.trackedOrder = null;
      toast(error.message, "!");
    }
  }
  async function savePassword(form) {
    if (!runtime.api) {
      toast("Password changes require the live backend.", "i");
      return;
    }
    const d = new FormData(form);
    const payload = {
      currentPassword: String(d.get("currentPassword") || ""),
      newPassword: String(d.get("newPassword") || ""),
    };
    if (payload.newPassword.length < 12) {
      toast("Use at least 12 characters for the new password.", "!");
      return;
    }
    try {
      const result = await api("/api/admin/account/password", {
        method: "PATCH",
        body: payload,
      });
      form.reset();
      toast(result.message || "Administrator password updated.", "✓");
    } catch (error) {
      toast(error.message, "!");
    }
  }
  const loadingOrders = new Set();
  async function loadCustomerOrder(reference) {
    if (loadingOrders.has(reference)) return;
    const token = sessionStorage.getItem(K.orderToken);
    if (!token) return;
    loadingOrders.add(reference);
    try {
      const result = await api(
        "/api/orders/" +
          encodeURIComponent(reference) +
          "?token=" +
          encodeURIComponent(token),
      );
      state.orders = state.orders.filter(function (order) {
        return order.id !== reference;
      });
      state.orders.unshift(result.order);
      const current = url();
      if (current.pathname === "/order-success") {
        document.getElementById("app").innerHTML = success(current);
      }
    } catch (_error) {
      // The generic confirmation remains visible if the private order link is unavailable.
    } finally {
      loadingOrders.delete(reference);
    }
  }
  async function hydrateBackend() {
    if (!runtime.api) return;
    try {
      const session = await api("/api/session");
      runtime.csrfToken = session.csrfToken;
      runtime.adminAuthenticated = session.adminAuthenticated;
      runtime.paymentConfigured = Boolean(session.paymentConfigured);
      runtime.paymentEnvironment = session.paymentEnvironment || "unconfigured";
      runtime.paystackPublicKey = String(session.paystackPublicKey || "");
      state.admin = session.admin || null;
      state.settings = Object.assign(
        {},
        state.settings,
        session.settings || {},
      );
      const catalogueData = await api("/api/products");
      state.products = catalogueData.products;
      migrateCart();
      const path = url().pathname.replace(/\/$/, "") || "/";
      if (path.startsWith("/admin") && runtime.adminAuthenticated) {
        await loadAdminTab("dashboard");
      } else render();
      trackVisit(path);
    } catch (error) {
      runtime.api = false;
      toast(
        "The live store is temporarily unavailable. Showing the saved catalogue.",
        "!",
      );
      render();
    }
  }
  function toast(msg, mark) {
    const stack = document.getElementById("toast-stack");
    if (!stack) return;
    const n = document.createElement("div");
    n.className = "toast";
    n.innerHTML =
      '<span class="toast-mark">' +
      esc(mark || "✓") +
      "</span><span>" +
      esc(msg) +
      "</span>";
    stack.appendChild(n);
    setTimeout(function () {
      n.remove();
    }, 3300);
  }
  document.addEventListener(
    "error",
    function (e) {
      const im = e.target;
      if (!(im instanceof HTMLImageElement)) return;
      if (!im.dataset.fallbackUsed && im.dataset.fallback) {
        im.dataset.fallbackUsed = "1";
        im.src = im.dataset.fallback;
      } else im.classList.add("image-failed");
    },
    true,
  );
  document.addEventListener("click", function (e) {
    const r = e.target.closest("[data-route]");
    if (r) {
      e.preventDefault();
      go(r.dataset.route);
      return;
    }
    const t = e.target.closest("button,[data-cart-open],[data-search-trigger]");
    if (!t) return;
    if (t.matches("[data-cart-open]")) openCart();
    else if (t.matches("[data-layer-close]")) close();
    else if (t.matches("[data-menu]"))
      document.getElementById("mobile-nav").classList.toggle("open");
    else if (t.matches("[data-search-trigger]")) go("/shop");
    else if (t.matches("[data-hero-dot]")) {
      clearInterval(state.timer);
      showHero(Number(t.dataset.heroDot));
    } else if (t.matches("[data-quick]")) quick(t.dataset.quick);
    else if (t.matches("[data-size]")) {
      state.size = normalizeClientSize(t.dataset.size);
      document.querySelectorAll("[data-size]").forEach(function (b) {
        b.classList.toggle(
          "active",
          normalizeClientSize(b.dataset.size) === state.size,
        );
      });
      document.querySelectorAll("[data-add]").forEach(function (b) {
        b.disabled = false;
      });
    } else if (t.matches("[data-add]")) add(t.dataset.add);
    else if (t.matches("[data-wish]")) wish(t.dataset.wish);
    else if (t.matches("[data-filter]")) {
      state.filter = t.dataset.filter;
      render();
    } else if (t.matches("[data-clear-filter]")) {
      state.filter = "All";
      state.query = "";
      render();
    } else if (t.matches("[data-qty]")) qty(t.dataset.line, t.dataset.qty);
    else if (t.matches("[data-remove]")) remove(t.dataset.remove);
    else if (t.matches("[data-promo]")) void applyPromo(false);
    else if (t.matches("[data-promo-remove]")) void applyPromo(true);
    else if (t.matches("[data-order-page]") && !t.disabled) {
      state.adminLoading = true;
      renderAdmin();
      void loadOrders(Number(t.dataset.orderPage))
        .then(function () {
          state.adminLoading = false;
          renderAdmin();
        })
        .catch(function (error) {
          state.adminLoading = false;
          renderAdmin();
          toast(error.message, "!");
        });
    } else if (t.matches("[data-admin-tab]"))
      void loadAdminTab(t.dataset.adminTab);
    else if (t.matches("[data-admin-logout]")) void logout();
    else if (t.matches("[data-new-product]")) editProduct();
    else if (t.matches("[data-add-custom-size]")) addCustomProductSize();
    else if (t.matches("[data-remove-custom-size]")) {
      const row = t.closest("[data-size-row]"),
        form = t.closest("form");
      if (row) row.remove();
      showProductFormError(form, "");
    }
    else if (t.matches("[data-edit-product]"))
      editProduct(t.dataset.editProduct);
    else if (t.matches("[data-delete-product]"))
      askDelete(t.dataset.deleteProduct);
    else if (t.matches("[data-new-coupon]")) editCoupon();
    else if (t.matches("[data-edit-coupon]")) editCoupon(t.dataset.editCoupon);
    else if (t.matches("[data-delete-coupon]"))
      void disableCoupon(t.dataset.deleteCoupon);
    else if (t.matches("[data-message-status]"))
      void updateMessageStatus(t.dataset.messageStatus, t.dataset.status);
    else if (t.matches("[data-delete-message]"))
      void deleteMessage(t.dataset.deleteMessage);
    else if (t.matches("[data-subscriber-toggle]"))
      void toggleSubscriber(
        t.dataset.subscriberToggle,
        t.dataset.active === "true",
      );
    else if (t.matches("[data-delete-subscriber]"))
      void deleteSubscriber(t.dataset.deleteSubscriber);
    else if (t.matches("[data-confirm-delete]"))
      void del(t.dataset.confirmDelete);
    else if (t.matches("[data-order-view]")) openOrder(t.dataset.orderView);
    else if (t.matches("[data-refund-order]"))
      void refundOrder(t.dataset.refundOrder);
    else if (t.matches("[data-save-order]")) {
      const s = document.getElementById("order-status");
      if (s) void saveOrderStatus(t.dataset.saveOrder, s.value);
    } else if (t.matches("[data-toggle-setting]")) {
      const k = t.dataset.toggleSetting;
      state.settings[k] = !state.settings[k];
      t.classList.toggle("on", state.settings[k]);
    }
  });
  document.addEventListener("submit", function (e) {
    const f = e.target;
    if (!(f instanceof HTMLFormElement)) return;
    e.preventDefault();
    if (f.id === "shop-search") {
      state.query = String(new FormData(f).get("query")).trim();
      render();
    } else if (f.id === "admin-product-search") {
      state.adminSearch = String(new FormData(f).get("query")).trim();
      renderAdmin();
    } else if (f.id === "admin-order-search") {
      const d = new FormData(f);
      state.orderSearch = String(d.get("search") || "").trim();
      state.orderStatus = String(d.get("status") || "");
      state.orderPaymentStatus = String(d.get("paymentStatus") || "");
      state.orderPage = 1;
      void loadAdminTab("orders");
    } else if (f.id === "newsletter-form") void subscribe(f);
    else if (f.id === "contact-form") void sendContact(f);
    else if (f.id === "checkout-form")
      void payment(Object.fromEntries(new FormData(f).entries()));
    else if (f.id === "admin-login") void login(f);
    else if (f.id === "product-form") void saveProduct(f);
    else if (f.id === "coupon-form") void saveCoupon(f);
    else if (f.id === "settings-form") void saveSettings(f);
    else if (f.id === "password-form") void savePassword(f);
    else if (f.id === "track-order-form") void lookupOrder(f);
  });
  document.addEventListener("change", function (e) {
    if (e.target.id === "sort-select") {
      state.sort = e.target.value;
      render();
    }
    if (e.target.matches("[data-size-toggle]")) {
      const row = e.target.closest("[data-size-row]"),
        input = row?.querySelector("[data-size-stock]"),
        status = row?.querySelector(".size-inventory-status");
      if (input) {
        input.disabled = !e.target.checked;
        input.required = e.target.checked;
        if (e.target.checked) input.focus();
      }
      if (status) {
        status.textContent = e.target.checked
          ? Number(input && input.value) > 0
            ? "Available"
            : "Shown as sold out"
          : "Hidden";
      }
    }
    if (e.target.matches("[data-size-stock]")) {
      const row = e.target.closest(".size-inventory-row"),
        status = row?.querySelector(".size-inventory-status"),
        enabled = row?.querySelector("[data-size-toggle]")?.checked;
      if (status && enabled) {
        status.textContent = Number(e.target.value) > 0 ? "Available" : "Shown as sold out";
      }
    }
    if (e.target.id === "product-image-upload") {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      if (f.size > 1572864) {
        e.target.value = "";
        toast("Choose an image smaller than 1.5 MB.", "!");
        return;
      }
      const r = new FileReader();
      r.onload = function () {
        state.upload = String(r.result);
        toast("Image ready to save.", "✓");
      };
      r.readAsDataURL(f);
    }
  });
  document.getElementById("drawer-backdrop").addEventListener("click", close);
  document.getElementById("modal-wrap").addEventListener("click", function (e) {
    if (e.target === e.currentTarget) close();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.id === "custom-sneaker-size") {
      e.preventDefault();
      addCustomProductSize();
    } else if (e.key === "Escape") close();
  });
  window.addEventListener("popstate", render);
  window.addEventListener("hashchange", render);
  if (!runtime.api) {
    if (!localStorage.getItem(K.products)) save(K.products, state.products);
    if (!localStorage.getItem(K.settings)) save(K.settings, state.settings);
    if (
      state.settings.viewTracking &&
      !sessionStorage.getItem("jk_view_counted")
    ) {
      state.views.total = Number(state.views.total || 0) + 1;
      state.views.days[day()] = Number(state.views.days[day()] || 0) + 1;
      save(K.views, state.views);
      sessionStorage.setItem("jk_view_counted", "1");
    }
  }
  render();
  void hydrateBackend();
})();
