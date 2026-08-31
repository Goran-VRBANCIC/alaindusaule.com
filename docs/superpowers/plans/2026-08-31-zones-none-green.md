# Unrestricted Zone Backdrop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher en vert toute surface française sans polygone VigiEau dans la vue `Zones`, sans colorer la mer ni modifier la vue `Départements`.

**Architecture:** Ajouter à MapLibre une couche de remplissage uniforme fondée sur la source GeoJSON départementale déjà chargée. Cette couche reste masquée en vue `Départements`, devient visible sous les polygones officiels en vue `Zones` et utilise exclusivement `theme.restrictions.none`.

**Tech Stack:** JavaScript ES modules, MapLibre GL JS 6.6.0, `node:test`, PowerShell, Edge via Playwright Python.

---

### Task 1: Verrouiller le fond territorial vert par un test rouge

**Files:**
- Modify: `tests/grid-hydrique/map.test.mjs:164-286`

- [ ] **Step 1: Faire écrire le test de couche par GPT-5.4 Mini**

Ajouter un test autonome après `createWaterMap recadre nationalement après resize` :

```js
test("createWaterMap prépare le fond vert des zones sans restriction", async () => {
  const { waterMap } = createTestWaterMap();
  await waterMap.ready;

  const unrestrictedBackdrop = waterMap.map.layers.get("zones-none-fill");
  assert.ok(unrestrictedBackdrop);
  assert.equal(unrestrictedBackdrop.source, "departments");
  assert.equal(unrestrictedBackdrop.layout.visibility, "none");
  assert.equal(unrestrictedBackdrop.paint["fill-color"], theme.restrictions.none);
  assert.equal(unrestrictedBackdrop.paint["fill-opacity"], 1);
  assert.equal(
    waterMap.map.calls.layerInsertions.find(({ layer }) => layer.id === "zones-none-fill").beforeId,
    "departments-line",
  );
});
```

Dans `setMapMode alterne les remplissages sans masquer les stations`, compléter les attentes :

```js
waterMap.setMapMode("zones");
assert.equal(waterMap.map.calls.visibility["departments-fill"], "none");
assert.equal(waterMap.map.calls.visibility["zones-none-fill"], "visible");
assert.equal(waterMap.map.calls.visibility["zones-fill"], "visible");

waterMap.setMapMode("departments");
assert.equal(waterMap.map.calls.visibility["departments-fill"], "visible");
assert.equal(waterMap.map.calls.visibility["zones-none-fill"], "none");
assert.equal(waterMap.map.calls.visibility["zones-fill"], "none");
```

Ne pas ajouter `zones-none-fill` aux couches sélectionnables.

- [ ] **Step 2: Faire constater le rouge par GPT-5.4 Mini**

Run:

```powershell
node --test tests/grid-hydrique/map.test.mjs
```

Expected: échec parce que `zones-none-fill` n’existe pas encore.

- [ ] **Step 3: Contrôler le diff du test**

Run:

```powershell
git diff --check -- tests/grid-hydrique/map.test.mjs
```

Expected: code `0`.

### Task 2: Ajouter la couche MapLibre minimale

**Files:**
- Modify: `assets/js/grid-hydrique/map.mjs:196-226,294-300`
- Test: `tests/grid-hydrique/map.test.mjs`

- [ ] **Step 1: Créer la couche après les limites départementales**

Immédiatement après la création de `departments-line`, ajouter la couche avant cette ligne :

```js
map.addLayer({
  id: "zones-none-fill",
  type: "fill",
  source: "departments",
  layout: { visibility: "none" },
  paint: {
    "fill-color": theme.restrictions.none,
    "fill-opacity": 1,
  },
}, "departments-line");
```

Cette insertion place la couche au-dessus du fond général et sous les futures couches `zones-fill`, `zones-line` et `departments-line`.

- [ ] **Step 2: Synchroniser sa visibilité avec le mode**

Remplacer le début de `setMapMode` par :

```js
setMapMode(mode) {
  const zonesVisible = mode === "zones";
  map.setLayoutProperty("departments-fill", "visibility", zonesVisible ? "none" : "visible");
  map.setLayoutProperty("zones-none-fill", "visibility", zonesVisible ? "visible" : "none");
  for (const layerId of ["zones-fill", "zones-line"]) {
    if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", zonesVisible ? "visible" : "none");
  }
},
```

Ne modifier ni les filtres de ressource, ni les couches de stations, ni les couches sélectionnables.

- [ ] **Step 3: Faire vérifier le vert ciblé par GPT-5.4 Mini**

Run:

```powershell
node --test tests/grid-hydrique/map.test.mjs
```

Expected: tous les tests de `map.test.mjs` réussissent.

- [ ] **Step 4: Faire exécuter la non-régression Grid Hydrique par GPT-5.4 Mini**

Run séparément :

```powershell
node --test tests/grid-hydrique/*.test.mjs
& ./tests/validate-grid-hydrique.ps1
git diff --check -- assets/js/grid-hydrique/map.mjs tests/grid-hydrique/map.test.mjs
```

Expected: 51 tests réussis après ajout du nouveau cas, validateur et diff-check au code `0`.

- [ ] **Step 5: Commit ciblé**

```powershell
git add -- assets/js/grid-hydrique/map.mjs tests/grid-hydrique/map.test.mjs
git diff --cached --check
git commit -m "fix(map): color unrestricted zone gaps"
```

### Task 3: Recette Edge, journal et revue

**Files:**
- Modify: `log.md`

- [ ] **Step 1: Servir le worktree**

Servir `X:\DEVELOPPEMENT_WEB\alaindusaule.com\.worktrees\zones-none-green` sur `127.0.0.1:8004` avec `.mjs` en `text/javascript` et `Cache-Control: no-store`.

- [ ] **Step 2: Faire exécuter la recette Edge par GPT-5.4 Mini**

Vérifier sur `http://127.0.0.1:8004/grid-hydrique/` :

```text
- la vue Départements reste inchangée au chargement ;
- la vue Zones affiche l’emprise France métropolitaine et Corse en #69f08b hors polygones VigiEau ;
- la mer et l’extérieur restent #e9f2f5 ;
- les polygones crise, alerte renforcée, alerte et vigilance conservent leur palette ;
- zones-none-fill est sous zones-fill et sous les contours départementaux ;
- les filtres Toutes/SUP/SOU/AEP conservent le fond terrestre vert ;
- les stations restent visibles et indépendantes ;
- aucune erreur console, pageerror ou ressource 404.
```

- [ ] **Step 3: Faire exécuter la validation finale par GPT-5.4 Mini**

Run séparément :

```powershell
node --test tests/theme.test.mjs tests/color-tokens.test.mjs
node --test tests/grid-hydrique/*.test.mjs
& ./tests/validate-grid-hydrique.ps1
& ./tests/validate-site.ps1
node --test tests/contact-script.test.js
git diff --check
```

Expected: tous les codes valent `0`.

- [ ] **Step 4: Journaliser la correction**

Ajouter à `log.md`, avec l’heure retournée par `Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz'`, la cause, la décision fonctionnelle, la couche ajoutée, les résultats exacts de tests et la recette Edge.

- [ ] **Step 5: Faire contrôler le journal par GPT-5.4 Mini puis commit**

Run:

```powershell
git diff --check -- log.md
```

Puis :

```powershell
git add -- log.md
git diff --cached --check
git commit -m "docs(log): record unrestricted zone backdrop"
```

- [ ] **Step 6: Demander une revue indépendante GPT-5.4 Mini**

Comparer la branche à `master` et vérifier la source du vert, l’empilement, la visibilité des modes, l’absence d’interaction du fond, la non-régression des filtres/stations et les preuves Edge. Aucune issue Critical ou Important ne peut rester avant intégration.
