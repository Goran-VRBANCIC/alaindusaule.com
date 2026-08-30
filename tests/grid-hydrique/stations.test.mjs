import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildStationUrls,
  isMetropolitanDepartment,
  stationReferenceDate,
} from "../../scripts/build-water-stations.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("le périmètre conserve uniquement les départements métropolitains", () => {
  for (const code of ["01", "19", "2A", "2B", "21", "75", "95"]) {
    assert.equal(isMetropolitanDepartment(code), true);
  }
  for (const code of [null, "20", "971", "972", "973", "974", "976"]) {
    assert.equal(isMetropolitanDepartment(code), false);
  }
});

test("la date de recherche piézométrique absorbe sept jours de publication", () => {
  assert.equal(stationReferenceDate(new Date("2026-08-30T12:00:00Z")), "2026-08-23");
});

test("les URLs demandent les stations actives sans plafond d’échantillon", () => {
  const urls = buildStationUrls(new Date("2026-08-30T12:00:00Z"));
  assert.match(urls.piezo, /date_recherche=2026-08-23/);
  assert.match(urls.hydro, /en_service=true/);
  assert.doesNotMatch(urls.piezo + urls.hydro, /nb_mesures_piezo_min/);

  const piezoUrl = new URL(urls.piezo);
  const hydroUrl = new URL(urls.hydro);
  assert.equal(Number(piezoUrl.searchParams.get("size")) >= 10000, true);
  assert.equal(Number(hydroUrl.searchParams.get("size")) >= 10000, true);

  const source = fs.readFileSync(
    path.join(projectRoot, "scripts/build-water-stations.mjs"),
    "utf8",
  );
  assert.doesNotMatch(source, /\bSAMPLE_SIZE\b/);
  assert.doesNotMatch(source, /\bspatialSample\b/);
});

test("les fichiers générés contiennent les stations attendues", () => {
  const piezo = JSON.parse(fs.readFileSync(path.join(projectRoot, "assets/data/piezo-stations.json"), "utf8"));
  const hydro = JSON.parse(fs.readFileSync(path.join(projectRoot, "assets/data/hydro-stations.json"), "utf8"));

  assert.ok(piezo.stations.length > 350);
  assert.ok(hydro.stations.length > 350);
  assert.equal(new Set(piezo.stations.map(({ code }) => code)).size, piezo.stations.length);
  assert.equal(new Set(hydro.stations.map(({ code }) => code)).size, hydro.stations.length);
  assert.deepEqual(
    piezo.stations.map(({ code }) => code),
    piezo.stations.map(({ code }) => code).toSorted((a, b) => a.localeCompare(b, "fr")),
  );
  assert.deepEqual(
    hydro.stations.map(({ code }) => code),
    hydro.stations.map(({ code }) => code).toSorted((a, b) => a.localeCompare(b, "fr")),
  );
  for (const station of [...piezo.stations, ...hydro.stations]) {
    assert.equal(isMetropolitanDepartment(station.departmentCode), true);
    assert.equal(Number.isFinite(station.longitude), true);
    assert.equal(Number.isFinite(station.latitude), true);
  }
});
