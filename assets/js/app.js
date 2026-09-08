(function clientApp() {
  "use strict";
  const K = {
    products: "jk_products_v4",
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
    paymentMode: "demo",
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
    whatsappUrl: "https://wa.me/message/6BIGK72XFX23L1",
    instagramUrl: "https://www.instagram.com/teejonesonly",
    instagramHandle: "@teejonesonly",
    tiktokUrl: "https://www.tiktok.com/@tee_jones247",
    tiktokHandle: "@tee_jones247",
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
    upload: "",
    pending: null,
    hero: 0,
    timer: null,
    dashboard: null,
    analytics: null,
    quote: null,
    promotions: [],
    messages: [],
    subscribers: [],
    admin: null,
    orderSearch: "",
    orderStatus: "",
    orderPage: 1,
    orderPages: 1,
    orderTotal: 0,
    promoBusy: false,
    checkoutBusy: false,
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
  function secureUrl(value, fallbackValue) {
    try {
      const parsed = new URL(String(value || ""));
      return parsed.protocol === "https:" ? esc(parsed.href) : esc(fallbackValue);
    } catch (_) {
      return esc(fallbackValue);
    }
  }
  function phoneHref(value) {
    let digits = String(value || "").replace(/\D/g, "");
    if (digits.startsWith("0")) digits = "234" + digits.slice(1);
    return "+" + digits;
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
  function count() {
    return state.cart.reduce(function (n, x) {
      return n + x.qty;
    }, 0);
  }
  function cartProductQuantity(productId) {
    return state.cart.reduce(function (total, item) {
      return total + (item.productId === productId ? item.qty : 0);
    }, 0);
  }
  function cartSignature() {
    return state.cart
      .map(function (item) {
        return item.productId + ":" + item.size + ":" + item.qty;
      })
      .sort()
      .join("|");
  }
  function currentQuote() {
    return state.quote && state.quote.signature === cartSignature()
      ? state.quote
      : null;
  }
  function invalidateQuote() {
    state.quote = null;
  }
  function subtotal() {
    const quote = currentQuote();
    if (quote) return Number(quote.subtotal || 0);
    return state.cart.reduce(function (n, x) {
      const p = product(x.productId);
      return n + (p ? p.price * x.qty : 0);
    }, 0);
  }
  function delivery() {
    const quote = currentQuote();
    if (quote) return Number(quote.deliveryFee || 0);
    return state.cart.reduce(function (n, x) {
      const p = product(x.productId);
      return n + (p ? Number(p.deliveryFee || 0) * x.qty : 0);
    }, 0);
  }
  function discount() {
    const quote = currentQuote();
    return quote ? Number(quote.discount || 0) : 0;
  }
  function total() {
    const quote = currentQuote();
    return quote
      ? Number(quote.total || 0)
      : subtotal() + delivery() - discount();
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
    let p = true
      ? location.hash.slice(1) || "/"
      : location.pathname + location.search;
    if (!p.startsWith("/")) p = "/" + p;
    return new URL(p, "https://joneskick.local");
  }
  function href(p) {
    return true ? "#" + p : p;
  }
  function go(p) {
    close();
    if (true) {
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
      '<div class="announcement">New-season drops available • Select sizes 40–45 • Order securely online</div><div class="site-header"><div class="container header-inner"><button class="header-action menu-btn" data-menu aria-label="Open menu">' +
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
      '" data-route="/contact">Contact</a></nav><div class="header-actions"><button class="header-action" data-search-trigger aria-label="Search">' +
      icon("search") +
      '</button><a class="header-action" href="' +
      href("/wishlist") +
      '" data-route="/wishlist" aria-label="Saved sneakers">' +
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
      '" data-route="/wishlist">Saved sneakers</a><a href="' +
      href("/admin") +
      '" data-route="/admin">Admin</a></nav>';
  }
  function footer() {
    const phone = state.settings.phone || defaults.phone,
      whatsapp = secureUrl(state.settings.whatsappUrl, defaults.whatsappUrl),
      instagram = secureUrl(state.settings.instagramUrl, defaults.instagramUrl),
      tiktok = secureUrl(state.settings.tiktokUrl, defaults.tiktokUrl);
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
      '" data-route="/cart">Shopping bag</a><a href="' +
      href("/wishlist") +
      '" data-route="/wishlist">Saved sneakers</a></div></div><div><p class="footer-title">Company</p><div class="footer-links"><a href="' +
      href("/about") +
      '" data-route="/about">Our story</a><a href="' +
      href("/contact") +
      '" data-route="/contact">Contact</a><a href="' +
      href("/admin") +
      '" data-route="/admin">Admin access</a></div></div><div><p class="footer-title">Connect</p><div class="footer-links"><a href="' +
      whatsapp +
      '" target="_blank" rel="noopener">WhatsApp</a><a href="' +
      instagram +
      '" target="_blank" rel="noopener">Instagram</a><a href="' +
      tiktok +
      '" target="_blank" rel="noopener">TikTok</a><a href="tel:' +
      esc(phoneHref(phone)) +
      '">' +
      esc(phone) +
      '</a></div></div></div><div class="footer-bottom"><span>© ' +
      new Date().getFullYear() +
      " Jones Kicks. All rights reserved.</span><span>Premium sneakers • Sizes 40–45</span></div></div></footer>";
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
        "Sizes 40–45",
        "FIND YOUR",
        "PERFECT PAIR",
        "Choose your size, add delivery details and place your order in a few simple steps.",
        imageRoot + "pics21.jpeg",
        fallback[7],
      ) +
      '<div class="hero-meta"><div class="hero-pager"><button class="hero-dot active" data-hero-dot="0"></button><button class="hero-dot" data-hero-dot="1"></button><button class="hero-dot" data-hero-dot="2"></button></div><div class="hero-stat"><strong>40–45</strong><span>Available<br>sizes</span></div></div></section><div class="marquee"><div class="marquee-track"><span>Fresh drops</span><span>Premium selection</span><span>Secure ordering</span><span>Size 40–45</span><span>Style without limits</span><span>Fresh drops</span><span>Premium selection</span><span>Secure ordering</span><span>Size 40–45</span><span>Style without limits</span></div></div><section class="section-sm"><div class="container"><div class="trust-grid" data-aos="fade-up"><div class="trust-item"><span class="trust-icon">✦</span><h3>Freshly curated</h3><p>A focused edit of standout everyday and limited silhouettes.</p></div><div class="trust-item"><span class="trust-icon">⌁</span><h3>Easy size selection</h3><p>Choose your preferred EU size from 40 through 45.</p></div><div class="trust-item"><span class="trust-icon">✓</span><h3>Smooth ordering</h3><p>Bag your pair, add delivery details and confirm in minutes.</p></div><div class="trust-item"><span class="trust-icon">↗</span><h3>Human support</h3><p>Need help? Continue the conversation directly on WhatsApp.</p></div></div></div></section><section class="section"><div class="container"><div class="section-head"><div><p class="eyebrow">Shop the drop</p><h2 class="display section-title">Fresh on the shelf</h2></div><p class="section-copy">Meet the pairs currently setting the pace. Choose a sneaker, select your size and build your rotation.</p></div><div class="product-grid">' +
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
      '" alt="Jones Kicks culture"></div><div class="story-card"><strong>20+</strong><span>fresh styles in the current collection</span></div></div><div data-aos="fade-left"><p class="eyebrow">More than footwear</p><h2 class="display story-title">Your plug for premium sneakers.</h2><p class="story-copy">Jones Kicks was built for people who want the freshest pairs without unnecessary stress. From iconic classics to new-season releases, every selection is made to help you step up your style.</p><ul class="story-list"><li>Curated silhouettes for modern street style</li><li>Simple sizing across EU 40–45</li><li>Direct support before and after your order</li></ul><a class="btn btn-acid" href="' +
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
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    if (state.sort === "featured")
      list.sort(function (a, b) {
        return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
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
      ' sneakers found</span><span>Available sizes: EU 40–45</span></div><div class="product-grid">' +
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
      '</p><div class="size-label"><span>Select your size</span><span>EU 40–45</span></div><div class="size-grid">' +
      p.sizes
        .map(function (s) {
          return (
            '<button class="size-btn" data-size="' +
            s +
            '" ' +
            (p.stock < 1 ? "disabled" : "") +
            ">" +
            s +
            "</button>"
          );
        })
        .join("") +
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
            "</p></div><strong>" +
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
          '</div><div class="qty"><button data-qty="down" data-line="' +
          esc(x.productId) +
          "|" +
          x.size +
          '">−</button><span>' +
          x.qty +
          '</span><button data-qty="up" data-line="' +
          esc(x.productId) +
          "|" +
          x.size +
          '">+</button></div></div><div class="cart-price"><strong>' +
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
    const quote = currentQuote(),
      promotion = quote && quote.promotion;
    return (
      '<div class="panel summary"><h2>Order summary</h2><div class="summary-line"><span>Products</span><strong>' +
      money(subtotal()) +
      '</strong></div><div class="summary-line"><span>Product delivery fees</span><strong>' +
      money(delivery()) +
      '</strong></div><p class="summary-help">Delivery is calculated from the fee set by the admin for each pair.</p><div class="promo"><input aria-label="Promo code" placeholder="Promo code" value="' +
      esc(promotion ? promotion.code : "") +
      '" ' +
      (promotion ? "readonly" : "") +
      '><button type="button" ' +
      (promotion ? 'data-remove-promo>Remove' : 'data-promo>Apply') +
      "</button></div>" +
      (discount()
        ? '<div class="summary-line discount"><span>Promo discount (' +
          esc(promotion.code) +
          ')</span><strong>−' +
          money(discount()) +
          "</strong></div>"
        : "") +
      '<div class="summary-line total"><span>Total</span><strong>' +
      money(total()) +
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
  function wishlist() {
    const saved = state.products.filter(function (item) {
      return state.wish.includes(item.id);
    });
    return (
      '<section class="page-hero"><div class="container"><div class="breadcrumbs"><a href="' +
      href("/") +
      '" data-route="/">Home</a><span>/</span><span>Saved sneakers</span></div><p class="eyebrow">Your shortlist</p><h1 class="display page-title">Saved pairs.</h1></div></section><section class="section-sm"><div class="container"><div class="results-line"><span>' +
      saved.length +
      " saved sneaker" +
      (saved.length === 1 ? "" : "s") +
      '</span><a href="' +
      href("/shop") +
      '" data-route="/shop">Browse all sneakers</a></div><div class="product-grid">' +
      (saved.length
        ? saved.map(card).join("")
        : '<div class="empty-state"><h2>No saved pairs yet</h2><p>Tap the heart on any sneaker to keep it here.</p><a class="btn btn-acid" href="' +
          href("/shop") +
          '" data-route="/shop">Explore sneakers</a></div>') +
      "</div></div></section>"
    );
  }
  function checkout(u) {
    if (!state.cart.length) return cart();
    const paymentError = u && u.searchParams.get("payment"),
      paymentMessages = {
        "missing-reference": "The payment provider did not return an order reference. Please try again.",
        "order-not-found": "We could not match that payment to an order. Please contact support before trying again.",
        "verification-failed": "Payment could not be verified. If you were debited, contact support with your payment reference.",
      };
    const paymentNote = runtime.api
      ? runtime.paymentMode === "paystack"
        ? "You will be redirected to Paystack to complete your payment securely."
        : "Development demo payment is enabled. Switch PAYMENT_MODE to paystack for live checkout."
      : "Static preview: no live charge will occur until the backend is running.";
    return (
      '<section class="page-hero"><div class="container"><div class="breadcrumbs"><a href="' +
      href("/cart") +
      '" data-route="/cart">Bag</a><span>/</span><span>Checkout</span></div><p class="eyebrow">One final step</p><h1 class="display page-title">Delivery & payment.</h1></div></section><section class="section-sm"><div class="container checkout-layout"><form class="panel checkout-form" id="checkout-form"><div class="form-section"><div class="form-section-head"><span class="step-no">01</span><h2>Contact information</h2></div><div class="field-grid"><div class="field"><label>Full name</label><input name="fullName" autocomplete="name" required placeholder="Your full name"></div><div class="field"><label>Email address</label><input name="email" type="email" autocomplete="email" required placeholder="you@example.com"></div><div class="field full"><label>Phone number</label><input name="phone" autocomplete="tel" inputmode="tel" required placeholder="e.g. 0801 234 5678"></div></div></div><div class="form-section"><div class="form-section-head"><span class="step-no">02</span><h2>Delivery details</h2></div><div class="field-grid"><div class="field full"><label>Delivery address</label><input name="address" autocomplete="street-address" required placeholder="House number, street and area"></div><div class="field"><label>City / town</label><input name="city" required></div><div class="field"><label>State</label><input name="region" required></div><div class="field full"><label>Delivery note (optional)</label><textarea name="notes" placeholder="Landmark or helpful instruction"></textarea></div></div></div><div class="form-section"><div class="form-section-head"><span class="step-no">03</span><h2>Payment method</h2></div><label class="payment-option"><input type="radio" name="payment" value="online" checked><span><strong>Paystack secure payment</strong><span>Choose card, bank transfer, USSD or another available Paystack channel.</span></span></label><p class="prototype-note">' +
      esc(paymentNote) +
      '</p></div>' +
      (paymentMessages[paymentError]
        ? '<div class="form-alert" role="alert">' +
          esc(paymentMessages[paymentError]) +
          "</div>"
        : "") +
      '<button class="btn btn-acid btn-block" data-checkout-submit type="submit" ' +
      (state.checkoutBusy ? "disabled" : "") +
      ">" +
      (state.checkoutBusy ? "Preparing secure payment…" : "Pay securely • " + money(total())) +
      '</button></form><aside class="panel checkout-summary"><div class="admin-card-head"><h3>Your order</h3><a href="' +
      href("/cart") +
      '" data-route="/cart">Edit bag</a></div><div class="mini-items">' +
      rows(true) +
      '</div><div class="summary-line"><span>Products</span><strong>' +
      money(subtotal()) +
      '</strong></div><div class="summary-line"><span>Product delivery fees</span><strong>' +
      money(delivery()) +
      "</strong></div>" +
      (discount()
        ? '<div class="summary-line discount"><span>Promo discount</span><strong>−' +
          money(discount()) +
          "</strong></div>"
        : "") +
      '<div class="summary-line total"><span>Total</span><strong>' +
      money(total()) +
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
      needsReview = o && o.status === "Needs review",
      note = runtime.api
        ? "Your payment and order are recorded securely. Your receipt is sent automatically when email delivery is configured."
        : "This order belongs to the static interface preview.";
    return (
      '<section class="success-wrap"><div class="success-card animate__animated animate__fadeInUp"><span class="success-icon">✓</span><p class="eyebrow">Payment confirmed</p><h1 class="display">' +
      (needsReview ? "Your order is being reviewed." : "Your pair is reserved.") +
      '</h1><p class="muted">' +
      (needsReview
        ? "Payment is confirmed, but one item needs a stock check. The Jones Kicks team will contact you shortly."
        : "Thanks for shopping Jones Kicks. The order is now in the admin order centre and the team will confirm the delivery step.") +
      '</p><span class="order-ref">Order ' +
      esc(ref) +
      "</span>" +
      (o
        ? "<p><strong>" +
          money(o.total) +
          "</strong> • " +
          esc(o.paymentStatus) +
          "</p>"
        : "") +
      '<div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:22px"><a class="btn btn-acid" href="' +
      href("/shop") +
      '" data-route="/shop">Continue shopping</a><a class="btn btn-outline" href="' +
      secureUrl(state.settings.whatsappUrl, defaults.whatsappUrl) +
      '" target="_blank" rel="noopener">Chat on WhatsApp</a></div><p class="prototype-note" style="text-align:left">' +
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
      '" alt="Jones Kicks style"><div class="about-badge"><strong>40–45</strong><span>Every available EU size, clearly displayed</span></div></div></section><section class="section"><div class="container"><div class="section-head"><div><p class="eyebrow">What guides us</p><h2 class="display section-title">Made for better steps.</h2></div><p class="section-copy">A focused collection, a clearer way to choose and a human team when you need help.</p></div><div class="values-grid"><article class="value-card"><span class="value-no">01</span><h3>Fresh selection</h3><p>Wearable classics, standout drops and versatile daily pairs.</p></article><article class="value-card"><span class="value-no">02</span><h3>Simple experience</h3><p>From selecting size to adding your address, ordering feels quick and clear.</p></article><article class="value-card"><span class="value-no">03</span><h3>Personal support</h3><p>Questions about a pair or size? We are one WhatsApp message away.</p></article></div></div></section>'
    );
  }
  function contact() {
    const phone = state.settings.phone || defaults.phone;
    return `<section class="page-hero"><div class="container"><div class="breadcrumbs"><a href="${href("/")}" data-route="/">Home</a><span>/</span><span>Contact</span></div><p class="eyebrow">Talk to us</p><h1 class="display page-title">We are one message away.</h1></div></section><section class="section-sm"><div class="container contact-layout"><div class="contact-card"><p class="eyebrow">Jones Kicks support</p><h2 class="display">Let us help you find the pair.</h2><div class="contact-links"><a class="contact-link" href="tel:${esc(phoneHref(phone))}"><div><strong>Call us</strong><span>${esc(phone)}</span></div><b>↗</b></a><a class="contact-link" href="${secureUrl(state.settings.whatsappUrl, defaults.whatsappUrl)}" target="_blank" rel="noopener"><div><strong>WhatsApp</strong><span>Fast order and sizing support</span></div><b>↗</b></a><a class="contact-link" href="${secureUrl(state.settings.instagramUrl, defaults.instagramUrl)}" target="_blank" rel="noopener"><div><strong>Instagram</strong><span>${esc(state.settings.instagramHandle || defaults.instagramHandle)}</span></div><b>↗</b></a><a class="contact-link" href="${secureUrl(state.settings.tiktokUrl, defaults.tiktokUrl)}" target="_blank" rel="noopener"><div><strong>TikTok</strong><span>${esc(state.settings.tiktokHandle || defaults.tiktokHandle)}</span></div><b>↗</b></a></div></div><form class="contact-form-card" id="contact-form"><p class="eyebrow">Send an enquiry</p><h2 style="margin:0 0 26px;font-size:27px">How can we help?</h2><div class="field-grid"><div class="field"><label>Your name</label><input name="name" autocomplete="name" required></div><div class="field"><label>Phone number</label><input name="phone" autocomplete="tel" inputmode="tel" required></div><div class="field full"><label>Message</label><textarea name="message" required placeholder="Tell us the sneaker or size you need"></textarea></div></div><button class="btn btn-acid" style="margin-top:20px">Send enquiry</button><p class="prototype-note">Your enquiry is saved securely for Jones Kicks support.</p></form></div></section>`;
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
      ["messages", "✉", "Inbox"],
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
      newOrderCount = metrics
        ? metrics.newOrders
        : state.orders.filter(function (o) {
            return o.status === "New";
          }).length,
      visitorCount = metrics
        ? metrics.totalVisitors
        : Number(state.views.total || 0),
      catalogueCount = metrics ? metrics.products : state.products.length,
      lowStock = metrics
        ? metrics.lowStock
        : state.products.filter(function (item) {
            return item.stock <= 4;
          }).length,
      unreadMessages = metrics ? metrics.unreadMessages : 0,
      activeSubscribers = metrics ? metrics.activeSubscribers : 0,
      activePromotions = metrics ? metrics.activePromotions : 0,
      days = viewDays(),
      max = Math.max.apply(
        null,
        days
          .map(function (x) {
            return x.count;
          })
          .concat([1]),
      ),
      top =
        state.dashboard && state.dashboard.topProducts?.length
          ? state.dashboard.topProducts.map(function (item) {
              return Object.assign({ fallback: fallback[0] }, item);
            })
          : state.products.slice(0, 5);
    return (
      '<div class="admin-heading"><div><h2>Store overview</h2><p>Live catalogue, payment, order and visitor activity.</p></div><button class="btn btn-acid" data-new-product>Add sneaker</button></div><div class="kpi-grid"><div class="kpi"><div class="kpi-top"><span>Unique visitors</span><span class="kpi-icon">↗</span></div><strong>' +
      Number(visitorCount).toLocaleString() +
      '</strong><small>Tracked across the website</small></div><div class="kpi"><div class="kpi-top"><span>Total orders</span><span class="kpi-icon">▤</span></div><strong>' +
      orderCount +
      "</strong><small>" +
      newOrderCount +
      ' new paid orders</small></div><div class="kpi"><div class="kpi-top"><span>Paid revenue</span><span class="kpi-icon">₦</span></div><strong>' +
      money(rev) +
      '</strong><small>Verified payment value</small></div><div class="kpi"><div class="kpi-top"><span>Catalogue</span><span class="kpi-icon">◇</span></div><strong>' +
      catalogueCount +
      '</strong><small>Active sneaker styles</small></div></div><div class="ops-grid"><button data-admin-tab="catalogue"><span>Low stock</span><strong>' +
      lowStock +
      '</strong></button><button data-admin-tab="messages"><span>Unread enquiries</span><strong>' +
      unreadMessages +
      '</strong></button><button data-admin-tab="subscribers"><span>Drop-list subscribers</span><strong>' +
      activeSubscribers +
      '</strong></button><button data-admin-tab="promotions"><span>Active promotions</span><strong>' +
      activePromotions +
      '</strong></button></div><div class="admin-grid"><div class="admin-card"><div class="admin-card-head"><h3>Unique visitors • Last 7 days</h3><button data-admin-tab="analytics">View report</button></div><div class="chart">' +
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
      '</div></div><div class="admin-card"><div class="admin-card-head"><h3>Top-selling sneakers</h3><button data-admin-tab="catalogue">Manage</button></div><div class="top-products">' +
      top
        .map(function (p) {
          return (
            '<div class="top-product">' +
            img(p) +
            "<div><h4>" +
            esc(p.name) +
            "</h4><p>" +
            (p.sales != null ? p.sales + " pairs sold" : p.stock + " pairs in stock") +
            "</p></div><strong>" +
            (p.revenue != null ? money(p.revenue) : money(p.price)) +
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
      '<div class="admin-heading"><div><h2>Sneaker catalogue</h2><p>Add pairs and update prices, delivery fees, pictures, stock and descriptions.</p></div><button class="btn btn-acid" data-new-product>Add sneaker</button></div><div class="table-card"><div class="table-tools"><form class="search-box" id="admin-product-search"><input name="query" value="' +
      esc(state.adminSearch) +
      '" placeholder="Search catalogue"><button>' +
      icon("search") +
      '</button></form><span class="muted">' +
      list.length +
      ' products</span></div><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Product</th><th>Price</th><th>Delivery fee</th><th>Sizes</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead><tbody>' +
      list
        .map(function (p) {
          const s =
            p.stock < 1 ? "Sold out" : p.stock < 5 ? "Low stock" : "Active";
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
            '</strong><br><span class="muted">per pair</span></td><td>40–45</td><td>' +
            p.stock +
            '</td><td><span class="status ' +
            (s === "Sold out" ? "sold" : s === "Low stock" ? "low" : "") +
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
    const q = state.orderSearch.toLowerCase(),
      list = runtime.api
        ? state.orders
        : state.orders.filter(function (order) {
            const matchesText = (
              order.id +
              " " +
              order.customer.fullName +
              " " +
              order.customer.phone +
              " " +
              (order.customer.email || "")
            )
              .toLowerCase()
              .includes(q);
            return (
              matchesText &&
              (!state.orderStatus || order.status === state.orderStatus)
            );
          }),
      pagination =
        runtime.api && state.orderPages > 1
          ? '<div class="table-pagination"><button class="icon-btn" data-order-page="' +
            (state.orderPage - 1) +
            '" ' +
            (state.orderPage <= 1 ? "disabled" : "") +
            '>Previous</button><span>Page ' +
            state.orderPage +
            " of " +
            state.orderPages +
            " • " +
            state.orderTotal +
            ' orders</span><button class="icon-btn" data-order-page="' +
            (state.orderPage + 1) +
            '" ' +
            (state.orderPage >= state.orderPages ? "disabled" : "") +
            ">Next</button></div>"
          : "";
    const newOrders =
      state.dashboard?.metrics?.newOrders ??
      state.orders.filter(function (order) {
        return order.status === "New";
      }).length;
    return (
      '<div class="admin-heading"><div><h2>Orders</h2><p>Review customer delivery details and update fulfilment.</p></div><span class="status pending">' +
      newOrders +
      ' new</span></div><div class="table-card"><div class="table-tools"><form class="search-box" id="admin-order-search"><input name="query" value="' +
      esc(state.orderSearch) +
      '" placeholder="Search order or customer"><button>' +
      icon("search") +
      '</button></form><select class="select-control" id="admin-order-status"><option value="">All statuses</option>' +
      [
        "Awaiting payment",
        "New",
        "Confirmed",
        "Processing",
        "Dispatched",
        "Completed",
        "Cancelled",
        "Needs review",
      ]
        .map(function (status) {
          return (
            '<option value="' +
            esc(status) +
            '" ' +
            (state.orderStatus === status ? "selected" : "") +
            ">" +
            esc(status) +
            "</option>"
          );
        })
        .join("") +
      '</select></div>' +
      ordersTable(list) +
      pagination +
      "</div>"
    );
  }
  function promotionState(p) {
    const now = Date.now();
    if (!p.active) return "Inactive";
    if (p.startsAt && new Date(p.startsAt).getTime() > now) return "Scheduled";
    if (p.endsAt && new Date(p.endsAt).getTime() < now) return "Expired";
    if (p.usageLimit && p.usedCount >= p.usageLimit) return "Used up";
    return "Active";
  }
  function promotions() {
    return (
      '<div class="admin-heading"><div><h2>Promotions</h2><p>Create working discount codes for the shopping bag and checkout.</p></div><button class="btn btn-acid" data-new-promotion>Create promo code</button></div><div class="table-card">' +
      (state.promotions.length
        ? '<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Code</th><th>Offer</th><th>Minimum</th><th>Usage</th><th>Validity</th><th>Status</th><th>Actions</th></tr></thead><tbody>' +
          state.promotions
            .map(function (p) {
              const status = promotionState(p),
                offer =
                  p.type === "percentage"
                    ? p.value + "% off"
                    : money(p.value) + " off";
              return (
                '<tr><td><strong class="promo-code">' +
                esc(p.code) +
                "</strong></td><td>" +
                esc(offer) +
                (p.maximumDiscount
                  ? '<br><span class="muted">Maximum ' +
                    money(p.maximumDiscount) +
                    "</span>"
                  : "") +
                "</td><td>" +
                money(p.minimumSubtotal) +
                "</td><td>" +
                p.usedCount +
                " / " +
                (p.usageLimit || "Unlimited") +
                "</td><td>" +
                (p.endsAt ? date(p.endsAt) : "No expiry") +
                '</td><td><span class="status ' +
                (status === "Active" ? "" : "pending") +
                '">' +
                esc(status) +
                '</span></td><td><div class="actions"><button class="icon-btn" data-edit-promotion="' +
                esc(p.id) +
                '">Edit</button>' +
                (p.active
                  ? '<button class="icon-btn" data-delete-promotion="' +
                    esc(p.id) +
                    '">Deactivate</button>'
                  : "") +
                "</div></td></tr>"
              );
            })
            .join("") +
          "</tbody></table></div>"
        : '<div class="empty-state" style="padding:45px 20px"><h2>No promo codes yet</h2><p>Create a code customers can apply to eligible orders.</p><button class="btn btn-acid" data-new-promotion>Create promo code</button></div>') +
      "</div>"
    );
  }
  function messages() {
    return (
      '<div class="admin-heading"><div><h2>Customer inbox</h2><p>Read and manage enquiries submitted from the contact page.</p></div><span class="status pending">' +
      state.messages.filter(function (item) {
        return item.status === "New";
      }).length +
      ' new</span></div><div class="table-card">' +
      (state.messages.length
        ? '<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Customer</th><th>Message</th><th>Status</th><th>Received</th><th>Action</th></tr></thead><tbody>' +
          state.messages
            .map(function (item) {
              return (
                '<tr><td><strong>' +
                esc(item.name) +
                '</strong><br><a href="tel:' +
                esc(phoneHref(item.phone)) +
                '">' +
                esc(item.phone) +
                '</a></td><td><span class="message-preview">' +
                esc(item.message) +
                '</span></td><td><span class="status ' +
                (item.status === "New" ? "pending" : "") +
                '">' +
                esc(item.status) +
                "</span></td><td>" +
                date(item.createdAt) +
                '</td><td><button class="icon-btn" data-message-view="' +
                esc(item._id || item.id) +
                '">Open</button></td></tr>'
              );
            })
            .join("") +
          "</tbody></table></div>"
        : '<div class="empty-state" style="padding:45px 20px"><h2>No enquiries yet</h2><p>Messages from the contact page will appear here.</p></div>') +
      "</div>"
    );
  }
  function subscribers() {
    return (
      '<div class="admin-heading"><div><h2>WhatsApp subscribers</h2><p>Manage customers who joined the new-drop list.</p></div><span class="status">' +
      state.subscribers.filter(function (item) {
        return item.active;
      }).length +
      ' active</span></div><div class="table-card">' +
      (state.subscribers.length
        ? '<div class="data-table-wrap"><table class="data-table"><thead><tr><th>WhatsApp number</th><th>Source</th><th>Joined</th><th>Status</th><th>Action</th></tr></thead><tbody>' +
          state.subscribers
            .map(function (item) {
              return (
                '<tr><td><strong>' +
                esc(item.phone) +
                "</strong></td><td>" +
                esc(item.source || "storefront") +
                "</td><td>" +
                date(item.createdAt) +
                '</td><td><span class="status ' +
                (item.active ? "" : "pending") +
                '">' +
                (item.active ? "Active" : "Inactive") +
                '</span></td><td><button class="icon-btn" data-subscriber-toggle="' +
                esc(item._id || item.id) +
                '" data-active="' +
                String(Boolean(item.active)) +
                '">' +
                (item.active ? "Deactivate" : "Reactivate") +
                "</button></td></tr>"
              );
            })
            .join("") +
          "</tbody></table></div>"
        : '<div class="empty-state" style="padding:45px 20px"><h2>No subscribers yet</h2><p>New-drop sign-ups will appear here.</p></div>') +
      "</div>"
    );
  }
  function analytics() {
    const days = viewDays(),
      details = state.analytics || {},
      max = Math.max.apply(
        null,
        days
          .map(function (x) {
            return x.count;
          })
          .concat([1]),
      ),
      orderCount =
        state.dashboard && state.dashboard.metrics
          ? state.dashboard.metrics.orders
          : state.orders.length;
    return (
      '<div class="admin-heading"><div><h2>Website analytics</h2><p>Understand how many people are visiting the store.</p></div><span class="status">Tracking ' +
      (state.settings.viewTracking ? "on" : "off") +
      '</span></div><div class="kpi-grid"><div class="kpi"><div class="kpi-top"><span>Unique visitors</span><span class="kpi-icon">↗</span></div><strong>' +
      Number(state.views.total || 0).toLocaleString() +
      '</strong><small>Selected reporting period</small></div><div class="kpi"><div class="kpi-top"><span>Today</span><span class="kpi-icon">•</span></div><strong>' +
      (state.views.days[day()] || 0) +
      '</strong><small>Unique visitors today</small></div><div class="kpi"><div class="kpi-top"><span>Page views</span><span class="kpi-icon">◇</span></div><strong>' +
      Number(details.totalPageViews || 0).toLocaleString() +
      '</strong><small>Selected reporting period</small></div><div class="kpi"><div class="kpi-top"><span>Order rate</span><span class="kpi-icon">%</span></div><strong>' +
      (state.views.total
        ? Math.round((orderCount / state.views.total) * 100)
        : 0) +
      '%</strong><small>Orders ÷ visitors</small></div></div><div class="admin-card"><div class="admin-card-head"><h3>Unique visitors over the last seven days</h3><span class="muted">Server-side analytics</span></div><div class="chart" style="height:330px">' +
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
      '</div><p class="prototype-note">Visitor identities are stored as privacy-preserving hashes; raw identifiers and IP addresses are not retained.</p></div><div class="analytics-detail-grid"><section class="admin-card"><div class="admin-card-head"><h3>Most visited pages</h3><span class="muted">Visitors</span></div><div class="rank-list">' +
      ((details.topPaths || []).length
        ? details.topPaths
            .map(function (item) {
              return (
                '<div><span>' +
                esc(item._id || "/") +
                "</span><strong>" +
                Number(item.visitors || 0).toLocaleString() +
                "</strong></div>"
              );
            })
            .join("")
        : '<p class="muted">No page data yet.</p>') +
      '</div></section><section class="admin-card"><div class="admin-card-head"><h3>Top referrers</h3><span class="muted">Visitors</span></div><div class="rank-list">' +
      ((details.referrers || []).length
        ? details.referrers
            .map(function (item) {
              return (
                '<div><span>' +
                esc(item._id || "Direct") +
                "</span><strong>" +
                Number(item.visitors || 0).toLocaleString() +
                "</strong></div>"
              );
            })
            .join("")
        : '<p class="muted">No external referrers yet.</p>') +
      '</div></section><section class="admin-card"><div class="admin-card-head"><h3>Most viewed products</h3><span class="muted">Views</span></div><div class="rank-list">' +
      ((details.topViewedProducts || []).length
        ? details.topViewedProducts
            .map(function (item) {
              return (
                '<div><span>' +
                esc(item.name) +
                "</span><strong>" +
                Number(item.views || 0).toLocaleString() +
                "</strong></div>"
              );
            })
            .join("")
        : '<p class="muted">No product views yet.</p>') +
      "</div></section></div>"
    );
  }
  function settings() {
    return `<div class="admin-heading"><div><h2>Store settings</h2><p>Manage customer contact, social links, notifications and account security.</p></div></div><form id="settings-form"><div class="settings-grid"><section class="settings-card"><h3>Store profile</h3><p>Customer-facing store details.</p><div class="field"><label>Store name</label><input name="storeName" required value="${esc(state.settings.storeName)}"></div><div class="field"><label>Customer phone</label><input name="phone" required value="${esc(state.settings.phone)}"></div><div class="field"><label>WhatsApp URL</label><input name="whatsappUrl" type="url" required value="${esc(state.settings.whatsappUrl || defaults.whatsappUrl)}"></div></section><section class="settings-card"><h3>Social channels</h3><p>Links shown on the contact page and footer.</p><div class="field"><label>Instagram URL</label><input name="instagramUrl" type="url" required value="${esc(state.settings.instagramUrl || defaults.instagramUrl)}"></div><div class="field"><label>Instagram handle</label><input name="instagramHandle" required value="${esc(state.settings.instagramHandle || defaults.instagramHandle)}"></div><div class="field"><label>TikTok URL</label><input name="tiktokUrl" type="url" required value="${esc(state.settings.tiktokUrl || defaults.tiktokUrl)}"></div><div class="field"><label>TikTok handle</label><input name="tiktokHandle" required value="${esc(state.settings.tiktokHandle || defaults.tiktokHandle)}"></div></section><section class="settings-card"><h3>Order email notifications</h3><p>Set the inbox that receives verified paid-order alerts.</p><div class="field"><label>Notification email</label><input name="notificationEmail" type="email" value="${esc(state.settings.notificationEmail)}" placeholder="orders@yourdomain.com"><small>SMTP credentials must also be configured on the server.</small></div><div class="toggle-row"><div><strong>New-order alerts</strong><span>Email the owner after confirmed payment</span></div><button type="button" aria-label="Toggle new-order alerts" class="toggle ${state.settings.orderAlerts ? "on" : ""}" data-toggle-setting="orderAlerts"></button></div><div class="toggle-row"><div><strong>Website view tracking</strong><span>Measure unique visitors and page views</span></div><button type="button" aria-label="Toggle website analytics" class="toggle ${state.settings.viewTracking ? "on" : ""}" data-toggle-setting="viewTracking"></button></div></section></div><button class="btn btn-acid" style="margin-top:18px">Save store settings</button></form><form class="settings-card account-security" id="password-form"><h3>Administrator password</h3><p>Use at least 12 characters. Updating it signs out every other admin session.</p><div class="field-grid"><div class="field"><label>Current password</label><input name="currentPassword" type="password" autocomplete="current-password" required minlength="8"></div><div class="field"><label>New password</label><input name="newPassword" type="password" autocomplete="new-password" required minlength="12"></div></div><button class="btn btn-outline" style="margin-top:18px">Update password</button></form>`;
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
        messages: "Customer inbox",
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
      title[state.adminTab] +
      '</h1><div class="admin-user"><span class="avatar">JK</span><div><strong>' +
      esc(state.admin?.name || "Store Admin") +
      '</strong><span>' +
      esc(state.admin?.email || "Jones Kicks") +
      "</span></div></div></header><main class=\"admin-content\">" +
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
    } else if (path === "/wishlist") {
      app.innerHTML = wishlist();
      document.title = "Saved Sneakers • Jones Kicks";
    } else if (path === "/checkout") {
      app.innerHTML = checkout(u);
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
        ' per pair</strong></p><div class="size-label"><span>Choose size</span><span>EU 40–45</span></div><div class="size-grid">' +
        p.sizes
          .map(function (s) {
            return (
              '<button class="size-btn" data-size="' +
              s +
              '" ' +
              (p.stock < 1 ? "disabled" : "") +
              ">" +
              s +
              "</button>"
            );
          })
          .join("") +
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
    if (p.stock < 1) return toast("This sneaker is currently sold out.", "!");
    const x = state.cart.find(function (i) {
      return i.productId === id && i.size === state.size;
    });
    if (x && x.qty >= 10) {
      return toast("A maximum of 10 pairs is allowed per size.", "!");
    }
    if (cartProductQuantity(id) >= p.stock) {
      return toast(`Only ${p.stock} pair(s) are currently available.`, "!");
    }
    if (x) x.qty++;
    else state.cart.push({ productId: id, size: state.size, qty: 1 });
    invalidateQuote();
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
    if (dir === "up" && item.qty >= 10) {
      toast("A maximum of 10 pairs is allowed per size.", "!");
      return;
    }
    if (
      dir === "up" &&
      p &&
      cartProductQuantity(item.productId) >= Number(p.stock || 0)
    ) {
      toast(`Only ${p.stock} pair(s) are currently available.`, "!");
      return;
    }
    item.qty += dir === "up" ? 1 : -1;
    if (item.qty <= 0)
      state.cart = state.cart.filter(function (i) {
        return i !== item;
      });
    invalidateQuote();
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
    invalidateQuote();
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
  async function applyPromotion(button) {
    if (state.promoBusy) return;
    const input = button.closest(".promo")?.querySelector("input"),
      code = String(input?.value || "")
        .trim()
        .toUpperCase();
    if (!code) return toast("Enter a promo code first.", "!");
    if (!runtime.api) {
      return toast("Promo codes are available on the live store.", "i");
    }
    state.promoBusy = true;
    button.disabled = true;
    button.textContent = "Checking…";
    try {
      const quote = await api("/api/orders/quote", {
        method: "POST",
        body: { items: state.cart, promotionCode: code },
      });
      state.quote = Object.assign({}, quote, { signature: cartSignature() });
      render();
      toast(`${quote.promotion.code} applied successfully.`, "✓");
    } catch (error) {
      invalidateQuote();
      button.disabled = false;
      button.textContent = "Apply";
      toast(error.message, "!");
    } finally {
      state.promoBusy = false;
    }
  }
  function removePromotion() {
    invalidateQuote();
    render();
    toast("Promo code removed.", "✓");
  }
  async function payment(customer) {
    if (state.checkoutBusy) return;
    state.checkoutBusy = true;
    const displayedQuote = {
        subtotal: subtotal(),
        discount: discount(),
        deliveryFee: delivery(),
        total: total(),
      },
      appliedCode = currentQuote()?.promotion?.code || "";
    const submit = document.querySelector("[data-checkout-submit]");
    if (submit) {
      submit.disabled = true;
      submit.textContent = "Preparing secure payment…";
    }
    state.pending = {
      customer: customer,
      total: total(),
      items: JSON.parse(JSON.stringify(state.cart)),
    };
    if (!runtime.api) {
      modal(
        '<div class="payment-modal"><div class="payment-brand"><a class="brand">' +
          brand() +
          '</a><span class="status pending">Static preview</span></div><div class="payment-amount"><span>Total to pay</span><strong>' +
          money(total()) +
          '</strong></div><p>No live charge occurs in the static preview.</p><button class="btn btn-acid btn-block" data-payment-success>Simulate successful payment</button><button class="btn btn-outline btn-block" data-layer-close style="margin-top:8px">Return to checkout</button></div>',
        "payment-modal",
      );
      state.checkoutBusy = false;
      return;
    }
    modal(
      '<div class="payment-modal"><div class="payment-brand"><a class="brand">' +
        brand() +
        '</a><span class="status pending">Secure checkout</span></div><div class="payment-amount"><span>Confirming total</span><strong>' +
        money(total()) +
        '</strong></div><div class="admin-loading compact"><span></span><p>Preparing your order securely…</p></div></div>',
      "payment-modal",
    );
    try {
      const freshQuote = await api("/api/orders/quote", {
        method: "POST",
        body: { items: state.cart, promotionCode: appliedCode },
      });
      state.quote = Object.assign({}, freshQuote, { signature: cartSignature() });
      if (
        ["subtotal", "discount", "deliveryFee", "total"].some(function (key) {
          return Number(freshQuote[key] || 0) !== Number(displayedQuote[key] || 0);
        })
      ) {
        state.pending = null;
        state.checkoutBusy = false;
        close();
        render();
        toast("Your order total changed. Review the updated amount before paying.", "!");
        return;
      }
      const payload = await api("/api/orders", {
        method: "POST",
        body: {
          customer: customer,
          items: state.cart,
          paymentMethod: customer.payment,
          promotionCode: freshQuote.promotion ? freshQuote.promotion.code : "",
        },
      });
      sessionStorage.setItem("jk_last_order", payload.order.reference);
      sessionStorage.setItem(K.orderToken, payload.orderToken);
      if (payload.payment.mode === "paystack") {
        window.location.assign(payload.payment.authorizationUrl);
        return;
      }
      state.pending = {
        order: payload.order,
        demoToken: payload.payment.demoToken,
        orderToken: payload.orderToken,
      };
      state.checkoutBusy = false;
      modal(
        '<div class="payment-modal"><div class="payment-brand"><a class="brand">' +
          brand() +
          '</a><span class="status pending">Development mode</span></div><div class="payment-amount"><span>Total to pay</span><strong>' +
          money(payload.order.total) +
          '</strong></div><p>The complete Paystack workflow is connected. This local environment uses its safe demo-payment switch.</p><button class="btn btn-acid btn-block" data-payment-success>Complete demo payment</button><button class="btn btn-outline btn-block" data-layer-close style="margin-top:8px">Return to checkout</button></div>',
        "payment-modal",
      );
    } catch (error) {
      state.checkoutBusy = false;
      close();
      toast(error.message, "!");
    }
  }
  async function complete() {
    if (!state.pending) return;
    if (runtime.api) {
      try {
        const payload = await api(
          "/api/orders/" +
            encodeURIComponent(state.pending.order.reference) +
            "/demo-pay",
          { method: "POST", body: { demoToken: state.pending.demoToken } },
        );
        state.orders.unshift(payload.order);
        state.cart = [];
        invalidateQuote();
        save(K.cart, state.cart);
        sessionStorage.setItem("jk_last_order", payload.order.reference);
        sessionStorage.setItem(K.orderToken, payload.orderToken);
        state.pending = null;
        go(
          "/order-success?order=" + encodeURIComponent(payload.order.reference),
        );
      } catch (error) {
        toast(error.message, "!");
      }
      return;
    }
    const o = {
      id:
        "JK-" +
        new Date().getFullYear().toString().slice(-2) +
        String(Date.now()).slice(-6),
      customer: state.pending.customer,
      items: state.pending.items,
      subtotal: subtotal(),
      delivery: delivery(),
      total: state.pending.total,
      paymentMethod: state.pending.customer.payment,
      paymentStatus: "Paid • UI demo",
      status: "New",
      createdAt: Date.now(),
    };
    state.orders.unshift(o);
    state.cart = [];
    invalidateQuote();
    save(K.orders, state.orders);
    save(K.cart, state.cart);
    sessionStorage.setItem("jk_last_order", o.id);
    state.pending = null;
    go("/order-success?order=" + encodeURIComponent(o.id));
  }
  function editProduct(id) {
    const p = id ? product(id) : null;
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
        '"><small>This exact fee follows the product into cart, checkout and the order.</small></div><div class="field"><label>Stock quantity</label><input name="stock" type="number" min="0" required value="' +
        esc(p ? p.stock : 1) +
        '"></div><div class="field full"><label class="check-row"><input name="featured" type="checkbox" ' +
        (!p || p.featured ? "checked" : "") +
        '><span><strong>Feature this sneaker</strong><small>Show it in the homepage collection.</small></span></label></div><div class="field full"><label>Image URL</label><input name="image" value="' +
        esc(p ? p.image : "") +
        '"></div><div class="field full"><label>Or upload product image</label><input id="product-image-upload" type="file" accept="image/png,image/jpeg,image/webp"><small>JPG, PNG or WebP; maximum 1.5 MB.</small></div><div class="field full"><label>Description</label><textarea name="description" required>' +
        esc(p ? p.description : "") +
        '</textarea></div></div><div class="modal-actions"><button type="button" class="btn btn-outline" data-layer-close>Cancel</button><button class="btn btn-acid">Save sneaker</button></div></form>',
      "admin-modal",
    );
  }
  async function saveProduct(form) {
    const d = new FormData(form),
      old = product(String(d.get("id"))),
      payload = {
        name: String(d.get("name")).trim(),
        category: String(d.get("category")).trim(),
        tag: String(d.get("tag") || "New").trim(),
        price: Number(d.get("price")),
        comparePrice: Number(d.get("comparePrice")) || Number(d.get("price")),
        deliveryFee: Number(d.get("deliveryFee")),
        stock: Number(d.get("stock")),
        image: String(d.get("image") || (old && old.image) || fallback[0]),
        imageData: state.upload,
        description: String(d.get("description")).trim(),
        featured: d.get("featured") === "on",
      };
    if (runtime.api) {
      try {
        const result = await api(
            old
              ? "/api/admin/products/" + encodeURIComponent(old.id)
              : "/api/admin/products",
            { method: old ? "PATCH" : "POST", body: payload },
          ),
          p = result.product;
        if (old) state.products[state.products.indexOf(old)] = p;
        else state.products.unshift(p);
        close();
        toast(old ? "Sneaker updated." : "New sneaker added.", "✓");
        renderAdmin();
      } catch (error) {
        toast(error.message, "!");
      }
      return;
    }
    const p = Object.assign(
      {
        id: old ? old.id : "jk-" + Date.now().toString(36),
        fallback: old
          ? old.fallback
          : fallback[state.products.length % fallback.length],
        sizes: [40, 41, 42, 43, 44, 45],
        featured: old ? old.featured : true,
        active: true,
        createdAt: old ? old.createdAt : Date.now(),
      },
      payload,
      { image: state.upload || payload.image },
    );
    delete p.imageData;
    if (old) state.products[state.products.indexOf(old)] = p;
    else state.products.unshift(p);
    if (save(K.products, state.products)) {
      close();
      toast(old ? "Sneaker updated." : "New sneaker added.", "✓");
      renderAdmin();
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
    state.wish = state.wish.filter(function (productId) {
      return productId !== id;
    });
    state.cart = state.cart.filter(function (x) {
      return x.productId !== id;
    });
    save(K.products, state.products);
    save(K.cart, state.cart);
    save(K.wish, state.wish);
    close();
    renderAdmin();
    toast("Sneaker removed.", "✓");
  }
  function openOrder(id) {
    const o = state.orders.find(function (x) {
      return x.id === id;
    });
    if (!o) return;
    const paid = o.paymentStatus === "paid",
      locked = o.status === "Cancelled",
      canSendStatus =
        paid &&
        [
          "Confirmed",
          "Processing",
          "Dispatched",
          "Completed",
          "Cancelled",
          "Needs review",
        ].includes(o.status),
      statuses = paid
        ? o.status === "Needs review"
          ? ["Needs review", "Confirmed", "Cancelled"]
          : [
              "New",
              "Confirmed",
              "Processing",
              "Dispatched",
              "Completed",
              "Cancelled",
              "Needs review",
            ]
        : ["Awaiting payment", "Cancelled", "Needs review"],
      statusOptions = statuses
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
        .join(""),
      history = (o.statusHistory || [])
        .slice()
        .reverse()
        .map(function (entry) {
          return (
            '<div><span>' +
            esc(entry.status) +
            "</span><small>" +
            date(entry.changedAt) +
            "</small></div>"
          );
        })
        .join("");
    modal(
      '<div class="admin-modal"><h2>Order ' +
        esc(o.id) +
        '</h2><div class="field-grid"><div><p class="muted">Customer</p><strong>' +
        esc(o.customer.fullName) +
        '</strong><br><a href="mailto:' +
        esc(o.customer.email || "") +
        '">' +
        esc(o.customer.email || "") +
        '</a><br><a href="tel:' +
        esc(phoneHref(o.customer.phone)) +
        '">' +
        esc(o.customer.phone) +
        "</a>" +
        '</div><div><p class="muted">Order total</p><strong>' +
        money(o.total) +
        "</strong><br>" +
        esc(o.paymentStatus) +
        (o.discount
          ? "<br>Discount: −" + money(o.discount) +
            (o.promotionCode ? " (" + esc(o.promotionCode) + ")" : "")
          : "") +
        '</div><div class="field full"><p class="muted">Delivery address</p><strong>' +
        esc(o.customer.address) +
        ", " +
        esc(o.customer.city) +
        ", " +
        esc(o.customer.region) +
        "</strong>" +
        (o.customer.notes
          ? '<p class="muted">Note: ' + esc(o.customer.notes) + "</p>"
          : "") +
        '</div></div><div class="mini-items" style="margin-top:24px">' +
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
        '</div><div class="order-admin-grid"><div class="field"><label>Order status</label><select id="order-status" ' +
        (locked ? "disabled" : "") +
        ">" +
        statusOptions +
        '</select><small>Paid-order cancellation returns committed stock. Process any customer refund separately in Paystack.</small></div><div><p class="muted">Receipt email</p><strong>' +
        (o.notification?.sentAt ? "Sent " + date(o.notification.sentAt) : "Not sent") +
        "</strong>" +
        (o.notification?.lastError
          ? '<p class="form-alert compact">' +
            esc(o.notification.lastError) +
            "</p>"
          : "") +
        '</div><div><p class="muted">Latest status email</p><strong>' +
        (o.notification?.statusSentAt
          ? "Sent " + date(o.notification.statusSentAt)
          : canSendStatus
            ? "Not sent"
            : "Available after a status update") +
        "</strong>" +
        (o.notification?.statusLastError
          ? '<p class="form-alert compact">' +
            esc(o.notification.statusLastError) +
            "</p>"
          : "") +
        "</div></div>" +
        (history
          ? '<div class="status-history"><p class="muted">Status history</p>' +
            history +
            "</div>"
          : "") +
        '<div class="modal-actions"><button class="btn btn-outline" data-layer-close>Close</button>' +
        (paid
          ? '<button class="btn btn-outline" data-resend-order="' +
            esc(o.id) +
            '">Resend receipt</button>'
          : "") +
        (canSendStatus
          ? '<button class="btn btn-outline" data-resend-status="' +
            esc(o.id) +
            '">Resend status email</button>'
          : "") +
        (!locked
          ? '<button class="btn btn-acid" data-save-order="' +
        esc(o.id) +
            '">Save status</button>'
          : "") +
        "</div></div>",
      "admin-modal",
    );
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
        close();
        await loadAdminTab("orders", state.orderPage);
        toast("Order status updated.", "✓");
        return;
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
  async function resendOrderEmail(id) {
    if (!runtime.api) return toast("Email retry requires the live backend.", "i");
    try {
      const result = await api(
        "/api/admin/orders/" + encodeURIComponent(id) + "/resend-notification",
        { method: "POST" },
      );
      const existing = state.orders.find(function (item) {
        return item.id === id;
      });
      if (existing) state.orders[state.orders.indexOf(existing)] = result.order;
      close();
      toast(result.message, "✓");
    } catch (error) {
      toast(error.message, "!");
    }
  }
  async function resendOrderStatusEmail(id) {
    if (!runtime.api) return toast("Email retry requires the live backend.", "i");
    try {
      const result = await api(
        "/api/admin/orders/" +
          encodeURIComponent(id) +
          "/resend-status-notification",
        { method: "POST" },
      );
      const existing = state.orders.find(function (item) {
        return item.id === id;
      });
      if (existing) state.orders[state.orders.indexOf(existing)] = result.order;
      close();
      toast(result.message, "✓");
    } catch (error) {
      toast(error.message, "!");
    }
  }
  function dateTimeInput(value) {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }
  function editPromotion(id) {
    const p = id
      ? state.promotions.find(function (item) {
          return item.id === id;
        })
      : null;
    modal(
      '<form class="admin-modal" id="promotion-form"><h2>' +
        (p ? "Edit promo code" : "Create promo code") +
        '</h2><input type="hidden" name="id" value="' +
        esc(p ? p.id : "") +
        '"><div class="field-grid"><div class="field"><label>Promo code</label><input name="code" required minlength="3" maxlength="30" value="' +
        esc(p ? p.code : "") +
        '" placeholder="WELCOME10"></div><div class="field"><label>Discount type</label><select name="type"><option value="percentage" ' +
        (!p || p.type === "percentage" ? "selected" : "") +
        '>Percentage</option><option value="fixed" ' +
        (p?.type === "fixed" ? "selected" : "") +
        '>Fixed amount</option></select></div><div class="field"><label>Discount value</label><input name="value" type="number" min="1" step="1" required value="' +
        esc(p ? p.value : 10) +
        '"></div><div class="field"><label>Minimum product subtotal (₦)</label><input name="minimumSubtotal" type="number" min="0" step="1" value="' +
        esc(p ? p.minimumSubtotal : 0) +
        '"></div><div class="field"><label>Maximum discount (₦)</label><input name="maximumDiscount" type="number" min="0" step="1" value="' +
        esc(p ? p.maximumDiscount : 0) +
        '"><small>Use 0 for no maximum.</small></div><div class="field"><label>Usage limit</label><input name="usageLimit" type="number" min="0" step="1" value="' +
        esc(p ? p.usageLimit : 0) +
        '"><small>Use 0 for unlimited.</small></div><div class="field"><label>Starts</label><input name="startsAt" type="datetime-local" value="' +
        esc(p ? dateTimeInput(p.startsAt) : "") +
        '"></div><div class="field"><label>Ends</label><input name="endsAt" type="datetime-local" value="' +
        esc(p ? dateTimeInput(p.endsAt) : "") +
        '"></div><div class="field full"><label class="check-row"><input name="active" type="checkbox" ' +
        (!p || p.active ? "checked" : "") +
        '><span><strong>Active promo code</strong><small>Customers can apply it while its dates and limits are valid.</small></span></label></div></div><div class="modal-actions"><button type="button" class="btn btn-outline" data-layer-close>Cancel</button><button class="btn btn-acid">Save promo code</button></div></form>',
      "admin-modal",
    );
  }
  async function savePromotion(form) {
    const data = new FormData(form),
      id = String(data.get("id") || ""),
      existing = state.promotions.find(function (item) {
        return item.id === id;
      }),
      payload = {
        code: String(data.get("code") || "").toUpperCase(),
        type: data.get("type"),
        value: Number(data.get("value")),
        minimumSubtotal: Number(data.get("minimumSubtotal") || 0),
        maximumDiscount: Number(data.get("maximumDiscount") || 0),
        usageLimit: Number(data.get("usageLimit") || 0),
        startsAt: data.get("startsAt") || "",
        endsAt: data.get("endsAt") || "",
        active: data.get("active") === "on",
      };
    try {
      const result = runtime.api
        ? await api(
            existing
              ? "/api/admin/promotions/" + encodeURIComponent(existing.id)
              : "/api/admin/promotions",
            { method: existing ? "PATCH" : "POST", body: payload },
          )
        : {
            promotion: Object.assign(
              {
                id: existing?.id || "promo-" + Date.now(),
                usedCount: existing?.usedCount || 0,
                createdAt: existing?.createdAt || new Date().toISOString(),
              },
              payload,
            ),
          };
      if (existing) state.promotions[state.promotions.indexOf(existing)] = result.promotion;
      else state.promotions.unshift(result.promotion);
      close();
      renderAdmin();
      toast(existing ? "Promo code updated." : "Promo code created.", "✓");
    } catch (error) {
      toast(error.message, "!");
    }
  }
  function askDeletePromotion(id) {
    const p = state.promotions.find(function (item) {
      return item.id === id;
    });
    if (!p) return;
    modal(
      '<div class="admin-modal"><h2>Deactivate promo code?</h2><p class="muted">Customers will no longer be able to apply <strong>' +
        esc(p.code) +
        '</strong>.</p><div class="modal-actions"><button class="btn btn-outline" data-layer-close>Cancel</button><button class="btn btn-danger" data-confirm-promotion-delete="' +
        esc(id) +
        '">Deactivate</button></div></div>',
      "admin-modal",
    );
  }
  async function deletePromotion(id) {
    try {
      if (runtime.api) {
        await api("/api/admin/promotions/" + encodeURIComponent(id), {
          method: "DELETE",
        });
      }
      const p = state.promotions.find(function (item) {
        return item.id === id;
      });
      if (p) p.active = false;
      close();
      renderAdmin();
      toast("Promo code deactivated.", "✓");
    } catch (error) {
      toast(error.message, "!");
    }
  }
  function openMessage(id) {
    const item = state.messages.find(function (message) {
      return String(message._id || message.id) === id;
    });
    if (!item) return;
    modal(
      '<div class="admin-modal"><p class="eyebrow">Customer enquiry</p><h2>' +
        esc(item.name) +
        '</h2><p><a href="tel:' +
        esc(phoneHref(item.phone)) +
        '">' +
        esc(item.phone) +
        '</a> • ' +
        date(item.createdAt) +
        '</p><div class="message-full">' +
        esc(item.message) +
        '</div><div class="field"><label>Message status</label><select id="message-status"><option ' +
        (item.status === "New" ? "selected" : "") +
        '>New</option><option ' +
        (item.status === "Read" ? "selected" : "") +
        '>Read</option><option ' +
        (item.status === "Closed" ? "selected" : "") +
        '>Closed</option></select></div><div class="modal-actions"><button class="btn btn-outline" data-layer-close>Close</button><button class="btn btn-acid" data-save-message="' +
        esc(id) +
        '">Save status</button></div></div>',
      "admin-modal",
    );
  }
  async function saveMessageStatus(id, status) {
    const item = state.messages.find(function (message) {
      return String(message._id || message.id) === id;
    });
    if (!item) return;
    try {
      if (runtime.api) {
        const result = await api(
          "/api/admin/messages/" + encodeURIComponent(id) + "/status",
          { method: "PATCH", body: { status: status } },
        );
        state.messages[state.messages.indexOf(item)] = result.message;
      } else item.status = status;
      close();
      renderAdmin();
      toast("Message status updated.", "✓");
    } catch (error) {
      toast(error.message, "!");
    }
  }
  async function toggleSubscriber(id, active) {
    const item = state.subscribers.find(function (subscriber) {
      return String(subscriber._id || subscriber.id) === id;
    });
    if (!item) return;
    try {
      if (runtime.api) {
        const result = await api(
          "/api/admin/subscribers/" + encodeURIComponent(id),
          { method: "PATCH", body: { active: active } },
        );
        state.subscribers[state.subscribers.indexOf(item)] = result.subscriber;
      } else item.active = active;
      renderAdmin();
      toast(active ? "Subscriber reactivated." : "Subscriber deactivated.", "✓");
    } catch (error) {
      toast(error.message, "!");
    }
  }
  async function changePassword(form) {
    if (!runtime.api) return toast("Password changes require the live backend.", "i");
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const result = await api("/api/admin/account/password", {
        method: "POST",
        body: data,
      });
      form.reset();
      toast(result.message, "✓");
    } catch (error) {
      toast(error.message, "!");
    }
  }
  async function loadAdminTab(tab, requestedPage) {
    state.adminTab = tab;
    if (tab === "orders" && requestedPage) state.orderPage = requestedPage;
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
        const params = new URLSearchParams({ page: String(state.orderPage) });
        if (state.orderSearch) params.set("search", state.orderSearch);
        if (state.orderStatus) params.set("status", state.orderStatus);
        const data = await api("/api/admin/orders?" + params.toString());
        state.orders = data.orders;
        state.orderPage = data.page;
        state.orderPages = Math.max(1, data.pages || 1);
        state.orderTotal = data.total;
      } else if (tab === "promotions") {
        const data = await api("/api/admin/promotions");
        state.promotions = data.promotions;
      } else if (tab === "messages") {
        const data = await api("/api/admin/messages");
        state.messages = data.messages;
      } else if (tab === "subscribers") {
        const data = await api("/api/admin/subscribers");
        state.subscribers = data.subscribers;
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
        whatsappUrl: String(d.get("whatsappUrl") || defaults.whatsappUrl),
        instagramUrl: String(d.get("instagramUrl") || defaults.instagramUrl),
        instagramHandle: String(
          d.get("instagramHandle") || defaults.instagramHandle,
        ),
        tiktokUrl: String(d.get("tiktokUrl") || defaults.tiktokUrl),
        tiktokHandle: String(d.get("tiktokHandle") || defaults.tiktokHandle),
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
  const loadingOrders = new Set();
  async function loadCustomerOrder(reference) {
    if (loadingOrders.has(reference)) return;
    const token = sessionStorage.getItem(K.orderToken);
    if (!token) return;
    loadingOrders.add(reference);
    try {
      const result = await api("/api/orders/" + encodeURIComponent(reference), {
        headers: { "x-order-token": token },
      });
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
      state.admin = session.admin;
      runtime.paymentMode = session.paymentMode;
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
      state.size = Number(t.dataset.size);
      document.querySelectorAll("[data-size]").forEach(function (b) {
        b.classList.toggle("active", Number(b.dataset.size) === state.size);
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
    else if (t.matches("[data-promo]")) void applyPromotion(t);
    else if (t.matches("[data-remove-promo]")) removePromotion();
    else if (t.matches("[data-payment-success]")) void complete();
    else if (t.matches("[data-admin-tab]"))
      void loadAdminTab(t.dataset.adminTab);
    else if (t.matches("[data-admin-logout]")) void logout();
    else if (t.matches("[data-new-product]")) editProduct();
    else if (t.matches("[data-edit-product]"))
      editProduct(t.dataset.editProduct);
    else if (t.matches("[data-delete-product]"))
      askDelete(t.dataset.deleteProduct);
    else if (t.matches("[data-confirm-delete]"))
      void del(t.dataset.confirmDelete);
    else if (t.matches("[data-order-view]")) openOrder(t.dataset.orderView);
    else if (t.matches("[data-order-page]"))
      void loadAdminTab("orders", Number(t.dataset.orderPage));
    else if (t.matches("[data-resend-order]"))
      void resendOrderEmail(t.dataset.resendOrder);
    else if (t.matches("[data-resend-status]"))
      void resendOrderStatusEmail(t.dataset.resendStatus);
    else if (t.matches("[data-save-order]")) {
      const s = document.getElementById("order-status");
      if (s) void saveOrderStatus(t.dataset.saveOrder, s.value);
    } else if (t.matches("[data-new-promotion]")) editPromotion();
    else if (t.matches("[data-edit-promotion]"))
      editPromotion(t.dataset.editPromotion);
    else if (t.matches("[data-delete-promotion]"))
      askDeletePromotion(t.dataset.deletePromotion);
    else if (t.matches("[data-confirm-promotion-delete]"))
      void deletePromotion(t.dataset.confirmPromotionDelete);
    else if (t.matches("[data-message-view]"))
      openMessage(t.dataset.messageView);
    else if (t.matches("[data-save-message]")) {
      const status = document.getElementById("message-status");
      if (status) void saveMessageStatus(t.dataset.saveMessage, status.value);
    } else if (t.matches("[data-subscriber-toggle]")) {
      void toggleSubscriber(
        t.dataset.subscriberToggle,
        t.dataset.active !== "true",
      );
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
      state.orderSearch = String(new FormData(f).get("query")).trim();
      state.orderPage = 1;
      if (runtime.api) void loadAdminTab("orders", 1);
      else renderAdmin();
    } else if (f.id === "newsletter-form") void subscribe(f);
    else if (f.id === "contact-form") void sendContact(f);
    else if (f.id === "checkout-form")
      void payment(Object.fromEntries(new FormData(f).entries()));
    else if (f.id === "admin-login") void login(f);
    else if (f.id === "product-form") void saveProduct(f);
    else if (f.id === "promotion-form") void savePromotion(f);
    else if (f.id === "settings-form") void saveSettings(f);
    else if (f.id === "password-form") void changePassword(f);
  });
  document.addEventListener("change", function (e) {
    if (e.target.id === "sort-select") {
      state.sort = e.target.value;
      render();
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
    if (e.target.id === "admin-order-status") {
      state.orderStatus = e.target.value;
      state.orderPage = 1;
      if (runtime.api) void loadAdminTab("orders", 1);
      else renderAdmin();
    }
  });
  document.getElementById("drawer-backdrop").addEventListener("click", close);
  document.getElementById("modal-wrap").addEventListener("click", function (e) {
    if (e.target === e.currentTarget) close();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") close();
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
