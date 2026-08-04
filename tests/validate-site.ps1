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

function Assert-True {
    param(
        [bool]$Condition,
        [string]$Message
    )

    if (-not $Condition) {
        $failures.Add($Message)
    }
}

foreach ($page in $pages) {
    $path = Join-Path $projectRoot $page
    Assert-True (Test-Path -LiteralPath $path) "$page est absent"

    if (-not (Test-Path -LiteralPath $path)) {
        continue
    }

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
        if ($target -match '^(?:https?:|mailto:|data:)') {
            continue
        }

        $targetPath = ($target -split '[?#]')[0]
        if ([string]::IsNullOrWhiteSpace($targetPath)) {
            continue
        }

        $resolved = [IO.Path]::GetFullPath((Join-Path (Split-Path $path) $targetPath))
        Assert-True (Test-Path -LiteralPath $resolved) "$page référence un fichier absent : $target"
    }
}

$textExtensions = @('.html', '.js', '.md', '.txt')
$trackedTextFiles = & git -C $projectRoot ls-files | Where-Object {
    $textExtensions -contains [IO.Path]::GetExtension($_).ToLowerInvariant()
}

foreach ($relativePath in $trackedTextFiles) {
    $trackedPath = Join-Path $projectRoot $relativePath
    $source = Get-Content -LiteralPath $trackedPath -Raw -Encoding UTF8
    Assert-True ($source -notmatch '(?i)[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}') "$relativePath expose une adresse email complète"

    if ([IO.Path]::GetExtension($relativePath) -eq '.html') {
        Assert-True ($source -notmatch '(?i)(?:href|action)=["'']mailto:') "$relativePath expose un lien mailto direct"
    }
}

$indexPath = Join-Path $projectRoot 'index.html'
$bookPath = Join-Path $projectRoot 'livres/leau-ou-le-chaos.html'
$pressPath = Join-Path $projectRoot 'presse.html'
$index = if (Test-Path -LiteralPath $indexPath) { Get-Content -LiteralPath $indexPath -Raw -Encoding UTF8 } else { '' }
$book = if (Test-Path -LiteralPath $bookPath) { Get-Content -LiteralPath $bookPath -Raw -Encoding UTF8 } else { '' }
$press = if (Test-Path -LiteralPath $pressPath) { Get-Content -LiteralPath $pressPath -Raw -Encoding UTF8 } else { '' }

Assert-True ($index -match '"@type"\s*:\s*"WebSite"') 'Accueil : schema WebSite absent'
Assert-True ($index -match '"@type"\s*:\s*"Person"') 'Accueil : schema Person absent'
Assert-True ($book -match '"@type"\s*:\s*"Book"') 'Livre : schema Book absent'
Assert-True ($book -match '9782322839933') 'Livre : ISBN absent'
$contactScriptPath = Join-Path $projectRoot 'assets/js/contact.js'
Assert-True (Test-Path -LiteralPath $contactScriptPath) 'Le script de contact protégé est absent'
Assert-True ($index -match '<button[^>]+data-contact-button') 'Accueil : bouton de contact protégé absent'
Assert-True ($index -match '<script[^>]+src="assets/js/contact\.js"') 'Accueil : script de contact absent'
Assert-True (([regex]::Matches($press, 'data-contact-button')).Count -eq 2) 'Presse : deux boutons de contact protégés sont requis'
Assert-True ($press -match '<script[^>]+src="assets/js/contact\.js"') 'Presse : script de contact absent'
Assert-True (($index + $book + $press) -notmatch 'author-portrait|portrait-auteur') 'Aucun portrait auteur ne doit être publié'

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

$cssPath = Join-Path $projectRoot 'assets/css/site.css'
Assert-True (Test-Path -LiteralPath $cssPath) 'site.css est absent'
if (Test-Path -LiteralPath $cssPath) {
    $css = Get-Content -LiteralPath $cssPath -Raw -Encoding UTF8
    Assert-True ($css -match '\.section--water\s+\.button--light\s*\{[^}]*color:\s*var\(--water-deep\)') 'Le bouton clair doit conserver un texte sombre sur fond blanc'
    Assert-True ($css -match '\.site-footer\s+\.fine-print\s*\{[^}]*color:\s*rgba\(255,\s*255,\s*255') 'Le texte secondaire du pied de page doit rester lisible sur fond sombre'
}

$cover640Avif = Join-Path $projectRoot 'assets/images/cover/leau-ou-le-chaos-640.avif'
$cover640Webp = Join-Path $projectRoot 'assets/images/cover/leau-ou-le-chaos-640.webp'
Assert-True (Test-Path -LiteralPath $cover640Avif) 'La couverture AVIF 640 px est absente'
Assert-True (Test-Path -LiteralPath $cover640Webp) 'La couverture WebP 640 px est absente'
Assert-True ($index -match 'leau-ou-le-chaos-640\.avif') 'Accueil : la variante AVIF 640 px doit être déclarée'

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Error $_ -ErrorAction Continue }
    exit 1
}

Write-Host "Validation réussie : $($pages.Count) pages contrôlées."
