"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
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

const api = require("../api/admin/[action].js");
const apiSlash = require("../api/admin/[action]/index.js");

test("slash-compatible admin API entrypoint reuses the same handler", () => {
  assert.equal(apiSlash, api);
});

function request(action, method, body, cookie) {
  const req = {
    query: { action },
    method,
    body,
    headers: cookie ? { cookie } : {}
  };
  return new Promise((resolve, reject) => {
    const headers = {};
    const res = {
      statusCode: 200,
      setHeader(name, value) { headers[String(name).toLowerCase()] = value; },
      end(raw) {
        try { resolve({ status: this.statusCode, headers, body: JSON.parse(raw) }); }
        catch (error) { reject(error); }
      }
    };
    Promise.resolve(api(req, res)).catch(reject);
  });
}

async function login(account, password) {
  const response = await request("login", "POST", { account, password });
  return { response, cookie: String(response.headers["set-cookie"] || "").split(";")[0] };
}

test("wrong password returns 401 and no session cookie", async () => {
  const response = await request("login", "POST", { account: "ahmed", password: "wrong" });
  assert.equal(response.status, 401);
  assert.equal(response.headers["set-cookie"], undefined);
});

test("Ahmed session is restricted to Ahmed settings", async () => {
  const { response, cookie } = await login("ahmed", "ahmed-test");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.user.allowedProfiles, ["ahmed"]);
  assert.equal(response.body.user.canEditRegions, false);

  const crossProfile = await request("settings", "POST", {
    settings: { profiles: { mustafa: { title: "HACKED", profileImage: "https://example.com/hacked.png" } } }
  }, cookie);
  assert.equal(crossProfile.status, 403);
  assert.equal(crossProfile.body.error, "forbidden_scope");

  const regions = await request("settings", "POST", {
    settings: { profiles: { ahmed: {} }, sharedRegions: {} }
  }, cookie);
  assert.equal(regions.status, 403);
});

test("Hala session cannot modify Ahmed, ALWAFER, or regions", async () => {
  const { response, cookie } = await login("hala", "hala-test");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.user.allowedProfiles, ["hala"]);

  for (const settings of [
    { profiles: { ahmed: {} } },
    { profiles: { mustafa: {} } },
    { profiles: { hala: {} }, sharedRegions: {} }
  ]) {
    const result = await request("settings", "POST", { settings }, cookie);
    assert.equal(result.status, 403);
    assert.equal(result.body.error, "forbidden_scope");
  }
});

test("allowed profile-only payload reaches persistence gate", async () => {
  const { cookie } = await login("ahmed", "ahmed-test");
  const settings = api.buildDefaults();
  settings.profiles.ahmed.title = "Ahmed Test Title";
  settings.profiles.ahmed.profileImage = "https://example.com/ahmed.png";
  const result = await request("settings", "POST", {
    settings: { profiles: { ahmed: settings.profiles.ahmed } }
  }, cookie);
  assert.equal(result.status, 503);
  assert.equal(result.body.error, "github_not_configured");
});

test("profile image URL validation rejects unsafe values before persistence", async () => {
  const { cookie } = await login("ahmed", "ahmed-test");
  const settings = api.buildDefaults();
  settings.profiles.ahmed.profileImage = "javascript:alert(1)";
  const result = await request("settings", "POST", {
    settings: { profiles: { ahmed: settings.profiles.ahmed } }
  }, cookie);
  assert.equal(result.status, 400);
  assert.equal(result.body.error, "validation");
  assert.match(result.body.message, /profile image/i);
});

test("Hala may submit only Hala settings", async () => {
  const { cookie } = await login("hala", "hala-test");
  const settings = api.buildDefaults();
  const result = await request("settings", "POST", {
    settings: { profiles: { hala: settings.profiles.hala } }
  }, cookie);
  assert.equal(result.status, 503);
  assert.equal(result.body.error, "github_not_configured");
});

test("owner may submit every profile and shared regions", async () => {
  const { response, cookie } = await login("mustafa", "owner-test");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.user.allowedProfiles, ["mustafa", "ahmed", "hala"]);
  assert.equal(response.body.user.canEditRegions, true);

  const settings = api.buildDefaults();
  const result = await request("settings", "POST", { settings }, cookie);
  assert.equal(result.status, 503);
  assert.equal(result.body.error, "github_not_configured");
});

test("logout clears the signed session cookie", async () => {
  const { cookie } = await login("ahmed", "ahmed-test");
  const response = await request("logout", "POST", {}, cookie);
  assert.equal(response.status, 200);
  assert.match(String(response.headers["set-cookie"]), /alwafer_admin=;/);
  assert.match(String(response.headers["set-cookie"]), /Max-Age=0/);
});
