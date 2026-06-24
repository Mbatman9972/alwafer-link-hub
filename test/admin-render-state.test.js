"use strict";

// Guards for the editor-not-visible-after-login fix (RED_ALWAFER_EDITOR_NOT_VISIBLE).
// Root cause: .login-view sets display:grid, which overrode the [hidden] attribute,
// so the login card stayed on screen while diagnostics reported UI state = editor.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const adminCss = fs.readFileSync(path.join(root, "admin.css"), "utf8");
const adminHtml = fs.readFileSync(path.join(root, "admin.html"), "utf8");
const adminJs = fs.readFileSync(path.join(root, "admin.js"), "utf8");

test("admin.css forces the hidden attribute to win over per-view display rules", () => {
  // The exact root-cause fix: a [hidden] view must collapse even when a class
  // such as .login-view sets display:grid.
  assert.match(adminCss, /\.view\[hidden\]\s*\{\s*display:\s*none\s*!important;?\s*\}/);
  // Sanity: the per-view rule that caused the regression is still present, so we
  // are genuinely overriding it rather than having silently removed it.
  assert.match(adminCss, /\.login-view\s*\{[^}]*display:\s*grid/);
});

test("admin.html exposes stable, single login/editor selectors", () => {
  assert.match(adminHtml, /id="login-view"[^>]*data-admin-login="true"/);
  assert.match(adminHtml, /id="editor-view"[^>]*data-admin-editor="true"/);
  // Exactly one of each so the debug selector counts are unambiguous.
  assert.equal((adminHtml.match(/data-admin-login="true"/g) || []).length, 1);
  assert.equal((adminHtml.match(/data-admin-editor="true"/g) || []).length, 1);
  // The editor starts hidden; JS reveals it only after a confirmed session.
  assert.match(adminHtml, /id="editor-view"[^>]*\shidden/);
});

test("admin.js routes every view switch through the explicit setView state machine", () => {
  assert.match(adminJs, /function setView\(view\)/);
  // setView must drive both the attribute and the class for each view.
  assert.match(adminJs, /login\.hidden = editorActive; login\.classList\.toggle\("hidden", editorActive\);/);
  assert.match(adminJs, /editor\.hidden = !editorActive; editor\.classList\.toggle\("hidden", !editorActive\);/);
  // No code path may toggle the view .hidden attribute directly anymore.
  assert.doesNotMatch(adminJs, /\$\("login-view"\)\.hidden\s*=/);
  assert.doesNotMatch(adminJs, /\$\("editor-view"\)\.hidden\s*=/);
  // showEditor scrolls to the top after rendering.
  assert.match(adminJs, /window\.scrollTo\(0, 0\)/);
});

test("admin.js debug panel reports live DOM truth and a bumped build", () => {
  assert.match(adminJs, /ADMIN_BUILD_VERSION = "owner-debug-2026-06-24-v2"/);
  assert.match(adminJs, /debugRow\("login visible"/);
  assert.match(adminJs, /debugRow\("editor visible"/);
  assert.match(adminJs, /debugRow\("editor selector count"/);
  assert.match(adminJs, /debugRow\("login selector count"/);
  assert.match(adminJs, /querySelectorAll\('\[data-admin-editor="true"\]'\)/);
  assert.match(adminJs, /querySelectorAll\('\[data-admin-login="true"\]'\)/);
});
