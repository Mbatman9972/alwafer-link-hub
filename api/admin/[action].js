/* =====================================================================
 * api/admin/[action].js — ALWAFER Link Hub admin API
 * Routes: /api/admin/login | /api/admin/logout | /api/admin/me
 *         /api/admin/settings  (GET + POST)
 *
 * - No npm dependencies (Node built-ins + global fetch).
 * - Secrets ONLY from env (never sent to the browser).
 * - POST /api/admin/settings can ONLY update data/link-settings.json,
 *   committed to GitHub main; Vercel then auto-redeploys.
 * ===================================================================== */
"use strict";
const crypto = require("crypto");

const OWNER  = process.env.GITHUB_OWNER  || "Mbatman9972";
const REPO   = process.env.GITHUB_REPO   || "alwafer-link-hub";
const BRANCH = process.env.GITHUB_BRANCH || "main";
const FILE_PATH = "data/link-settings.json";   // the ONLY file this API may write
const COOKIE_NAME = "alwafer_admin";
const SESSION_TTL = 60 * 60 * 8;               // 8 hours (seconds)

/* ----- canonical schema (strict allow-lists) ----- */
const PROFILE_KEYS = ["mustafa", "ahmed", "hala"];
const LINK_KEYS = ["apply", "youtube", "tiktok", "telegram", "instagram", "whatsapp", "website"];
const REGION_KEYS = ["mena", "uk", "fr", "de", "tr", "cca"];
const LINK_LABELS = { apply: "Apply to Join the Agency", youtube: "YouTube", tiktok: "TikTok",
  telegram: "Telegram", instagram: "Instagram", whatsapp: "WhatsApp", website: "Website" };
const REGION_LABELS = { mena: "MENA", uk: "UK", fr: "FR", de: "DE", tr: "TR", cca: "CCA" };

/* ----- env helpers ----- */
function hasPassword() { return !!(process.env.ALWAFER_ADMIN_PASSWORD_HASH || process.env.ALWAFER_ADMIN_PASSWORD); }
function cookieSecret() { return process.env.ALWAFER_COOKIE_SECRET || ""; }
function adminConfigured() { return hasPassword() && !!cookieSecret(); }
function missingAuthEnv() {
  const m = [];
  if (!hasPassword()) m.push("ALWAFER_ADMIN_PASSWORD (or ALWAFER_ADMIN_PASSWORD_HASH)");
  if (!cookieSecret()) m.push("ALWAFER_COOKIE_SECRET");
  return m;
}

/* ----- response helper ----- */
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
  return await new Promise((resolve) => {
    let d = ""; req.on("data", (c) => { d += c; if (d.length > 1e6) req.destroy(); });
    req.on("end", () => { try { resolve(d ? JSON.parse(d) : {}); } catch (e) { resolve({}); } });
    req.on("error", () => resolve({}));
  });
}

function parseCookies(req) {
  const out = {}; const h = req.headers && req.headers.cookie;
  if (!h) return out;
  h.split(";").forEach((p) => { const i = p.indexOf("="); if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}

/* ----- auth (HMAC-signed session token) ----- */
function hmac(data, secret) { return crypto.createHmac("sha256", secret).update(data).digest("hex"); }
function safeEq(a, b) {
  const ab = Buffer.from(String(a)), bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
function makeToken(secret) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL;
  const payload = "v1." + exp;
  return payload + "." + hmac(payload, secret);
}
function verifyToken(token, secret) {
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const payload = parts[0] + "." + parts[1];
  if (!safeEq(parts[2], hmac(payload, secret))) return false;
  const exp = parseInt(parts[1], 10);
  return Number.isFinite(exp) && exp > Math.floor(Date.now() / 1000);
}
function checkPassword(input) {
  if (typeof input !== "string" || input === "") return false;
  const hashEnv = process.env.ALWAFER_ADMIN_PASSWORD_HASH;
  if (hashEnv) return safeEq(crypto.createHash("sha256").update(input).digest("hex"), hashEnv.trim().toLowerCase());
  const plain = process.env.ALWAFER_ADMIN_PASSWORD;
  if (plain) return safeEq(input, plain);
  return false;
}
function isAuthed(req) { return verifyToken(parseCookies(req)[COOKIE_NAME], cookieSecret()); }
function setSessionCookie(res, token) {
  res.setHeader("Set-Cookie",
    COOKIE_NAME + "=" + token + "; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=" + SESSION_TTL);
}
function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", COOKIE_NAME + "=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0");
}

/* ----- URL + settings validation ----- */
// Allow only http(s), mailto, tel, and '#'. Reject javascript/data/vbscript/file/malformed.
function isAllowedUrl(u) {
  if (typeof u !== "string") return false;
  const s = u.trim();
  if (s === "") return false;
  if (s.charAt(0) === "#") return true;                 // anchor / placeholder
  const m = s.match(/^([a-zA-Z][a-zA-Z0-9+.\-]*):/);
  if (!m) return false;                                  // no scheme => malformed for our purposes
  const sch = m[1].toLowerCase();
  if (sch === "http" || sch === "https") { try { new URL(s); return true; } catch (e) { return false; } }
  if (sch === "mailto" || sch === "tel") return s.length > sch.length + 1;
  return false;                                          // javascript:, data:, vbscript:, file:, ...
}
// A url that actually navigates (no '#'/empty) — required when enabled.
function isNavigableUrl(u) {
  if (!isAllowedUrl(u)) return false;
  return u.trim().charAt(0) !== "#";
}
function cleanLink(input, key, label) {
  const o = (input && typeof input === "object") ? input : {};
  const enabled = o.enabled === true;
  let url = typeof o.url === "string" ? o.url.trim() : "";
  if (url && !isAllowedUrl(url)) return { error: "Invalid URL for " + label };
  if (enabled && !isNavigableUrl(url)) return { error: "“" + label + "” is enabled but has no valid link." };
  const lbl = (typeof o.label === "string" && o.label.trim()) ? o.label.trim().slice(0, 60) : label;
  return { ok: { enabled: enabled, url: url, label: lbl } };
}
// Build a clean settings object from input using the fixed schema (ignores unknown keys).
function validateSettings(input) {
  if (!input || typeof input !== "object") return { error: "Malformed settings." };
  const out = { version: 1, updatedAt: new Date().toISOString(), profiles: {}, sharedRegions: {} };
  const inProfiles = input.profiles || {};
  for (const pk of PROFILE_KEYS) {
    const links = ((inProfiles[pk] || {}).links) || {};
    out.profiles[pk] = { links: {} };
    for (const lk of LINK_KEYS) {
      const r = cleanLink(links[lk], lk, LINK_LABELS[lk]);
      if (r.error) return { error: r.error };
      out.profiles[pk].links[lk] = r.ok;
    }
  }
  const inRegions = input.sharedRegions || {};
  for (const rk of REGION_KEYS) {
    const r = cleanLink(inRegions[rk], rk, REGION_LABELS[rk]);
    if (r.error) return { error: r.error };
    out.sharedRegions[rk] = r.ok;
  }
  return { ok: out };
}

/* ----- GitHub persistence ----- */
function ghHeaders() {
  return {
    "Authorization": "Bearer " + process.env.GITHUB_TOKEN,
    "Accept": "application/vnd.github+json",
    "User-Agent": "alwafer-link-hub-admin",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}
async function githubGet() {
  const url = "https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/" + FILE_PATH + "?ref=" + BRANCH;
  const r = await fetch(url, { headers: ghHeaders() });
  if (r.status === 404) return { sha: null, json: null };
  if (!r.ok) throw new Error("GitHub read failed (" + r.status + ")");
  const data = await r.json();
  const content = Buffer.from(data.content || "", "base64").toString("utf8");
  let json = null; try { json = JSON.parse(content); } catch (e) {}
  return { sha: data.sha, json: json };
}
async function githubPut(obj, sha) {
  const url = "https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/" + FILE_PATH;
  const body = {
    message: "admin: update link settings (" + obj.updatedAt + ")",
    content: Buffer.from(JSON.stringify(obj, null, 2) + "\n", "utf8").toString("base64"),
    branch: BRANCH
  };
  if (sha) body.sha = sha;
  const r = await fetch(url, { method: "PUT", headers: ghHeaders(), body: JSON.stringify(body) });
  if (!r.ok) { const t = await r.text(); throw new Error("GitHub write failed (" + r.status + "): " + t.slice(0, 200)); }
  return await r.json();
}
async function fetchPublicSettings(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  try {
    const r = await fetch(proto + "://" + host + "/" + FILE_PATH, { headers: { "Cache-Control": "no-store" } });
    if (r.ok) return await r.json();
  } catch (e) {}
  return null;
}

/* ============================ handler ============================ */
async function handler(req, res) {
  const action = (req.query && req.query.action) || "";
  const method = req.method || "GET";

  try {
    if (action === "login") {
      if (method !== "POST") return send(res, 405, { error: "method_not_allowed" });
      if (!adminConfigured()) return send(res, 503, { error: "not_configured", missing: missingAuthEnv() });
      const body = await readBody(req);
      if (!checkPassword(body && body.password)) return send(res, 401, { error: "invalid_password" });
      setSessionCookie(res, makeToken(cookieSecret()));
      return send(res, 200, { ok: true });
    }

    if (action === "logout") {
      if (method !== "POST") return send(res, 405, { error: "method_not_allowed" });
      clearSessionCookie(res);
      return send(res, 200, { ok: true });
    }

    if (action === "me") {
      return send(res, 200, {
        authenticated: isAuthed(req),
        configured: adminConfigured(),
        canSave: !!process.env.GITHUB_TOKEN
      });
    }

    if (action === "settings") {
      if (!isAuthed(req)) return send(res, 401, { error: "unauthorized" });

      if (method === "GET") {
        let settings = null;
        if (process.env.GITHUB_TOKEN) { try { settings = (await githubGet()).json; } catch (e) {} }
        if (!settings) settings = await fetchPublicSettings(req);
        return send(res, 200, { settings: settings, canSave: !!process.env.GITHUB_TOKEN });
      }

      if (method === "POST") {
        const body = await readBody(req);
        const result = validateSettings(body && body.settings);
        if (result.error) return send(res, 400, { error: "validation", message: result.error });
        if (!process.env.GITHUB_TOKEN) return send(res, 503, { error: "github_not_configured", missing: ["GITHUB_TOKEN"] });
        const current = await githubGet();
        const saved = await githubPut(result.ok, current.sha);
        return send(res, 200, { ok: true, updatedAt: result.ok.updatedAt, commit: saved.commit && saved.commit.sha });
      }
      return send(res, 405, { error: "method_not_allowed" });
    }

    return send(res, 404, { error: "not_found" });
  } catch (err) {
    return send(res, 500, { error: "server_error", message: String(err && err.message || err).slice(0, 200) });
  }
}

module.exports = handler;
/* expose pure helpers for local tests */
module.exports.isAllowedUrl = isAllowedUrl;
module.exports.isNavigableUrl = isNavigableUrl;
module.exports.validateSettings = validateSettings;
module.exports.makeToken = makeToken;
module.exports.verifyToken = verifyToken;
module.exports.checkPassword = checkPassword;
module.exports.PROFILE_KEYS = PROFILE_KEYS;
module.exports.LINK_KEYS = LINK_KEYS;
module.exports.REGION_KEYS = REGION_KEYS;
