# Global Color Tokens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Déclarer chaque couleur applicative une seule fois dans `site.css`, puis faire consommer ces tokens par tout le CSS, le JavaScript, MapLibre et les six pages HTML.

**Architecture:** `assets/css/site.css` est l’unique source des valeurs. Un module pur résout les propriétés CSS pour JavaScript ; la carte reçoit explicitement cette palette et un second point d’entrée synchronise `theme-color`. Le favicon SVG reste une ressource autonome exclue du contrôle applicatif.

**Tech Stack:** CSS custom properties, CSS `color-mix()`, JavaScript ES modules, MapLibre GL, tests Node.js, PowerShell, Edge via Playwright Python.

---

### Task 1: Créer le contrat JavaScript des tokens

**Files:**
- Create: `assets/js/theme.mjs`
- Create: `tests/theme.test.mjs`

- [ ] **Step 1: Faire écrire le test rouge du résolveur par GPT-5.4 Mini**

Créer `tests/theme.test.mjs` avec un faux objet de styles dont les valeurs sont des noms symboliques, puis vérifier la structure, le repli de restriction, l’erreur explicite et la synchronisation de la balise :

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  readThemeColors,
  restrictionColor,
  syncBrowserThemeColor,
} from "../assets/js/theme.mjs";

const values = new Map([
  ["--ink", "ink-token"],
  ["--paper", "paper-token"],
  ["--water", "water-token"],
  ["--water-deep", "water-deep-token"],
  ["--water-pale", "water-pale-token"],
  ["--station-hydro", "station-hydro-token"],
  ["--station-hydro-stroke", "station-hydro-stroke-token"],
  ["--restriction-crise", "crise-token"],
  ["--restriction-alerte-renforcee", "renforcee-token"],
  ["--restriction-alerte", "alerte-token"],
  ["--restriction-vigilance", "vigilance-token"],
  ["--restriction-none", "none-token"],
]);
const styles = { getPropertyValue: (name) => values.get(name) || "" };

test("readThemeColors résout les tokens CSS nécessaires à MapLibre", () => {
  const colors = readThemeColors(styles);
  assert.equal(colors.ink, "ink-token");
  assert.equal(colors.paper, "paper-token");
  assert.equal(colors.waterPale, "water-pale-token");
  assert.equal(colors.stationHydro, "station-hydro-token");
  assert.equal(colors.restrictions.alerte_renforcee, "renforcee-token");
  assert.equal(restrictionColor("crise", colors), "crise-token");
  assert.equal(restrictionColor(null, colors), "none-token");
});

test("readThemeColors nomme le token CSS absent", () => {
  assert.throws(
    () => readThemeColors({ getPropertyValue: () => "" }),
    /--ink/,
  );
});

test("syncBrowserThemeColor alimente la meta depuis le token", () => {
  const attributes = new Map();
  const meta = { setAttribute: (name, value) => attributes.set(name, value) };
  const documentObject = { querySelector: () => meta };
  assert.equal(syncBrowserThemeColor(documentObject, styles), true);
  assert.equal(attributes.get("content"), "water-deep-token");
});
```

- [ ] **Step 2: Faire constater le rouge par GPT-5.4 Mini**

Run:

```powershell
node --test tests/theme.test.mjs
```

Expected: échec d’import parce que `assets/js/theme.mjs` n’existe pas.

- [ ] **Step 3: Implémenter le module pur**

Créer `assets/js/theme.mjs` :

```js
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
```

- [ ] **Step 4: Faire vérifier le vert par GPT-5.4 Mini**

Run:

```powershell
node --test tests/theme.test.mjs
```

Expected: 3 tests réussis.

- [ ] **Step 5: Commit ciblé**

```powershell
git add -- assets/js/theme.mjs tests/theme.test.mjs
git diff --cached --check
git commit -m "feat(theme): resolve shared CSS colors"
```

### Task 2: Centraliser toutes les valeurs CSS

**Files:**
- Modify: `assets/css/site.css:9-26,74-75,171-172,221-222,364-366,402,514,711,726,871-884`
- Modify: `assets/css/grid-hydrique.css:101,179-186,201-202,271-287`
- Modify: `tests/grid-hydrique/accessibility-regressions.test.mjs`
- Create: `tests/color-tokens.test.mjs`

- [ ] **Step 1: Faire écrire le test d’architecture rouge par GPT-5.4 Mini**

Créer `tests/color-tokens.test.mjs`. Le test parcourt uniquement les sources applicatives CSS, JS et HTML ; `assets/icons/favicon.svg` et les autres ressources graphiques sont explicitement hors périmètre :

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function applicationSources(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return applicationSources(absolutePath);
    return /\.(?:css|js|mjs|html)$/.test(entry.name) ? [absolutePath] : [];
  });
}

const sourceFiles = applicationSources(path.join(root, "assets/css"));
const colorLiteral = /(?<!&)#[0-9a-f]{3,8}\b/i;

test("les codes couleur applicatifs sont uniques et déclarés dans :root", () => {
  const sitePath = path.join(root, "assets/css/site.css");
  const siteCss = fs.readFileSync(sitePath, "utf8");
  const rootBlock = siteCss.match(/:root\s*\{([\s\S]*?)\}/);
  assert.ok(rootBlock, "Le bloc :root est absent");

  const tokenValues = rootBlock[1].match(new RegExp(colorLiteral.source, "gi")) || [];
  assert.equal(new Set(tokenValues.map((value) => value.toLowerCase())).size, tokenValues.length);
  assert.doesNotMatch(rootBlock[1], /\brgba?\(/i);

  for (const absolutePath of sourceFiles) {
    const content = fs.readFileSync(absolutePath, "utf8");
    const inspected = absolutePath === sitePath
      ? content.replace(rootBlock[0], ":root {}")
      : content;
    assert.doesNotMatch(inspected, colorLiteral, path.relative(root, absolutePath));
    assert.doesNotMatch(inspected, /\brgba?\(/i, path.relative(root, absolutePath));
  }
});
```

- [ ] **Step 2: Faire constater le rouge par GPT-5.4 Mini**

Run:

```powershell
node --test tests/color-tokens.test.mjs
```

Expected: échec sur les valeurs encore présentes hors du bloc `:root`.

- [ ] **Step 3: Compléter les tokens globaux**

Dans `assets/css/site.css`, compléter `:root` avec ces valeurs, en conservant chaque littéral une seule fois :

```css
  --focus: #d88d13;
  --restriction-crise: #8b1e1e;
  --restriction-alerte-renforcee: #d96b27;
  --restriction-alerte: #e3a62f;
  --restriction-vigilance: #f2d36b;
  --restriction-none: #69f08b;
  --station-hydro: #477328;
  --station-hydro-stroke: #17370f;
  --error-pale: #f9e9e9;
  --black: #000000;
```

Remplacer également la définition de l’ombre :

```css
  --shadow: 0 1.5rem 4rem color-mix(in srgb, var(--ink) 18%, transparent);
```

- [ ] **Step 4: Remplacer tous les littéraux de `site.css`**

Appliquer exactement ces références :

```css
:focus-visible { outline-color: var(--focus); }
.lead--light { color: color-mix(in srgb, var(--paper) 82%, transparent); }
.site-header {
  border-bottom-color: color-mix(in srgb, var(--border) 85%, transparent);
  background: color-mix(in srgb, var(--paper) 96%, transparent);
}
.hero::before {
  border-color: color-mix(in srgb, var(--water) 16%, transparent);
  box-shadow:
    0 0 0 4rem color-mix(in srgb, var(--water) 4%, transparent),
    0 0 0 8rem color-mix(in srgb, var(--water) 2.5%, transparent);
}
.book-cover { border-color: color-mix(in srgb, var(--ink) 20%, transparent); }
.quote-panel::after { color: color-mix(in srgb, var(--water) 10%, transparent); }
.site-footer { color: color-mix(in srgb, var(--paper) 82%, transparent); }
.site-footer .fine-print { color: color-mix(in srgb, var(--paper) 76%, transparent); }
```

Dans `@media print`, utiliser uniquement :

```css
body { color: var(--black); background: var(--paper); }
.page-hero { background: var(--paper); }
a { color: var(--black); }
```

- [ ] **Step 5: Remplacer tous les littéraux de `grid-hydrique.css`**

Utiliser exactement :

```css
.water-map .maplibregl-canvas:focus-visible { outline-color: var(--focus); }
.legend-swatch { border-color: color-mix(in srgb, var(--ink) 30%, transparent); }
.legend-swatch--crise { background: var(--restriction-crise); }
.legend-swatch--renforcee { background: var(--restriction-alerte-renforcee); }
.legend-swatch--alerte { background: var(--restriction-alerte); }
.legend-swatch--vigilance { background: var(--restriction-vigilance); }
.legend-swatch--aucune { background: var(--restriction-none); }
.vision-benefits article {
  border-color: color-mix(in srgb, var(--paper) 28%, transparent);
  background: color-mix(in srgb, var(--paper) 7%, transparent);
}
.detail-level--crise { color: var(--paper); background: var(--restriction-crise); }
.detail-level--alerte_renforcee { background: var(--restriction-alerte-renforcee); }
.detail-level--alerte { background: var(--restriction-alerte); }
.detail-level--vigilance { background: var(--restriction-vigilance); }
.data-error {
  border-left-color: var(--restriction-crise);
  background: var(--error-pale);
}
```

Dans `tests/grid-hydrique/accessibility-regressions.test.mjs`, remplacer le test qui duplique l’ancien code couleur par un contrat de référence :

```js
test("la légende référence le token sans restriction", () => {
  const css = fs.readFileSync(
    new URL("../../assets/css/grid-hydrique.css", import.meta.url),
    "utf8",
  );
  assert.match(css, /\.legend-swatch--aucune\s*\{\s*background:\s*var\(--restriction-none\);/);
});
```

- [ ] **Step 6: Faire vérifier le vert par GPT-5.4 Mini**

Run:

```powershell
node --test tests/color-tokens.test.mjs
node --test tests/grid-hydrique/accessibility-regressions.test.mjs
& ./tests/validate-site.ps1
```

Expected: le test d’unicité et le validateur passent.

- [ ] **Step 7: Commit ciblé**

```powershell
git add -- assets/css/site.css assets/css/grid-hydrique.css tests/color-tokens.test.mjs tests/grid-hydrique/accessibility-regressions.test.mjs
git diff --cached --check
git commit -m "refactor(theme): centralize CSS color tokens"
```

### Task 3: Injecter la palette dans MapLibre

**Files:**
- Modify: `assets/js/grid-hydrique/map.mjs:3,80-100,169-248`
- Modify: `assets/js/grid-hydrique/dashboard.mjs:1-10,385-410`
- Modify: `assets/js/grid-hydrique/templates.mjs:3-23`
- Modify: `tests/grid-hydrique/map.test.mjs`
- Modify: `tests/grid-hydrique/templates.test.mjs`
- Modify: `tests/grid-hydrique/accessibility-regressions.test.mjs`
- Modify: `tests/color-tokens.test.mjs`

- [ ] **Step 1: Faire écrire les tests rouges d’injection par GPT-5.4 Mini**

Dans `tests/grid-hydrique/map.test.mjs`, supprimer l’import de `restrictionColor` depuis `templates.mjs`, définir une palette symbolique et la transmettre dans `createTestWaterMap` :

```js
const theme = Object.freeze({
  ink: "ink-token",
  paper: "paper-token",
  water: "water-token",
  waterDeep: "water-deep-token",
  waterPale: "water-pale-token",
  stationHydro: "station-hydro-token",
  stationHydroStroke: "station-hydro-stroke-token",
  restrictions: Object.freeze({
    crise: "crise-token",
    alerte_renforcee: "renforcee-token",
    alerte: "alerte-token",
    vigilance: "vigilance-token",
    none: "none-token",
  }),
});
```

Ajouter explicitement `theme` à l’objet transmis par `createTestWaterMap` :

```js
const waterMap = createWaterMap({
  theme,
  container: {},
  departments,
  piezoStations: [{ longitude: 1, latitude: 46 }],
  hydroStations: [{ longitude: 2, latitude: 47 }],
  onSelect() {},
  maplibre: fake.maplibre,
  ResizeObserverClass: options.ResizeObserverClass,
  requestFrame: options.requestFrame,
});
```

Ajouter un test qui attend les valeurs symboliques dans les couches :

```js
test("createWaterMap applique exclusivement la palette injectée", async () => {
  const { waterMap } = createTestWaterMap();
  await waterMap.ready;
  assert.equal(waterMap.map.options.style.layers[0].paint["background-color"], "water-pale-token");
  assert.equal(waterMap.map.layers.get("departments-line").paint["line-color"], "paper-token");
  assert.equal(waterMap.map.layers.get("piezo-points").paint["circle-color"], "water-token");
  assert.equal(waterMap.map.layers.get("hydro-points").paint["circle-color"], "station-hydro-token");
  assert.equal(waterMap.map.layers.get("hydro-points").paint["circle-stroke-color"], "station-hydro-stroke-token");
  assert.equal(waterMap.map.layers.get("selected-point").paint["circle-stroke-color"], "ink-token");
  assert.equal(waterMap.map.layers.get("departments-fill").paint["fill-color"].at(-1), "none-token");
  await waterMap.loadZoneLayers({ PMTiles: FakePMTiles, Protocol: FakeProtocol });
  assert.equal(waterMap.map.layers.get("zones-fill").paint["fill-color"].at(-1), "none-token");
});
```

Dans `accessibility-regressions.test.mjs`, transmettre cette palette au faux appel :

```js
theme: {
  ink: "ink-token",
  paper: "paper-token",
  water: "water-token",
  waterDeep: "water-deep-token",
  waterPale: "water-pale-token",
  stationHydro: "station-hydro-token",
  stationHydroStroke: "station-hydro-stroke-token",
  restrictions: {
    crise: "crise-token",
    alerte_renforcee: "renforcee-token",
    alerte: "alerte-token",
    vigilance: "vigilance-token",
    none: "none-token",
  },
},
```

Dans `templates.test.mjs`, supprimer l’import et le test de `restrictionColor`, car cette responsabilité quitte les templates.

Étendre enfin `sourceFiles` dans `tests/color-tokens.test.mjs` pour inclure le JavaScript applicatif :

```js
const sourceFiles = [
  ...applicationSources(path.join(root, "assets/css")),
  ...applicationSources(path.join(root, "assets/js")),
];
```

- [ ] **Step 2: Faire constater le rouge par GPT-5.4 Mini**

Run:

```powershell
node --test tests/color-tokens.test.mjs tests/grid-hydrique/map.test.mjs tests/grid-hydrique/templates.test.mjs tests/grid-hydrique/accessibility-regressions.test.mjs
```

Expected: échec parce que `createWaterMap` ignore encore l’option `theme` et conserve des littéraux.

- [ ] **Step 3: Modifier `map.mjs`**

Importer depuis le module partagé :

```js
import { restrictionColor } from "../theme.mjs";
```

Ajouter `theme` aux paramètres obligatoires de `createWaterMap`. Remplacer les peintures par :

```js
"background-color": theme.waterPale
"line-color": theme.paper
"circle-color": theme.water
"circle-stroke-color": theme.paper
"circle-color": theme.stationHydro
"circle-stroke-color": theme.stationHydroStroke
"circle-stroke-color": theme.ink
```

Pour la sélection, remplacer la couleur transparente par une couleur issue du thème avec opacité nulle :

```js
"circle-color": theme.paper,
"circle-opacity": 0,
```

Dans les expressions départements et zones, appeler :

```js
restrictionColor("crise", theme)
restrictionColor("alerte_renforcee", theme)
restrictionColor("alerte", theme)
restrictionColor("vigilance", theme)
restrictionColor(null, theme)
```

- [ ] **Step 4: Modifier l’orchestration et les templates**

Dans `dashboard.mjs`, importer et résoudre la palette avant la création :

```js
import { readThemeColors } from "../theme.mjs";

const theme = readThemeColors();
waterMap = createWaterMap({
  theme,
  maplibre,
  container: "carte-hydrique",
  departments: joinDepartmentRestrictions(departmentsGeoJson, []),
  piezoStations: piezoReference.stations,
  hydroStations: hydroReference.stations,
  onSelect: showSelection,
});
```

Dans `templates.mjs`, supprimer entièrement `RESTRICTION_COLORS` et `restrictionColor`.

- [ ] **Step 5: Faire vérifier le vert et l’architecture par GPT-5.4 Mini**

Run:

```powershell
node --test tests/theme.test.mjs tests/color-tokens.test.mjs tests/grid-hydrique/map.test.mjs tests/grid-hydrique/templates.test.mjs tests/grid-hydrique/accessibility-regressions.test.mjs
& ./tests/validate-grid-hydrique.ps1
```

Expected: toutes les suites ciblées et le validateur passent.

- [ ] **Step 6: Commit ciblé**

```powershell
git add -- assets/js/grid-hydrique/map.mjs assets/js/grid-hydrique/dashboard.mjs assets/js/grid-hydrique/templates.mjs tests/color-tokens.test.mjs tests/grid-hydrique/map.test.mjs tests/grid-hydrique/templates.test.mjs tests/grid-hydrique/accessibility-regressions.test.mjs
git diff --cached --check
git commit -m "refactor(map): consume shared theme colors"
```

### Task 4: Synchroniser la couleur navigateur sur les six pages

**Files:**
- Create: `assets/js/theme-color.mjs`
- Modify: `tests/theme.test.mjs`
- Modify: `tests/color-tokens.test.mjs`
- Modify: `404.html:10`
- Modify: `index.html:9`
- Modify: `mentions-legales.html:9`
- Modify: `presse.html:9`
- Modify: `grid-hydrique/index.html:17`
- Modify: `livres/leau-ou-le-chaos.html:9`

- [ ] **Step 1: Faire écrire le test HTML rouge par GPT-5.4 Mini**

Ajouter à `tests/theme.test.mjs` une table des chemins et vérifier une meta sans littéral ainsi que le module partagé :

```js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pages = new Map([
  ["404.html", "assets/js/theme-color.mjs"],
  ["index.html", "assets/js/theme-color.mjs"],
  ["mentions-legales.html", "assets/js/theme-color.mjs"],
  ["presse.html", "assets/js/theme-color.mjs"],
  ["grid-hydrique/index.html", "../assets/js/theme-color.mjs"],
  ["livres/leau-ou-le-chaos.html", "../assets/js/theme-color.mjs"],
]);

test("les pages synchronisent theme-color depuis le module partagé", () => {
  for (const [relativePath, modulePath] of pages) {
    const html = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
    assert.match(html, /<meta name="theme-color">/);
    assert.match(html, new RegExp(`<script type="module" src="${modulePath.replaceAll(".", "\\.")}"></script>`));
  }
});
```

Étendre également le contrôle architectural aux six pages dans `tests/color-tokens.test.mjs` :

```js
const sourceFiles = [
  ...applicationSources(path.join(root, "assets/css")),
  ...applicationSources(path.join(root, "assets/js")),
  ...["404.html", "index.html", "mentions-legales.html", "presse.html", "grid-hydrique/index.html", "livres/leau-ou-le-chaos.html"]
    .map((relativePath) => path.join(root, relativePath)),
];
```

- [ ] **Step 2: Faire constater le rouge par GPT-5.4 Mini**

Run:

```powershell
node --test tests/theme.test.mjs tests/color-tokens.test.mjs
```

Expected: échec car les metas contiennent encore un littéral et le point d’entrée n’est pas référencé.

- [ ] **Step 3: Créer le point d’entrée**

Créer `assets/js/theme-color.mjs` :

```js
import { syncBrowserThemeColor } from "./theme.mjs";

syncBrowserThemeColor();
```

- [ ] **Step 4: Modifier les six pages**

Dans chaque `<head>`, remplacer la meta par :

```html
<meta name="theme-color">
```

Ajouter immédiatement après la feuille `site.css` :

```html
<script type="module" src="assets/js/theme-color.mjs"></script>
```

Pour `grid-hydrique/index.html` et `livres/leau-ou-le-chaos.html`, utiliser :

```html
<script type="module" src="../assets/js/theme-color.mjs"></script>
```

- [ ] **Step 5: Faire vérifier le vert par GPT-5.4 Mini**

Run:

```powershell
node --test tests/theme.test.mjs tests/color-tokens.test.mjs
& ./tests/validate-site.ps1
```

Expected: tous les tests et les 6 pages du validateur passent.

- [ ] **Step 6: Commit ciblé**

```powershell
git add -- assets/js/theme-color.mjs tests/theme.test.mjs tests/color-tokens.test.mjs 404.html index.html mentions-legales.html presse.html grid-hydrique/index.html livres/leau-ou-le-chaos.html
git diff --cached --check
git commit -m "feat(theme): sync browser color from CSS token"
```

### Task 5: Validation complète et recette Edge

**Files:**
- Modify: `log.md`

- [ ] **Step 1: Faire exécuter toute la validation par GPT-5.4 Mini**

Run séparément :

```powershell
node --test tests/theme.test.mjs tests/color-tokens.test.mjs
node --test tests/grid-hydrique/*.test.mjs
& ./tests/validate-grid-hydrique.ps1
& ./tests/validate-site.ps1
node --test tests/contact-script.test.js
git diff --check
```

Expected: tous les codes valent `0`; aucune valeur hexadécimale ou `rgb/rgba` applicative ne se trouve hors du bloc `:root` de `site.css`.

- [ ] **Step 2: Faire servir le worktree pour Edge**

Servir `X:\DEVELOPPEMENT_WEB\alaindusaule.com\.worktrees\global-color-tokens` sur `127.0.0.1:8003` avec `.mjs` en `text/javascript`, `Cache-Control: no-store` et toute fenêtre de processus masquée.

- [ ] **Step 3: Faire exécuter la recette Edge par GPT-5.4 Mini**

Vérifier les six pages puis la carte :

```text
- chaque meta theme-color reçoit la valeur calculée de --water-deep ;
- les styles calculés généraux et hydriques sont identiques à l’état visuel précédent ;
- --restriction-none vaut #69f08b et la légende l’utilise ;
- les couches MapLibre utilisent les valeurs résolues des tokens pour le fond, les restrictions, les contours, les stations et la sélection ;
- départements et zones conservent la même palette ;
- aucune erreur console, pageerror ou ressource 404 n’apparaît.
```

- [ ] **Step 4: Journaliser les preuves**

Lire l’heure système avec :

```powershell
Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz'
```

Ajouter à `log.md` la demande, la source unique, l’exclusion motivée du favicon, le nombre de tokens, le résultat du contrôle anti-duplication, les tests et la recette Edge.

- [ ] **Step 5: Faire contrôler le journal par GPT-5.4 Mini puis commit**

Run:

```powershell
git diff --check -- log.md
```

Puis :

```powershell
git add -- log.md
git diff --cached --check
git commit -m "docs(log): record global color tokens"
```

### Task 6: Revue indépendante et intégration

**Files:**
- Review: all changes from `master` to `HEAD`

- [ ] **Step 1: Demander une revue indépendante GPT-5.4 Mini**

Le reviewer inspecte : source unique réelle, absence de littéraux hors tokens, compatibilité `color-mix`, erreurs de tokens absents, dépendances JavaScript des metas, injection explicite dans MapLibre, absence de changement visuel et couverture des tests.

Expected: aucune issue Critical ou Important. Toute issue bloquante repart dans un cycle TDD exécuté par GPT-5.4 Mini.

- [ ] **Step 2: Présenter les options d’intégration**

Après revue verte, proposer exactement :

```text
1. Fusionner localement dans master
2. Pousser la branche et créer une PR
3. Conserver la branche telle quelle
4. Abandonner les changements
```

Ne modifier les changements locaux éventuels de `master` qu’après accord explicite de l’utilisateur.
