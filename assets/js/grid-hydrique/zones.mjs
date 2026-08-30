// @ts-check

export const ZONE_SOURCE_URL = "https://regleau.s3.gra.perf.cloud.ovh.net/pmtiles/zones_arretes_en_vigueur.pmtiles";
export const ZONE_SOURCE_LAYER = "zones_arretes_en_vigueur";

const RESOURCE_LABELS = Object.freeze({
  SUP: "Cours d’eau",
  SOU: "Nappes",
  AEP: "Eau potable",
});

const SEVERITY_RANK = Object.freeze({
  vigilance: 1,
  alerte: 2,
  alerte_renforcee: 3,
  crise: 4,
});

export const ZONE_FILL_SORT_KEY = Object.freeze([
  "match", ["get", "niveauGravite"],
  "vigilance", 1,
  "alerte", 2,
  "alerte_renforcee", 3,
  "crise", 4,
  0,
]);

export function resourceLabel(type) {
  return RESOURCE_LABELS[type] || "Ressource non renseignée";
}

export function zoneResourceFilter(resource) {
  return resource === "ALL" ? null : ["==", ["get", "type"], resource];
}

function normalizeArrete(zone) {
  if (zone.arrete || typeof zone.arreteRestriction !== "string") return zone.arrete;
  try {
    const arreteRestriction = JSON.parse(zone.arreteRestriction);
    return arreteRestriction?.fichier ? { cheminFichier: arreteRestriction.fichier } : undefined;
  } catch {
    return undefined;
  }
}

export function normalizeZones(zones = []) {
  return zones
    .filter((zone) => zone && typeof zone === "object")
    .map((zone) => ({
      ...zone,
      arrete: normalizeArrete(zone),
      resourceLabel: resourceLabel(zone.type),
    }))
    .sort((left, right) => (SEVERITY_RANK[right.niveauGravite] || 0) - (SEVERITY_RANK[left.niveauGravite] || 0));
}
