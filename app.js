/* =====================================================================
 * app.js — ALWAFER Link Hub renderer
 * ---------------------------------------------------------------------
 * Plain JavaScript. No framework, no build step, no dependencies.
 * Reads window.LINK_HUB_CONFIG (config.js) and renders the page.
 *
 * Routing (unchanged):
 *   /?profile=mustafa  or  /#mustafa  -> ALWAFER brand page
 *   /?profile=ahmed    or  /#ahmed    -> Team Ahmed Ramadan
 *   /?profile=hala     or  /#hala     -> Hala Al-Saghir
 *   (nothing / unknown)               -> selector page
 *
 * Language: EN / العربية toggle, persisted in localStorage; Arabic
 * renders RTL. All dynamic text via textContent (markup-safe).
 * ===================================================================== */
(function (root, factory) {
  var api = factory();
  root.LinkHub = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document !== "undefined" && typeof window !== "undefined") {
    var start = function () { api.mount(); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
    else start();
    window.addEventListener("hashchange", start);
    window.addEventListener("popstate", start);
  }
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function () {
  "use strict";

  var LANG_KEY = "alwafer_lang";

  /* --------------------------- icons (static SVG, no user data) -------- */
  var ICONS = {
    youtube:  '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M23 12s0-3.4-.43-5.04a2.62 2.62 0 0 0-1.84-1.85C19.07 4.7 12 4.7 12 4.7s-7.07 0-8.73.41A2.62 2.62 0 0 0 1.43 6.96C1 8.6 1 12 1 12s0 3.4.43 5.04a2.62 2.62 0 0 0 1.84 1.85c1.66.41 8.73.41 8.73.41s7.07 0 8.73-.41a2.62 2.62 0 0 0 1.84-1.85C23 15.4 23 12 23 12ZM9.75 15.27V8.73L15.5 12l-5.75 3.27Z"/></svg>',
    tiktok:   '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.5 3c.3 2.1 1.5 3.8 3.5 4.3v2.7c-1.3.1-2.5-.2-3.6-.8v5.9a5.6 5.6 0 1 1-5.6-5.6c.3 0 .6 0 .9.1v2.8a2.8 2.8 0 1 0 2 2.7V3h2.8Z"/></svg>',
    telegram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.9 4.4 18.7 19.5c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6 12.9l-4.9-1.5c-1-.3-1-1 .2-1.5l19.1-7.4c.9-.3 1.7.2 1.5 1.4Z"/></svg>',
    instagram:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.2c3.2 0 3.6 0 4.9.07 1.2.06 1.8.25 2.2.42.56.22.96.48 1.38.9.42.42.68.82.9 1.38.17.4.36 1 .42 2.2.07 1.3.07 1.7.07 4.9s0 3.6-.07 4.9c-.06 1.2-.25 1.8-.42 2.2-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.4.17-1 .36-2.2.42-1.3.07-1.7.07-4.9.07s-3.6 0-4.9-.07c-1.2-.06-1.8-.25-2.2-.42a3.8 3.8 0 0 1-1.38-.9 3.8 3.8 0 0 1-.9-1.38c-.17-.4-.36-1-.42-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.9c.06-1.2.25-1.8.42-2.2.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.4-.17 1-.36 2.2-.42C8.4 2.2 8.8 2.2 12 2.2Zm0 1.8c-3.1 0-3.5 0-4.7.07-.9.04-1.4.2-1.7.32-.43.17-.74.37-1.06.7-.32.31-.52.62-.69 1.05-.12.3-.28.8-.32 1.7C3.46 8.5 3.46 8.9 3.46 12s0 3.5.07 4.7c.04.9.2 1.4.32 1.7.17.43.37.74.7 1.06.31.32.62.52 1.05.69.3.12.8.28 1.7.32 1.2.07 1.6.07 4.7.07s3.5 0 4.7-.07c.9-.04 1.4-.2 1.7-.32.43-.17.74-.37 1.06-.7.32-.31.52-.62.69-1.05.12-.3.28-.8.32-1.7.07-1.2.07-1.6.07-4.7s0-3.5-.07-4.7c-.04-.9-.2-1.4-.32-1.7a2.9 2.9 0 0 0-.7-1.06 2.9 2.9 0 0 0-1.05-.69c-.3-.12-.8-.28-1.7-.32C15.5 4 15.1 4 12 4Zm0 3.06A4.94 4.94 0 1 1 7.06 12 4.94 4.94 0 0 1 12 7.06Zm0 8.14A3.2 3.2 0 1 0 8.8 12 3.2 3.2 0 0 0 12 15.2Zm6.3-8.34a1.15 1.15 0 1 1-1.15-1.15 1.15 1.15 0 0 1 1.15 1.15Z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-2.8.9.9-2.7-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.6-6.13c-.25-.13-1.48-.73-1.7-.82-.23-.08-.4-.12-.56.13-.16.25-.64.81-.78.98-.14.16-.29.18-.54.06a6.7 6.7 0 0 1-3.3-2.9c-.25-.43.25-.4.71-1.32.08-.16.04-.3-.02-.42-.06-.13-.56-1.35-.77-1.85-.2-.48-.4-.41-.56-.42h-.48a.92.92 0 0 0-.67.31 2.8 2.8 0 0 0-.87 2.08c0 1.23.9 2.42 1.02 2.58.13.17 1.76 2.68 4.27 3.76 1.6.69 2.22.74 3.02.63.49-.07 1.48-.6 1.69-1.19.21-.58.21-1.08.15-1.19-.06-.1-.23-.16-.48-.29Z"/></svg>',
    website:  '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.9 6h-2.5a15.7 15.7 0 0 0-1.1-3.1A8 8 0 0 1 18.9 8ZM12 4c.6 0 1.6 1.5 2.2 4H9.8C10.4 5.5 11.4 4 12 4ZM4.3 14a8 8 0 0 1 0-4h2.9a18.6 18.6 0 0 0 0 4Zm.8 2h2.5c.3 1.1.7 2.2 1.1 3.1A8 8 0 0 1 5.1 16Zm2.5-8H5.1a8 8 0 0 1 3.6-3.1c-.4.9-.8 2-1.1 3.1Zm4.4 12c-.6 0-1.6-1.5-2.2-4h4.4c-.6 2.5-1.6 4-2.2 4Zm.6-6H9.2a16.4 16.4 0 0 1 0-4h5.6a16.4 16.4 0 0 1 0 4Zm.5 5.1c.4-.9.8-2 1.1-3.1h2.5a8 8 0 0 1-3.6 3.1ZM16.8 14a18.6 18.6 0 0 0 0-4h2.9a8 8 0 0 1 0 4Z"/></svg>'
  };

  /* ----------------------------- helpers ----------------------------- */
  function getConfig() {
    if (typeof window !== "undefined" && window.LINK_HUB_CONFIG) return window.LINK_HUB_CONFIG;
    if (typeof globalThis !== "undefined" && globalThis.LINK_HUB_CONFIG) return globalThis.LINK_HUB_CONFIG;
    return null;
  }

  function isExternal(url) {
    return typeof url === "string" && (/^https?:\/\//i.test(url) || /^\/\//.test(url));
  }

  // A url that actually navigates somewhere real (not "", "#", or a "#..." placeholder).
  function isNavigable(url) {
    if (typeof url !== "string") return false;
    var u = url.trim();
    if (u === "" || u === "#" || u.charAt(0) === "#") return false;
    return /^(https?:|mailto:|tel:|\/)/i.test(u);
  }

  // Allow relative paths, anchors, and safe schemes; block javascript:/data:/etc.
  function safeHref(url) {
    if (typeof url !== "string") return "#";
    var u = url.trim();
    if (u === "") return "#";
    var m = u.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/); // a real URL scheme, if any
    if (m && ["http", "https", "mailto", "tel"].indexOf(m[1].toLowerCase()) === -1) return "#";
    return u;
  }

  function externalAttrs(url) {
    return isExternal(url) ? { target: "_blank", rel: "noopener noreferrer" } : {};
  }

  function pick(val, lang) {
    if (val == null) return "";
    if (typeof val === "string") return val;
    return val[lang] != null ? val[lang] : (val.en != null ? val.en : "");
  }

  function resolveLang(config, search) {
    var lang = "";
    try {
      if (typeof search === "string" && /[?&]lang=/.test(search)) {
        lang = (search.split("lang=")[1] || "").split("&")[0].toLowerCase();
      }
    } catch (e) { /* ignore */ }
    if (!lang && typeof localStorage !== "undefined") {
      try { lang = (localStorage.getItem(LANG_KEY) || "").toLowerCase(); } catch (e) {}
    }
    if (lang !== "ar" && lang !== "en") lang = (config && config.defaultLang) || "en";
    return lang;
  }

  function setLang(lang) {
    if (typeof localStorage !== "undefined") {
      try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    }
  }

  function resolveProfileKey(search, hash, config) {
    config = config || getConfig() || {};
    var profiles = config.profiles || {};
    var key = "";
    if (typeof search === "string" && search.length) {
      var parts = search.replace(/^\?/, "").split("&");
      for (var i = 0; i < parts.length; i++) {
        var kv = parts[i].split("=");
        if (decodeURIComponent(kv[0]) === "profile") { key = decodeURIComponent(kv[1] || ""); break; }
      }
    }
    if (!key && typeof hash === "string" && hash) key = hash.replace(/^#/, "");
    key = (key || "").trim().toLowerCase();
    return (key && profiles[key]) ? key : "";
  }

  function visibleAgencyLinks(profile, config) {
    config = config || getConfig() || {};
    if (!profile || profile.showSharedAgencyLinks !== true) return [];
    return (config.sharedAgencyLinks || []).filter(function (l) {
      return l && l.enabled !== false && typeof l.url === "string" && l.url.trim() !== "";
    });
  }

  /* --------------------------- DOM building -------------------------- */
  function el(tag, opts) {
    var node = document.createElement(tag);
    opts = opts || {};
    if (opts.className) node.className = opts.className;
    if (opts.text != null) node.textContent = String(opts.text);
    if (opts.html != null) node.innerHTML = opts.html; // ONLY used with static ICONS, never user data
    if (opts.attrs) Object.keys(opts.attrs).forEach(function (k) {
      var v = opts.attrs[k]; if (v != null) node.setAttribute(k, String(v));
    });
    return node;
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  function avatar(profile, lang) {
    var wrap = el("div", { className: "avatar" });
    var name = pick(profile.title, lang);
    var hasImage = profile.image && String(profile.image).trim() !== "";
    if (hasImage) {
      var img = el("img", { className: "avatar-img", attrs: { src: safeHref(profile.image), alt: name, loading: "eager" } });
      img.addEventListener("error", function () {
        if (img.parentNode) img.parentNode.removeChild(img);
        wrap.appendChild(monogram(profile));
        wrap.classList.add("avatar--fallback");
      });
      wrap.appendChild(img);
    } else {
      wrap.appendChild(monogram(profile));
      wrap.classList.add("avatar--fallback");
    }
    return wrap;
  }

  function monogram(profile) {
    var initials = (profile.initials && String(profile.initials).trim()) ||
      (pick(profile.title, "en") || "?").trim().charAt(0).toUpperCase();
    return el("span", { className: "avatar-initials", text: initials });
  }

  function langToggle(lang, onSwitch) {
    var bar = el("div", { className: "lang-toggle", attrs: { role: "group", "aria-label": "Language" } });
    [["en", "EN"], ["ar", "العربية"]].forEach(function (pair) {
      var code = pair[0], label = pair[1];
      var btn = el("button", {
        className: "lang-btn" + (lang === code ? " is-active" : ""),
        text: label,
        attrs: { type: "button", "data-lang": code, "aria-pressed": String(lang === code) }
      });
      btn.addEventListener("click", function () { onSwitch(code); });
      bar.appendChild(btn);
    });
    return bar;
  }

  // Primary apply button (always visible).
  function applyButton(config, profile, lang) {
    var ui = config.ui[lang];
    var navigable = isNavigable(config.applyLink);
    var attrs = { href: safeHref(config.applyLink), "data-role": "apply" };
    var ext = externalAttrs(config.applyLink);
    if (ext.target) { attrs.target = ext.target; attrs.rel = ext.rel; }
    var a = el("a", {
      className: "link-btn link-btn--apply" + (navigable ? "" : " is-disabled"),
      attrs: attrs
    });
    if (!navigable) {
      a.setAttribute("aria-disabled", "true");
      a.addEventListener("click", function (e) { e.preventDefault(); });
    }
    a.appendChild(el("span", { className: "link-label", text: ui.apply, attrs: { dir: "auto" } }));
    return a;
  }

  // A platform slot — ALWAYS visible. Active link if navigable, else disabled slot.
  function platformSlot(config, plat, lang) {
    var ui = config.ui[lang];
    var label = (plat.key === "website") ? ui.websiteLabel : plat.label;
    var navigable = plat.enabled === true && isNavigable(plat.url);
    var attrs = { href: navigable ? safeHref(plat.url) : "#", "data-platform": plat.key };
    if (navigable) {
      var ext = externalAttrs(plat.url);
      if (ext.target) { attrs.target = ext.target; attrs.rel = ext.rel; }
    }
    var a = el("a", {
      className: "link-btn link-btn--platform" + (navigable ? "" : " is-disabled"),
      attrs: attrs
    });
    if (!navigable) {
      a.setAttribute("aria-disabled", "true");
      a.addEventListener("click", function (e) { e.preventDefault(); });
    }
    a.appendChild(el("span", { className: "link-icon", html: ICONS[plat.key] || ICONS.website }));
    a.appendChild(el("span", { className: "link-label", text: label }));
    if (!navigable) a.appendChild(el("span", { className: "link-tag", text: ui.comingSoon, attrs: { dir: "auto" } }));
    return a;
  }

  function regionChips(config, profile, lang) {
    var links = visibleAgencyLinks(profile, config);
    if (!links.length) return null;
    var wrap = el("section", { className: "regions" });
    wrap.appendChild(el("h2", { className: "section-heading", text: config.ui[lang].regionsHeading, attrs: { dir: "auto" } }));
    var row = el("div", { className: "chip-row" });
    links.forEach(function (l) {
      var ext = externalAttrs(l.url);
      var chip = el("a", {
        className: "chip",
        text: l.region,
        attrs: { href: safeHref(l.url), target: ext.target, rel: ext.rel, "data-region": l.region }
      });
      row.appendChild(chip);
    });
    wrap.appendChild(row);
    return wrap;
  }

  function footer(config, lang) {
    var f = el("footer", { className: "site-footer" });
    f.appendChild(el("span", { className: "footer-text", text: config.ui[lang].footer, attrs: { dir: "auto" } }));
    return f;
  }

  function applyDir(lang) {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
  }

  /* ----------------------------- views ------------------------------- */
  function renderProfileInto(container, key, config, lang, onSwitch) {
    var profile = config.profiles[key];
    var ui = config.ui[lang];
    clear(container);
    applyDir(lang);

    var card = el("main", { className: "card profile-card", attrs: { "data-profile": key } });

    card.appendChild(langToggle(lang, onSwitch));

    var header = el("header", { className: "profile-header" });
    header.appendChild(avatar(profile, lang));
    header.appendChild(el("h1", { className: "display-title", text: pick(profile.title, lang), attrs: { dir: "auto" } }));
    var sub = pick(profile.subtitle, lang);
    if (sub) header.appendChild(el("p", { className: "display-subtitle", text: sub, attrs: { dir: "auto" } }));
    var tag = pick(profile.tagline, lang);
    if (tag) header.appendChild(el("p", { className: "display-tagline", text: tag, attrs: { dir: "auto" } }));
    card.appendChild(header);

    // Apply
    if (profile.applyEnabled === true) {
      var applySec = el("section", { className: "link-section apply-section" });
      applySec.appendChild(applyButton(config, profile, lang));
      card.appendChild(applySec);
    }

    // Platform slots (always visible)
    if (profile.platforms && profile.platforms.length) {
      var pSec = el("section", { className: "link-section platforms" });
      pSec.appendChild(el("h2", { className: "section-heading", text: ui.platformsHeading, attrs: { dir: "auto" } }));
      profile.platforms.forEach(function (plat) { pSec.appendChild(platformSlot(config, plat, lang)); });
      card.appendChild(pSec);
    }

    // Region chips
    var regions = regionChips(config, profile, lang);
    if (regions) card.appendChild(regions);

    // Back to selector
    var back = el("nav", { className: "back-nav" });
    back.appendChild(el("a", { className: "back-link", text: ui.allProfiles, attrs: { href: "./" + (lang === "ar" ? "?lang=ar" : ""), dir: "auto" } }));
    card.appendChild(back);

    container.appendChild(card);
    container.appendChild(footer(config, lang));

    if (typeof document !== "undefined") document.title = pick(profile.title, lang) + " — " + pick(config.brand, lang);
    if (typeof document !== "undefined") document.documentElement.setAttribute("data-view", "profile");
  }

  function renderSelectorInto(container, config, lang, onSwitch) {
    var ui = config.ui[lang];
    clear(container);
    applyDir(lang);

    var card = el("main", { className: "card selector-card", attrs: { "data-view": "selector" } });
    card.appendChild(langToggle(lang, onSwitch));

    var header = el("header", { className: "selector-header" });
    header.appendChild(el("h1", { className: "selector-title", text: pick(config.brand, lang), attrs: { dir: "auto" } }));
    header.appendChild(el("p", { className: "selector-subtitle", text: ui.selectorSubtitle, attrs: { dir: "auto" } }));
    card.appendChild(header);

    var grid = el("div", { className: "selector-grid" });
    (config.profileOrder || Object.keys(config.profiles)).forEach(function (k) {
      var p = config.profiles[k];
      if (!p) return;
      var item = el("a", {
        className: "selector-item",
        attrs: { href: "?profile=" + encodeURIComponent(k) + (lang === "ar" ? "&lang=ar" : ""), "data-profile": k, dir: "auto" }
      });
      item.appendChild(avatar(p, lang));
      var meta = el("div", { className: "selector-meta" });
      meta.appendChild(el("span", { className: "selector-name", text: pick(p.title, lang), attrs: { dir: "auto" } }));
      var sub = pick(p.subtitle, lang);
      if (sub) meta.appendChild(el("span", { className: "selector-accent", text: sub, attrs: { dir: "auto" } }));
      item.appendChild(meta);
      item.appendChild(el("span", { className: "selector-arrow", text: "→" }));
      grid.appendChild(item);
    });
    card.appendChild(grid);

    container.appendChild(card);
    container.appendChild(footer(config, lang));

    if (typeof document !== "undefined") document.title = pick(config.brand, lang);
    if (typeof document !== "undefined") document.documentElement.setAttribute("data-view", "selector");
  }

  /* ------------------------------ mount ------------------------------ */
  function mount() {
    if (typeof document === "undefined") return;
    var container = document.getElementById("app");
    if (!container) return;
    var config = getConfig();
    if (!config) { container.textContent = "Configuration failed to load."; return; }

    var lang = resolveLang(config, window.location.search);
    var key = resolveProfileKey(window.location.search, window.location.hash, config);

    function onSwitch(newLang) {
      if (newLang !== "en" && newLang !== "ar") return;
      setLang(newLang);
      lang = newLang;
      paint();
    }
    function paint() {
      if (key) renderProfileInto(container, key, config, lang, onSwitch);
      else renderSelectorInto(container, config, lang, onSwitch);
    }
    paint();
  }

  /* ----------------------------- exports ----------------------------- */
  return {
    isExternal: isExternal,
    isNavigable: isNavigable,
    safeHref: safeHref,
    externalAttrs: externalAttrs,
    pick: pick,
    resolveLang: resolveLang,
    resolveProfileKey: resolveProfileKey,
    visibleAgencyLinks: visibleAgencyLinks,
    el: el,
    renderProfileInto: renderProfileInto,
    renderSelectorInto: renderSelectorInto,
    mount: mount
  };
});
