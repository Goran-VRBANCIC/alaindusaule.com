// @ts-check

import { createWaterApi } from "./api.mjs";
import { buildRestrictionSummary } from "./domain.mjs";
import { createWaterMap } from "./map.mjs";
import { escapeHtml, renderKpis, renderStatus } from "./templates.mjs";

const api = createWaterApi();
const statusElement = document.querySelector("[data-water-status]");
const kpiElement = document.querySelector("[data-kpi-grid]");
const detailElement = document.querySelector("#station-detail");

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
    const waterMap = createWaterMap({
      container: "carte-hydrique",
      departments,
      piezoStations: piezoSample.stations,
      hydroStations: hydroSample.stations,
      onSelect: showSelection,
    });
    await waterMap.ready;
    globalThis.waterDashboardMap = waterMap;
    statusElement.textContent = renderStatus("success", `Données actualisées à ${formatUpdateTime(now)}`);
  } catch (error) {
    console.error(error);
    statusElement.textContent = renderStatus("error", "Réessayez dans quelques instants.");
  }
}

initializeDashboard();
