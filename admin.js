/* =====================================================================
 * admin.js — ALWAFER Link Manager frontend
 * ===================================================================== */
(function () {
  "use strict";

  var API = "/api/admin";
  var LOGIN_TIMEOUT_MS = 8000;
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

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = String(text);
    return node;
  }
  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); }
  function show(node, on) { if (node) node.classList.toggle("hidden", !on); }
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

  function defaults() {
    var settings = { version: 1, updatedAt: "", profiles: {}, sharedRegions: {} };
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
    REGION_KEYS.forEach(function (key) {
      settings.sharedRegions[key] = { enabled: true, url: REGION_DEFAULTS[key], label: REGION_LABELS[key] };
    });
    return settings;
  }
  function cleanText(value, fallback) {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
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
    REGION_KEYS.forEach(function (key) {
      var link = (raw.sharedRegions || {})[key];
      if (link && typeof link === "object") {
        settings.sharedRegions[key] = {
          enabled: link.enabled === true,
          url: typeof link.url === "string" ? link.url : "",
          label: cleanText(link.label, REGION_LABELS[key])
        };
      }
    });
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
    $("login-view").hidden = false;
    $("editor-view").hidden = true;
    setLoginBusy(false);
    var msg = $("login-msg");
    msg.textContent = message || "";
    msg.className = "form-msg" + (cls ? " " + cls : "");
  }
  function setLoginMessage(message, cls) {
    var msg = $("login-msg");
    if (!msg) return;
    msg.textContent = message || "";
    msg.className = "form-msg" + (cls ? " " + cls : "");
  }
  function showEditor() {
    setLoginBusy(false);
    setLoginMessage("");
    $("login-view").hidden = true;
    $("editor-view").hidden = false;
    renderEditor();
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
    if (state.perms.regions) {
      var regions = $("regions-editor");
      clear(regions);
      REGION_KEYS.forEach(function (key) {
        regions.appendChild(buildRow("region", key, REGION_LABELS[key], state.settings.sharedRegions[key]));
      });
    }
    renderPreviews();
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
    if (state.perms.regions) {
      REGION_KEYS.forEach(function (key) {
        var link = state.settings.sharedRegions[key];
        if (link.enabled && !isNavigableUrl((link.url || "").trim())) problems.push("Region · " + REGION_LABELS[key]);
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
        state.settings = normalize(res.body.settings);
        return true;
      }
      return false;
    });
  }
  function checkSession() {
    return api("/me", { method: "GET" }).then(function (res) {
      if (res.status === 200 && res.body && res.body.authenticated && res.body.user) {
        return loadSettings();
      }
      return false;
    }).catch(function () { return false; });
  }
  function doLogin(account, password) {
    setLoginBusy(true);
    $("login-view").hidden = false;
    $("editor-view").hidden = true;
    setLoginMessage("Signing in…", "info");
    return api("/login", { method: "POST", body: JSON.stringify({ account: account, password: password }), timeoutMs: LOGIN_TIMEOUT_MS }).then(function (res) {
      if (res.status === 200 && res.body.user) {
        applyUser(res.body.user);
        return loadSettings(LOGIN_TIMEOUT_MS).then(function (ok) {
          if (ok) { showEditor(); return true; }
          showLogin("Login failed. Please try again.", "error");
          return false;
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
    if (state.routeProfile && location.search && history && history.replaceState) history.replaceState(null, "", adminPath(state.routeProfile));
    if (state.routeProfile && $("login-account")) {
      $("login-account").value = state.routeProfile;
      $("login-account").disabled = true;
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
