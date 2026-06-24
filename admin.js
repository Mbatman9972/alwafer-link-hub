/* =====================================================================
 * admin.js — ALWAFER Link Manager frontend
 * ===================================================================== */
(function () {
  "use strict";

  var API = "/api/admin";
  var LOGIN_TIMEOUT_MS = 8000;
  var ADMIN_BUILD_VERSION = "owner-debug-2026-06-24-v2";
  var DEBUG_ADMIN = /(?:^\?|&)debugAdmin=1(?:&|$)/.test(String(location.search || ""));
  var NAMES = { mustafa: "ALWAFER", ahmed: "Team Ahmed Ramadan", hala: "Hala Al-Saghir" };
  var SLUGS = { mustafa: "alwafer", ahmed: "ahmed", hala: "hala" };
  var LINK_KEYS = ["apply", "youtube", "tiktok", "telegram", "instagram", "whatsapp", "website"];
  var LINK_LABELS = {
    apply: "Apply to Join the Agency",
    youtube: "YouTube",
    tiktok: "TikTok",
    telegram: "Telegram",
    instagram: "Instagram",
    whatsapp: "WhatsApp",
    website: "Website"
  };
  var REGION_KEYS = ["mena", "uk", "fr", "de", "tr", "cca"];
  var REGION_LABELS = { mena: "MENA", uk: "UK", fr: "FR", de: "DE", tr: "TR", cca: "CCA" };
  var REGION_DEFAULTS = {
    mena: "https://www.tiktok.com/t/ZMAN6Bu2W/",
    uk: "https://www.tiktok.com/t/ZSxoyPd4W/",
    fr: "https://www.tiktok.com/t/ZSxoAQrsm/",
    de: "https://www.tiktok.com/t/ZSQ1b63XY/",
    tr: "https://www.tiktok.com/t/ZSxoUt6A7/",
    cca: "https://www.tiktok.com/t/ZSxECjfqx/"
  };
  var PROFILE_DEFAULTS = {
    mustafa: { title: "ALWAFER", subtitle: "Alwafer Agency", profileImage: "/assets/profiles/alwafer-profile.png" },
    ahmed: { title: "TEAM AHMED RAMADAN", subtitle: "Official Agency Network", profileImage: "/assets/profiles/ahmed-profile.png" },
    hala: { title: "HALA AL-SAGHIR", subtitle: "Official Profile", profileImage: "/assets/profiles/hala-profile.jpg" }
  };
  var DEFAULT_TAGLINE = "Empowering creators. Building influence. Elevating brands.\nتمكّن المبدعين، نبني التأثير، نرتقي بالعلامات التجارية.";

  var state = {
    settings: null,
    user: null,
    serverPerms: { profiles: [], regions: false },
    perms: { profiles: [], regions: false },
    profile: "mustafa",
    routeProfile: null
  };
  var debugState = {
    uiState: "loading",
    loginRequestUrl: "",
    lastLoginStatus: "not attempted",
    sessionCookie: "not checked",
    meStatus: "not checked",
    authenticatedUserKey: "none",
    canSave: "unknown",
    lastVisibleError: ""
  };

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = String(text);
    return node;
  }
  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); }
  function show(node, on) { if (node) node.classList.toggle("hidden", !on); }
  function isElementVisible(node) {
    if (!node || node.hidden) return false;
    if (typeof window !== "undefined" && typeof window.getComputedStyle === "function") {
      var style = window.getComputedStyle(node);
      if (style && (style.display === "none" || style.visibility === "hidden")) return false;
      if (style && style.position === "fixed") return true;
    }
    return node.offsetParent != null;
  }
  /* Single source of truth for which top-level view is on screen. Toggles BOTH
     the semantic `hidden` attribute (also fixed in admin.css via .view[hidden])
     and the `.hidden` class (display:none !important), so the editor and login
     card can never be visible at the same time regardless of per-view CSS. */
  function setView(view) {
    var login = $("login-view");
    var editor = $("editor-view");
    var editorActive = view === "editor";
    if (login) { login.hidden = editorActive; login.classList.toggle("hidden", editorActive); }
    if (editor) { editor.hidden = !editorActive; editor.classList.toggle("hidden", !editorActive); }
  }
  function toast(message, type) {
    var box = $("toasts");
    if (!box) return;
    var item = el("div", "toast " + (type || "info"), message);
    box.appendChild(item);
    setTimeout(function () { if (item.parentNode) item.parentNode.removeChild(item); }, 3600);
  }
  function adminApiPath(path) {
    path = String(path || "");
    if (path.charAt(0) !== "/") path = "/" + path;
    return API + path + (path.slice(-1) === "/" ? "" : "/");
  }
  function setLoginBusy(on) {
    var btn = $("login-btn");
    if (!btn) return;
    btn.disabled = !!on;
    btn.textContent = on ? "Signing in…" : "Sign in";
    btn.setAttribute("aria-busy", on ? "true" : "false");
  }

  function isAllowedUrl(value) {
    if (typeof value !== "string") return false;
    var s = value.trim();
    if (!s) return false;
    if (s.charAt(0) === "#") return true;
    var m = s.match(/^([a-zA-Z][a-zA-Z0-9+.\-]*):/);
    if (!m) return /^\/[A-Za-z0-9._~!$&'()*+,;=:@/%-]+$/.test(s);
    var scheme = m[1].toLowerCase();
    if (scheme === "http" || scheme === "https") { try { new URL(s); return true; } catch (e) { return false; } }
    if (scheme === "mailto" || scheme === "tel") return s.length > scheme.length + 1;
    return false;
  }
  function isNavigableUrl(value) { return isAllowedUrl(value) && value.trim().charAt(0) !== "#"; }
  function isImageUrl(value) {
    if (typeof value !== "string") return false;
    var s = value.trim();
    if (!s) return false;
    if (/^https?:\/\//i.test(s)) { try { new URL(s); return true; } catch (e) { return false; } }
    return /^\/assets\/[A-Za-z0-9._~!$&'()*+,;=:@/%-]+\.(png|jpe?g|webp)$/i.test(s);
  }
  function statusFor(link) {
    if (!link || link.enabled !== true) return { cls: "disabled", text: "Disabled" };
    var url = (link.url || "").trim();
    if (!url) return { cls: "missing", text: "Missing URL" };
    if (!isNavigableUrl(url)) return { cls: "invalid", text: "Invalid URL" };
    return { cls: "active", text: "Active" };
  }

  function routeProfile() {
    var match = String(location.pathname || "").match(/^\/admin\/(alwafer|ahmed|hala)\/?$/i);
    if (!match) return "";
    return match[1].toLowerCase() === "alwafer" ? "mustafa" : match[1].toLowerCase();
  }
  function adminPath(profile) { return "/admin/" + (profile === "mustafa" ? "alwafer" : profile) + "/"; }
  function userKey(user) {
    if (!user || typeof user !== "object") return "none";
    return user.key || (user.role === "owner" ? "mustafa" : (user.profile || "none"));
  }
  function sessionCookieState(authenticated) {
    var visible = typeof document.cookie === "string" && document.cookie.indexOf("alwafer_admin=") >= 0;
    if (visible) return "yes (JS-visible)";
    if (authenticated) return "yes (HttpOnly, inferred by /me)";
    return "no";
  }
  function updateDebug(extra) {
    if (extra) {
      Object.keys(extra).forEach(function (key) { debugState[key] = extra[key]; });
    }
    renderDebug();
  }
  function debugRow(label, value) {
    var row = el("div", "admin-debug-row");
    row.appendChild(el("span", "admin-debug-label", label));
    row.appendChild(el("span", "admin-debug-value", value == null ? "" : String(value)));
    return row;
  }
  function renderDebug() {
    if (!DEBUG_ADMIN || !document.body) return;
    var panel = $("admin-debug-panel");
    if (!panel) {
      panel = el("aside", "admin-debug-panel");
      panel.id = "admin-debug-panel";
      panel.setAttribute("aria-label", "Admin diagnostics");
      document.body.appendChild(panel);
    }
    var selected = $("login-account") ? $("login-account").value : "";
    clear(panel);
    panel.appendChild(el("h2", null, "Admin diagnostics"));
    panel.appendChild(debugRow("admin build", ADMIN_BUILD_VERSION));
    panel.appendChild(debugRow("route profile", state.routeProfile || routeProfile() || "none"));
    panel.appendChild(debugRow("selected account key", selected || "none"));
    panel.appendChild(debugRow("login request URL", debugState.loginRequestUrl || adminApiPath("/login")));
    panel.appendChild(debugRow("last login response", debugState.lastLoginStatus));
    panel.appendChild(debugRow("session cookie", debugState.sessionCookie));
    panel.appendChild(debugRow("/api/admin/me status", debugState.meStatus));
    panel.appendChild(debugRow("authenticated user key", debugState.authenticatedUserKey));
    panel.appendChild(debugRow("canSave", debugState.canSave));
    panel.appendChild(debugRow("UI state", debugState.uiState));
    // Live DOM truth — computed from the actual elements, not from debugState,
    // so the panel can never disagree with what is on screen.
    var loginVisible = isElementVisible($("login-view"));
    var editorVisible = isElementVisible($("editor-view"));
    var editorCount = document.querySelectorAll('[data-admin-editor="true"]').length;
    var loginCount = document.querySelectorAll('[data-admin-login="true"]').length;
    panel.appendChild(debugRow("login visible", String(loginVisible)));
    panel.appendChild(debugRow("editor visible", String(editorVisible)));
    panel.appendChild(debugRow("editor selector count", String(editorCount)));
    panel.appendChild(debugRow("login selector count", String(loginCount)));
    panel.appendChild(debugRow("last visible error", debugState.lastVisibleError || "none"));
  }

  function defaults() {
    var settings = { version: 1, updatedAt: "", profiles: {}, sharedRegions: [] };
    ["mustafa", "ahmed", "hala"].forEach(function (profile) {
      settings.profiles[profile] = {
        title: PROFILE_DEFAULTS[profile].title,
        subtitle: PROFILE_DEFAULTS[profile].subtitle,
        tagline: DEFAULT_TAGLINE,
        profileImage: PROFILE_DEFAULTS[profile].profileImage,
        links: {}
      };
      LINK_KEYS.forEach(function (key) {
        settings.profiles[profile].links[key] = { enabled: false, url: "", label: LINK_LABELS[key] };
      });
    });
    settings.sharedRegions = defaultRegions();
    return settings;
  }
  function cleanText(value, fallback) {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }
  // ----- shared agency regions: flexible, owner-managed array -----
  function isRegionUrl(value) {
    if (typeof value !== "string") return false;
    var s = value.trim();
    if (!s) return false;
    try { var u = new URL(s); return u.protocol === "http:" || u.protocol === "https:"; }
    catch (e) { return false; }
  }
  function regionSlug(value, index) {
    var base = String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return base || ("region-" + (index + 1));
  }
  function defaultRegions() {
    return REGION_KEYS.map(function (key) {
      return { id: key, label: REGION_LABELS[key], url: REGION_DEFAULTS[key], enabled: true };
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
      var label = typeof item.label === "string" ? item.label : "";
      var url = typeof item.url === "string" ? item.url : "";
      var enabled = item.enabled === true;
      var slug = regionSlug(item.id || label, i);
      var id = slug, n = 2;
      while (used[id]) { id = slug + "-" + n; n += 1; }
      used[id] = true;
      out.push({ id: id, label: label, url: url, enabled: enabled });
    }
    return out;
  }
  function regionStatusFor(region) {
    if (!region || region.enabled !== true) return { cls: "disabled", text: "Disabled" };
    var url = (region.url || "").trim();
    if (!url) return { cls: "missing", text: "Missing URL" };
    if (!isRegionUrl(url)) return { cls: "invalid", text: "Invalid URL" };
    return { cls: "active", text: "Active" };
  }
  function normalize(raw) {
    var settings = defaults();
    if (!raw || typeof raw !== "object") return settings;
    ["mustafa", "ahmed", "hala"].forEach(function (profile) {
      var incoming = (raw.profiles || {})[profile] || {};
      settings.profiles[profile].title = cleanText(incoming.title, settings.profiles[profile].title);
      settings.profiles[profile].subtitle = cleanText(incoming.subtitle, settings.profiles[profile].subtitle);
      settings.profiles[profile].tagline = cleanText(incoming.tagline, settings.profiles[profile].tagline);
      settings.profiles[profile].profileImage = cleanText(incoming.profileImage, settings.profiles[profile].profileImage);
      var links = incoming.links || {};
      LINK_KEYS.forEach(function (key) {
        var link = links[key];
        if (link && typeof link === "object") {
          settings.profiles[profile].links[key] = {
            enabled: link.enabled === true,
            url: typeof link.url === "string" ? link.url : "",
            label: cleanText(link.label, LINK_LABELS[key])
          };
        }
      });
    });
    settings.sharedRegions = normalizeRegions(raw.sharedRegions);
    return settings;
  }

  function api(path, opts) {
    opts = Object.assign({}, opts || {});
    var timeoutMs = Number(opts.timeoutMs) || 0;
    var timeoutId = null;
    if (Object.prototype.hasOwnProperty.call(opts, "timeoutMs")) delete opts.timeoutMs;
    if (timeoutMs > 0 && typeof AbortController === "function" && !opts.signal) {
      var controller = new AbortController();
      opts.signal = controller.signal;
      timeoutId = setTimeout(function () { controller.abort(); }, timeoutMs);
    }
    opts.credentials = "same-origin";
    opts.headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
    return fetch(adminApiPath(path), opts).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        return { status: res.status, body: body };
      });
    }).finally(function () {
      if (timeoutId) clearTimeout(timeoutId);
    });
  }
  function isAbortError(error) {
    return !!error && (error.name === "AbortError" || /abort/i.test(String(error.message || error)));
  }

  function showLogin(message, cls) {
    setView("login");
    setLoginBusy(false);
    var msg = $("login-msg");
    msg.textContent = message || "";
    msg.className = "form-msg" + (cls ? " " + cls : "");
    updateDebug({
      uiState: cls === "error" ? "error" : "login",
      lastVisibleError: cls === "error" ? (message || "") : debugState.lastVisibleError
    });
  }
  function setLoginMessage(message, cls) {
    var msg = $("login-msg");
    if (!msg) return;
    msg.textContent = message || "";
    msg.className = "form-msg" + (cls ? " " + cls : "");
    updateDebug({
      uiState: cls === "error" ? "error" : (message ? "loading" : debugState.uiState),
      lastVisibleError: cls === "error" ? (message || "") : debugState.lastVisibleError
    });
  }
  function showEditor() {
    setLoginBusy(false);
    setLoginMessage("");
    setView("editor");
    renderEditor();
    if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
      try { window.scrollTo(0, 0); } catch (e) { /* non-fatal */ }
    }
    updateDebug({ uiState: "editor", lastVisibleError: "" });
  }

  function renderHeader() {
    var chip = $("user-chip");
    clear(chip);
    if (state.user) {
      chip.appendChild(el("span", null, "Signed in as " + state.user.displayName + (state.user.role === "owner" ? " owner" : "")));
      if (state.user.role !== "owner") chip.appendChild(el("span", "role", "Editor"));
    }
    var owner = state.user && state.user.role === "owner";
    show($("export-btn"), owner && !state.routeProfile);
    show($("import-btn"), owner && !state.routeProfile);
    show($("owner-control-link"), owner && !!state.routeProfile);
    show($("regions-title"), state.perms.regions);
    show($("regions-editor"), state.perms.regions);
  }

  function renderTabs() {
    var nav = $("profile-tabs");
    clear(nav);
    var allowed = state.perms.profiles;
    if (allowed.length <= 1) {
      nav.appendChild(el("span", "tab active", "Editing: " + (NAMES[allowed[0]] || "")));
      return;
    }
    allowed.forEach(function (profile) {
      var button = el("button", "tab" + (profile === state.profile ? " active" : ""), NAMES[profile]);
      button.type = "button";
      button.setAttribute("data-profile", profile);
      button.addEventListener("click", function () { state.profile = profile; renderEditor(); });
      nav.appendChild(button);
    });
  }

  function fieldRow(name, label, control) {
    var row = el("label", "row field-row");
    row.setAttribute("data-field", name);
    var main = el("div", "row-main");
    main.appendChild(el("span", "row-label", label));
    row.appendChild(main);
    var controls = el("div", "row-controls profile-controls");
    controls.appendChild(control);
    row.appendChild(controls);
    return row;
  }

  function renderProfileFields() {
    var box = $("profile-editor");
    clear(box);
    var profile = state.settings.profiles[state.profile];

    var title = document.createElement("input");
    title.type = "text";
    title.className = "url";
    title.maxLength = 80;
    title.value = profile.title || "";
    title.addEventListener("input", function () { profile.title = title.value; });
    box.appendChild(fieldRow("title", "Profile title", title));

    var subtitle = document.createElement("input");
    subtitle.type = "text";
    subtitle.className = "url";
    subtitle.maxLength = 120;
    subtitle.value = profile.subtitle || "";
    subtitle.addEventListener("input", function () { profile.subtitle = subtitle.value; });
    box.appendChild(fieldRow("subtitle", "Subtitle", subtitle));

    var tagline = document.createElement("textarea");
    tagline.className = "url textarea";
    tagline.maxLength = 320;
    tagline.rows = 3;
    tagline.value = profile.tagline || "";
    tagline.addEventListener("input", function () { profile.tagline = tagline.value; });
    box.appendChild(fieldRow("tagline", "Tagline", tagline));

    var image = document.createElement("input");
    image.type = "url";
    image.className = "url";
    image.placeholder = "https://… image URL or /assets/page-name.png";
    image.value = profile.profileImage || "";
    image.addEventListener("input", function () { profile.profileImage = image.value; });
    box.appendChild(fieldRow("profileImage", "Profile image URL", image));

    var hint = el("p", "field-hint", "Profile image editing uses the URL fallback: paste an HTTPS PNG/JPG/WebP image URL, or use an existing /assets/ image path.");
    box.appendChild(hint);
  }

  function buildRow(scope, key, label, link) {
    var row = el("div", "row");
    row.setAttribute("data-row", scope + ":" + key);
    var main = el("div", "row-main");
    main.appendChild(el("span", "row-label", label));
    var st = statusFor(link);
    var badge = el("span", "status " + st.cls, st.text);
    main.appendChild(badge);
    row.appendChild(main);

    var controls = el("div", "row-controls");
    var switchLabel = el("label", "switch");
    var toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.className = "toggle";
    toggle.checked = link.enabled === true;
    toggle.setAttribute("aria-label", "Enable " + label);
    switchLabel.appendChild(toggle);
    switchLabel.appendChild(el("span", "slider"));

    var url = document.createElement("input");
    url.type = "url";
    url.className = "url";
    url.placeholder = "Paste link (https://…)";
    url.value = link.url || "";

    var labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.className = "label";
    labelInput.placeholder = "Button name";
    labelInput.value = link.label || label;

    controls.appendChild(switchLabel);
    controls.appendChild(url);
    controls.appendChild(labelInput);
    row.appendChild(controls);

    function sync() {
      link.enabled = toggle.checked;
      link.url = url.value;
      link.label = labelInput.value;
      var next = statusFor(link);
      badge.className = "status " + next.cls;
      badge.textContent = next.text;
      row.classList.toggle("invalid", next.cls === "missing" || next.cls === "invalid");
    }
    toggle.addEventListener("change", sync);
    url.addEventListener("input", sync);
    labelInput.addEventListener("input", sync);
    return row;
  }

  function renderPreviews() {
    var bar = $("preview-bar-links");
    clear(bar);
    state.perms.profiles.forEach(function (profile) {
      bar.appendChild(el("span", null, " "));
      var link = el("a", "preview-link", NAMES[profile]);
      link.href = "/" + SLUGS[profile] + "/";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("data-preview", profile);
      bar.appendChild(link);
    });
  }

  function renderEditor() {
    if (!state.settings) state.settings = defaults();
    if (state.perms.profiles.indexOf(state.profile) < 0) state.profile = state.perms.profiles[0] || "mustafa";
    renderHeader();
    $("editor-lead").textContent = state.routeProfile
      ? "Manage " + (NAMES[state.profile] || "this profile") + " profile content and links" + (state.perms.regions ? ", plus shared agency regions." : ".")
      : "Owner control room: choose a page, then manage its profile content, links, and shared agency regions.";
    renderTabs();
    $("profile-title").textContent = "Profile content — " + (NAMES[state.profile] || "");
    renderProfileFields();
    $("links-title").textContent = "Links — " + (NAMES[state.profile] || "");
    var links = $("links-editor");
    clear(links);
    LINK_KEYS.forEach(function (key) {
      links.appendChild(buildRow(state.profile, key, LINK_LABELS[key], state.settings.profiles[state.profile].links[key]));
    });
    if (state.perms.regions) renderRegions();
    renderPreviews();
  }

  /* ----- agency regions manager (owner only) ----- */
  function focusRegionName(index) {
    var box = $("regions-editor");
    if (!box || !box.querySelectorAll) return;
    var rows = box.querySelectorAll("[data-region-row]");
    var row = rows[index];
    var input = row && row.querySelector ? row.querySelector(".region-name") : null;
    if (input && input.focus) input.focus();
  }
  function buildRegionRow(region, index, total) {
    var row = el("div", "row region-row");
    row.setAttribute("data-region-row", region.id || ("region-" + index));

    var main = el("div", "row-main");
    var name = document.createElement("input");
    name.type = "text";
    name.className = "region-name";
    name.maxLength = 40;
    name.placeholder = "Region name (e.g. MENA, USA, GCC)";
    name.value = region.label || "";
    name.setAttribute("aria-label", "Region name");
    main.appendChild(name);

    var st = regionStatusFor(region);
    var badge = el("span", "status " + st.cls, st.text);
    main.appendChild(badge);

    var tools = el("div", "region-tools");
    var up = el("button", "icon-btn", "▲"); up.type = "button"; up.title = "Move up"; up.setAttribute("aria-label", "Move region up"); up.disabled = index === 0;
    var down = el("button", "icon-btn", "▼"); down.type = "button"; down.title = "Move down"; down.setAttribute("aria-label", "Move region down"); down.disabled = index === total - 1;
    var del = el("button", "icon-btn danger", "✕"); del.type = "button"; del.title = "Delete region"; del.setAttribute("aria-label", "Delete region");
    tools.appendChild(up); tools.appendChild(down); tools.appendChild(del);
    main.appendChild(tools);
    row.appendChild(main);

    var controls = el("div", "row-controls");
    var switchLabel = el("label", "switch");
    var toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.className = "toggle";
    toggle.checked = region.enabled === true;
    toggle.setAttribute("aria-label", "Enable region");
    switchLabel.appendChild(toggle);
    switchLabel.appendChild(el("span", "slider"));

    var url = document.createElement("input");
    url.type = "url";
    url.className = "url";
    url.placeholder = "https://… region link";
    url.value = region.url || "";

    controls.appendChild(switchLabel);
    controls.appendChild(url);
    row.appendChild(controls);

    function sync() {
      region.label = name.value;
      region.url = url.value;
      region.enabled = toggle.checked;
      var next = regionStatusFor(region);
      badge.className = "status " + next.cls;
      badge.textContent = next.text;
      row.classList.toggle("invalid", next.cls === "missing" || next.cls === "invalid");
    }
    name.addEventListener("input", sync);
    url.addEventListener("input", sync);
    toggle.addEventListener("change", sync);
    up.addEventListener("click", function () { moveRegion(index, -1); });
    down.addEventListener("click", function () { moveRegion(index, 1); });
    del.addEventListener("click", function () { deleteRegion(index); });
    return row;
  }
  function renderRegions() {
    var box = $("regions-editor");
    if (!box) return;
    clear(box);
    if (!Array.isArray(state.settings.sharedRegions)) state.settings.sharedRegions = normalizeRegions(state.settings.sharedRegions);
    var list = state.settings.sharedRegions;
    list.forEach(function (region, index) { box.appendChild(buildRegionRow(region, index, list.length)); });
    var addWrap = el("div", "region-add");
    var add = el("button", "btn btn-ghost", "+ Add region");
    add.type = "button";
    add.setAttribute("data-add-region", "true");
    add.addEventListener("click", addRegion);
    addWrap.appendChild(add);
    box.appendChild(addWrap);
  }
  function addRegion() {
    if (!Array.isArray(state.settings.sharedRegions)) state.settings.sharedRegions = normalizeRegions(state.settings.sharedRegions);
    state.settings.sharedRegions.push({ id: "", label: "", url: "", enabled: false });
    renderRegions();
    focusRegionName(state.settings.sharedRegions.length - 1);
  }
  function deleteRegion(index) {
    if (!Array.isArray(state.settings.sharedRegions)) return;
    state.settings.sharedRegions.splice(index, 1);
    renderRegions();
  }
  function moveRegion(index, delta) {
    var list = state.settings.sharedRegions;
    if (!Array.isArray(list)) return;
    var target = index + delta;
    if (target < 0 || target >= list.length) return;
    var tmp = list[index]; list[index] = list[target]; list[target] = tmp;
    renderRegions();
  }

  function validateAll() {
    var problems = [];
    state.perms.profiles.forEach(function (profile) {
      var p = state.settings.profiles[profile];
      if (!cleanText(p.title, "")) problems.push(NAMES[profile] + " · title");
      if (!cleanText(p.subtitle, "")) problems.push(NAMES[profile] + " · subtitle");
      if (!cleanText(p.tagline, "")) problems.push(NAMES[profile] + " · tagline");
      if (!isImageUrl(p.profileImage || "")) problems.push(NAMES[profile] + " · profile image");
      LINK_KEYS.forEach(function (key) {
        var link = p.links[key];
        if (link.enabled && !isNavigableUrl((link.url || "").trim())) problems.push(NAMES[profile] + " · " + LINK_LABELS[key]);
      });
    });
    if (state.perms.regions && Array.isArray(state.settings.sharedRegions)) {
      state.settings.sharedRegions.forEach(function (region) {
        if (region.enabled && !isRegionUrl((region.url || "").trim())) {
          problems.push("Region · " + (cleanText(region.label, "") || "(unnamed)"));
        }
      });
    }
    return problems;
  }
  function buildSavePayload() {
    var out = { profiles: {} };
    state.perms.profiles.forEach(function (profile) {
      out.profiles[profile] = state.settings.profiles[profile];
    });
    if (state.perms.regions) out.sharedRegions = state.settings.sharedRegions;
    return out;
  }
  function onSave() {
    var problems = validateAll();
    if (problems.length) {
      toast("Fix these first: " + problems.slice(0, 3).join(", ") + (problems.length > 3 ? "…" : ""), "error");
      renderEditor();
      return;
    }
    api("/settings", { method: "POST", body: JSON.stringify({ settings: buildSavePayload() }) }).then(function (res) {
      if (res.status === 200) toast("Saved to GitHub. Public pages will update after deployment.", "ok");
      else if (res.status === 401) { toast("Your session ended. Please sign in again.", "error"); showLogin("Please sign in again."); }
      else if (res.body && res.body.error === "github_not_configured") toast("GitHub saving is not configured.", "error");
      else if (res.body && res.body.message) toast(res.body.message, "error");
      else toast("Could not save. Please try again.", "error");
    }).catch(function () { toast("Network problem. Please try again.", "error"); });
  }
  function onReset() {
    loadSettings().then(function () { renderEditor(); toast("Changes discarded.", "info"); });
  }
  function onExport() {
    var blob = new Blob([JSON.stringify(buildSavePayload(), null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = el("a");
    a.href = url;
    a.download = "alwafer-link-settings.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast("Backup downloaded.", "ok");
  }
  function onImportFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var incoming = normalize(JSON.parse(reader.result));
        state.perms.profiles.forEach(function (profile) { state.settings.profiles[profile] = incoming.profiles[profile]; });
        if (state.perms.regions) state.settings.sharedRegions = incoming.sharedRegions;
        renderEditor();
        toast("Backup loaded. Review, then Save.", "ok");
      } catch (e) {
        toast("That file is not a valid backup.", "error");
      }
    };
    reader.onerror = function () { toast("Could not read that file.", "error"); };
    reader.readAsText(file);
  }

  function applyUser(user) {
    state.user = user;
    state.serverPerms = { profiles: (user.allowedProfiles || []).slice(), regions: !!user.canEditRegions };
    var wanted = state.routeProfile;
    if (user.role !== "owner") {
      state.profile = user.profile;
      state.perms = { profiles: [user.profile], regions: false };
      if (wanted && wanted !== user.profile && history && history.replaceState) {
        state.routeProfile = user.profile;
        history.replaceState(null, "", adminPath(user.profile));
      }
    } else if (wanted) {
      state.profile = wanted;
      state.perms = { profiles: [wanted], regions: wanted === "mustafa" };
    } else {
      state.perms = { profiles: state.serverPerms.profiles.slice(), regions: state.serverPerms.regions };
      state.profile = state.perms.profiles[0] || "mustafa";
    }
  }
  function loadSettings(timeoutMs) {
    return api("/settings", { method: "GET", timeoutMs: timeoutMs || 0 }).then(function (res) {
      if (res.status === 200 && res.body) {
        if (res.body.user) applyUser(res.body.user);
        if (res.body.perms) state.serverPerms = { profiles: res.body.perms.profiles.slice(), regions: !!res.body.perms.regions };
        updateDebug({
          authenticatedUserKey: userKey(res.body.user || state.user),
          canSave: String(!!res.body.canSave)
        });
        state.settings = normalize(res.body.settings);
        return true;
      }
      return false;
    });
  }
  function recordMe(res) {
    var body = res && res.body ? res.body : {};
    var authenticated = !!body.authenticated;
    updateDebug({
      meStatus: res ? String(res.status) : "not checked",
      sessionCookie: sessionCookieState(authenticated),
      authenticatedUserKey: authenticated ? userKey(body.user) : "none",
      canSave: Object.prototype.hasOwnProperty.call(body, "canSave") ? String(!!body.canSave) : debugState.canSave
    });
    return res;
  }
  function readMe(timeoutMs) {
    return api("/me", { method: "GET", timeoutMs: timeoutMs || 0 }).then(recordMe);
  }
  function checkSession() {
    return readMe().then(function (res) {
      if (res.status === 200 && res.body && res.body.authenticated && res.body.user) {
        return loadSettings();
      }
      return false;
    }).catch(function () { return false; });
  }
  function doLogin(account, password) {
    setLoginBusy(true);
    setView("login");
    updateDebug({
      uiState: "loading",
      loginRequestUrl: adminApiPath("/login"),
      lastLoginStatus: "pending",
      selectedAccount: account,
      lastVisibleError: ""
    });
    setLoginMessage("Signing in…", "info");
    return api("/login", { method: "POST", body: JSON.stringify({ account: account, password: password }), timeoutMs: LOGIN_TIMEOUT_MS }).then(function (res) {
      updateDebug({ lastLoginStatus: String(res.status) });
      if (res.status === 200 && res.body.user) {
        return readMe(LOGIN_TIMEOUT_MS).then(function (me) {
          if (!(me.status === 200 && me.body && me.body.authenticated && me.body.user)) {
            showLogin("Login session was not accepted. Please try again.", "error");
            return false;
          }
          applyUser(me.body.user);
          return loadSettings(LOGIN_TIMEOUT_MS).then(function (ok) {
            if (ok) { showEditor(); return true; }
            showLogin("Login failed. Please try again.", "error");
            return false;
          });
        }).catch(function () {
          showLogin("Login failed. Please try again.", "error");
          return false;
        });
      }
      if (res.status === 503) { showLogin("Admin sign-in is not configured.", "error"); return false; }
      showLogin("Incorrect account or password.", "error");
      return false;
    }).catch(function (error) {
      showLogin(isAbortError(error) ? "Login timed out. Please try again." : "Login failed. Please try again.", "error");
      return false;
    }).finally(function () {
      setLoginBusy(false);
    });
  }
  function doLogout() {
    api("/logout", { method: "POST" }).then(function () {
      state.user = null;
      state.settings = null;
      state.serverPerms = { profiles: [], regions: false };
      state.perms = { profiles: [], regions: false };
      clear($("user-chip"));
      clear($("profile-tabs"));
      clear($("profile-editor"));
      clear($("links-editor"));
      clear($("regions-editor"));
      clear($("preview-bar-links"));
      $("login-password").value = "";
      showLogin("Signed out. This page is locked.", "ok");
    });
  }

  function init() {
    state.routeProfile = routeProfile() || null;
    updateDebug({ uiState: "loading", loginRequestUrl: adminApiPath("/login") });
    if (state.routeProfile && location.search && !DEBUG_ADMIN && history && history.replaceState) history.replaceState(null, "", adminPath(state.routeProfile));
    if (state.routeProfile && $("login-account")) {
      $("login-account").value = state.routeProfile;
      $("login-account").disabled = true;
      updateDebug({});
    }
    var loginForm = $("login-form");
    if (loginForm) loginForm.addEventListener("submit", function (event) {
      event.preventDefault();
      doLogin($("login-account").value, $("login-password").value);
    });
    $("logout-btn").addEventListener("click", doLogout);
    $("save-btn").addEventListener("click", onSave);
    $("reset-btn").addEventListener("click", onReset);
    $("export-btn").addEventListener("click", onExport);
    $("import-btn").addEventListener("click", function () { $("import-file").click(); });
    $("import-file").addEventListener("change", function () {
      if (this.files && this.files[0]) onImportFile(this.files[0]);
      this.value = "";
    });
    checkSession().then(function (ok) { if (ok) showEditor(); else showLogin(""); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
