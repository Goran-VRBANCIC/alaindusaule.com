$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
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
    $html = [System.IO.File]::ReadAllText($pagePath)
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
    Assert-True ($html -match 'data-simulation-note hidden') 'La note de simulation masquée est absente'
    Assert-True ($html -match 'Simulation p.dagogique fond.e sur les hypoth.ses du livre') 'La nature pédagogique de la simulation est absente'
    Assert-True ($html -match 'data-grid-legend hidden') 'La légende du réseau simulé est absente'
    Assert-True ($html -match 'R.seau simul.') 'Le titre de la légende du réseau est absent'
    Assert-True ($html -match 'class="water-layer-controls" role="group" aria-label="Stations affich') 'Les contrôles de stations ne forment pas un groupe accessible'
    Assert-True ($mapPosition -lt $mapControlsPosition -and $mapControlsPosition -lt $legendPosition -and $legendPosition -lt $instructionsPosition -and $instructionsPosition -lt $detailPosition -and $detailPosition -lt $statusPosition) 'L’ordre mobile doit être carte, commandes, légende, instructions, détail puis statut'
    Assert-True ($liveSummaryPosition -gt $mapControlsPosition) 'Le resume doit suivre la carte et ses controles dans le DOM mobile'
    Assert-True ($mapLayoutPosition -lt $mapControlsPosition) 'Le canevas doit preceder les commandes dans le DOM mobile'
    Assert-True ($html -match '<html lang="fr-FR"') 'La langue fr-FR est absente'
    Assert-True ($html -match '<link rel="canonical" href="https://alaindusaule\.fr/grid-hydrique/"') 'La canonical est incorrecte'
    $h1Marker = [regex]::Escape(([char]0x3C).ToString() + 'h1')
    Assert-True (($html -split $h1Marker).Count - 1 -eq 1) 'La page doit avoir un seul h1'
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
$css = Get-Content -Raw -Encoding UTF8 -LiteralPath $cssPath
Assert-True ($css.Contains('.water-hero')) 'Le bloc hero du dashboard est absent'
Assert-True ($css.Contains('.water-map')) 'Le bloc carte du dashboard est absent'
Assert-True ($css.Contains('min-height: clamp(30rem, 68svh, 40rem)')) 'La hauteur mobile de la carte est incorrecte'
Assert-True ($css.Contains('min-height: clamp(38rem, 72svh, 52rem)')) 'La hauteur desktop de la carte est incorrecte'
Assert-True ($css.Contains('.water-map-controls')) 'Les commandes de carte sont absentes'
Assert-True ($css.Contains('flex-wrap: wrap')) 'Les commandes de carte ne reviennent pas a la ligne'
Assert-True ($css.Contains('.water-control-group[hidden]')) 'Les commandes masquées ne sont pas masquées'
Assert-True ($css.Contains('.simulation-note[hidden]')) 'La note de simulation masquée reste visible'
Assert-True ($css.Contains('.grid-network-legend[hidden]')) 'La légende simulée masquée reste visible'
Assert-True ($css.Contains('.water-layer-controls[hidden]')) 'Les contrôles de stations masqués restent visibles'
Assert-True ($css -notmatch '#[0-9a-fA-F]{3,8}|rgba?\(') 'La feuille Grid contient une couleur littérale'
Assert-True ($css.Contains('.zone-detail__item')) 'Le détail de zone doit disposer d’un style dédié'
Assert-True ($css.Contains('.water-layer-toggle')) 'Le contrôle de couche est absent'
Assert-True ($css.Contains('min-height: 44px')) 'Les cibles interactives doivent conserver 44px de hauteur minimale'
Assert-True (-not $css.Contains('  order:')) 'Les éléments interactifs ne doivent pas diverger de ordre DOM'
$mobileMedia = '@media ' + [char]0x28 + 'max-width: 35.99rem' + [char]0x29
Assert-True ($css.Contains($mobileMedia)) 'La navigation mobile est absente'
Assert-True ($css.Contains('content-visibility: auto')) 'Le contenu narratif différé est absent'
Assert-True ($css.Contains('color-scheme: light')) 'Le rendu clair explicite est absent'

$homePath = Join-Path $projectRoot 'index.html'
$homeHtml = [System.IO.File]::ReadAllText($homePath)
$dashboard = [string]::Join([Environment]::NewLine, @(Get-Content -Encoding UTF8 -LiteralPath $pagePath))
Assert-True ($homeHtml.Contains('href="grid-hydrique/"')) 'L’accueil ne propose pas le dashboard'
Assert-True ($dashboard.Contains('>Anticiper<')) 'Le bénéfice Anticiper est absent'
Assert-True ($dashboard.Contains('>Relier<')) 'Le bénéfice Relier est absent'
$secureBenefit = '>S' + [char]0xE9 + 'curiser<'
Assert-True ($dashboard.Contains($secureBenefit)) 'Le bénéfice Securiser est absent'
Assert-True ($dashboard.Contains('https://www.fnac.com/a23394930/')) 'Le CTA Fnac est absent'

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
    Assert-True ($workflow -match 'runs-on:\s*ubuntu-24\.04') 'Le runner Ubuntu 24.04 est absent'
    Assert-True (-not $workflow.Contains('large')) 'Un runner payant est configuré'
    Assert-True ($workflow -match 'node --test tests/\*\.test\.mjs') 'Les tests racine ne sont pas exécutés en CI'
    Assert-True ($workflow.Contains('node --test tests/*.test.mjs tests/grid-hydrique/*.test.mjs')) 'Les tests dashboard ne sont pas exécutés en CI'
}

Assert-True (Test-Path -LiteralPath (Join-Path $projectRoot '.nojekyll')) 'Le fichier .nojekyll est absent'
Assert-True (Test-Path -LiteralPath (Join-Path $projectRoot 'scripts/build-water-stations.mjs')) 'Le générateur complet des stations est absent'
Assert-True (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'scripts/build-water-station-samples.mjs'))) 'L’ancien générateur d’échantillons existe encore'

$dashboardPath = Join-Path $projectRoot 'assets/js/grid-hydrique/dashboard.mjs'
Assert-True (Test-Path -LiteralPath $dashboardPath) 'Le module principal est absent'
if (Test-Path -LiteralPath $dashboardPath) {
    $dashboard = Get-Content -Raw -Encoding UTF8 -LiteralPath $dashboardPath
    Assert-True ($dashboard -match "unpkg\.com/maplibre-gl@6\.6\.0/dist/maplibre-gl\.mjs") "Le module MapLibre doit etre epingle en 6.6.0"
    Assert-True ($dashboard -match "unpkg\.com/maplibre-gl@6\.6\.0/dist/maplibre-gl\.css") "La feuille MapLibre doit etre epinglee en 6.6.0"
    Assert-True ($dashboard -match "requestIdleCallback") "Le chargement de la carte doit laisser le contenu prioritaire se peindre"
    Assert-True ($dashboard -match "15\s*\*\s*60\s*\*\s*1000") "L’intervalle de quinze minutes est absent"
    Assert-True ($dashboard -match "visibilitychange") "La suspension en arrière-plan est absente"
    Assert-True ($dashboard -match "Promise\.allSettled") "La dégradation indépendante des sources est absente"
    Assert-True ($dashboard.Contains("matchMedia") -and $dashboard.Contains("min-width: 48rem")) "Le breakpoint DOM responsive est absent"
    Assert-True ($dashboard.Contains("desktopLayoutMedia.addEventListener")) "Le DOM ne suit pas les changements de largeur"
    Assert-True ($dashboard.Contains("PMTILES_MODULE_URL") -and $dashboard.Contains("pmtiles@3.2.0")) "PMTiles doit etre epingle en 3.2.0"
    Assert-True ($dashboard.Contains("zoneLoadPromise ||= import(PMTILES_MODULE_URL)")) "PMTiles doit etre charge uniquement a la demande"
    Assert-True (-not $dashboard.Contains("from pmtiles")) "PMTiles ne doit pas etre importe statiquement"
    Assert-True ($dashboard.Contains("setupMapControls")) "La configuration des commandes de carte est absente"
    Assert-True ($dashboard.Contains("loadZoneLayers")) "Le chargement des zones est absent"
    Assert-True ($dashboard.Contains("setMapMode")) "Le changement de mode cartographique est absent"
    Assert-True ($dashboard.Contains("setZoneResource")) "Le filtre de ressource zonale est absent"
    Assert-True ($dashboard.Contains("renderZoneDetail")) "Le detail zonal est absent"
    Assert-True ($dashboard.Contains("setSimulationPhase")) "Le changement de phase simulée est absent"
    Assert-True ($dashboard.Contains("renderSimulationDetail")) "Le détail simulé est absent"
    Assert-True ($dashboard.Contains("layerControlsElement.hidden = simulated")) "Les contrôles de stations ne sont pas masqués en simulation"
    Assert-True ($dashboard.Contains("normalizeZones")) "La normalisation des zones est absente"
    Assert-True ($dashboard.Contains("Vue ") -and $dashboard.Contains("partements") -and $dashboard.Contains("tablie")) "Le texte de repli vers Departements est absent"
    Assert-True ($dashboard.Contains("zoneLoadPromise = undefined")) "La promesse de chargement doit etre reinitialisee apres echec"
}

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Error $_ -ErrorAction Continue }
    exit 1
}

Write-Host "Validation dashboard reussie."
