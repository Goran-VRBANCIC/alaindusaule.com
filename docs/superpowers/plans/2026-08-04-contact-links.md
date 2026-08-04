# Working Contact Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every contact link open the visitor's email application through the existing anti-spam reconstruction while retaining anchor navigation as a no-JavaScript fallback.

**Architecture:** Reuse the existing `data-contact-button` behavior for both buttons and anchors. Every page loads the shared contact script; anchors keep their current `href`, while the JavaScript click handler prevents the anchor navigation before assigning the reconstructed `mailto:` URL.

**Tech Stack:** Static HTML, browser JavaScript, Node.js assertions, PowerShell site validation, GitHub Pages.

---

### Task 1: Define the contact-link regression

**Files:**
- Modify: `tests/contact-script.test.js`
- Modify: `tests/validate-site.ps1`

- [ ] **Step 1: Extend the JavaScript test with a real link-shaped element**

Replace the current fixture declaration with three elements and record whether the link's default navigation is cancelled:

```js
let linkDefaultPrevented = false;

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
  {
    dataset: {},
    href: "#contact",
    addEventListener(type, handler) {
      assert.equal(type, "click");
      handlers.push(handler);
    },
  },
];
```

Replace the current handler invocations and assertions with:

```js
assert.equal(handlers.length, 3);

handlers[0]({ preventDefault() {} });
assert.match(sandbox.window.location.href, /^mailto:[^@]+@[^?]+$/);

handlers[1]({ preventDefault() {} });
assert.match(sandbox.window.location.href, /^mailto:[^@]+@[^?]+\?subject=Demande%20presse/);

handlers[2]({
  preventDefault() {
    linkDefaultPrevented = true;
  },
});
assert.equal(linkDefaultPrevented, true);
assert.match(sandbox.window.location.href, /^mailto:[^@]+@[^?]+$/);
assert.doesNotMatch(source, /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
```

- [ ] **Step 2: Require the contact script and hook on all pages**

Inside the existing page loop in `tests/validate-site.ps1`, add these assertions after loading `$html`:

```powershell
Assert-True ($html -match '<script[^>]+src="(?:\.\./)?assets/js/contact\.js"') "$page doit charger le script de contact"

$contactLinks = [regex]::Matches(
    $html,
    '<a\b[^>]*href="[^"]*#contact"[^>]*>',
    'IgnoreCase'
)
Assert-True ($contactLinks.Count -gt 0) "$page doit proposer un lien de contact"
foreach ($contactLink in $contactLinks) {
    Assert-True ($contactLink.Value -match '\bdata-contact-button\b') "$page contient un lien de contact sans déclencheur"
}
```

- [ ] **Step 3: Run the focused tests and observe the expected failures**

Run:

```powershell
node .\tests\contact-script.test.js
& .\tests\validate-site.ps1
```

Expected: the Node test fails because only two handlers are registered, and the PowerShell validation fails because current contact anchors lack `data-contact-button` and three pages do not load the script.

### Task 2: Connect every contact link

**Files:**
- Modify: `assets/js/contact.js`
- Modify: `index.html`
- Modify: `presse.html`
- Modify: `mentions-legales.html`
- Modify: `404.html`
- Modify: `livres/leau-ou-le-chaos.html`
- Test: `tests/contact-script.test.js`
- Test: `tests/validate-site.ps1`

- [ ] **Step 1: Prevent anchor navigation in the shared handler**

Change the click handler in `assets/js/contact.js` to receive the event and cancel its default action before building the destination:

```js
button.addEventListener("click", (event) => {
  event.preventDefault();
  const subject = button.dataset.contactSubject;
  const query = subject ? `?subject=${encodeURIComponent(subject)}` : "";
  window.location.href = `mailto:${destination}${query}`;
});
```

- [ ] **Step 2: Add the shared hook to all anchor-based contact actions**

For every anchor whose `href` ends in `#contact`, retain the existing `href` and add the boolean attribute:

```html
<a href="#contact" data-contact-button>Contact</a>
<a href="index.html#contact" data-contact-button>Contact</a>
<a href="../index.html#contact" data-contact-button>Contact</a>
```

Apply the same attribute to the editorial link in `mentions-legales.html`:

```html
<a href="index.html#contact" data-contact-button>écrire à Alain du Saule</a>
```

- [ ] **Step 3: Load the shared script on every page**

Keep the existing root-page includes and add the missing includes immediately before `</body>`:

```html
<script src="assets/js/contact.js" defer></script>
```

Use the nested relative path in `livres/leau-ou-le-chaos.html`:

```html
<script src="../assets/js/contact.js" defer></script>
```

- [ ] **Step 4: Run focused tests and verify green**

Run:

```powershell
node .\tests\contact-script.test.js
& .\tests\validate-site.ps1
```

Expected: `Contact script validation succeeded.` and `Validation réussie : 5 pages contrôlées.`

- [ ] **Step 5: Check JavaScript syntax and exposed addresses**

Run:

```powershell
node --check .\assets\js\contact.js
rg -n -i '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' --glob '*.html' --glob '*.js' .
```

Expected: syntax check exits `0`; the address search produces no matches.

- [ ] **Step 6: Commit the complete fix**

Stage only the implementation and regression files:

```powershell
git add -- assets/js/contact.js tests/contact-script.test.js tests/validate-site.ps1 index.html presse.html mentions-legales.html 404.html livres/leau-ou-le-chaos.html
git diff --cached --check
git diff --cached
git commit -m "fix(contact): activate all contact links"
```

Expected: one focused Conventional Commit containing the behavior and its tests.

### Task 3: Integrate and publish

**Files:**
- Modify after push: `O:\Obsidian_vault\claude-obsidian\wiki\projects\ecriture\grid-hydrique-national\livre\grid-hydrique-national.md`
- Modify after push: `O:\Obsidian_vault\claude-obsidian\wiki\log.md`
- Modify after push: `O:\Obsidian_vault\claude-obsidian\wiki\hot.md`

- [ ] **Step 1: Run the complete local verification**

Run:

```powershell
& .\tests\validate-site.ps1
node .\tests\contact-script.test.js
node --check .\assets\js\contact.js
git diff --check master...HEAD
```

Expected: all commands exit `0` and both test suites print their success messages.

- [ ] **Step 2: Integrate the approved feature branch into `master`**

From the primary worktree, fast-forward `master` to `fix/contact-links`, run the same tests on the integrated result, then remove the worktree and feature branch only after verification.

```powershell
git merge --ff-only fix/contact-links
& .\tests\validate-site.ps1
node .\tests\contact-script.test.js
git worktree remove 'C:\Users\Goran\.config\superpowers\worktrees\alaindusaule.com\fix-contact-links'
git branch -d fix/contact-links
```

Expected: fast-forward merge succeeds and the integrated tests pass.

- [ ] **Step 3: Push and wait for GitHub Pages**

Run:

```powershell
git push origin master
gh api repos/Goran-VRBANCIC/alaindusaule.com/pages/builds/latest
```

Poll the latest build until its status is `built` and its commit equals the new `master` SHA.

- [ ] **Step 4: Verify the published contact hooks**

Download each public page and assert that every link ending in `#contact` has `data-contact-button`, every page loads `contact.js`, HTTPS is enforced, and the deployed commit matches `master`.

- [ ] **Step 5: Update the Obsidian project tracking**

Using Obsidian-flavored Markdown, record the new commit, the root cause, the fix, and the public verification in the three scoped notes. Run:

```powershell
git -C 'O:\Obsidian_vault\claude-obsidian' diff --check -- 'wiki/hot.md' 'wiki/log.md' 'wiki/projects/ecriture/grid-hydrique-national/livre/grid-hydrique-national.md'
```

Expected: exit `0`; do not stage or alter unrelated vault changes.
