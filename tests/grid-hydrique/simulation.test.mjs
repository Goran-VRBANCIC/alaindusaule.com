import test from "node:test";
import assert from "node:assert/strict";
import {
  GRID_PHASES,
  NATIONAL_CORRIDORS,
  REGIONAL_HUBS,
  REGIONAL_LINKS,
  restrictionExpression,
  simulateSeverity,
} from "../../assets/js/grid-hydrique/simulation.mjs";

const colors = {
  crise: "crise",
  alerte_renforcee: "renforcee",
  alerte: "alerte",
  vigilance: "vigilance",
  none: "none",
};

test("la phase 1 réduit chaque niveau d’un cran avec un plancher vert", () => {
  assert.equal(simulateSeverity("crise", "phase1"), "alerte_renforcee");
  assert.equal(simulateSeverity("alerte", "phase1"), "vigilance");
  assert.equal(simulateSeverity("none", "phase1"), "none");
});

test("la phase 2 réduit chaque niveau de deux crans", () => {
  assert.equal(simulateSeverity("crise", "phase2"), "alerte");
  assert.equal(simulateSeverity("alerte", "phase2"), "none");
});

test("la phase 3 rend tout niveau vert", () => {
  for (const level of ["crise", "alerte_renforcee", "alerte", "vigilance", "none", "inconnu"]) {
    assert.equal(simulateSeverity(level, "phase3"), "none");
  }
});

test("les niveaux inconnus restent au repli sans restriction", () => {
  assert.equal(simulateSeverity(undefined, "phase1"), "none");
  assert.equal(simulateSeverity("inconnu", "phase2"), "none");
});

test("l’expression MapLibre reflète exactement la fonction de domaine", () => {
  assert.deepEqual(restrictionExpression("severity", "phase1", colors), [
    "match", ["get", "severity"],
    "crise", "renforcee",
    "alerte_renforcee", "alerte",
    "alerte", "vigilance",
    "vigilance", "none",
    "none",
  ]);
  assert.equal(restrictionExpression("niveauGravite", "phase3", colors), "none");
});

test("les phases et le réseau schématique sont complets et nommés", () => {
  assert.deepEqual(Object.keys(GRID_PHASES), ["phase1", "phase2", "phase3"]);
  assert.equal(REGIONAL_HUBS.type, "FeatureCollection");
  assert.ok(REGIONAL_HUBS.features.length >= 8);
  assert.equal(REGIONAL_LINKS.type, "FeatureCollection");
  assert.deepEqual(
    NATIONAL_CORRIDORS.features.map((feature) => feature.properties.name),
    ["Massif Central → Sud-Ouest", "Normandie → Centre"],
  );
});
