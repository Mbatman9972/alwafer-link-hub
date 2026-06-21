/* =====================================================================
 * admin.js — ALWAFER Link Manager frontend
 * Talks only to /api/admin/* (cookie session). No secrets in here.
 * ===================================================================== */
(function () {
  "use strict";

  var API = "/api/admin";
  var PROFILES = [
    { key: "mustafa", name: "ALWAFER" },
    { key: "ahmed",   name: "Team Ahmed Ramadan" },
    { key: "hala",    name: "Hala Al-Saghir" }
  ];
  var LINK_KEYS = ["apply", "youtube", "tiktok", "telegram", "instagram", "whatsapp", "website"];
  var LINK_LABELS = { apply: "Apply to Join the Agency", youtube: "YouTube", tiktok: "TikTok",
    telegram: "Telegram", instagram: "Instagram", whatsapp: "WhatsApp", website: "Website" };
  var REGION_KEYS = ["mena", "uk", "fr", "de", "tr", "cca"];
  var REGION_LABELS = { mena: "MENA", uk: "UK", fr: "FR", de: "DE", tr: "TR", cca: "CCA" };
  var REGION_DEFAULTS = {
    mena: "https://www.tiktok.com/t/ZMAN6Bu2W/", uk: "https://www.tiktok.com/t/ZSxoyPd4W/",
    fr: "https://www.tiktok.com/t/ZSxoAQrsm/", de: "https://www.tiktok.com/t/ZSQ1b63XY/",
    tr: "https://www.tiktok.com/t/ZSxoUt6A7/", cca: "https://www.tiktok.com/t/ZSxECjfqx/"
  };

  var state = { settings: null, profile: "mustafa" };

  /* ----- URL validation (mirrors the server) ----- */
  function isAllowedUrl(u) {
    if (typeof u !== "string") return false;
    var s = u.trim();
    if (s === "") return false;
    if (s.charAt(0) === "#") return true;
    var m = s.match(/^([a-zA-Z][a-zA-Z0-9+.\-]*):/);
    if (!m) return false;
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

  /* ----- DOM helpers ----- */
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  function toast(msg, type) {
    var box = $("toasts"); if (!box) return;
    var t = el("div", "toast " + (type || "info"), msg);
    box.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3600);
  }

  /* ----- settings normalization ----- */
  function defaults() {
    var s = { version: 1, updatedAt: "", profiles: {}, sharedRegions: {} };
    PROFILES.forEach(function (p) {
      s.profiles[p.key] = { links: {} };
      LINK_KEYS.forEach(function (k) { s.profiles[p.key].links[k] = { enabled: false, url: "", label: LINK_LABELS[k] }; });
    });
    REGION_KEYS.forEach(function (r) { s.sharedRegions[r] = { enabled: true, url: REGION_DEFAULTS[r], label: REGION_LABELS[r] }; });
    return s;
  }
  function normalize(raw) {
    var s = defaults();
    if (!raw || typeof raw !== "object") return s;
    PROFILES.forEach(function (p) {
      var src = ((raw.profiles || {})[p.key] || {}).links || {};
      LINK_KEYS.forEach(function (k) {
        var l = src[k]; if (l && typeof l === "object") {
          s.profiles[p.key].links[k] = { enabled: l.enabled === true, url: typeof l.url === "string" ? l.url : "", label: (l.label || LINK_LABELS[k]) };
        }
      });
    });
    REGION_KEYS.forEach(function (r) {
      var l = (raw.sharedRegions || {})[r]; if (l && typeof l === "object") {
        s.sharedRegions[r] = { enabled: l.enabled === true, url: typeof l.url === "string" ? l.url : "", label: (l.label || REGION_LABELS[r]) };
      }
    });
    return s;
  }

  /* ----- API ----- */
  function api(path, opts) {
    opts = opts || {};
    opts.credentials = "same-origin";
    opts.headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
    return fetch(API + path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, body: j }; });
    });
  }

  /* ----- views ----- */
  function showLogin(msg, cls) {
    $("login-view").hidden = false; $("editor-view").hidden = true;
    var m = $("login-msg"); m.textContent = msg || ""; m.className = "form-msg" + (cls ? " " + cls : "");
  }
  function showEditor() { $("login-view").hidden = true; $("editor-view").hidden = false; renderEditor(); }

  /* ----- editor rendering ----- */
  function renderTabs() {
    var nav = $("profile-tabs"); clear(nav);
    PROFILES.forEach(function (p) {
      var b = el("button", "tab" + (p.key === state.profile ? " active" : ""), p.name);
      b.type = "button"; b.setAttribute("data-profile", p.key);
      b.addEventListener("click", function () { state.profile = p.key; renderEditor(); });
      nav.appendChild(b);
    });
  }

  function buildRow(scope, key, label, link) {
    var row = el("div", "row"); row.setAttribute("data-row", scope + ":" + key);
    var main = el("div", "row-main");
    main.appendChild(el("span", "row-label", label));
    var st = statusFor(link);
    var badge = el("span", "status " + st.cls, st.text); badge.setAttribute("data-status", "");
    main.appendChild(badge);
    row.appendChild(main);

    var ctrl = el("div", "row-controls");
    // toggle
    var sw = el("label", "switch");
    var cb = document.createElement("input"); cb.type = "checkbox"; cb.className = "toggle"; cb.checked = link.enabled === true;
    cb.setAttribute("aria-label", "Enable " + label);
    sw.appendChild(cb); sw.appendChild(el("span", "slider"));
    ctrl.appendChild(sw);
    // url
    var url = document.createElement("input"); url.type = "url"; url.className = "url";
    url.placeholder = "Paste link (https://…)"; url.value = link.url || "";
    ctrl.appendChild(url);
    // label
    var lbl = document.createElement("input"); lbl.type = "text"; lbl.className = "label";
    lbl.placeholder = "Button name (optional)"; lbl.value = link.label || label;
    ctrl.appendChild(lbl);
    row.appendChild(ctrl);

    function sync() {
      link.enabled = cb.checked; link.url = url.value; link.label = lbl.value;
      var s = statusFor(link); badge.className = "status " + s.cls; badge.textContent = s.text;
      row.classList.toggle("invalid", s.cls === "missing" || s.cls === "invalid");
    }
    cb.addEventListener("change", sync);
    url.addEventListener("input", sync);
    lbl.addEventListener("input", sync);
    return row;
  }

  function renderEditor() {
    if (!state.settings) state.settings = defaults();
    renderTabs();
    var prof = state.settings.profiles[state.profile];
    var links = $("links-editor"); clear(links);
    LINK_KEYS.forEach(function (k) { links.appendChild(buildRow(state.profile, k, LINK_LABELS[k], prof.links[k])); });
    var regions = $("regions-editor"); clear(regions);
    REGION_KEYS.forEach(function (r) { regions.appendChild(buildRow("region", r, REGION_LABELS[r], state.settings.sharedRegions[r])); });
  }

  /* ----- validation across everything ----- */
  function validateAll() {
    var problems = [];
    PROFILES.forEach(function (p) {
      LINK_KEYS.forEach(function (k) {
        var l = state.settings.profiles[p.key].links[k];
        if (l.enabled && !isNavigableUrl((l.url || "").trim())) problems.push(p.name + " · " + LINK_LABELS[k]);
      });
    });
    REGION_KEYS.forEach(function (r) {
      var l = state.settings.sharedRegions[r];
      if (l.enabled && !isNavigableUrl((l.url || "").trim())) problems.push("Region · " + REGION_LABELS[r]);
    });
    return problems;
  }

  /* ----- actions ----- */
  function loadSettings() {
    return api("/settings", { method: "GET" }).then(function (res) {
      if (res.status === 200 && res.body.settings) { state.settings = normalize(res.body.settings); return true; }
      return false;
    }).then(function (ok) {
      if (ok) return true;
      // fallback: public file (so the editor still shows current data)
      return fetch("/data/link-settings.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { state.settings = normalize(j); return true; })
        .catch(function () { state.settings = defaults(); return true; });
    });
  }

  function onSave() {
    var problems = validateAll();
    if (problems.length) { toast("Fix these first: " + problems.slice(0, 3).join(", ") + (problems.length > 3 ? "…" : ""), "error"); renderEditor(); return; }
    api("/settings", { method: "POST", body: JSON.stringify({ settings: state.settings }) }).then(function (res) {
      if (res.status === 200) { toast("Saved. Your pages will update shortly.", "ok"); }
      else if (res.status === 401) { toast("Your session ended. Please sign in again.", "error"); showLogin("Please sign in again."); }
      else if (res.body && res.body.error === "github_not_configured") { toast("Saving isn’t set up yet. Ask your developer to finish setup.", "error"); }
      else if (res.body && res.body.message) { toast(res.body.message, "error"); }
      else { toast("Could not save. Please try again.", "error"); }
    }).catch(function () { toast("Network problem. Please try again.", "error"); });
  }

  function onReset() { loadSettings().then(function () { renderEditor(); toast("Changes discarded.", "info"); }); }

  function onExport() {
    state.settings.updatedAt = state.settings.updatedAt || "";
    var data = JSON.stringify(state.settings, null, 2);
    var blob = new Blob([data], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = el("a"); a.href = url; a.download = "alwafer-link-settings.json";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast("Backup downloaded.", "ok");
  }

  function onImportFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try { var raw = JSON.parse(reader.result); state.settings = normalize(raw); renderEditor(); toast("Backup loaded. Review, then Save.", "ok"); }
      catch (e) { toast("That file isn’t a valid backup.", "error"); }
    };
    reader.onerror = function () { toast("Could not read that file.", "error"); };
    reader.readAsText(file);
  }

  function doLogin(password) {
    return api("/login", { method: "POST", body: JSON.stringify({ password: password }) }).then(function (res) {
      if (res.status === 200) { return loadSettings().then(function () { showEditor(); return true; }); }
      if (res.status === 503) { showLogin("Admin sign-in isn’t set up yet.", "error"); return false; }
      showLogin("Incorrect password.", "error"); return false;
    });
  }

  function doLogout() {
    api("/logout", { method: "POST" }).then(function () { showLogin("Signed out."); });
  }

  /* ----- init ----- */
  function init() {
    var lf = $("login-form");
    if (lf) lf.addEventListener("submit", function (e) { e.preventDefault(); doLogin($("login-password").value); });
    if ($("logout-btn")) $("logout-btn").addEventListener("click", doLogout);
    if ($("save-btn")) $("save-btn").addEventListener("click", onSave);
    if ($("reset-btn")) $("reset-btn").addEventListener("click", onReset);
    if ($("export-btn")) $("export-btn").addEventListener("click", onExport);
    if ($("import-btn")) $("import-btn").addEventListener("click", function () { $("import-file").click(); });
    if ($("import-file")) $("import-file").addEventListener("change", function (e) { if (e.target.files[0]) onImportFile(e.target.files[0]); e.target.value = ""; });

    api("/me", { method: "GET" }).then(function (res) {
      if (res.body && res.body.authenticated) { loadSettings().then(showEditor); }
      else { showLogin(); }
    }).catch(function () { showLogin(); });
  }

  // expose for tests
  window.AdminApp = {
    init: init, isAllowedUrl: isAllowedUrl, isNavigableUrl: isNavigableUrl, statusFor: statusFor,
    normalize: normalize, defaults: defaults, renderEditor: renderEditor, validateAll: validateAll,
    state: state, showEditor: showEditor, showLogin: showLogin, loadSettings: loadSettings, onExport: onExport
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
