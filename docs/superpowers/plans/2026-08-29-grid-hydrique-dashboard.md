# Dashboard Grid Hydrique National — Plan d’implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objectif :** Publier sur `https://alaindusaule.fr/grid-hydrique/` un dashboard public, responsive et accessible qui montre en direct les restrictions VigiEau et les mesures récentes Hub’Eau, puis relie ces données à la proposition du Grid Hydrique National.

**Architecture :** Le dashboard s’intègre au site statique existant sous forme d’une page HTML, d’une feuille CSS dédiée et de modules JavaScript natifs documentés par JSDoc et ouverts par `// @ts-check` dans l’éditeur. MapLibre affiche une carte sans fond de tuiles distant : les départements simplifiés sont servis localement, VigiEau alimente la choroplèthe nationale en un appel, et Hub’Eau fournit les observations dans la zone visible lorsque l’utilisateur zoome. Le navigateur actualise les données toutes les quinze minutes et conserve la dernière vue valide si une API échoue.

**Stack technique :** HTML5 sémantique, CSS natif, modules ECMAScript, JSDoc avec `// @ts-check`, MapLibre GL JS 6.6.0 chargé depuis jsDelivr, SVG natif pour les chroniques, API VigiEau, API Hub’Eau v1/v2, tests Node.js natifs, PowerShell, GitHub Actions et GitHub Pages.

---

## Décisions verrouillées

- Le site existant reste statique ; aucune migration Next.js n’est réalisée.
- Aucun serveur, Route Handler, framework CSS, framework JavaScript ni base de données n’est ajouté.
- L’URL publique reste `/grid-hydrique/` sur le domaine canonique `alaindusaule.fr`.
- Les restrictions nationales viennent de `https://api.vigieau.gouv.fr/api/departements`.
- Les détails locaux viennent de `https://api.vigieau.gouv.fr/api/zones` avec longitude et latitude.
- Les piézomètres utilisent Hub’Eau v1 ; les stations hydrométriques utilisent Hub’Eau v2.
- L’actualisation automatique est fixée à `900000` ms, suspendue quand l’onglet est masqué, avec un bouton « Actualiser maintenant ».
- Les indicateurs nationaux sont calculés uniquement à partir de données officielles réellement disponibles. Aucun pourcentage de nappes « sous les normales » ni bénéfice chiffré approximatif n’est inventé.
- La carte nationale affiche un échantillon stable de stations. Les observations récentes sont chargées par emprise géographique à partir du zoom 6 afin d’éviter des centaines d’appels individuels.
- Les appels en échec n’effacent jamais les dernières données valides ; l’interface annonce que les données sont temporairement indisponibles.
- La carte du MVP couvre la France métropolitaine et la Corse. Le titre, les textes d’aide et les sources l’indiquent explicitement ; les territoires ultramarins restent hors périmètre de cette première version cartographique.

## Arborescence cible

```text
.github/
  workflows/
    pages.yml                         # publication GitHub Pages par Actions
assets/
  css/
    grid-hydrique.css                # styles propres au dashboard
  data/
    departements-simplifies.geojson  # contours locaux, 96 départements
    hydro-stations.json              # échantillon stable de stations hydrométriques
    piezo-stations.json              # échantillon stable de piézomètres
  js/
    grid-hydrique/
      api.mjs                        # URLs, fetch, annulation et normalisation réseau
      chart.mjs                      # modèle et rendu du graphique SVG
      dashboard.mjs                  # orchestration DOM et cycle de rafraîchissement
      domain.mjs                     # calculs purs : gravité, fraîcheur, échantillonnage
      map.mjs                        # initialisation MapLibre et gestion des couches
      templates.mjs                  # rendu sûr des KPI, états et panneau de détail
grid-hydrique/
  index.html                         # page publique et métadonnées SEO
scripts/
  build-water-station-samples.mjs    # génération reproductible des deux échantillons
tests/
  grid-hydrique/
    api.test.mjs
    chart.test.mjs
    domain.test.mjs
    samples.test.mjs
    templates.test.mjs
  validate-grid-hydrique.ps1
index.html                           # lien visible vers le dashboard
sitemap.xml                          # cinquième URL indexable
log.md                               # journal obligatoire du projet
```

### Tâche 1 — Contrat HTML, SEO et validation statique

**Fichiers :**
- Créer : `grid-hydrique/index.html`
- Créer : `assets/css/grid-hydrique.css`
- Créer : `assets/js/grid-hydrique/dashboard.mjs`
- Créer : `tests/validate-grid-hydrique.ps1`
- Modifier : `tests/validate-site.ps1`

- [ ] **Étape 1 : écrire la validation qui échoue**

Créer `tests/validate-grid-hydrique.ps1` avec les assertions structurelles suivantes :

```powershell
$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$pagePath = Join-Path $projectRoot 'grid-hydrique/index.html'
$failures = [System.Collections.Generic.List[string]]::new()

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { $failures.Add($Message) }
}

Assert-True (Test-Path -LiteralPath $pagePath) 'La page grid-hydrique/index.html est absente'

if (Test-Path -LiteralPath $pagePath) {
    $html = Get-Content -Raw -Encoding UTF8 -LiteralPath $pagePath
    Assert-True ($html -match '<html lang="fr-FR"') 'La langue fr-FR est absente'
    Assert-True ($html -match '<link rel="canonical" href="https://alaindusaule\.fr/grid-hydrique/"') 'La canonical est incorrecte'
    Assert-True (([regex]::Matches($html, '<h1(?:\s|>)', 'IgnoreCase')).Count -eq 1) 'La page doit avoir un seul h1'
    Assert-True ($html -match 'class="skip-link"') 'Le lien d’évitement est absent'
    Assert-True ($html -match 'id="indicateurs"') 'La région des indicateurs est absente'
    Assert-True ($html -match 'id="carte-hydrique"') 'Le conteneur de carte est absent'
    Assert-True ($html -match 'id="station-detail"') 'Le panneau de détail est absent'
    Assert-True ($html -match 'id="grid-vision"') 'La section Grid est absente'
    Assert-True ($html -match 'data-refresh-water') 'Le bouton d’actualisation est absent'
    Assert-True ($html -match 'type="module" src="\.\./assets/js/grid-hydrique/dashboard\.mjs"') 'Le module principal est absent'
    Assert-True ($html -match 'cdn\.jsdelivr\.net/npm/maplibre-gl@6\.6\.0') 'MapLibre doit être épinglé en 6.6.0'
    Assert-True ($html -notmatch 'TODO|TBD|placeholder') 'La page contient un marqueur incomplet'
}

$cssPath = Join-Path $projectRoot 'assets/css/grid-hydrique.css'
Assert-True (Test-Path -LiteralPath $cssPath) 'La feuille CSS du dashboard est absente'

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Error $_ -ErrorAction Continue }
    exit 1
}

Write-Host 'Validation dashboard réussie.'
```

- [ ] **Étape 2 : vérifier l’échec attendu**

Exécuter :

```powershell
& '.\tests\validate-grid-hydrique.ps1'
```

Résultat attendu : échec avec `La page grid-hydrique/index.html est absente`.

- [ ] **Étape 3 : créer le document HTML minimal complet**

Créer `grid-hydrique/index.html` avec :

```html
<!DOCTYPE html>
<html lang="fr-FR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>État de l’eau en France — Grid Hydrique National</title>
    <meta name="description" content="Consultez les restrictions d’eau et les mesures hydrologiques récentes en France, puis découvrez la proposition du Grid Hydrique National.">
    <link rel="canonical" href="https://alaindusaule.fr/grid-hydrique/">
    <meta property="og:type" content="website">
    <meta property="og:locale" content="fr_FR">
    <meta property="og:site_name" content="Alain du Saule">
    <meta property="og:title" content="État de l’eau en France — Grid Hydrique National">
    <meta property="og:description" content="Restrictions VigiEau et mesures Hub’Eau actualisées sur une carte interactive.">
    <meta property="og:url" content="https://alaindusaule.fr/grid-hydrique/">
    <meta property="og:image" content="https://alaindusaule.fr/assets/images/meta/og-leau-ou-le-chaos.jpg">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="theme-color" content="#073e52">
    <link rel="icon" href="../assets/icons/favicon.svg" type="image/svg+xml">
    <link rel="preload" href="../assets/fonts/eb-garamond-variable.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="stylesheet" href="../assets/css/site.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/maplibre-gl@6.6.0/dist/maplibre-gl.css">
    <link rel="stylesheet" href="../assets/css/grid-hydrique.css">
  </head>
  <body>
    <a class="skip-link" href="#contenu">Aller au contenu</a>
    <header class="site-header">
      <div class="container site-header__inner">
        <a class="wordmark" href="../index.html">Alain du Saule</a>
        <nav class="site-nav" aria-label="Navigation principale">
          <ul class="nav-list">
            <li><a href="../index.html">Accueil</a></li>
            <li><a href="./" aria-current="page">État de l’eau</a></li>
            <li><a href="../livres/leau-ou-le-chaos.html">Le livre</a></li>
            <li><a href="#contact" data-contact-button>Contact</a></li>
          </ul>
        </nav>
      </div>
    </header>
    <main id="contenu">
      <section class="water-hero" aria-labelledby="dashboard-title">
        <div class="container">
          <p class="eyebrow">Données publiques · France</p>
          <h1 id="dashboard-title">L’état de l’eau, maintenant</h1>
          <p class="lead">Restrictions en vigueur et mesures récentes issues de VigiEau et Hub’Eau.</p>
          <div class="water-toolbar">
            <p class="water-status" role="status" aria-live="polite" data-water-status>Chargement des données officielles…</p>
            <button class="button button--secondary" type="button" data-refresh-water>Actualiser maintenant</button>
          </div>
        </div>
      </section>
      <section id="indicateurs" class="section water-kpis" aria-labelledby="kpi-title">
        <div class="container">
          <h2 id="kpi-title">La situation en un regard</h2>
          <div class="water-kpi-grid" data-kpi-grid aria-live="polite"></div>
        </div>
      </section>
      <section class="water-map-section" aria-labelledby="map-title">
        <div class="container water-map-heading">
          <div><p class="eyebrow">Carte interactive</p><h2 id="map-title">Restrictions et stations</h2></div>
          <div class="water-layer-controls" aria-label="Couches de la carte"></div>
        </div>
        <div class="water-map-layout">
          <div id="carte-hydrique" class="water-map" role="region" aria-label="Carte hydrique de la France"></div>
          <aside id="station-detail" class="station-detail" aria-labelledby="detail-title" aria-live="polite">
            <h2 id="detail-title">Détail</h2>
            <p>Sélectionnez un département ou une station sur la carte.</p>
          </aside>
        </div>
      </section>
      <section id="grid-vision" class="section section--water" aria-labelledby="vision-title">
        <div class="container">
          <p class="eyebrow eyebrow--sun">Une proposition à mettre en débat</p>
          <h2 id="vision-title">Et si la France pensait l’eau comme un réseau ?</h2>
          <p class="lead lead--light">Le Grid Hydrique National relie stockage, répartition et pilotage afin d’organiser la solidarité entre les territoires.</p>
          <div class="button-row"><a class="button button--light" href="../livres/leau-ou-le-chaos.html">Comprendre la proposition complète</a></div>
        </div>
      </section>
    </main>
    <footer id="contact" class="site-footer">
      <div class="container site-footer__grid">
        <div><a class="wordmark" href="../index.html">Alain du Saule</a><p class="fine-print">Auteur de <cite>L’eau ou le chaos</cite>.</p></div>
        <ul class="footer-links"><li><a href="../mentions-legales.html">Mentions légales</a></li><li><a href="#contact" data-contact-button>Contact</a></li></ul>
      </div>
    </footer>
    <script src="https://cdn.jsdelivr.net/npm/maplibre-gl@6.6.0/dist/maplibre-gl.js"></script>
    <script src="../assets/js/contact.js"></script>
    <script type="module" src="../assets/js/grid-hydrique/dashboard.mjs"></script>
  </body>
</html>
```

Créer `assets/css/grid-hydrique.css` avec les conteneurs fonctionnels initiaux :

```css
.water-hero { padding-block: clamp(3rem, 7vw, 6rem); background: var(--paper-warm); }
.water-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; }
.water-status { margin: 0; color: var(--ink-soft); }
.water-kpi-grid { display: grid; gap: 1rem; }
.water-map-section { padding-block: clamp(3rem, 7vw, 6rem); background: var(--paper-warm); }
.water-map-heading { display: flex; flex-wrap: wrap; align-items: end; justify-content: space-between; gap: 1rem; }
.water-map-layout { display: grid; width: min(calc(100% - 2rem), 90rem); margin-inline: auto; border: 1px solid var(--border); background: var(--paper); }
.water-map { min-height: 32rem; }
.station-detail { min-width: 0; padding: clamp(1.25rem, 3vw, 2rem); }
@media (min-width: 48rem) { .water-kpi-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@media (min-width: 64rem) { .water-map-layout { grid-template-columns: minmax(0, 2fr) minmax(20rem, 0.8fr); } }
@media (max-width: 47.99rem) { .water-map { min-height: 65vh; } }
```

Créer le module d’entrée minimal `assets/js/grid-hydrique/dashboard.mjs` afin que la référence locale soit valide dès ce commit :

```js
// @ts-check
export {};
```

- [ ] **Étape 4 : étendre la validation globale**

Ajouter `grid-hydrique/index.html` à `$pages` dans `tests/validate-site.ps1` et adapter l’assertion du sitemap de `4` à `5` seulement dans la tâche SEO qui ajoutera effectivement l’URL.

- [ ] **Étape 5 : vérifier le passage au vert**

Exécuter :

```powershell
& '.\tests\validate-grid-hydrique.ps1'
& '.\tests\validate-site.ps1'
```

Résultat attendu : `Validation dashboard réussie.` puis `Validation réussie : 6 pages contrôlées.`

- [ ] **Étape 6 : commit atomique**

```powershell
git add -- grid-hydrique/index.html assets/css/grid-hydrique.css assets/js/grid-hydrique/dashboard.mjs tests/validate-grid-hydrique.ps1 tests/validate-site.ps1
git diff --cached
git commit -m "feat(dashboard): add accessible page shell"
```

### Tâche 2 — Modèle de domaine et client API testés

**Fichiers :**
- Créer : `assets/js/grid-hydrique/domain.mjs`
- Créer : `assets/js/grid-hydrique/api.mjs`
- Créer : `tests/grid-hydrique/domain.test.mjs`
- Créer : `tests/grid-hydrique/api.test.mjs`

- [ ] **Étape 1 : écrire les tests de domaine qui échouent**

Créer `tests/grid-hydrique/domain.test.mjs` :

```js
import test from "node:test";
import assert from "node:assert/strict";
import { buildRestrictionSummary, latestByStation, measurementFreshness } from "../../assets/js/grid-hydrique/domain.mjs";

test("buildRestrictionSummary compte chaque niveau officiel", () => {
  const result = buildRestrictionSummary([
    { code: "01", niveauGraviteMax: "crise" },
    { code: "02", niveauGraviteMax: "alerte_renforcee" },
    { code: "03", niveauGraviteMax: null },
  ]);
  assert.deepEqual(result, { total: 3, crise: 1, alerteRenforcee: 1, alerte: 0, vigilance: 0, sansRestriction: 1 });
});

test("latestByStation conserve la mesure la plus récente", () => {
  const values = latestByStation([
    { code_bss: "A", date_mesure: "2026-08-29T08:00:00Z" },
    { code_bss: "A", date_mesure: "2026-08-29T09:00:00Z" },
  ], "code_bss", "date_mesure");
  assert.equal(values.get("A").date_mesure, "2026-08-29T09:00:00Z");
});

test("measurementFreshness distingue frais, récent et ancien", () => {
  const now = new Date("2026-08-29T12:00:00Z");
  assert.equal(measurementFreshness("2026-08-29T08:00:00Z", now), "fresh");
  assert.equal(measurementFreshness("2026-08-27T08:00:00Z", now), "recent");
  assert.equal(measurementFreshness("2026-08-01T08:00:00Z", now), "stale");
});
```

- [ ] **Étape 2 : vérifier l’échec du domaine**

Exécuter `node --test tests/grid-hydrique/domain.test.mjs`.

Résultat attendu : échec `ERR_MODULE_NOT_FOUND` pour `domain.mjs`.

- [ ] **Étape 3 : implémenter le domaine minimal**

Créer `assets/js/grid-hydrique/domain.mjs` :

```js
// @ts-check

export const SEVERITY_ORDER = Object.freeze({ null: 0, vigilance: 1, alerte: 2, alerte_renforcee: 3, crise: 4 });

export function buildRestrictionSummary(departments) {
  const summary = { total: departments.length, crise: 0, alerteRenforcee: 0, alerte: 0, vigilance: 0, sansRestriction: 0 };
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
    if (!previous || Date.parse(observation[dateKey]) > Date.parse(previous[dateKey])) latest.set(key, observation);
  }
  return latest;
}

export function measurementFreshness(value, now = new Date()) {
  const age = now.getTime() - Date.parse(value);
  if (age <= 24 * 60 * 60 * 1000) return "fresh";
  if (age <= 7 * 24 * 60 * 60 * 1000) return "recent";
  return "stale";
}
```

- [ ] **Étape 4 : écrire les tests API qui échouent**

Créer `tests/grid-hydrique/api.test.mjs` :

```js
import test from "node:test";
import assert from "node:assert/strict";
import { createWaterApi } from "../../assets/js/grid-hydrique/api.mjs";

test("getDepartments appelle l’endpoint national VigiEau", async () => {
  const calls = [];
  const api = createWaterApi(async (url) => { calls.push(String(url)); return { ok: true, json: async () => [] }; });
  await api.getDepartments();
  assert.equal(calls[0], "https://api.vigieau.gouv.fr/api/departements");
});

test("getPiezoViewport encode l’emprise et la date", async () => {
  const calls = [];
  const api = createWaterApi(async (url) => { calls.push(String(url)); return { ok: true, json: async () => ({ data: [], next: null }) }; });
  await api.getPiezoViewport([-1, 44, 0, 45], "2026-08-28");
  assert.match(calls[0], /bbox=-1%2C44%2C0%2C45/);
  assert.match(calls[0], /date_debut_mesure=2026-08-28/);
});

test("une réponse non réussie lève une erreur lisible", async () => {
  const api = createWaterApi(async () => ({ ok: false, status: 503, json: async () => ({}) }));
  await assert.rejects(api.getDepartments(), /VigiEau: HTTP 503/);
});
```

- [ ] **Étape 5 : vérifier l’échec API**

Exécuter `node --test tests/grid-hydrique/api.test.mjs`.

Résultat attendu : échec `ERR_MODULE_NOT_FOUND` pour `api.mjs`.

- [ ] **Étape 6 : implémenter le client API avec annulation**

Créer `assets/js/grid-hydrique/api.mjs` avec `createWaterApi(fetchImpl = fetch)`, un helper `requestJson(label, url, signal)`, et les méthodes exactes :

```js
// @ts-check
const VIGIEAU = "https://api.vigieau.gouv.fr/api";
const PIEZO = "https://hubeau.eaufrance.fr/api/v1/niveaux_nappes";
const HYDRO = "https://hubeau.eaufrance.fr/api/v2/hydrometrie";

export function createWaterApi(fetchImpl = fetch) {
  async function requestJson(label, url, signal) {
    const response = await fetchImpl(url, { signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`${label}: HTTP ${response.status}`);
    return response.json();
  }

  return {
    getDepartments: (signal) => requestJson("VigiEau", `${VIGIEAU}/departements`, signal),
    getLocalRestrictions: (longitude, latitude, signal) => {
      const query = new URLSearchParams({ lon: String(longitude), lat: String(latitude), profil: "particulier" });
      return requestJson("VigiEau", `${VIGIEAU}/zones?${query}`, signal);
    },
    getPiezoViewport: (bbox, fromDate, signal) => {
      const query = new URLSearchParams({ bbox: bbox.join(","), date_debut_mesure: fromDate, size: "5000" });
      return requestJson("Hub’Eau piézométrie", `${PIEZO}/chroniques_tr?${query}`, signal);
    },
    getPiezoHistory: (codeBss, fromDate, signal) => {
      const query = new URLSearchParams({ code_bss: codeBss, date_debut_mesure: fromDate, size: "5000" });
      return requestJson("Hub’Eau piézométrie", `${PIEZO}/chroniques_tr?${query}`, signal);
    },
    getHydroViewport: (bbox, fromDate, signal) => {
      const query = new URLSearchParams({ bbox: bbox.join(","), date_debut_obs: fromDate, grandeur_hydro: "H", size: "5000" });
      return requestJson("Hub’Eau hydrométrie", `${HYDRO}/observations_tr?${query}`, signal);
    },
    getHydroHistory: (codeStation, fromDate, signal) => {
      const query = new URLSearchParams({ code_entite: codeStation, date_debut_obs: fromDate, grandeur_hydro: "H", size: "5000" });
      return requestJson("Hub’Eau hydrométrie", `${HYDRO}/observations_tr?${query}`, signal);
    },
  };
}
```

- [ ] **Étape 7 : exécuter les tests et committer**

```powershell
node --test tests/grid-hydrique/domain.test.mjs tests/grid-hydrique/api.test.mjs
git add -- assets/js/grid-hydrique/domain.mjs assets/js/grid-hydrique/api.mjs tests/grid-hydrique/domain.test.mjs tests/grid-hydrique/api.test.mjs
git diff --cached
git commit -m "feat(dashboard): add tested water data client"
```

Résultat attendu : 6 tests réussis, aucune erreur.

### Tâche 3 — Échantillons reproductibles et contours locaux

**Fichiers :**
- Créer : `scripts/build-water-station-samples.mjs`
- Créer : `tests/grid-hydrique/samples.test.mjs`
- Créer : `assets/data/departements-simplifies.geojson`
- Générer : `assets/data/piezo-stations.json`
- Générer : `assets/data/hydro-stations.json`

- [ ] **Étape 1 : écrire les tests de sélection spatiale**

Créer `tests/grid-hydrique/samples.test.mjs` pour vérifier que `spatialSample(stations, 2, getCoordinates)` renvoie deux codes distincts, choisit d’abord la station ayant le plus de mesures et répartit le second point loin du premier.

```js
import test from "node:test";
import assert from "node:assert/strict";
import { spatialSample } from "../../scripts/build-water-station-samples.mjs";

test("spatialSample privilégie qualité puis couverture géographique", () => {
  const stations = [
    { code: "A", score: 100, longitude: 2, latitude: 46 },
    { code: "B", score: 90, longitude: 2.1, latitude: 46.1 },
    { code: "C", score: 80, longitude: -4, latitude: 48 },
  ];
  const result = spatialSample(stations, 2, (station) => [station.longitude, station.latitude], (station) => station.score);
  assert.deepEqual(result.map((station) => station.code), ["A", "C"]);
});
```

- [ ] **Étape 2 : constater l’échec**

Exécuter `node --test tests/grid-hydrique/samples.test.mjs`.

Résultat attendu : échec car le script n’existe pas.

- [ ] **Étape 3 : créer le générateur Node sans dépendance**

Le script doit :

1. exporter `spatialSample` sans lancer le réseau lorsqu’il est importé ;
2. paginer Hub’Eau par paquets de 1000 ;
3. garder uniquement la métropole (`longitude -5.5..10`, `latitude 41..51.5`) et les stations en service ;
4. produire 350 piézomètres et 350 stations hydrométriques ;
5. trier les sorties par code pour obtenir des diffs stables ;
6. écrire un objet `{ generatedAt, source, stations }` dans chaque JSON.

Le cœur de sélection doit être exactement :

```js
export function spatialSample(stations, limit, getCoordinates, getScore) {
  if (stations.length <= limit) return [...stations];
  const remaining = [...stations].sort((a, b) => getScore(b) - getScore(a));
  const selected = [remaining.shift()];
  while (selected.length < limit && remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = -1;
    for (let index = 0; index < remaining.length; index += 1) {
      const [longitude, latitude] = getCoordinates(remaining[index]);
      const minimumDistance = Math.min(...selected.map((item) => {
        const [selectedLongitude, selectedLatitude] = getCoordinates(item);
        return (longitude - selectedLongitude) ** 2 + (latitude - selectedLatitude) ** 2;
      }));
      if (minimumDistance > bestDistance) { bestDistance = minimumDistance; bestIndex = index; }
    }
    selected.push(remaining.splice(bestIndex, 1)[0]);
  }
  return selected;
}
```

Les sources paginées sont :

```js
const PIEZO_URL = "https://hubeau.eaufrance.fr/api/v1/niveaux_nappes/stations?nb_mesures_piezo_min=1000&size=1000&fields=code_bss,bss_id,libelle_pe,nom_commune,code_departement,nom_departement,altitude_station,nb_mesures_piezo,date_fin_mesure,x,y";
const HYDRO_URL = "https://hubeau.eaufrance.fr/api/v2/hydrometrie/referentiel/stations?en_service=true&size=1000";
```

- [ ] **Étape 4 : télécharger le GeoJSON simplifié et générer les échantillons**

```powershell
Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements-version-simplifiee.geojson' -OutFile '.\assets\data\departements-simplifies.geojson'
node '.\scripts\build-water-station-samples.mjs'
```

Résultat attendu : 96 entités départementales, 350 entrées dans chaque échantillon, et aucun point hors de la métropole.

- [ ] **Étape 5 : étendre le test pour valider les fichiers générés**

Ajouter au test la lecture des trois fichiers et vérifier : `features.length === 96`, `piezo.stations.length === 350`, `hydro.stations.length === 350`, unicité des codes et coordonnées numériques.

- [ ] **Étape 6 : exécuter et committer**

```powershell
node --test tests/grid-hydrique/samples.test.mjs
git add -- scripts/build-water-station-samples.mjs tests/grid-hydrique/samples.test.mjs assets/data/departements-simplifies.geojson assets/data/piezo-stations.json assets/data/hydro-stations.json
git diff --cached --stat
git commit -m "feat(dashboard): add reproducible water station samples"
```

### Tâche 4 — Carte MapLibre, restrictions nationales et KPI

**Fichiers :**
- Créer : `assets/js/grid-hydrique/map.mjs`
- Créer : `assets/js/grid-hydrique/templates.mjs`
- Créer : `tests/grid-hydrique/templates.test.mjs`
- Modifier : `assets/js/grid-hydrique/dashboard.mjs`
- Modifier : `assets/css/grid-hydrique.css`

- [ ] **Étape 1 : écrire les tests de rendu sûrs**

Créer `tests/grid-hydrique/templates.test.mjs` et tester que :

- `renderKpis(summary, updatedAt)` produit quatre cartes : crise, alerte renforcée, sans restriction et dernière actualisation ;
- les valeurs sont échappées et aucun HTML provenant des API n’est injecté ;
- `restrictionColor("crise")` vaut `#8b1e1e`, puis `#d96b27`, `#e3a62f`, `#f2d36b`, et `#d8e4e8` pour l’absence de restriction.

- [ ] **Étape 2 : vérifier l’échec**

Exécuter `node --test tests/grid-hydrique/templates.test.mjs`.

Résultat attendu : module absent.

- [ ] **Étape 3 : implémenter les templates et couleurs**

Créer `templates.mjs` avec une fonction `escapeHtml`, `renderKpis`, `renderStatus` et les libellés français. Les cartes doivent associer une valeur, un libellé et une phrase source « Source : VigiEau ».

- [ ] **Étape 4 : initialiser MapLibre sans tuiles distantes**

Créer `map.mjs` avec `createWaterMap({ container, departments, piezoStations, hydroStations, onSelect })`. Le style initial doit contenir uniquement :

```js
const style = {
  version: 8,
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": "#e9f2f5" } }],
};
```

Après `load`, ajouter les sources GeoJSON `departments`, `piezo-stations`, `hydro-stations`, puis les couches :

- `departments-fill`, couleur issue de la propriété `severity` ;
- `departments-line`, trait `#ffffff` ;
- `piezo-points`, cercles bleus ;
- `hydro-points`, carrés verts via un symbole SVG local encodé en data URL ou des cercles avec `circle-stroke-width: 2` et couleur verte ;
- `selected-point`, anneau sombre.

La carte est centrée sur `[2.2, 46.4]`, zoom `4.6`, bornée à `[[-6, 40.5], [10.5, 52]]`. Ajouter `NavigationControl` et `ScaleControl`.

- [ ] **Étape 5 : orchestrer le premier chargement**

Créer `dashboard.mjs` avec `// @ts-check`. Au `DOMContentLoaded`, charger en parallèle les trois fichiers locaux et `api.getDepartments()`, joindre les départements par `properties.code`, calculer les KPI, créer la carte, puis mettre le statut à « Données actualisées à HH:mm ».

La fonction `refreshNationalData()` doit conserver `lastDepartments` et ne remplacer la source MapLibre qu’après une réponse valide.

- [ ] **Étape 6 : compléter les styles et la légende**

Ajouter les classes `.water-kpi`, `.water-kpi__value`, `.restriction-legend`, `.water-layer-controls`, les contrastes AA, des cibles de 44 px et aucun effet de survol déplaçant la mise en page.

- [ ] **Étape 7 : vérifier et committer**

```powershell
node --test tests/grid-hydrique/templates.test.mjs tests/grid-hydrique/domain.test.mjs tests/grid-hydrique/api.test.mjs
& '.\tests\validate-grid-hydrique.ps1'
git add -- assets/js/grid-hydrique/map.mjs assets/js/grid-hydrique/templates.mjs assets/js/grid-hydrique/dashboard.mjs assets/css/grid-hydrique.css tests/grid-hydrique/templates.test.mjs
git diff --cached
git commit -m "feat(dashboard): render live restriction map"
```

### Tâche 5 — Mesures Hub’Eau dans la zone visible

**Fichiers :**
- Modifier : `assets/js/grid-hydrique/domain.mjs`
- Modifier : `assets/js/grid-hydrique/map.mjs`
- Modifier : `assets/js/grid-hydrique/dashboard.mjs`
- Modifier : `tests/grid-hydrique/domain.test.mjs`

- [ ] **Étape 1 : écrire les tests de conversion GeoJSON**

Ajouter des tests pour `piezoObservationsToGeoJson` et `hydroObservationsToGeoJson` : doublons réduits à la mesure la plus récente, coordonnées invalides ignorées, propriétés `kind`, `stationCode`, `measuredAt`, `value`, `freshness` présentes.

- [ ] **Étape 2 : constater l’échec précis**

Exécuter `node --test tests/grid-hydrique/domain.test.mjs`.

Résultat attendu : échec indiquant que les deux fonctions ne sont pas exportées.

- [ ] **Étape 3 : implémenter les conversions minimales**

Réutiliser `latestByStation`; ne pas dupliquer le calcul de fraîcheur. Pour l’hydrométrie, convertir `resultat_obs` de millimètres en mètres avec `value / 1000` et conserver `unit: "m"`. Pour la piézométrie, afficher `profondeur_nappe` en mètres si disponible, sinon `niveau_eau_ngf` avec le libellé NGF.

- [ ] **Étape 4 : charger uniquement au zoom utile**

Dans `dashboard.mjs`, écouter `moveend`. Si `map.getZoom() < 6`, conserver les échantillons statiques et afficher « Zoomez pour charger les mesures récentes ». Sinon :

1. annuler la requête de viewport précédente avec `AbortController` ;
2. calculer la bbox depuis `map.getBounds()` ;
3. calculer la date d’avant-hier au format `YYYY-MM-DD` ;
4. appeler `getPiezoViewport` et `getHydroViewport` en parallèle ;
5. remplacer les sources uniquement pour les réponses valides ;
6. indiquer « échantillon partiel » si une réponse contient un lien `next`.

- [ ] **Étape 5 : ajouter les contrôles de couches**

Créer deux cases à cocher accessibles, cochées par défaut : « Piézomètres » et « Cours d’eau ». Elles changent uniquement la propriété `visibility` des couches et conservent leur état après chaque rafraîchissement.

- [ ] **Étape 6 : vérifier et committer**

```powershell
node --test tests/grid-hydrique/domain.test.mjs tests/grid-hydrique/api.test.mjs
& '.\tests\validate-grid-hydrique.ps1'
git add -- assets/js/grid-hydrique/domain.mjs assets/js/grid-hydrique/map.mjs assets/js/grid-hydrique/dashboard.mjs tests/grid-hydrique/domain.test.mjs
git diff --cached
git commit -m "feat(dashboard): load live viewport measurements"
```

### Tâche 6 — Panneau de détail et chronique SVG

**Fichiers :**
- Créer : `assets/js/grid-hydrique/chart.mjs`
- Créer : `tests/grid-hydrique/chart.test.mjs`
- Modifier : `assets/js/grid-hydrique/templates.mjs`
- Modifier : `assets/js/grid-hydrique/map.mjs`
- Modifier : `assets/js/grid-hydrique/dashboard.mjs`
- Modifier : `assets/css/grid-hydrique.css`

- [ ] **Étape 1 : écrire les tests du graphique**

Créer `chart.test.mjs` pour vérifier que `buildLineChartModel(values, 600, 240)` :

- trie les points par date ;
- ignore les valeurs non numériques ;
- produit un `path` commençant par `M` puis `L` ;
- gère une série constante sans division par zéro ;
- réduit une série de 1 000 mesures à 600 points au maximum tout en conservant la première et la dernière ;
- renvoie les bornes et les libellés accessibles.

- [ ] **Étape 2 : constater l’échec**

Exécuter `node --test tests/grid-hydrique/chart.test.mjs`.

Résultat attendu : module absent.

- [ ] **Étape 3 : implémenter le modèle et le rendu SVG**

Créer `chart.mjs` avec `buildLineChartModel` pur et `renderLineChart(container, model, title)`. Le SVG doit avoir `role="img"`, `aria-labelledby`, un `<title>`, un `<desc>`, une ligne pleine `#0b5c7a`, des axes textuels et un tableau `<details>` listant date et valeur pour les technologies d’assistance.

- [ ] **Étape 4 : rendre le détail sans HTML non fiable**

Ajouter à `templates.mjs` `renderDepartmentDetail`, `renderPiezoDetail` et `renderHydroDetail`. Échapper tous les textes API. Afficher source, code, commune ou cours d’eau, date, valeur, fraîcheur et lien vers l’arrêté VigiEau uniquement si son URL commence par `https://`.

- [ ] **Étape 5 : brancher les clics**

Au clic sur un département, appeler `getLocalRestrictions` aux coordonnées du clic. Au clic sur un piézomètre, charger 90 jours d’historique en direct. Au clic sur une station hydrométrique, charger 7 jours afin de rester sous la limite de 5 000 observations à une mesure toutes les cinq minutes. Réduire toute série de plus de 600 valeurs par échantillonnage régulier avant de créer le tracé SVG. Une nouvelle sélection annule la précédente. En cas d’erreur, conserver l’identité de la station et afficher « Chronique temporairement indisponible ».

- [ ] **Étape 6 : rendre le panneau mobile**

Sous 64 rem, le panneau suit la carte dans le flux, reçoit `tabindex="-1"` et est focalisé après sélection. Au-dessus de 64 rem, il reste visible à droite avec `position: sticky; top: 6rem; max-height: calc(100vh - 7rem); overflow: auto`.

- [ ] **Étape 7 : vérifier et committer**

```powershell
node --test tests/grid-hydrique/chart.test.mjs tests/grid-hydrique/templates.test.mjs
& '.\tests\validate-grid-hydrique.ps1'
git add -- assets/js/grid-hydrique/chart.mjs assets/js/grid-hydrique/templates.mjs assets/js/grid-hydrique/map.mjs assets/js/grid-hydrique/dashboard.mjs assets/css/grid-hydrique.css tests/grid-hydrique/chart.test.mjs tests/grid-hydrique/templates.test.mjs
git diff --cached
git commit -m "feat(dashboard): add accessible station histories"
```

### Tâche 7 — Actualisation automatique, résilience et performance

**Fichiers :**
- Modifier : `assets/js/grid-hydrique/dashboard.mjs`
- Modifier : `assets/js/grid-hydrique/templates.mjs`
- Modifier : `assets/css/grid-hydrique.css`
- Modifier : `tests/grid-hydrique/templates.test.mjs`
- Modifier : `tests/validate-grid-hydrique.ps1`

- [ ] **Étape 1 : écrire les tests d’état**

Tester les quatre sorties exactes de `renderStatus` : `loading`, `success`, `partial`, `error`. Vérifier que l’erreur contient « dernières données affichées » lorsque le cache mémoire contient une valeur.

- [ ] **Étape 2 : constater l’échec de la variante partielle**

Exécuter `node --test tests/grid-hydrique/templates.test.mjs`.

Résultat attendu : échec sur le texte de l’état `partial`.

- [ ] **Étape 3 : implémenter le cycle de quinze minutes**

Dans `dashboard.mjs`, définir `const REFRESH_INTERVAL_MS = 15 * 60 * 1000`. Utiliser un seul `setTimeout` reprogrammé après la fin de chaque rafraîchissement. Ne rien lancer lorsque `document.hidden` est vrai ; sur `visibilitychange`, rafraîchir si la dernière réussite remonte à plus de quinze minutes. Le bouton manuel annule le cycle courant, se désactive pendant la requête et est réactivé dans `finally`.

- [ ] **Étape 4 : ajouter les états de dégradation**

Utiliser `Promise.allSettled` pour que VigiEau, piézométrie et hydrométrie puissent échouer indépendamment. Ne jamais appeler `setData` avec un résultat rejeté. Afficher la date de chaque source et un lien vers les pages officielles Hub’Eau/VigiEau.

- [ ] **Étape 5 : compléter les contraintes d’accessibilité et performance**

Ajouter à la validation : viewport, canonical, un seul h1, libellés des cases, région `aria-live`, aucun défilement horizontal forcé, aucun visuel distant, MapLibre épinglé. En CSS, respecter `prefers-reduced-motion`, `color-scheme: light`, `content-visibility: auto` sur la section narrative sous la carte, et des contrastes de texte ≥ 4,5:1.

- [ ] **Étape 6 : vérifier et committer**

```powershell
node --test tests/grid-hydrique/*.test.mjs
& '.\tests\validate-grid-hydrique.ps1'
& '.\tests\validate-site.ps1'
node '.\tests\contact-script.test.js'
git add -- assets/js/grid-hydrique/dashboard.mjs assets/js/grid-hydrique/templates.mjs assets/css/grid-hydrique.css tests/grid-hydrique/templates.test.mjs tests/validate-grid-hydrique.ps1
git diff --cached
git commit -m "feat(dashboard): add resilient live refresh"
```

### Tâche 8 — Contenu Grid, navigation et indexation

**Fichiers :**
- Modifier : `grid-hydrique/index.html`
- Modifier : `index.html`
- Modifier : `sitemap.xml`
- Modifier : `tests/validate-grid-hydrique.ps1`
- Modifier : `tests/validate-site.ps1`

- [ ] **Étape 1 : écrire les assertions qui échouent**

Exiger dans les validations :

- un lien visible depuis l’accueil vers `grid-hydrique/` ;
- trois bénéfices non chiffrés : « Anticiper », « Relier », « Sécuriser » ;
- deux CTA : fiche du livre et page du livre ;
- la canonical `https://alaindusaule.fr/grid-hydrique/` dans le sitemap ;
- exactement cinq URLs indexables dans `sitemap.xml`.

- [ ] **Étape 2 : constater l’échec**

Exécuter les deux scripts PowerShell.

Résultat attendu : échec sur le lien d’accueil, les bénéfices et la cinquième URL.

- [ ] **Étape 3 : enrichir la section narrative**

Dans `grid-hydrique/index.html`, remplacer le paragraphe unique de `#grid-vision` par trois cartes :

- **Anticiper** — « Croiser les données pour préparer les décisions avant que la pénurie ne s’installe. »
- **Relier** — « Organiser la solidarité entre bassins, usages et territoires au lieu de gérer chaque crise isolément. »
- **Sécuriser** — « Protéger en priorité l’eau potable, les écosystèmes et les activités essentielles. »

Ajouter un CTA vers `../livres/leau-ou-le-chaos.html` et un lien Fnac vers `https://www.fnac.com/a23394930/Alain-du-Saule-L-eau-ou-le-chaos` avec `rel="noopener"`.

- [ ] **Étape 4 : ajouter l’entrée depuis l’accueil**

Dans la navigation et la section Grid de `index.html`, ajouter un lien explicite « Voir l’état de l’eau » vers `grid-hydrique/`, sans supprimer les liens existants.

- [ ] **Étape 5 : ajouter l’URL au sitemap**

Ajouter :

```xml
<url>
  <loc>https://alaindusaule.fr/grid-hydrique/</loc>
</url>
```

Mettre l’assertion du nombre d’URLs à `5`.

- [ ] **Étape 6 : vérifier et committer**

```powershell
& '.\tests\validate-grid-hydrique.ps1'
& '.\tests\validate-site.ps1'
git add -- grid-hydrique/index.html index.html sitemap.xml tests/validate-grid-hydrique.ps1 tests/validate-site.ps1
git diff --cached
git commit -m "feat(site): link water dashboard and Grid vision"
```

### Tâche 9 — Déploiement gratuit par GitHub Actions

**Fichiers :**
- Créer : `.github/workflows/pages.yml`
- Créer : `.nojekyll`
- Modifier : `tests/validate-grid-hydrique.ps1`

- [ ] **Étape 1 : écrire la validation du workflow**

Ajouter des assertions vérifiant la présence du fichier, les permissions minimales `contents: read`, `pages: write`, `id-token: write`, les actions `configure-pages`, `upload-pages-artifact`, `deploy-pages`, le runner `ubuntu-latest`, et l’absence de runner `*-large`.

- [ ] **Étape 2 : constater l’échec**

Exécuter `tests/validate-grid-hydrique.ps1`.

Résultat attendu : échec `Le workflow GitHub Pages est absent`.

- [ ] **Étape 3 : créer le workflow exact**

Créer un fichier `.nojekyll` vide, puis `.github/workflows/pages.yml` :

```yaml
name: Deploy static site to Pages

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
      - name: Run JavaScript tests
        run: node --test tests/grid-hydrique/*.test.mjs && node tests/contact-script.test.js
      - name: Install PDF validation dependency
        run: sudo apt-get update && sudo apt-get install --yes poppler-utils
      - name: Validate all site files
        shell: pwsh
        run: ./tests/validate-grid-hydrique.ps1 && ./tests/validate-site.ps1
      - name: Assemble public artifact
        shell: pwsh
        run: |
          New-Item -ItemType Directory -Path '_site'
          Copy-Item -Recurse -LiteralPath 'assets', 'grid-hydrique', 'livres' -Destination '_site'
          Copy-Item -LiteralPath '.nojekyll', '404.html', 'CNAME', 'index.html', 'mentions-legales.html', 'presse.html', 'robots.txt', 'sitemap.xml' -Destination '_site'
      - uses: actions/configure-pages@v6
      - uses: actions/upload-pages-artifact@v5
        with:
          path: _site
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: test
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v5
```

- [ ] **Étape 4 : vérifier et committer**

```powershell
& '.\tests\validate-grid-hydrique.ps1'
git add -- .github/workflows/pages.yml .nojekyll tests/validate-grid-hydrique.ps1
git diff --cached
git commit -m "ci(pages): deploy static dashboard"
```

- [ ] **Étape 5 : ne configurer GitHub qu’après intégration sur `master`**

Après validation de la branche et accord d’intégration, pousser `master`, puis exécuter :

```powershell
gh api --method PUT repos/Goran-VRBANCIC/alaindusaule.com/pages -f build_type=workflow
gh run list --repo Goran-VRBANCIC/alaindusaule.com --workflow pages.yml --limit 1
```

Résultat attendu : Pages passe de `legacy` à `workflow` et le run se termine avec `conclusion: success`. Ne pas modifier la configuration distante avant que le workflow existe sur `master`.

### Tâche 10 — Vérification finale, performance et journal

**Fichiers :**
- Modifier : `log.md`
- Modifier si un défaut est constaté : uniquement le fichier responsable et son test de régression

- [ ] **Étape 1 : lancer toute la suite locale**

```powershell
node --test tests/grid-hydrique/*.test.mjs
node '.\tests\contact-script.test.js'
& '.\tests\validate-grid-hydrique.ps1'
& '.\tests\validate-site.ps1'
```

Résultat attendu : tous les tests Node réussissent, `Contact script validation succeeded.`, `Validation dashboard réussie.` et `Validation réussie : 6 pages contrôlées.`

- [ ] **Étape 2 : servir le dépôt localement**

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Ouvrir `http://127.0.0.1:4173/grid-hydrique/` et vérifier à 320, 768, 1024 et 1440 px : aucun défilement horizontal, carte utilisable au clavier, panneau lisible, couches activables, données rafraîchies, chroniques affichées et messages de panne compréhensibles.

- [ ] **Étape 3 : mesurer Lighthouse**

Exécuter Chrome Lighthouse sur mobile pour `http://127.0.0.1:4173/grid-hydrique/`. Cibles : Performance ≥ 85, Accessibilité ≥ 90, Bonnes pratiques ≥ 90, SEO ≥ 90 et LCP < 2,5 s sur une connexion simulée. Si une cible échoue, écrire d’abord un test de régression applicable, puis corriger uniquement la cause mesurée.

- [ ] **Étape 4 : contrôler les API en conditions réelles**

Vérifier dans l’onglet Réseau : un appel national VigiEau, aucun appel individuel massif, appels Hub’Eau par bbox seulement après zoom 6, aucune boucle quand l’onglet est masqué, nouvelle actualisation après quinze minutes ou clic manuel.

- [ ] **Étape 5 : mettre à jour le journal**

Ajouter à `log.md`, avec date et heure, la demande exécutée, l’architecture finale, les problèmes rencontrés, leurs solutions, les résultats de test et la décision d’intégration. Ne jamais ajouter de mention de co-auteur.

- [ ] **Étape 6 : commit documentaire final**

```powershell
git add -- log.md
git diff --cached
git commit -m "docs: record dashboard implementation"
```

- [ ] **Étape 7 : revue finale avant intégration**

Utiliser `superpowers:requesting-code-review`, corriger chaque problème important avec un test de régression, relancer toute la suite, puis utiliser `superpowers:finishing-a-development-branch`. La configuration GitHub distante n’est appliquée qu’après le choix explicite d’intégration.

## Vérification de couverture du plan

| Exigence | Tâches |
|---|---|
| Carte de restrictions VigiEau | 4 |
| Indicateurs nationaux exacts | 2, 4 |
| 200–500 piézomètres et stations hydrométriques | 3, 5 |
| Mesures quasi temps réel | 2, 5, 7 |
| Chronique au clic | 6 |
| Section Grid et CTA livre | 8 |
| Responsive, accessibilité, états de chargement | 1, 6, 7, 10 |
| SEO et lien depuis le site | 1, 8 |
| Déploiement GitHub Pages sans coût supplémentaire | 9 |
| Tests, performance et journal | toutes, 10 |

## Hors périmètre du MVP

- prévisions hydrologiques et comparaison année N/N-1 ;
- calcul scientifique d’écart aux normales sans référentiel officiel adapté ;
- comptes utilisateurs, analytics, formulaires et mode sombre ;
- serveur, proxy, cache persistant et dépendance payante ;
- déploiement avant revue et choix d’intégration de la branche.
