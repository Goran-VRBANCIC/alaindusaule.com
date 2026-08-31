// @ts-check

import { normalizeZones } from "./zones.mjs";

const RESTRICTION_COLORS = Object.freeze({
  crise: "#8b1e1e",
  alerte_renforcee: "#d96b27",
  alerte: "#e3a62f",
  vigilance: "#f2d36b",
  none: "#d8e8dc",
});

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function restrictionColor(level) {
  return RESTRICTION_COLORS[level] || RESTRICTION_COLORS.none;
}

export function renderKpis(summary, updatedAt) {
  const items = [
    { value: summary.crise, label: "Départements en crise" },
    { value: summary.alerteRenforcee, label: "Alerte renforcée" },
    { value: summary.sansRestriction, label: "Sans restriction" },
    { value: updatedAt, label: "Dernière actualisation" },
  ];

  return items.map((item) => `
    <article class="water-kpi">
      <strong class="water-kpi__value">${escapeHtml(item.value)}</strong>
      <span class="water-kpi__label">${escapeHtml(item.label)}</span>
      <small>Source : VigiEau</small>
    </article>
  `).join("");
}

export function renderStatus(state, message, hasCachedData = false) {
  const labels = {
    loading: "Chargement des données officielles…",
    success: message,
    partial: `Certaines données sont indisponibles. ${message}`,
    error: `Données temporairement indisponibles. ${message}${hasCachedData ? " Dernières données affichées." : ""}`,
  };
  return escapeHtml(labels[state] || message);
}

export function renderSourceDates({ vigieau, piezo, hydro }) {
  return `VigiEau consulté : ${vigieau} · Hub’Eau nappes : ${piezo} · Hub’Eau cours d’eau : ${hydro}`;
}

export function renderMapControls() {
  return `
    <fieldset class="water-control-group">
      <legend>Vue de la carte</legend>
      <label class="water-layer-toggle"><input type="radio" name="map-mode" value="departments" checked> Départements</label>
      <label class="water-layer-toggle"><input type="radio" name="map-mode" value="zones"> Zones</label>
    </fieldset>
    <fieldset class="water-control-group" data-zone-resources hidden disabled>
      <legend>Ressource</legend>
      <label class="water-layer-toggle"><input type="radio" name="zone-resource" value="ALL" checked> Toutes les ressources</label>
      <label class="water-layer-toggle"><input type="radio" name="zone-resource" value="SUP"> Cours d’eau</label>
      <label class="water-layer-toggle"><input type="radio" name="zone-resource" value="SOU"> Nappes</label>
      <label class="water-layer-toggle"><input type="radio" name="zone-resource" value="AEP"> Eau potable</label>
    </fieldset>
  `;
}

export function renderDepartmentDetail(department, zones = []) {
  const zone = zones[0];
  const departmentLevel = department.severity || "none";
  const localLevel = zone?.niveauGravite || "none";
  const safeUrl = safeHttpsUrl(zone?.arrete?.cheminFichier);
  return `
    <h2 id="detail-title">${escapeHtml(department.nom || "Département")}</h2>
    <p class="fine-print">Niveau maximal du département — couleur de la carte</p>
    <p class="detail-level detail-level--${escapeHtml(departmentLevel)}">${escapeHtml(severityLabel(departmentLevel))}</p>
    ${zone ? `
      <p class="fine-print">Au point sélectionné</p>
      <p class="detail-level detail-level--${escapeHtml(localLevel)}">${escapeHtml(severityLabel(localLevel))}</p>
      <p>${escapeHtml(zone.nom || "Zone de restriction")}</p>
    ` : "<p>Aucune restriction locale retournée pour ce point.</p>"}
    ${safeUrl ? `<p><a href="${escapeHtml(safeUrl)}" rel="noopener">Consulter l’arrêté officiel</a></p>` : ""}
    <p class="fine-print">Source : VigiEau</p>
  `;
}

export function renderZoneDetail(zones, { fallback = false } = {}) {
  const orderedZones = normalizeZones(zones);
  const items = orderedZones.map((zone, index) => {
    const level = zone.niveauGravite || "none";
    const safeUrl = safeHttpsUrl(zone.arrete?.cheminFichier);
    return `
      <article class="zone-detail__item">
        ${index === 0 ? '<p class="fine-print">Niveau maximal à ce point</p>' : ""}
        <h3>${escapeHtml(zone.resourceLabel)}</h3>
        <p class="detail-level detail-level--${escapeHtml(level)}">${escapeHtml(severityLabel(level))}</p>
        <p>${escapeHtml(zone.nom || "Zone de restriction")}</p>
        ${safeUrl ? `<p><a href="${escapeHtml(safeUrl)}" rel="noopener">Consulter l’arrêté officiel</a></p>` : ""}
      </article>
    `;
  }).join("");
  return `
    <h2 id="detail-title">Restrictions au point sélectionné</h2>
    ${fallback ? '<p class="data-error">Détails temporairement indisponibles.</p>' : ""}
    ${items || "<p>Aucune restriction locale retournée pour ce point.</p>"}
    <p class="fine-print">Source : VigiEau</p>
  `;
}

export function renderPiezoDetail(properties) {
  return renderStationDetail("Piézomètre", properties);
}

export function renderHydroDetail(properties) {
  return renderStationDetail("Station", properties);
}

function renderStationDetail(label, properties) {
  const value = Number.isFinite(Number(properties.value))
    ? `${Number(properties.value).toLocaleString("fr-FR", { maximumFractionDigits: 3 })} ${properties.unit || "m"}`
    : "Valeur indisponible";
  const date = properties.measuredAt
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(properties.measuredAt))
    : "Date indisponible";
  const location = [properties.commune, properties.watercourse].filter(Boolean).join(" — ") || "Non renseigné";
  const freshness = {
    fresh: "moins de 24 heures",
    recent: "moins de 7 jours",
    stale: "plus de 7 jours",
  }[properties.freshness] || "non renseignée";
  return `
    <h2 id="detail-title">${label} ${escapeHtml(properties.stationCode || properties.code || "")}</h2>
    <dl class="station-facts">
      <div><dt>Dernière valeur</dt><dd>${escapeHtml(value)}</dd></div>
      <div><dt>Mesurée le</dt><dd>${escapeHtml(date)}</dd></div>
      <div><dt>Lieu</dt><dd>${escapeHtml(location)}</dd></div>
      <div><dt>Fraîcheur</dt><dd>${escapeHtml(freshness)}</dd></div>
    </dl>
    <div class="water-chart" data-chart aria-live="polite"><p>Chargement de la chronique…</p></div>
    <p class="fine-print">Source : Hub’Eau</p>
  `;
}

function severityLabel(level) {
  return {
    crise: "Crise",
    alerte_renforcee: "Alerte renforcée",
    alerte: "Alerte",
    vigilance: "Vigilance",
    none: "Aucune restriction",
  }[level] || "Situation non renseignée";
}

function safeHttpsUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
