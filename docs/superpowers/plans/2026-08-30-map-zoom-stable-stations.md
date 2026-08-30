# Responsive Map Zoom and Stable Stations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bloquer le dézoom au cadrage France métropolitaine + Corse et afficher à tous les zooms le référentiel complet et stable des stations actives de cette emprise.

**Architecture:** `map.mjs` calcule une limite de zoom depuis l’emprise nationale et la resynchronise lorsque le conteneur change de taille. Le générateur local produit les référentiels Hub’Eau complets et actifs ; `domain.mjs` fusionne ensuite les mesures du viewport dans ces collections canoniques sans modifier leurs codes ni leurs géométries. `dashboard.mjs` orchestre les requêtes, mais ne remplace plus les collections selon le zoom.

**Tech Stack:** HTML statique, modules JavaScript natifs, MapLibre GL JS 6.6.0, API Hub’Eau, `node:test`, PowerShell, Edge/Playwright.

---

## Contraintes d’exécution

- Créer une branche et un worktree dédiés depuis `master` avant toute modification applicative.
- Préserver le fichier utilisateur non suivi `docs/superpowers/plans/2026-08-29 - dashboard_plan.md`.
- Tous les tests, validateurs et contrôles navigateur sont écrits ou exécutés exclusivement par un sous-agent `gpt-5.4-mini`.
- L’agent principal écrit uniquement le code de production, génère les instantanés de données, inspecte les diffs et crée les commits.
- Pour chaque comportement : GPT-5.4 Mini écrit le test, constate l’échec attendu, l’agent principal applique le minimum de production, puis GPT-5.4 Mini constate le succès.
- Ne jamais ajouter de mention `Co-authored-by`.
- Indexer chaque commit avec une liste explicite de chemins ; ne jamais utiliser `git add .`.

## Structure des fichiers

- Modifier `assets/js/grid-hydrique/map.mjs` : calcul et synchronisation du zoom minimal responsive.
- Modifier `tests/grid-hydrique/map.test.mjs` : contrat initial, redimensionnement et absence de recentrage.
- Créer `scripts/build-water-stations.mjs` : génération complète des référentiels actifs métropolitains.
- Supprimer `scripts/build-water-station-samples.mjs` après reprise de ses fonctions de normalisation utiles.
- Créer `tests/grid-hydrique/stations.test.mjs` : périmètre, activité, déterminisme et contenu des instantanés.
- Supprimer `tests/grid-hydrique/samples.test.mjs` après remplacement de ses assertions d’échantillonnage.
- Régénérer `assets/data/piezo-stations.json` et `assets/data/hydro-stations.json`.
- Modifier `assets/js/grid-hydrique/domain.mjs` : fusion immuable des mesures dans un référentiel canonique.
- Modifier `tests/grid-hydrique/domain.test.mjs` : stabilité des codes, ordre, géométries et pannes partielles.
- Modifier `assets/js/grid-hydrique/dashboard.mjs` : conserver les collections nationales et fusionner les mesures récentes.
- Modifier `tests/grid-hydrique/accessibility-regressions.test.mjs` : stabilité après plusieurs cycles de viewport.
- Modifier `tests/validate-grid-hydrique.ps1` : nouveau générateur, volumes complets et absence de l’ancien échantillonnage.
- Modifier `log.md` : problème, cause, solution et preuves finales.

### Task 1: Préparer l’isolation et confirmer la référence

**Files:**
- Preserve: `docs/superpowers/plans/2026-08-29 - dashboard_plan.md`

- [ ] **Step 1: Créer le worktree applicatif**

L’agent principal résout d’abord le chemin absolu du dépôt et vérifie que `.worktrees` est ignoré, puis exécute :

```powershell
git check-ignore -q .worktrees
git worktree add '.worktrees/map-zoom-stable-stations' -b 'feat/map-zoom-stable-stations'
```

Expected: le nouveau worktree est sur `feat/map-zoom-stable-stations`; le fichier non suivi du checkout principal n’est ni copié ni modifié.

- [ ] **Step 2: Faire exécuter la référence par GPT-5.4 Mini**

GPT-5.4 Mini exécute séparément dans le worktree :

```powershell
node --test tests/grid-hydrique/*.test.mjs
& ./tests/validate-grid-hydrique.ps1
& ./tests/validate-site.ps1
node --test tests/contact-script.test.js
git diff --check
```

Expected: `43/43` tests cartographiques, les deux validateurs, le test contact et `git diff --check` réussissent. GPT-5.4 Mini transmet chaque code de sortie.

### Task 2: Bloquer le dézoom au cadrage national responsive

**Files:**
- Modify: `assets/js/grid-hydrique/map.mjs:51-54,75-88,225-242`
- Test: `tests/grid-hydrique/map.test.mjs:31-124`

- [ ] **Step 1: Faire écrire les tests rouges par GPT-5.4 Mini**

GPT-5.4 Mini étend le faux MapLibre avec les contrats suivants :

```js
this.zoom = 4.25;
this.center = { lng: 2.2, lat: 46.4 };
this.container = { clientWidth: width, clientHeight: 600 };
this.calls.minZoom = [];
this.calls.cameraForBounds = [];

getZoom() { return this.zoom; }
getCenter() { return { ...this.center }; }
getContainer() { return this.container; }
setMinZoom(value) { this.calls.minZoom.push(value); }
cameraForBounds(bounds, options) {
  this.calls.cameraForBounds.push({ bounds, options });
  return { zoom: this.getContainer().clientWidth < 576 ? 4.1 : 4.6 };
}
```

Elle ajoute un faux observateur contrôlable :

```js
class FakeResizeObserver {
  static instance;
  constructor(callback) {
    this.callback = callback;
    FakeResizeObserver.instance = this;
  }
  observe(target) { this.target = target; }
  trigger() { this.callback([{ target: this.target }]); }
}

const animationFrames = [];
const requestFrame = (callback) => {
  animationFrames.push(callback);
  return animationFrames.length;
};
const flushAnimationFrame = async () => {
  animationFrames.shift()?.();
  await Promise.resolve();
};
```

Les assertions exigent :

```js
assert.deepEqual(waterMap.map.calls.minZoom, [4.25]);
assert.equal(FakeResizeObserver.instance.target, waterMap.map.getContainer());

const centerBefore = waterMap.map.getCenter();
waterMap.map.getContainer().clientWidth = 400;
FakeResizeObserver.instance.trigger();
await flushAnimationFrame();
assert.equal(waterMap.map.calls.fitBounds.length, 1);
assert.deepEqual(waterMap.map.getCenter(), centerBefore);
assert.equal(waterMap.map.calls.minZoom.at(-1), 4.1);
```

- [ ] **Step 2: Faire constater l’échec attendu par GPT-5.4 Mini**

```powershell
node --test tests/grid-hydrique/map.test.mjs
```

Expected: FAIL parce que `createWaterMap` n’appelle pas encore `setMinZoom`, n’installe aucun `ResizeObserver` et ne recalcule pas la caméra.

- [ ] **Step 3: Implémenter la synchronisation minimale**

L’agent principal ajoute deux dépendances optionnelles à `createWaterMap` :

```js
export function createWaterMap({
  container,
  departments,
  piezoStations,
  hydroStations,
  onSelect,
  maplibre = globalThis.maplibregl,
  ResizeObserverClass = globalThis.ResizeObserver,
  requestFrame = globalThis.requestAnimationFrame,
}) {
```

Après la création de `map`, il prépare l’emprise et le recalcul regroupé :

```js
const nationalBounds = departments.features.length > 0 ? geoJsonBounds(departments) : null;
let resizeFrame;
let nationalResizeObserver;

function applyNationalMinZoom() {
  if (!nationalBounds || !map.cameraForBounds || !map.setMinZoom || !map.getContainer) return;
  const camera = map.cameraForBounds(nationalBounds, {
    padding: nationalPadding(map.getContainer().clientWidth),
  });
  if (Number.isFinite(camera?.zoom)) map.setMinZoom(camera.zoom);
}

function scheduleNationalMinZoom() {
  if (resizeFrame !== undefined) return;
  const schedule = requestFrame || ((callback) => globalThis.setTimeout(callback, 0));
  resizeFrame = schedule(() => {
    resizeFrame = undefined;
    map.resize?.();
    applyNationalMinZoom();
  });
}
```

Dans le callback `load`, le cadrage initial devient :

```js
if (nationalBounds && map.resize && map.fitBounds && map.getContainer) {
  map.resize();
  map.fitBounds(nationalBounds, {
    padding: nationalPadding(map.getContainer().clientWidth),
    duration: 0,
  });
  if (map.setMinZoom && map.getZoom) map.setMinZoom(map.getZoom());

  if (ResizeObserverClass) {
    nationalResizeObserver = new ResizeObserverClass(scheduleNationalMinZoom);
    nationalResizeObserver.observe(map.getContainer());
  } else {
    globalThis.addEventListener?.("resize", scheduleNationalMinZoom);
  }
}
```

La variable `nationalResizeObserver` reste dans la fermeture de la carte pour conserver l’observateur pendant toute la durée de la page.

- [ ] **Step 4: Faire vérifier le vert par GPT-5.4 Mini**

```powershell
node --test tests/grid-hydrique/map.test.mjs
node --test tests/grid-hydrique/*.test.mjs
```

Expected: tous les tests passent ; `fitBounds` reste appelé une seule fois après un redimensionnement simulé.

- [ ] **Step 5: Commit ciblé**

```powershell
git add -- assets/js/grid-hydrique/map.mjs tests/grid-hydrique/map.test.mjs
git diff --cached --check
git commit -m "fix(map): cap zoom at national extent"
```

### Task 3: Générer toutes les stations actives métropolitaines

**Files:**
- Create: `scripts/build-water-stations.mjs`
- Delete: `scripts/build-water-station-samples.mjs`
- Create: `tests/grid-hydrique/stations.test.mjs`
- Delete: `tests/grid-hydrique/samples.test.mjs`
- Generate: `assets/data/piezo-stations.json`
- Generate: `assets/data/hydro-stations.json`
- Modify: `tests/validate-grid-hydrique.ps1:107-130`

- [ ] **Step 1: Faire remplacer les tests d’échantillonnage par GPT-5.4 Mini**

GPT-5.4 Mini remplace `samples.test.mjs` par `stations.test.mjs`. Le nouveau test importe l’API souhaitée avant qu’elle existe :

```js
import {
  buildStationUrls,
  isMetropolitanDepartment,
  stationReferenceDate,
} from "../../scripts/build-water-stations.mjs";

test("le périmètre conserve uniquement les départements métropolitains", () => {
  for (const code of ["01", "19", "2A", "2B", "21", "75", "95"]) {
    assert.equal(isMetropolitanDepartment(code), true);
  }
  for (const code of [null, "20", "971", "972", "973", "974", "976"]) {
    assert.equal(isMetropolitanDepartment(code), false);
  }
});

test("la date de recherche piézométrique absorbe sept jours de publication", () => {
  assert.equal(stationReferenceDate(new Date("2026-08-30T12:00:00Z")), "2026-08-23");
});

test("les URLs demandent les stations actives sans plafond d’échantillon", () => {
  const urls = buildStationUrls(new Date("2026-08-30T12:00:00Z"));
  assert.match(urls.piezo, /date_recherche=2026-08-23/);
  assert.match(urls.hydro, /en_service=true/);
  assert.doesNotMatch(urls.piezo + urls.hydro, /size=1000|nb_mesures_piezo_min/);
});
```

Le test des fichiers générés exige des ensembles complets et déterministes :

```js
assert.ok(piezo.stations.length > 350);
assert.ok(hydro.stations.length > 350);
assert.equal(new Set(piezo.stations.map(({ code }) => code)).size, piezo.stations.length);
assert.equal(new Set(hydro.stations.map(({ code }) => code)).size, hydro.stations.length);
assert.deepEqual(
  piezo.stations.map(({ code }) => code),
  piezo.stations.map(({ code }) => code).toSorted((a, b) => a.localeCompare(b, "fr")),
);
for (const station of [...piezo.stations, ...hydro.stations]) {
  assert.equal(isMetropolitanDepartment(station.departmentCode), true);
  assert.equal(Number.isFinite(station.longitude), true);
  assert.equal(Number.isFinite(station.latitude), true);
}
```

GPT-5.4 Mini ajoute au validateur PowerShell :

```powershell
Assert-True (Test-Path -LiteralPath (Join-Path $projectRoot 'scripts/build-water-stations.mjs')) 'Le générateur complet des stations est absent'
Assert-True (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'scripts/build-water-station-samples.mjs'))) 'L’ancien générateur d’échantillons existe encore'
```

- [ ] **Step 2: Faire constater le rouge par GPT-5.4 Mini**

```powershell
node --test tests/grid-hydrique/stations.test.mjs
& ./tests/validate-grid-hydrique.ps1
```

Expected: FAIL parce que `build-water-stations.mjs` n’existe pas encore et que les fichiers contiennent exactement 350 stations chacun.

- [ ] **Step 3: Créer le générateur complet**

L’agent principal crée `scripts/build-water-stations.mjs` avec les contrats suivants :

```js
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REFERENCE_LAG_DAYS = 7;
const METROPOLITAN_BOUNDS = Object.freeze({ west: -5.5, south: 41, east: 10, north: 51.5 });

export function isMetropolitanDepartment(code) {
  if (code === "2A" || code === "2B") return true;
  if (!/^\d{2}$/.test(code || "")) return false;
  const number = Number(code);
  return (number >= 1 && number <= 19) || (number >= 21 && number <= 95);
}

export function stationReferenceDate(now = new Date()) {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() - REFERENCE_LAG_DAYS);
  return date.toISOString().slice(0, 10);
}

export function buildStationUrls(now = new Date()) {
  const date = stationReferenceDate(now);
  return {
    piezo: `https://hubeau.eaufrance.fr/api/v1/niveaux_nappes/stations?date_recherche=${date}&size=20000&fields=code_bss,bss_id,libelle_pe,nom_commune,code_departement,nom_departement,altitude_station,nb_mesures_piezo,date_fin_mesure,x,y`,
    hydro: "https://hubeau.eaufrance.fr/api/v2/hydrometrie/referentiel/stations?en_service=true&size=20000&fields=code_station,libelle_station,libelle_commune,code_departement,libelle_departement,libelle_cours_eau,longitude_station,latitude_station,en_service,date_maj_station",
  };
}
```

Il reprend la pagination et la normalisation sous ces formes exactes, sans `SAMPLE_SIZE`, `spatialSample` ni `squaredDistance` :

```js
async function fetchAll(url) {
  const records = [];
  let next = url;
  while (next) {
    const response = await fetch(next, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Hub’Eau: HTTP ${response.status}`);
    const payload = await response.json();
    records.push(...payload.data);
    next = payload.next;
  }
  return records;
}

function normalizePiezo(station) {
  return {
    code: station.code_bss,
    kind: "piezo",
    name: station.libelle_pe || station.code_bss,
    commune: station.nom_commune || "Commune non renseignée",
    departmentCode: station.code_departement,
    departmentName: station.nom_departement,
    altitude: Number(station.altitude_station) || null,
    measurementCount: Number(station.nb_mesures_piezo) || 0,
    lastMeasurement: station.date_fin_mesure,
    longitude: Number(station.x),
    latitude: Number(station.y),
  };
}

function normalizeHydro(station) {
  return {
    code: station.code_station,
    kind: "hydro",
    name: station.libelle_station || station.code_station,
    commune: station.libelle_commune || "Commune non renseignée",
    departmentCode: station.code_departement,
    departmentName: station.libelle_departement,
    watercourse: station.libelle_cours_eau || "Cours d’eau non renseigné",
    lastMeasurement: station.date_maj_station,
    longitude: Number(station.longitude_station),
    latitude: Number(station.latitude_station),
  };
}

async function writeStations(fileName, source, stations) {
  const output = {
    generatedAt: new Date().toISOString(),
    source,
    stations: stations.sort((left, right) => left.code.localeCompare(right.code, "fr")),
  };
  const outputPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../assets/data", fileName);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
}
```

Il filtre ensuite le périmètre géographique :

```js
function isMetropolitanStation(station) {
  return isMetropolitanDepartment(station.departmentCode)
    && Number.isFinite(station.longitude)
    && Number.isFinite(station.latitude)
    && station.longitude >= METROPOLITAN_BOUNDS.west
    && station.longitude <= METROPOLITAN_BOUNDS.east
    && station.latitude >= METROPOLITAN_BOUNDS.south
    && station.latitude <= METROPOLITAN_BOUNDS.north;
}

async function main() {
  const urls = buildStationUrls();
  const [piezoRaw, hydroRaw] = await Promise.all([fetchAll(urls.piezo), fetchAll(urls.hydro)]);
  const piezo = piezoRaw.map(normalizePiezo).filter(isMetropolitanStation);
  const hydro = hydroRaw.map(normalizeHydro).filter(isMetropolitanStation);
  await Promise.all([
    writeStations("piezo-stations.json", urls.piezo, piezo),
    writeStations("hydro-stations.json", urls.hydro, hydro),
  ]);
  console.log(`Référentiels générés : ${piezo.length} piézomètres, ${hydro.length} stations hydrométriques.`);
}

const isMainModule = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
```

Le fichier de sortie conserve `{ generatedAt, source, stations }` et trie `stations` par `code` avant sérialisation. L’ancien script est supprimé avec `apply_patch` après création du nouveau.

- [ ] **Step 4: Régénérer les instantanés officiels**

L’agent principal exécute, hors commande de test :

```powershell
node scripts/build-water-stations.mjs
```

Expected: les deux nombres annoncés sont supérieurs à 350 ; les deux JSON sont réécrits sans erreur réseau.

- [ ] **Step 5: Faire vérifier le vert par GPT-5.4 Mini**

```powershell
node --test tests/grid-hydrique/stations.test.mjs
& ./tests/validate-grid-hydrique.ps1
git diff --check
```

Expected: PASS ; aucun code ultramarin, aucun doublon, aucun ancien générateur.

- [ ] **Step 6: Commit ciblé**

```powershell
git add -- scripts/build-water-stations.mjs scripts/build-water-station-samples.mjs tests/grid-hydrique/stations.test.mjs tests/grid-hydrique/samples.test.mjs tests/validate-grid-hydrique.ps1 assets/data/piezo-stations.json assets/data/hydro-stations.json
git diff --cached --check
git commit -m "feat(map): load all active mainland stations"
```

### Task 4: Fusionner les mesures sans remplacer les points

**Files:**
- Modify: `assets/js/grid-hydrique/domain.mjs:1-115`
- Modify: `assets/js/grid-hydrique/dashboard.mjs:44-50,210-250,386-405`
- Test: `tests/grid-hydrique/domain.test.mjs`
- Test: `tests/grid-hydrique/accessibility-regressions.test.mjs`

- [ ] **Step 1: Faire écrire le test rouge de fusion par GPT-5.4 Mini**

GPT-5.4 Mini ajoute dans `domain.test.mjs` :

```js
test("les mesures enrichissent le référentiel sans modifier ses points", () => {
  const stations = {
    type: "FeatureCollection",
    features: [
      { type: "Feature", geometry: { type: "Point", coordinates: [1, 45] }, properties: { code: "A", name: "Alpha" } },
      { type: "Feature", geometry: { type: "Point", coordinates: [2, 46] }, properties: { code: "B", name: "Beta" } },
    ],
  };
  const measurements = {
    type: "FeatureCollection",
    features: [
      { type: "Feature", geometry: { type: "Point", coordinates: [9, 49] }, properties: { stationCode: "B", value: 1.2, measuredAt: "2026-08-30T08:00:00Z" } },
      { type: "Feature", geometry: { type: "Point", coordinates: [3, 47] }, properties: { stationCode: "C", value: 9 } },
    ],
  };

  const merged = mergeStationMeasurements(stations, measurements);

  assert.deepEqual(merged.features.map(({ properties }) => properties.code), ["A", "B"]);
  assert.deepEqual(merged.features.map(({ geometry }) => geometry.coordinates), [[1, 45], [2, 46]]);
  assert.equal(merged.features[1].properties.value, 1.2);
  assert.equal(merged.features[1].properties.name, "Beta");
});
```

Elle ajoute un second test appliquant successivement deux viewports et une collection vide ; le nombre, l’ordre et les géométries doivent rester identiques après chaque fusion.

- [ ] **Step 2: Faire constater le rouge par GPT-5.4 Mini**

```powershell
node --test tests/grid-hydrique/domain.test.mjs
```

Expected: FAIL avec export `mergeStationMeasurements` absent.

- [ ] **Step 3: Implémenter la fusion pure minimale**

L’agent principal ajoute dans `domain.mjs` :

```js
export function mergeStationMeasurements(stations, measurements) {
  const updates = new Map(
    measurements.features
      .filter((feature) => feature.properties?.stationCode)
      .map((feature) => [feature.properties.stationCode, feature.properties]),
  );

  return {
    ...stations,
    features: stations.features.map((feature) => {
      const update = updates.get(feature.properties?.code);
      if (!update) return feature;
      return {
        ...feature,
        properties: { ...feature.properties, ...update, code: feature.properties.code },
      };
    }),
  };
}
```

La géométrie canonique n’est jamais lue depuis `measurements`.

- [ ] **Step 4: Faire vérifier le vert unitaire par GPT-5.4 Mini**

```powershell
node --test tests/grid-hydrique/domain.test.mjs
```

Expected: PASS pour les codes inconnus, les collections vides et les cycles successifs.

- [ ] **Step 5: Faire écrire le test rouge d’orchestration par GPT-5.4 Mini**

Dans `accessibility-regressions.test.mjs`, GPT-5.4 Mini ajoute un scénario sur deux référentiels canoniques :

```js
const piezoAfterA = mergeStationMeasurements(piezoNational, piezoViewportA);
const piezoAfterB = mergeStationMeasurements(piezoAfterA, piezoViewportB);
const hydroAfterFailure = mergeStationMeasurements(hydroNational, emptyMeasurements);

assert.deepEqual(stationIdentity(piezoAfterA), stationIdentity(piezoNational));
assert.deepEqual(stationIdentity(piezoAfterB), stationIdentity(piezoNational));
assert.deepEqual(stationIdentity(hydroAfterFailure), stationIdentity(hydroNational));
```

Elle ajoute l’import `node:fs` puis ce test structurel du dashboard :

```js
import fs from "node:fs";

test("le dashboard conserve les référentiels pendant les changements de zoom", () => {
  const source = fs.readFileSync(
    new URL("../../assets/js/grid-hydrique/dashboard.mjs", import.meta.url),
    "utf8",
  );
  assert.match(source, /piezoStationData\s*=\s*mergeStationMeasurements\(/);
  assert.match(source, /hydroStationData\s*=\s*mergeStationMeasurements\(/);
  assert.doesNotMatch(source, /staticPiezoData|staticHydroData/);
  assert.doesNotMatch(
    source,
    /getZoom\(\)\s*<\s*6[\s\S]*?setStations\(["'](?:piezo|hydro)["']/,
  );
});
```

- [ ] **Step 6: Faire constater le rouge d’orchestration par GPT-5.4 Mini**

```powershell
node --test tests/grid-hydrique/accessibility-regressions.test.mjs
```

Expected: FAIL parce que `dashboard.mjs` remplace encore chaque source par le GeoJSON du viewport et restaure les anciennes collections sous le zoom 6.

- [ ] **Step 7: Conserver les collections canoniques dans le dashboard**

L’agent principal importe la fusion :

```js
import {
  buildRestrictionSummary,
  hydroObservationsToGeoJson,
  mergeStationMeasurements,
  piezoObservationsToGeoJson,
} from "./domain.mjs";
```

Il remplace les variables statiques par :

```js
let piezoStationData;
let hydroStationData;
```

La branche de zoom national ne remplace plus les sources :

```js
if (waterMap.getZoom() < 6) {
  if (announce) statusElement.textContent = "Zoomez pour charger les mesures récentes.";
  return { partial: false, message: "" };
}
```

Chaque succès fusionne les propriétés avant `setStations` :

```js
if (piezoResult.status === "fulfilled") {
  const updates = piezoObservationsToGeoJson(piezoResult.value.data, new Date(), piezoMetadata);
  piezoStationData = mergeStationMeasurements(piezoStationData, updates);
  waterMap.setStations("piezo", piezoStationData);
  const measuredAt = latestDate(piezoResult.value.data, "date_mesure");
  sourceDates.piezo = measuredAt ? formatUpdateTime(new Date(measuredAt)) : "aucune mesure récente";
  truncated ||= Boolean(piezoResult.value.next);
}

if (hydroResult.status === "fulfilled") {
  const updates = hydroObservationsToGeoJson(hydroResult.value.data, new Date(), hydroMetadata);
  hydroStationData = mergeStationMeasurements(hydroStationData, updates);
  waterMap.setStations("hydro", hydroStationData);
  const measuredAt = latestDate(hydroResult.value.data, "date_obs");
  sourceDates.hydro = measuredAt ? formatUpdateTime(new Date(measuredAt)) : "aucune mesure récente";
  truncated ||= Boolean(hydroResult.value.next);
}
```

À l’initialisation, il renomme aussi les valeurs chargées `piezoReference` et `hydroReference`, puis applique exactement :

```js
piezoMetadata = new Map(piezoReference.stations.map((station) => [station.code, station]));
hydroMetadata = new Map(hydroReference.stations.map((station) => [station.code, station]));
sourceDates.piezo = `référentiel du ${formatUpdateTime(new Date(piezoReference.generatedAt))}`;
sourceDates.hydro = `référentiel du ${formatUpdateTime(new Date(hydroReference.generatedAt))}`;
piezoStationData = stationsToGeoJson(piezoReference.stations);
hydroStationData = stationsToGeoJson(hydroReference.stations);

waterMap = createWaterMap({
  maplibre,
  container: "carte-hydrique",
  departments: joinDepartmentRestrictions(departmentsGeoJson, []),
  piezoStations: piezoReference.stations,
  hydroStations: hydroReference.stations,
  onSelect: showSelection,
});
```

Aucune nouvelle source MapLibre n’est créée.

- [ ] **Step 8: Faire vérifier le vert et la non-régression par GPT-5.4 Mini**

```powershell
node --test tests/grid-hydrique/domain.test.mjs tests/grid-hydrique/accessibility-regressions.test.mjs
node --test tests/grid-hydrique/*.test.mjs
```

Expected: toutes les suites passent ; aucune assertion n’accepte un changement de nombre ou de géométrie.

- [ ] **Step 9: Commit ciblé**

```powershell
git add -- assets/js/grid-hydrique/domain.mjs assets/js/grid-hydrique/dashboard.mjs tests/grid-hydrique/domain.test.mjs tests/grid-hydrique/accessibility-regressions.test.mjs
git diff --cached --check
git commit -m "fix(map): keep station points stable across zooms"
```

### Task 5: Recette navigateur et preuves finales

**Files:**
- Modify: `log.md`

- [ ] **Step 1: Faire exécuter toute la validation par GPT-5.4 Mini**

GPT-5.4 Mini exécute séparément :

```powershell
node --test tests/grid-hydrique/*.test.mjs
& ./tests/validate-grid-hydrique.ps1
& ./tests/validate-site.ps1
node --test tests/contact-script.test.js
git diff --check
```

Expected: tous les codes de sortie valent `0`; GPT-5.4 Mini rapporte le nombre exact de tests et les volumes exacts des deux référentiels.

- [ ] **Step 2: Faire tester le zoom minimal dans Edge par GPT-5.4 Mini**

GPT-5.4 Mini sert le worktree avec `.mjs` en `text/javascript` et `Cache-Control: no-store`, puis vérifie à 320, 768, 1024 et 1440 px :

```text
1. La France métropolitaine et la Corse sont entièrement visibles au chargement.
2. Le bouton « − » est désactivé au cadrage initial.
3. Après zoom avant, des clics répétés sur « − » s’arrêtent exactement au cadrage national.
4. Après passage portrait ↔ paysage, la nouvelle limite est appliquée.
5. Le centre choisi par l’utilisateur n’est pas réinitialisé par un simple redimensionnement.
```

Expected: aucune erreur console ou `pageerror`; aucune marge excessive créée par un dézoom supplémentaire.

- [ ] **Step 3: Faire tester la stabilité des stations dans Edge par GPT-5.4 Mini**

GPT-5.4 Mini bloque d’abord les deux endpoints de mesures Hub’Eau, capture la carte au même cadrage avant et après trois cycles zoom avant → déplacement → retour au minimum, puis compare les captures et les erreurs. Elle répète avec les endpoints actifs et attend la fin de chaque requête.

Expected:

```text
- les mêmes points sont présents au même cadrage final ;
- aucune source ne devient vide pendant un chargement ;
- les pannes partielles ne font disparaître aucun réseau ;
- les sélections de stations continuent d’ouvrir le détail et l’historique ;
- aucune réponse tardive ne restaure un ancien ensemble de points.
```

- [ ] **Step 4: Corriger uniquement par un nouveau cycle TDD si la recette échoue**

Pour chaque défaut, GPT-5.4 Mini écrit ou adapte d’abord un test automatisé qui reproduit précisément l’échec et le lance en rouge. L’agent principal applique ensuite une seule correction de production, puis GPT-5.4 Mini relance le test ciblé et la validation complète. Ne jamais modifier la production directement depuis une observation manuelle non couverte.

- [ ] **Step 5: Journaliser la livraison**

L’agent principal lit l’heure système avec :

```powershell
Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz'
```

Puis il ajoute à `log.md` la demande, la cause (`setStations` remplaçait le référentiel par les observations du viewport), les volumes générés, le comportement du zoom minimal et toutes les preuves GPT-5.4 Mini.

- [ ] **Step 6: Faire contrôler le journal par GPT-5.4 Mini puis commit**

GPT-5.4 Mini exécute :

```powershell
git diff --check -- log.md
```

L’agent principal commit ensuite :

```powershell
git add -- log.md
git diff --cached --check
git commit -m "docs(log): record stable map navigation"
```

### Task 6: Revue indépendante et intégration

**Files:**
- Review: all changes from the merge base to `HEAD`

- [ ] **Step 1: Demander une revue indépendante**

Un sous-agent reviewer inspecte le diff complet contre cette spécification :

```powershell
git merge-base HEAD master
git diff --stat master...HEAD
git diff master...HEAD
```

Il vérifie au minimum : limite de zoom réellement responsive, absence de recentrage, filtres d’activité et de périmètre, déterminisme des instantanés, stabilité des géométries, réponses obsolètes, pannes partielles, performance de plusieurs milliers de points et couverture des tests.

Expected: aucune issue `Critical` ou `Important`. Toute issue de ces niveaux repart dans un cycle rouge → correction → vert avec GPT-5.4 Mini.

- [ ] **Step 2: Présenter le choix d’intégration**

Après revue verte et worktree propre, proposer exactement :

```text
1. Fusionner localement dans master
2. Pousser la branche et créer une PR
3. Conserver la branche telle quelle
4. Abandonner les changements
```

Ne fusionner, pousser ou supprimer la branche qu’après le choix explicite de l’utilisateur.
