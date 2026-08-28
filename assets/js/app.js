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
      href("/admin") +
      '" data-route="/admin">Admin</a></nav>';
  }
  function footer() {
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
      href("/admin") +
      '" data-route="/admin">Admin access</a></div></div><div><p class="footer-title">Connect</p><div class="footer-links"><a href="https://wa.me/message/6BIGK72XFX23L1" target="_blank" rel="noopener">WhatsApp</a><a href="https://www.instagram.com/teejonesonly" target="_blank" rel="noopener">Instagram</a><a href="https://www.tiktok.com/@tee_jones247" target="_blank" rel="noopener">TikTok</a><a href="tel:+2349058579374">0905 857 9374</a></div></div></div><div class="footer-bottom"><span>© ' +
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
            '<button class="size-btn" data-size="' + s + '">' + s + "</button>"
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
    return (
      '<div class="panel summary"><h2>Order summary</h2><div class="summary-line"><span>Products</span><strong>' +
      money(subtotal()) +
      '</strong></div><div class="summary-line"><span>Product delivery fees</span><strong>' +
      money(delivery()) +
      '</strong></div><p class="summary-help">Delivery is calculated from the fee set by the admin for each pair.</p><div class="promo"><input placeholder="Promo code"><button data-promo>Apply</button></div><div class="summary-line total"><span>Total</span><strong>' +
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
  function checkout() {
    if (!state.cart.length) return cart();
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
      '</p></div><button class="btn btn-acid btn-block" type="submit">Pay securely • ' +
      money(total()) +
      '</button></form><aside class="panel checkout-summary"><div class="admin-card-head"><h3>Your order</h3><a href="' +
      href("/cart") +
      '" data-route="/cart">Edit bag</a></div><div class="mini-items">' +
      rows(true) +
      '</div><div class="summary-line"><span>Products</span><strong>' +
      money(subtotal()) +
      '</strong></div><div class="summary-line"><span>Product delivery fees</span><strong>' +
      money(delivery()) +
      '</strong></div><div class="summary-line total"><span>Total</span><strong>' +
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
      note = runtime.api
        ? "Your payment and order are recorded securely. A confirmation email will be sent when SMTP delivery is configured."
        : "This order belongs to the static interface preview.";
    return (
      '<section class="success-wrap"><div class="success-card animate__animated animate__fadeInUp"><span class="success-icon">✓</span><p class="eyebrow">Payment confirmed</p><h1 class="display">Your pair is reserved.</h1><p class="muted">Thanks for shopping Jones Kicks. The order is now in the admin order centre and the team will confirm the delivery step.</p><span class="order-ref">Order ' +
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
      '" data-route="/shop">Continue shopping</a><a class="btn btn-outline" href="https://wa.me/message/6BIGK72XFX23L1" target="_blank">Chat on WhatsApp</a></div><p class="prototype-note" style="text-align:left">' +
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
    return `<section class="page-hero"><div class="container"><div class="breadcrumbs"><a href="${href("/")}" data-route="/">Home</a><span>/</span><span>Contact</span></div><p class="eyebrow">Talk to us</p><h1 class="display page-title">We are one message away.</h1></div></section><section class="section-sm"><div class="container contact-layout"><div class="contact-card"><p class="eyebrow">Jones Kicks support</p><h2 class="display">Let us help you find the pair.</h2><div class="contact-links"><a class="contact-link" href="tel:+2349058579374"><div><strong>Call us</strong><span>0905 857 9374</span></div><b>↗</b></a><a class="contact-link" href="https://wa.me/message/6BIGK72XFX23L1" target="_blank"><div><strong>WhatsApp</strong><span>Fast order and sizing support</span></div><b>↗</b></a><a class="contact-link" href="https://www.instagram.com/teejonesonly" target="_blank"><div><strong>Instagram</strong><span>@teejonesonly</span></div><b>↗</b></a><a class="contact-link" href="https://www.tiktok.com/@tee_jones247" target="_blank"><div><strong>TikTok</strong><span>@tee_jones247</span></div><b>↗</b></a></div></div><form class="contact-form-card" id="contact-form"><p class="eyebrow">Send an enquiry</p><h2 style="margin:0 0 26px;font-size:27px">How can we help?</h2><div class="field-grid"><div class="field"><label>Your name</label><input name="name" required></div><div class="field"><label>Phone number</label><input name="phone" required></div><div class="field full"><label>Message</label><textarea name="message" required placeholder="Tell us the sneaker or size you need"></textarea></div></div><button class="btn btn-acid" style="margin-top:20px">Send enquiry</button><p class="prototype-note">Your enquiry is saved securely for Jones Kicks support.</p></form></div></section>`;
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
      fresh = state.orders.filter(function (o) {
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
      '</strong><small>Active sneaker styles</small></div></div><div class="admin-grid"><div class="admin-card"><div class="admin-card-head"><h3>Unique visitors • Last 7 days</h3><button data-admin-tab="analytics">View report</button></div><div class="chart">' +
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
            " pairs in stock</p></div><strong>" +
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
    return (
      '<div class="admin-heading"><div><h2>Orders</h2><p>Review customer delivery details and update fulfilment.</p></div><span class="status pending">' +
      state.orders.filter(function (o) {
        return o.status === "New";
      }).length +
      ' new</span></div><div class="table-card">' +
      ordersTable(state.orders) +
      "</div>"
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
      '</strong><small>Unique visitors today</small></div><div class="kpi"><div class="kpi-top"><span>Products</span><span class="kpi-icon">◇</span></div><strong>' +
      state.products.length +
      '</strong><small>Current catalogue</small></div><div class="kpi"><div class="kpi-top"><span>Order rate</span><span class="kpi-icon">%</span></div><strong>' +
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
      '</div><p class="prototype-note">Visitor identities are stored as privacy-preserving hashes; raw identifiers and IP addresses are not retained.</p></div>'
    );
  }
  function settings() {
    return (
      '<div class="admin-heading"><div><h2>Store settings</h2><p>Manage customer contact and order-notification preferences.</p></div></div><form id="settings-form"><div class="settings-grid"><section class="settings-card"><h3>Store profile</h3><p>Basic customer-facing details.</p><div class="field"><label>Store name</label><input name="storeName" value="' +
      esc(state.settings.storeName) +
      '"></div><div class="field"><label>Customer phone</label><input name="phone" value="' +
      esc(state.settings.phone) +
      '"></div></section><section class="settings-card"><h3>Order email notifications</h3><p>Set the inbox that receives paid-order alerts.</p><div class="field"><label>Notification email</label><input name="notificationEmail" type="email" value="' +
      esc(state.settings.notificationEmail) +
      '" placeholder="orders@yourdomain.com"><small>SMTP credentials must also be configured on the server.</small></div><div class="toggle-row"><div><strong>New-order alerts</strong><span>Email the owner after confirmed payment</span></div><button type="button" class="toggle ' +
      (state.settings.orderAlerts ? "on" : "") +
      '" data-toggle-setting="orderAlerts"></button></div><div class="toggle-row"><div><strong>Website view tracking</strong><span>Measure unique visitors and page views</span></div><button type="button" class="toggle ' +
      (state.settings.viewTracking ? "on" : "") +
      '" data-toggle-setting="viewTracking"></button></div></section></div><button class="btn btn-acid" style="margin-top:18px">Save settings</button></form>'
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
        analytics: "Analytics",
        settings: "Settings",
      },
      content = state.adminLoading
        ? '<div class="admin-loading"><span></span><p>Loading secure store data…</p></div>'
        : state.adminTab === "catalogue"
          ? catalogue()
          : state.adminTab === "orders"
            ? orders()
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
      '</h1><div class="admin-user"><span class="avatar">JK</span><div><strong>Store Admin</strong><span>Jones Kicks</span></div></div></header><main class="admin-content">' +
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
              '">' +
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
    const x = state.cart.find(function (i) {
      return i.productId === id && i.size === state.size;
    });
    if (x) x.qty++;
    else state.cart.push({ productId: id, size: state.size, qty: 1 });
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
    item.qty += dir === "up" ? 1 : -1;
    if (item.qty <= 0)
      state.cart = state.cart.filter(function (i) {
        return i !== item;
      });
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
  async function payment(customer) {
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
      const payload = await api("/api/orders", {
        method: "POST",
        body: {
          customer: customer,
          items: state.cart,
          paymentMethod: customer.payment,
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
      modal(
        '<div class="payment-modal"><div class="payment-brand"><a class="brand">' +
          brand() +
          '</a><span class="status pending">Development mode</span></div><div class="payment-amount"><span>Total to pay</span><strong>' +
          money(payload.order.total) +
          '</strong></div><p>The complete Paystack workflow is connected. This local environment uses its safe demo-payment switch.</p><button class="btn btn-acid btn-block" data-payment-success>Complete demo payment</button><button class="btn btn-outline btn-block" data-layer-close style="margin-top:8px">Return to checkout</button></div>',
        "payment-modal",
      );
    } catch (error) {
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
        '"></div><div class="field full"><label>Image URL</label><input name="image" value="' +
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
    state.cart = state.cart.filter(function (x) {
      return x.productId !== id;
    });
    save(K.products, state.products);
    save(K.cart, state.cart);
    close();
    renderAdmin();
    toast("Sneaker removed.", "✓");
  }
  function openOrder(id) {
    const o = state.orders.find(function (x) {
      return x.id === id;
    });
    if (!o) return;
    modal(
      '<div class="admin-modal"><h2>Order ' +
        esc(o.id) +
        '</h2><div class="field-grid"><div><p class="muted">Customer</p><strong>' +
        esc(o.customer.fullName) +
        "</strong><br>" +
        esc(o.customer.email || "") +
        "<br>" +
        esc(o.customer.phone) +
        '</div><div><p class="muted">Order total</p><strong>' +
        money(o.total) +
        "</strong><br>" +
        esc(o.paymentStatus) +
        '</div><div class="field full"><p class="muted">Delivery address</p><strong>' +
        esc(o.customer.address) +
        ", " +
        esc(o.customer.city) +
        ", " +
        esc(o.customer.region) +
        '</strong></div></div><div class="mini-items" style="margin-top:24px">' +
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
        '</div><div class="field"><label>Order status</label><select id="order-status"><option ' +
        (o.status === "New" ? "selected" : "") +
        ">New</option><option " +
        (o.status === "Confirmed" ? "selected" : "") +
        ">Confirmed</option><option " +
        (o.status === "Processing" ? "selected" : "") +
        ">Processing</option><option " +
        (o.status === "Dispatched" ? "selected" : "") +
        ">Dispatched</option><option " +
        (o.status === "Completed" ? "selected" : "") +
        ">Completed</option><option " +
        (o.status === "Cancelled" ? "selected" : "") +
        ">Cancelled</option><option " +
        (o.status === "Needs review" ? "selected" : "") +
        '>Needs review</option></select></div><div class="modal-actions"><button class="btn btn-outline" data-layer-close>Close</button><button class="btn btn-acid" data-save-order="' +
        esc(o.id) +
        '">Save status</button></div></div>',
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
        const data = await api("/api/admin/orders");
        state.orders = data.orders;
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
    else if (t.matches("[data-promo]"))
      toast("Promo codes will be available when configured.", "i");
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
    } else if (f.id === "newsletter-form") void subscribe(f);
    else if (f.id === "contact-form") void sendContact(f);
    else if (f.id === "checkout-form")
      void payment(Object.fromEntries(new FormData(f).entries()));
    else if (f.id === "admin-login") void login(f);
    else if (f.id === "product-form") void saveProduct(f);
    else if (f.id === "settings-form") void saveSettings(f);
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
