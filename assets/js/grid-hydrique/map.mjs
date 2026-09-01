// @ts-check

import {
  ZONE_FILL_SORT_KEY,
  ZONE_SOURCE_LAYER,
  ZONE_SOURCE_URL,
  zoneResourceFilter,
} from "./zones.mjs";
import {
  NATIONAL_CORRIDORS,
  REGIONAL_HUBS,
  REGIONAL_LINKS,
  restrictionExpression,
} from "./simulation.mjs";

const EMPTY_FEATURE_COLLECTION = Object.freeze({ type: "FeatureCollection", features: [] });

export function stationsToGeoJson(stations) {
  return {
    type: "FeatureCollection",
    features: stations.map((station) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [station.longitude, station.latitude] },
      properties: { ...station },
    })),
  };
}

export function toSelectedPointFeature(feature) {
  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [...feature.geometry.coordinates],
    },
    properties: { ...(feature.properties || {}) },
  };
}

export function geoJsonBounds(collection) {
  const bounds = [[Infinity, Infinity], [-Infinity, -Infinity]];
  const visit = (coordinates) => {
    if (typeof coordinates?.[0] === "number" && typeof coordinates?.[1] === "number") {
      bounds[0][0] = Math.min(bounds[0][0], coordinates[0]);
      bounds[0][1] = Math.min(bounds[0][1], coordinates[1]);
      bounds[1][0] = Math.max(bounds[1][0], coordinates[0]);
      bounds[1][1] = Math.max(bounds[1][1], coordinates[1]);
      return;
    }
    coordinates?.forEach(visit);
  };
  collection.features.forEach((feature) => visit(feature.geometry?.coordinates));
  return bounds;
}

function nationalPadding(width) {
  return width < 576 ? 20 : 36;
}

export function selectFeatureAtMapCenter(map, onSelect, includeStations = true) {
  const canvas = map.getCanvas();
  const layerIds = [
    ...(includeStations ? ["hydro-points", "piezo-points"] : []),
    "zones-fill",
    "departments-fill",
  ]
    .filter((layerId) => map.getLayer(layerId));
  const features = map.queryRenderedFeatures(
    [canvas.clientWidth / 2, canvas.clientHeight / 2],
    { layers: layerIds },
  );
  const feature = features[0];
  const layerId = feature?.layer?.id;
  if (!feature || !layerId) return false;
  const center = map.getCenter();
  const coordinates = feature.geometry.type === "Point"
    ? feature.geometry.coordinates
    : [center.lng, center.lat];
  if (feature.geometry.type === "Point") {
    map.getSource("selected-point").setData({
      type: "FeatureCollection",
      features: [toSelectedPointFeature(feature)],
    });
  }
  onSelect({ layerId, feature, coordinates });
  return true;
}

export function createWaterMap({
  container,
  departments,
  piezoStations,
  hydroStations,
  theme,
  onSelect,
  maplibre = globalThis.maplibregl,
  ResizeObserverClass = globalThis.ResizeObserver,
  requestFrame = globalThis.requestAnimationFrame,
  reportError = console.error,
}) {
  if (!maplibre) throw new Error("MapLibre est indisponible");

  const map = new maplibre.Map({
    container,
    center: [2.2, 46.4],
    minZoom: 3,
    style: {
      version: 8,
      sources: {},
      layers: [{ id: "background", type: "background", paint: { "background-color": theme.waterPale } }],
    },
  });

  map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
  map.addControl(new maplibre.ScaleControl({ unit: "metric" }), "bottom-left");

  const nationalBounds = departments.features.length > 0 ? geoJsonBounds(departments) : null;
  let resizeFrame;
  let nationalResizeObserver;
  let zoneProtocol;
  let simulationPhase = null;
  let simulationAvailable = true;
  const stationVisibility = { "piezo-points": true, "hydro-points": true };
  const stationLayerIds = new Set(Object.keys(stationVisibility));

  function applyNationalMinZoom() {
    if (!nationalBounds || !map.cameraForBounds || !map.setMinZoom || !map.getContainer) return;
    const camera = map.cameraForBounds(nationalBounds, {
      padding: nationalPadding(map.getContainer().clientWidth),
    });
    if (Number.isFinite(camera?.zoom)) map.setMinZoom(camera.zoom);
  }

  function scheduleNationalMinZoom() {
    if (resizeFrame !== undefined) return;
    const schedule = requestFrame || ((callback) => globalThis.setTimeout(callback, 0));
    resizeFrame = schedule(() => {
      resizeFrame = undefined;
      map.resize?.();
      applyNationalMinZoom();
    });
  }

  function registerSelectableLayer(layerId) {
    map.on("mouseenter", layerId, () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", layerId, () => { map.getCanvas().style.cursor = ""; });
    map.on("click", layerId, (event) => {
      if (simulationPhase && stationLayerIds.has(layerId)) return;
      const feature = event.features?.[0];
      if (!feature) return;
      const coordinates = feature.geometry.type === "Point"
        ? feature.geometry.coordinates
        : [event.lngLat.lng, event.lngLat.lat];
      if (feature.geometry.type === "Point") {
        map.getSource("selected-point").setData({
          type: "FeatureCollection",
          features: [toSelectedPointFeature(feature)],
        });
      }
      onSelect({ layerId, feature, coordinates });
    });
  }

  async function loadZoneLayers({ PMTiles, Protocol }) {
    if (map.getSource("vigieau-zones")) return;
    const archive = new PMTiles(ZONE_SOURCE_URL);
    await archive.getHeader();
    if (!zoneProtocol) {
      zoneProtocol = new Protocol();
      zoneProtocol.add(archive);
      maplibre.addProtocol("pmtiles", zoneProtocol.tile);
    }
    map.addSource("vigieau-zones", {
      type: "vector",
      url: `pmtiles://${ZONE_SOURCE_URL}`,
    });
    map.addLayer({
      id: "zones-fill",
      type: "fill",
      source: "vigieau-zones",
      "source-layer": ZONE_SOURCE_LAYER,
      layout: { visibility: "none", "fill-sort-key": ZONE_FILL_SORT_KEY },
      paint: {
        "fill-color": restrictionExpression("niveauGravite", simulationPhase, theme.restrictions),
        "fill-opacity": 1,
      },
    }, map.getLayer("grid-local-lines") ? "grid-local-lines" : "departments-line");
    map.addLayer({
      id: "zones-line",
      type: "line",
      source: "vigieau-zones",
      "source-layer": ZONE_SOURCE_LAYER,
      layout: { visibility: "none" },
      paint: { "line-color": theme.paper, "line-width": 1 },
    }, "departments-line");
    registerSelectableLayer("zones-fill");
  }

  function addSimulationLayers() {
    map.addSource("grid-regional-links-source", { type: "geojson", data: REGIONAL_LINKS });
    map.addSource("grid-regional-hubs-source", { type: "geojson", data: REGIONAL_HUBS });
    map.addSource("grid-national-corridors-source", { type: "geojson", data: NATIONAL_CORRIDORS });
    map.addLayer({
      id: "grid-local-lines",
      type: "line",
      source: "departments",
      layout: { visibility: "none" },
      paint: { "line-color": theme.waterDeep, "line-width": 2, "line-dasharray": [2, 2] },
    }, "departments-line");
    map.addLayer({
      id: "grid-regional-links",
      type: "line",
      source: "grid-regional-links-source",
      layout: { visibility: "none" },
      paint: { "line-color": theme.water, "line-width": 3 },
    }, "departments-line");
    map.addLayer({
      id: "grid-regional-hubs",
      type: "circle",
      source: "grid-regional-hubs-source",
      layout: { visibility: "none" },
      paint: {
        "circle-color": theme.waterDeep,
        "circle-radius": 4,
        "circle-stroke-color": theme.paper,
        "circle-stroke-width": 1,
      },
    }, "departments-line");
    map.addLayer({
      id: "grid-national-corridors",
      type: "line",
      source: "grid-national-corridors-source",
      layout: { visibility: "none" },
      paint: { "line-color": theme.ink, "line-width": 5, "line-dasharray": [3, 1] },
    }, "departments-line");
  }

  const ready = new Promise((resolve) => {
    map.once("load", () => {
      map.addSource("departments", { type: "geojson", data: departments });
      map.addSource("piezo-stations", { type: "geojson", data: stationsToGeoJson(piezoStations) });
      map.addSource("hydro-stations", { type: "geojson", data: stationsToGeoJson(hydroStations) });
      map.addSource("selected-point", { type: "geojson", data: EMPTY_FEATURE_COLLECTION });

      map.addLayer({
        id: "departments-fill",
        type: "fill",
        source: "departments",
        paint: {
          "fill-color": restrictionExpression("severity", null, theme.restrictions),
          "fill-opacity": 1,
        },
      });
      map.addLayer({
        id: "departments-line",
        type: "line",
        source: "departments",
        paint: { "line-color": theme.paper, "line-width": 1 },
      });
      map.addLayer({
        id: "zones-none-fill",
        type: "fill",
        source: "departments",
        layout: { visibility: "none" },
        paint: {
          "fill-color": theme.restrictions.none,
          "fill-opacity": 1,
        },
      }, "departments-line");
      try {
        addSimulationLayers();
      } catch (error) {
        reportError(error);
        simulationAvailable = false;
      }
      map.addLayer({
        id: "piezo-points",
        type: "circle",
        source: "piezo-stations",
        paint: {
          "circle-color": theme.water,
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 3, 8, 6],
          "circle-stroke-color": theme.paper,
          "circle-stroke-width": 1,
        },
      });
      map.addLayer({
        id: "hydro-points",
        type: "circle",
        source: "hydro-stations",
        paint: {
          "circle-color": theme.stationHydro,
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 3, 8, 6],
          "circle-stroke-color": theme.stationHydroStroke,
          "circle-stroke-width": 2,
        },
      });
      map.addLayer({
        id: "selected-point-layer",
        type: "circle",
        source: "selected-point",
        paint: {
          "circle-color": theme.paper,
          "circle-opacity": 0,
          "circle-radius": 10,
          "circle-stroke-color": theme.ink,
          "circle-stroke-width": 3,
        },
      });

      for (const layerId of ["departments-fill", "piezo-points", "hydro-points"]) {
        registerSelectableLayer(layerId);
      }

      const canvas = map.getCanvas();
      canvas.setAttribute("aria-describedby", "map-keyboard-instructions");
      canvas.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && selectFeatureAtMapCenter(map, onSelect, !simulationPhase)) event.preventDefault();
      });

      if (nationalBounds && map.resize && map.fitBounds && map.getContainer) {
        map.resize();
        map.fitBounds(nationalBounds, {
          padding: nationalPadding(map.getContainer().clientWidth),
          duration: 0,
        });
        if (map.setMinZoom && map.getZoom) map.setMinZoom(map.getZoom());

        if (ResizeObserverClass) {
          nationalResizeObserver = new ResizeObserverClass(scheduleNationalMinZoom);
          nationalResizeObserver.observe(map.getContainer());
        } else {
          globalThis.addEventListener?.("resize", scheduleNationalMinZoom);
        }
      }

      resolve();
    });
  });

  return {
    map,
    ready,
    loadZoneLayers,
    setDepartments(data) { map.getSource("departments")?.setData(data); },
    setStations(kind, data) { map.getSource(`${kind}-stations`)?.setData(data); },
    setLayerVisibility(layerId, visible) {
      if (stationLayerIds.has(layerId)) stationVisibility[layerId] = visible;
      const effectiveVisibility = simulationPhase && stationLayerIds.has(layerId) ? false : visible;
      if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", effectiveVisibility ? "visible" : "none");
    },
    isSimulationAvailable() { return simulationAvailable; },
    setSimulationPhase(phase) {
      if (phase && !simulationAvailable) return false;
      simulationPhase = phase;
      map.setPaintProperty(
        "departments-fill",
        "fill-color",
        restrictionExpression("severity", phase, theme.restrictions),
      );
      if (map.getLayer("zones-fill")) {
        map.setPaintProperty(
          "zones-fill",
          "fill-color",
          restrictionExpression("niveauGravite", phase, theme.restrictions),
        );
      }
      map.getSource("selected-point")?.setData?.(EMPTY_FEATURE_COLLECTION);
      map.setLayoutProperty("selected-point-layer", "visibility", phase ? "none" : "visible");
      for (const layerId of stationLayerIds) {
        map.setLayoutProperty(
          layerId,
          "visibility",
          phase || !stationVisibility[layerId] ? "none" : "visible",
        );
      }
      const phaseNumber = phase ? Number(phase.slice(-1)) : 0;
      const networkVisibility = {
        "grid-local-lines": phaseNumber >= 1,
        "grid-regional-links": phaseNumber >= 2,
        "grid-regional-hubs": phaseNumber >= 2,
        "grid-national-corridors": phaseNumber >= 3,
      };
      for (const [layerId, visible] of Object.entries(networkVisibility)) {
        if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
      }
      return true;
    },
    setMapMode(mode) {
      const zonesVisible = mode === "zones";
      map.setLayoutProperty("departments-fill", "visibility", zonesVisible ? "none" : "visible");
      map.setLayoutProperty("zones-none-fill", "visibility", zonesVisible ? "visible" : "none");
      for (const layerId of ["zones-fill", "zones-line"]) {
        if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", zonesVisible ? "visible" : "none");
      }
    },
    setZoneResource(resource) {
      const filter = zoneResourceFilter(resource);
      for (const layerId of ["zones-fill", "zones-line"]) {
        if (map.getLayer(layerId)) map.setFilter(layerId, filter);
      }
    },
    onMoveEnd(handler) { map.on("moveend", handler); },
    getBounds() {
      const bounds = map.getBounds();
      return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
    },
    getZoom() { return map.getZoom(); },
  };
}
