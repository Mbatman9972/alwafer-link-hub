"use strict";

const crypto = require("crypto");

const buckets = globalThis.__alwaferPublicRateBuckets || new Map();
globalThis.__alwaferPublicRateBuckets = buckets;

function header(req, name) {
  const h = (req && req.headers) || {};
  return String(h[name] || h[name.toLowerCase()] || "").trim();
}

function requestHost(req) {
  return header(req, "x-forwarded-host") || header(req, "host");
}

function sameSiteRequest(req) {
  const fetchSite = header(req, "sec-fetch-site").toLowerCase();
  if (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) return false;

  const origin = header(req, "origin");
  const host = requestHost(req).toLowerCase();
  if (!origin || !host) return true;
  try {
    return new URL(origin).host.toLowerCase() === host;
  } catch (_) {
    return false;
  }
}

function clientIp(req) {
  const raw = (header(req, "x-forwarded-for") || header(req, "x-real-ip")).split(",")[0].trim();
  return raw.slice(0, 96);
}

function rateLimit(req, scope, limit, windowMs) {
  const ip = clientIp(req);
  if (!ip) return { allowed: true, retryAfter: 0 };

  const now = Date.now();
  const key = String(scope || "public") + ":" + crypto.createHash("sha256").update(ip).digest("hex").slice(0, 24);
  let rec = buckets.get(key);

  if (!rec || now - rec.startedAt >= windowMs) {
    rec = { count: 0, startedAt: now };
  }

  rec.count += 1;
  buckets.set(key, rec);

  if (buckets.size > 1000) {
    for (const [k, v] of buckets) {
      if (!v || now - v.startedAt >= windowMs * 2) buckets.delete(k);
      if (buckets.size <= 700) break;
    }
  }

  if (rec.count > limit) {
    const retryAfter = Math.max(1, Math.ceil((windowMs - (now - rec.startedAt)) / 1000));
    return { allowed: false, retryAfter };
  }

  return { allowed: true, retryAfter: 0 };
}

function jsonContentType(req) {
  const type = header(req, "content-type").toLowerCase();
  return !type || type.includes("application/json");
}

function contentLength(req) {
  const n = Number(header(req, "content-length"));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function guardJsonPost(req, opts) {
  opts = opts || {};
  if (!sameSiteRequest(req)) return { status: 403, body: { error: "origin_not_allowed" } };
  if (!jsonContentType(req)) return { status: 415, body: { error: "unsupported_media_type" } };

  const maxBytes = Number(opts.maxBytes) || 100000;
  const len = contentLength(req);
  if (len && len > maxBytes) return { status: 413, body: { error: "request_too_large" } };

  const rate = rateLimit(req, opts.scope || "public", Number(opts.limit) || 30, Number(opts.windowMs) || 600000);
  if (!rate.allowed) return { status: 429, retryAfter: rate.retryAfter, body: { error: "too_many_requests", retryAfter: rate.retryAfter } };

  return null;
}

function hardenResponse(res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
}

module.exports = {
  guardJsonPost,
  hardenResponse,
  sameSiteRequest,
  rateLimit,
  clientIp,
};
