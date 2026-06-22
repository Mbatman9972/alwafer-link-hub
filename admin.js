/* =====================================================================
 * admin.js — ALWAFER Link Manager frontend (role-based)
 * Owner (ALWAFER) edits all profiles + regions. Ahmed/Hala edit only
 * their own profile's links. Permissions are ALSO enforced server-side.
 * ===================================================================== */
(function () {
  "use strict";

  var API = "/api/admin";
  var NAMES = { mustafa: "ALWAFER", ahmed: "Team Ahmed Ramadan", hala: "Hala Al-Saghir" };
  var LINK_KEYS = ["apply", "youtube", "tiktok", "telegram", "instagram", "whatsapp", "website"];
  var LINK_LABELS = { apply: "Apply to Join the Agency", youtube: "YouTube", tiktok: "TikTok",
    telegram: "Telegram", instagram: "Instagram", whatsapp: "WhatsApp", website: "Website" };
  var REGION_KEYS = ["mena", "uk", "fr", "de", "tr", "cca"];
  var REGION_LABELS = { mena: "MENA", uk: "UK", fr: "FR", de: "DE", tr: "TR", cca: "CCA" };
  var REGION_DEFAULTS = { mena: "https://www.tiktok.com/t/ZMAN6Bu2W/", uk: "https://www.tiktok.com/t/ZSxoyPd4W/",
    fr: "https://www.tiktok.com/t/ZSxoAQrsm/", de: "https://www.tiktok.com/t/ZSQ1b63XY/",
    tr: "https://www.tiktok.com/t/ZSxoUt6A7/", cca: "https://www.tiktok.com/t/ZSxECjfqx/" };

  var state = {
    settings: null,
    user: null,                              // {key, displayName, role, profile, allowedProfiles, canEditRegions}
    serverPerms: { profiles: [], regions: false },
    perms: { profiles: [], regions: false },
    profile: "mustafa",
    routeProfile: null
  };

  /* ----- url validation (mirrors server) ----- */
  function isAllowedUrl(u) {
    if (typeof u !== "string") return false;
    var s = u.trim(); if (s === "") return false;
    if (s.charAt(0) === "#") return true;
    var m = s.match(/^([a-zA-Z][a-zA-Z0-9+.\-]*):/); if (!m) return false;
    var sch = m[1].toLowerCase();
    if (sch === "http" || sch === "https") { try { new URL(s); return true; } catch (e) { return false; } }
    if (sch === "mailto" || sch === "tel") return s.length > sch.length + 1;
    return false;
  }
  function isNavigableUrl(u) { return isAllowedUrl(u) && u.trim().charAt(0) !== "#"; }
  function statusFor(link) {
    if (!link || link.enabled !== true) return { cls: "disabled", text: "Disabled" };
    var url = (link.url || "").trim();
    if (url === "") return { cls: "missing", text: "Missing URL" };
    if (!isNavigableUrl(url)) return { cls: "invalid", text: "Invalid URL" };
    return { cls: "active", text: "Active" };
  }

  /* ----- dom ----- */
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function clear(n) { while (n && n.firstChild) n.removeChild(n.firstChild); }
  function show(n, on) { if (n) n.classList.toggle("hidden", !on); }
  function toast(msg, type) { var b = $("toasts"); if (!b) return; var t = el("div", "toast " + (type || "info"), msg); b.appendChild(t); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3600); }

  function routeProfile() {
    try {
      var m = (location.pathname || "").match(/^\/admin\/(alwafer|ahmed|hala)\/?$/i);
      if (!m) return "";
      return m[1].toLowerCase() === "alwafer" ? "mustafa" : m[1].toLowerCase();
    } catch (e) { return ""; }
  }
  function adminPath(profile) {
    return "/admin/" + (profile === "mustafa" ? "alwafer" : profile) + "/";
  }

  /* ----- settings normalization ----- */
  function defaults() {
    var s = { version: 1, updatedAt: "", profiles: {}, sharedRegions: {} };
    ["mustafa", "ahmed", "hala"].forEach(function (p) { s.profiles[p] = { links: {} }; LINK_KEYS.forEach(function (k) { s.profiles[p].links[k] = { enabled: false, url: "", label: LINK_LABELS[k] }; }); });
    REGION_KEYS.forEach(function (r) { s.sharedRegions[r] = { enabled: true, url: REGION_DEFAULTS[r], label: REGION_LABELS[r] }; });
    return s;
  }
  function normalize(raw) {
    var s = defaults(); if (!raw || typeof raw !== "object") return s;
    ["mustafa", "ahmed", "hala"].forEach(function (p) {
      var src = ((raw.profiles || {})[p] || {}).links || {};
      LINK_KEYS.forEach(function (k) { var l = src[k]; if (l && typeof l === "object") s.profiles[p].links[k] = { enabled: l.enabled === true, url: typeof l.url === "string" ? l.url : "", label: l.label || LINK_LABELS[k] }; });
    });
    REGION_KEYS.forEach(function (r) { var l = (raw.sharedRegions || {})[r]; if (l && typeof l === "object") s.sharedRegions[r] = { enabled: l.enabled === true, url: typeof l.url === "string" ? l.url : "", label: l.label || REGION_LABELS[r] }; });
    return s;
  }

  /* ----- api ----- */
  function api(path, opts) {
    opts = opts || {}; opts.credentials = "same-origin";
    opts.headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
    return fetch(API + path, opts).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, body: j }; }); });
  }

  /* ----- views ----- */
  function showLogin(msg, cls) {
    $("login-view").hidden = false; $("editor-view").hidden = true;
    var m = $("login-msg"); m.textContent = msg || ""; m.className = "form-msg" + (cls ? " " + cls : "");
  }
  function showEditor() { $("login-view").hidden = true; $("editor-view").hidden = false; renderEditor(); }

  /* ----- editor ----- */
  function canEdit(profileKey) { return state.perms.profiles.indexOf(profileKey) > -1; }

  function renderHeader() {
    var chip = $("user-chip"); clear(chip);
    if (state.user) {
      chip.appendChild(el("span", null, "Signed in as " + state.user.displayName));
      chip.appendChild(el("span", "role", state.user.role === "owner" ? "Owner" : "Editor"));
    }
    // owner-only tools
    var owner = state.user && state.user.role === "owner";
    show($("export-btn"), owner && !state.routeProfile); show($("import-btn"), owner && !state.routeProfile);
    show($("owner-control-link"), owner && !!state.routeProfile);
    show($("regions-title"), state.perms.regions); show($("regions-editor"), state.perms.regions);
  }

  function renderTabs() {
    var nav = $("profile-tabs"); clear(nav);
    var allowed = state.perms.profiles;
    if (allowed.length <= 1) {
      nav.appendChild(el("span", "tab active", "Editing: " + (NAMES[allowed[0]] || "")));
      return;
    }
    allowed.forEach(function (p) {
      var b = el("button", "tab" + (p === state.profile ? " active" : ""), NAMES[p]);
      b.type = "button"; b.setAttribute("data-profile", p);
      b.addEventListener("click", function () { state.profile = p; renderEditor(); });
      nav.appendChild(b);
    });
  }

  function buildRow(scope, key, label, link, editable) {
    var row = el("div", "row"); row.setAttribute("data-row", scope + ":" + key);
    var main = el("div", "row-main");
    main.appendChild(el("span", "row-label", label));
    var st = statusFor(link);
    var badge = el("span", "status " + st.cls, st.text); main.appendChild(badge);
    row.appendChild(main);

    var ctrl = el("div", "row-controls");
    var sw = el("label", "switch");
    var cb = document.createElement("input"); cb.type = "checkbox"; cb.className = "toggle"; cb.checked = link.enabled === true; cb.setAttribute("aria-label", "Enable " + label);
    var url = document.createElement("input"); url.type = "url"; url.className = "url"; url.placeholder = "Paste link (https://…)"; url.value = link.url || "";
    var lbl = document.createElement("input"); lbl.type = "text"; lbl.className = "label"; lbl.placeholder = "Button name (optional)"; lbl.value = link.label || label;
    if (!editable) { cb.disabled = true; url.disabled = true; lbl.disabled = true; }
    sw.appendChild(cb); sw.appendChild(el("span", "slider"));
    ctrl.appendChild(sw); ctrl.appendChild(url); ctrl.appendChild(lbl);
    row.appendChild(ctrl);

    function sync() { link.enabled = cb.checked; link.url = url.value; link.label = lbl.value; var s = statusFor(link); badge.className = "status " + s.cls; badge.textContent = s.text; row.classList.toggle("invalid", s.cls === "missing" || s.cls === "invalid"); }
    cb.addEventListener("change", sync); url.addEventListener("input", sync); lbl.addEventListener("input", sync);
    return row;
  }

  function renderPreviews() {
    var bar = $("preview-bar-links"); if (!bar) return; clear(bar);
    state.perms.profiles.forEach(function (p) {
      bar.appendChild(el("span", null, " "));
      var a = el("a", "preview-link", NAMES[p]); a.href = "/" + (p === "mustafa" ? "alwafer" : p) + "/"; a.target = "_blank"; a.rel = "noopener noreferrer"; a.setAttribute("data-preview", p);
      bar.appendChild(a);
    });
  }

  function renderEditor() {
    if (!state.settings) state.settings = defaults();
    if (state.perms.profiles.indexOf(state.profile) < 0) state.profile = state.perms.profiles[0] || "mustafa";
    renderHeader();
    $("editor-lead").textContent = state.routeProfile
      ? "Manage " + (NAMES[state.profile] || "this profile") + " links" + (state.perms.regions ? " and shared agency regions." : ".")
      : "Owner control room: choose a page, then manage its links and shared agency regions.";
    renderTabs();
    $("links-title").textContent = (state.perms.profiles.length > 1 ? "Links — " : "Links — ") + (NAMES[state.profile] || "");
    var prof = state.settings.profiles[state.profile] || { links: {} };
    var links = $("links-editor"); clear(links);
    LINK_KEYS.forEach(function (k) { links.appendChild(buildRow(state.profile, k, LINK_LABELS[k], prof.links[k] || { enabled: false, url: "", label: LINK_LABELS[k] }, true)); });
    if (state.perms.regions) {
      var regions = $("regions-editor"); clear(regions);
      REGION_KEYS.forEach(function (r) { regions.appendChild(buildRow("region", r, REGION_LABELS[r], state.settings.sharedRegions[r], true)); });
    }
    renderPreviews();
  }

  /* ----- validation + save ----- */
  function validateAll() {
    var probs = [];
    state.perms.profiles.forEach(function (p) {
      LINK_KEYS.forEach(function (k) { var l = state.settings.profiles[p].links[k]; if (l.enabled && !isNavigableUrl((l.url || "").trim())) probs.push(NAMES[p] + " · " + LINK_LABELS[k]); });
    });
    if (state.perms.regions) REGION_KEYS.forEach(function (r) { var l = state.settings.sharedRegions[r]; if (l.enabled && !isNavigableUrl((l.url || "").trim())) probs.push("Region · " + REGION_LABELS[r]); });
    return probs;
  }
  function buildSavePayload() {
    var out = { profiles: {} };
    state.perms.profiles.forEach(function (p) { out.profiles[p] = state.settings.profiles[p]; });
    if (state.perms.regions) out.sharedRegions = state.settings.sharedRegions;
    return out;
  }
  function onSave() {
    var probs = validateAll();
    if (probs.length) { toast("Fix these first: " + probs.slice(0, 3).join(", ") + (probs.length > 3 ? "…" : ""), "error"); renderEditor(); return; }
    api("/settings", { method: "POST", body: JSON.stringify({ settings: buildSavePayload() }) }).then(function (res) {
      if (res.status === 200) toast("Saved. Your page will update shortly.", "ok");
      else if (res.status === 401) { toast("Your session ended. Please sign in again.", "error"); showLogin("Please sign in again."); }
      else if (res.body && res.body.error === "github_not_configured") toast("Saving isn’t set up yet. Ask your developer to finish setup.", "error");
      else if (res.body && res.body.message) toast(res.body.message, "error");
      else toast("Could not save. Please try again.", "error");
    }).catch(function () { toast("Network problem. Please try again.", "error"); });
  }
  function onReset() { loadSettings().then(function () { renderEditor(); toast("Changes discarded.", "info"); }); }
  function onExport() {
    var data = JSON.stringify(buildSavePayload(), null, 2);
    var blob = new Blob([data], { type: "application/json" }); var url = URL.createObjectURL(blob);
    var a = el("a"); a.href = url; a.download = "alwafer-link-settings.json"; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000); toast("Backup downloaded.", "ok");
  }
  function onImportFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var raw = JSON.parse(reader.result); var inc = normalize(raw);
        // only apply sections the current user may edit
        state.perms.profiles.forEach(function (p) { state.settings.profiles[p] = inc.profiles[p]; });
        if (state.perms.regions) state.settings.sharedRegions = inc.sharedRegions;
        renderEditor(); toast("Backup loaded. Review, then Save.", "ok");
      } catch (e) { toast("That file isn’t a valid backup.", "error"); }
    };
    reader.onerror = function () { toast("Could not read that file.", "error"); };
    reader.readAsText(file);
  }

  /* ----- auth flow ----- */
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
      // Individual owner URLs stay visually scoped. Full owner authority remains
      // available through the explicit /admin control room.
      state.profile = wanted;
      state.perms = { profiles: [wanted], regions: wanted === "mustafa" };
    } else {
      state.perms = { profiles: state.serverPerms.profiles.slice(), regions: state.serverPerms.regions };
      state.profile = state.perms.profiles[0] || "mustafa";
    }
  }
  function loadSettings() {
    return api("/settings", { method: "GET" }).then(function (res) {
      if (res.status === 200 && res.body) {
        if (res.body.user) applyUser(res.body.user);
        if (res.body.perms) state.serverPerms = { profiles: res.body.perms.profiles.slice(), regions: !!res.body.perms.regions };
        state.settings = normalize(res.body.settings);
        return true;
      }
      return false;
    });
  }
  function doLogin(account, password) {
    return api("/login", { method: "POST", body: JSON.stringify({ account: account, password: password }) }).then(function (res) {
      if (res.status === 200 && res.body.user) { applyUser(res.body.user); return loadSettings().then(function () { showEditor(); return true; }); }
      if (res.status === 503) { showLogin("Admin sign-in isn’t set up yet.", "error"); return false; }
      showLogin("Incorrect account or password.", "error"); return false;
    });
  }
  function doLogout() { api("/logout", { method: "POST" }).then(function () {
    state.user = null; state.settings = null; state.serverPerms = { profiles: [], regions: false }; state.perms = { profiles: [], regions: false };
    clear($("user-chip")); clear($("profile-tabs")); clear($("links-editor")); clear($("regions-editor")); clear($("preview-bar-links"));
    $("login-password").value = ""; showLogin("Signed out. This page is locked.", "ok");
  }); }

  /* ----- init ----- */
  function init() {
    state.routeProfile = routeProfile() || null;
    var pre = state.routeProfile; if (pre && $("login-account")) { $("login-account").value = pre; $("login-account").disabled = true; }
    var lf = $("login-form");
    if (lf) lf.addEventListener("submit", function (e) { e.preventDefault(); doLogin($("login-account").value, $("login-password").value); });
    if ($("logout-btn")) $("logout-btn").addEventListener("click", doLogout);
    if ($("save-btn")) $("save-btn").addEventListener("click", onSave);
    if ($("reset-btn")) $("reset-btn").addEventListener("click", onReset);
    if ($("export-btn")) $("export-btn").addEventListener("click", onExport);
    if ($("import-btn")) $("import-btn").addEventListener("click", function () { $("import-file").click(); });
    if ($("import-file")) $("import-file").addEventListener("change", function (e) { if (e.target.files[0]) onImportFile(e.target.files[0]); e.target.value = ""; });

    api("/me", { method: "GET" }).then(function (res) {
      if (res.body && res.body.authenticated && res.body.user) { applyUser(res.body.user); loadSettings().then(showEditor); }
      else showLogin();
    }).catch(function () { showLogin(); });
  }

  window.AdminApp = {
    init: init, isAllowedUrl: isAllowedUrl, isNavigableUrl: isNavigableUrl, statusFor: statusFor,
    normalize: normalize, defaults: defaults, renderEditor: renderEditor, validateAll: validateAll,
    buildSavePayload: buildSavePayload, applyUser: applyUser, state: state, showEditor: showEditor, showLogin: showLogin, canEdit: canEdit
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
