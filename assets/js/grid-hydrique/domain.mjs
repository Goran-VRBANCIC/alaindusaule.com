// @ts-check

export const SEVERITY_ORDER = Object.freeze({
  null: 0,
  vigilance: 1,
  alerte: 2,
  alerte_renforcee: 3,
  crise: 4,
});

export function buildRestrictionSummary(departments) {
  const summary = {
    total: departments.length,
    crise: 0,
    alerteRenforcee: 0,
    alerte: 0,
    vigilance: 0,
    sansRestriction: 0,
  };

  for (const department of departments) {
    const level = department.niveauGraviteMax;
    if (level === "crise") summary.crise += 1;
    else if (level === "alerte_renforcee") summary.alerteRenforcee += 1;
    else if (level === "alerte") summary.alerte += 1;
    else if (level === "vigilance") summary.vigilance += 1;
    else summary.sansRestriction += 1;
  }

  return summary;
}

export function latestByStation(observations, stationKey, dateKey) {
  const latest = new Map();

  for (const observation of observations) {
    const key = observation[stationKey];
    const previous = latest.get(key);
    if (!previous || Date.parse(observation[dateKey]) > Date.parse(previous[dateKey])) {
      latest.set(key, observation);
    }
  }

  return latest;
}

export function measurementFreshness(value, now = new Date()) {
  const age = now.getTime() - Date.parse(value);
  if (age <= 24 * 60 * 60 * 1000) return "fresh";
  if (age <= 7 * 24 * 60 * 60 * 1000) return "recent";
  return "stale";
}

export function piezoObservationsToGeoJson(observations, now = new Date(), stationMetadata = new Map()) {
  const latest = latestByStation(observations, "code_bss", "date_mesure");
  const features = [];

  for (const observation of latest.values()) {
    if (!Number.isFinite(observation.longitude) || !Number.isFinite(observation.latitude)) continue;
    const metadata = stationMetadata.get(observation.code_bss) || {};
    const hasDepth = Number.isFinite(observation.profondeur_nappe);
    const value = hasDepth ? observation.profondeur_nappe : observation.niveau_eau_ngf;
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [observation.longitude, observation.latitude] },
      properties: {
        ...metadata,
        kind: "piezo",
        stationCode: observation.code_bss,
        measuredAt: observation.date_mesure,
        value,
        unit: "m",
        valueLabel: hasDepth ? "Profondeur de la nappe" : "Niveau de la nappe (NGF)",
        freshness: measurementFreshness(observation.date_mesure, now),
      },
    });
  }

  return { type: "FeatureCollection", features };
}

export function hydroObservationsToGeoJson(observations, now = new Date(), stationMetadata = new Map()) {
  const latest = latestByStation(observations, "code_station", "date_obs");
  const features = [];

  for (const observation of latest.values()) {
    if (!Number.isFinite(observation.longitude) || !Number.isFinite(observation.latitude)) continue;
    const metadata = stationMetadata.get(observation.code_station) || {};
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [observation.longitude, observation.latitude] },
      properties: {
        ...metadata,
        kind: "hydro",
        stationCode: observation.code_station,
        measuredAt: observation.date_obs,
        value: Number.isFinite(observation.resultat_obs) ? observation.resultat_obs / 1000 : null,
        unit: "m",
        valueLabel: "Hauteur d’eau",
        freshness: measurementFreshness(observation.date_obs, now),
      },
    });
  }

  return { type: "FeatureCollection", features };
}
