"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

class FakeElement {
  constructor(tag, id = "") {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.children = [];
    this.listeners = {};
    this.attributes = {};
    this.parentNode = null;
    this.hidden = false;
    this.disabled = false;
    this.checked = false;
    this.value = "";
    this.type = "";
    this.className = "";
    this.textContent = "";
    this.innerText = "";
    this.classList = {
      toggle: (cls, force) => {
        const names = new Set(String(this.className || "").split(/\s+/).filter(Boolean));
        if (force) names.add(cls);
        else names.delete(cls);
        this.className = Array.from(names).join(" ");
      }
    };
  }
  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    this.innerText = this.children.map((item) => item.textContent || item.innerText || "").join("\n");
    return child;
  }
  removeChild(child) {
    this.children = this.children.filter((item) => item !== child);
    child.parentNode = null;
    return child;
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name]; }
  addEventListener(type, listener) {
    (this.listeners[type] ||= []).push(listener);
  }
  dispatch(type, event = {}) {
    for (const listener of this.listeners[type] || []) listener.call(this, event);
  }
}

function response(status, body) {
  return { status, json: () => Promise.resolve(body) };
}

async function flush(times = 6) {
  for (let index = 0; index < times; index += 1) await Promise.resolve();
}

function makeHarness(fetchHandler) {
  const ids = [
    "login-view", "login-form", "login-account", "login-password", "login-btn", "login-msg",
    "editor-view", "user-chip", "owner-control-link", "logout-btn", "save-btn", "reset-btn",
    "export-btn", "import-btn", "import-file", "editor-lead", "profile-tabs", "profile-title",
    "profile-editor", "links-title", "links-editor", "regions-title", "regions-editor",
    "preview-bar-links", "toasts"
  ];
  const elements = new Map(ids.map((id) => [id, new FakeElement("div", id)]));
  elements.get("login-form").tagName = "FORM";
  elements.get("login-btn").tagName = "BUTTON";
  elements.get("login-btn").textContent = "Sign in";
  elements.get("login-account").tagName = "SELECT";
  elements.get("login-password").tagName = "INPUT";
  elements.get("editor-view").hidden = true;

  const timers = [];
  const calls = [];
  const document = {
    readyState: "complete",
    body: new FakeElement("body"),
    getElementById(id) { return elements.get(id) || null; },
    createElement(tag) { return new FakeElement(tag); },
    addEventListener() {},
    querySelector(selector) {
      if (selector.startsWith("#")) return elements.get(selector.slice(1)) || null;
      return null;
    }
  };
  const context = {
    document,
    location: { pathname: "/admin/alwafer/", search: "", href: "https://alwafer-link-hub.vercel.app/admin/alwafer/" },
    history: { replaceState() {} },
    URL,
    Blob,
    FileReader: function FileReader() {},
    AbortController,
    setTimeout(fn, ms) {
      timers.push({ fn, ms });
      return timers.length;
    },
    clearTimeout() {},
    fetch(url, opts = {}) {
      calls.push({ url, opts });
      return fetchHandler(url, opts, calls);
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, "admin.js"), "utf8"), context);
  return {
    elements,
    timers,
    calls,
    $(id) { return elements.get(id); },
    submit() {
      elements.get("login-form").dispatch("submit", { preventDefault() {} });
    }
  };
}

const ownerUser = {
  displayName: "ALWAFER",
  role: "owner",
  allowedProfiles: ["mustafa", "ahmed", "hala"],
  canEditRegions: true
};

test("successful login stops spinner and renders the editor immediately", async () => {
  const h = makeHarness((url, opts) => {
    if (url.endsWith("/me/")) return Promise.resolve(response(200, { authenticated: false, configured: true, canSave: false }));
    if (url.endsWith("/login/")) return Promise.resolve(response(200, { ok: true, user: ownerUser }));
    if (url.endsWith("/settings/")) return Promise.resolve(response(200, {
      settings: null,
      perms: { profiles: ["mustafa", "ahmed", "hala"], regions: true },
      user: ownerUser,
      canSave: true
    }));
    throw new Error(`unexpected ${url}`);
  });
  await flush(20);

  h.$("login-password").value = "correct";
  h.submit();
  await flush(20);

  assert.equal(h.$("editor-view").hidden, false);
  assert.equal(h.$("login-view").hidden, true);
  assert.equal(h.$("login-btn").disabled, false);
  assert.equal(h.$("login-btn").textContent, "Sign in");
  assert.equal(h.$("login-msg").textContent, "");
});

test("wrong password stops spinner and shows visible error", async () => {
  const h = makeHarness((url) => {
    if (url.endsWith("/me/")) return Promise.resolve(response(200, { authenticated: false, configured: true, canSave: false }));
    if (url.endsWith("/login/")) return Promise.resolve(response(401, { error: "invalid_credentials" }));
    throw new Error(`unexpected ${url}`);
  });
  await flush(20);

  h.$("login-password").value = "wrong";
  h.submit();
  await flush(20);

  assert.equal(h.$("editor-view").hidden, true);
  assert.equal(h.$("login-btn").disabled, false);
  assert.equal(h.$("login-btn").textContent, "Sign in");
  assert.equal(h.$("login-msg").textContent, "Incorrect account or password.");
});

test("network failure stops spinner and shows visible error", async () => {
  const h = makeHarness((url) => {
    if (url.endsWith("/me/")) return Promise.resolve(response(200, { authenticated: false, configured: true, canSave: false }));
    if (url.endsWith("/login/")) return Promise.reject(new Error("network down"));
    throw new Error(`unexpected ${url}`);
  });
  await flush(20);

  h.$("login-password").value = "correct";
  h.submit();
  await flush(20);

  assert.equal(h.$("editor-view").hidden, true);
  assert.equal(h.$("login-btn").disabled, false);
  assert.equal(h.$("login-btn").textContent, "Sign in");
  assert.equal(h.$("login-msg").textContent, "Login failed. Please try again.");
});

test("login timeout aborts after 8 seconds, stops spinner, and shows visible error", async () => {
  const h = makeHarness((url, opts) => {
    if (url.endsWith("/me/")) return Promise.resolve(response(200, { authenticated: false, configured: true, canSave: false }));
    if (url.endsWith("/login/")) {
      return new Promise((resolve, reject) => {
        opts.signal.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
      });
    }
    throw new Error(`unexpected ${url}`);
  });
  await flush(20);

  h.$("login-password").value = "correct";
  h.submit();
  await flush();

  assert.equal(h.$("login-btn").disabled, true);
  assert.equal(h.$("login-btn").textContent, "Signing in…");
  assert.equal(h.timers.at(-1).ms, 8000);
  h.timers.at(-1).fn();
  await flush();

  assert.equal(h.$("editor-view").hidden, true);
  assert.equal(h.$("login-btn").disabled, false);
  assert.equal(h.$("login-btn").textContent, "Sign in");
  assert.equal(h.$("login-msg").textContent, "Login timed out. Please try again.");
});
