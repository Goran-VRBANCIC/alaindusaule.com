$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$pagePath = Join-Path $projectRoot 'grid-hydrique/index.html'
$failures = [System.Collections.Generic.List[string]]::new()

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) {
        $failures.Add($Message)
    }
}

Assert-True (Test-Path -LiteralPath $pagePath) 'La page grid-hydrique/index.html est absente'

if (Test-Path -LiteralPath $pagePath) {
    $html = Get-Content -Raw -Encoding UTF8 -LiteralPath $pagePath
    $mapSectionPosition = $html.IndexOf('<section class="water-map-section"')
    $kpiSectionPosition = $html.IndexOf('<section id="indicateurs"')
    $liveSummaryPosition = $html.IndexOf('<div class="container water-live-summary"')
    $mapLayoutPosition = $html.IndexOf('<div class="water-map-layout"')
    $mapPosition = $html.IndexOf('id="carte-hydrique"')
    $mapControlsPosition = $html.IndexOf('class="container water-map-controls"')
    $viewControlsPosition = $html.IndexOf('class="water-view-controls"')
    $legendPosition = $html.IndexOf('class="container water-map-legend"')
    $instructionsPosition = $html.IndexOf('id="map-keyboard-instructions"')
    $detailPosition = $html.IndexOf('id="station-detail"')
    $statusPosition = $html.IndexOf('data-water-status')
    $layerControlsPosition = $html.IndexOf('class="water-layer-controls"')
    Assert-True ($mapSectionPosition -ge 0) 'La section cartographique est absente'
    Assert-True ($kpiSectionPosition -ge 0) 'La section des indicateurs est absente'
    Assert-True ($mapSectionPosition -lt $kpiSectionPosition) 'La carte doit apparaitre avant les indicateurs'
    Assert-True ($html -match 'class="container water-map-controls"') 'Le conteneur des commandes cartographiques est absent'
    Assert-True ($html -match 'class="water-view-controls"') 'Le sélecteur de vue est absent'
    Assert-True ($html -match 'class="water-layer-controls" role="group" aria-label="Stations affich') 'Les contrôles de stations ne forment pas un groupe accessible'
    Assert-True ($mapPosition -lt $mapControlsPosition -and $mapControlsPosition -lt $legendPosition -and $legendPosition -lt $instructionsPosition -and $instructionsPosition -lt $detailPosition -and $detailPosition -lt $statusPosition) 'L’ordre mobile doit être carte, commandes, légende, instructions, détail puis statut'
    Assert-True ($liveSummaryPosition -gt $mapControlsPosition) 'Le resume doit suivre la carte et ses controles dans le DOM mobile'
    Assert-True ($mapLayoutPosition -lt $mapControlsPosition) 'Le canevas doit preceder les commandes dans le DOM mobile'
    Assert-True ($html -match '<html lang="fr-FR"') 'La langue fr-FR est absente'
    Assert-True ($html -match '<link rel="canonical" href="https://alaindusaule\.fr/grid-hydrique/"') 'La canonical est incorrecte'
    Assert-True (([regex]::Matches($html, '<h1(?:\s|>)', 'IgnoreCase')).Count -eq 1) 'La page doit avoir un seul h1'
    Assert-True ($html -match 'class="skip-link"') 'Le lien d’évitement est absent'
    Assert-True ($html -match 'id="indicateurs"') 'La région des indicateurs est absente'
    Assert-True ($html -match 'id="carte-hydrique"') 'Le conteneur de carte est absent'
    Assert-True ($html -match 'id="station-detail"') 'Le panneau de détail est absent'
    Assert-True ($html -match 'id="grid-vision"') 'La section Grid est absente'
    Assert-True ($html -match 'data-refresh-water') 'Le bouton d’actualisation est absent'
    Assert-True ($html -match 'aria-live="polite"') 'La région de statut accessible est absente'
    Assert-True ($html -match 'tabindex="-1"') 'Le panneau de détail ne peut pas recevoir le focus'
    Assert-True ($html -match 'https://vigieau\.gouv\.fr/') 'Le lien source VigiEau est absent'
    Assert-True ($html -match 'https://hubeau\.eaufrance\.fr/') 'Le lien source Hub’Eau est absent'
    Assert-True ($html -match 'type="module" src="\.\./assets/js/grid-hydrique/dashboard\.mjs"') 'Le module principal est absent'
    Assert-True ($html -notmatch 'TODO|TBD|placeholder') 'La page contient un marqueur incomplet'
}

$cssPath = Join-Path $projectRoot 'assets/css/grid-hydrique.css'
Assert-True (Test-Path -LiteralPath $cssPath) 'La feuille CSS du dashboard est absente'
if (Test-Path -LiteralPath $cssPath) {
    $css = Get-Content -Raw -Encoding UTF8 -LiteralPath $cssPath
    Assert-True ($css -match '\.water-hero\s*\{[^}]*padding-block:\s*clamp\(2rem,\s*4vw,\s*4rem\)') 'Le premier ecran conserve trop espace vertical'
    Assert-True ($css -match '\.water-map\s*\{[^}]*min-height:\s*clamp\(24rem,\s*58svh,\s*32rem\)') 'La hauteur mobile de la carte est incorrecte'
    Assert-True ($css -match '@media\s*\(min-width:\s*48rem\)[\s\S]*?\.water-map\s*\{[^}]*min-height:\s*clamp\(32rem,\s*65svh,\s*46rem\)') 'La hauteur desktop de la carte est incorrecte'
    Assert-True ($css -notmatch '\.water-map-layout\s*\{[^}]*grid-template-columns') 'Le panneau de detail comprime encore la carte'
    Assert-True ($css -notmatch '\.station-detail\s*\{[^}]*position:\s*sticky') 'Le panneau de detail doit rester sous la carte'
    Assert-True ($css -notmatch '\.(?:water-live-summary|water-map-layout|water-layer-controls|station-detail)\s*\{[^}]*(?:^|[\r\n])\s*order:') 'Les elements interactifs ne doivent pas diverger de ordre DOM'
    Assert-True ($css -match '@media\s*\(max-width:\s*35\.99rem\)[\s\S]*?\.nav-list\s*\{[\s\S]*?flex-wrap:\s*wrap') 'La navigation mobile doit revenir a la ligne'
    Assert-True ($css -match 'content-visibility:\s*auto') 'Le contenu narratif différé est absent'
    Assert-True ($css -match 'color-scheme:\s*light') 'Le rendu clair explicite est absent'
}

$homePath = Join-Path $projectRoot 'index.html'
$homeHtml = Get-Content -Raw -Encoding UTF8 -LiteralPath $homePath
$dashboard = if (Test-Path -LiteralPath $pagePath) { Get-Content -Raw -Encoding UTF8 -LiteralPath $pagePath } else { '' }
Assert-True ($homeHtml -match 'href="grid-hydrique/"') 'L’accueil ne propose pas le dashboard'
Assert-True ($dashboard -match '>Anticiper<') 'Le bénéfice Anticiper est absent'
Assert-True ($dashboard -match '>Relier<') 'Le bénéfice Relier est absent'
Assert-True ($dashboard -match '>S.curiser<') 'Le bénéfice Securiser est absent'
Assert-True ($dashboard -match 'https://www\.fnac\.com/a23394930/') 'Le CTA Fnac est absent'

$sitemapPath = Join-Path $projectRoot 'sitemap.xml'
[xml]$sitemap = Get-Content -Raw -LiteralPath $sitemapPath
Assert-True ($sitemap.urlset.url.Count -eq 5) 'Le sitemap doit contenir cinq URLs'
Assert-True (@($sitemap.urlset.url.loc) -contains 'https://alaindusaule.fr/grid-hydrique/') 'Le dashboard est absent du sitemap'

$workflowPath = Join-Path $projectRoot '.github/workflows/pages.yml'
Assert-True (Test-Path -LiteralPath $workflowPath) 'Le workflow GitHub Pages est absent'
if (Test-Path -LiteralPath $workflowPath) {
    $workflow = Get-Content -Raw -Encoding UTF8 -LiteralPath $workflowPath
    Assert-True ($workflow -match 'contents:\s*read') 'La permission contents: read est absente'
    Assert-True ($workflow -match 'pages:\s*write') 'La permission pages: write est absente'
    Assert-True ($workflow -match 'id-token:\s*write') 'La permission id-token: write est absente'
    Assert-True ($workflow -match 'actions/configure-pages@v6') 'configure-pages v6 est absent'
    Assert-True ($workflow -match 'actions/upload-pages-artifact@v5') 'upload-pages-artifact v5 est absent'
    Assert-True ($workflow -match 'actions/deploy-pages@v5') 'deploy-pages v5 est absent'
    Assert-True ($workflow -match 'runs-on:\s*ubuntu-latest') 'Le runner standard Ubuntu est absent'
    Assert-True ($workflow -notmatch 'runs-on:\s*[^\r\n]*large') 'Un runner payant est configuré'
    Assert-True ($workflow -match 'node --test tests/grid-hydrique/\*\.test\.mjs') 'Les tests dashboard ne sont pas exécutés en CI'
}

Assert-True (Test-Path -LiteralPath (Join-Path $projectRoot '.nojekyll')) 'Le fichier .nojekyll est absent'

$dashboardPath = Join-Path $projectRoot 'assets/js/grid-hydrique/dashboard.mjs'
Assert-True (Test-Path -LiteralPath $dashboardPath) 'Le module principal est absent'
if (Test-Path -LiteralPath $dashboardPath) {
    $dashboard = Get-Content -Raw -Encoding UTF8 -LiteralPath $dashboardPath
    Assert-True ($dashboard -match 'unpkg\.com/maplibre-gl@6\.6\.0/dist/maplibre-gl\.mjs') 'Le module MapLibre doit etre epingle en 6.6.0'
    Assert-True ($dashboard -match 'unpkg\.com/maplibre-gl@6\.6\.0/dist/maplibre-gl\.css') 'La feuille MapLibre doit etre epinglee en 6.6.0'
    Assert-True ($dashboard -match 'requestIdleCallback') 'Le chargement de la carte doit laisser le contenu prioritaire se peindre'
    Assert-True ($dashboard -match '15\s*\*\s*60\s*\*\s*1000') 'L’intervalle de quinze minutes est absent'
    Assert-True ($dashboard -match 'visibilitychange') 'La suspension en arrière-plan est absente'
    Assert-True ($dashboard -match 'Promise\.allSettled') 'La dégradation indépendante des sources est absente'
    Assert-True ($dashboard -match 'matchMedia\("\(min-width: 48rem\)"\)') 'Le breakpoint DOM responsive est absent'
    Assert-True ($dashboard -match 'desktopLayoutMedia\.addEventListener\("change"') 'Le DOM ne suit pas les changements de largeur'
    Assert-True ($dashboard -match 'const PMTILES_MODULE_URL = "https://unpkg\.com/pmtiles@3\.2\.0/dist/index\.js"') 'PMTiles doit etre epingle en 3.2.0'
    Assert-True ($dashboard -match 'zoneLoadPromise\s*\|\|=\s*import\(PMTILES_MODULE_URL\)') 'PMTiles doit etre charge uniquement a la demande'
    Assert-True ($dashboard -notmatch 'import\s+[^\r\n]*pmtiles') 'PMTiles ne doit pas etre importe statiquement'
    Assert-True ($dashboard -match 'setupMapControls') 'La configuration des commandes de carte est absente'
    Assert-True ($dashboard -match 'loadZoneLayers') 'Le chargement des zones est absent'
    Assert-True ($dashboard -match 'setMapMode') 'Le changement de mode cartographique est absent'
    Assert-True ($dashboard -match 'setZoneResource') 'Le filtre de ressource zonale est absent'
    Assert-True ($dashboard -match 'renderZoneDetail') 'Le detail zonal est absent'
    Assert-True ($dashboard -match 'normalizeZones') 'La normalisation des zones est absente'
    Assert-True ($dashboard -match 'Vue D.?partements r.?tablie') 'Le texte de repli vers Departements est absent'
    Assert-True ($dashboard -match 'zoneLoadPromise\s*=\s*undefined') 'La promesse de chargement doit etre reinitialisee apres echec'
}

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Error $_ -ErrorAction Continue }
    exit 1
}

Write-Host 'Validation dashboard réussie.'
