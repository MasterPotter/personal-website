/* site.js — shared across every page */

(function () {

  /* ── Resolve root-relative paths for fetch() ── */
  function rootPath(rel) {
    const path = location.pathname;
    const depth = /\/(pages|project-pages)\//.test(path) ? 1 : 0;
    const prefix = depth === 0 ? '' : '../';
    return prefix + rel;
  }

  /* ── Inject nav ─────────────────────────────────────────── */
  function loadNav() {
    const container = document.getElementById('nav-container');
    if (!container) return Promise.resolve(); // Safe fallback

    return fetch(rootPath('templates/nav.html'))
      .then(r => r.text())
      .then(html => {
        container.innerHTML = html;
        initNav();
      })
      .catch(() => {
        container.innerHTML = buildFallbackNav();
        initNav();
      });
  }

  function buildFallbackNav() {
    const path = location.pathname;
    const depth = /\/(pages|project-pages)\//.test(path) ? 1 : 0;
    const prefix = depth === 0 ? '' : '../';
    return `<nav id="site-nav">
      <a class="nav-logo" href="${prefix}index.html">Zoeb <span>Izzi</span></a>
      <ul class="nav-links" id="nav-links">
        <li><a href="${prefix}pages/about.html">About</a></li>
        <li><a href="${prefix}pages/events.html">Events</a></li>
        <li><a href="${prefix}pages/projects-progress.html">In Progress</a></li>
        <li><a href="${prefix}pages/projects-docket.html">On the Docket</a></li>
        <li><a href="${prefix}pages/research.html">Research</a></li>
        <li><a href="${prefix}pages/awards.html">Awards</a></li>
        <li><a href="${prefix}pages/contact.html">Contact</a></li>
      </ul>
      <button class="nav-hamburger" id="nav-hamburger" aria-label="Toggle menu">
        <span></span><span></span><span></span>
      </button>
    </nav>`;
  }

  function initNav() {
    const path = location.pathname;
    const depth = /\/(pages|project-pages)\//.test(path) ? 1 : 0;
    const prefix = depth === 0 ? '' : '../';
    document.querySelectorAll('#site-nav a').forEach(a => {
      const href = a.getAttribute('href');
      if (href && href.startsWith('/')) {
        a.setAttribute('href', prefix + href.slice(1));
      }
    });

    const cur = location.pathname;
    document.querySelectorAll('#site-nav .nav-links a').forEach(a => {
      const href = a.getAttribute('href') || '';
      const hName = href.split('/').pop();
      const cName = cur.split('/').pop() || 'index.html';
      if (hName && cName && hName === cName) a.classList.add('active');
    });

    const burger = document.getElementById('nav-hamburger');
    const links  = document.getElementById('nav-links');
    if (burger && links) {
      burger.addEventListener('click', () => links.classList.toggle('open'));
      links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));
    }

    const nav = document.getElementById('site-nav');
    if (nav) {
      window.addEventListener('scroll', () => {
        nav.classList.toggle('scrolled', window.scrollY > 20);
      }, { passive: true });
    }
  }

  /* ── Inject footer ──────────────────────────────────────── */
  function loadFooter() {
    const container = document.getElementById('footer-container');
    if (!container) return Promise.resolve(); // Safe fallback

    return fetch(rootPath('templates/footer.html'))
      .then(r => r.text())
      .then(html => {
        container.innerHTML = html;
        container.querySelectorAll('.footer-year').forEach(el => el.textContent = new Date().getFullYear());
      });
  }

  /* ── Scroll reveal ──────────────────────────────────────── */
  function initReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
      }, { threshold: 0.1 });
      els.forEach((el, i) => { el.style.transitionDelay = `${i * 55}ms`; io.observe(el); });
    } else {
      els.forEach(el => el.classList.add('visible'));
    }
  }

  /* ── Contact form stub ──────────────────────────────────── */
  function initForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;
    form.addEventListener('submit', e => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const orig = btn.textContent;
      btn.textContent = 'Sent ✓';
      btn.disabled = true;
      btn.style.background = '#059669';
      setTimeout(() => { btn.textContent = orig; btn.disabled = false; btn.style.background = ''; form.reset(); }, 3000);
    });
  }

  /* ── Boot ───────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    initReveal();
    initForm();

    // 🚀 Wait for both navigation and footer fetching to finish rendering layout blocks
    Promise.all([loadNav(), loadFooter()]).then(() => {
      window.dispatchEvent(new Event('siteLayoutReady'));
    });
  });

})();