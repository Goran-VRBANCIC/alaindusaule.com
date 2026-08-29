// @ts-check

import { createWaterApi } from "./api.mjs";
import {
  buildRestrictionSummary,
  hydroObservationsToGeoJson,
  piezoObservationsToGeoJson,
} from "./domain.mjs";
import { createWaterMap, stationsToGeoJson } from "./map.mjs";
import { escapeHtml, renderKpis, renderStatus } from "./templates.mjs";

const api = createWaterApi();
const statusElement = document.querySelector("[data-water-status]");
const kpiElement = document.querySelector("[data-kpi-grid]");
const detailElement = document.querySelector("#station-detail");
const layerControlsElement = document.querySelector(".water-layer-controls");
let waterMap;
let viewportController;
let staticPiezoData;
let staticHydroData;

function joinDepartmentRestrictions(geoJson, restrictions) {
  const restrictionsByCode = new Map(restrictions.map((item) => [item.code, item]));
  return {
    ...geoJson,
    features: geoJson.features.map((feature) => {
      const restriction = restrictionsByCode.get(feature.properties.code);
      return {
        ...feature,
        properties: {
          ...feature.properties,
          severity: restriction?.niveauGraviteMax || "none",
          region: restriction?.region || "",
        },
      };
    }),
  };
}

async function loadLocalJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Donnée locale indisponible : ${url}`);
  return response.json();
}

function formatUpdateTime(date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function setupLayerControls() {
  if (!layerControlsElement || !waterMap) return;
  layerControlsElement.innerHTML = `
    <label class="water-layer-toggle"><input type="checkbox" data-layer-toggle="piezo-points" checked> Piézomètres</label>
    <label class="water-layer-toggle"><input type="checkbox" data-layer-toggle="hydro-points" checked> Cours d’eau</label>
  `;
  layerControlsElement.querySelectorAll("[data-layer-toggle]").forEach((input) => {
    input.addEventListener("change", () => {
      waterMap.setLayerVisibility(input.dataset.layerToggle, input.checked);
    });
  });
}

async function refreshViewportData() {
  if (!waterMap || !statusElement) return;
  viewportController?.abort();

  if (waterMap.getZoom() < 6) {
    waterMap.setStations("piezo", staticPiezoData);
    waterMap.setStations("hydro", staticHydroData);
    statusElement.textContent = "Zoomez pour charger les mesures récentes.";
    return;
  }

  viewportController = new AbortController();
  const signal = viewportController.signal;
  const fromDate = new Date();
  fromDate.setUTCDate(fromDate.getUTCDate() - 2);
  statusElement.textContent = "Chargement des mesures visibles…";

  const [piezoResult, hydroResult] = await Promise.allSettled([
    api.getPiezoViewport(waterMap.getBounds(), formatIsoDate(fromDate), signal),
    api.getHydroViewport(waterMap.getBounds(), fromDate.toISOString(), signal),
  ]);

  if (signal.aborted) return;
  let partial = false;
  if (piezoResult.status === "fulfilled") {
    waterMap.setStations("piezo", piezoObservationsToGeoJson(piezoResult.value.data));
    partial ||= Boolean(piezoResult.value.next);
  } else {
    partial = true;
  }
  if (hydroResult.status === "fulfilled") {
    waterMap.setStations("hydro", hydroObservationsToGeoJson(hydroResult.value.data));
    partial ||= Boolean(hydroResult.value.next);
  } else {
    partial = true;
  }

  statusElement.textContent = partial
    ? "Mesures visibles actualisées — échantillon partiel."
    : "Mesures visibles actualisées.";
}

function showSelection(selection) {
  if (!detailElement) return;
  const properties = selection.feature.properties || {};
  const title = properties.nom || properties.name || properties.code || "Détail";
  detailElement.innerHTML = `<h2 id="detail-title">${escapeHtml(title)}</h2><p>Les données détaillées seront chargées depuis la source officielle.</p>`;
}

async function initializeDashboard() {
  if (!statusElement || !kpiElement) return;
  statusElement.textContent = renderStatus("loading", "");

  try {
    const [departmentsGeoJson, piezoSample, hydroSample, restrictions] = await Promise.all([
      loadLocalJson("../assets/data/departements-simplifies.geojson"),
      loadLocalJson("../assets/data/piezo-stations.json"),
      loadLocalJson("../assets/data/hydro-stations.json"),
      api.getDepartments(),
    ]);
    const now = new Date();
    const departments = joinDepartmentRestrictions(departmentsGeoJson, restrictions);
    kpiElement.innerHTML = renderKpis(buildRestrictionSummary(restrictions), formatUpdateTime(now));
    staticPiezoData = stationsToGeoJson(piezoSample.stations);
    staticHydroData = stationsToGeoJson(hydroSample.stations);
    waterMap = createWaterMap({
      container: "carte-hydrique",
      departments,
      piezoStations: piezoSample.stations,
      hydroStations: hydroSample.stations,
      onSelect: showSelection,
    });
    await waterMap.ready;
    setupLayerControls();
    waterMap.onMoveEnd(refreshViewportData);
    statusElement.textContent = renderStatus("success", `Données actualisées à ${formatUpdateTime(now)}`);
  } catch (error) {
    console.error(error);
    statusElement.textContent = renderStatus("error", "Réessayez dans quelques instants.");
  }
}

initializeDashboard();
