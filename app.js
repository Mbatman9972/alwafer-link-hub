/* =====================================================================
 * app.js — ALWAFER public functional dashboard renderer
 * ===================================================================== */
(function (root, factory) {
  var api = factory();
  root.LinkHub = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document !== "undefined" && typeof window !== "undefined") {
    var start = function () { api.mount(); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
    else start();
    window.addEventListener("popstate", start);
  }
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function () {
  "use strict";

  var PROFILE_ORDER = ["mustafa", "ahmed", "hala"];
  var SLUGS = { mustafa: "alwafer", ahmed: "ahmed", hala: "hala" };
  var PROFILE_BY_SLUG = { alwafer: "mustafa", ahmed: "ahmed", hala: "hala" };
  var LINK_KEYS = ["apply", "youtube", "tiktok", "telegram", "instagram", "whatsapp", "website"];
  var REGION_KEYS = ["mena", "uk", "fr", "de", "tr", "cca"];
  var LINK_LABELS = {
    apply: "Apply to Join the Agency",
    youtube: "YouTube",
    tiktok: "TikTok",
    telegram: "Telegram",
    instagram: "Instagram",
    whatsapp: "WhatsApp",
    website: "Website"
  };
  var REGION_LABELS = { mena: "MENA", uk: "UK", fr: "FR", de: "DE", tr: "TR", cca: "CCA" };
  var DEFAULT_REGION_URLS = {
    mena: "https://www.tiktok.com/t/ZMAN6Bu2W/",
    uk: "https://www.tiktok.com/t/ZSxoyPd4W/",
    fr: "https://www.tiktok.com/t/ZSxoAQrsm/",
    de: "https://www.tiktok.com/t/ZSQ1b63XY/",
    tr: "https://www.tiktok.com/t/ZSxoUt6A7/",
    cca: "https://www.tiktok.com/t/ZSxECjfqx/"
  };
  var DEFAULT_PROFILES = {
    mustafa: {
      title: "ALWAFER",
      subtitle: "Alwafer Agency",
      tagline: "Empowering creators. Building influence. Elevating brands.\nتمكّن المبدعين، نبني التأثير، نرتقي بالعلامات التجارية.",
      profileImage: "/assets/profiles/alwafer-profile.png",
      artwork: "/assets/page-alwafer.png"
    },
    ahmed: {
      title: "TEAM AHMED RAMADAN",
      subtitle: "Official Agency Network",
      tagline: "Empowering creators. Building influence. Elevating brands.\nتمكّن المبدعين، نبني التأثير، نرتقي بالعلامات التجارية.",
      profileImage: "/assets/profiles/ahmed-profile.png",
      artwork: "/assets/page-ahmed.png"
    },
    hala: {
      title: "HALA AL-SAGHIR",
      subtitle: "Official Profile",
      tagline: "Empowering creators. Building influence. Elevating brands.\nتمكّن المبدعين، نبني التأثير، نرتقي بالعلامات التجارية.",
      profileImage: "/assets/profiles/hala-profile.jpg",
      artwork: "/assets/page-hala.png"
    }
  };

  function text(value, fallback) {
    return typeof value === "string" && value.trim() ? value.trim() : (fallback || "");
  }
  // Canonical shared-regions model is an ordered ARRAY of { id, label, url, enabled }.
  function defaultRegions() {
    return REGION_KEYS.map(function (key) {
      return { id: key, label: REGION_LABELS[key], url: DEFAULT_REGION_URLS[key], enabled: true };
    });
  }
  function normalizeRegions(raw) {
    var arr = null;
    if (Array.isArray(raw)) arr = raw;
    else if (raw && typeof raw === "object") {
      var keys = Object.keys(raw);
      var ordered = REGION_KEYS.filter(function (k) { return keys.indexOf(k) > -1; })
        .concat(keys.filter(function (k) { return REGION_KEYS.indexOf(k) < 0; }));
      arr = ordered.map(function (k) {
        var v = raw[k] && typeof raw[k] === "object" ? raw[k] : {};
        return { id: k, label: v.label, url: v.url, enabled: v.enabled };
      });
    }
    if (!arr) return defaultRegions();
    var used = {};
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var item = arr[i] && typeof arr[i] === "object" ? arr[i] : {};
      var label = text(item.label, "");
      var url = typeof item.url === "string" ? item.url : "";
      var enabled = item.enabled === true;
      var base = String(item.id || label || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || ("region-" + (i + 1));
      var id = base, n = 2;
      while (used[id]) { id = base + "-" + n; n += 1; }
      used[id] = true;
      out.push({ id: id, label: label, url: url, enabled: enabled });
    }
    return out;
  }
  function isExternal(url) {
    return typeof url === "string" && /^https?:\/\//i.test(url.trim());
  }
  function isNavigable(url) {
    if (typeof url !== "string") return false;
    var u = url.trim();
    if (!u || u.charAt(0) === "#") return false;
    return /^(https?:|mailto:|tel:|\/)/i.test(u);
  }
  function safeHref(url) {
    if (typeof url !== "string") return "#";
    var u = url.trim();
    if (!u) return "#";
    var m = u.match(/^([a-zA-Z][a-zA-Z0-9+.\-]*):/);
    if (m && ["http", "https", "mailto", "tel"].indexOf(m[1].toLowerCase()) < 0) return "#";
    return u;
  }
  function safeImage(url, fallback) {
    var u = safeHref(url);
    return u === "#" ? fallback : u;
  }
  function el(tag, opts) {
    var node = document.createElement(tag);
    opts = opts || {};
    if (opts.className) node.className = opts.className;
    if (opts.text != null) node.textContent = String(opts.text);
    if (opts.attrs) Object.keys(opts.attrs).forEach(function (k) {
      var v = opts.attrs[k];
      if (v != null) node.setAttribute(k, String(v));
    });
    return node;
  }
  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); }

  function defaultSettings() {
    var settings = { version: 1, updatedAt: "", profiles: {}, sharedRegions: [] };
    PROFILE_ORDER.forEach(function (key) {
      var base = DEFAULT_PROFILES[key];
      settings.profiles[key] = {
        title: base.title,
        subtitle: base.subtitle,
        tagline: base.tagline,
        profileImage: base.profileImage,
        links: {}
      };
      LINK_KEYS.forEach(function (linkKey) {
        settings.profiles[key].links[linkKey] = { enabled: false, url: "", label: LINK_LABELS[linkKey] };
      });
    });
    settings.sharedRegions = defaultRegions();
    return settings;
  }

  function normalizeSettings(raw) {
    var out = defaultSettings();
    if (!raw || typeof raw !== "object") return out;
    PROFILE_ORDER.forEach(function (key) {
      var incoming = (raw.profiles || {})[key] || {};
      out.profiles[key].title = text(incoming.title, out.profiles[key].title);
      out.profiles[key].subtitle = text(incoming.subtitle, out.profiles[key].subtitle);
      out.profiles[key].tagline = text(incoming.tagline, out.profiles[key].tagline);
      out.profiles[key].profileImage = text(incoming.profileImage, out.profiles[key].profileImage);
      var links = incoming.links || {};
      LINK_KEYS.forEach(function (linkKey) {
        var link = links[linkKey];
        if (link && typeof link === "object") {
          out.profiles[key].links[linkKey] = {
            enabled: link.enabled === true,
            url: typeof link.url === "string" ? link.url : "",
            label: text(link.label, LINK_LABELS[linkKey])
          };
        }
      });
    });
    out.sharedRegions = normalizeRegions(raw.sharedRegions);
    out.version = raw.version || 1;
    out.updatedAt = typeof raw.updatedAt === "string" ? raw.updatedAt : "";
    return out;
  }

  function resolveProfile(pathname, search) {
    var path = String(pathname || "").toLowerCase();
    var part = path.split("/").filter(Boolean)[0] || "";
    if (PROFILE_BY_SLUG[part]) return PROFILE_BY_SLUG[part];
    try {
      var params = new URLSearchParams(search || "");
      var p = String(params.get("profile") || "").toLowerCase();
      return DEFAULT_PROFILES[p] ? p : "";
    } catch (e) {
      return "";
    }
  }

  function loadSettings() {
    if (typeof fetch === "undefined") return Promise.resolve(defaultSettings());
    return fetch("/data/link-settings.json", { cache: "no-store" })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(normalizeSettings)
      .catch(function () { return defaultSettings(); });
  }

  function applyAnchorState(anchor, link) {
    var url = link && typeof link.url === "string" ? link.url.trim() : "";
    var enabled = !!(link && link.enabled === true && isNavigable(url));
    if (enabled) {
      anchor.href = safeHref(url);
      if (isExternal(url)) {
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
      }
      anchor.removeAttribute("aria-disabled");
      anchor.classList.remove("is-disabled");
      return true;
    }
    anchor.href = "#";
    anchor.setAttribute("aria-disabled", "true");
    anchor.classList.add("is-disabled");
    anchor.addEventListener("click", function (event) { event.preventDefault(); });
    return false;
  }

  function iconFor(key) {
    return { apply: "👥", youtube: "▶", tiktok: "♪", telegram: "✈", instagram: "◎", whatsapp: "☏", website: "◎" }[key] || "→";
  }

  function dashboardButton(key, link) {
    var a = el("a", { className: "dash-button", attrs: { "data-link": key } });
    applyAnchorState(a, link);
    a.appendChild(el("span", { className: "dash-icon", text: iconFor(key), attrs: { "aria-hidden": "true" } }));
    var labelBox = el("span", { className: "dash-labels" });
    labelBox.appendChild(el("span", { className: "dash-label-main", text: text(link && link.label, LINK_LABELS[key]) }));
    if (key === "apply") labelBox.appendChild(el("span", { className: "dash-label-sub", text: "تقدّم للانضمام إلى الوكالة", attrs: { dir: "rtl" } }));
    a.appendChild(labelBox);
    a.appendChild(el("span", { className: "dash-chevron", text: "›", attrs: { "aria-hidden": "true" } }));
    return a;
  }

  function regionChip(region) {
    var a = el("a", { className: "region-chip", text: text(region && region.label, "Region"), attrs: { "data-region": region && region.id } });
    applyAnchorState(a, region);
    return a;
  }

  function profileSwitcher(activeKey) {
    var wrap = el("div", { className: "profile-switcher" });
    var button = el("button", {
      className: "switcher-button",
      text: "•••",
      attrs: { type: "button", "aria-haspopup": "true", "aria-expanded": "false", "aria-label": "Switch profile" }
    });
    var menu = el("div", { className: "switcher-menu", attrs: { hidden: "hidden" } });
    PROFILE_ORDER.forEach(function (key) {
      var item = el("a", {
        className: "switcher-item" + (key === activeKey ? " is-active" : ""),
        text: DEFAULT_PROFILES[key].title,
        attrs: { href: "/" + SLUGS[key] + "/", "data-profile-switch": key }
      });
      menu.appendChild(item);
    });
    var edit = el("a", {
      className: "switcher-item switcher-edit",
      text: "Edit this profile",
      attrs: { href: "/admin/" + SLUGS[activeKey] + "/", "data-admin-edit": activeKey }
    });
    menu.appendChild(edit);
    button.addEventListener("click", function () {
      var open = menu.hasAttribute("hidden");
      if (open) menu.removeAttribute("hidden");
      else menu.setAttribute("hidden", "hidden");
      button.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", function (event) {
      if (!wrap.contains(event.target)) {
        menu.setAttribute("hidden", "hidden");
        button.setAttribute("aria-expanded", "false");
      }
    });
    wrap.appendChild(button);
    wrap.appendChild(menu);
    return wrap;
  }

  function renderDashboard(container, key, settings) {
    var profile = settings.profiles[key];
    var defaults = DEFAULT_PROFILES[key];
    document.documentElement.setAttribute("data-view", "dashboard");
    document.title = profile.title + " — ALWAFER";
    clear(container);

    var main = el("main", { className: "public-dashboard", attrs: { "data-profile": key } });
    var card = el("section", { className: "dashboard-card" });
    card.appendChild(profileSwitcher(key));

    var lang = el("div", { className: "language-pill", attrs: { "aria-label": "Language" } });
    lang.appendChild(el("span", { text: "EN" }));
    lang.appendChild(el("span", { className: "divider", text: "|" }));
    lang.appendChild(el("span", { text: "العربية", attrs: { dir: "rtl" } }));
    card.appendChild(lang);

    var avatar = el("div", { className: "profile-avatar profile-avatar--" + key });
    var img = el("img", {
      className: "profile-image",
      attrs: {
        src: safeImage(profile.profileImage, defaults.profileImage),
        alt: profile.title,
        decoding: "async",
        fetchpriority: "high",
        "data-profile-image": key
      }
    });
    img.addEventListener("error", function () { img.src = defaults.profileImage; });
    avatar.appendChild(img);
    card.appendChild(avatar);

    card.appendChild(el("h1", { className: "profile-title", text: profile.title, attrs: { dir: "auto" } }));
    card.appendChild(el("div", { className: "gold-divider", attrs: { "aria-hidden": "true" } }));
    card.appendChild(el("p", { className: "profile-tagline", text: profile.tagline, attrs: { dir: "auto" } }));

    var links = el("nav", { className: "dashboard-links", attrs: { "aria-label": "Profile links" } });
    LINK_KEYS.forEach(function (linkKey) {
      links.appendChild(dashboardButton(linkKey, profile.links[linkKey]));
    });
    card.appendChild(links);

    card.appendChild(el("div", { className: "section-divider", attrs: { "aria-hidden": "true" } }));
    card.appendChild(el("h2", { className: "regions-title", text: "Agency Regions / مناطق الوكالة" }));
    var regions = el("nav", { className: "regions-grid", attrs: { "aria-label": "Agency regions" } });
    var regionList = Array.isArray(settings.sharedRegions) ? settings.sharedRegions : normalizeRegions(settings.sharedRegions);
    regionList.forEach(function (region) {
      // Skip truly blank rows; enabled+valid chips navigate, the rest render disabled.
      if (!region || !text(region.label, "")) return;
      regions.appendChild(regionChip(region));
    });
    card.appendChild(regions);
    card.appendChild(el("p", { className: "powered", text: "POWERED BY ALWAFER AGENCY" }));

    main.appendChild(card);
    container.appendChild(main);
  }

  function renderSelector(container) {
    document.documentElement.setAttribute("data-view", "selector");
    document.title = "ALWAFER";
    clear(container);
    var main = el("main", { className: "selector-shell" });
    main.appendChild(el("h1", { className: "selector-title", text: "ALWAFER" }));
    main.appendChild(el("p", { className: "selector-subtitle", text: "Choose a profile" }));
    var grid = el("div", { className: "selector-grid" });
    PROFILE_ORDER.forEach(function (key) {
      var item = el("a", { className: "selector-item", attrs: { href: "/" + SLUGS[key] + "/", "data-profile": key } });
      item.appendChild(el("span", { className: "selector-name", text: DEFAULT_PROFILES[key].title }));
      item.appendChild(el("span", { className: "selector-arrow", text: "→" }));
      grid.appendChild(item);
    });
    main.appendChild(grid);
    container.appendChild(main);
  }

  function mount(settingsOverride) {
    if (typeof document === "undefined") return;
    var container = document.getElementById("app");
    if (!container) return;
    var key = resolveProfile(window.location.pathname, window.location.search);
    function paint(settings) {
      if (key) renderDashboard(container, key, settings);
      else renderSelector(container);
    }
    if (settingsOverride) paint(normalizeSettings(settingsOverride));
    else loadSettings().then(paint);
  }

  return {
    PROFILE_ORDER: PROFILE_ORDER,
    LINK_KEYS: LINK_KEYS,
    REGION_KEYS: REGION_KEYS,
    defaultSettings: defaultSettings,
    normalizeSettings: normalizeSettings,
    resolveProfile: resolveProfile,
    isNavigable: isNavigable,
    safeHref: safeHref,
    mount: mount
  };
});
