const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const scriptPath = path.join(__dirname, "..", "assets", "js", "contact.js");
assert.ok(fs.existsSync(scriptPath), "contact.js should exist");
const source = fs.readFileSync(scriptPath, "utf8");
const handlers = [];
let linkDefaultPrevented = false;
const buttons = [
  {
    dataset: {},
    addEventListener(type, handler) {
      assert.equal(type, "click");
      handlers.push(handler);
    },
  },
  {
    dataset: { contactSubject: "Demande presse — L’eau ou le chaos" },
    addEventListener(type, handler) {
      assert.equal(type, "click");
      handlers.push(handler);
    },
  },
  {
    dataset: {},
    href: "#contact",
    addEventListener(type, handler) {
      assert.equal(type, "click");
      handlers.push(handler);
    },
  },
];
const sandbox = {
  document: { querySelectorAll: () => buttons },
  window: { location: { href: "" } },
};

vm.runInNewContext(source, sandbox);
assert.equal(handlers.length, 3);

handlers[0]({ preventDefault() {} });
assert.match(sandbox.window.location.href, /^mailto:[^@]+@[^?]+$/);

handlers[1]({ preventDefault() {} });
assert.match(sandbox.window.location.href, /^mailto:[^@]+@[^?]+\?subject=Demande%20presse/);

handlers[2]({
  preventDefault() {
    linkDefaultPrevented = true;
  },
});
assert.equal(linkDefaultPrevented, true);
assert.match(sandbox.window.location.href, /^mailto:[^@]+@[^?]+$/);
assert.doesNotMatch(source, /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);

console.log("Contact script validation succeeded.");
