# Zoeb Izzi — Personal Website

An editorial personal site with a quantum twist: a living **optical-tweezer / atom-array**
motif that doubles as an easter-egg game. Plain HTML/CSS/JS — no framework, no build step.

## Structure

```
personal-website/
├── index.html                ← Single-scroll homepage (hero → quantum → work → research → range → about → contact)
├── .nojekyll                 ← Tells GitHub Pages to serve files as-is
├── assets/                   ← Images (drop a headshot here as assets/zoeb.jpg)
├── css/
│   └── style.css             ← All styles + design tokens (:root variables)
├── js/
│   ├── partials.js           ← Injects the shared nav + footer (single source of truth)
│   ├── site.js               ← Scroll-reveal animations
│   └── atom-array.js         ← The quantum motif + "defect-free assembly" game
├── pages/
│   ├── quantum.html          ← Headline deep-dive (optical quantum computing)
│   ├── about.html            ← Full bio + education
│   ├── research.html         ← Publications + collaborations
│   ├── awards.html           ← Awards & recognition
│   └── contact.html          ← Contact links
└── project-pages/
    ├── o-seal.html
    ├── swype-ai.html
    ├── caelus.html
    └── capitalbots.html
```

Fonts (Fraunces / Inter / JetBrains Mono) load via a `<link>` in each page's `<head>`.

---

## How to preview locally

Unlike the old version, nav/footer no longer use `fetch()`, so **you can just open
`index.html` directly** (`file://`). A server still gives the most accurate result:

```bash
cd personal-website
python3 -m http.server 8000   # then open http://localhost:8000
```

VS Code users: the "Live Server" extension works too.

---

## How paths work (important)

Every internal link is **relative**, resolved from a per-page prefix declared on the
`<html>` tag:

- Root pages (`index.html`): `data-root="."`
- Sub-folder pages (`pages/…`, `project-pages/…`): `data-root=".."`

`js/partials.js` reads that prefix to build the nav/footer links. This makes the site work
identically on `file://`, `localhost`, the GitHub Pages project subpath
(`/personal-website/`), **and** a future custom domain — with no code changes.

When you add a new page in a sub-folder, set `data-root=".."` and use `../css/…`,
`../js/…` for its asset links.

---

## Deploying (GitHub Pages)

Already configured: Settings → Pages → *Deploy from a branch* → `main` / `(root)`.
Just merge to `main` and it rebuilds. Live at:
`https://masterpotter.github.io/personal-website/`

**Custom domain later (no code change):** add a `CNAME` file at the repo root with your
domain, point DNS (`A` records to GitHub Pages, or a `CNAME` for `www`), then enable
"Enforce HTTPS" in Settings → Pages.

---

## Common tasks

**Change the color scheme / fonts** — everything is a CSS variable in `css/style.css`
under `:root { }`. `--accent` (indigo) drives the UI; `--quantum` (cyan) drives the glow.
Swap the `--font-display` / `--font-body` variables (and the `<head>` font `<link>`) to
change type.

**Add your photo** — drop `assets/zoeb.jpg` in, then in `index.html` and `pages/about.html`
replace the `.headshot-ph` placeholder with the commented-out `<img class="headshot" …>`.

**Edit nav or footer** — change `js/partials.js`; it applies to every page at once.
(The footer's LinkedIn URL is a placeholder — update it to your real profile.)

**Add a project** — copy any file in `project-pages/`, fill it in, and add a
`.work-item` row to the `#work` list in `index.html`.

---

## The atom array (quantum motif + game)

`js/atom-array.js` renders a lattice of glowing atoms held in trap wells on a full-page
background canvas.

- **Ambient (default):** atoms idle and twinkle; some wells sit empty ("defects").
  Pure background — it never blocks the page.
- **Play:** click **"▶ Assemble the atom array"** in the hero (or call
  `window.AtomArray.play()`). Drag reservoir atoms into the empty target wells before the
  array decoheres. `Esc` or **Exit** leaves the game.
- A small **Atom array** toggle (bottom-right) turns the motif off entirely; the choice is
  remembered. It also respects `prefers-reduced-motion` (renders a static frame) and pauses
  on hidden tabs.

Tunables (lattice spacing, brightness, difficulty) live at the top of `atom-array.js`.
