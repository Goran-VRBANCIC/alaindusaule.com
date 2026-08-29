# Above-Fold Water Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher la vraie carte hydrique immédiatement après une introduction compacte, avant les indicateurs, en pleine largeur avec le détail dessous sur mobile comme sur ordinateur.

**Architecture:** Conserver l’unique conteneur MapLibre, ses identifiants et tout le flux JavaScript existant. Le correctif déplace seulement le bloc HTML de la carte avant les KPI, puis remplace la grille desktop carte/détail par une pile responsive à largeur complète avec des hauteurs bornées.

**Tech Stack:** HTML sémantique, CSS natif, PowerShell pour les validations statiques, Node.js test runner, MapLibre GL JS 6.6, Playwright CLI pour les captures.

---

## File Map

- `grid-hydrique/index.html` — ordre sémantique et visuel des sections du dashboard.
- `assets/css/grid-hydrique.css` — espacement du premier écran, largeur et hauteur responsive de la carte, position du panneau de détail.
- `tests/validate-grid-hydrique.ps1` — contrat de structure et règles CSS empêchant la régression.
- `log.md` — problème soumis, choix validé et résultats des vérifications.

### Task 1: Place the interactive map before the KPIs

**Files:**
- Modify: `tests/validate-grid-hydrique.ps1:15-34`
- Modify: `grid-hydrique/index.html:40-84`

- [ ] **Step 1: Write the failing structural test**

Dans le bloc qui charge `$html`, ajouter ces positions et assertions :

```powershell
$mapSectionPosition = $html.IndexOf('<section class="water-map-section"')
$kpiSectionPosition = $html.IndexOf('<section id="indicateurs"')
Assert-True ($mapSectionPosition -ge 0) 'La section cartographique est absente'
Assert-True ($kpiSectionPosition -ge 0) 'La section des indicateurs est absente'
Assert-True ($mapSectionPosition -lt $kpiSectionPosition) 'La carte doit apparaitre avant les indicateurs'
```

- [ ] **Step 2: Run the validator and confirm the regression is caught**

Run:

```powershell
& ./tests/validate-grid-hydrique.ps1
```

Expected: exit code `1` with `La carte doit apparaitre avant les indicateurs`.

- [ ] **Step 3: Move the KPI section after the map section**

Dans `grid-hydrique/index.html`, supprimer le bloc KPI actuellement placé entre la fermeture de `.water-hero` et l’ouverture de `.water-map-section` :

```html
<section id="indicateurs" class="section water-kpis" aria-labelledby="kpi-title">
  <div class="container">
    <h2 id="kpi-title">La situation en un regard</h2>
    <div class="water-kpi-grid" data-kpi-grid aria-live="polite"></div>
  </div>
</section>
```

Réinsérer exactement ce bloc après la balise `</section>` qui ferme `.water-map-section` et avant `<section id="grid-vision"`. Vérifier que les balises d’ouverture de `main` apparaissent désormais dans cet ordre : `.water-hero`, `.water-map-section`, `#indicateurs`, `#grid-vision`. Ne modifier aucun autre contenu, identifiant ni attribut `data-*` : `dashboard.mjs` doit retrouver les mêmes éléments sans changement.

- [ ] **Step 4: Run the structural and JavaScript tests**

Run:

```powershell
& ./tests/validate-grid-hydrique.ps1
node --test tests/grid-hydrique/*.test.mjs
```

Expected: validation réussie and `24` tests passed, `0` failed.

- [ ] **Step 5: Commit the structural change**

```powershell
git add -- grid-hydrique/index.html tests/validate-grid-hydrique.ps1
git diff --cached --check
git commit -m "fix(dashboard): place map before water indicators"
```

### Task 2: Make the map full-width and mobile-safe

**Files:**
- Modify: `tests/validate-grid-hydrique.ps1:37-43`
- Modify: `assets/css/grid-hydrique.css:7-10,65-86,289-326`

- [ ] **Step 1: Write the failing responsive CSS assertions**

Dans le bloc qui charge `$css`, ajouter :

```powershell
Assert-True ($css -match '\.water-hero\s*\{[^}]*padding-block:\s*clamp\(2rem,\s*4vw,\s*4rem\)') 'Le premier ecran conserve trop espace vertical'
Assert-True ($css -match '\.water-map\s*\{[^}]*min-height:\s*clamp\(24rem,\s*58svh,\s*32rem\)') 'La hauteur mobile de la carte est incorrecte'
Assert-True ($css -match '@media\s*\(min-width:\s*48rem\)[\s\S]*?\.water-map\s*\{[^}]*min-height:\s*clamp\(32rem,\s*65svh,\s*46rem\)') 'La hauteur desktop de la carte est incorrecte'
Assert-True ($css -notmatch '\.water-map-layout\s*\{[^}]*grid-template-columns') 'Le panneau de detail comprime encore la carte'
Assert-True ($css -notmatch '\.station-detail\s*\{[^}]*position:\s*sticky') 'Le panneau de detail doit rester sous la carte'
```

- [ ] **Step 2: Run the validator and confirm every new constraint fails**

Run:

```powershell
& ./tests/validate-grid-hydrique.ps1
```

Expected: exit code `1`; the output includes the five new failure messages.

- [ ] **Step 3: Apply the minimal responsive CSS**

Remplacer les règles concernées par les valeurs suivantes :

```css
.water-hero {
  padding-block: clamp(2rem, 4vw, 4rem);
  background: var(--paper-warm);
}

.water-map-section {
  padding-block: clamp(1.5rem, 3vw, 3rem) clamp(3rem, 7vw, 6rem);
  background: var(--paper-warm);
}

.water-map-layout {
  display: grid;
  width: min(calc(100% - 2rem), 90rem);
  margin-inline: auto;
  border: 1px solid var(--border);
  background: var(--paper);
}

.water-map {
  min-height: clamp(24rem, 58svh, 32rem);
}
```

Dans `@media (min-width: 48rem)`, conserver les grilles des KPI et bénéfices, puis ajouter :

```css
@media (min-width: 48rem) {
  .water-kpi-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .vision-benefits {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .water-map {
    min-height: clamp(32rem, 65svh, 46rem);
  }
}
```

Supprimer entièrement les deux blocs devenus contraires à la spécification :

```css
@media (min-width: 64rem) {
  .water-map-layout {
    grid-template-columns: minmax(0, 2fr) minmax(20rem, 0.8fr);
  }

  .station-detail {
    position: sticky;
    top: 6rem;
    max-height: calc(100vh - 7rem);
    overflow: auto;
  }
}

@media (max-width: 47.99rem) {
  .water-map {
    min-height: 65vh;
  }
}
```

- [ ] **Step 4: Run the targeted and global validators**

Run each command separately:

```powershell
& ./tests/validate-grid-hydrique.ps1
& ./tests/validate-site.ps1
node --test tests/grid-hydrique/*.test.mjs
node --test tests/contact-script.test.js
```

Expected: both validators succeed; dashboard reports `24` passed and contact reports `1` passed.

- [ ] **Step 5: Commit the responsive layout**

```powershell
git add -- assets/css/grid-hydrique.css tests/validate-grid-hydrique.ps1
git diff --cached --check
git commit -m "fix(dashboard): expand map across responsive layout"
```

### Task 3: Verify the real browser layout and document the fix

**Files:**
- Modify: `log.md`

- [ ] **Step 1: Start the worktree site on an isolated port**

Dans un terminal conservé ouvert depuis le worktree :

```powershell
npx.cmd --yes http-server@14.1.1 . -a 127.0.0.1 -p 4174 -c-1
```

Expected: `Available on: http://127.0.0.1:4174`.

- [ ] **Step 2: Confirm the page and module are served correctly**

```powershell
$pageResponse = Invoke-WebRequest -Uri 'http://127.0.0.1:4174/grid-hydrique/' -UseBasicParsing
$moduleResponse = Invoke-WebRequest -Uri 'http://127.0.0.1:4174/assets/js/grid-hydrique/dashboard.mjs' -UseBasicParsing
$pageResponse.StatusCode
$moduleResponse.Headers['Content-Type']
```

Expected: `200` and `application/javascript; charset=UTF-8`.

- [ ] **Step 3: Capture the four responsive widths**

```powershell
$captureDirectory = Join-Path $env:TEMP 'grid-hydrique-map-above-fold'
New-Item -ItemType Directory -Force -Path $captureDirectory | Out-Null
npx.cmd --yes playwright@1.55.0 screenshot --channel msedge --viewport-size='320,900' --wait-for-timeout=5000 'http://127.0.0.1:4174/grid-hydrique/' (Join-Path $captureDirectory '320.png')
npx.cmd --yes playwright@1.55.0 screenshot --channel msedge --viewport-size='768,900' --wait-for-timeout=5000 'http://127.0.0.1:4174/grid-hydrique/' (Join-Path $captureDirectory '768.png')
npx.cmd --yes playwright@1.55.0 screenshot --channel msedge --viewport-size='1024,900' --wait-for-timeout=5000 'http://127.0.0.1:4174/grid-hydrique/' (Join-Path $captureDirectory '1024.png')
npx.cmd --yes playwright@1.55.0 screenshot --channel msedge --viewport-size='1440,1000' --wait-for-timeout=5000 'http://127.0.0.1:4174/grid-hydrique/' (Join-Path $captureDirectory '1440.png')
```

Expected on visual inspection:

- `320.png`: introduction compacte, début de la carte visible sans défilement horizontal, contrôles et légende repliés, détail sous la carte ;
- `768.png`, `1024.png`, `1440.png`: carte sur toute la largeur du conteneur, aucun panneau latéral, KPI après le détail.

- [ ] **Step 4: Re-run the keyboard and network browser check**

Ouvrir Edge sur `http://127.0.0.1:4174/grid-hydrique/`, activer l’émulation responsive `320 × 900`, puis vérifier précisément :

1. `document.documentElement.scrollWidth <= document.documentElement.clientWidth` ;
2. décocher `[data-layer-toggle="hydro-points"]` produit `checked === false` ;
3. focaliser `.maplibregl-canvas` puis appuyer sur Entrée remplace `#detail-title` par un département ;
4. quatre clics espacés de `500 ms` sur `.maplibregl-ctrl-zoom-in` déclenchent des requêtes Hub’Eau contenant toutes `bbox=` ;
5. aucune erreur n’est enregistrée dans la console.

Expected: all five checks are true.

- [ ] **Step 5: Record the verification in the project journal**

Exécuter `Get-Date -Format 'yyyy-MM-dd HH:mm:ss'`, puis ajouter en tête de `log.md` une entrée datée intitulée `Carte visible dès le premier écran`. Elle doit rappeler la cause, le déplacement carte avant KPI, les deux hauteurs `clamp`, les quatre largeurs contrôlées et les résultats des tests et interactions navigateur.

- [ ] **Step 6: Run the final clean verification**

Run each command separately:

```powershell
node --test tests/grid-hydrique/*.test.mjs
& ./tests/validate-grid-hydrique.ps1
& ./tests/validate-site.ps1
node --test tests/contact-script.test.js
git diff --check
git status --short
```

Expected: `24` dashboard tests and `1` contact test pass, both validators succeed, `git diff --check` prints nothing, and only `log.md` is modified.

- [ ] **Step 7: Commit the journal**

```powershell
git add -- log.md
git diff --cached --check
git commit -m "docs: record above-fold map verification"
```

Expected: clean worktree after the commit.

## Completion Criteria

- The live MapLibre map appears before `#indicateurs` in DOM and visual order.
- The map spans the full `90rem` container and the detail panel follows it on every viewport.
- Mobile map height is `clamp(24rem, 58svh, 32rem)`; tablet/desktop is `clamp(32rem, 65svh, 46rem)`.
- No API, selector, focus, refresh, or layer behavior regresses.
- Tests, validators, browser interaction checks, and responsive screenshots all pass.
