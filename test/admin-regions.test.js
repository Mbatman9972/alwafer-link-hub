"use strict";

// Coverage for the owner-managed Agency Regions manager:
// flexible array model, strict http/https validation, add/edit/delete,
// server-side RBAC (only the owner may touch sharedRegions), and the
// public renderer's array + legacy-object normalization.

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

function hash(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

process.env.ALWAFER_COOKIE_SECRET = "test-cookie-secret-with-enough-entropy";
process.env.ALWAFER_ADMIN_USERS_JSON = JSON.stringify({
  mustafa: { displayName: "ALWAFER", role: "owner", passwordHash: hash("owner-test") },
  ahmed: { displayName: "Team Ahmed Ramadan", role: "profile", profile: "ahmed", passwordHash: hash("ahmed-test") },
  hala: { displayName: "Hala Al-Saghir", role: "profile", profile: "hala", passwordHash: hash("hala-test") }
});
delete process.env.GITHUB_TOKEN;

const root = path.resolve(__dirname, "..");
const api = require("../api/admin/[action].js");
const app = require("../app.js");

/* ---------------- server: data model + validation ---------------- */

test("buildDefaults exposes regions as an ordered array of six", () => {
  const regions = api.buildDefaults().sharedRegions;
  assert.ok(Array.isArray(regions));
  assert.deepEqual(regions.map((r) => r.id), api.REGION_KEYS);
  assert.ok(regions.every((r) => r.enabled === true && /^https?:\/\//.test(r.url)));
});

test("cleanRegions accepts the array model and assigns slug ids", () => {
  const res = api.cleanRegions([
    { label: "USA", url: "https://example.com/usa", enabled: true },
    { label: "GCC Region", url: "https://example.com/gcc", enabled: false }
  ]);
  assert.ok(res.ok);
  assert.deepEqual(res.ok.map((r) => r.id), ["usa", "gcc-region"]);
  assert.equal(res.ok[1].enabled, false);
});

test("cleanRegions migrates the legacy keyed object, preserving order", () => {
  const res = api.cleanRegions({
    mena: { label: "MENA", url: "https://m.example.com", enabled: true },
    uk: { label: "UK", url: "https://u.example.com", enabled: true }
  });
  assert.ok(res.ok);
  assert.deepEqual(res.ok.map((r) => r.id), ["mena", "uk"]);
});

test("cleanRegions drops fully-blank rows and dedupes ids", () => {
  const res = api.cleanRegions([
    { label: "", url: "", enabled: false },
    { label: "Dup", url: "https://a.example.com", enabled: true },
    { label: "Dup", url: "https://b.example.com", enabled: true }
  ]);
  assert.ok(res.ok);
  assert.equal(res.ok.length, 2);
  assert.deepEqual(res.ok.map((r) => r.id), ["dup", "dup-2"]);
});

test("cleanRegions rejects dangerous and non-http(s) region URLs", () => {
  for (const bad of ["javascript:alert(1)", "data:text/html,x", "vbscript:msgbox", "file:///etc/passwd", "#anchor", "/relative", "not a url"]) {
    const res = api.cleanRegions([{ label: "Bad", url: bad, enabled: true }]);
    assert.ok(res.error, "should reject " + bad);
  }
});

test("cleanRegions rejects an enabled region without a usable link", () => {
  const res = api.cleanRegions([{ label: "Empty", url: "", enabled: true }]);
  assert.ok(res.error);
});

test("isRegionUrl allows http/https only", () => {
  assert.equal(api.isRegionUrl("https://example.com"), true);
  assert.equal(api.isRegionUrl("http://example.com"), true);
  assert.equal(api.isRegionUrl("mailto:x@y.com"), false);
  assert.equal(api.isRegionUrl("javascript:alert(1)"), false);
});

/* ---------------- server: RBAC ---------------- */

function request(action, method, body, cookie) {
  const req = { query: { action }, method, body, headers: cookie ? { cookie } : {} };
  return new Promise((resolve, reject) => {
    const headers = {};
    const res = {
      statusCode: 200,
      setHeader(name, value) { headers[String(name).toLowerCase()] = value; },
      end(raw) { try { resolve({ status: this.statusCode, headers, body: JSON.parse(raw) }); } catch (e) { reject(e); } }
    };
    Promise.resolve(api(req, res)).catch(reject);
  });
}
async function login(account, password) {
  const response = await request("login", "POST", { account, password });
  return { response, cookie: String(response.headers["set-cookie"] || "").split(";")[0] };
}

test("owner GET returns regions as an array; Ahmed gets an empty array", async () => {
  const owner = await login("mustafa", "owner-test");
  const ownerGet = await request("settings", "GET", undefined, owner.cookie);
  assert.equal(ownerGet.status, 200);
  assert.ok(Array.isArray(ownerGet.body.settings.sharedRegions));
  assert.equal(ownerGet.body.user.canEditRegions, true);

  const ahmed = await login("ahmed", "ahmed-test");
  const ahmedGet = await request("settings", "GET", undefined, ahmed.cookie);
  assert.equal(ahmedGet.status, 200);
  assert.deepEqual(ahmedGet.body.settings.sharedRegions, []);
  assert.equal(ahmedGet.body.user.canEditRegions, false);
});

test("Ahmed crafted sharedRegions ARRAY POST is blocked with 403", async () => {
  const { cookie } = await login("ahmed", "ahmed-test");
  const result = await request("settings", "POST", {
    settings: { profiles: { ahmed: {} }, sharedRegions: [{ label: "HACK", url: "https://evil.example.com", enabled: true }] }
  }, cookie);
  assert.equal(result.status, 403);
  assert.equal(result.body.error, "forbidden_scope");
});

test("Hala crafted sharedRegions ARRAY POST is blocked with 403", async () => {
  const { cookie } = await login("hala", "hala-test");
  const result = await request("settings", "POST", {
    settings: { profiles: { hala: {} }, sharedRegions: [{ label: "HACK", url: "https://evil.example.com", enabled: true }] }
  }, cookie);
  assert.equal(result.status, 403);
  assert.equal(result.body.error, "forbidden_scope");
});

test("owner may add/delete regions; validation gates dangerous URLs", async () => {
  const { cookie } = await login("mustafa", "owner-test");
  // add a TEST region alongside one existing region -> passes validation -> persistence gate (no token)
  const add = await request("settings", "POST", {
    settings: { sharedRegions: [
      { id: "mena", label: "MENA", url: "https://www.tiktok.com/t/ZMAN6Bu2W/", enabled: true },
      { label: "TEST", url: "https://example.com/alwaf-region-test", enabled: true }
    ] }
  }, cookie);
  assert.equal(add.status, 503);
  assert.equal(add.body.error, "github_not_configured");

  // dangerous URL -> 400 validation, never reaches persistence
  const bad = await request("settings", "POST", {
    settings: { sharedRegions: [{ label: "Bad", url: "javascript:alert(1)", enabled: true }] }
  }, cookie);
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error, "validation");
});

/* ---------------- public renderer normalization ---------------- */

test("public normalizeSettings keeps the array model", () => {
  const out = app.normalizeSettings({ sharedRegions: [
    { label: "USA", url: "https://example.com/usa", enabled: true },
    { label: "Off", url: "https://example.com/off", enabled: false }
  ] });
  assert.ok(Array.isArray(out.sharedRegions));
  assert.equal(out.sharedRegions.length, 2);
  assert.equal(out.sharedRegions[0].id, "usa");
  assert.equal(out.sharedRegions[1].enabled, false);
});

test("public normalizeSettings migrates the legacy keyed object to an array", () => {
  const out = app.normalizeSettings({ sharedRegions: {
    mena: { label: "MENA", url: "https://example.com/mena", enabled: true }
  } });
  assert.ok(Array.isArray(out.sharedRegions));
  assert.deepEqual(out.sharedRegions.map((r) => r.id), ["mena"]);
});

test("public defaultSettings regions are an array", () => {
  assert.ok(Array.isArray(app.defaultSettings().sharedRegions));
});

/* ---------------- admin UI static guards ---------------- */

test("admin.js ships the owner region manager wiring", () => {
  const js = fs.readFileSync(path.join(root, "admin.js"), "utf8");
  assert.match(js, /function renderRegions\(/);
  assert.match(js, /function buildRegionRow\(/);
  assert.match(js, /function addRegion\(/);
  assert.match(js, /function deleteRegion\(/);
  assert.match(js, /function moveRegion\(/);
  assert.match(js, /function isRegionUrl\(/);
  assert.match(js, /data-add-region/);
  // region edits stay behind the owner regions permission
  assert.match(js, /if \(state\.perms\.regions\) renderRegions\(\);/);
});
