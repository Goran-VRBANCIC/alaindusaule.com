// @ts-check

import { restrictionColor } from "./templates.mjs";
import {
  ZONE_FILL_SORT_KEY,
  ZONE_SOURCE_LAYER,
  ZONE_SOURCE_URL,
  zoneResourceFilter,
} from "./zones.mjs";

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

export function selectFeatureAtMapCenter(map, onSelect) {
  const canvas = map.getCanvas();
  const layerIds = ["hydro-points", "piezo-points", "zones-fill", "departments-fill"]
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

export function createWaterMap({ container, departments, piezoStations, hydroStations, onSelect, maplibre = globalThis.maplibregl }) {
  if (!maplibre) throw new Error("MapLibre est indisponible");

  const map = new maplibre.Map({
    container,
    center: [2.2, 46.4],
    minZoom: 3,
    style: {
      version: 8,
      sources: {},
      layers: [{ id: "background", type: "background", paint: { "background-color": "#e9f2f5" } }],
    },
  });

  map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
  map.addControl(new maplibre.ScaleControl({ unit: "metric" }), "bottom-left");

  let zoneProtocol;

  function registerSelectableLayer(layerId) {
    map.on("mouseenter", layerId, () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", layerId, () => { map.getCanvas().style.cursor = ""; });
    map.on("click", layerId, (event) => {
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
        "fill-color": [
          "match", ["get", "niveauGravite"],
          "crise", restrictionColor("crise"),
          "alerte_renforcee", restrictionColor("alerte_renforcee"),
          "alerte", restrictionColor("alerte"),
          "vigilance", restrictionColor("vigilance"),
          restrictionColor(null),
        ],
        "fill-opacity": 1,
      },
    }, "departments-line");
    map.addLayer({
      id: "zones-line",
      type: "line",
      source: "vigieau-zones",
      "source-layer": ZONE_SOURCE_LAYER,
      layout: { visibility: "none" },
      paint: { "line-color": "#ffffff", "line-width": 1 },
    }, "departments-line");
    registerSelectableLayer("zones-fill");
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
          "fill-color": [
            "match", ["get", "severity"],
            "crise", restrictionColor("crise"),
            "alerte_renforcee", restrictionColor("alerte_renforcee"),
            "alerte", restrictionColor("alerte"),
            "vigilance", restrictionColor("vigilance"),
            restrictionColor(null),
          ],
          "fill-opacity": 1,
        },
      });
      map.addLayer({
        id: "departments-line",
        type: "line",
        source: "departments",
        paint: { "line-color": "#ffffff", "line-width": 1 },
      });
      map.addLayer({
        id: "piezo-points",
        type: "circle",
        source: "piezo-stations",
        paint: {
          "circle-color": "#0b5c7a",
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 3, 8, 6],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1,
        },
      });
      map.addLayer({
        id: "hydro-points",
        type: "circle",
        source: "hydro-stations",
        paint: {
          "circle-color": "#477328",
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 3, 8, 6],
          "circle-stroke-color": "#17370f",
          "circle-stroke-width": 2,
        },
      });
      map.addLayer({
        id: "selected-point-layer",
        type: "circle",
        source: "selected-point",
        paint: {
          "circle-color": "transparent",
          "circle-radius": 10,
          "circle-stroke-color": "#231f20",
          "circle-stroke-width": 3,
        },
      });

      for (const layerId of ["departments-fill", "piezo-points", "hydro-points"]) {
        registerSelectableLayer(layerId);
      }

      const canvas = map.getCanvas();
      canvas.setAttribute("aria-describedby", "map-keyboard-instructions");
      canvas.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && selectFeatureAtMapCenter(map, onSelect)) event.preventDefault();
      });

      if (map.resize && map.fitBounds && map.getContainer && departments.features.length > 0) {
        map.resize();
        map.fitBounds(geoJsonBounds(departments), {
          padding: nationalPadding(map.getContainer().clientWidth),
          duration: 0,
        });
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
      if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
    },
    setMapMode(mode) {
      const zonesVisible = mode === "zones";
      map.setLayoutProperty("departments-fill", "visibility", zonesVisible ? "none" : "visible");
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
