/* =====================================================================
 * app.js — ALWAFER Link Hub renderer (APPROVED-ARTWORK / overlay mode)
 * ---------------------------------------------------------------------
 * Profile routes render ONE approved 9:16 artwork image with transparent
 * clickable hotspot anchors overlaid on top (percentage positioned, so
 * they scale with the image). No CSS cards / monograms / duplicated text.
 *
 * Routes (unchanged):
 *   /?profile=mustafa | /#mustafa  -> ALWAFER artwork
 *   /?profile=ahmed   | /#ahmed    -> Team Ahmed Ramadan artwork
 *   /?profile=hala    | /#hala     -> Hala Al-Saghir artwork
 *   (nothing/unknown)              -> selector page
 *
 * ?hotspots=1  -> outlines the hotspot zones (for coordinate tuning).
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

  /* ----------------------------- helpers ----------------------------- */
  function getConfig() {
    if (typeof window !== "undefined" && window.LINK_HUB_CONFIG) return window.LINK_HUB_CONFIG;
    if (typeof globalThis !== "undefined" && globalThis.LINK_HUB_CONFIG) return globalThis.LINK_HUB_CONFIG;
    return null;
  }

  function isExternal(url) {
    return typeof url === "string" && (/^https?:\/\//i.test(url) || /^\/\//.test(url));
  }

  function isNavigable(url) {
    if (typeof url !== "string") return false;
    var u = url.trim();
    if (u === "" || u === "#" || u.charAt(0) === "#") return false;
    return /^(https?:|mailto:|tel:|\/)/i.test(u);
  }

  function safeHref(url) {
    if (typeof url !== "string") return "#";
    var u = url.trim();
    if (u === "") return "#";
    var m = u.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
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

  function debugHotspots(search) {
    return typeof search === "string" && /[?&]hotspots=1\b/.test(search);
  }

  // Resolve the destination URL for a hotspot zone.
  function zoneUrl(zone, config) {
    if (zone.kind === "region") return (config.regionUrls || {})[zone.region] || "";
    if (zone.kind === "apply") return config.applyLink || "#";
    if (zone.kind === "platform") {
      if (zone.key === "website") return config.websiteUrl || "";
      return (config.platformUrls || {})[zone.key] || "";
    }
    return "";
  }

  /* --------------------------- DOM building -------------------------- */
  function el(tag, opts) {
    var node = document.createElement(tag);
    opts = opts || {};
    if (opts.className) node.className = opts.className;
    if (opts.text != null) node.textContent = String(opts.text); // markup-safe
    if (opts.attrs) Object.keys(opts.attrs).forEach(function (k) {
      var v = opts.attrs[k]; if (v != null) node.setAttribute(k, String(v));
    });
    if (opts.style) node.setAttribute("style", opts.style);
    return node;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  function hotspot(zone, config) {
    var url = zoneUrl(zone, config);
    var navigable = isNavigable(url);
    var attrs = {
      href: navigable ? safeHref(url) : "#",
      "aria-label": zone.label,
      "data-hotspot": zone.key
    };
    if (navigable) {
      var ext = externalAttrs(url);
      if (ext.target) { attrs.target = ext.target; attrs.rel = ext.rel; }
    } else {
      attrs["aria-disabled"] = "true";
    }
    var cls = "hotspot hotspot--" + zone.kind + " " +
      (zone.kind === "region" ? "region-" + zone.region.toLowerCase() : zone.key) +
      (navigable ? "" : " is-disabled");
    var style = "top:" + zone.top + "%;left:" + zone.left + "%;width:" +
      zone.width + "%;height:" + zone.height + "%;";
    var a = el("a", { className: cls, attrs: attrs, style: style });
    if (!navigable) a.addEventListener("click", function (e) { e.preventDefault(); });
    // accessible name is the label (announced to screen readers)
    a.appendChild(el("span", { className: "visually-hidden", text: zone.label, attrs: { dir: "auto" } }));
    return a;
  }

  // Visually-hidden semantic block (screen-reader description of the artwork).
  function semanticBlock(profile, config, lang) {
    var box = el("div", { className: "visually-hidden", attrs: { "aria-hidden": "false" } });
    box.appendChild(el("h1", { text: pick(profile.title, lang), attrs: { dir: "auto" } }));
    var sub = pick(profile.subtitle, lang);
    if (sub) box.appendChild(el("p", { text: sub, attrs: { dir: "auto" } }));
    var ul = el("ul");
    (config.overlay || []).forEach(function (z) {
      var url = zoneUrl(z, config);
      var li = el("li");
      var label = z.label + (isNavigable(url) ? "" : " (coming soon)");
      if (isNavigable(url)) {
        var ext = externalAttrs(url);
        li.appendChild(el("a", { text: label, attrs: { href: safeHref(url), target: ext.target, rel: ext.rel, dir: "auto" } }));
      } else {
        li.appendChild(el("span", { text: label, attrs: { dir: "auto" } }));
      }
      ul.appendChild(li);
    });
    box.appendChild(ul);
    return box;
  }

  function renderArtworkInto(container, key, config, opts) {
    opts = opts || {};
    var lang = "en";
    var profile = config.profiles[key];
    clear(container);

    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-view", "artwork");
      document.title = pick(profile.title, lang) + " — " + pick(config.brand, lang);
    }

    var shell = el("main", { className: "profile-art-shell", attrs: { "data-profile": key } });
    var frame = el("div", { className: "artwork-frame" + (opts.debug ? " debug" : "") });

    var img = el("img", {
      className: "profile-art",
      attrs: {
        src: safeHref(profile.artwork),
        alt: pick(profile.title, lang) + " — " + pick(profile.subtitle, lang),
        decoding: "async",
        fetchpriority: "high"
      }
    });
    frame.appendChild(img);

    // Hotspot overlays
    (config.overlay || []).forEach(function (zone) {
      frame.appendChild(hotspot(zone, config));
    });

    shell.appendChild(frame);
    shell.appendChild(semanticBlock(profile, config, lang));
    container.appendChild(shell);
  }

  /* ----------------------------- selector ---------------------------- */
  function renderSelectorInto(container, config) {
    var lang = "en";
    clear(container);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-view", "selector");
      document.title = pick(config.brand, lang);
    }

    var wrap = el("main", { className: "selector-shell" });
    wrap.appendChild(el("h1", { className: "selector-title", text: pick(config.brand, lang), attrs: { dir: "auto" } }));
    wrap.appendChild(el("p", { className: "selector-subtitle", text: "Choose a profile", attrs: { dir: "auto" } }));

    var grid = el("div", { className: "selector-grid" });
    (config.profileOrder || Object.keys(config.profiles)).forEach(function (k) {
      var p = config.profiles[k];
      if (!p) return;
      var item = el("a", {
        className: "selector-item",
        attrs: { href: "?profile=" + encodeURIComponent(k), "data-profile": k, dir: "auto" }
      });
      item.appendChild(el("span", { className: "selector-name", text: pick(p.title, lang), attrs: { dir: "auto" } }));
      item.appendChild(el("span", { className: "selector-arrow", text: "→" }));
      grid.appendChild(item);
    });
    wrap.appendChild(grid);
    container.appendChild(wrap);
  }

  /* ------------------------------ mount ------------------------------ */
  function mount() {
    if (typeof document === "undefined") return;
    var container = document.getElementById("app");
    if (!container) return;
    var config = getConfig();
    if (!config) { container.textContent = "Configuration failed to load."; return; }

    document.documentElement.setAttribute("lang", "en");
    document.documentElement.setAttribute("dir", "ltr");

    var key = resolveProfileKey(window.location.search, window.location.hash, config);
    if (key) {
      renderArtworkInto(container, key, config, { debug: debugHotspots(window.location.search) });
    } else {
      renderSelectorInto(container, config);
    }
  }

  /* ----------------------------- exports ----------------------------- */
  return {
    isExternal: isExternal,
    isNavigable: isNavigable,
    safeHref: safeHref,
    externalAttrs: externalAttrs,
    pick: pick,
    resolveProfileKey: resolveProfileKey,
    zoneUrl: zoneUrl,
    el: el,
    hotspot: hotspot,
    renderArtworkInto: renderArtworkInto,
    renderSelectorInto: renderSelectorInto,
    mount: mount
  };
});
