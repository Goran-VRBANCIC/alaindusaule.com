import test from "node:test";
import assert from "node:assert/strict";
import { buildLineChartModel } from "../../assets/js/grid-hydrique/chart.mjs";

test("buildLineChartModel trie, filtre et trace une série", () => {
  const model = buildLineChartModel([
    { date: "2026-08-29T10:00:00Z", value: 2 },
    { date: "2026-08-29T08:00:00Z", value: 1 },
    { date: "2026-08-29T09:00:00Z", value: "invalide" },
  ], 600, 240);

  assert.equal(model.points.length, 2);
  assert.equal(model.points[0].date, "2026-08-29T08:00:00Z");
  assert.match(model.path, /^M[\d.]+,[\d.]+ L[\d.]+,[\d.]+$/);
  assert.equal(model.minimum, 1);
  assert.equal(model.maximum, 2);
});

test("buildLineChartModel gère une série constante", () => {
  const model = buildLineChartModel([
    { date: "2026-08-29T08:00:00Z", value: 4 },
    { date: "2026-08-29T09:00:00Z", value: 4 },
  ], 600, 240);

  assert.equal(model.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)), true);
  assert.match(model.path, /^M/);
});

test("buildLineChartModel réduit une longue série à 600 points", () => {
  const values = Array.from({ length: 1000 }, (_, index) => ({
    date: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
    value: index,
  }));
  const model = buildLineChartModel(values, 600, 240);

  assert.equal(model.points.length, 600);
  assert.equal(model.points[0].value, 0);
  assert.equal(model.points.at(-1).value, 999);
});
