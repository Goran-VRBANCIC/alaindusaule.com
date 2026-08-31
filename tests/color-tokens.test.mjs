import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function applicationSources(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return applicationSources(absolutePath);
    return /\.(?:css|js|mjs|html)$/.test(entry.name) ? [absolutePath] : [];
  });
}

const sourceFiles = [
  ...applicationSources(path.join(root, "assets/css")),
  ...applicationSources(path.join(root, "assets/js")),
  path.join(root, "index.html"),
  path.join(root, "404.html"),
  path.join(root, "grid-hydrique/index.html"),
  path.join(root, "presse.html"),
  path.join(root, "mentions-legales.html"),
  path.join(root, "livres/leau-ou-le-chaos.html"),
];
const colorLiteral = /(?<!&)#[0-9a-f]{3,8}\b/i;

test("les codes couleur applicatifs sont uniques et déclarés dans :root", () => {
  const sitePath = path.join(root, "assets/css/site.css");
  const siteCss = fs.readFileSync(sitePath, "utf8");
  const rootBlock = siteCss.match(/:root\s*\{([\s\S]*?)\}/);
  assert.ok(rootBlock, "Le bloc :root est absent");

  const tokenValues = rootBlock[1].match(new RegExp(colorLiteral.source, "gi")) || [];
  assert.equal(new Set(tokenValues.map((value) => value.toLowerCase())).size, tokenValues.length);
  assert.doesNotMatch(rootBlock[1], /\brgba?\(/i);

  for (const absolutePath of sourceFiles) {
    const content = fs.readFileSync(absolutePath, "utf8");
    const inspected = absolutePath === sitePath
      ? content.replace(rootBlock[0], ":root {}")
      : content;
    assert.doesNotMatch(inspected, colorLiteral, path.relative(root, absolutePath));
    assert.doesNotMatch(inspected, /\brgba?\(/i, path.relative(root, absolutePath));
  }
});

