# VigiEau Zone Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter à la carte hydrique un mode `Zones` fondé sur les polygones officiels VigiEau, tout en conservant le mode départemental par défaut et un cadrage national complet au chargement.

**Architecture:** Un nouveau module pur `zones.mjs` porte les contrats VigiEau, les filtres MapLibre et la normalisation des résultats. `map.mjs` reste l’unique propriétaire des sources et couches cartographiques ; `dashboard.mjs` orchestre les contrôles, l’import différé de PMTiles 3.2.0 et les replis. Tous les tests, validateurs et contrôles navigateur sont écrits ou exécutés exclusivement par un sous-agent `gpt-5.6-luna` ; l’agent principal se limite au code de production, aux revues de diff et aux commits.

**Tech Stack:** HTML statique, CSS, modules JavaScript natifs, MapLibre GL JS 6.6.0, PMTiles 3.2.0, API VigiEau, `node:test`, PowerShell.

---

## Règles d’exécution obligatoires

- Lancer un sous-agent avec `model: gpt-5.6-luna` avant toute création, modification ou exécution de test.
- Le sous-agent Luna écrit le test rouge, l’exécute et transmet la commande, le code de sortie et la cause attendue.
- L’agent principal écrit ensuite uniquement le code de production minimal.
- Le sous-agent Luna exécute le test vert, la suite complète, les validateurs PowerShell et la recette navigateur.
- Ne jamais ajouter de mention `Co-authored-by` aux commits.
- Préserver le fichier utilisateur non suivi `docs/superpowers/plans/2026-08-29 - dashboard_plan.md`.
- Indexer chaque commit avec une liste explicite de chemins ; ne jamais utiliser `git add .`.

## Structure des fichiers

- Créer `assets/js/grid-hydrique/zones.mjs` : constantes VigiEau, ordre de gravité, filtres et normalisation.
- Créer `tests/grid-hydrique/zones.test.mjs` : contrat unitaire du module pur.
- Créer `tests/grid-hydrique/map.test.mjs` : cadrage national, couches PMTiles, visibilité et sélection.
- Modifier `assets/js/grid-hydrique/map.mjs` : cadrage, protocole PMTiles, couches zonales et modes.
- Modifier `assets/js/grid-hydrique/dashboard.mjs` : commandes, import différé, erreurs et clic zonal.
- Modifier `assets/js/grid-hydrique/templates.mjs` : commandes accessibles et détail multiressource.
- Modifier `tests/grid-hydrique/templates.test.mjs` : commandes, tri, échappement et liens sûrs.
- Modifier `grid-hydrique/index.html` : conteneur des commandes cartographiques.
- Modifier `assets/css/grid-hydrique.css` : commandes, détails de zones et hauteur responsive.
- Modifier `tests/validate-grid-hydrique.ps1` : contrat structurel et CSS.
- Modifier `log.md` : journal des demandes, décisions, erreurs et résultat final.

### Task 1: Sécuriser le correctif couleur déjà présent

**Files:**
- Modify: `assets/js/grid-hydrique/map.mjs`
- Modify: `assets/js/grid-hydrique/templates.mjs`
- Test: `tests/grid-hydrique/accessibility-regressions.test.mjs`
- Test: `tests/grid-hydrique/templates.test.mjs`

- [ ] **Step 1: Faire vérifier le correctif existant par Luna**

Le sous-agent `gpt-5.6-luna` inspecte les quatre fichiers et confirme que les tests existants couvrent exactement :

```js
assert.equal(departmentLayer.paint["fill-opacity"], 1);
assert.match(html, /Niveau maximal du département[\s\S]*detail-level--crise[^>]*>Crise/);
assert.match(html, /Au point sélectionné[\s\S]*detail-level--alerte_renforcee[^>]*>Alerte renforcée/);
```

- [ ] **Step 2: Exécuter les tests ciblés avec Luna**

Run, par Luna uniquement :

```powershell
node --test tests/grid-hydrique/accessibility-regressions.test.mjs tests/grid-hydrique/templates.test.mjs
```

Expected: PASS ; Luna transmet le nombre de tests et le code de sortie `0`.

- [ ] **Step 3: Commit ciblé par l’agent principal**

```powershell
git add -- assets/js/grid-hydrique/map.mjs assets/js/grid-hydrique/templates.mjs tests/grid-hydrique/accessibility-regressions.test.mjs tests/grid-hydrique/templates.test.mjs
git diff --cached
git commit -m "fix(map): align department colors with legend"
```

Expected: le commit ne contient que le correctif couleur et l’explication département/point local.

### Task 2: Ajouter le modèle pur des zones VigiEau

**Files:**
- Create: `assets/js/grid-hydrique/zones.mjs`
- Create: `tests/grid-hydrique/zones.test.mjs`

- [ ] **Step 1: Écrire les tests rouges avec Luna**

Le sous-agent Luna crée `tests/grid-hydrique/zones.test.mjs` :

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  ZONE_FILL_SORT_KEY,
  normalizeZones,
  resourceLabel,
  zoneResourceFilter,
} from "../../assets/js/grid-hydrique/zones.mjs";

test("les ressources VigiEau ont des libellés publics", () => {
  assert.equal(resourceLabel("SUP"), "Cours d’eau");
  assert.equal(resourceLabel("SOU"), "Nappes");
  assert.equal(resourceLabel("AEP"), "Eau potable");
});

test("le filtre Toutes conserve chaque ressource", () => {
  assert.equal(zoneResourceFilter("ALL"), null);
  assert.deepEqual(zoneResourceFilter("SUP"), ["==", ["get", "type"], "SUP"]);
});

test("la clé de tri place la crise au-dessus des niveaux faibles", () => {
  assert.deepEqual(ZONE_FILL_SORT_KEY, [
    "match", ["get", "niveauGravite"],
    "vigilance", 1,
    "alerte", 2,
    "alerte_renforcee", 3,
    "crise", 4,
    0,
  ]);
});

test("les zones ponctuelles sont normalisées et triées par gravité", () => {
  const zones = normalizeZones([
    { type: "AEP", nom: "Réseau local", niveauGravite: "vigilance" },
    { type: "SUP", nom: "<b>Charente</b>", niveauGravite: "crise" },
    { type: "SOU", nom: "Nappe", niveauGravite: "alerte_renforcee" },
  ]);
  assert.deepEqual(zones.map((zone) => zone.type), ["SUP", "SOU", "AEP"]);
  assert.equal(zones[0].resourceLabel, "Cours d’eau");
});
```

- [ ] **Step 2: Exécuter le test rouge avec Luna**

Run, par Luna uniquement :

```powershell
node --test tests/grid-hydrique/zones.test.mjs
```

Expected: FAIL avec `ERR_MODULE_NOT_FOUND` pour `zones.mjs`.

- [ ] **Step 3: Créer l’implémentation minimale**

L’agent principal crée `assets/js/grid-hydrique/zones.mjs` :

```js
// @ts-check

export const ZONE_SOURCE_URL = "https://regleau.s3.gra.perf.cloud.ovh.net/pmtiles/zones_arretes_en_vigueur.pmtiles";
export const ZONE_SOURCE_LAYER = "zones_arretes_en_vigueur";
export const ZONE_RESOURCES = Object.freeze(["ALL", "SUP", "SOU", "AEP"]);

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

export function normalizeZones(zones = []) {
  return zones
    .filter((zone) => zone && typeof zone === "object")
    .map((zone) => ({ ...zone, resourceLabel: resourceLabel(zone.type) }))
    .sort((left, right) => (SEVERITY_RANK[right.niveauGravite] || 0) - (SEVERITY_RANK[left.niveauGravite] || 0));
}
```

- [ ] **Step 4: Exécuter le test vert avec Luna**

Run, par Luna uniquement :

```powershell
node --test tests/grid-hydrique/zones.test.mjs
```

Expected: PASS, quatre tests, code de sortie `0`.

- [ ] **Step 5: Commit**

```powershell
git add -- assets/js/grid-hydrique/zones.mjs tests/grid-hydrique/zones.test.mjs
git diff --cached
git commit -m "feat(map): define VigiEau zone model"
```

### Task 3: Cadrer la France et intégrer les couches PMTiles

**Files:**
- Modify: `assets/js/grid-hydrique/map.mjs`
- Create: `tests/grid-hydrique/map.test.mjs`

- [ ] **Step 1: Écrire les tests cartographiques rouges avec Luna**

Luna crée `tests/grid-hydrique/map.test.mjs` avec un `FakeMap` qui mémorise `fitBounds`, `addSource`, `addLayer`, `setLayoutProperty` et `setFilter`. Les assertions obligatoires sont :

```js
assert.deepEqual(calls.fitBounds[0].bounds, [[-5, 41], [9, 51]]);
assert.equal(calls.fitBounds[0].options.duration, 0);
assert.equal(calls.sources["vigieau-zones"].url, `pmtiles://${ZONE_SOURCE_URL}`);
assert.equal(calls.layers["zones-fill"]["source-layer"], ZONE_SOURCE_LAYER);
assert.deepEqual(calls.layers["zones-fill"].layout["fill-sort-key"], ZONE_FILL_SORT_KEY);
assert.equal(calls.layers["zones-fill"].paint["fill-opacity"], 1);
assert.equal(calls.layers["zones-fill"].paint["fill-color"][3], restrictionColor("crise"));

waterMap.setMapMode("zones");
assert.equal(calls.visibility["departments-fill"], "none");
assert.equal(calls.visibility["zones-fill"], "visible");

waterMap.setZoneResource("SOU");
assert.deepEqual(calls.filters["zones-fill"], ["==", ["get", "type"], "SOU"]);
assert.deepEqual(calls.filters["zones-line"], ["==", ["get", "type"], "SOU"]);
```

Le jeu GeoJSON du test contient deux polygones dont les extrêmes sont `[-5, 41]` et `[9, 51]`. Le faux module PMTiles expose :

```js
class FakePMTiles {
  async getHeader() { return { minZoom: 0, maxZoom: 12 }; }
}

class FakeProtocol {
  constructor() { this.tile = () => {}; }
  add() {}
}
```

- [ ] **Step 2: Exécuter le test rouge avec Luna**

Run, par Luna uniquement :

```powershell
node --test tests/grid-hydrique/map.test.mjs
```

Expected: FAIL car `fitBounds`, `loadZoneLayers`, `setMapMode` et `setZoneResource` ne satisfont pas encore le contrat.

- [ ] **Step 3: Ajouter les utilitaires de cadrage**

L’agent principal ajoute dans `map.mjs` :

```js
import {
  ZONE_FILL_SORT_KEY,
  ZONE_SOURCE_LAYER,
  ZONE_SOURCE_URL,
  zoneResourceFilter,
} from "./zones.mjs";

export function geoJsonBounds(collection) {
  const bounds = [[Infinity, Infinity], [-Infinity, -Infinity]];
  const visit = (coordinates) => {
    if (typeof coordinates?.[0] === "number" && typeof coordinates?.[1] === "number") {
      bounds[0][0] = Math.min(bounds[0][0], coordinates[0]);
      bounds[0][1] = Math.min(bounds[0][1], coordinates[1]);
      bounds[1][0] = Math.max(bounds[1][0], coordinates[0]);
      bounds[1][1] = Math.max(bounds[1][1], coordinates[1]);
      return;
    }
    coordinates?.forEach(visit);
  };
  collection.features.forEach((feature) => visit(feature.geometry?.coordinates));
  return bounds;
}

function nationalPadding(width) {
  return width < 576 ? 20 : 36;
}
```

Dans le gestionnaire `load`, après l’ajout des couches existantes :

```js
map.resize();
map.fitBounds(geoJsonBounds(departments), {
  padding: nationalPadding(map.getContainer().clientWidth),
  duration: 0,
});
```

Retirer `zoom: 4.6` des options initiales et abaisser `minZoom` de `4` à `3` pour ne pas contraindre le résultat de `fitBounds` sur les écrans étroits.

- [ ] **Step 4: Ajouter la source et les couches zonales**

Dans `createWaterMap`, conserver une seule instance de protocole et ajouter :

```js
let zoneProtocol;

async function loadZoneLayers({ PMTiles, Protocol }) {
  if (map.getSource("vigieau-zones")) return;
  const archive = new PMTiles(ZONE_SOURCE_URL);
  await archive.getHeader();
  if (!zoneProtocol) {
    zoneProtocol = new Protocol();
    zoneProtocol.add(archive);
    maplibre.addProtocol("pmtiles", zoneProtocol.tile);
  }
  map.addSource("vigieau-zones", {
    type: "vector",
    url: `pmtiles://${ZONE_SOURCE_URL}`,
  });
  const filter = zoneResourceFilter("ALL");
  map.addLayer({
    id: "zones-fill",
    type: "fill",
    source: "vigieau-zones",
    "source-layer": ZONE_SOURCE_LAYER,
    filter,
    layout: { visibility: "none", "fill-sort-key": ZONE_FILL_SORT_KEY },
    paint: {
      "fill-color": [
        "match", ["get", "niveauGravite"],
        "crise", restrictionColor("crise"),
        "alerte_renforcee", restrictionColor("alerte_renforcee"),
        "alerte", restrictionColor("alerte"),
        "vigilance", restrictionColor("vigilance"),
        restrictionColor(null),
      ],
      "fill-opacity": 1,
    },
  }, "piezo-points");
  map.addLayer({
    id: "zones-line",
    type: "line",
    source: "vigieau-zones",
    "source-layer": ZONE_SOURCE_LAYER,
    filter,
    layout: { visibility: "none" },
    paint: { "line-color": "#ffffff", "line-width": 1 },
  }, "piezo-points");
}
```

Exposer dans l’objet retourné :

```js
loadZoneLayers,
setMapMode(mode) {
  const zonesVisible = mode === "zones";
  map.setLayoutProperty("departments-fill", "visibility", zonesVisible ? "none" : "visible");
  for (const layerId of ["zones-fill", "zones-line"]) {
    if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", zonesVisible ? "visible" : "none");
  }
},
setZoneResource(resource) {
  const filter = zoneResourceFilter(resource);
  for (const layerId of ["zones-fill", "zones-line"]) {
    if (map.getLayer(layerId)) map.setFilter(layerId, filter);
  }
},
```

Remplacer la boucle d’événements actuelle par un utilitaire réutilisable et l’appeler aussi après la création de `zones-fill` :

```js
function registerSelectableLayer(layerId) {
  map.on("mouseenter", layerId, () => { map.getCanvas().style.cursor = "pointer"; });
  map.on("mouseleave", layerId, () => { map.getCanvas().style.cursor = ""; });
  map.on("click", layerId, (event) => {
    const feature = event.features?.[0];
    if (!feature) return;
    const coordinates = feature.geometry.type === "Point"
      ? feature.geometry.coordinates
      : [event.lngLat.lng, event.lngLat.lat];
    if (feature.geometry.type === "Point") {
      map.getSource("selected-point").setData({ type: "FeatureCollection", features: [feature] });
    }
    onSelect({ layerId, feature, coordinates });
  });
}

for (const layerId of ["departments-fill", "piezo-points", "hydro-points"]) {
  registerSelectableLayer(layerId);
}
```

Appeler `registerSelectableLayer("zones-fill")` à la fin de `loadZoneLayers`. Dans `selectFeatureAtMapCenter`, filtrer la liste candidate avec `map.getLayer(layerId)` avant `queryRenderedFeatures`, afin de ne jamais fournir une couche zonale absente à MapLibre.

- [ ] **Step 5: Exécuter les tests verts avec Luna**

Run, par Luna uniquement :

```powershell
node --test tests/grid-hydrique/map.test.mjs tests/grid-hydrique/accessibility-regressions.test.mjs
```

Expected: PASS ; le faux protocole est enregistré une seule fois, les stations restent au-dessus des zones et la sélection clavier inclut `zones-fill`.

- [ ] **Step 6: Commit**

```powershell
git add -- assets/js/grid-hydrique/map.mjs tests/grid-hydrique/map.test.mjs tests/grid-hydrique/accessibility-regressions.test.mjs
git diff --cached
git commit -m "feat(map): render official VigiEau zones"
```

### Task 4: Afficher le détail multiressource sûr

**Files:**
- Modify: `assets/js/grid-hydrique/templates.mjs`
- Modify: `tests/grid-hydrique/templates.test.mjs`

- [ ] **Step 1: Écrire les tests rouges avec Luna**

Ajouter à `templates.test.mjs` :

```js
test("renderZoneDetail trie les ressources et souligne le maximum", () => {
  const html = renderZoneDetail([
    { type: "AEP", resourceLabel: "Eau potable", nom: "Réseau", niveauGravite: "vigilance" },
    { type: "SUP", resourceLabel: "Cours d’eau", nom: "Charente", niveauGravite: "crise", arrete: { cheminFichier: "https://example.test/crise.pdf" } },
    { type: "SOU", resourceLabel: "Nappes", nom: "Nappe", niveauGravite: "alerte_renforcee" },
  ]);
  assert.match(html, /Niveau maximal à ce point[\s\S]*Cours d’eau[\s\S]*Crise/);
  assert.ok(html.indexOf("Cours d’eau") < html.indexOf("Nappes"));
  assert.ok(html.indexOf("Nappes") < html.indexOf("Eau potable"));
});

test("renderZoneDetail échappe les tuiles et refuse les liens non HTTPS", () => {
  const html = renderZoneDetail([{
    type: "SUP",
    resourceLabel: "Cours d’eau",
    nom: '<img src=x onerror="alert(1)">',
    niveauGravite: "alerte",
    arrete: { cheminFichier: "javascript:alert(1)" },
  }], { fallback: true });
  assert.doesNotMatch(html, /<img|javascript:/);
  assert.match(html, /Détails temporairement indisponibles/);
});
```

Importer `renderZoneDetail` dans la liste d’imports du test.

- [ ] **Step 2: Exécuter le test rouge avec Luna**

Run, par Luna uniquement :

```powershell
node --test tests/grid-hydrique/templates.test.mjs
```

Expected: FAIL car `renderZoneDetail` n’est pas exportée.

- [ ] **Step 3: Ajouter le template minimal**

Importer `normalizeZones` depuis `zones.mjs`, puis ajouter dans `templates.mjs` :

```js
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
```

- [ ] **Step 4: Exécuter le test vert avec Luna**

Run, par Luna uniquement :

```powershell
node --test tests/grid-hydrique/templates.test.mjs tests/grid-hydrique/zones.test.mjs
```

Expected: PASS ; ordre `crise`, `alerte_renforcee`, `vigilance`, données échappées et aucun lien non HTTPS.

- [ ] **Step 5: Commit**

```powershell
git add -- assets/js/grid-hydrique/templates.mjs tests/grid-hydrique/templates.test.mjs
git diff --cached
git commit -m "feat(map): show multi-resource zone details"
```

### Task 5: Ajouter les commandes et le chargement différé

**Files:**
- Modify: `grid-hydrique/index.html`
- Modify: `assets/js/grid-hydrique/dashboard.mjs`
- Modify: `assets/js/grid-hydrique/templates.mjs`
- Modify: `tests/grid-hydrique/templates.test.mjs`

- [ ] **Step 1: Écrire le contrat des commandes avec Luna**

Ajouter à `templates.test.mjs` :

```js
test("renderMapControls crée deux groupes radio accessibles", () => {
  const html = renderMapControls();
  assert.match(html, /<fieldset[^>]*>[\s\S]*<legend>Vue de la carte<\/legend>/);
  assert.match(html, /name="map-mode" value="departments" checked/);
  assert.match(html, /name="map-mode" value="zones"/);
  assert.match(html, /data-zone-resources hidden disabled/);
  assert.match(html, /name="zone-resource" value="ALL" checked/);
  assert.match(html, /value="SUP"/);
  assert.match(html, /value="SOU"/);
  assert.match(html, /value="AEP"/);
});
```

Le sous-agent ajoute `renderMapControls` aux imports, puis lance :

```powershell
node --test tests/grid-hydrique/templates.test.mjs
```

Expected: FAIL car `renderMapControls` n’existe pas.

- [ ] **Step 2: Ajouter le HTML des commandes**

Dans `templates.mjs`, ajouter :

```js
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
```

Dans `grid-hydrique/index.html`, remplacer le conteneur de couches isolé par :

```html
<div class="container water-map-controls">
  <div class="water-view-controls"></div>
  <div class="water-layer-controls" role="group" aria-label="Stations affichées"></div>
</div>
```

- [ ] **Step 3: Orchestrer le mode dans `dashboard.mjs`**

Ajouter les imports et constantes :

```js
import { normalizeZones } from "./zones.mjs";
import {
  renderDepartmentDetail,
  renderHydroDetail,
  renderKpis,
  renderMapControls,
  renderPiezoDetail,
  renderSourceDates,
  renderStatus,
  renderZoneDetail,
} from "./templates.mjs";

const PMTILES_MODULE_URL = "https://unpkg.com/pmtiles@3.2.0/dist/index.js";
const mapControlsElement = document.querySelector(".water-map-controls");
const viewControlsElement = document.querySelector(".water-view-controls");
let zoneLoadPromise;
```

Dans `syncResponsiveDom`, déplacer `mapControlsElement` à la place de `layerControlsElement`, sans changer l’ordre relatif carte, commandes, légende, instructions, détail et statut.

Ajouter :

```js
async function enableZoneMode() {
  const resources = viewControlsElement.querySelector("[data-zone-resources]");
  resources.hidden = false;
  resources.disabled = true;
  statusElement.textContent = "Chargement des zones officielles…";
  try {
    zoneLoadPromise ||= import(PMTILES_MODULE_URL).then((pmtiles) => waterMap.loadZoneLayers(pmtiles));
    await zoneLoadPromise;
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
  viewControlsElement.innerHTML = renderMapControls();
  viewControlsElement.querySelectorAll('[name="map-mode"]').forEach((input) => {
    input.addEventListener("change", async () => {
      if (!input.checked) return;
      if (input.value === "zones") await enableZoneMode();
      else {
        waterMap.setMapMode("departments");
        const resources = viewControlsElement.querySelector("[data-zone-resources]");
        resources.hidden = true;
        resources.disabled = true;
      }
    });
  });
  viewControlsElement.querySelectorAll('[name="zone-resource"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) waterMap.setZoneResource(input.value);
    });
  });
}
```

Appeler `setupMapControls()` immédiatement après `await waterMap.ready` et avant `setupLayerControls()`.

- [ ] **Step 4: Brancher la sélection zonale et le repli API**

Au début de `showSelection`, avant le cas départemental, ajouter :

```js
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
```

Le panneau affiche toujours les trois ressources retournées par `/zones`, même si la carte est filtrée sur une seule ressource.

- [ ] **Step 5: Faire exécuter les tests ciblés par Luna**

Run, par Luna uniquement :

```powershell
node --test tests/grid-hydrique/templates.test.mjs tests/grid-hydrique/map.test.mjs tests/grid-hydrique/zones.test.mjs
```

Expected: PASS ; le HTML initial conserve `Départements` coché et aucun test n’importe PMTiles au démarrage.

- [ ] **Step 6: Commit**

```powershell
git add -- grid-hydrique/index.html assets/js/grid-hydrique/dashboard.mjs assets/js/grid-hydrique/templates.mjs tests/grid-hydrique/templates.test.mjs
git diff --cached
git commit -m "feat(map): add lazy zone mode controls"
```

### Task 6: Finaliser la hauteur, l’accessibilité et les validateurs

**Files:**
- Modify: `assets/css/grid-hydrique.css`
- Modify: `tests/validate-grid-hydrique.ps1`
- Modify: `log.md`

- [ ] **Step 1: Renforcer le validateur avec Luna**

Le sous-agent Luna remplace les deux assertions de hauteur existantes et ajoute le contrat des contrôles :

```powershell
Assert-True ($html -match 'class="container water-map-controls"') 'Le conteneur des commandes cartographiques est absent'
Assert-True ($html -match 'class="water-view-controls"') 'Le sélecteur de vue est absent'
Assert-True ($html -match 'class="water-layer-controls" role="group" aria-label="Stations affichées"') 'Les contrôles de stations ne forment pas un groupe accessible'
Assert-True ($css -match '\.water-map\s*\{[^}]*min-height:\s*clamp\(30rem,\s*68svh,\s*40rem\)') 'La hauteur mobile ne permet pas le cadrage national'
Assert-True ($css -match '@media\s*\(min-width:\s*48rem\)[\s\S]*?\.water-map\s*\{[^}]*min-height:\s*clamp\(38rem,\s*72svh,\s*52rem\)') 'La hauteur desktop ne permet pas le cadrage national'
Assert-True ($dashboard -match 'pmtiles@3\.2\.0/dist/index\.js') 'PMTiles doit être épinglé en 3.2.0'
Assert-True ($dashboard -match 'zoneLoadPromise\s*\|\|=\s*import') 'PMTiles doit être chargé uniquement à la demande'
```

Run, par Luna uniquement :

```powershell
& ./tests/validate-grid-hydrique.ps1
```

Expected: FAIL sur les hauteurs et styles de commandes non encore implémentés.

- [ ] **Step 2: Ajouter les styles minimaux**

L’agent principal modifie `grid-hydrique.css` :

```css
.water-map {
  min-height: clamp(30rem, 68svh, 40rem);
}

.water-map-controls,
.water-view-controls,
.water-control-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.water-map-controls {
  align-items: end;
  padding-block: 1rem;
}

.water-control-group {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.water-control-group legend {
  width: 100%;
  margin-bottom: 0.25rem;
  font-weight: 800;
}

.water-control-group[hidden] {
  display: none;
}

.zone-detail__item {
  padding-block: 1rem;
  border-top: 1px solid var(--border);
}

@media (min-width: 48rem) {
  .water-map {
    min-height: clamp(38rem, 72svh, 52rem);
  }
}
```

Conserver les règles existantes de focus, les cibles de 44 px et le retour à la ligne mobile.

- [ ] **Step 3: Faire passer le validateur avec Luna**

Run, par Luna uniquement :

```powershell
& ./tests/validate-grid-hydrique.ps1
```

Expected: `Validation dashboard réussie.`, code de sortie `0`.

- [ ] **Step 4: Commit**

```powershell
git add -- assets/css/grid-hydrique.css tests/validate-grid-hydrique.ps1
git diff --cached
git commit -m "fix(map): keep national view fully framed"
```

### Task 7: Recette complète exclusivement avec Luna

**Files:**
- Modify: `log.md`

- [ ] **Step 1: Exécuter toute la validation automatisée avec Luna**

Run, par le sous-agent `gpt-5.6-luna` uniquement :

```powershell
node --test tests/grid-hydrique/*.test.mjs
& ./tests/validate-grid-hydrique.ps1
& ./tests/validate-site.ps1
node --test tests/contact-script.test.js
git diff --check
```

Expected: toutes les commandes sortent avec `0`. Luna transmet pour chacune la commande exacte, le code de sortie, le nombre de tests et les avertissements éventuels.

- [ ] **Step 2: Effectuer la recette navigateur avec Luna**

Sur `http://127.0.0.1:8001/grid-hydrique/`, Luna contrôle aux largeurs `320`, `768`, `1024` et `1440` px :

```text
1. Départements est sélectionné au chargement.
2. La France métropolitaine et la Corse sont entièrement visibles sans déplacement manuel.
3. Aucune requête vers pmtiles@3.2.0 ni vers le fichier .pmtiles ne part avant l’activation de Zones.
4. Zones charge une seule fois le protocole et le PMTiles officiel.
5. Toutes, Cours d’eau, Nappes et Eau potable appliquent les bons filtres.
6. Les couleurs visibles correspondent exactement aux cinq couleurs de la légende.
7. Les frontières départementales et les stations restent visibles et utilisables.
8. Un clic en Charente affiche SUP, SOU et AEP triés, avec le maximum mis en avant.
9. Tab, flèches, Espace et Entrée permettent de parcourir les radios et de sélectionner au centre.
10. Une panne PMTiles simulée rétablit Départements et annonce l’erreur dans la région de statut.
11. Une panne de /zones conserve le polygone et affiche les propriétés de tuile avec le message de repli.
```

Expected: aucun territoire tronqué, aucune divergence légende/carte et aucune erreur JavaScript non gérée.

- [ ] **Step 3: Faire corriger toute régression selon la boucle Luna → principal → Luna**

Pour chaque échec : Luna fournit une reproduction minimale et un test rouge ; l’agent principal applique le correctif de production minimal ; Luna relance le test ciblé puis la suite complète. Aucun correctif ne peut être déclaré terminé sans cette boucle.

- [ ] **Step 4: Journaliser le résultat**

Ajouter à `log.md` une entrée datée contenant : demande, architecture livrée, commits, commandes exécutées par Luna, codes de sortie, nombres de tests, largeurs navigateur vérifiées et avertissements restants.

- [ ] **Step 5: Commit final de journal et revue**

```powershell
git add -- log.md
git diff --cached
git commit -m "docs(log): record VigiEau zone mode delivery"
git status --short
```

Expected: seuls les changements utilisateur préexistants et le plan non suivi `docs/superpowers/plans/2026-08-29 - dashboard_plan.md` peuvent rester hors commit.
