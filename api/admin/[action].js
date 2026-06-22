/* =====================================================================
 * api/admin/[action].js — ALWAFER Link Hub admin API (role-based)
 * Routes: /api/admin/login | /api/admin/logout | /api/admin/me
 *         /api/admin/settings  (GET + POST)
 *
 * Roles:
 *   owner   (mustafa) -> edit all profiles + shared region links
 *   profile (ahmed/hala) -> edit ONLY their own profile's links
 * Permissions are enforced SERVER-SIDE on POST (frontend hiding is UX only).
 *
 * No npm deps (Node built-ins + global fetch). Secrets stay in env.
 * Writes ONLY data/link-settings.json on GitHub main.
 * ===================================================================== */
"use strict";
const crypto = require("crypto");

const OWNER  = process.env.GITHUB_OWNER  || "Mbatman9972";
const REPO   = process.env.GITHUB_REPO   || "alwafer-link-hub";
const BRANCH = process.env.GITHUB_BRANCH || "main";
const FILE_PATH = "data/link-settings.json";
const COOKIE_NAME = "alwafer_admin";
const SESSION_TTL = 60 * 60 * 8;

const PROFILE_KEYS = ["mustafa", "ahmed", "hala"];
const LINK_KEYS = ["apply", "youtube", "tiktok", "telegram", "instagram", "whatsapp", "website"];
const REGION_KEYS = ["mena", "uk", "fr", "de", "tr", "cca"];
const LINK_LABELS = { apply: "Apply to Join the Agency", youtube: "YouTube", tiktok: "TikTok",
  telegram: "Telegram", instagram: "Instagram", whatsapp: "WhatsApp", website: "Website" };
const REGION_LABELS = { mena: "MENA", uk: "UK", fr: "FR", de: "DE", tr: "TR", cca: "CCA" };
const DEFAULT_NAMES = { mustafa: "ALWAFER", ahmed: "Team Ahmed Ramadan", hala: "Hala Al-Saghir" };
const REGION_DEFAULT_URLS = { mena: "https://www.tiktok.com/t/ZMAN6Bu2W/", uk: "https://www.tiktok.com/t/ZSxoyPd4W/",
  fr: "https://www.tiktok.com/t/ZSxoAQrsm/", de: "https://www.tiktok.com/t/ZSQ1b63XY/",
  tr: "https://www.tiktok.com/t/ZSxoUt6A7/", cca: "https://www.tiktok.com/t/ZSxECjfqx/" };

/* ----- users (from env) ----- */
function normalizeUser(key, u) {
  var role = u.role === "owner" ? "owner" : "profile";
  return {
    key: key,
    displayName: (u.displayName && String(u.displayName)) || DEFAULT_NAMES[key] || key,
    role: role,
    profile: role === "owner" ? null : (u.profile || key),
    passwordHash: String(u.passwordHash || "").trim().toLowerCase()
  };
}
function loadUsers() {
  var users = {};
  var raw = process.env.ALWAFER_ADMIN_USERS_JSON;
  if (raw) {
    try {
      var obj = JSON.parse(raw);
      PROFILE_KEYS.forEach(function (k) { if (obj[k] && obj[k].passwordHash) users[k] = normalizeUser(k, obj[k]); });
    } catch (e) { /* fall through to separate vars */ }
  }
  if (!Object.keys(users).length) {
    if (process.env.ALWAFER_OWNER_PASSWORD_HASH) users.mustafa = normalizeUser("mustafa", { role: "owner", passwordHash: process.env.ALWAFER_OWNER_PASSWORD_HASH });
    if (process.env.ALWAFER_AHMED_PASSWORD_HASH) users.ahmed = normalizeUser("ahmed", { role: "profile", profile: "ahmed", passwordHash: process.env.ALWAFER_AHMED_PASSWORD_HASH });
    if (process.env.ALWAFER_HALA_PASSWORD_HASH) users.hala = normalizeUser("hala", { role: "profile", profile: "hala", passwordHash: process.env.ALWAFER_HALA_PASSWORD_HASH });
  }
  return users;
}
function cookieSecret() { return process.env.ALWAFER_COOKIE_SECRET || ""; }
function adminConfigured() { return Object.keys(loadUsers()).length > 0 && !!cookieSecret(); }
function missingAuthEnv() {
  var m = [];
  if (!Object.keys(loadUsers()).length) m.push("ALWAFER_ADMIN_USERS_JSON (or ALWAFER_OWNER/AHMED/HALA_PASSWORD_HASH)");
  if (!cookieSecret()) m.push("ALWAFER_COOKIE_SECRET");
  return m;
}
function permsFor(user) {
  if (user.role === "owner") return { profiles: PROFILE_KEYS.slice(), regions: true };
  return { profiles: [user.profile], regions: false };
}
function publicUser(user) {
  var p = permsFor(user);
  return { key: user.key, displayName: user.displayName, role: user.role, profile: user.profile,
    allowedProfiles: p.profiles, canEditRegions: p.regions };
}

/* ----- http helpers ----- */
function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(obj));
}
async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body) { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  return await new Promise(function (resolve) {
    var d = ""; req.on("data", function (c) { d += c; if (d.length > 1e6) req.destroy(); });
    req.on("end", function () { try { resolve(d ? JSON.parse(d) : {}); } catch (e) { resolve({}); } });
    req.on("error", function () { resolve({}); });
  });
}
function parseCookies(req) {
  var out = {}, h = req.headers && req.headers.cookie;
  if (!h) return out;
  h.split(";").forEach(function (p) { var i = p.indexOf("="); if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}

/* ----- crypto / session ----- */
function hmac(data, secret) { return crypto.createHmac("sha256", secret).update(data).digest("hex"); }
function safeEq(a, b) { var ab = Buffer.from(String(a)), bb = Buffer.from(String(b)); if (ab.length !== bb.length) return false; return crypto.timingSafeEqual(ab, bb); }
function b64u(s) { return Buffer.from(s, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function unb64u(s) { s = String(s).replace(/-/g, "+").replace(/_/g, "/"); return Buffer.from(s, "base64").toString("utf8"); }
function makeToken(user, secret) {
  var payload = b64u(JSON.stringify({ u: user.key, r: user.role, p: user.profile || null, exp: Math.floor(Date.now() / 1000) + SESSION_TTL }));
  return payload + "." + hmac(payload, secret);
}
function verifyToken(token, secret) {
  if (!token || !secret) return null;
  var i = token.lastIndexOf("."); if (i < 0) return null;
  var payload = token.slice(0, i), sig = token.slice(i + 1);
  if (!safeEq(sig, hmac(payload, secret))) return null;
  var obj; try { obj = JSON.parse(unb64u(payload)); } catch (e) { return null; }
  if (!obj || !obj.exp || obj.exp <= Math.floor(Date.now() / 1000)) return null;
  return obj;
}
function checkHash(input, hash) {
  if (typeof input !== "string" || input === "" || !hash) return false;
  return safeEq(crypto.createHash("sha256").update(input).digest("hex"), String(hash).trim().toLowerCase());
}
// Authoritative current user: cookie identity re-resolved against env users.
function currentUser(req) {
  var obj = verifyToken(parseCookies(req)[COOKIE_NAME], cookieSecret());
  if (!obj) return null;
  var u = loadUsers()[obj.u];
  return u || null;
}
function setSessionCookie(res, token) { res.setHeader("Set-Cookie", COOKIE_NAME + "=" + token + "; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=" + SESSION_TTL); }
function clearSessionCookie(res) { res.setHeader("Set-Cookie", COOKIE_NAME + "=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0"); }

/* ----- validation ----- */
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
function cleanLink(input, label) {
  var o = (input && typeof input === "object") ? input : {};
  var enabled = o.enabled === true;
  var url = typeof o.url === "string" ? o.url.trim() : "";
  if (url && !isAllowedUrl(url)) return { error: "Invalid URL for " + label };
  if (enabled && !isNavigableUrl(url)) return { error: "“" + label + "” is enabled but has no valid link." };
  var lbl = (typeof o.label === "string" && o.label.trim()) ? o.label.trim().slice(0, 60) : label;
  return { ok: { enabled: enabled, url: url, label: lbl } };
}
function cleanLinks(linksInput) {
  var src = (linksInput && linksInput.links) || linksInput || {};
  var out = {};
  for (var i = 0; i < LINK_KEYS.length; i++) {
    var k = LINK_KEYS[i];
    var r = cleanLink(src[k], LINK_LABELS[k]);
    if (r.error) return { error: r.error };
    out[k] = r.ok;
  }
  return { ok: { links: out } };
}
function cleanRegions(regionsInput) {
  var src = regionsInput || {};
  var out = {};
  for (var i = 0; i < REGION_KEYS.length; i++) {
    var k = REGION_KEYS[i];
    var r = cleanLink(src[k], REGION_LABELS[k]);
    if (r.error) return { error: r.error };
    out[k] = r.ok;
  }
  return { ok: out };
}

/* ----- baseline + permission-scoped merge ----- */
function buildDefaults() {
  var s = { version: 1, updatedAt: new Date().toISOString(), profiles: {}, sharedRegions: {} };
  PROFILE_KEYS.forEach(function (p) {
    s.profiles[p] = { links: {} };
    LINK_KEYS.forEach(function (k) { s.profiles[p].links[k] = { enabled: false, url: "", label: LINK_LABELS[k] }; });
  });
  REGION_KEYS.forEach(function (r) { s.sharedRegions[r] = { enabled: true, url: REGION_DEFAULT_URLS[r], label: REGION_LABELS[r] }; });
  return s;
}
function normalizeBaseline(current) {
  var base = buildDefaults();
  if (current && typeof current === "object") {
    PROFILE_KEYS.forEach(function (p) {
      var c = cleanLinks((current.profiles || {})[p]); if (c.ok) base.profiles[p] = c.ok;
    });
    var cr = cleanRegions(current.sharedRegions); if (cr.ok) base.sharedRegions = cr.ok;
  }
  return base;
}
// Apply ONLY the sections this user is permitted to edit; everything else
// is taken from `current` (so unauthorized writes are impossible).
function applyAllowedEdits(current, input, perms) {
  var result = normalizeBaseline(current);
  input = input || {};
  for (var i = 0; i < perms.profiles.length; i++) {
    var p = perms.profiles[i];
    if (input.profiles && Object.prototype.hasOwnProperty.call(input.profiles, p)) {
      var c = cleanLinks(input.profiles[p]);
      if (c.error) return { error: c.error };
      result.profiles[p] = c.ok;
    }
  }
  if (perms.regions && input.sharedRegions) {
    var cr = cleanRegions(input.sharedRegions);
    if (cr.error) return { error: cr.error };
    result.sharedRegions = cr.ok;
  }
  result.version = 1;
  result.updatedAt = new Date().toISOString();
  return { ok: result };
}
function forbiddenScope(input, perms) {
  input = input || {};
  var allowed = {};
  perms.profiles.forEach(function (p) { allowed[p] = true; });
  var profiles = input.profiles;
  if (profiles && typeof profiles === "object") {
    var keys = Object.keys(profiles);
    for (var i = 0; i < keys.length; i++) {
      if (!allowed[keys[i]]) return "Not permitted to edit profile: " + keys[i];
    }
  }
  if (!perms.regions && Object.prototype.hasOwnProperty.call(input, "sharedRegions")) {
    return "Not permitted to edit shared regions";
  }
  return "";
}
function filterForUser(settings, perms) {
  var base = normalizeBaseline(settings);
  if (perms.regions && perms.profiles.length === PROFILE_KEYS.length) return base; // owner: everything
  var out = { version: base.version, updatedAt: base.updatedAt, profiles: {}, sharedRegions: {} };
  perms.profiles.forEach(function (p) { out.profiles[p] = base.profiles[p]; });
  if (perms.regions) out.sharedRegions = base.sharedRegions;
  return out;
}

/* ----- GitHub ----- */
function ghHeaders() { return { "Authorization": "Bearer " + process.env.GITHUB_TOKEN, "Accept": "application/vnd.github+json", "User-Agent": "alwafer-link-hub-admin", "X-GitHub-Api-Version": "2022-11-28" }; }
async function githubGet() {
  var url = "https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/" + FILE_PATH + "?ref=" + BRANCH;
  var r = await fetch(url, { headers: ghHeaders() });
  if (r.status === 404) return { sha: null, json: null };
  if (!r.ok) throw new Error("GitHub read failed (" + r.status + ")");
  var data = await r.json();
  var json = null; try { json = JSON.parse(Buffer.from(data.content || "", "base64").toString("utf8")); } catch (e) {}
  return { sha: data.sha, json: json };
}
async function githubPut(obj, sha) {
  var url = "https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/" + FILE_PATH;
  var body = { message: "admin: update link settings (" + obj.updatedAt + ")", content: Buffer.from(JSON.stringify(obj, null, 2) + "\n", "utf8").toString("base64"), branch: BRANCH };
  if (sha) body.sha = sha;
  var r = await fetch(url, { method: "PUT", headers: ghHeaders(), body: JSON.stringify(body) });
  if (!r.ok) { var t = await r.text(); throw new Error("GitHub write failed (" + r.status + "): " + t.slice(0, 160)); }
  return await r.json();
}
async function fetchPublicSettings(req) {
  var host = req.headers["x-forwarded-host"] || req.headers.host;
  var proto = req.headers["x-forwarded-proto"] || "https";
  try { var r = await fetch(proto + "://" + host + "/" + FILE_PATH, { headers: { "Cache-Control": "no-store" } }); if (r.ok) return await r.json(); } catch (e) {}
  return null;
}

/* ============================ handler ============================ */
async function handler(req, res) {
  var action = (req.query && req.query.action) || "";
  var method = req.method || "GET";
  try {
    if (action === "login") {
      if (method !== "POST") return send(res, 405, { error: "method_not_allowed" });
      if (!adminConfigured()) return send(res, 503, { error: "not_configured", missing: missingAuthEnv() });
      var body = await readBody(req);
      var users = loadUsers();
      var u = users[body && body.account];
      if (!u || !checkHash(body && body.password, u.passwordHash)) return send(res, 401, { error: "invalid_credentials" });
      setSessionCookie(res, makeToken(u, cookieSecret()));
      return send(res, 200, { ok: true, user: publicUser(u) });
    }

    if (action === "logout") {
      if (method !== "POST") return send(res, 405, { error: "method_not_allowed" });
      clearSessionCookie(res);
      return send(res, 200, { ok: true });
    }

    if (action === "me") {
      var cu = currentUser(req);
      if (!cu) return send(res, 200, { authenticated: false, configured: adminConfigured(), canSave: !!process.env.GITHUB_TOKEN });
      return send(res, 200, { authenticated: true, user: publicUser(cu), configured: true, canSave: !!process.env.GITHUB_TOKEN });
    }

    if (action === "settings") {
      var user = currentUser(req);
      if (!user) return send(res, 401, { error: "unauthorized" });
      var perms = permsFor(user);

      if (method === "GET") {
        var settings = null;
        if (process.env.GITHUB_TOKEN) { try { settings = (await githubGet()).json; } catch (e) {} }
        if (!settings) settings = await fetchPublicSettings(req);
        return send(res, 200, { settings: filterForUser(settings, perms), perms: { profiles: perms.profiles, regions: perms.regions }, user: publicUser(user), canSave: !!process.env.GITHUB_TOKEN });
      }

      if (method === "POST") {
        var payload = await readBody(req);
        var denied = forbiddenScope(payload && payload.settings, perms);
        if (denied) return send(res, 403, { error: "forbidden_scope", message: denied });
        if (!process.env.GITHUB_TOKEN) {
          // still validate so the user gets accurate feedback
          var dry = applyAllowedEdits(buildDefaults(), payload && payload.settings, perms);
          if (dry.error) return send(res, 400, { error: "validation", message: dry.error });
          return send(res, 503, { error: "github_not_configured", missing: ["GITHUB_TOKEN"] });
        }
        var current = await githubGet();
        var merged = applyAllowedEdits(current.json, payload && payload.settings, perms);
        if (merged.error) return send(res, 400, { error: "validation", message: merged.error });
        var saved = await githubPut(merged.ok, current.sha);
        return send(res, 200, { ok: true, updatedAt: merged.ok.updatedAt, commit: saved.commit && saved.commit.sha, editable: { profiles: perms.profiles, regions: perms.regions } });
      }
      return send(res, 405, { error: "method_not_allowed" });
    }

    return send(res, 404, { error: "not_found" });
  } catch (err) {
    return send(res, 500, { error: "server_error", message: String(err && err.message || err).slice(0, 200) });
  }
}

module.exports = handler;
module.exports.isAllowedUrl = isAllowedUrl;
module.exports.isNavigableUrl = isNavigableUrl;
module.exports.makeToken = makeToken;
module.exports.verifyToken = verifyToken;
module.exports.checkHash = checkHash;
module.exports.permsFor = permsFor;
module.exports.applyAllowedEdits = applyAllowedEdits;
module.exports.forbiddenScope = forbiddenScope;
module.exports.filterForUser = filterForUser;
module.exports.buildDefaults = buildDefaults;
module.exports.loadUsers = loadUsers;
module.exports.PROFILE_KEYS = PROFILE_KEYS;
module.exports.LINK_KEYS = LINK_KEYS;
module.exports.REGION_KEYS = REGION_KEYS;
