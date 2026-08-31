import test from "node:test";
import assert from "node:assert/strict";
import {
  readThemeColors,
  restrictionColor,
  syncBrowserThemeColor,
} from "../assets/js/theme.mjs";

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
