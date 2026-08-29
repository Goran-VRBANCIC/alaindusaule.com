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
