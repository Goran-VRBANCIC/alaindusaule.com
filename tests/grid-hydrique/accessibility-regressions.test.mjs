import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildLineChartModel } from "../../assets/js/grid-hydrique/chart.mjs";
import { piezoObservationsToGeoJson } from "../../assets/js/grid-hydrique/domain.mjs";
import { createWaterMap, selectFeatureAtMapCenter } from "../../assets/js/grid-hydrique/map.mjs";
import { renderHydroDetail, renderPiezoDetail, renderSourceDates } from "../../assets/js/grid-hydrique/templates.mjs";

test("les mesures visibles conservent les métadonnées des stations", () => {
  const metadata = new Map([["P1", { name: "Piézomètre test", commune: "Orléans" }]]);
  const result = piezoObservationsToGeoJson([
    { code_bss: "P1", date_mesure: "2026-08-29T08:00:00Z", longitude: 1.9, latitude: 47.9, profondeur_nappe: 2.4 },
  ], new Date("2026-08-29T12:00:00Z"), metadata);

  assert.equal(result.features[0].properties.name, "Piézomètre test");
  assert.equal(result.features[0].properties.commune, "Orléans");
});

test("le calque départemental reste complètement opaque", async () => {
  class FakeMap {
    constructor() {
      this.layers = new Map();
      this.sources = new Map();
    }

    addControl() {}
    addSource(id, source) { this.sources.set(id, source); }
    addLayer(layer) { this.layers.set(layer.id, layer); }
    on() {}
    once(event, callback) { if (event === "load") callback(); }
    getCanvas() { return { style: {}, setAttribute() {}, addEventListener() {} }; }
  }

  const waterMap = createWaterMap({
    container: {},
    departments: { type: "FeatureCollection", features: [] },
    piezoStations: [],
    hydroStations: [],
    onSelect() {},
    maplibre: { Map: FakeMap, NavigationControl: class {}, ScaleControl: class {} },
  });

  await waterMap.ready;
  assert.equal(waterMap.map.layers.get("departments-fill").paint["fill-opacity"], 1);
});

test("les détails de station indiquent le lieu et la fraîcheur", () => {
  const piezo = renderPiezoDetail({ stationCode: "P1", commune: "Orléans", freshness: "fresh", measuredAt: "2026-08-29T08:00:00Z" });
  const hydro = renderHydroDetail({ stationCode: "H1", commune: "Tours", watercourse: "La Loire", freshness: "recent", measuredAt: "2026-08-27T08:00:00Z" });

  assert.match(piezo, /Orléans/);
  assert.match(piezo, /moins de 24 heures/);
  assert.match(hydro, /La Loire/);
  assert.match(hydro, /moins de 7 jours/);
});

test("le modèle de graphique fournit des libellés d’axes", () => {
  const model = buildLineChartModel([
    { date: "2026-08-28T08:00:00Z", value: 1 },
    { date: "2026-08-29T08:00:00Z", value: 2 },
  ], 600, 240);

  assert.deepEqual(model.xAxisLabels, ["28/08/2026", "29/08/2026"]);
  assert.deepEqual(model.yAxisLabels, ["1", "2"]);
});

test("Entrée sélectionne au clavier l’élément visible au centre", () => {
  const feature = {
    type: "Feature",
    layer: { id: "hydro-points" },
    geometry: { type: "Point", coordinates: [2, 46] },
    properties: { stationCode: "H1" },
  };
  let selected;
  const map = {
    getCanvas: () => ({ clientWidth: 800, clientHeight: 600 }),
    getLayer: (id) => ["hydro-points", "piezo-points", "departments-fill"].includes(id) ? {} : null,
    queryRenderedFeatures: (point, options) => {
      assert.deepEqual(point, [400, 300]);
      assert.deepEqual(options.layers, ["hydro-points", "piezo-points", "departments-fill"]);
      return [feature];
    },
    getCenter: () => ({ lng: 2.1, lat: 46.1 }),
    getSource: () => ({ setData: () => {} }),
  };

  assert.equal(selectFeatureAtMapCenter(map, (value) => { selected = value; }), true);
  assert.equal(selected.layerId, "hydro-points");
  assert.deepEqual(selected.coordinates, [2, 46]);
});

test("le résumé distingue la date de chaque source", () => {
  const html = renderSourceDates({
    vigieau: "29 août 2026 à 15:00",
    piezo: "29 août 2026 à 14:00",
    hydro: "29 août 2026 à 14:55",
  });

  assert.match(html, /VigiEau consulté : 29 août 2026 à 15:00/);
  assert.match(html, /Hub’Eau nappes : 29 août 2026 à 14:00/);
  assert.match(html, /Hub’Eau cours d’eau : 29 août 2026 à 14:55/);
});

test("le dashboard conserve les catalogues nationaux et fusionne les mesures du viewport", () => {
  const source = fs.readFileSync(
    new URL("../../assets/js/grid-hydrique/dashboard.mjs", import.meta.url),
    "utf8",
  );
  const lowZoomStart = source.indexOf('if (waterMap.getZoom() < 6) {');
  assert.notEqual(lowZoomStart, -1);
  let depth = 0;
  let lowZoomEnd = -1;
  for (let index = lowZoomStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        lowZoomEnd = index + 1;
        break;
      }
    }
  }
  assert.notEqual(lowZoomEnd, -1);
  const lowZoomBlock = source.slice(lowZoomStart, lowZoomEnd);

  assert.match(source, /import\s*\{[\s\S]*mergeStationMeasurements[\s\S]*\}\s*from\s*"\.\/domain\.mjs"/);
  assert.match(source, /piezoStationData\s*=\s*mergeStationMeasurements\(/);
  assert.match(source, /hydroStationData\s*=\s*mergeStationMeasurements\(/);
  assert.doesNotMatch(source, /\bstaticPiezoData\b/);
  assert.doesNotMatch(source, /\bstaticHydroData\b/);
  assert.doesNotMatch(lowZoomBlock, /setStations\(["'](?:piezo|hydro)["']/);
  assert.match(source, /piezoStationData\s*=\s*stationsToGeoJson\(piezoReference\.stations\)/);
  assert.match(source, /hydroStationData\s*=\s*stationsToGeoJson\(hydroReference\.stations\)/);
});
