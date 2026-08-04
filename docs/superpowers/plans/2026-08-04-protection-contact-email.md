# Contact Email Protection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the contact address and direct `mailto:` links from public source files while preserving one-click email contact through a small browser script.

**Architecture:** Generic navigation links route visitors to the home-page contact section. Direct contact actions are real buttons marked with `data-contact-button`; `assets/js/contact.js` reconstructs the destination only after interaction and preserves the press subject line. PowerShell source checks and a dependency-free Node behavior test prevent the plaintext address from returning.

**Tech Stack:** Static HTML5, CSS, vanilla JavaScript, PowerShell validation, Node.js built-in `assert` and `vm` modules.

---

## File map

- Create `assets/js/contact.js`: reconstruct the destination and handle contact-button clicks.
- Create `tests/contact-script.test.js`: execute the real browser script against a minimal fake DOM.
- Modify `tests/validate-site.ps1`: reject plaintext email addresses and HTML `mailto:` attributes, and require the protected contact controls.
- Modify `index.html` and `presse.html`: replace direct email anchors with protected buttons and load the script.
- Modify `404.html`, `mentions-legales.html`, `livres/leau-ou-le-chaos.html`, and the footers in the two pages above: route generic contact links to `index.html#contact` or the correct relative equivalent.
- Modify `assets/css/site.css`: normalize `<button>` typography and pointer behavior within the existing `.button` component.
- Modify the prior site design and implementation documents: describe the protected contact mechanism without reproducing the address.
- Modify the Obsidian Grid Hydrique project page, `wiki/log.md`, and `wiki/hot.md` after publication.

### Task 1: Add the regression tests

**Files:**
- Create: `tests/contact-script.test.js`
- Modify: `tests/validate-site.ps1`

- [ ] **Step 1: Add source-exposure assertions to the PowerShell validator**

After the page loop in `tests/validate-site.ps1`, enumerate tracked `.html`, `.js`, `.md`, and `.txt` files and reject complete email addresses. Add a separate HTML assertion for direct `mailto:` attributes:

```powershell
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
```

Replace the old press assertion requiring the public address with these protected-contact assertions:

```powershell
$contactScriptPath = Join-Path $projectRoot 'assets/js/contact.js'
Assert-True (Test-Path -LiteralPath $contactScriptPath) 'Le script de contact protégé est absent'
Assert-True ($index -match '<button[^>]+data-contact-button') 'Accueil : bouton de contact protégé absent'
Assert-True ($index -match '<script[^>]+src="assets/js/contact\.js"') 'Accueil : script de contact absent'
Assert-True (([regex]::Matches($press, 'data-contact-button')).Count -eq 2) 'Presse : deux boutons de contact protégés sont requis'
Assert-True ($press -match '<script[^>]+src="assets/js/contact\.js"') 'Presse : script de contact absent'
```

- [ ] **Step 2: Create the browser-script behavior test**

Create `tests/contact-script.test.js`:

```javascript
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(
  path.join(__dirname, "..", "assets", "js", "contact.js"),
  "utf8",
);
const handlers = [];
const buttons = [
  {
    dataset: {},
    addEventListener(type, handler) {
      assert.equal(type, "click");
      handlers.push(handler);
    },
  },
  {
    dataset: { contactSubject: "Demande presse — L’eau ou le chaos" },
    addEventListener(type, handler) {
      assert.equal(type, "click");
      handlers.push(handler);
    },
  },
];
const sandbox = {
  document: { querySelectorAll: () => buttons },
  window: { location: { href: "" } },
};

vm.runInNewContext(source, sandbox);
assert.equal(handlers.length, 2);

handlers[0]();
assert.match(sandbox.window.location.href, /^mailto:[^@]+@[^?]+$/);

handlers[1]();
assert.match(sandbox.window.location.href, /^mailto:[^@]+@[^?]+\?subject=Demande%20presse/);
assert.doesNotMatch(source, /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);

console.log("Contact script validation succeeded.");
```

- [ ] **Step 3: Run the tests and verify the red state**

Run:

```powershell
& .\tests\validate-site.ps1
node .\tests\contact-script.test.js
```

Expected: the PowerShell validator fails because the current HTML and documentation expose a complete address and direct `mailto:` links; the Node test fails because `assets/js/contact.js` does not exist.

### Task 2: Implement the protected contact action

**Files:**
- Create: `assets/js/contact.js`
- Modify: `index.html`
- Modify: `presse.html`
- Modify: `mentions-legales.html`
- Modify: `404.html`
- Modify: `livres/leau-ou-le-chaos.html`
- Modify: `assets/css/site.css`

- [ ] **Step 1: Create the shared click handler**

Create `assets/js/contact.js`:

```javascript
(() => {
  const reverse = (value) => [...value].reverse().join("");
  const separator = String.fromCharCode(64);
  const destination = [reverse("eluasudniala"), reverse("moc.liamg")].join(separator);

  document.querySelectorAll("[data-contact-button]").forEach((button) => {
    button.addEventListener("click", () => {
      const subject = button.dataset.contactSubject;
      const query = subject ? `?subject=${encodeURIComponent(subject)}` : "";
      window.location.href = `mailto:${destination}${query}`;
    });
  });
})();
```

- [ ] **Step 2: Replace the direct actions on the home and press pages**

In `index.html`, replace the direct anchor with:

```html
<button class="button button--light" type="button" data-contact-button>Écrire à Alain du Saule</button>
```

Change its footer Contact link to `href="#contact"`, and load the script before `</body>`:

```html
<script src="assets/js/contact.js" defer></script>
```

In `presse.html`, replace both direct email anchors with buttons using the existing visual variants:

```html
<button class="button button--secondary" type="button" data-contact-button data-contact-subject="Demande presse — L’eau ou le chaos">Proposer une interview</button>
```

```html
<button class="button button--light" type="button" data-contact-button data-contact-subject="Demande presse — L’eau ou le chaos">Écrire à Alain du Saule</button>
```

Change the press footer Contact link to `href="#contact"` and load the same script before `</body>`.

- [ ] **Step 3: Route generic Contact links without exposing the address**

Use these exact destinations:

```text
404.html                              index.html#contact
mentions-legales.html navigation     index.html#contact
mentions-legales.html body           index.html#contact
mentions-legales.html footer         index.html#contact
livres/leau-ou-le-chaos.html footer  ../index.html#contact
```

The legal body link text becomes `écrire à Alain du Saule`. Change the privacy paragraph from “Le lien de contact” to “Le bouton de contact” so it matches the new behavior.

- [ ] **Step 4: Normalize button rendering**

Add these declarations to the existing `.button` rule in `assets/css/site.css`:

```css
font-family: inherit;
cursor: pointer;
```

- [ ] **Step 5: Run the behavior test**

Run:

```powershell
node .\tests\contact-script.test.js
```

Expected: `Contact script validation succeeded.`

### Task 3: Remove plaintext exposure from active documentation

**Files:**
- Modify: `docs/superpowers/specs/2026-08-03-site-auteur-alain-du-saule-design.md`
- Modify: `docs/superpowers/plans/2026-08-03-site-auteur-alain-du-saule.md`

- [ ] **Step 1: Replace the address-specific design statements**

In the prior design, replace the explicit address requirement with `Contact via un bouton protégé qui ouvre le logiciel de messagerie.` Replace the no-backend sentence with `Le site ne contient aucun formulaire nécessitant un backend. Le contact utilise un bouton protégé qui reconstruit la destination uniquement lors de l’interaction.`

- [ ] **Step 2: Replace the address-specific implementation instruction**

In the prior implementation plan, replace the explicit `mailto:` instruction with `puis un bouton de contact protégé qui ouvre le logiciel de messagerie sans publier l’adresse dans le HTML.`

- [ ] **Step 3: Run the complete validation suite**

Run each command separately because the PowerShell validator terminates its process:

```powershell
& .\tests\validate-site.ps1
node .\tests\contact-script.test.js
```

Expected: `Validation réussie : 5 pages contrôlées.` and `Contact script validation succeeded.`

- [ ] **Step 4: Review and commit the implementation**

Run:

```powershell
git diff --check
git diff --stat
git add -- 404.html index.html mentions-legales.html presse.html livres/leau-ou-le-chaos.html assets/css/site.css assets/js/contact.js tests/validate-site.ps1 tests/contact-script.test.js docs/superpowers/specs/2026-08-03-site-auteur-alain-du-saule-design.md docs/superpowers/plans/2026-08-03-site-auteur-alain-du-saule.md
git diff --cached
git commit -m "fix(contact): hide email from page source"
```

Expected: one focused Conventional Commit containing only the protection, tests, and synchronized documentation.

### Task 4: Publish and record the deployment

**Files:**
- Modify outside this repository: `O:\Obsidian_vault\claude-obsidian\wiki\projects\ecriture\grid-hydrique-national\livre\grid-hydrique-national.md`
- Modify outside this repository: `O:\Obsidian_vault\claude-obsidian\wiki\log.md`
- Modify outside this repository: `O:\Obsidian_vault\claude-obsidian\wiki\hot.md`

- [ ] **Step 1: Push the site commit**

Run:

```powershell
git push origin master
```

Expected: the implementation commit and its two documentation commits are published to `origin/master` without a force push.

- [ ] **Step 2: Verify the remote and deployed source**

Run:

```powershell
git status --short --branch
git ls-remote origin refs/heads/master
curl.exe -sS https://alaindusaule.fr/ | Select-String -Pattern 'mailto:|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}' -CaseSensitive:$false
```

Expected: the local branch tracks `origin/master`, the remote hash matches `HEAD`, and the deployed home page contains no direct address or `mailto:`. If GitHub Pages is still deploying, poll based on the remote commit and HTTP content rather than changing DNS.

- [ ] **Step 3: Update the Obsidian project record**

Add a dated entry describing the anti-spam contact protection, the published commit, and the passing checks to the existing project page, the top of `wiki/log.md`, and the recent changes in `wiki/hot.md`. Preserve existing YAML and Obsidian wikilinks.

- [ ] **Step 4: Verify the Obsidian edits**

Run:

```powershell
git -C 'O:\Obsidian_vault\claude-obsidian' diff --check -- 'wiki/projects/ecriture/grid-hydrique-national/livre/grid-hydrique-national.md' 'wiki/log.md' 'wiki/hot.md'
```

Expected: exit code 0 with no whitespace errors.
