# Zoeb Izzi — Personal Site

A clean, multi-page personal website with a Geometry Dash–style background game, built with plain HTML/CSS/JS (no frameworks, no build tools — just open the files).

---

## Folder Structure

```
zoeb-site/
├── index.html              ← Main page (About, Events, Projects preview, Research, Awards, Contact)
├── style.css               ← All styles (shared across every page)
├── game.js                 ← GD-style background game
├── README.md               ← This file
└── projects/
    ├── in-progress.html    ← Projects in Progress (with blog posts)
    └── on-docket.html      ← Projects on the Docket (with planning notes)
```

---

## How to Edit — Quick Reference

Every section you need to change is marked with `<!-- EDIT: ... -->` comments in the HTML.

### index.html

| Section | What to change |
|---|---|
| `<title>` & meta | Your name / tagline for browser tabs & search |
| Hero | Your tagline in `.hero-bio` |
| About | 3 paragraphs about yourself |
| Upcoming Events | `.event-item` blocks — date, name, description |
| Projects in Progress | Card title, description, tags, and link |
| Projects on the Docket | Same as above but for planned projects |
| Research | `.research-item` blocks — title, institution, year, description |
| Awards | `.award-item` blocks — emoji, award name, year, context |
| Contact | Your actual email and social links |
| Footer | Your email |

---

### Adding / Editing Projects

Each project lives on its own section of `projects/in-progress.html` or `projects/on-docket.html`.

**The project card on `index.html`** links to the project via an anchor, e.g.:
```html
<a href="projects/in-progress.html#project-alpha" class="project-link">Read more</a>
```

**The project section on `in-progress.html`** has a matching `id`, e.g.:
```html
<div id="project-alpha" ...>
```

To add a new project:
1. Add a card to `index.html` (copy an existing `.project-card` block)
2. On `in-progress.html`, copy an existing project `<div id="...">` block and paste it after the last `<hr>`
3. Match the `id` in both files

---

### Writing Blog Posts / Update Posts

Inside each project section on `in-progress.html` or `on-docket.html`, add posts like this:

```html
<div class="blog-post">
  <div class="blog-post-meta">
    <span class="blog-date">June 2026</span>
    <span class="blog-post-label">Update #2</span>
  </div>
  <h3>Your Post Title</h3>
  <p>Your post content here. Write as much as you want.</p>
</div>
```

**Put the newest post at the top** (above older ones).

When a project has no posts yet, use the empty state placeholder:
```html
<div class="blog-empty">
  <div class="empty-icon">✍️</div>
  <p>No updates yet — check back soon.</p>
</div>
```
Replace it with your first `blog-post` div when you're ready.

---

### Adding Multiple Paragraphs to a Blog Post

Wrap each paragraph in its own `<p>` tag:

```html
<div class="blog-post">
  ...
  <p>First paragraph here.</p>
  <p>Second paragraph here.</p>
  <p>Third paragraph here.</p>
</div>
```

---

## The Background Game

A Geometry Dash–style cube runner runs silently behind the site at ~18% opacity.

- **Jump**: Spacebar, Up Arrow, or click anywhere on the page
- **Toggle**: Use the "GAME: ON/OFF" button in the bottom-right corner
- **Score**: Shown in bottom-right; resets on death (auto-restarts after 2 seconds)
- Speed increases gradually as your score climbs

---

## Hosting

This is a static site — no server needed. Upload the entire `zoeb-site/` folder as-is to any of these:

| Platform | How |
|---|---|
| **GitHub Pages** | Push to a repo, enable Pages in Settings → Pages |
| **Netlify** | Drag-and-drop the folder at app.netlify.com |
| **Vercel** | `vercel deploy` from the folder, or drag-and-drop |
| **Cloudflare Pages** | Connect repo or upload via dashboard |

Make sure the folder root (where `index.html` lives) is set as the publish directory.

---

## Customizing Colors

All colors are CSS variables at the top of `style.css`. To swap the accent from indigo to something else:

```css
:root {
  --accent: #6366F1;        /* Main accent — change this */
  --accent-hover: #4F46E5;  /* Slightly darker version */
  --accent-soft: #EEF2FF;   /* Very light tint for backgrounds */
}
```

---

## Fonts

The site uses Google Fonts (loaded from CDN):
- **DM Serif Display** — headings
- **DM Sans** — body text
- **JetBrains Mono** — tags, labels, code elements

These load automatically when the site is online. For offline preview, they'll fall back to Georgia / system-ui / monospace.

---

Good luck with the site, Zoeb!
