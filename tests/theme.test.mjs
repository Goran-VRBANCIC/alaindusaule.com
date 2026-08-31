import test from "node:test";
import assert from "node:assert/strict";
import {
  readThemeColors,
  restrictionColor,
  syncBrowserThemeColor,
} from "../assets/js/theme.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sitePages = [
  { file: "index.html", script: "assets/js/theme-color.mjs" },
  { file: "404.html", script: "assets/js/theme-color.mjs" },
  { file: "grid-hydrique/index.html", script: "../assets/js/theme-color.mjs" },
  { file: "presse.html", script: "assets/js/theme-color.mjs" },
  { file: "mentions-legales.html", script: "assets/js/theme-color.mjs" },
  { file: "livres/leau-ou-le-chaos.html", script: "../assets/js/theme-color.mjs" },
];

const values = new Map([
  ["--ink", "ink-token"],
  ["--paper", "paper-token"],
  ["--water", "water-token"],
  ["--water-deep", "water-deep-token"],
  ["--water-pale", "water-pale-token"],
  ["--station-hydro", "station-hydro-token"],
  ["--station-hydro-stroke", "station-hydro-stroke-token"],
  ["--restriction-crise", "crise-token"],
  ["--restriction-alerte-renforcee", "renforcee-token"],
  ["--restriction-alerte", "alerte-token"],
  ["--restriction-vigilance", "vigilance-token"],
  ["--restriction-none", "none-token"],
]);
const styles = { getPropertyValue: (name) => values.get(name) || "" };

test("readThemeColors résout les tokens CSS nécessaires à MapLibre", () => {
  const colors = readThemeColors(styles);
  assert.equal(colors.ink, "ink-token");
  assert.equal(colors.paper, "paper-token");
  assert.equal(colors.waterPale, "water-pale-token");
  assert.equal(colors.stationHydro, "station-hydro-token");
  assert.equal(colors.restrictions.alerte_renforcee, "renforcee-token");
  assert.equal(restrictionColor("crise", colors), "crise-token");
  assert.equal(restrictionColor(null, colors), "none-token");
});

test("readThemeColors nomme le token CSS absent", () => {
  assert.throws(
    () => readThemeColors({ getPropertyValue: () => "" }),
    /--ink/,
  );
});

test("syncBrowserThemeColor alimente la meta depuis le token", () => {
  const attributes = new Map();
  const meta = { setAttribute: (name, value) => attributes.set(name, value) };
  const documentObject = { querySelector: () => meta };
  assert.equal(syncBrowserThemeColor(documentObject, styles), true);
  assert.equal(attributes.get("content"), "water-deep-token");
});

test("les pages HTML référencent theme-color sans contenu codé en dur", () => {
  for (const { file, script } of sitePages) {
    const html = fs.readFileSync(path.join(root, file), "utf8");
    const meta = html.match(/<meta\b[^>]*name="theme-color"[^>]*>/i);
    assert.ok(meta, `${file} doit contenir une meta theme-color`);
    assert.doesNotMatch(meta[0], /\bcontent=/i, `${file} ne doit pas coder de theme-color en dur`);
    assert.match(
      html,
      new RegExp(`<script\\b[^>]*type="module"[^>]*src="${script.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>\\s*<\\/script>`, "i"),
      `${file} doit charger theme-color.mjs avec un chemin relatif correct`,
    );
  }
});
