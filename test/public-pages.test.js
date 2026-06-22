"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const pages = [
  { route: "alwafer", image: "page-alwafer.png", key: "mustafa", left: "15.0", width: "69.0" },
  { route: "ahmed", image: "page-ahmed.png", key: "ahmed", left: "14.5", width: "70.4" },
  { route: "hala", image: "page-hala.png", key: "hala", left: "14.7", width: "70.0" }
];

for (const page of pages) {
  test(`${page.route} keeps one artwork image and a 13-hotspot inline renderer`, () => {
    const html = fs.readFileSync(path.join(root, page.route, "index.html"), "utf8");
    assert.equal((html.match(/<img class="profile-art"/g) || []).length, 1);
    assert.match(html, new RegExp(`/assets/${page.image.replace(".", "\\.")}`));
    assert.match(html, new RegExp(`var KEY="${page.key}"`));
    assert.match(html, new RegExp(`BTN_LEFT=${page.left},BTN_W=${page.width}`));
    assert.match(html, /\["mena","uk","fr","de","tr","cca"\]/);
    assert.match(html, /\[\["youtube","YouTube"\].*\["website","Website"\]\]/);
    assert.match(html, /a\.setAttribute\("aria-disabled","true"\)/);
    assert.match(html, /a\.target="_blank";a\.rel="noopener noreferrer"/);
    assert.doesNotMatch(html, /<script[^>]+src=/i);
    assert.doesNotMatch(html, /profile-card|social-grid/i);
  });
}

test("canonical URLs retain trailing slashes", () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
  assert.equal(config.trailingSlash, true);
  assert.deepEqual(config.rewrites.map((rule) => rule.source), [
    "/admin/alwafer/", "/admin/ahmed/", "/admin/hala/"
  ]);
  assert.ok(config.rewrites.every((rule) => rule.destination === "/admin/"));
});

test("admin renders the required owner identity wording", () => {
  const js = fs.readFileSync(path.join(root, "admin.js"), "utf8");
  assert.match(js, /state\.user\.role === "owner" \? " owner" : ""/);
});

test("repository text has no forbidden ALWAFER misspellings", () => {
  const files = ["index.html", "config.js", "app.js", "admin.html", "admin.js", "README.md"];
  const forbidden = new RegExp([
    "Alwa" + "fir", "Alwa" + "far", "ALWA" + "FAR",
    "ALWA" + "FIR", "ALA" + "FER", "Ala" + "fir"
  ].join("|"));
  for (const file of files) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, file), "utf8"), forbidden, file);
  }
});
