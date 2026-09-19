"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const security = require("../lib/request-security.js");

function req(headers) { return { headers: headers || {} }; }

test("same-site request accepts matching origin and host", () => {
  assert.equal(security.sameSiteRequest(req({
    host: "alwafer.vercel.app",
    origin: "https://alwafer.vercel.app",
    "sec-fetch-site": "same-origin"
  })), true);
});

test("same-site request rejects cross-site browser requests", () => {
  assert.equal(security.sameSiteRequest(req({
    host: "alwafer.vercel.app",
    origin: "https://evil.example.com",
    "sec-fetch-site": "cross-site"
  })), false);
});

test("rate limiter blocks after the configured threshold", () => {
  const request = req({ "x-forwarded-for": "198.51.100.44" });
  for (let i = 0; i < 3; i += 1) {
    assert.equal(security.rateLimit(request, "unit-test", 3, 60000).allowed, true);
  }
  const blocked = security.rateLimit(request, "unit-test", 3, 60000);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfter > 0);
});

test("guard rejects oversized JSON requests", () => {
  const guarded = security.guardJsonPost(req({
    host: "alwafer.vercel.app",
    origin: "https://alwafer.vercel.app",
    "sec-fetch-site": "same-origin",
    "content-type": "application/json",
    "content-length": "1001",
    "x-forwarded-for": "198.51.100.45"
  }), { scope: "size-test", limit: 10, windowMs: 60000, maxBytes: 1000 });
  assert.equal(guarded.status, 413);
  assert.equal(guarded.body.error, "request_too_large");
});
