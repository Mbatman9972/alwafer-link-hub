"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = require("../app.js");

const pages = [
  { route: "alwafer", key: "mustafa", title: "ALWAFER", image: "/assets/profiles/alwafer-profile.png" },
  { route: "ahmed", key: "ahmed", title: "Team Ahmed Ramadan", image: "/assets/profiles/ahmed-profile.png" },
  { route: "hala", key: "hala", title: "Hala Al-Saghir", image: "/assets/profiles/hala-profile.jpg" }
];

for (const page of pages) {
  test(`${page.route} loads the real shared dashboard renderer, not static PNG hotspots`, () => {
    const html = fs.readFileSync(path.join(root, page.route, "index.html"), "utf8");
    assert.match(html, /<script src="\/app\.js" defer><\/script>/);
    assert.match(html, /<link rel="stylesheet" href="\/styles\.css"/);
    assert.doesNotMatch(html, /<img class="profile-art"/);
    assert.doesNotMatch(html, /class="hotspot|data-hotspot|BTN_LEFT|applyHotspots/);
    assert.equal(app.resolveProfile(`/${page.route}/`, ""), page.key);
  });
}

test("public renderer exposes the required real dashboard primitives", () => {
  const js = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(js, /className: "dash-button"/);
  assert.match(js, /className: "region-chip"/);
  assert.match(js, /className: "profile-switcher"/);
  assert.doesNotMatch(js, /className: "profile-subtitle"/);
  assert.doesNotMatch(js, /profile\.subtitle/);
  assert.match(js, /href: "\/" \+ SLUGS\[key\] \+ "\/"/);
  assert.match(js, /"\/admin\/" \+ SLUGS\[activeKey\] \+ "\/"/);
  assert.match(js, /data-admin-edit/);
  assert.match(js, /target = "_blank"/);
  assert.match(js, /rel = "noopener noreferrer"/);
  assert.match(js, /aria-disabled/);
});

test("settings model includes profile content, profile image, links, and shared regions", () => {
  const data = JSON.parse(fs.readFileSync(path.join(root, "data/link-settings.json"), "utf8"));
  for (const page of pages) {
    const profile = page.key;
    assert.equal(typeof data.profiles[profile].title, "string");
    assert.equal(typeof data.profiles[profile].subtitle, "string");
    assert.equal(typeof data.profiles[profile].tagline, "string");
    assert.equal(data.profiles[profile].profileImage, page.image);
    assert.doesNotMatch(data.profiles[profile].profileImage, /^\/assets\/page-/);
    assert.deepEqual(Object.keys(data.profiles[profile].links), app.LINK_KEYS);
  }
  // sharedRegions is now a flexible, owner-managed ARRAY (add/edit/delete/reorder).
  assert.ok(Array.isArray(data.sharedRegions));
  assert.deepEqual(data.sharedRegions.map((region) => region.id), app.REGION_KEYS);
  for (const region of data.sharedRegions) {
    assert.equal(typeof region.label, "string");
    assert.equal(typeof region.url, "string");
    assert.equal(typeof region.enabled, "boolean");
    assert.match(region.url, /^https?:\/\//);
  }
});

test("canonical URLs retain trailing slashes and admin profile routes", () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
  assert.equal(config.trailingSlash, true);
  assert.deepEqual(config.rewrites.map((rule) => rule.source), [
    "/admin/alwafer/", "/admin/ahmed/", "/admin/hala/"
  ]);
  assert.ok(config.rewrites.every((rule) => rule.destination === "/admin/"));
});

test("admin renders the required signed-in identity wording", () => {
  const js = fs.readFileSync(path.join(root, "admin.js"), "utf8");
  assert.match(js, /Signed in as /);
  assert.match(js, /state\.user\.role === "owner" \? " owner" : ""/);
  assert.match(js, /function adminApiPath/);
  assert.match(js, /LOGIN_TIMEOUT_MS = 8000/);
  assert.match(js, /AbortController/);
  assert.match(js, /Signing in…/);
  assert.match(js, /Login failed\. Please try again\./);
  assert.match(js, /Login timed out\. Please try again\./);
  assert.match(js, /\.finally\(function \(\) \{\s*setLoginBusy\(false\);/);
  assert.match(js, /api\("\/me", \{ method: "GET", timeoutMs: timeoutMs \|\| 0 \}\)/);
  assert.match(js, /Login session was not accepted\. Please try again\./);
  assert.doesNotMatch(js, /document\.cookie\s*\+\s*|cookie value|passwordHash|ALWAFER_COOKIE_SECRET/);
});

test("admin diagnostics panel is fully removed from the production UI", () => {
  const js = fs.readFileSync(path.join(root, "admin.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "admin.css"), "utf8");
  assert.doesNotMatch(js, /Admin diagnostics/i);
  assert.doesNotMatch(js, /admin-debug-panel/);
  assert.doesNotMatch(js, /function renderDebug|function updateDebug|function debugRow/);
  assert.doesNotMatch(js, /ADMIN_BUILD_VERSION/);
  // No diagnostic row labels may remain.
  for (const label of ["UI state", "login request URL", "/api/admin/me status", "session cookie", "editor visible", "login visible", "selector count"]) {
    assert.doesNotMatch(js, new RegExp(label.replace(/[/]/g, "\\/")), `diagnostic label leaked: ${label}`);
  }
  assert.doesNotMatch(css, /admin-debug/);
});

test("admin assets are content-versioned for normal-browser cache busting", () => {
  const html = fs.readFileSync(path.join(root, "admin.html"), "utf8");
  assert.match(html, /\/admin\.css\?v=20260624-clean/);
  assert.match(html, /\/admin\.js\?v=20260624-clean/);
});

test("admin shell and admin assets are no-store to avoid stale login bundles", () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
  const headerMap = new Map(config.headers.map((rule) => [rule.source, rule.headers]));
  assert.deepEqual(headerMap.get("/admin/(.*)"), [
    { key: "Cache-Control", value: "no-store, must-revalidate" }
  ]);
  assert.deepEqual(headerMap.get("/admin.(js|css)"), [
    { key: "Cache-Control", value: "no-store, must-revalidate" }
  ]);
});

test("repository text has no forbidden ALWAFER misspellings", () => {
  const files = ["index.html", "config.js", "app.js", "admin.html", "admin.js", "README.md", "styles.css"];
  const forbidden = new RegExp([
    "Alwa" + "fir", "Alwa" + "far", "ALWA" + "FAR",
    "ALWA" + "FIR", "ALA" + "FER", "Ala" + "fir"
  ].join("|"));
  for (const file of files) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, file), "utf8"), forbidden, file);
  }
});
