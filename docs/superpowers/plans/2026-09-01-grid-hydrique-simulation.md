# Grid Hydrique Simulation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter à la carte hydrique une comparaison réversible entre les données réelles et une simulation pédagogique du Grid en trois phases.

**Architecture:** Un nouveau module pur transforme les niveaux VigiEau et fournit le GeoJSON schématique. `map.mjs` applique les expressions de couleur et gère les calques cumulés, tandis que `dashboard.mjs` coordonne les contrôles, le masquage des stations et le détail simulé sans modifier le cycle d’actualisation réel.

**Tech Stack:** HTML/CSS statique, JavaScript ES modules, MapLibre GL 6.6.0, tests `node:test`, validateurs PowerShell.

---

## Carte des fichiers

- Créer `assets/js/grid-hydrique/simulation.mjs` : règles pures des phases, expressions MapLibre et GeoJSON illustratif.
- Créer `tests/grid-hydrique/simulation.test.mjs` : contrat des transformations, libellés et données du réseau.
- Modifier `assets/js/grid-hydrique/map.mjs` : calques réseau, peintures simulées, état réel/simulation et restauration des stations.
- Modifier `tests/grid-hydrique/map.test.mjs` : intégration MapLibre, visibilité cumulative et sélection sans stations.
- Modifier `assets/js/grid-hydrique/templates.mjs` : contrôles du scénario et détail comparatif échappé.
- Modifier `tests/grid-hydrique/templates.test.mjs` : structure accessible et rendu des niveaux réel/simulé.
- Modifier `assets/js/grid-hydrique/dashboard.mjs` : coordination du scénario et arrêt des appels station en simulation.
- Modifier `grid-hydrique/index.html` : note pédagogique et légende du réseau.
- Modifier `assets/css/grid-hydrique.css` : visibilité, cibles accessibles, note et légende.
- Modifier `tests/grid-hydrique/accessibility-regressions.test.mjs` : contrat structurel du dashboard.
- Modifier `tests/validate-grid-hydrique.ps1` : validation statique des nouveaux éléments.
- Modifier `log.md` : décisions, résultats TDD et vérifications.

### Task 1: Domaine pur de simulation

**Files:**
- Create: `assets/js/grid-hydrique/simulation.mjs`
- Create: `tests/grid-hydrique/simulation.test.mjs`

- [ ] **Step 1: Écrire les tests rouges des trois phases**

Créer `tests/grid-hydrique/simulation.test.mjs` avec les cas explicites suivants :

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  GRID_PHASES,
  NATIONAL_CORRIDORS,
  REGIONAL_HUBS,
  REGIONAL_LINKS,
  restrictionExpression,
  simulateSeverity,
} from "../../assets/js/grid-hydrique/simulation.mjs";

const colors = {
  crise: "crise",
  alerte_renforcee: "renforcee",
  alerte: "alerte",
  vigilance: "vigilance",
  none: "none",
};

test("la phase 1 réduit chaque niveau d’un cran avec un plancher vert", () => {
  assert.equal(simulateSeverity("crise", "phase1"), "alerte_renforcee");
  assert.equal(simulateSeverity("alerte", "phase1"), "vigilance");
  assert.equal(simulateSeverity("none", "phase1"), "none");
});

test("la phase 2 réduit chaque niveau de deux crans", () => {
  assert.equal(simulateSeverity("crise", "phase2"), "alerte");
  assert.equal(simulateSeverity("alerte", "phase2"), "none");
});

test("la phase 3 rend tout niveau vert", () => {
  for (const level of ["crise", "alerte_renforcee", "alerte", "vigilance", "none", "inconnu"]) {
    assert.equal(simulateSeverity(level, "phase3"), "none");
  }
});

test("les niveaux inconnus restent au repli sans restriction", () => {
  assert.equal(simulateSeverity(undefined, "phase1"), "none");
  assert.equal(simulateSeverity("inconnu", "phase2"), "none");
});

test("l’expression MapLibre reflète exactement la fonction de domaine", () => {
  assert.deepEqual(restrictionExpression("severity", "phase1", colors), [
    "match", ["get", "severity"],
    "crise", "renforcee",
    "alerte_renforcee", "alerte",
    "alerte", "vigilance",
    "vigilance", "none",
    "none",
  ]);
  assert.equal(restrictionExpression("niveauGravite", "phase3", colors), "none");
});

test("les phases et le réseau schématique sont complets et nommés", () => {
  assert.deepEqual(Object.keys(GRID_PHASES), ["phase1", "phase2", "phase3"]);
  assert.equal(REGIONAL_HUBS.type, "FeatureCollection");
  assert.ok(REGIONAL_HUBS.features.length >= 8);
  assert.equal(REGIONAL_LINKS.type, "FeatureCollection");
  assert.deepEqual(
    NATIONAL_CORRIDORS.features.map((feature) => feature.properties.name),
    ["Massif Central → Sud-Ouest", "Normandie → Centre"],
  );
});
```

- [ ] **Step 2: Vérifier l’échec attendu**

Run: `node --test tests/grid-hydrique/simulation.test.mjs`

Expected: FAIL avec `ERR_MODULE_NOT_FOUND` pour `simulation.mjs`.

- [ ] **Step 3: Implémenter le module pur minimal**

Créer `assets/js/grid-hydrique/simulation.mjs` avec :

```js
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
```

- [ ] **Step 4: Vérifier le passage au vert**

Run: `node --test tests/grid-hydrique/simulation.test.mjs`

Expected: PASS, 6 tests, 0 échec.

- [ ] **Step 5: Commit du domaine**

```powershell
git add -- assets/js/grid-hydrique/simulation.mjs tests/grid-hydrique/simulation.test.mjs
git diff --cached --check
git commit -m "feat(grid): add simulation domain model"
```

### Task 2: Calques MapLibre et restauration des stations

**Files:**
- Modify: `assets/js/grid-hydrique/map.mjs`
- Modify: `tests/grid-hydrique/map.test.mjs`

- [ ] **Step 1: Étendre le faux MapLibre et écrire les tests rouges**

Dans `makeFakeMaplibre`, ajouter l’enregistrement des peintures :

```js
paint: {},
```

et la méthode :

```js
setPaintProperty(id, property, value) {
  this.calls.paint[`${id}:${property}`] = value;
}
```

Ajouter des tests vérifiant :

```js
test("la simulation masque les stations et affiche le réseau cumulativement", async () => {
  const { waterMap } = createTestWaterMap();
  await waterMap.ready;

  waterMap.setLayerVisibility("piezo-points", false);
  waterMap.setSimulationPhase("phase1");
  assert.equal(waterMap.map.calls.visibility["piezo-points"], "none");
  assert.equal(waterMap.map.calls.visibility["hydro-points"], "none");
  assert.equal(waterMap.map.calls.visibility["grid-local-lines"], "visible");
  assert.equal(waterMap.map.calls.visibility["grid-regional-links"], "none");
  assert.equal(waterMap.map.calls.visibility["grid-national-corridors"], "none");

  waterMap.setSimulationPhase("phase2");
  assert.equal(waterMap.map.calls.visibility["grid-local-lines"], "visible");
  assert.equal(waterMap.map.calls.visibility["grid-regional-links"], "visible");
  assert.equal(waterMap.map.calls.visibility["grid-regional-hubs"], "visible");
  assert.equal(waterMap.map.calls.visibility["grid-national-corridors"], "none");

  waterMap.setSimulationPhase("phase3");
  assert.equal(waterMap.map.calls.visibility["grid-national-corridors"], "visible");

  waterMap.setSimulationPhase(null);
  assert.equal(waterMap.map.calls.visibility["piezo-points"], "none");
  assert.equal(waterMap.map.calls.visibility["hydro-points"], "visible");
});

test("les phases recolorent départements et zones depuis les mêmes règles", async () => {
  const { waterMap, FakePMTiles, FakeProtocol } = createTestWaterMap();
  await waterMap.ready;
  await waterMap.loadZoneLayers({ PMTiles: FakePMTiles, Protocol: FakeProtocol });

  waterMap.setSimulationPhase("phase1");
  assert.equal(waterMap.map.calls.paint["departments-fill:fill-color"][3], theme.restrictions.alerte_renforcee);
  assert.equal(waterMap.map.calls.paint["zones-fill:fill-color"][3], theme.restrictions.alerte_renforcee);

  waterMap.setSimulationPhase("phase3");
  assert.equal(waterMap.map.calls.paint["departments-fill:fill-color"], theme.restrictions.none);
  assert.equal(waterMap.map.calls.paint["zones-fill:fill-color"], theme.restrictions.none);
});

test("une erreur propre au réseau laisse la carte réelle disponible", async () => {
  const { waterMap } = createTestWaterMap({ failSimulationSources: true });
  await waterMap.ready;

  assert.equal(waterMap.isSimulationAvailable(), false);
  assert.equal(waterMap.setSimulationPhase("phase1"), false);
  assert.ok(waterMap.map.layers.get("departments-fill"));
  assert.notEqual(waterMap.map.calls.visibility["hydro-points"], "none");
});
```

- [ ] **Step 2: Vérifier l’échec attendu**

Run: `node --test tests/grid-hydrique/map.test.mjs`

Expected: FAIL parce que `setSimulationPhase` et les calques `grid-*` n’existent pas.

- [ ] **Step 3: Ajouter sources, calques et état de simulation**

Importer `NATIONAL_CORRIDORS`, `REGIONAL_HUBS`, `REGIONAL_LINKS` et `restrictionExpression`. Définir les expressions réelles une seule fois. Dans le callback `load`, ajouter trois sources GeoJSON, puis les calques suivants avant `departments-line` :

```js
map.addLayer({
  id: "grid-local-lines",
  type: "line",
  source: "departments",
  layout: { visibility: "none" },
  paint: { "line-color": theme.waterDeep, "line-width": 2, "line-dasharray": [2, 2] },
}, "departments-line");
map.addLayer({
  id: "grid-regional-links",
  type: "line",
  source: "grid-regional-links-source",
  layout: { visibility: "none" },
  paint: { "line-color": theme.water, "line-width": 3 },
}, "departments-line");
map.addLayer({
  id: "grid-regional-hubs",
  type: "circle",
  source: "grid-regional-hubs-source",
  layout: { visibility: "none" },
  paint: { "circle-color": theme.waterDeep, "circle-radius": 4, "circle-stroke-color": theme.paper, "circle-stroke-width": 1 },
}, "departments-line");
map.addLayer({
  id: "grid-national-corridors",
  type: "line",
  source: "grid-national-corridors-source",
  layout: { visibility: "none" },
  paint: { "line-color": theme.ink, "line-width": 5, "line-dasharray": [3, 1] },
}, "departments-line");
```

Regrouper l’ajout des trois sources et des quatre calques dans `addSimulationLayers()`. L’appeler dans un `try/catch` après la création des calques réels : en cas d’exception, écrire l’erreur en console, laisser les éventuels calques partiels masqués et positionner `simulationAvailable = false`. Ajouter `failSimulationSources` au faux MapLibre afin que `addSource` lève uniquement pour les identifiants commençant par `grid-` dans le test de repli.

Dans `loadZoneLayers`, insérer `zones-fill` avant `grid-local-lines` afin que les remplissages restent sous le réseau, puis conserver `zones-line` avant `departments-line` afin que les limites restent au-dessus du réseau.

Conserver :

```js
let simulationPhase = null;
const stationVisibility = { "piezo-points": true, "hydro-points": true };
```

Faire mémoriser `stationVisibility` par `setLayerVisibility`. Ajouter `isSimulationAvailable()` à l’API retournée. Ajouter `setSimulationPhase(phase)` : retourner `false` sans modifier la carte si une phase est demandée alors que `simulationAvailable` est faux ; sinon appliquer `restrictionExpression("severity", phase, theme.restrictions)` aux départements, l’équivalent `niveauGravite` aux zones si elles existent, vider `selected-point`, masquer les stations en simulation, restaurer leurs valeurs mémorisées en réel, régler les calques réseau selon `phase1`, `phase2` et `phase3`, puis retourner `true`.

- [ ] **Step 4: Empêcher toute sélection de station simulée**

Étendre `selectFeatureAtMapCenter(map, onSelect, includeStations = true)` et omettre `piezo-points`/`hydro-points` lorsque `includeStations` vaut `false`. Dans les handlers clic, retourner avant `onSelect` si `simulationPhase` est actif et que le calque est une station. Le handler clavier passe `!simulationPhase`.

- [ ] **Step 5: Vérifier les tests MapLibre**

Run: `node --test tests/grid-hydrique/map.test.mjs`

Expected: PASS, tous les tests du fichier, 0 échec.

- [ ] **Step 6: Commit de la carte**

```powershell
git add -- assets/js/grid-hydrique/map.mjs tests/grid-hydrique/map.test.mjs
git diff --cached --check
git commit -m "feat(grid): render phased simulation network"
```

### Task 3: Contrôles accessibles et détail simulé

**Files:**
- Modify: `assets/js/grid-hydrique/templates.mjs`
- Modify: `tests/grid-hydrique/templates.test.mjs`

- [ ] **Step 1: Écrire les tests rouges des templates**

Importer `renderSimulationDetail`, puis étendre le test des contrôles :

```js
assert.match(html, /<legend>Scénario<\/legend>/);
assert.match(html, /name="grid-scenario" value="real" checked/);
assert.match(html, /name="grid-scenario" value="simulation"/);
assert.match(html, /data-grid-phases hidden disabled/);
assert.match(html, /name="grid-phase" value="phase1" checked/);
assert.match(html, /name="grid-phase" value="phase2"/);
assert.match(html, /name="grid-phase" value="phase3"/);
```

Ajouter :

```js
test("renderSimulationDetail compare le niveau officiel au scénario sans contenu brut", () => {
  const html = renderSimulationDetail({
    name: '<script>alert("x")</script>',
    realLevel: "crise",
    phase: "phase2",
  });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /Niveau officiel de départ[\s\S]*Crise/);
  assert.match(html, /Phase 2 — Interconnexions régionales/);
  assert.match(html, /Niveau simulé[\s\S]*Alerte/);
  assert.match(html, /hypothèse pédagogique/);
});
```

- [ ] **Step 2: Vérifier l’échec attendu**

Run: `node --test tests/grid-hydrique/templates.test.mjs`

Expected: FAIL sur l’absence des contrôles et de `renderSimulationDetail`.

- [ ] **Step 3: Ajouter les groupes radio au template**

Faire précéder les groupes existants dans `renderMapControls()` par :

```html
<fieldset class="water-control-group">
  <legend>Scénario</legend>
  <label class="water-layer-toggle"><input type="radio" name="grid-scenario" value="real" checked> Sans Grid hydrique</label>
  <label class="water-layer-toggle"><input type="radio" name="grid-scenario" value="simulation"> Avec Grid hydrique</label>
</fieldset>
<fieldset class="water-control-group" data-grid-phases hidden disabled>
  <legend>Déploiement du Grid</legend>
  <label class="water-layer-toggle"><input type="radio" name="grid-phase" value="phase1" checked> Phase 1</label>
  <label class="water-layer-toggle"><input type="radio" name="grid-phase" value="phase2"> Phase 2</label>
  <label class="water-layer-toggle"><input type="radio" name="grid-phase" value="phase3"> Phase 3</label>
</fieldset>
```

- [ ] **Step 4: Implémenter le détail comparatif**

Importer `GRID_PHASES` et `simulateSeverity`, rendre le nom échappé, deux blocs `detail-level`, le libellé complet de la phase et la phrase `Résultat théorique : hypothèse pédagogique, non prévision hydrologique.` Réutiliser `severityLabel` sans ajouter de nomenclature.

- [ ] **Step 5: Vérifier les templates**

Run: `node --test tests/grid-hydrique/templates.test.mjs`

Expected: PASS, tous les tests du fichier, 0 échec.

- [ ] **Step 6: Commit des templates**

```powershell
git add -- assets/js/grid-hydrique/templates.mjs tests/grid-hydrique/templates.test.mjs
git diff --cached --check
git commit -m "feat(grid): add simulation controls and detail"
```

### Task 4: Orchestration du dashboard et présentation

**Files:**
- Modify: `assets/js/grid-hydrique/dashboard.mjs`
- Modify: `grid-hydrique/index.html`
- Modify: `assets/css/grid-hydrique.css`
- Modify: `tests/grid-hydrique/accessibility-regressions.test.mjs`
- Modify: `tests/validate-grid-hydrique.ps1`

- [ ] **Step 1: Écrire les assertions rouges de structure et d’orchestration**

Dans `accessibility-regressions.test.mjs`, ajouter un test lisant HTML, CSS et dashboard et vérifiant :

```js
assert.match(html, /data-simulation-note hidden/);
assert.match(html, /Simulation pédagogique fondée sur les hypothèses du livre/);
assert.match(html, /data-grid-legend hidden/);
assert.match(html, /Réseau simulé/);
assert.match(css, /\.simulation-note\[hidden\]/);
assert.match(css, /\.grid-network-legend\[hidden\]/);
assert.match(dashboard, /waterMap\.setSimulationPhase\(/);
assert.match(dashboard, /layerControlsElement\.hidden\s*=\s*simulated/);
assert.match(dashboard, /renderSimulationDetail/);
```

Dans `validate-grid-hydrique.ps1`, ajouter les mêmes contrats statiques avec `Assert-True`, notamment les attributs `hidden`, les deux mentions pédagogiques et l’absence de couleur littérale dans `grid-hydrique.css`.

- [ ] **Step 2: Vérifier les échecs attendus**

Run: `node --test tests/grid-hydrique/accessibility-regressions.test.mjs`

Expected: FAIL sur les éléments de simulation absents.

Run: `powershell -ExecutionPolicy Bypass -File tests/validate-grid-hydrique.ps1`

Expected: FAIL sur les nouveaux contrats de simulation.

- [ ] **Step 3: Ajouter la note et la légende statiques**

Dans `grid-hydrique/index.html`, après `.water-map-controls`, ajouter :

```html
<p class="container simulation-note" data-simulation-note hidden>Simulation pédagogique fondée sur les hypothèses du livre, non prévision hydrologique. Tracés illustratifs.</p>
```

Dans `.water-map-legend`, après la légende des restrictions, ajouter :

```html
<div class="grid-network-legend" data-grid-legend hidden>
  <p><strong>Réseau simulé</strong> — implantation illustrative</p>
  <ul aria-label="Phases visibles du réseau simulé">
    <li><span class="network-swatch network-swatch--local" aria-hidden="true"></span>Boucles départementales</li>
    <li><span class="network-swatch network-swatch--regional" aria-hidden="true"></span>Interconnexions régionales</li>
    <li><span class="network-swatch network-swatch--national" aria-hidden="true"></span>Corridors nationaux</li>
  </ul>
</div>
```

- [ ] **Step 4: Ajouter les styles sans nouveau littéral de couleur**

Dans `grid-hydrique.css`, faire partager aux trois listes la mise en page flexible, ajouter `[hidden] { display: none; }`, styliser `.simulation-note` avec `border-left: 4px solid var(--water)` et les swatches avec `var(--water-deep)`, `var(--water)` et `var(--ink)`. Conserver des styles distincts par épaisseur ou motif, sans code hexadécimal ni `rgb/rgba`.

- [ ] **Step 5: Coordonner le scénario dans `dashboard.mjs`**

Importer `renderSimulationDetail`. Ajouter les références :

```js
const simulationNoteElement = document.querySelector("[data-simulation-note]");
const gridLegendElement = document.querySelector("[data-grid-legend]");
let simulationPhase = null;
```

Dans `setupMapControls`, écouter `grid-scenario` et `grid-phase`. Une fonction locale `applySimulationState()` doit :

```js
const simulated = simulationPhase !== null;
const phaseControls = viewControlsElement.querySelector("[data-grid-phases]");
phaseControls.hidden = !simulated;
phaseControls.disabled = !simulated;
layerControlsElement.hidden = simulated;
simulationNoteElement.hidden = !simulated;
gridLegendElement.hidden = !simulated;
selectionController?.abort();
waterMap.setSimulationPhase(simulationPhase);
detailElement.innerHTML = simulated
  ? '<h2 id="detail-title">Simulation du Grid</h2><p>Sélectionnez un département ou une zone pour comparer les niveaux.</p>'
  : '<h2 id="detail-title">Détail</h2><p>Sélectionnez un département ou une station sur la carte.</p>';
statusElement.textContent = simulated
  ? `${GRID_PHASES[simulationPhase].label} affichée — simulation pédagogique.`
  : "Données officielles affichées.";
```

Avant de rendre l’état simulé visible, contrôler la valeur de retour de `waterMap.setSimulationPhase(simulationPhase)`. Si elle vaut `false`, remettre `simulationPhase = null`, recocher la radio `real`, conserver les stations et annoncer `La simulation est temporairement indisponible. Données officielles conservées.`

Importer également `GRID_PHASES`. Le scénario réel passe `null`; le scénario simulé lit la radio de phase cochée, initialement `phase1`.

- [ ] **Step 6: Court-circuiter le détail réel en simulation**

Au début de `showSelection`, après lecture des propriétés, ajouter :

```js
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
```

Ce retour doit précéder tout appel `api.getLocalRestrictions`, `getPiezoHistory` ou `getHydroHistory`.

- [ ] **Step 7: Vérifier la couche d’interface**

Run: `node --test tests/grid-hydrique/accessibility-regressions.test.mjs tests/grid-hydrique/templates.test.mjs`

Expected: PASS, 0 échec.

Run: `powershell -ExecutionPolicy Bypass -File tests/validate-grid-hydrique.ps1`

Expected: `Validation dashboard réussie.` et code 0.

- [ ] **Step 8: Commit de l’orchestration**

```powershell
git add -- assets/js/grid-hydrique/dashboard.mjs grid-hydrique/index.html assets/css/grid-hydrique.css tests/grid-hydrique/accessibility-regressions.test.mjs tests/validate-grid-hydrique.ps1
git diff --cached --check
git commit -m "feat(grid): add real versus simulation toggle"
```

### Task 5: Vérification intégrale et journal

**Files:**
- Modify: `log.md`

- [ ] **Step 1: Exécuter toute la suite JavaScript**

Run: `node --test tests/grid-hydrique/*.test.mjs`

Expected: tous les tests Grid Hydrique passent, 0 échec.

Run: `node --test tests/theme.test.mjs tests/color-tokens.test.mjs tests/contact-script.test.js`

Expected: tous les tests transverses passent, 0 échec.

- [ ] **Step 2: Exécuter les validateurs PowerShell**

Run: `powershell -ExecutionPolicy Bypass -File tests/validate-grid-hydrique.ps1`

Expected: `Validation dashboard réussie.`

Run: `powershell -ExecutionPolicy Bypass -File tests/validate-site.ps1`

Expected: `Validation réussie : 6 pages contrôlées.`

- [ ] **Step 3: Vérifier le diff complet**

Run: `git diff --check`

Expected: aucune sortie et code 0.

Run: `git status --short`

Expected: uniquement `log.md` modifié et le fichier utilisateur non suivi `docs/superpowers/plans/2026-08-29 - dashboard_plan.md`; aucun autre changement applicatif non commité.

- [ ] **Step 4: Faire la recette navigateur**

Servir le dépôt avec `python -m http.server 8003 --bind 127.0.0.1`, puis vérifier à 320, 768, 1024 et 1440 px :

1. la page démarre sur `Sans Grid hydrique` avec stations visibles ;
2. `Avec Grid hydrique` masque points et contrôles des stations ;
3. Phase 1 améliore d’un niveau et montre le maillage départemental ;
4. Phase 2 améliore de deux niveaux et ajoute hubs/liaisons ;
5. Phase 3 rend tout le territoire vert et ajoute les deux corridors ;
6. `Départements / Zones` fonctionne dans les trois phases ;
7. Entrée au clavier sélectionne seulement département ou zone en simulation ;
8. les mentions pédagogiques restent visibles ;
9. le retour au réel restaure chaque case station dans son état antérieur ;
10. aucune erreur console, `pageerror`, ressource 404 ou contraste illisible n’apparaît.

- [ ] **Step 5: Consigner les preuves**

Ajouter à `log.md` une entrée horodatée avec : demande, décisions, règle des phases, fichiers livrés, nombres exacts de tests, sorties des deux validateurs, largeurs de recette et résultat de restauration des stations.

- [ ] **Step 6: Commit final du journal**

```powershell
git add -- log.md
git diff --cached --check
git commit -m "docs(log): record grid simulation delivery"
```

Le fichier utilisateur non suivi `docs/superpowers/plans/2026-08-29 - dashboard_plan.md` reste exclu de tous les commits.
