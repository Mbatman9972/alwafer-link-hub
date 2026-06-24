/* =====================================================================
 * api/admin/[action].js — ALWAFER Link Hub admin API
 * ===================================================================== */
"use strict";
const crypto = require("crypto");

const OWNER = process.env.GITHUB_OWNER || "Mbatman9972";
const REPO = process.env.GITHUB_REPO || "alwafer-link-hub";
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
const PROFILE_DEFAULTS = {
  mustafa: { title: "ALWAFER", subtitle: "Alwafer Agency", profileImage: "/assets/profiles/alwafer-profile.png" },
  ahmed: { title: "TEAM AHMED RAMADAN", subtitle: "Official Agency Network", profileImage: "/assets/profiles/ahmed-profile.png" },
  hala: { title: "HALA AL-SAGHIR", subtitle: "Official Profile", profileImage: "/assets/profiles/hala-profile.jpg" }
};
const DEFAULT_TAGLINE = "Empowering creators. Building influence. Elevating brands.\nتمكّن المبدعين، نبني التأثير، نرتقي بالعلامات التجارية.";
const REGION_DEFAULT_URLS = { mena: "https://www.tiktok.com/t/ZMAN6Bu2W/", uk: "https://www.tiktok.com/t/ZSxoyPd4W/",
  fr: "https://www.tiktok.com/t/ZSxoAQrsm/", de: "https://www.tiktok.com/t/ZSQ1b63XY/",
  tr: "https://www.tiktok.com/t/ZSxoUt6A7/", cca: "https://www.tiktok.com/t/ZSxECjfqx/" };
const MAX_REGIONS = 50;
const REGION_LABEL_MAX = 40;
// Canonical shared-regions model is an ordered ARRAY of { id, label, url, enabled }.
function defaultRegions() {
  return REGION_KEYS.map((key) => ({ id: key, label: REGION_LABELS[key], url: REGION_DEFAULT_URLS[key], enabled: true }));
}

function normalizeUser(key, input) {
  const role = input.role === "owner" ? "owner" : "profile";
  return {
    key,
    displayName: (input.displayName && String(input.displayName)) || DEFAULT_NAMES[key] || key,
    role,
    profile: role === "owner" ? null : (input.profile || key),
    passwordHash: String(input.passwordHash || "").trim().toLowerCase()
  };
}
function loadUsers() {
  const users = {};
  const raw = process.env.ALWAFER_ADMIN_USERS_JSON;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      PROFILE_KEYS.forEach((key) => {
        if (parsed[key] && parsed[key].passwordHash) users[key] = normalizeUser(key, parsed[key]);
      });
    } catch (e) {}
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
  const missing = [];
  if (!Object.keys(loadUsers()).length) missing.push("ALWAFER_ADMIN_USERS_JSON (or profile password hashes)");
  if (!cookieSecret()) missing.push("ALWAFER_COOKIE_SECRET");
  return missing;
}
function permsFor(user) {
  if (user.role === "owner") return { profiles: PROFILE_KEYS.slice(), regions: true };
  return { profiles: [user.profile], regions: false };
}
function publicUser(user) {
  const perms = permsFor(user);
  return { key: user.key, displayName: user.displayName, role: user.role, profile: user.profile,
    allowedProfiles: perms.profiles, canEditRegions: perms.regions };
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(body));
}
async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body) {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  return await new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) req.destroy();
    });
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch (e) { resolve({}); }
    });
    req.on("error", () => resolve({}));
  });
}
function parseCookies(req) {
  const out = {};
  const header = req.headers && req.headers.cookie;
  if (!header) return out;
  header.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx > -1) out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return out;
}

function hmac(data, secret) { return crypto.createHmac("sha256", secret).update(data).digest("hex"); }
function safeEq(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
function b64u(value) { return Buffer.from(value, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function unb64u(value) { return Buffer.from(String(value).replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"); }
function makeToken(user, secret) {
  const payload = b64u(JSON.stringify({ u: user.key, r: user.role, p: user.profile || null, exp: Math.floor(Date.now() / 1000) + SESSION_TTL }));
  return payload + "." + hmac(payload, secret);
}
function verifyToken(token, secret) {
  if (!token || !secret) return null;
  const idx = token.lastIndexOf(".");
  if (idx < 0) return null;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  if (!safeEq(sig, hmac(payload, secret))) return null;
  let parsed;
  try { parsed = JSON.parse(unb64u(payload)); } catch (e) { return null; }
  if (!parsed || !parsed.exp || parsed.exp <= Math.floor(Date.now() / 1000)) return null;
  return parsed;
}
function checkHash(input, hash) {
  if (typeof input !== "string" || !input || !hash) return false;
  return safeEq(crypto.createHash("sha256").update(input).digest("hex"), String(hash).trim().toLowerCase());
}
function currentUser(req) {
  const token = parseCookies(req)[COOKIE_NAME];
  const parsed = verifyToken(token, cookieSecret());
  if (!parsed) return null;
  return loadUsers()[parsed.u] || null;
}
function setSessionCookie(res, token) {
  res.setHeader("Set-Cookie", COOKIE_NAME + "=" + token + "; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=" + SESSION_TTL);
}
function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", COOKIE_NAME + "=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0");
}

function isAllowedUrl(value) {
  if (typeof value !== "string") return false;
  const s = value.trim();
  if (!s) return false;
  if (s.charAt(0) === "#") return true;
  const scheme = s.match(/^([a-zA-Z][a-zA-Z0-9+.\-]*):/);
  if (!scheme) return /^\/[A-Za-z0-9._~!$&'()*+,;=:@/%-]+$/.test(s);
  const lower = scheme[1].toLowerCase();
  if (lower === "http" || lower === "https") {
    try { new URL(s); return true; } catch (e) { return false; }
  }
  if (lower === "mailto" || lower === "tel") return s.length > lower.length + 1;
  return false;
}
function isNavigableUrl(value) { return isAllowedUrl(value) && value.trim().charAt(0) !== "#"; }
function isImageUrl(value) {
  if (typeof value !== "string") return false;
  const s = value.trim();
  if (!s) return false;
  if (/^https?:\/\//i.test(s)) {
    try { new URL(s); return true; } catch (e) { return false; }
  }
  return /^\/assets\/[A-Za-z0-9._~!$&'()*+,;=:@/%-]+\.(png|jpe?g|webp)$/i.test(s);
}
// Region links are strict: http/https only. Rejects javascript:/data:/vbscript:/
// file:/mailto:/tel:, relative paths, anchors, and malformed URLs.
function isRegionUrl(value) {
  if (typeof value !== "string") return false;
  const s = value.trim();
  if (!s) return false;
  try { const u = new URL(s); return u.protocol === "http:" || u.protocol === "https:"; }
  catch (e) { return false; }
}
function regionSlug(value, index) {
  const base = String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return base || ("region-" + (index + 1));
}
// Accept the canonical array OR the legacy keyed object; return a plain array.
function toRegionArray(input) {
  if (Array.isArray(input)) return input.slice();
  if (input && typeof input === "object") {
    const keys = Object.keys(input);
    const ordered = REGION_KEYS.filter((k) => keys.indexOf(k) > -1).concat(keys.filter((k) => REGION_KEYS.indexOf(k) < 0));
    return ordered.map((k) => {
      const v = input[k] && typeof input[k] === "object" ? input[k] : {};
      return { id: k, label: typeof v.label === "string" ? v.label : (REGION_LABELS[k] || k), url: v.url, enabled: v.enabled };
    });
  }
  return null;
}
function cleanText(value, fallback, max) {
  const out = typeof value === "string" && value.trim() ? value.trim() : fallback;
  return String(out).slice(0, max);
}
function cleanLink(input, label) {
  const raw = input && typeof input === "object" ? input : {};
  const enabled = raw.enabled === true;
  const url = typeof raw.url === "string" ? raw.url.trim() : "";
  if (url && !isAllowedUrl(url)) return { error: "Invalid URL for " + label };
  if (enabled && !isNavigableUrl(url)) return { error: "“" + label + "” is enabled but has no valid link." };
  return { ok: { enabled, url, label: cleanText(raw.label, label, 60) } };
}
function cleanLinks(input) {
  const src = (input && input.links) || input || {};
  const out = {};
  for (const key of LINK_KEYS) {
    const cleaned = cleanLink(src[key], LINK_LABELS[key]);
    if (cleaned.error) return { error: cleaned.error };
    out[key] = cleaned.ok;
  }
  return { ok: { links: out } };
}
function cleanProfile(key, input) {
  const raw = input && typeof input === "object" ? input : {};
  const defaults = PROFILE_DEFAULTS[key];
  const links = cleanLinks(raw.links || {});
  if (links.error) return links;
  const profileImage = cleanText(raw.profileImage, defaults.profileImage, 500);
  if (!isImageUrl(profileImage)) return { error: "Invalid profile image URL for " + DEFAULT_NAMES[key] };
  return { ok: {
    title: cleanText(raw.title, defaults.title, 80),
    subtitle: cleanText(raw.subtitle, defaults.subtitle, 120),
    tagline: cleanText(raw.tagline, DEFAULT_TAGLINE, 320),
    profileImage,
    links: links.ok.links
  } };
}
function cleanRegions(input) {
  const arr = toRegionArray(input);
  if (!arr) return { ok: defaultRegions() };
  if (arr.length > MAX_REGIONS) return { error: "Too many regions (max " + MAX_REGIONS + ")." };
  const used = {};
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const raw = arr[i] && typeof arr[i] === "object" ? arr[i] : {};
    const rawLabel = typeof raw.label === "string" ? raw.label.trim() : "";
    const url = typeof raw.url === "string" ? raw.url.trim() : "";
    if (!rawLabel && !url) continue; // drop fully-blank rows (e.g. an unused "Add region")
    const label = rawLabel ? rawLabel.slice(0, REGION_LABEL_MAX) : "Region";
    const enabled = raw.enabled === true;
    if (url && !isRegionUrl(url)) return { error: "Invalid URL for region “" + label + "” (use http/https)." };
    if (enabled && !isRegionUrl(url)) return { error: "Region “" + label + "” is enabled but has no valid http/https link." };
    const slug = regionSlug(raw.id || label, i);
    let id = slug, n = 2;
    while (used[id]) { id = slug + "-" + n; n += 1; }
    used[id] = true;
    out.push({ id: id, label: label, url: url, enabled: enabled });
  }
  return { ok: out };
}

function buildDefaults() {
  const settings = { version: 1, updatedAt: new Date().toISOString(), profiles: {}, sharedRegions: [] };
  PROFILE_KEYS.forEach((key) => {
    settings.profiles[key] = {
      title: PROFILE_DEFAULTS[key].title,
      subtitle: PROFILE_DEFAULTS[key].subtitle,
      tagline: DEFAULT_TAGLINE,
      profileImage: PROFILE_DEFAULTS[key].profileImage,
      links: {}
    };
    LINK_KEYS.forEach((linkKey) => { settings.profiles[key].links[linkKey] = { enabled: false, url: "", label: LINK_LABELS[linkKey] }; });
  });
  settings.sharedRegions = defaultRegions();
  return settings;
}
function normalizeBaseline(current) {
  const base = buildDefaults();
  if (current && typeof current === "object") {
    PROFILE_KEYS.forEach((key) => {
      const cleaned = cleanProfile(key, (current.profiles || {})[key]);
      if (cleaned.ok) base.profiles[key] = cleaned.ok;
    });
    if (current.sharedRegions !== undefined) {
      const regions = cleanRegions(current.sharedRegions);
      if (regions.ok) base.sharedRegions = regions.ok;
    }
  }
  return base;
}
function forbiddenScope(input, perms) {
  input = input || {};
  const allowed = {};
  perms.profiles.forEach((key) => { allowed[key] = true; });
  const profiles = input.profiles;
  if (profiles && typeof profiles === "object") {
    for (const key of Object.keys(profiles)) {
      if (!allowed[key]) return "Not permitted to edit profile: " + key;
    }
  }
  if (!perms.regions && Object.prototype.hasOwnProperty.call(input, "sharedRegions")) return "Not permitted to edit shared regions";
  return "";
}
function applyAllowedEdits(current, input, perms) {
  const result = normalizeBaseline(current);
  input = input || {};
  for (const key of perms.profiles) {
    if (input.profiles && Object.prototype.hasOwnProperty.call(input.profiles, key)) {
      const cleaned = cleanProfile(key, input.profiles[key]);
      if (cleaned.error) return { error: cleaned.error };
      result.profiles[key] = cleaned.ok;
    }
  }
  if (perms.regions && input.sharedRegions) {
    const regions = cleanRegions(input.sharedRegions);
    if (regions.error) return { error: regions.error };
    result.sharedRegions = regions.ok;
  }
  result.version = 1;
  result.updatedAt = new Date().toISOString();
  return { ok: result };
}
function filterForUser(settings, perms) {
  const base = normalizeBaseline(settings);
  if (perms.regions && perms.profiles.length === PROFILE_KEYS.length) return base;
  const out = { version: base.version, updatedAt: base.updatedAt, profiles: {}, sharedRegions: [] };
  perms.profiles.forEach((key) => { out.profiles[key] = base.profiles[key]; });
  if (perms.regions) out.sharedRegions = base.sharedRegions;
  return out;
}

function ghHeaders() {
  return { Authorization: "Bearer " + process.env.GITHUB_TOKEN, Accept: "application/vnd.github+json",
    "User-Agent": "alwafer-link-hub-admin", "X-GitHub-Api-Version": "2022-11-28" };
}
async function githubGet() {
  const url = "https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/" + FILE_PATH + "?ref=" + BRANCH;
  const res = await fetch(url, { headers: ghHeaders() });
  if (res.status === 404) return { sha: null, json: null };
  if (!res.ok) throw new Error("GitHub read failed (" + res.status + ")");
  const data = await res.json();
  let json = null;
  try { json = JSON.parse(Buffer.from(data.content || "", "base64").toString("utf8")); } catch (e) {}
  return { sha: data.sha, json };
}
async function githubPut(obj, sha) {
  const url = "https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/" + FILE_PATH;
  const body = { message: "admin: update link settings (" + obj.updatedAt + ")", content: Buffer.from(JSON.stringify(obj, null, 2) + "\n", "utf8").toString("base64"), branch: BRANCH };
  if (sha) body.sha = sha;
  const res = await fetch(url, { method: "PUT", headers: ghHeaders(), body: JSON.stringify(body) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error("GitHub write failed (" + res.status + "): " + text.slice(0, 160));
  }
  return await res.json();
}
async function fetchPublicSettings(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  try {
    const res = await fetch(proto + "://" + host + "/" + FILE_PATH, { headers: { "Cache-Control": "no-store" } });
    if (res.ok) return await res.json();
  } catch (e) {}
  return null;
}

async function handler(req, res) {
  const action = (req.query && req.query.action) || "";
  const method = req.method || "GET";
  try {
    if (action === "login") {
      if (method !== "POST") return send(res, 405, { error: "method_not_allowed" });
      if (!adminConfigured()) return send(res, 503, { error: "not_configured", missing: missingAuthEnv() });
      const body = await readBody(req);
      const user = loadUsers()[body && body.account];
      if (!user || !checkHash(body && body.password, user.passwordHash)) return send(res, 401, { error: "invalid_credentials" });
      setSessionCookie(res, makeToken(user, cookieSecret()));
      return send(res, 200, { ok: true, user: publicUser(user) });
    }

    if (action === "logout") {
      if (method !== "POST") return send(res, 405, { error: "method_not_allowed" });
      clearSessionCookie(res);
      return send(res, 200, { ok: true });
    }

    if (action === "me") {
      const user = currentUser(req);
      if (!user) return send(res, 200, { authenticated: false, configured: adminConfigured(), canSave: !!process.env.GITHUB_TOKEN });
      return send(res, 200, { authenticated: true, user: publicUser(user), configured: true, canSave: !!process.env.GITHUB_TOKEN });
    }

    if (action === "settings") {
      const user = currentUser(req);
      if (!user) return send(res, 401, { error: "unauthorized" });
      const perms = permsFor(user);

      if (method === "GET") {
        let settings = null;
        if (process.env.GITHUB_TOKEN) {
          try { settings = (await githubGet()).json; } catch (e) {}
        }
        if (!settings) settings = await fetchPublicSettings(req);
        return send(res, 200, { settings: filterForUser(settings, perms), perms: { profiles: perms.profiles, regions: perms.regions }, user: publicUser(user), canSave: !!process.env.GITHUB_TOKEN });
      }

      if (method === "POST") {
        const payload = await readBody(req);
        const denied = forbiddenScope(payload && payload.settings, perms);
        if (denied) return send(res, 403, { error: "forbidden_scope", message: denied });
        if (!process.env.GITHUB_TOKEN) {
          const dry = applyAllowedEdits(buildDefaults(), payload && payload.settings, perms);
          if (dry.error) return send(res, 400, { error: "validation", message: dry.error });
          return send(res, 503, { error: "github_not_configured", missing: ["GITHUB_TOKEN"] });
        }
        const current = await githubGet();
        const merged = applyAllowedEdits(current.json, payload && payload.settings, perms);
        if (merged.error) return send(res, 400, { error: "validation", message: merged.error });
        const saved = await githubPut(merged.ok, current.sha);
        return send(res, 200, { ok: true, updatedAt: merged.ok.updatedAt, commit: saved.commit && saved.commit.sha, editable: { profiles: perms.profiles, regions: perms.regions } });
      }

      return send(res, 405, { error: "method_not_allowed" });
    }

    return send(res, 404, { error: "not_found" });
  } catch (error) {
    return send(res, 500, { error: "server_error", message: String(error && error.message || error).slice(0, 200) });
  }
}

module.exports = handler;
module.exports.isAllowedUrl = isAllowedUrl;
module.exports.isNavigableUrl = isNavigableUrl;
module.exports.isImageUrl = isImageUrl;
module.exports.isRegionUrl = isRegionUrl;
module.exports.cleanRegions = cleanRegions;
module.exports.defaultRegions = defaultRegions;
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
