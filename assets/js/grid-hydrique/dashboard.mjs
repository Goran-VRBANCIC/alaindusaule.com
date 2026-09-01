// @ts-check

import { createWaterApi } from "./api.mjs";
import { buildLineChartModel, renderLineChart } from "./chart.mjs";
import {
  buildRestrictionSummary,
  hydroObservationsToGeoJson,
  mergeStationMeasurements,
  piezoObservationsToGeoJson,
} from "./domain.mjs";
import { createWaterMap, stationsToGeoJson } from "./map.mjs";
import { readThemeColors } from "../theme.mjs";
import { GRID_PHASES } from "./simulation.mjs";
import { normalizeZones } from "./zones.mjs";
import {
  renderDepartmentDetail,
  renderHydroDetail,
  renderKpis,
  renderMapControls,
  renderPiezoDetail,
  renderSimulationDetail,
  renderSourceDates,
  renderStatus,
  renderZoneDetail,
} from "./templates.mjs";

const REFRESH_INTERVAL_MS = 15 * 60 * 1000;
const MAPLIBRE_MODULE_URL = "https://unpkg.com/maplibre-gl@6.6.0/dist/maplibre-gl.mjs";
const MAPLIBRE_CSS_URL = "https://unpkg.com/maplibre-gl@6.6.0/dist/maplibre-gl.css";
const PMTILES_MODULE_URL = "https://unpkg.com/pmtiles@3.2.0/dist/index.js";
const api = createWaterApi();
const statusElement = document.querySelector("[data-water-status]");
const kpiElement = document.querySelector("[data-kpi-grid]");
const detailElement = document.querySelector("#station-detail");
const mapControlsElement = document.querySelector(".water-map-controls");
const viewControlsElement = document.querySelector(".water-view-controls");
const layerControlsElement = document.querySelector(".water-layer-controls");
const refreshButton = document.querySelector("[data-refresh-water]");
const sourceUpdatesElement = document.querySelector("[data-source-updates]");
const mapSectionElement = document.querySelector(".water-map-section");
const mapHeadingElement = document.querySelector(".water-map-heading");
const mapLayoutElement = document.querySelector(".water-map-layout");
const mapLegendElement = document.querySelector(".water-map-legend");
const mapInstructionsElement = document.querySelector("#map-keyboard-instructions");
const liveSummaryElement = document.querySelector(".water-live-summary");
const simulationNoteElement = document.querySelector("[data-simulation-note]");
const gridLegendElement = document.querySelector("[data-grid-legend]");
const desktopLayoutMedia = globalThis.matchMedia("(min-width: 48rem)");

let waterMap;
let viewportController;
let piezoStationData;
let hydroStationData;
let piezoMetadata;
let hydroMetadata;
let selectionController;
let departmentsGeoJson;
let lastRestrictions = null;
let lastSuccessfulRefresh = 0;
let refreshTimer;
let refreshInProgress = false;
let zoneLoadPromise;
let simulationPhase = null;
const sourceDates = { vigieau: "en attente", piezo: "en attente", hydro: "en attente" };

function syncResponsiveDom() {
  if (!mapSectionElement || !mapHeadingElement || !mapLayoutElement || !mapControlsElement || !mapLegendElement || !mapInstructionsElement || !detailElement || !liveSummaryElement) return;
  if (desktopLayoutMedia.matches) {
    mapSectionElement.insertBefore(liveSummaryElement, mapHeadingElement);
    mapHeadingElement.append(mapControlsElement);
    mapInstructionsElement.after(mapLayoutElement);
    mapLayoutElement.after(detailElement);
  } else {
    mapHeadingElement.after(mapLayoutElement);
    mapLayoutElement.after(mapControlsElement);
    mapControlsElement.after(mapLegendElement);
    mapLegendElement.after(mapInstructionsElement);
    mapInstructionsElement.after(detailElement);
    detailElement.after(liveSummaryElement);
  }
  globalThis.dispatchEvent(new Event("resize"));
}

syncResponsiveDom();
desktopLayoutMedia.addEventListener("change", syncResponsiveDom);

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

function latestDate(items, key) {
  return items.reduce((latest, item) => {
    const timestamp = Date.parse(item[key]);
    return Number.isFinite(timestamp) && timestamp > latest ? timestamp : latest;
  }, 0);
}

function updateSourceDates() {
  if (sourceUpdatesElement) sourceUpdatesElement.textContent = renderSourceDates(sourceDates);
}

function loadMapLibreStyles() {
  return new Promise((resolve, reject) => {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = MAPLIBRE_CSS_URL;
    stylesheet.addEventListener("load", resolve, { once: true });
    stylesheet.addEventListener("error", () => reject(new Error("Styles MapLibre indisponibles")), { once: true });
    document.head.append(stylesheet);
  });
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

async function enableZoneMode() {
  const resources = viewControlsElement?.querySelector("[data-zone-resources]");
  if (!resources || !statusElement) return;
  resources.hidden = false;
  resources.disabled = true;
  statusElement.textContent = "Chargement des zones officielles…";
  try {
    zoneLoadPromise ||= import(PMTILES_MODULE_URL).then((pmtiles) => waterMap.loadZoneLayers(pmtiles));
    await zoneLoadPromise;
    if (!viewControlsElement.querySelector('[name="map-mode"][value="zones"]')?.checked) return;
    waterMap.setMapMode("zones");
    resources.disabled = false;
    statusElement.textContent = "Zones officielles affichées.";
  } catch (error) {
    console.error(error);
    zoneLoadPromise = undefined;
    waterMap.setMapMode("departments");
    resources.hidden = true;
    resources.disabled = true;
    viewControlsElement.querySelector('[name="map-mode"][value="departments"]').checked = true;
    statusElement.textContent = "Les zones sont temporairement indisponibles. Vue Départements rétablie.";
  }
}

function setupMapControls() {
  if (!viewControlsElement || !waterMap) return;
  viewControlsElement.innerHTML = renderMapControls();

  function applySimulationState(nextPhase) {
    const applied = waterMap.setSimulationPhase(nextPhase);
    if (!applied) {
      simulationPhase = null;
      viewControlsElement.querySelector('[name="grid-scenario"][value="real"]').checked = true;
      statusElement.textContent = "La simulation est temporairement indisponible. Données officielles conservées.";
      return;
    }

    simulationPhase = nextPhase;
    const simulated = simulationPhase !== null;
    const phaseControls = viewControlsElement.querySelector("[data-grid-phases]");
    phaseControls.hidden = !simulated;
    phaseControls.disabled = !simulated;
    if (layerControlsElement) layerControlsElement.hidden = simulated;
    if (simulationNoteElement) simulationNoteElement.hidden = !simulated;
    if (gridLegendElement) gridLegendElement.hidden = !simulated;
    selectionController?.abort();
    if (detailElement) {
      detailElement.innerHTML = simulated
        ? '<h2 id="detail-title">Simulation du Grid</h2><p>Sélectionnez un département ou une zone pour comparer les niveaux.</p>'
        : '<h2 id="detail-title">Détail</h2><p>Sélectionnez un département ou une station sur la carte.</p>';
    }
    if (statusElement) {
      statusElement.textContent = simulated
        ? `${GRID_PHASES[simulationPhase].label} affichée — simulation pédagogique.`
        : "Données officielles affichées.";
    }
  }

  viewControlsElement.querySelectorAll('[name="grid-scenario"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      const selectedPhase = viewControlsElement.querySelector('[name="grid-phase"]:checked')?.value || "phase1";
      applySimulationState(input.value === "simulation" ? selectedPhase : null);
    });
  });
  viewControlsElement.querySelectorAll('[name="grid-phase"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked && simulationPhase) applySimulationState(input.value);
    });
  });
  viewControlsElement.querySelectorAll('[name="map-mode"]').forEach((input) => {
    input.addEventListener("change", async () => {
      if (!input.checked) return;
      if (input.value === "zones") {
        await enableZoneMode();
        return;
      }
      waterMap.setMapMode("departments");
      const resources = viewControlsElement.querySelector("[data-zone-resources]");
      resources.hidden = true;
      resources.disabled = true;
    });
  });
  viewControlsElement.querySelectorAll('[name="zone-resource"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) waterMap.setZoneResource(input.value);
    });
  });
}

async function refreshNationalData() {
  const restrictions = await api.getDepartments();
  const now = new Date();
  lastRestrictions = restrictions;
  waterMap.setDepartments(joinDepartmentRestrictions(departmentsGeoJson, restrictions));
  kpiElement.innerHTML = renderKpis(buildRestrictionSummary(restrictions), formatUpdateTime(now));
  sourceDates.vigieau = formatUpdateTime(now);
  updateSourceDates();
}

async function refreshViewportData(announce = false) {
  if (!waterMap || !statusElement) return { partial: false, message: "" };
  viewportController?.abort();

  if (waterMap.getZoom() < 6) {
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
    piezoStationData = mergeStationMeasurements(
      piezoStationData,
      piezoObservationsToGeoJson(piezoResult.value.data, new Date(), piezoMetadata),
    );
    waterMap.setStations("piezo", piezoStationData);
    const measuredAt = latestDate(piezoResult.value.data, "date_mesure");
    sourceDates.piezo = measuredAt ? formatUpdateTime(new Date(measuredAt)) : "aucune mesure récente";
    truncated ||= Boolean(piezoResult.value.next);
  } else {
    unavailable.push("piézométrie");
  }
  if (hydroResult.status === "fulfilled") {
    hydroStationData = mergeStationMeasurements(
      hydroStationData,
      hydroObservationsToGeoJson(hydroResult.value.data, new Date(), hydroMetadata),
    );
    waterMap.setStations("hydro", hydroStationData);
    const measuredAt = latestDate(hydroResult.value.data, "date_obs");
    sourceDates.hydro = measuredAt ? formatUpdateTime(new Date(measuredAt)) : "aucune mesure récente";
    truncated ||= Boolean(hydroResult.value.next);
  } else {
    unavailable.push("hydrométrie");
  }

  const partial = unavailable.length > 0 || truncated;
  updateSourceDates();
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

  if (simulationPhase) {
    if (selection.layerId === "piezo-points" || selection.layerId === "hydro-points") return;
    detailElement.innerHTML = renderSimulationDetail({
      name: properties.nom || properties.name || "Territoire sélectionné",
      realLevel: selection.layerId === "zones-fill"
        ? properties.niveauGravite || "none"
        : properties.severity || "none",
      phase: simulationPhase,
    });
    detailElement.focus({ preventScroll: false });
    return;
  }

  detailElement.focus({ preventScroll: false });

  if (selection.layerId === "zones-fill") {
    const tileZone = normalizeZones([properties]);
    detailElement.innerHTML = renderZoneDetail(tileZone);
    try {
      const zones = await api.getLocalRestrictions(selection.coordinates[0], selection.coordinates[1], signal);
      if (!signal.aborted) detailElement.innerHTML = renderZoneDetail(normalizeZones(zones));
    } catch (error) {
      if (!signal.aborted) {
        console.error(error);
        detailElement.innerHTML = renderZoneDetail(tileZone, { fallback: true });
      }
    }
    return;
  }

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
    const theme = readThemeColors();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const [, maplibre, loadedDepartments, piezoReference, hydroReference] = await Promise.all([
      loadMapLibreStyles(),
      import(MAPLIBRE_MODULE_URL),
      loadLocalJson("../assets/data/departements-simplifies.geojson"),
      loadLocalJson("../assets/data/piezo-stations.json"),
      loadLocalJson("../assets/data/hydro-stations.json"),
    ]);
    departmentsGeoJson = loadedDepartments;
    piezoMetadata = new Map(piezoReference.stations.map((station) => [station.code, station]));
    hydroMetadata = new Map(hydroReference.stations.map((station) => [station.code, station]));
    sourceDates.piezo = `référentiel du ${formatUpdateTime(new Date(piezoReference.generatedAt))}`;
    sourceDates.hydro = `référentiel du ${formatUpdateTime(new Date(hydroReference.generatedAt))}`;
    updateSourceDates();
    piezoStationData = stationsToGeoJson(piezoReference.stations);
    hydroStationData = stationsToGeoJson(hydroReference.stations);
    waterMap = createWaterMap({
      theme,
      maplibre,
      container: "carte-hydrique",
      departments: joinDepartmentRestrictions(departmentsGeoJson, []),
      piezoStations: piezoReference.stations,
      hydroStations: hydroReference.stations,
      onSelect: showSelection,
    });
    await waterMap.ready;
    setupMapControls();
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

if ("requestIdleCallback" in globalThis) {
  globalThis.requestIdleCallback(initializeDashboard, { timeout: 1500 });
} else {
  setTimeout(initializeDashboard, 0);
}
