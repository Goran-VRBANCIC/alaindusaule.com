import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRestrictionSummary,
  latestByStation,
  measurementFreshness,
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
