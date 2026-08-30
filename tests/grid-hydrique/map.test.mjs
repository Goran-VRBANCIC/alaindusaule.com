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
import { restrictionColor } from "../../assets/js/grid-hydrique/templates.mjs";

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

function makeFakeMaplibre({ width = 800 } = {}) {
  class FakeMap {
    constructor(options) {
      this.options = options;
      this.calls = {
        addLayers: [],
        layerInsertions: [],
        addSources: [],
        fitBounds: [],
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
    getContainer() { return { clientWidth: width }; }
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
    container: {},
    departments,
    piezoStations: [{ longitude: 1, latitude: 46 }],
    hydroStations: [{ longitude: 2, latitude: 47 }],
    onSelect() {},
    maplibre: fake.maplibre,
  });
  return { ...fake, waterMap };
}

test("geoJsonBounds englobe les polygones extrêmes", () => {
  assert.deepEqual(geoJsonBounds(departments), [[-5, 41], [9, 51]]);
});

test("createWaterMap recadre nationalement après resize", async () => {
  const { waterMap } = createTestWaterMap({ width: 400 });
  await waterMap.ready;

  assert.equal(Object.hasOwn(waterMap.map.options, "maxBounds"), false);
  assert.equal(waterMap.map.calls.resize, 1);
  assert.deepEqual(waterMap.map.calls.fitBounds[0], {
    bounds: [[-5, 41], [9, 51]],
    options: { padding: 20, duration: 0 },
  });
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
  assert.equal(calls.layerInsertions.find(({ layer }) => layer.id === "zones-fill").beforeId, "piezo-points");
  assert.equal(calls.layerInsertions.find(({ layer }) => layer.id === "zones-line").beforeId, "piezo-points");
  assert.equal(fill["source-layer"], ZONE_SOURCE_LAYER);
  assert.deepEqual(fill.layout["fill-sort-key"], ZONE_FILL_SORT_KEY);
  assert.deepEqual(fill.paint["fill-color"], [
    "match", ["get", "niveauGravite"],
    "crise", restrictionColor("crise"),
    "alerte_renforcee", restrictionColor("alerte_renforcee"),
    "alerte", restrictionColor("alerte"),
    "vigilance", restrictionColor("vigilance"),
    restrictionColor(null),
  ]);
  assert.equal(fill.paint["fill-opacity"], 1);
});

test("setMapMode alterne les remplissages sans masquer les stations", async () => {
  const { waterMap, FakePMTiles, FakeProtocol } = createTestWaterMap();
  await waterMap.ready;
  await waterMap.loadZoneLayers({ PMTiles: FakePMTiles, Protocol: FakeProtocol });

  waterMap.setMapMode("zones");
  assert.equal(waterMap.map.calls.visibility["departments-fill"], "none");
  assert.equal(waterMap.map.calls.visibility["zones-fill"], "visible");
  assert.equal(waterMap.map.calls.visibility["piezo-points"], undefined);
  assert.equal(waterMap.map.calls.visibility["hydro-points"], undefined);

  waterMap.setMapMode("departments");
  assert.equal(waterMap.map.calls.visibility["departments-fill"], "visible");
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
