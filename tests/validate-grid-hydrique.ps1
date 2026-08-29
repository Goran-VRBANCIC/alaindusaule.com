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
    Assert-True ($html -match 'cdn\.jsdelivr\.net/npm/maplibre-gl@6\.6\.0') 'MapLibre doit être épinglé en 6.6.0'
    Assert-True ($html -notmatch 'TODO|TBD|placeholder') 'La page contient un marqueur incomplet'
}

$cssPath = Join-Path $projectRoot 'assets/css/grid-hydrique.css'
Assert-True (Test-Path -LiteralPath $cssPath) 'La feuille CSS du dashboard est absente'
if (Test-Path -LiteralPath $cssPath) {
    $css = Get-Content -Raw -Encoding UTF8 -LiteralPath $cssPath
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

$dashboardPath = Join-Path $projectRoot 'assets/js/grid-hydrique/dashboard.mjs'
Assert-True (Test-Path -LiteralPath $dashboardPath) 'Le module principal est absent'
if (Test-Path -LiteralPath $dashboardPath) {
    $dashboard = Get-Content -Raw -Encoding UTF8 -LiteralPath $dashboardPath
    Assert-True ($dashboard -match '15\s*\*\s*60\s*\*\s*1000') 'L’intervalle de quinze minutes est absent'
    Assert-True ($dashboard -match 'visibilitychange') 'La suspension en arrière-plan est absente'
    Assert-True ($dashboard -match 'Promise\.allSettled') 'La dégradation indépendante des sources est absente'
}

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Error $_ -ErrorAction Continue }
    exit 1
}

Write-Host 'Validation dashboard réussie.'
