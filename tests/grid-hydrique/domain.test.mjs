import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRestrictionSummary,
  latestByStation,
  measurementFreshness,
  piezoObservationsToGeoJson,
  hydroObservationsToGeoJson,
} from "../../assets/js/grid-hydrique/domain.mjs";

test("buildRestrictionSummary compte chaque niveau officiel", () => {
  const result = buildRestrictionSummary([
    { code: "01", niveauGraviteMax: "crise" },
    { code: "02", niveauGraviteMax: "alerte_renforcee" },
    { code: "03", niveauGraviteMax: null },
  ]);

  assert.deepEqual(result, {
    total: 3,
    crise: 1,
    alerteRenforcee: 1,
    alerte: 0,
    vigilance: 0,
    sansRestriction: 1,
  });
});

test("latestByStation conserve la mesure la plus récente", () => {
  const values = latestByStation([
    { code_bss: "A", date_mesure: "2026-08-29T08:00:00Z" },
    { code_bss: "A", date_mesure: "2026-08-29T09:00:00Z" },
  ], "code_bss", "date_mesure");

  assert.equal(values.get("A").date_mesure, "2026-08-29T09:00:00Z");
});

test("measurementFreshness distingue frais, récent et ancien", () => {
  const now = new Date("2026-08-29T12:00:00Z");

  assert.equal(measurementFreshness("2026-08-29T08:00:00Z", now), "fresh");
  assert.equal(measurementFreshness("2026-08-27T08:00:00Z", now), "recent");
  assert.equal(measurementFreshness("2026-08-01T08:00:00Z", now), "stale");
});

test("piezoObservationsToGeoJson conserve la mesure récente et ignore les coordonnées invalides", () => {
  const now = new Date("2026-08-29T12:00:00Z");
  const result = piezoObservationsToGeoJson([
    { code_bss: "A", date_mesure: "2026-08-29T08:00:00Z", longitude: 2, latitude: 46, profondeur_nappe: 4.2 },
    { code_bss: "A", date_mesure: "2026-08-29T09:00:00Z", longitude: 2, latitude: 46, profondeur_nappe: 4.1 },
    { code_bss: "B", date_mesure: "2026-08-29T09:00:00Z", longitude: null, latitude: 46, profondeur_nappe: 3 },
  ], now);

  assert.equal(result.features.length, 1);
  assert.deepEqual(result.features[0].geometry.coordinates, [2, 46]);
  assert.deepEqual(result.features[0].properties, {
    kind: "piezo",
    stationCode: "A",
    measuredAt: "2026-08-29T09:00:00Z",
    value: 4.1,
    unit: "m",
    valueLabel: "Profondeur de la nappe",
    freshness: "fresh",
  });
});

test("hydroObservationsToGeoJson convertit les millimètres en mètres", () => {
  const result = hydroObservationsToGeoJson([
    { code_station: "H1", date_obs: "2026-08-29T11:55:00Z", longitude: 1, latitude: 45, resultat_obs: 895 },
  ], new Date("2026-08-29T12:00:00Z"));

  assert.equal(result.features.length, 1);
  assert.equal(result.features[0].properties.kind, "hydro");
  assert.equal(result.features[0].properties.stationCode, "H1");
  assert.equal(result.features[0].properties.value, 0.895);
  assert.equal(result.features[0].properties.unit, "m");
});
