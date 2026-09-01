// @ts-check

const LEVELS = Object.freeze(["none", "vigilance", "alerte", "alerte_renforcee", "crise"]);

export const GRID_PHASES = Object.freeze({
  phase1: Object.freeze({ label: "Phase 1 — Boucles départementales", reduction: 1 }),
  phase2: Object.freeze({ label: "Phase 2 — Interconnexions régionales", reduction: 2 }),
  phase3: Object.freeze({ label: "Phase 3 — Corridors nationaux", reduction: Infinity }),
});

export function simulateSeverity(level, phase) {
  const index = LEVELS.indexOf(level);
  if (index < 0) return "none";
  if (phase === "phase3") return "none";
  const reduction = GRID_PHASES[phase]?.reduction || 0;
  return LEVELS[Math.max(0, index - reduction)];
}

export function restrictionExpression(property, phase, colors) {
  if (phase === "phase3") return colors.none;
  return [
    "match", ["get", property],
    "crise", colors[simulateSeverity("crise", phase)],
    "alerte_renforcee", colors[simulateSeverity("alerte_renforcee", phase)],
    "alerte", colors[simulateSeverity("alerte", phase)],
    "vigilance", colors[simulateSeverity("vigilance", phase)],
    colors.none,
  ];
}

export const REGIONAL_HUBS = Object.freeze({
  type: "FeatureCollection",
  features: [
    ["Rennes", -1.68, 48.11], ["Rouen", 1.10, 49.44], ["Paris", 2.35, 48.86],
    ["Strasbourg", 7.75, 48.58], ["Lyon", 4.84, 45.76], ["Marseille", 5.37, 43.30],
    ["Toulouse", 1.44, 43.60], ["Bordeaux", -0.58, 44.84], ["Nantes", -1.55, 47.22],
    ["Orléans", 1.91, 47.90], ["Clermont-Ferrand", 3.09, 45.78],
  ].map(([name, longitude, latitude]) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [longitude, latitude] },
    properties: { name },
  })),
});

export const REGIONAL_LINKS = Object.freeze({
  type: "FeatureCollection",
  features: [
    [[-1.68, 48.11], [1.10, 49.44], [2.35, 48.86], [7.75, 48.58]],
    [[-1.55, 47.22], [1.91, 47.90], [3.09, 45.78], [4.84, 45.76], [5.37, 43.30]],
    [[-0.58, 44.84], [1.44, 43.60], [3.09, 45.78]],
    [[-1.68, 48.11], [-1.55, 47.22], [-0.58, 44.84]],
  ].map((coordinates, index) => ({
    type: "Feature",
    geometry: { type: "LineString", coordinates },
    properties: { name: `Interconnexion régionale ${index + 1}` },
  })),
});

export const NATIONAL_CORRIDORS = Object.freeze({
  type: "FeatureCollection",
  features: [
    { name: "Massif Central → Sud-Ouest", coordinates: [[3.09, 45.78], [2.35, 44.73], [1.44, 43.60], [-0.58, 44.84]] },
    { name: "Normandie → Centre", coordinates: [[0.10, 49.20], [1.10, 48.70], [1.91, 47.90], [2.20, 46.80]] },
  ].map(({ name, coordinates }) => ({
    type: "Feature",
    geometry: { type: "LineString", coordinates },
    properties: { name },
  })),
});
