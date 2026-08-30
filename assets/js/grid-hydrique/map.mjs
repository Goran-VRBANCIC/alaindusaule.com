// @ts-check

import { restrictionColor } from "./templates.mjs";

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

export function selectFeatureAtMapCenter(map, onSelect) {
  const canvas = map.getCanvas();
  const features = map.queryRenderedFeatures(
    [canvas.clientWidth / 2, canvas.clientHeight / 2],
    { layers: ["hydro-points", "piezo-points", "departments-fill"] },
  );
  const feature = features[0];
  const layerId = feature?.layer?.id;
  if (!feature || !layerId) return false;
  const center = map.getCenter();
  const coordinates = feature.geometry.type === "Point"
    ? feature.geometry.coordinates
    : [center.lng, center.lat];
  if (feature.geometry.type === "Point") {
    map.getSource("selected-point").setData({ type: "FeatureCollection", features: [feature] });
  }
  onSelect({ layerId, feature, coordinates });
  return true;
}

export function createWaterMap({ container, departments, piezoStations, hydroStations, onSelect, maplibre = globalThis.maplibregl }) {
  if (!maplibre) throw new Error("MapLibre est indisponible");

  const map = new maplibre.Map({
    container,
    center: [2.2, 46.4],
    zoom: 4.6,
    minZoom: 4,
    maxBounds: [[-6, 40.5], [10.5, 52]],
    style: {
      version: 8,
      sources: {},
      layers: [{ id: "background", type: "background", paint: { "background-color": "#e9f2f5" } }],
    },
  });

  map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
  map.addControl(new maplibre.ScaleControl({ unit: "metric" }), "bottom-left");

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
        map.on("mouseenter", layerId, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", layerId, () => { map.getCanvas().style.cursor = ""; });
        map.on("click", layerId, (event) => {
          const feature = event.features?.[0];
          if (!feature) return;
          const coordinates = feature.geometry.type === "Point"
            ? feature.geometry.coordinates
            : [event.lngLat.lng, event.lngLat.lat];
          if (feature.geometry.type === "Point") {
            map.getSource("selected-point").setData({ type: "FeatureCollection", features: [feature] });
          }
          onSelect({ layerId, feature, coordinates });
        });
      }

      const canvas = map.getCanvas();
      canvas.setAttribute("aria-describedby", "map-keyboard-instructions");
      canvas.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && selectFeatureAtMapCenter(map, onSelect)) event.preventDefault();
      });

      resolve();
    });
  });

  return {
    map,
    ready,
    setDepartments(data) { map.getSource("departments")?.setData(data); },
    setStations(kind, data) { map.getSource(`${kind}-stations`)?.setData(data); },
    setLayerVisibility(layerId, visible) {
      if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
    },
    onMoveEnd(handler) { map.on("moveend", handler); },
    getBounds() {
      const bounds = map.getBounds();
      return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
    },
    getZoom() { return map.getZoom(); },
  };
}
