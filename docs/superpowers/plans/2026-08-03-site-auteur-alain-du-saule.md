# Site auteur Alain du Saule Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire un site statique multipage, performant et accessible pour Alain du Saule, avec *L’eau ou le chaos* comme ouvrage phare et tous ses canaux d’achat vérifiés.

**Architecture:** Le site repose sur trois pages éditoriales autonomes (`index.html`, `livres/leau-ou-le-chaos.html`, `presse.html`) partageant une feuille de styles et des composants HTML cohérents. Aucun JavaScript applicatif n’est utilisé ; les tests PowerShell valident structure, SEO, liens locaux et contraintes de contenu, tandis que les assets sont dérivés des sources finales du vault.

**Tech Stack:** HTML5, CSS moderne mobile-first, JSON-LD, SVG, PowerShell 7/Windows PowerShell, Python 3 + Pillow, Poppler/MiKTeX `pdftoppm`, Git.

---

## Carte des fichiers

- `index.html` — accueil, identité auteur, ouvrage phare, Grid, chiffres sourcés, achat et contact.
- `livres/leau-ou-le-chaos.html` — page éditoriale et commerciale complète du livre.
- `presse.html` — bio, fiche média, téléchargements et contact presse.
- `mentions-legales.html` — informations éditoriales confirmées et propriété intellectuelle.
- `404.html` — récupération après URL invalide.
- `assets/css/site.css` — design system, composants, responsive, accessibilité et impression.
- `assets/fonts/eb-garamond-regular.woff2` — Garamond libre auto-hébergée.
- `assets/fonts/eb-garamond-semibold.woff2` — variante de titre.
- `assets/images/cover/*` — couverture responsive et téléchargement presse.
- `assets/images/meta/og-leau-ou-le-chaos.jpg` — image sociale 1200 × 630.
- `assets/icons/favicon.svg` — marque réseau hydrique.
- `assets/documents/communique-presse-leau-ou-le-chaos.pdf` — communiqué existant.
- `robots.txt` — directives d’indexation et sitemap.
- `sitemap.xml` — URLs publiques canoniques.
- `tests/validate-site.ps1` — validations structurelles sans dépendance.

## Task 1: Écrire le contrat de validation du site

**Files:**
- Create: `tests/validate-site.ps1`

- [ ] **Step 1: Écrire le validateur avant les pages**

Le script doit charger les cinq pages HTML attendues et vérifier : présence des fichiers, UTF-8, `lang="fr-FR"`, viewport, description, canonical, un seul H1, lien d’évitement, feuille CSS, absence de portrait et d’images distantes, JSON-LD sur les pages principales, liens locaux résolus, et absence de marqueurs incomplets.

```powershell
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$pages = @(
  'index.html',
  'livres/leau-ou-le-chaos.html',
  'presse.html',
  'mentions-legales.html',
  '404.html'
)
$failures = [System.Collections.Generic.List[string]]::new()

function Assert-True([bool]$condition, [string]$message) {
  if (-not $condition) { $failures.Add($message) }
}

foreach ($page in $pages) {
  $path = Join-Path $projectRoot $page
  Assert-True (Test-Path -LiteralPath $path) "$page est absent"
  if (-not (Test-Path -LiteralPath $path)) { continue }

  $html = Get-Content -LiteralPath $path -Raw -Encoding UTF8
  Assert-True ($html -match '<html lang="fr-FR"') "$page doit déclarer fr-FR"
  Assert-True ($html -match '<meta name="viewport"') "$page doit déclarer viewport"
  Assert-True ($html -match '<meta name="description"') "$page doit avoir une description"
  Assert-True ($html -match '<link rel="canonical"') "$page doit avoir une canonical"
  Assert-True (([regex]::Matches($html, '<h1(?:\s|>)', 'IgnoreCase')).Count -eq 1) "$page doit avoir un seul h1"
  Assert-True ($html -match 'class="skip-link"') "$page doit avoir un lien d’évitement"
  Assert-True ($html -match 'assets/css/site\.css|\.\./assets/css/site\.css') "$page doit charger site.css"
  Assert-True ($html -notmatch 'TODO|TBD|placeholder') "$page contient un marqueur incomplet"
  Assert-True ($html -notmatch '<img[^>]+src="https?://') "$page ne doit pas charger d’image distante"

  foreach ($match in [regex]::Matches($html, '(?:href|src)="([^"#]+)"', 'IgnoreCase')) {
    $target = $match.Groups[1].Value
    if ($target -match '^(?:https?:|mailto:|data:)') { continue }
    $targetPath = $target.Split('?')[0]
    $resolved = [IO.Path]::GetFullPath((Join-Path (Split-Path $path) $targetPath))
    Assert-True (Test-Path -LiteralPath $resolved) "$page référence un fichier absent : $target"
  }
}

$index = Get-Content -LiteralPath (Join-Path $projectRoot 'index.html') -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
$book = Get-Content -LiteralPath (Join-Path $projectRoot 'livres/leau-ou-le-chaos.html') -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
$press = Get-Content -LiteralPath (Join-Path $projectRoot 'presse.html') -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
Assert-True ($index -match '"@type"\s*:\s*"WebSite"') 'Accueil : schema WebSite absent'
Assert-True ($index -match '"@type"\s*:\s*"Person"') 'Accueil : schema Person absent'
Assert-True ($book -match '"@type"\s*:\s*"Book"') 'Livre : schema Book absent'
Assert-True ($book -match '9782322839933') 'Livre : ISBN absent'
Assert-True ($press -match 'data-contact-button') 'Presse : bouton de contact protégé absent'
Assert-True (($index + $book + $press) -notmatch '<img[^>]+(?:portrait|auteur|alain)') 'Aucun portrait auteur ne doit être publié'

if ($failures.Count -gt 0) {
  $failures | ForEach-Object { Write-Error $_ -ErrorAction Continue }
  exit 1
}
Write-Host "Validation réussie : $($pages.Count) pages contrôlées."
```

- [ ] **Step 2: Exécuter le test et constater l’échec initial**

Run: `powershell -ExecutionPolicy Bypass -File tests/validate-site.ps1`

Expected: sortie non nulle avec au moins `index.html est absent`.

- [ ] **Step 3: Commit du contrat de validation**

```powershell
git add -- tests/validate-site.ps1
git commit -m "test: define static site requirements"
```

## Task 2: Préparer les assets finaux et la fondation CSS

**Files:**
- Create: `assets/css/site.css`
- Create: `assets/fonts/eb-garamond-regular.woff2`
- Create: `assets/fonts/eb-garamond-semibold.woff2`
- Create: `assets/images/cover/leau-ou-le-chaos-480.avif`
- Create: `assets/images/cover/leau-ou-le-chaos-480.webp`
- Create: `assets/images/cover/leau-ou-le-chaos-800.avif`
- Create: `assets/images/cover/leau-ou-le-chaos-800.webp`
- Create: `assets/images/cover/leau-ou-le-chaos.jpg`
- Create: `assets/images/cover/leau-ou-le-chaos-presse.jpg`
- Create: `assets/images/meta/og-leau-ou-le-chaos.jpg`
- Create: `assets/icons/favicon.svg`
- Create: `assets/documents/communique-presse-leau-ou-le-chaos.pdf`

- [ ] **Step 1: Extraire la première de couverture et créer les variantes Web**

Extraire la page complète à 300 dpi, puis rogner la première de couverture située sur la moitié droite. Déterminer le bord de coupe depuis la largeur réelle et conserver le ratio 155 × 220. Générer les formats avec Pillow, en mode RGB, orientation corrigée et métadonnées supprimées.

```powershell
$sourcePdf = 'O:\Obsidian_vault\claude-obsidian\wiki\projects\ecriture\grid-hydrique-national\livre\couverture\testcouv3.pdf'
$assetRoot = 'assets\images\cover'
New-Item -ItemType Directory -Force $assetRoot, 'assets\images\meta', 'assets\documents', 'assets\fonts', 'assets\icons', 'assets\css' | Out-Null
pdftoppm -f 1 -singlefile -r 300 -png $sourcePdf "$env:TEMP\alaindusaule-cover-spread"
@'
from pathlib import Path
from PIL import Image, ImageOps

source = Path.home() / 'AppData/Local/Temp/alaindusaule-cover-spread.png'
out = Path('assets/images/cover')
image = ImageOps.exif_transpose(Image.open(source)).convert('RGB')
w, h = image.size
front = image.crop((round(w * 0.514), 0, w, h))
target_ratio = 155 / 220
crop_w = round(front.height * target_ratio)
left = max(0, (front.width - crop_w) // 2)
front = front.crop((left, 0, left + crop_w, front.height))

for width in (480, 800):
    resized = front.resize((width, round(width / target_ratio)), Image.Resampling.LANCZOS)
    resized.save(out / f'leau-ou-le-chaos-{width}.webp', 'WEBP', quality=82, method=6)
    resized.save(out / f'leau-ou-le-chaos-{width}.avif', 'AVIF', quality=55)

front.resize((800, round(800 / target_ratio)), Image.Resampling.LANCZOS).save(out / 'leau-ou-le-chaos.jpg', quality=86, optimize=True, progressive=True)
front.resize((1409, 2000), Image.Resampling.LANCZOS).save(out / 'leau-ou-le-chaos-presse.jpg', quality=92, optimize=True, progressive=True)

canvas = Image.new('RGB', (1200, 630), '#F5F2EB')
cover = front.resize((354, 503), Image.Resampling.LANCZOS)
canvas.paste(cover, (766, 64))
canvas.save('assets/images/meta/og-leau-ou-le-chaos.jpg', quality=88, optimize=True, progressive=True)
'@ | python -
Copy-Item 'O:\Obsidian_vault\claude-obsidian\wiki\projects\ecriture\grid-hydrique-national\promotion\communique-presse-leau-ou-le-chaos.pdf' 'assets\documents\communique-presse-leau-ou-le-chaos.pdf'
```

Après génération, inspecter visuellement `leau-ou-le-chaos-presse.jpg` et ajuster uniquement les constantes de rognage si la première de couverture contient encore le dos ou manque un bord.

- [ ] **Step 2: Installer EB Garamond depuis la source libre officielle**

Télécharger les WOFF2 latin depuis le dépôt officiel Google Fonts et conserver la licence OFL dans `assets/fonts/OFL.txt`. Vérifier que les réponses HTTP sont 200 avant de les enregistrer.

- [ ] **Step 3: Créer le favicon réseau**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#073E52"/>
  <path d="M12 45c11 0 11-26 22-26s7 16 18 16" fill="none" stroke="#F5F2EB" stroke-width="5" stroke-linecap="round"/>
  <circle cx="12" cy="45" r="4" fill="#F8D898"/>
  <circle cx="34" cy="19" r="4" fill="#F8D898"/>
  <circle cx="52" cy="35" r="4" fill="#F8D898"/>
</svg>
```

- [ ] **Step 4: Créer la feuille de styles commune**

La feuille doit définir les tokens ci-dessous, puis les composants `.site-header`, `.nav-list`, `.button`, `.button--secondary`, `.hero`, `.book-cover`, `.fact-grid`, `.network-rail`, `.content-grid`, `.quote-panel`, `.author-signature`, `.retailer-grid`, `.press-card`, `.site-footer`, `.breadcrumb` et `.error-page`.

```css
@font-face {
  font-family: "EB Garamond";
  src: url("../fonts/eb-garamond-regular.woff2") format("woff2");
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: "EB Garamond";
  src: url("../fonts/eb-garamond-semibold.woff2") format("woff2");
  font-weight: 600;
  font-display: swap;
}
:root {
  --ink: #231f20;
  --paper: #fff;
  --paper-warm: #f5f2eb;
  --water: #0b5c7a;
  --water-deep: #073e52;
  --earth: #6c4b30;
  --forest: #283818;
  --sun: #f8d898;
  --border: #d8d2c7;
  --serif: "EB Garamond", Georgia, Cambria, serif;
  --sans: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --container: 72rem;
  --measure: 68ch;
}
*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; color: var(--ink); background: var(--paper); font: 1.0625rem/1.62 var(--sans); }
img { display: block; max-width: 100%; height: auto; }
a { color: var(--water-deep); text-decoration-thickness: .09em; text-underline-offset: .16em; }
:focus-visible { outline: 3px solid var(--sun); outline-offset: 4px; }
.skip-link { position: fixed; left: 1rem; top: -6rem; z-index: 100; padding: .75rem 1rem; background: var(--ink); color: white; }
.skip-link:focus { top: 1rem; }
.container { width: min(calc(100% - 2.5rem), var(--container)); margin-inline: auto; }
h1, h2, h3 { font-family: var(--serif); line-height: 1.04; text-wrap: balance; }
h1 { font-size: clamp(3rem, 10vw, 7.5rem); font-weight: 400; }
h2 { font-size: clamp(2.25rem, 6vw, 4.5rem); font-weight: 400; }
.button { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; padding: .78rem 1.15rem; border: 2px solid var(--water-deep); background: var(--water-deep); color: white; font-weight: 700; text-decoration: none; transition: background-color .2s, color .2s; }
.button:hover { background: var(--water); }
.button--secondary { background: transparent; color: var(--water-deep); }
.button--secondary:hover { color: white; }
@media (min-width: 48rem) { .hero { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(16rem, .8fr); gap: clamp(3rem, 7vw, 7rem); align-items: center; } }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; } }
```

Définir précisément les composants ainsi : en-tête bordé et sticky avec fond blanc opaque ; navigation flexible sans menu masqué ; hero doté d’un fond papier chaud et d’un motif réseau en pseudo-élément ; couverture limitée à 24rem avec ombre fixe ; grilles de faits, contenus et libraires en une colonne puis trois colonnes à 48rem ; rail réseau vertical sur mobile puis horizontal ; panneau de citation bleu à 8 % d’opacité visuelle avec texte bleu profond ; signature auteur composée des initiales `ADS` en Garamond ; cartes dotées d’une bordure `--border` et sans translation au survol ; pied de page bleu profond ; fil d’Ariane compact. Tous les espacements suivent une échelle `0.5, 0.75, 1, 1.5, 2, 3, 4, 6rem` et aucun état interactif ne modifie la taille de mise en page.

- [ ] **Step 5: Commit des assets et de la fondation visuelle**

```powershell
git add -- assets
git commit -m "feat: add book assets and visual system"
```

## Task 3: Construire la page d’accueil

**Files:**
- Create: `index.html`

- [ ] **Step 1: Créer le squelette SEO et la navigation**

Utiliser `lang="fr-FR"`, canonical `https://alaindusaule.com/`, métadonnées Open Graph avec `assets/images/meta/og-leau-ou-le-chaos.jpg`, favicon local et JSON-LD `WebSite` + `Person`. Le menu doit relier `#livre`, `#grid`, `#auteur`, `presse.html` et `#acheter`.

- [ ] **Step 2: Écrire le hero et le contenu éditorial**

Le H1 est `L’eau ou le chaos`. L’accroche principale est `La France a construit un réseau électrique national. Elle peut penser l’eau avec la même ambition.` La couverture utilise `<picture>` avec AVIF, WebP et JPEG, dimensions `800 × 1135`, `fetchpriority="high"` et alt `Couverture du livre L’eau ou le chaos d’Alain du Saule`.

Les sections suivantes doivent apparaître dans cet ordre : trois faits sourcés ; Stocker/Répartir/Piloter ; Alerte/Solution/Action ; citation ; biographie sans portrait ; ouvrages ; canaux d’achat ; presse/contact.

- [ ] **Step 3: Ajouter les canaux confirmés**

BoD est le premier bouton avec l’URL `https://librairie.bod.fr/leau-ou-le-chaos-alain-du-saule-9782322839933`. Fnac et Cultura suivent. Google Books et BnF sont nommés comme fiches de consultation, pas comme boutons d’achat.

- [ ] **Step 4: Exécuter le validateur et corriger uniquement les échecs liés à l’accueil**

Run: `powershell -ExecutionPolicy Bypass -File tests/validate-site.ps1`

Expected: `index.html` ne figure plus dans les erreurs ; les autres pages restent absentes.

- [ ] **Step 5: Commit de l’accueil**

```powershell
git add -- index.html
git commit -m "feat: build author homepage"
```

## Task 4: Construire la page détaillée du livre

**Files:**
- Create: `livres/leau-ou-le-chaos.html`

- [ ] **Step 1: Créer la page avec chemins relatifs corrects**

La canonical est `https://alaindusaule.com/livres/leau-ou-le-chaos.html`. Tous les assets remontent par `../assets/` et les pages racine par `../`. Ajouter un fil d’Ariane visible.

- [ ] **Step 2: Ajouter le contenu et le schema Book**

Le JSON-LD inclut exactement : `name`, `alternativeHeadline`, `author`, `isbn`, `inLanguage`, `numberOfPages: 132`, `bookFormat: Paperback`, `datePublished: 2026-07-11`, `publisher: Books on Demand`, `image` et `description`. Ne pas ajouter `Offer` ni note.

Les sections sont : Pourquoi ce livre ; Alerte/Solution/Action ; Stocker/Répartir/Piloter ; À qui s’adresse-t-il ; Sources et méthode ; Informations bibliographiques ; Où trouver le livre.

- [ ] **Step 3: Ajouter tous les canaux vérifiés**

Présenter BoD, Fnac, Cultura, Google Books et BnF. Rechercher l’ISBN sur d’autres librairies ; n’ajouter que les fiches qui répondent et affichent le même titre, auteur et ISBN.

- [ ] **Step 4: Exécuter le validateur**

Run: `powershell -ExecutionPolicy Bypass -File tests/validate-site.ps1`

Expected: aucun échec lié à `index.html` ou `livres/leau-ou-le-chaos.html`.

- [ ] **Step 5: Commit de la page livre**

```powershell
git add -- livres/leau-ou-le-chaos.html
git commit -m "feat: add L'eau ou le chaos page"
```

## Task 5: Construire l’espace presse et les pages utilitaires

**Files:**
- Create: `presse.html`
- Create: `mentions-legales.html`
- Create: `404.html`

- [ ] **Step 1: Construire `presse.html`**

Inclure la biographie approuvée : cadre polyvalent, entrepreneur et professionnel de l’informatique depuis plus de vingt ans ; développement logiciel, gestion de projet, formation, management et transformation des systèmes d’information. Ne publier ni portrait, ni âge, ni identité civile. Ajouter fiche bibliographique, angles d’interview, liens vers le communiqué PDF et la couverture presse, puis un bouton de contact protégé qui ouvre le logiciel de messagerie sans publier l’adresse dans le HTML.

- [ ] **Step 2: Construire `mentions-legales.html`**

Identifier le site comme publication éditoriale d’Alain du Saule et donner l’adresse de contact. Expliquer la propriété des textes et visuels, la nature informative des liens externes et l’absence de collecte de données ou de cookies. Ne pas inventer de société, d’adresse postale ou d’hébergeur.

- [ ] **Step 3: Construire `404.html`**

Utiliser le H1 `Cette page s’est évaporée` et proposer deux actions : retour accueil et découverte du livre. Garder la page autonome avec canonical `https://alaindusaule.com/404.html`.

- [ ] **Step 4: Exécuter le validateur jusqu’au vert**

Run: `powershell -ExecutionPolicy Bypass -File tests/validate-site.ps1`

Expected: `Validation réussie : 5 pages contrôlées.`

- [ ] **Step 5: Commit des pages secondaires**

```powershell
git add -- presse.html mentions-legales.html 404.html
git commit -m "feat: add press and utility pages"
```

## Task 6: Ajouter l’indexation et renforcer les tests

**Files:**
- Create: `robots.txt`
- Create: `sitemap.xml`
- Modify: `tests/validate-site.ps1`

- [ ] **Step 1: Étendre le test avant les fichiers SEO**

Ajouter les assertions suivantes à la fin du validateur :

```powershell
$robotsPath = Join-Path $projectRoot 'robots.txt'
$sitemapPath = Join-Path $projectRoot 'sitemap.xml'
Assert-True (Test-Path -LiteralPath $robotsPath) 'robots.txt est absent'
Assert-True (Test-Path -LiteralPath $sitemapPath) 'sitemap.xml est absent'
if (Test-Path -LiteralPath $robotsPath) {
  $robots = Get-Content -LiteralPath $robotsPath -Raw
  Assert-True ($robots -match 'Sitemap: https://alaindusaule\.com/sitemap\.xml') 'robots.txt doit référencer le sitemap canonique'
}
if (Test-Path -LiteralPath $sitemapPath) {
  [xml]$sitemap = Get-Content -LiteralPath $sitemapPath -Raw
  Assert-True ($sitemap.urlset.url.Count -eq 4) 'sitemap.xml doit contenir 4 URLs indexables'
}
```

- [ ] **Step 2: Vérifier que le test échoue**

Run: `powershell -ExecutionPolicy Bypass -File tests/validate-site.ps1`

Expected: échecs `robots.txt est absent` et `sitemap.xml est absent`.

- [ ] **Step 3: Créer robots et sitemap**

```text
User-agent: *
Allow: /

Sitemap: https://alaindusaule.com/sitemap.xml
```

Le sitemap XML contient exactement l’accueil, la page livre, la page presse et les mentions légales. La page 404 n’y figure pas.

- [ ] **Step 4: Relancer le test**

Run: `powershell -ExecutionPolicy Bypass -File tests/validate-site.ps1`

Expected: `Validation réussie : 5 pages contrôlées.`

- [ ] **Step 5: Commit SEO**

```powershell
git add -- robots.txt sitemap.xml tests/validate-site.ps1
git commit -m "feat: add crawl and sitemap metadata"
```

## Task 7: Vérification visuelle, performance et livraison

**Files:**
- Modify: les fichiers concernés uniquement si les vérifications révèlent un défaut.

- [ ] **Step 1: Lancer un serveur HTTP local**

Run: `python -m http.server 4173 --bind 127.0.0.1`

Expected: serveur disponible sur `http://127.0.0.1:4173/` sans erreur de fichier.

- [ ] **Step 2: Capturer les pages aux largeurs cibles**

Utiliser le navigateur automatisable disponible pour inspecter l’accueil à 320, 375, 768, 1024 et 1440 px, puis la page livre et presse au moins sur mobile et desktop. Vérifier absence de débordement, lisibilité, ordre du hero, couverture, focus et équilibre des espacements.

- [ ] **Step 3: Vérifier les assets et le poids**

```powershell
Get-ChildItem -Recurse -File assets | Sort-Object Length -Descending | Select-Object FullName,Length
```

Expected: aucun asset servi supérieur à 1 Mo ; couverture LCP 800 px inférieure à 500 Ko ; aucune source PNG 300 dpi copiée.

- [ ] **Step 4: Vérifier HTML, CSS et données structurées**

Exécuter le validateur local, un parseur HTML disponible et la validation JSON de chaque bloc `application/ld+json`. Vérifier qu’aucune console navigateur ne signale une ressource 404.

- [ ] **Step 5: Vérification Git finale**

```powershell
powershell -ExecutionPolicy Bypass -File tests/validate-site.ps1
git status --short
git log --oneline -8
```

Expected: validateur vert et seulement les modifications intentionnelles de correction éventuelle avant leur commit.

- [ ] **Step 6: Commit de finition si nécessaire**

```powershell
git add -- index.html livres/leau-ou-le-chaos.html presse.html mentions-legales.html 404.html assets/css/site.css
git commit -m "fix: polish responsive site presentation"
```

Ne créer ce commit que si des corrections ont réellement été faites.
