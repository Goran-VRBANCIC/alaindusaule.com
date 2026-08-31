// @ts-check

const COLOR_PROPERTIES = Object.freeze({
  ink: "--ink",
  paper: "--paper",
  water: "--water",
  waterDeep: "--water-deep",
  waterPale: "--water-pale",
  stationHydro: "--station-hydro",
  stationHydroStroke: "--station-hydro-stroke",
});

const RESTRICTION_PROPERTIES = Object.freeze({
  crise: "--restriction-crise",
  alerte_renforcee: "--restriction-alerte-renforcee",
  alerte: "--restriction-alerte",
  vigilance: "--restriction-vigilance",
  none: "--restriction-none",
});

function requiredColor(styles, property) {
  const value = styles.getPropertyValue(property).trim();
  if (!value) throw new Error(`Variable CSS de couleur absente : ${property}`);
  return value;
}

export function readThemeColors(
  styles = globalThis.getComputedStyle(globalThis.document.documentElement),
) {
  return {
    ...Object.fromEntries(
      Object.entries(COLOR_PROPERTIES).map(([name, property]) => [name, requiredColor(styles, property)]),
    ),
    restrictions: Object.fromEntries(
      Object.entries(RESTRICTION_PROPERTIES).map(([name, property]) => [name, requiredColor(styles, property)]),
    ),
  };
}

export function restrictionColor(level, colors) {
  return colors.restrictions[level] || colors.restrictions.none;
}

export function syncBrowserThemeColor(
  documentObject = globalThis.document,
  styles = globalThis.getComputedStyle(documentObject.documentElement),
) {
  const meta = documentObject.querySelector('meta[name="theme-color"]');
  if (!meta) return false;
  meta.setAttribute("content", readThemeColors(styles).waterDeep);
  return true;
}
