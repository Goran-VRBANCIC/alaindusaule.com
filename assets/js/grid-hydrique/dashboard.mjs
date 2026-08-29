// @ts-check

import { createWaterApi } from "./api.mjs";
import { buildLineChartModel, renderLineChart } from "./chart.mjs";
import {
  buildRestrictionSummary,
  hydroObservationsToGeoJson,
  piezoObservationsToGeoJson,
} from "./domain.mjs";
import { createWaterMap, stationsToGeoJson } from "./map.mjs";
import {
  renderDepartmentDetail,
  renderHydroDetail,
  renderKpis,
  renderPiezoDetail,
  renderStatus,
} from "./templates.mjs";

const REFRESH_INTERVAL_MS = 15 * 60 * 1000;
const api = createWaterApi();
const statusElement = document.querySelector("[data-water-status]");
const kpiElement = document.querySelector("[data-kpi-grid]");
const detailElement = document.querySelector("#station-detail");
const layerControlsElement = document.querySelector(".water-layer-controls");
const refreshButton = document.querySelector("[data-refresh-water]");

let waterMap;
let viewportController;
let staticPiezoData;
let staticHydroData;
let selectionController;
let departmentsGeoJson;
let lastRestrictions = null;
let lastSuccessfulRefresh = 0;
let refreshTimer;
let refreshInProgress = false;

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

async function refreshNationalData() {
  const restrictions = await api.getDepartments();
  const now = new Date();
  lastRestrictions = restrictions;
  waterMap.setDepartments(joinDepartmentRestrictions(departmentsGeoJson, restrictions));
  kpiElement.innerHTML = renderKpis(buildRestrictionSummary(restrictions), formatUpdateTime(now));
}

async function refreshViewportData(announce = false) {
  if (!waterMap || !statusElement) return { partial: false, message: "" };
  viewportController?.abort();

  if (waterMap.getZoom() < 6) {
    waterMap.setStations("piezo", staticPiezoData);
    waterMap.setStations("hydro", staticHydroData);
    if (announce) statusElement.textContent = "Zoomez pour charger les mesures récentes.";
    return { partial: false, message: "" };
  }

  viewportController = new AbortController();
  const signal = viewportController.signal;
  const fromDate = new Date();
  fromDate.setUTCDate(fromDate.getUTCDate() - 2);
  if (announce) statusElement.textContent = "Chargement des mesures visibles…";

  const [piezoResult, hydroResult] = await Promise.allSettled([
    api.getPiezoViewport(waterMap.getBounds(), formatIsoDate(fromDate), signal),
    api.getHydroViewport(waterMap.getBounds(), fromDate.toISOString(), signal),
  ]);
  if (signal.aborted) return { partial: true, message: "Actualisation annulée." };

  const unavailable = [];
  let truncated = false;
  if (piezoResult.status === "fulfilled") {
    waterMap.setStations("piezo", piezoObservationsToGeoJson(piezoResult.value.data));
    truncated ||= Boolean(piezoResult.value.next);
  } else {
    unavailable.push("piézométrie");
  }
  if (hydroResult.status === "fulfilled") {
    waterMap.setStations("hydro", hydroObservationsToGeoJson(hydroResult.value.data));
    truncated ||= Boolean(hydroResult.value.next);
  } else {
    unavailable.push("hydrométrie");
  }

  const partial = unavailable.length > 0 || truncated;
  const message = unavailable.length > 0
    ? `${unavailable.join(" et ")} temporairement indisponible${unavailable.length > 1 ? "s" : ""}.`
    : truncated ? "Échantillon limité aux 5 000 mesures les plus récentes." : "Mesures visibles actualisées.";
  if (announce) statusElement.textContent = renderStatus(partial ? "partial" : "success", message);
  return { partial, message };
}

async function runRefresh() {
  if (refreshInProgress || document.hidden || !waterMap) return;
  refreshInProgress = true;
  if (refreshButton) refreshButton.disabled = true;
  if (statusElement) statusElement.textContent = renderStatus("loading", "");

  const [nationalResult, viewportResult] = await Promise.allSettled([
    refreshNationalData(),
    refreshViewportData(false),
  ]);
  const failures = [];
  if (nationalResult.status === "rejected") failures.push("restrictions nationales");
  if (viewportResult.status === "rejected") failures.push("mesures visibles");
  const viewportPartial = viewportResult.status === "fulfilled" && viewportResult.value.partial;

  if (failures.length === 0 && !viewportPartial) {
    lastSuccessfulRefresh = Date.now();
    statusElement.textContent = renderStatus("success", `Données actualisées à ${formatUpdateTime(new Date())}`);
  } else if (failures.length < 2 || viewportPartial) {
    if (nationalResult.status === "fulfilled") lastSuccessfulRefresh = Date.now();
    const details = [
      ...failures,
      viewportPartial ? viewportResult.value.message : "",
    ].filter(Boolean).join(" — ");
    statusElement.textContent = renderStatus("partial", details);
  } else {
    statusElement.textContent = renderStatus("error", "Réessayez dans quelques instants.", Boolean(lastRestrictions));
  }

  refreshInProgress = false;
  if (refreshButton) refreshButton.disabled = false;
  scheduleRefresh();
}

function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(runRefresh, REFRESH_INTERVAL_MS);
}

async function showSelection(selection) {
  if (!detailElement) return;
  selectionController?.abort();
  selectionController = new AbortController();
  const signal = selectionController.signal;
  const properties = selection.feature.properties || {};
  detailElement.focus({ preventScroll: false });

  if (selection.layerId === "departments-fill") {
    detailElement.innerHTML = renderDepartmentDetail(properties, []);
    try {
      const zones = await api.getLocalRestrictions(selection.coordinates[0], selection.coordinates[1], signal);
      if (!signal.aborted) detailElement.innerHTML = renderDepartmentDetail(properties, zones);
    } catch (error) {
      if (!signal.aborted) {
        console.error(error);
        detailElement.insertAdjacentHTML("beforeend", '<p class="data-error">Restrictions locales temporairement indisponibles.</p>');
      }
    }
    return;
  }

  const kind = selection.layerId === "piezo-points" ? "piezo" : "hydro";
  detailElement.innerHTML = kind === "piezo"
    ? renderPiezoDetail(properties)
    : renderHydroDetail(properties);
  const stationCode = properties.stationCode || properties.code;
  const chartContainer = detailElement.querySelector("[data-chart]");
  if (!stationCode || !chartContainer) return;

  try {
    const fromDate = new Date();
    fromDate.setUTCDate(fromDate.getUTCDate() - (kind === "piezo" ? 90 : 7));
    const response = kind === "piezo"
      ? await api.getPiezoHistory(stationCode, formatIsoDate(fromDate), signal)
      : await api.getHydroHistory(stationCode, fromDate.toISOString(), signal);
    if (signal.aborted) return;
    const values = response.data.map((observation) => kind === "piezo"
      ? {
          date: observation.date_mesure,
          value: Number.isFinite(observation.profondeur_nappe)
            ? observation.profondeur_nappe
            : observation.niveau_eau_ngf,
        }
      : { date: observation.date_obs, value: observation.resultat_obs / 1000 });
    renderLineChart(
      chartContainer,
      buildLineChartModel(values, 600, 240),
      kind === "piezo" ? "Évolution du niveau de la nappe" : "Évolution de la hauteur d’eau",
    );
  } catch (error) {
    if (!signal.aborted) {
      console.error(error);
      chartContainer.textContent = "Chronique temporairement indisponible.";
    }
  }
}

async function initializeDashboard() {
  if (!statusElement || !kpiElement || !refreshButton) return;
  statusElement.textContent = renderStatus("loading", "");

  try {
    const [loadedDepartments, piezoSample, hydroSample] = await Promise.all([
      loadLocalJson("../assets/data/departements-simplifies.geojson"),
      loadLocalJson("../assets/data/piezo-stations.json"),
      loadLocalJson("../assets/data/hydro-stations.json"),
    ]);
    departmentsGeoJson = loadedDepartments;
    staticPiezoData = stationsToGeoJson(piezoSample.stations);
    staticHydroData = stationsToGeoJson(hydroSample.stations);
    waterMap = createWaterMap({
      container: "carte-hydrique",
      departments: joinDepartmentRestrictions(departmentsGeoJson, []),
      piezoStations: piezoSample.stations,
      hydroStations: hydroSample.stations,
      onSelect: showSelection,
    });
    await waterMap.ready;
    setupLayerControls();
    waterMap.onMoveEnd(() => refreshViewportData(true));
    refreshButton.addEventListener("click", runRefresh);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && Date.now() - lastSuccessfulRefresh >= REFRESH_INTERVAL_MS) runRefresh();
    });
    await runRefresh();
  } catch (error) {
    console.error(error);
    statusElement.textContent = renderStatus("error", "Les ressources locales sont indisponibles.");
    refreshButton.disabled = true;
  }
}

initializeDashboard();
