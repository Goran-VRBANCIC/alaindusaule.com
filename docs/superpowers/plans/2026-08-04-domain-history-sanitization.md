# Canonical Domain and Git History Sanitization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish `alaindusaule.fr` as the sole canonical domain, publish the user-supplied sanitized press PDF, and replace the public Git history with an equivalent history that no longer contains the contact address or earlier PDF versions.

**Architecture:** First add regression checks and make a normal focused commit containing the `.fr` metadata and clean PDF. Then create an offline Git bundle, rewrite a temporary clone with `git-filter-repo`, remove the PDF path from all historical commits, restore only the clean PDF at the new tip, verify the rewritten graph, and update `master` with a hash-pinned `--force-with-lease`. Finally realign the primary clone, verify GitHub Pages, and record the rewritten commit in Obsidian.

**Tech Stack:** Static HTML/XML/TXT, PowerShell, Poppler `pdftotext`, Git, Python virtual environment, `git-filter-repo`, GitHub CLI, GitHub Pages.

---

## File map

- Modify `tests/validate-site.ps1`: enforce the `.fr` public origin and scan the press PDF text.
- Modify `404.html`, `index.html`, `livres/leau-ou-le-chaos.html`, `mentions-legales.html`, and `presse.html`: use `.fr` canonical, Open Graph, structured-data, and textual domain references.
- Modify `robots.txt` and `sitemap.xml`: publish only `.fr` URLs.
- Preserve and commit `assets/documents/communique-presse-leau-ou-le-chaos.pdf`: user-supplied one-page sanitized PDF.
- Create outside the repository `X:\DEVELOPPEMENT_WEB\_git-backups\alaindusaule.com-pre-sanitize-20260804.bundle`: complete recoverable backup containing the old sensitive history; never publish it.
- Create temporarily under `C:\Users\Goran\AppData\Local\Temp\alaindusaule-history-sanitize-20260804`: isolated rewrite clone and Python virtual environment; delete only after remote and primary-clone verification.
- Modify outside the repository the Grid Hydrique project note, `wiki/log.md`, and `wiki/hot.md` in `O:\Obsidian_vault\claude-obsidian` after publication.

### Task 1: Add canonical-domain and PDF regression checks

**Files:**
- Modify: `tests/validate-site.ps1`
- Test: `tests/validate-site.ps1`

- [ ] **Step 1: Add the failing `.fr` origin checks**

After the existing page loop, add checks that reject the obsolete origin from public HTML and require the new origin:

```powershell
$publicOrigin = 'https://alaindusaule.fr'
foreach ($page in $pages) {
    $path = Join-Path $projectRoot $page
    if (-not (Test-Path -LiteralPath $path)) {
        continue
    }

    $html = Get-Content -LiteralPath $path -Raw -Encoding UTF8
    Assert-True ($html -notmatch 'https://alaindusaule\.com') "$page référence encore le domaine .com"
    Assert-True ($html -match [regex]::Escape($publicOrigin)) "$page ne référence pas le domaine canonique .fr"
}
```

Replace the existing `robots.txt` assertion with:

```powershell
Assert-True ($robots -match 'Sitemap: https://alaindusaule\.fr/sitemap\.xml') 'robots.txt doit référencer le sitemap canonique .fr'
Assert-True ($robots -notmatch 'alaindusaule\.com') 'robots.txt référence encore le domaine .com'
```

After parsing `sitemap.xml`, add:

```powershell
$sitemapLocations = @($sitemap.urlset.url.loc)
Assert-True (($sitemapLocations | Where-Object { $_ -notlike 'https://alaindusaule.fr/*' }).Count -eq 0) 'sitemap.xml contient une URL hors du domaine .fr'
Assert-True (($sitemapLocations -join "`n") -notmatch 'alaindusaule\.com') 'sitemap.xml référence encore le domaine .com'
```

- [ ] **Step 2: Add the press-PDF content check**

Before the final failure block, add:

```powershell
$pressPdfPath = Join-Path $projectRoot 'assets/documents/communique-presse-leau-ou-le-chaos.pdf'
$pdfTextTool = Get-Command pdftotext -ErrorAction SilentlyContinue
Assert-True (Test-Path -LiteralPath $pressPdfPath) 'Le communiqué de presse PDF est absent'
Assert-True ($null -ne $pdfTextTool) 'pdftotext est requis pour contrôler le communiqué de presse'

if ((Test-Path -LiteralPath $pressPdfPath) -and $null -ne $pdfTextTool) {
    $pdfTextExecutable = $pdfTextTool.Source
    $pdfText = (& $pdfTextExecutable -layout $pressPdfPath -) -join "`n"
    Assert-True ($pdfText -notmatch '(?i)[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}') 'Le communiqué de presse expose une adresse email complète'
}
```

- [ ] **Step 3: Run the validator and verify the red state**

Run:

```powershell
& .\tests\validate-site.ps1
```

Expected: FAIL because the HTML, `robots.txt`, and `sitemap.xml` still reference `.com`. The PDF-specific assertion passes because the user already supplied the corrected binary before the test existed.

### Task 2: Publish the `.fr` origin and sanitized PDF

**Files:**
- Modify: `404.html`
- Modify: `index.html`
- Modify: `livres/leau-ou-le-chaos.html`
- Modify: `mentions-legales.html`
- Modify: `presse.html`
- Modify: `robots.txt`
- Modify: `sitemap.xml`
- Modify: `assets/documents/communique-presse-leau-ou-le-chaos.pdf`
- Modify: `tests/validate-site.ps1`

- [ ] **Step 1: Replace the public origin in HTML metadata**

In the five HTML files, replace every exact absolute origin:

```text
https://alaindusaule.com
```

with:

```text
https://alaindusaule.fr
```

This changes canonical links, Open Graph URLs, JSON-LD identifiers, JSON-LD image URLs, and breadcrumb items while preserving every path and fragment.

In `mentions-legales.html`, also replace the two visible plain-domain references `alaindusaule.com` with `alaindusaule.fr`.

- [ ] **Step 2: Replace the crawler-facing origin**

Set `robots.txt` to:

```text
User-agent: *
Allow: /

Sitemap: https://alaindusaule.fr/sitemap.xml
```

In `sitemap.xml`, preserve the four entries and dates but change every `<loc>` origin to `https://alaindusaule.fr`.

- [ ] **Step 3: Verify the current-tree exposure**

Run:

```powershell
$targetContact = 'alaindusaule' + [char]64 + 'gmail.com'
rg -n 'alaindusaule\.com' 404.html index.html mentions-legales.html presse.html livres robots.txt sitemap.xml
$pdfText = (& pdftotext -layout 'assets/documents/communique-presse-leau-ou-le-chaos.pdf' -) -join "`n"
if ($pdfText -match [regex]::Escape($targetContact)) { throw 'Le PDF expose encore l’adresse de contact' }
```

Expected: `rg` returns no matches and the PDF check exits successfully.

- [ ] **Step 4: Run the complete local checks**

Run separately:

```powershell
& .\tests\validate-site.ps1
```

```powershell
node .\tests\contact-script.test.js
node --check .\assets\js\contact.js
git diff --check
```

Expected: five pages validated, contact behavior validated, JavaScript syntax valid, and no whitespace errors.

- [ ] **Step 5: Stage only the intended site changes and review them**

Run:

```powershell
git add -- 404.html index.html mentions-legales.html presse.html livres/leau-ou-le-chaos.html robots.txt sitemap.xml tests/validate-site.ps1 assets/documents/communique-presse-leau-ou-le-chaos.pdf
git diff --cached --stat
git diff --cached --check
git diff --cached -- 404.html index.html mentions-legales.html presse.html livres/leau-ou-le-chaos.html robots.txt sitemap.xml tests/validate-site.ps1
```

Expected: the staged text diff contains only `.com` to `.fr` replacements and validation additions; the staged binary diff contains only the user-supplied PDF replacement.

- [ ] **Step 6: Commit the site correction**

Run:

```powershell
git commit -m "fix(site): publish canonical fr domain"
```

Expected: one focused commit containing the domain correction, sanitized PDF, and regression checks. The already committed design and implementation plan remain separate commits.

### Task 3: Create and verify the recoverable backup

**Files:**
- Create outside repository: `X:\DEVELOPPEMENT_WEB\_git-backups\alaindusaule.com-pre-sanitize-20260804.bundle`

- [ ] **Step 1: Verify the repository and remote preconditions**

Run:

```powershell
git status --short --branch
git branch -a
git tag --list
$expectedRemoteHead = (git ls-remote origin refs/heads/master).Split("`t")[0]
$localHead = (git rev-parse HEAD).Trim()
Write-Output "expected_remote_head=$expectedRemoteHead"
Write-Output "local_head=$localHead"
```

Expected: clean working tree, only `master` and its remote-tracking refs, no tags, and a non-empty expected remote hash. The local head may be ahead because the sanitized commits have not yet been published.

- [ ] **Step 2: Create the backup directory after validating its exact path**

Run:

```powershell
$backupDirectory = [IO.Path]::GetFullPath('X:\DEVELOPPEMENT_WEB\_git-backups')
$expectedBackupDirectory = 'X:\DEVELOPPEMENT_WEB\_git-backups'
if ($backupDirectory -ne $expectedBackupDirectory) { throw "Unexpected backup path: $backupDirectory" }
New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
$backupBundle = Join-Path $backupDirectory 'alaindusaule.com-pre-sanitize-20260804.bundle'
if (Test-Path -LiteralPath $backupBundle) { throw "Backup already exists: $backupBundle" }
```

- [ ] **Step 3: Create and verify the full bundle**

Run in the same PowerShell session:

```powershell
git bundle create $backupBundle --all
git bundle verify $backupBundle
```

Expected: bundle verification lists `master` and `origin/master` as complete refs. This bundle contains the old sensitive history and must remain outside GitHub and Obsidian.

### Task 4: Rewrite and verify an isolated clone

**Files:**
- Create temporarily: `C:\Users\Goran\AppData\Local\Temp\alaindusaule-history-sanitize-20260804\`

- [ ] **Step 1: Create the exact temporary root and preserve the clean PDF**

Run:

```powershell
$rewriteRoot = [IO.Path]::GetFullPath('C:\Users\Goran\AppData\Local\Temp\alaindusaule-history-sanitize-20260804')
$expectedRewriteRoot = 'C:\Users\Goran\AppData\Local\Temp\alaindusaule-history-sanitize-20260804'
if ($rewriteRoot -ne $expectedRewriteRoot) { throw "Unexpected rewrite path: $rewriteRoot" }
if (Test-Path -LiteralPath $rewriteRoot) { throw "Rewrite directory already exists: $rewriteRoot" }
New-Item -ItemType Directory -Path $rewriteRoot | Out-Null
$cleanPdf = Join-Path $rewriteRoot 'communique-presse-nettoye.pdf'
Copy-Item -LiteralPath 'X:\DEVELOPPEMENT_WEB\alaindusaule.com\assets\documents\communique-presse-leau-ou-le-chaos.pdf' -Destination $cleanPdf
$cleanPdfHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $cleanPdf).Hash
Write-Output "clean_pdf_sha256=$cleanPdfHash"
```

- [ ] **Step 2: Create an isolated clone and tool environment**

Run in the same PowerShell session:

```powershell
$rewriteClone = Join-Path $rewriteRoot 'repository'
$rewriteVenv = Join-Path $rewriteRoot 'venv'
git clone --no-local --single-branch --branch master 'X:\DEVELOPPEMENT_WEB\alaindusaule.com' $rewriteClone
python -m venv $rewriteVenv
$filterPython = Join-Path $rewriteVenv 'Scripts\python.exe'
& $filterPython -m pip install --disable-pip-version-check git-filter-repo
& $filterPython -m git_filter_repo --version
```

Expected: the clone points at the local clean head and `git-filter-repo` prints its version from the disposable virtual environment.

- [ ] **Step 3: Rewrite text blobs and remove every historical PDF version**

Run in the same PowerShell session:

```powershell
Push-Location $rewriteClone
try {
    & $filterPython -m git_filter_repo --force `
        --path 'assets/documents/communique-presse-leau-ou-le-chaos.pdf' `
        --invert-paths `
        --blob-callback 'blob.data = blob.data.replace(b"alaindusaule" + bytes([64]) + b"gmail.com", b"[contact removed]")'
    if ($LASTEXITCODE -ne 0) { throw 'git-filter-repo failed' }
} finally {
    Pop-Location
}
```

Expected: all reachable commits are rewritten, the target contact address is replaced in text blobs, and the press PDF path is absent from every rewritten commit.

- [ ] **Step 4: Restore only the clean PDF at the rewritten tip**

Run:

```powershell
$rewrittenPdf = Join-Path $rewriteClone 'assets\documents\communique-presse-leau-ou-le-chaos.pdf'
New-Item -ItemType Directory -Path (Split-Path $rewrittenPdf) -Force | Out-Null
Copy-Item -LiteralPath $cleanPdf -Destination $rewrittenPdf
git -C $rewriteClone add -- 'assets/documents/communique-presse-leau-ou-le-chaos.pdf'
git -C $rewriteClone commit -m 'fix(security): restore sanitized press release'
```

Expected: one new tip commit restores only the user-supplied clean PDF.

- [ ] **Step 5: Verify every rewritten commit and the clean tip**

Run:

```powershell
$targetContact = 'alaindusaule' + [char]64 + 'gmail.com'
$historyFailures = @()
foreach ($revision in (git -C $rewriteClone rev-list --all)) {
    git -C $rewriteClone grep -I -q -F $targetContact $revision --
    if ($LASTEXITCODE -eq 0) { $historyFailures += $revision }
    elseif ($LASTEXITCODE -ne 1) { throw "git grep failed for $revision" }
}
if ($historyFailures.Count -gt 0) { throw "Address remains in commits: $($historyFailures -join ', ')" }

$pdfCommits = @(git -C $rewriteClone log --format='%H' --all -- 'assets/documents/communique-presse-leau-ou-le-chaos.pdf')
if ($pdfCommits.Count -ne 1) { throw "Expected one PDF commit, found $($pdfCommits.Count)" }

$rewrittenPdfHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $rewrittenPdf).Hash
if ($rewrittenPdfHash -ne $cleanPdfHash) { throw 'Rewritten PDF differs from the user-supplied clean PDF' }

$rewrittenPdfText = (& pdftotext -layout $rewrittenPdf -) -join "`n"
if ($rewrittenPdfText -match '(?i)[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}') { throw 'Rewritten PDF exposes an email address' }

$publicFiles = @('404.html','index.html','mentions-legales.html','presse.html','livres/leau-ou-le-chaos.html','robots.txt','sitemap.xml')
foreach ($publicFile in $publicFiles) {
    $publicContent = Get-Content -LiteralPath (Join-Path $rewriteClone $publicFile) -Raw -Encoding UTF8
    if ($publicContent -match 'alaindusaule\.com') { throw "$publicFile still references .com" }
}

if ((Get-Content -LiteralPath (Join-Path $rewriteClone 'CNAME') -Raw).Trim() -ne 'alaindusaule.fr') { throw 'CNAME is incorrect' }
```

Expected: no reachable commit contains the contact address, exactly one commit references the PDF path, the PDF hash matches, all public files use `.fr`, and `CNAME` is correct.

- [ ] **Step 6: Run the application checks in the rewritten clone**

Run separately:

```powershell
& (Join-Path $rewriteClone 'tests\validate-site.ps1')
```

```powershell
node (Join-Path $rewriteClone 'tests\contact-script.test.js')
git -C $rewriteClone status --short --branch
git -C $rewriteClone log --oneline --decorate -5
```

Expected: five pages and contact behavior validated, with a clean rewritten working tree.

### Task 5: Publish the rewritten history safely

**Files:**
- No repository file changes; external GitHub `master` ref changes non-fast-forward.

- [ ] **Step 1: Reconfirm the remote lease immediately before pushing**

Run:

```powershell
$githubRepository = 'https://github.com/Goran-VRBANCIC/alaindusaule.com.git'
$currentRemoteHead = (git ls-remote $githubRepository refs/heads/master).Split("`t")[0]
if ($currentRemoteHead -ne $expectedRemoteHead) {
    throw "Remote master changed: expected $expectedRemoteHead, found $currentRemoteHead"
}
git -C $rewriteClone remote add origin $githubRepository
```

Expected: the remote hash still equals the hash recorded before the backup. Stop without pushing if it differs.

- [ ] **Step 2: Force-push only `master` with the pinned lease**

Run:

```powershell
git -C $rewriteClone push --force-with-lease="refs/heads/master:$expectedRemoteHead" origin master:master
```

Expected: GitHub accepts one forced update of `master`; no tags or other refs are created or deleted.

- [ ] **Step 3: Verify the rewritten remote before touching the primary clone**

Run:

```powershell
$rewrittenHead = (git -C $rewriteClone rev-parse HEAD).Trim()
$publishedHead = (git ls-remote $githubRepository refs/heads/master).Split("`t")[0]
if ($publishedHead -ne $rewrittenHead) { throw 'Published master does not match rewritten master' }
gh api "repos/Goran-VRBANCIC/alaindusaule.com/commits/$expectedRemoteHead" 2>$null
Write-Output "rewritten_head=$rewrittenHead"
Write-Output "old_commit_api_exit=$LASTEXITCODE"
```

Expected: the new hashes match. The old commit lookup should eventually fail; if GitHub still serves it, report that GitHub cache/support follow-up may be required rather than claiming complete erasure.

### Task 6: Realign the primary clone and verify deployment

**Files:**
- Primary clone Git metadata and working tree at `X:\DEVELOPPEMENT_WEB\alaindusaule.com`.

- [ ] **Step 1: Confirm the primary clone has no uncommitted work**

Run:

```powershell
git -C 'X:\DEVELOPPEMENT_WEB\alaindusaule.com' status --porcelain
```

Expected: no output. Stop if any change appears.

- [ ] **Step 2: Fetch and explicitly realign to the approved rewritten history**

Run:

```powershell
git -C 'X:\DEVELOPPEMENT_WEB\alaindusaule.com' fetch origin --prune
git -C 'X:\DEVELOPPEMENT_WEB\alaindusaule.com' reset --hard origin/master
git -C 'X:\DEVELOPPEMENT_WEB\alaindusaule.com' reflog expire --expire=now --all
git -C 'X:\DEVELOPPEMENT_WEB\alaindusaule.com' gc --prune=now
```

Expected: the primary clone now points to the rewritten remote head. This hard reset is authorized by the approved history-rewrite specification and is executed only after the clean-tree check and verified backup.

- [ ] **Step 3: Verify the primary clone and local history**

Run separately:

```powershell
& 'X:\DEVELOPPEMENT_WEB\alaindusaule.com\tests\validate-site.ps1'
```

```powershell
$targetContact = 'alaindusaule' + [char]64 + 'gmail.com'
$localRepository = 'X:\DEVELOPPEMENT_WEB\alaindusaule.com'
node (Join-Path $localRepository 'tests\contact-script.test.js')
$localHead = (git -C $localRepository rev-parse HEAD).Trim()
$remoteHead = (git -C $localRepository ls-remote origin refs/heads/master).Split("`t")[0]
if ($localHead -ne $remoteHead) { throw 'Primary clone and remote differ' }
foreach ($revision in (git -C $localRepository rev-list --all)) {
    git -C $localRepository grep -I -q -F $targetContact $revision --
    if ($LASTEXITCODE -eq 0) { throw "Address remains in local commit $revision" }
    elseif ($LASTEXITCODE -ne 1) { throw "git grep failed for $revision" }
}
git -C $localRepository status --short --branch
```

Expected: tests pass, local and remote heads match, no reachable commit contains the target address, and `master` tracks `origin/master` with a clean tree.

- [ ] **Step 4: Verify GitHub Pages and HTTPS**

Poll the latest Pages build until it reports the rewritten hash, then run:

```powershell
$pages = gh api 'repos/Goran-VRBANCIC/alaindusaule.com/pages' | ConvertFrom-Json
$build = gh api 'repos/Goran-VRBANCIC/alaindusaule.com/pages/builds/latest' | ConvertFrom-Json
$publicHtml = (curl.exe -sS --fail --max-time 20 'https://alaindusaule.fr/') -join "`n"
$headers = curl.exe -sS -I --max-time 20 'http://alaindusaule.fr/'
$publicPdf = 'C:\Users\Goran\AppData\Local\Temp\alaindusaule-public-press-release.pdf'
curl.exe -sS --fail --max-time 30 'https://alaindusaule.fr/assets/documents/communique-presse-leau-ou-le-chaos.pdf' -o $publicPdf
$publicPdfHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $publicPdf).Hash
$publicPdfText = (& pdftotext -layout $publicPdf -) -join "`n"

if (-not $pages.https_enforced) { throw 'GitHub Pages does not enforce HTTPS' }
if ($build.status -ne 'built' -or $build.commit -ne $remoteHead) { throw 'GitHub Pages has not built the rewritten head' }
if ($publicHtml -match 'alaindusaule\.com' -or $publicHtml -notmatch 'https://alaindusaule\.fr') { throw 'Public canonical origin is incorrect' }
if (($headers -join "`n") -notmatch '^HTTP/\S+ 30[18]' -or ($headers -join "`n") -notmatch '(?im)^location:\s*https://alaindusaule\.fr') { throw 'HTTP does not redirect to HTTPS' }
if ($publicPdfHash -ne $cleanPdfHash) { throw 'Public PDF differs from the sanitized PDF' }
if ($publicPdfText -match '(?i)[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}') { throw 'Public PDF exposes an email address' }
```

Expected: HTTPS enforced, HTTP redirect present, Pages built from the rewritten head, `.fr` public metadata, and the public PDF matches the sanitized hash with no email.

### Task 7: Update Obsidian and clean temporary rewrite files

**Files:**
- Modify outside repository: `O:\Obsidian_vault\claude-obsidian\wiki\projects\ecriture\grid-hydrique-national\livre\grid-hydrique-national.md`
- Modify outside repository: `O:\Obsidian_vault\claude-obsidian\wiki\log.md`
- Modify outside repository: `O:\Obsidian_vault\claude-obsidian\wiki\hot.md`
- Delete temporary directory only after verification: `C:\Users\Goran\AppData\Local\Temp\alaindusaule-history-sanitize-20260804`
- Delete temporary public PDF after verification: `C:\Users\Goran\AppData\Local\Temp\alaindusaule-public-press-release.pdf`

- [ ] **Step 1: Record the domain correction and rewritten head in Obsidian**

Update the existing site-author section and add a new top log entry stating:

- canonical domain corrected to `https://alaindusaule.fr`;
- sanitized press PDF published;
- reachable Git history rewritten to remove the contact address and prior PDF versions;
- old hashes are obsolete;
- backup bundle location and its sensitive/local-only status;
- new published head and passing verification results.

- [ ] **Step 2: Verify the Obsidian edits**

Run:

```powershell
git -C 'O:\Obsidian_vault\claude-obsidian' diff --check -- 'wiki/projects/ecriture/grid-hydrique-national/livre/grid-hydrique-national.md' 'wiki/log.md' 'wiki/hot.md'
```

Expected: exit code 0 with no whitespace errors.

- [ ] **Step 3: Remove only the verified temporary targets**

Resolve and compare the exact paths before deletion:

```powershell
$resolvedRewriteRoot = [IO.Path]::GetFullPath('C:\Users\Goran\AppData\Local\Temp\alaindusaule-history-sanitize-20260804')
$resolvedPublicPdf = [IO.Path]::GetFullPath('C:\Users\Goran\AppData\Local\Temp\alaindusaule-public-press-release.pdf')
if ($resolvedRewriteRoot -ne 'C:\Users\Goran\AppData\Local\Temp\alaindusaule-history-sanitize-20260804') { throw 'Unexpected rewrite cleanup path' }
if ($resolvedPublicPdf -ne 'C:\Users\Goran\AppData\Local\Temp\alaindusaule-public-press-release.pdf') { throw 'Unexpected public PDF cleanup path' }
Remove-Item -LiteralPath $resolvedRewriteRoot -Recurse
Remove-Item -LiteralPath $resolvedPublicPdf
```

Expected: only the disposable clone, virtual environment, and downloaded verification PDF are removed. The backup bundle is retained.
