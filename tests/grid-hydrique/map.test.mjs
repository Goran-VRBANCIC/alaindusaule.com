import test from "node:test";
import assert from "node:assert/strict";
import {
  createWaterMap,
  geoJsonBounds,
  selectFeatureAtMapCenter,
  toSelectedPointFeature,
} from "../../assets/js/grid-hydrique/map.mjs";
import {
  ZONE_FILL_SORT_KEY,
  ZONE_SOURCE_LAYER,
  ZONE_SOURCE_URL,
  zoneResourceFilter,
} from "../../assets/js/grid-hydrique/zones.mjs";
const departments = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [[[-5, 41], [-4, 41], [-4, 42], [-5, 41]]] },
      properties: {},
    },
    {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [[[8, 50], [9, 50], [9, 51], [8, 50]]] },
      properties: {},
    },
  ],
};

const theme = Object.freeze({
  ink: "ink-token",
  paper: "paper-token",
  water: "water-token",
  waterDeep: "water-deep-token",
  waterPale: "water-pale-token",
  stationHydro: "station-hydro-token",
  stationHydroStroke: "station-hydro-stroke-token",
  restrictions: Object.freeze({
    crise: "crise-token",
    alerte_renforcee: "renforcee-token",
    alerte: "alerte-token",
    vigilance: "vigilance-token",
    none: "none-token",
  }),
});

const animationFrames = [];
const requestFrame = (callback) => {
  animationFrames.push(callback);
  return animationFrames.length;
};
const flushAnimationFrame = async () => {
  animationFrames.shift()?.();
  await Promise.resolve();
};

class FakeResizeObserver {
  static instance;

  constructor(callback) {
    this.callback = callback;
    FakeResizeObserver.instance = this;
  }

  observe(target) {
    this.target = target;
  }

  trigger() {
    this.callback([{ target: this.target }]);
  }
}

function makeFakeMaplibre({ width = 800 } = {}) {
  class FakeMap {
    constructor(options) {
      this.options = options;
      this.zoom = 4.25;
      this.center = { lng: 2.2, lat: 46.4 };
      this.container = { clientWidth: width, clientHeight: 600 };
      this.calls = {
        addLayers: [],
        layerInsertions: [],
        addSources: [],
        fitBounds: [],
        minZoom: [],
        cameraForBounds: [],
        resize: 0,
        visibility: {},
        filters: {},
      };
      this.layers = new Map();
      this.sources = new Map();
      this.handlers = new Map();
    }

    addControl() {}
    addSource(id, source) { this.sources.set(id, source); this.calls.addSources.push({ id, source }); }
    getSource(id) { return this.sources.get(id); }
    addLayer(layer, beforeId) {
      this.layers.set(layer.id, layer);
      this.calls.addLayers.push(layer);
      this.calls.layerInsertions.push({ layer, beforeId });
    }
    getLayer(id) { return this.layers.get(id); }
    setLayoutProperty(id, property, value) { if (property === "visibility") this.calls.visibility[id] = value; }
    setFilter(id, filter) { this.calls.filters[id] = filter; }
    on(event, layerId, handler) { this.handlers.set(`${event}:${layerId}`, handler); }
    once(event, handler) { if (event === "load") handler(); }
    resize() { this.calls.resize += 1; }
    fitBounds(bounds, options) { this.calls.fitBounds.push({ bounds, options }); }
    getCanvas() { return { style: {}, setAttribute() {}, addEventListener() {} }; }
    getContainer() { return this.container; }
    getZoom() { return this.zoom; }
    getCenter() { return { ...this.center }; }
    setMinZoom(value) { this.calls.minZoom.push(value); }
    cameraForBounds(bounds, options) {
      this.calls.cameraForBounds.push({ bounds, options });
      return { zoom: this.getContainer().clientWidth < 576 ? 4.1 : 4.6 };
    }
  }

  class FakePMTiles {
    static instances = 0;

    constructor(url) { this.url = url; FakePMTiles.instances += 1; }
    async getHeader() { return { minZoom: 0, maxZoom: 12 }; }
  }

  class FakeProtocol {
    static instances = 0;

    constructor() { FakeProtocol.instances += 1; this.tile = () => {}; this.archives = []; }
    add(archive) { this.archives.push(archive); }
  }

  const maplibre = {
    Map: FakeMap,
    NavigationControl: class {},
    ScaleControl: class {},
    addProtocol() { maplibre.protocolRegistrations = (maplibre.protocolRegistrations || 0) + 1; },
  };
  return { maplibre, FakeMap, FakePMTiles, FakeProtocol };
}

function createTestWaterMap(options = {}) {
  const fake = makeFakeMaplibre(options);
  const waterMap = createWaterMap({
    theme,
    container: {},
    departments,
    piezoStations: [{ longitude: 1, latitude: 46 }],
    hydroStations: [{ longitude: 2, latitude: 47 }],
    onSelect() {},
    maplibre: fake.maplibre,
    ResizeObserverClass: options.ResizeObserverClass,
    requestFrame: options.requestFrame,
  });
  return { ...fake, waterMap };
}

test("geoJsonBounds englobe les polygones extrêmes", () => {
  assert.deepEqual(geoJsonBounds(departments), [[-5, 41], [9, 51]]);
});

test("createWaterMap recadre nationalement après resize", async () => {
  const { waterMap } = createTestWaterMap({ width: 400 });
  await waterMap.ready;

  assert.equal(waterMap.map.options.style.layers[0].paint["background-color"], "water-pale-token");
  assert.equal(waterMap.map.layers.get("departments-line").paint["line-color"], "paper-token");
  assert.equal(waterMap.map.layers.get("piezo-points").paint["circle-color"], "water-token");
  assert.equal(waterMap.map.layers.get("piezo-points").paint["circle-stroke-color"], "paper-token");
  assert.equal(waterMap.map.layers.get("hydro-points").paint["circle-color"], "station-hydro-token");
  assert.equal(waterMap.map.layers.get("hydro-points").paint["circle-stroke-color"], "station-hydro-stroke-token");
  assert.equal(waterMap.map.layers.get("selected-point-layer").paint["circle-color"], "paper-token");
  assert.equal(waterMap.map.layers.get("selected-point-layer").paint["circle-opacity"], 0);
  assert.equal(waterMap.map.layers.get("selected-point-layer").paint["circle-stroke-color"], "ink-token");
  assert.deepEqual(waterMap.map.layers.get("departments-fill").paint["fill-color"], [
    "match", ["get", "severity"],
    "crise", theme.restrictions.crise,
    "alerte_renforcee", theme.restrictions.alerte_renforcee,
    "alerte", theme.restrictions.alerte,
    "vigilance", theme.restrictions.vigilance,
    theme.restrictions.none,
  ]);
  assert.equal(Object.hasOwn(waterMap.map.options, "maxBounds"), false);
  assert.equal(waterMap.map.calls.resize, 1);
  assert.deepEqual(waterMap.map.calls.fitBounds[0], {
    bounds: [[-5, 41], [9, 51]],
    options: { padding: 20, duration: 0 },
  });
});

test("createWaterMap prépare le fond vert des zones sans restriction", async () => {
  const { waterMap } = createTestWaterMap();
  await waterMap.ready;

  const unrestrictedBackdrop = waterMap.map.layers.get("zones-none-fill");
  assert.ok(unrestrictedBackdrop);
  assert.equal(unrestrictedBackdrop.source, "departments");
  assert.equal(unrestrictedBackdrop.layout.visibility, "none");
  assert.equal(unrestrictedBackdrop.paint["fill-color"], theme.restrictions.none);
  assert.equal(unrestrictedBackdrop.paint["fill-opacity"], 1);
  assert.equal(
    waterMap.map.calls.layerInsertions.find(({ layer }) => layer.id === "zones-none-fill").beforeId,
    "departments-line",
  );
});

test("createWaterMap fixe un minZoom national et le resynchronise au resize", async () => {
  FakeResizeObserver.instance = undefined;
  const { waterMap, FakePMTiles, FakeProtocol } = createTestWaterMap({
    width: 800,
    ResizeObserverClass: FakeResizeObserver,
    requestFrame,
  });
  await waterMap.ready;

  assert.deepEqual(waterMap.map.calls.minZoom, [4.25]);
  assert.ok(FakeResizeObserver.instance);
  assert.equal(FakeResizeObserver.instance.target, waterMap.map.getContainer());

  const centerBefore = waterMap.map.getCenter();
  waterMap.map.getContainer().clientWidth = 400;
  FakeResizeObserver.instance.trigger();
  await flushAnimationFrame();

  assert.equal(waterMap.map.calls.fitBounds.length, 1);
  assert.deepEqual(waterMap.map.getCenter(), centerBefore);
  assert.equal(waterMap.map.calls.minZoom.at(-1), 4.1);
  assert.equal(waterMap.map.calls.cameraForBounds.length > 0, true);

  await waterMap.loadZoneLayers({ PMTiles: FakePMTiles, Protocol: FakeProtocol });
  assert.equal(waterMap.map.layers.get("zones-fill").paint["fill-color"].at(-1), "none-token");
});

test("createWaterMap sans ResizeObserver ne plante pas et garde la limite initiale", async () => {
  const { waterMap } = createTestWaterMap({
    width: 800,
    ResizeObserverClass: undefined,
    requestFrame,
  });
  await waterMap.ready;

  assert.equal(waterMap.map.calls.fitBounds.length, 1);
  assert.deepEqual(waterMap.map.calls.minZoom, [4.25]);
});

test("loadZoneLayers prépare les couches officielles une seule fois", async () => {
  const { waterMap, FakePMTiles, FakeProtocol, maplibre } = createTestWaterMap();
  await waterMap.ready;

  await waterMap.loadZoneLayers({ PMTiles: FakePMTiles, Protocol: FakeProtocol });
  await waterMap.loadZoneLayers({ PMTiles: FakePMTiles, Protocol: FakeProtocol });

  const calls = waterMap.map.calls;
  assert.equal(FakePMTiles.instances, 1);
  assert.equal(FakeProtocol.instances, 1);
  assert.equal(maplibre.protocolRegistrations, 1);
  assert.deepEqual(waterMap.map.sources.get("vigieau-zones"), {
    type: "vector",
    url: `pmtiles://${ZONE_SOURCE_URL}`,
  });
  const fill = calls.addLayers.find((layer) => layer.id === "zones-fill");
  const line = calls.addLayers.find((layer) => layer.id === "zones-line");
  assert.ok(fill);
  assert.ok(line);
  assert.equal(Object.hasOwn(fill, "filter"), false);
  assert.equal(Object.hasOwn(line, "filter"), false);
  assert.equal(calls.layerInsertions.find(({ layer }) => layer.id === "zones-fill").beforeId, "departments-line");
  assert.equal(calls.layerInsertions.find(({ layer }) => layer.id === "zones-line").beforeId, "departments-line");
  assert.equal(fill["source-layer"], ZONE_SOURCE_LAYER);
  assert.deepEqual(fill.layout["fill-sort-key"], ZONE_FILL_SORT_KEY);
  assert.deepEqual(fill.paint["fill-color"], [
    "match", ["get", "niveauGravite"],
    "crise", theme.restrictions.crise,
    "alerte_renforcee", theme.restrictions.alerte_renforcee,
    "alerte", theme.restrictions.alerte,
    "vigilance", theme.restrictions.vigilance,
    theme.restrictions.none,
  ]);
  assert.equal(fill.paint["fill-opacity"], 1);
});

test("setMapMode alterne les remplissages sans masquer les stations", async () => {
  const { waterMap, FakePMTiles, FakeProtocol } = createTestWaterMap();
  await waterMap.ready;
  await waterMap.loadZoneLayers({ PMTiles: FakePMTiles, Protocol: FakeProtocol });

  waterMap.setMapMode("zones");
  assert.equal(waterMap.map.calls.visibility["departments-fill"], "none");
  assert.equal(waterMap.map.calls.visibility["zones-none-fill"], "visible");
  assert.equal(waterMap.map.calls.visibility["zones-fill"], "visible");
  assert.equal(waterMap.map.calls.visibility["piezo-points"], undefined);
  assert.equal(waterMap.map.calls.visibility["hydro-points"], undefined);

  waterMap.setMapMode("departments");
  assert.equal(waterMap.map.calls.visibility["departments-fill"], "visible");
  assert.equal(waterMap.map.calls.visibility["zones-none-fill"], "none");
  assert.equal(waterMap.map.calls.visibility["zones-fill"], "none");
});

test("setZoneResource applique le filtre aux deux couches", async () => {
  const { waterMap, FakePMTiles, FakeProtocol } = createTestWaterMap();
  await waterMap.ready;
  await waterMap.loadZoneLayers({ PMTiles: FakePMTiles, Protocol: FakeProtocol });

  for (const resource of ["ALL", "SUP", "SOU", "AEP"]) {
    waterMap.setZoneResource(resource);
    assert.deepEqual(waterMap.map.calls.filters["zones-fill"], zoneResourceFilter(resource));
    assert.deepEqual(waterMap.map.calls.filters["zones-line"], zoneResourceFilter(resource));
  }
});

test("zones-fill est sélectionnable au clavier seulement quand elle existe", () => {
  let selected;
  const feature = {
    type: "Feature",
    layer: { id: "zones-fill" },
    geometry: { type: "Polygon", coordinates: [] },
    properties: {},
  };
  const map = {
    getCanvas: () => ({ clientWidth: 800, clientHeight: 600 }),
    getLayer: (id) => id === "zones-fill" ? {} : null,
    queryRenderedFeatures: (point, options) => {
      assert.deepEqual(options.layers, ["zones-fill"]);
      return [feature];
    },
    getCenter: () => ({ lng: 2, lat: 46 }),
  };

  assert.equal(selectFeatureAtMapCenter(map, (value) => { selected = value; }), true);
  assert.equal(selected.layerId, "zones-fill");
});

test("une couche zonale absente n’est jamais interrogée", () => {
  const map = {
    getCanvas: () => ({ clientWidth: 800, clientHeight: 600 }),
    getLayer: () => null,
    queryRenderedFeatures: (point, options) => {
      assert.deepEqual(options.layers, []);
      return [];
    },
  };

  assert.equal(selectFeatureAtMapCenter(map, () => {}), false);
});

test("toSelectedPointFeature réduit une feature MapLibre à des données sérialisables", () => {
  class RenderedFeature {
    constructor() {
      this.type = "Feature";
      this.geometry = { type: "Point", coordinates: [2.25, 46.44] };
      this.properties = { stationCode: "P1", niveauGravite: "crise" };
      this.layer = { id: "piezo-points" };
      this.source = "piezo-stations";
    }
  }

  const rendered = new RenderedFeature();
  const selected = toSelectedPointFeature(rendered);

  assert.equal(Object.getPrototypeOf(selected), Object.prototype);
  assert.deepEqual(selected, {
    type: "Feature",
    geometry: { type: "Point", coordinates: [2.25, 46.44] },
    properties: { stationCode: "P1", niveauGravite: "crise" },
  });
  assert.notEqual(selected, rendered);
  assert.notEqual(selected.geometry, rendered.geometry);
  assert.notEqual(selected.geometry.coordinates, rendered.geometry.coordinates);
  assert.notEqual(selected.properties, rendered.properties);
  assert.equal(Object.hasOwn(selected, "layer"), false);
  assert.equal(Object.hasOwn(selected, "source"), false);
});
