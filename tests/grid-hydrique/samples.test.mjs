import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spatialSample } from "../../scripts/build-water-station-samples.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("spatialSample privilégie qualité puis couverture géographique", () => {
  const stations = [
    { code: "A", score: 100, longitude: 2, latitude: 46 },
    { code: "B", score: 90, longitude: 2.1, latitude: 46.1 },
    { code: "C", score: 80, longitude: -4, latitude: 48 },
  ];

  const result = spatialSample(
    stations,
    2,
    (station) => [station.longitude, station.latitude],
    (station) => station.score,
  );

  assert.deepEqual(result.map((station) => station.code), ["A", "C"]);
});

test("les fichiers générés contiennent les échantillons attendus", () => {
  const departments = JSON.parse(fs.readFileSync(path.join(projectRoot, "assets/data/departements-simplifies.geojson"), "utf8"));
  const piezo = JSON.parse(fs.readFileSync(path.join(projectRoot, "assets/data/piezo-stations.json"), "utf8"));
  const hydro = JSON.parse(fs.readFileSync(path.join(projectRoot, "assets/data/hydro-stations.json"), "utf8"));

  assert.equal(departments.features.length, 96);
  assert.equal(piezo.stations.length, 350);
  assert.equal(hydro.stations.length, 350);
  assert.equal(new Set(piezo.stations.map((station) => station.code)).size, 350);
  assert.equal(new Set(hydro.stations.map((station) => station.code)).size, 350);
  for (const station of [...piezo.stations, ...hydro.stations]) {
    assert.equal(Number.isFinite(station.longitude), true);
    assert.equal(Number.isFinite(station.latitude), true);
  }
});
