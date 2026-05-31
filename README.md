# Zoeb Izzi — Personal Website

## Structure

```
zoeb-izzi-site/
├── index.html                   ← Homepage (hero + page nav grid)
├── css/
│   └── style.css                ← All global styles + CSS variables
├── js/
│   ├── site.js                  ← Shared nav/footer loader, reveal animations
│   └── game.js                  ← Geometry Dash-style background game
├── templates/
│   ├── nav.html                 ← Shared navigation (loaded by fetch)
│   └── footer.html              ← Shared footer (loaded by fetch)
├── pages/
│   ├── about.html
│   ├── events.html
│   ├── projects-progress.html
│   ├── projects-docket.html
│   ├── research.html
│   ├── awards.html
│   └── contact.html
└── project-pages/
    ├── project-alpha.html       ← Template for active projects
    ├── project-beta.html
    ├── docket-one.html          ← Template for planned projects
    └── docket-two.html
```

---

## How to Preview Locally

The nav and footer load via `fetch()`, which requires a local web server
(browsers block fetch on `file://` for security reasons).

**Option 1 — Python (easiest):**
```bash
cd zoeb-izzi-site
python3 -m http.server 8000
# Open http://localhost:8000
```

**Option 2 — Node:**
```bash
npx serve zoeb-izzi-site
```

**Option 3 — VS Code:**
Install the "Live Server" extension → right-click `index.html` → Open with Live Server.

---

## Deploying

This is a plain static site. Upload the whole folder to any of these:

- **GitHub Pages** — push to a repo, enable Pages in settings
- **Netlify** — drag the folder into netlify.com/drop
- **Vercel** — `vercel deploy` from the folder
- **Any shared host** — FTP the contents to `public_html/`

No build step. No dependencies. Just HTML, CSS, and JS.

---

## Admin: Common Tasks

### Add a new page
1. Copy any existing page in `/pages/` as a starting point.
2. Link to it from `index.html` (add a `.nav-tile`) and `templates/nav.html`.
3. Fill in the content.

### Add a new active project
1. Add a `.proj-card` block to `pages/projects-progress.html`.
2. Duplicate `project-pages/project-alpha.html`, rename it (e.g. `project-gamma.html`).
3. Update the "View Project →" link in the listing card to point to the new file.
4. Fill in the project details and write updates as blog posts.

### Write a project update (blog post)
1. Open the relevant file in `project-pages/`.
2. Copy the commented-out `<!-- POST TEMPLATE -->` block.
3. Paste it above the existing posts (newest first).
4. Fill in the title, date, and body content.
5. Delete the placeholder block if it's still there.

### Change color scheme
All colors are CSS variables in `css/style.css` under `:root { }`.
Change `--accent` to update the main color everywhere at once.

### Connect the contact form
Sign up at https://formspree.io, create a new form, then in `pages/contact.html`:
```html
<form id="contact-form" action="https://formspree.io/f/YOUR_ID" method="POST">
```
Remove the `e.preventDefault()` line in `js/site.js` once connected.

### Update nav or footer
Edit `templates/nav.html` or `templates/footer.html` — changes apply to every page.

---

## Background Game Controls

The Geometry Dash-style game runs in the background of every page.

| Action         | Controls               |
|----------------|------------------------|
| Jump (cube)    | Space / Click / Tap    |
| Hold (ship)    | Hold Space / Hold Click|
| Wave mode      | Hold to go up          |
| Respawn        | Click after death      |

Modes cycle automatically: **CUBE → SHIP → WAVE → BALL**, with occasional reversed sections.
The game is purely decorative — opacity is set low so it doesn't distract.
To adjust opacity: find `#game-canvas { opacity: 0.14; }` in `style.css`.
