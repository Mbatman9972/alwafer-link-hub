/* =====================================================================
 * app.js — Alwafir Link Hub renderer
 * ---------------------------------------------------------------------
 * Plain JavaScript. No framework, no build step, no dependencies.
 * Reads window.LINK_HUB_CONFIG (from config.js) and renders the page.
 *
 * Routing:
 *   /?profile=mustafa  or  /#mustafa   -> Mustafa
 *   /?profile=ahmed    or  /#ahmed     -> Team Ahmed Ramadan
 *   /?profile=hala     or  /#hala      -> Hala Al-Saghir
 *   (nothing / unknown)                -> selector page
 *
 * Safety: every piece of dynamic text is written via textContent and
 * every URL via setAttribute, so Arabic text, quotes, or stray markup
 * in config.js can never break the HTML.
 * ===================================================================== */
(function (root, factory) {
  var api = factory();
  root.LinkHub = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  // Auto-mount only in a real browser environment.
  if (typeof document !== "undefined" && typeof window !== "undefined") {
    var start = function () { api.mount(); };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start);
    } else {
      start();
    }
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

  // A URL that points off-site (gets target=_blank + rel=noopener noreferrer).
  function isExternal(url) {
    if (typeof url !== "string") return false;
    return /^https?:\/\//i.test(url) || /^\/\//.test(url);
  }

  // Only allow safe link schemes; anything weird collapses to "#".
  function safeHref(url) {
    if (typeof url !== "string") return "#";
    var u = url.trim();
    if (u === "") return "#";
    if (/^(https?:|mailto:|tel:|#|\/)/i.test(u)) return u;
    return "#";
  }

  // Attributes applied to a link. External links always get the
  // security-hardened target/rel pair.
  function externalAttrs(url) {
    if (isExternal(url)) {
      return { target: "_blank", rel: "noopener noreferrer" };
    }
    return {};
  }

  // Resolve the active profile key from the query string or hash.
  // Returns "" when nothing valid is selected (=> show selector).
  function resolveProfileKey(search, hash, config) {
    config = config || getConfig() || {};
    var profiles = config.profiles || {};
    var key = "";

    if (typeof search === "string" && search.length) {
      var m = search.replace(/^\?/, "").split("&");
      for (var i = 0; i < m.length; i++) {
        var pair = m[i].split("=");
        if (decodeURIComponent(pair[0]) === "profile") {
          key = decodeURIComponent(pair[1] || "");
          break;
        }
      }
    }
    if (!key && typeof hash === "string" && hash) {
      key = hash.replace(/^#/, "");
    }
    key = (key || "").trim().toLowerCase();
    return (key && profiles[key]) ? key : "";
  }

  // Personal links that should actually render: enabled AND have a url.
  function visiblePersonalLinks(profile) {
    var list = (profile && profile.personalLinks) || [];
    return list.filter(function (l) {
      return l && l.enabled === true && typeof l.url === "string" && l.url.trim() !== "";
    });
  }

  // Custom links that should render: enabled AND have a url.
  function visibleCustomLinks(profile) {
    var list = (profile && profile.customLinks) || [];
    return list.filter(function (l) {
      return l && l.enabled === true && typeof l.url === "string" && l.url.trim() !== "";
    });
  }

  // Agency links that should render for this profile.
  function visibleAgencyLinks(profile, config) {
    config = config || getConfig() || {};
    if (!profile || profile.showSharedAgencyLinks !== true) return [];
    var list = config.sharedAgencyLinks || [];
    return list.filter(function (l) {
      return l && l.enabled !== false && typeof l.url === "string" && l.url.trim() !== "";
    });
  }

  /* --------------------------- DOM building -------------------------- */

  function el(tag, opts) {
    var node = document.createElement(tag);
    opts = opts || {};
    if (opts.className) node.className = opts.className;
    if (opts.text != null) node.textContent = String(opts.text); // markup-safe
    if (opts.attrs) {
      Object.keys(opts.attrs).forEach(function (k) {
        var v = opts.attrs[k];
        if (v != null) node.setAttribute(k, String(v));
      });
    }
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function avatar(profile) {
    var wrap = el("div", { className: "avatar" });
    var hasImage = profile.image && String(profile.image).trim() !== "";
    if (hasImage) {
      var img = el("img", {
        className: "avatar-img",
        attrs: { src: safeHref(profile.image), alt: profile.displayName || "" }
      });
      // If the image fails to load, fall back to initials.
      img.addEventListener("error", function () {
        if (img.parentNode) img.parentNode.removeChild(img);
        wrap.appendChild(initialsNode(profile));
      });
      wrap.appendChild(img);
    } else {
      wrap.appendChild(initialsNode(profile));
    }
    return wrap;
  }

  function initialsNode(profile) {
    var initials = (profile.initials && String(profile.initials).trim()) ||
      (profile.displayName ? profile.displayName.trim().charAt(0).toUpperCase() : "?");
    return el("span", { className: "avatar-initials", text: initials });
  }

  // A single tappable link button.
  function linkButton(opts) {
    // opts: { label, url, variant, region }
    var attrs = { href: safeHref(opts.url) };
    var ext = externalAttrs(opts.url);
    if (ext.target) attrs.target = ext.target;
    if (ext.rel) attrs.rel = ext.rel;

    var a = el("a", { className: "link-btn " + (opts.variant || ""), attrs: attrs });

    if (opts.region) {
      a.appendChild(el("span", { className: "link-pill", text: opts.region }));
    }
    a.appendChild(el("span", { className: "link-label", text: opts.label }));
    a.setAttribute("dir", "auto");
    return a;
  }

  function section(headingText) {
    var s = el("section", { className: "link-section" });
    if (headingText) {
      s.appendChild(el("h2", { className: "section-heading", text: headingText, attrs: { dir: "auto" } }));
    }
    return s;
  }

  function renderProfileInto(container, profileKey, config) {
    config = config || getConfig();
    var profile = config.profiles[profileKey];
    clear(container);

    var card = el("main", { className: "card profile-card", attrs: { "data-profile": profileKey } });

    // Header
    var header = el("header", { className: "profile-header" });
    header.appendChild(avatar(profile));
    if (profile.accentLabel) {
      header.appendChild(el("span", { className: "accent-label", text: profile.accentLabel, attrs: { dir: "auto" } }));
    }
    header.appendChild(el("h1", { className: "display-name", text: profile.displayName, attrs: { dir: "auto" } }));
    if (profile.handle) {
      header.appendChild(el("p", { className: "handle", text: profile.handle, attrs: { dir: "auto" } }));
    }
    if (profile.bio) {
      header.appendChild(el("p", { className: "bio", text: profile.bio, attrs: { dir: "auto" } }));
    }
    card.appendChild(header);

    // Apply button
    if (profile.applyEnabled === true) {
      var applySection = el("section", { className: "link-section apply-section" });
      applySection.appendChild(linkButton({
        label: config.applyButtonLabel || "Apply to Join the Agency",
        url: config.applyLink,
        variant: "link-btn--apply"
      }));
      card.appendChild(applySection);
    }

    // Personal links (only enabled ones)
    var personal = visiblePersonalLinks(profile);
    if (personal.length) {
      var pSection = section(config.personalLinksHeading);
      personal.forEach(function (l) {
        pSection.appendChild(linkButton({ label: l.label, url: l.url, variant: "link-btn--personal" }));
      });
      card.appendChild(pSection);
    }

    // Custom links (only enabled ones)
    var custom = visibleCustomLinks(profile);
    if (custom.length) {
      var cSection = section(null);
      custom.forEach(function (l) {
        cSection.appendChild(linkButton({ label: l.label, url: l.url, variant: "link-btn--custom" }));
      });
      card.appendChild(cSection);
    }

    // Shared agency links
    var agency = visibleAgencyLinks(profile, config);
    if (agency.length) {
      var aSection = section(config.agencyLinksHeading);
      agency.forEach(function (l) {
        aSection.appendChild(linkButton({
          label: l.label,
          url: l.url,
          variant: "link-btn--agency",
          region: l.region
        }));
      });
      card.appendChild(aSection);
    }

    // Back to selector
    var back = el("nav", { className: "back-nav" });
    back.appendChild(el("a", {
      className: "back-link",
      text: "← All profiles",
      attrs: { href: "./" }
    }));
    card.appendChild(back);

    container.appendChild(card);
    container.appendChild(footer(config));

    if (typeof document !== "undefined") {
      document.title = (profile.displayName ? profile.displayName + " — " : "") + (config.brand && config.brand.name || "Link Hub");
    }
  }

  function renderSelectorInto(container, config) {
    config = config || getConfig();
    clear(container);

    var card = el("main", { className: "card selector-card", attrs: { "data-view": "selector" } });
    var header = el("header", { className: "selector-header" });
    header.appendChild(el("h1", { className: "selector-title", text: config.selectorTitle || (config.brand && config.brand.name) || "Link Hub", attrs: { dir: "auto" } }));
    if (config.selectorSubtitle) {
      header.appendChild(el("p", { className: "selector-subtitle", text: config.selectorSubtitle, attrs: { dir: "auto" } }));
    }
    card.appendChild(header);

    var grid = el("div", { className: "selector-grid" });
    var order = config.profileOrder || Object.keys(config.profiles);
    order.forEach(function (key) {
      var p = config.profiles[key];
      if (!p) return;
      var cardLink = el("a", {
        className: "selector-item",
        attrs: { href: "?profile=" + encodeURIComponent(key), "data-profile": key, dir: "auto" }
      });
      cardLink.appendChild(avatar(p));
      var meta = el("div", { className: "selector-meta" });
      meta.appendChild(el("span", { className: "selector-name", text: p.displayName, attrs: { dir: "auto" } }));
      if (p.accentLabel) {
        meta.appendChild(el("span", { className: "selector-accent", text: p.accentLabel, attrs: { dir: "auto" } }));
      }
      cardLink.appendChild(meta);
      cardLink.appendChild(el("span", { className: "selector-arrow", text: "→" }));
      grid.appendChild(cardLink);
    });
    card.appendChild(grid);

    container.appendChild(card);
    container.appendChild(footer(config));

    if (typeof document !== "undefined") {
      document.title = (config.brand && config.brand.name) || "Link Hub";
    }
  }

  function footer(config) {
    var f = el("footer", { className: "site-footer" });
    f.appendChild(el("span", { className: "footer-text", text: (config.brand && config.brand.footer) || "" }));
    return f;
  }

  /* ------------------------------ mount ------------------------------ */

  function mount() {
    if (typeof document === "undefined") return;
    var container = document.getElementById("app");
    if (!container) return;
    var config = getConfig();
    if (!config) {
      container.textContent = "Configuration failed to load.";
      return;
    }
    var key = resolveProfileKey(
      window.location.search,
      window.location.hash,
      config
    );
    if (key) {
      renderProfileInto(container, key, config);
      document.documentElement.setAttribute("data-view", "profile");
    } else {
      renderSelectorInto(container, config);
      document.documentElement.setAttribute("data-view", "selector");
    }
  }

  /* ----------------------------- exports ----------------------------- */

  return {
    isExternal: isExternal,
    safeHref: safeHref,
    externalAttrs: externalAttrs,
    resolveProfileKey: resolveProfileKey,
    visiblePersonalLinks: visiblePersonalLinks,
    visibleCustomLinks: visibleCustomLinks,
    visibleAgencyLinks: visibleAgencyLinks,
    el: el,
    renderProfileInto: renderProfileInto,
    renderSelectorInto: renderSelectorInto,
    mount: mount
  };
});
