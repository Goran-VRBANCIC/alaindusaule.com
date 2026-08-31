# No-Restriction Green Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher « Aucune restriction » avec le vert pastel `#d8e8dc` sur la carte et dans la légende.

**Architecture:** La palette JavaScript existante reste la source de couleur pour les départements et les zones VigiEau. La pastille CSS de la légende reçoit la même valeur exacte ; aucun autre niveau ni fond n’est modifié.

**Tech Stack:** JavaScript ES modules, CSS, tests Node.js, Edge via Playwright Python.

---

### Task 1: Verrouiller et appliquer le vert pastel

**Files:**
- Modify: `tests/grid-hydrique/templates.test.mjs`
- Modify: `tests/grid-hydrique/accessibility-regressions.test.mjs`
- Modify: `assets/js/grid-hydrique/templates.mjs:4-11`
- Modify: `assets/css/grid-hydrique.css:181-186`
- Modify: `log.md`

- [ ] **Step 1: Faire écrire les tests rouges par GPT-5.4 Mini**

Dans `tests/grid-hydrique/templates.test.mjs`, remplacer l’attente du niveau sans restriction :

```js
assert.equal(restrictionColor(null), "#d8e8dc");
```

Dans `tests/grid-hydrique/accessibility-regressions.test.mjs`, ajouter :

```js
test("la légende distingue l’absence de restriction du fond de carte", () => {
  const css = fs.readFileSync(
    new URL("../../assets/css/grid-hydrique.css", import.meta.url),
    "utf8",
  );

  assert.match(css, /\.legend-swatch--aucune\s*\{\s*background:\s*#d8e8dc;/);
  assert.doesNotMatch(css, /\.legend-swatch--aucune\s*\{\s*background:\s*#e9f2f5;/);
});
```

- [ ] **Step 2: Faire constater le rouge par GPT-5.4 Mini**

Run:

```powershell
node --test tests/grid-hydrique/templates.test.mjs tests/grid-hydrique/accessibility-regressions.test.mjs
```

Expected: deux assertions échouent parce que la palette et la légende utilisent encore `#d8e4e8`.

- [ ] **Step 3: Appliquer la correction minimale**

Dans `assets/js/grid-hydrique/templates.mjs`, modifier uniquement :

```js
none: "#d8e8dc",
```

Dans `assets/css/grid-hydrique.css`, modifier uniquement :

```css
.legend-swatch--aucune { background: #d8e8dc; }
```

- [ ] **Step 4: Faire vérifier le vert ciblé par GPT-5.4 Mini**

Run:

```powershell
node --test tests/grid-hydrique/templates.test.mjs tests/grid-hydrique/accessibility-regressions.test.mjs
```

Expected: toutes les assertions des deux fichiers passent.

- [ ] **Step 5: Faire exécuter la non-régression par GPT-5.4 Mini**

Run séparément :

```powershell
node --test tests/grid-hydrique/*.test.mjs
& ./tests/validate-grid-hydrique.ps1
git diff --check
```

Expected: tous les codes de sortie valent `0`.

- [ ] **Step 6: Faire vérifier la couleur dans Edge par GPT-5.4 Mini**

Sur `http://127.0.0.1:8002/grid-hydrique/`, vérifier avec Edge que :

```text
- la pastille « Aucune restriction » a la couleur calculée rgb(216, 232, 220) ;
- le fond de carte reste rgb(233, 242, 245) ;
- un département sans restriction utilise rgb(216, 232, 220) ;
- les couleurs crise, alerte renforcée, alerte et vigilance sont inchangées ;
- aucune erreur console ni pageerror n’apparaît.
```

- [ ] **Step 7: Journaliser et commit**

Ajouter à `log.md` les preuves GPT-5.4 Mini, puis exécuter :

```powershell
git add -- assets/js/grid-hydrique/templates.mjs assets/css/grid-hydrique.css tests/grid-hydrique/templates.test.mjs tests/grid-hydrique/accessibility-regressions.test.mjs log.md
git diff --cached --check
git commit -m "fix(map): distinguish unrestricted areas"
```
