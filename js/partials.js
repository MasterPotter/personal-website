/* ============================================================
   partials.js — single source of truth for the nav + footer.
   Markup lives here ONCE and is injected into every page.

   Every link is RELATIVE, resolved from a per-page root prefix
   declared as <html data-root=".."> (sub-folder pages) or "."
   (root pages). This works identically on:
     • file://            (no server — open index.html directly)
     • localhost          (python3 -m http.server)
     • project subpath    (masterpotter.github.io/personal-website/)
     • a custom domain root (zero code change later)
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement.getAttribute('data-root') || '.';

  // Are we on the homepage? If so, nav uses in-page #anchors (smooth
  // scroll); otherwise anchors point back to the homepage section.
  var file = (location.pathname.split('/').pop() || 'index.html');
  var onHome = (file === '' || file === 'index.html');

  function sectionHref(hash) {
    return onHome ? hash : (root + '/index.html' + hash);
  }

  // [hash, label] — the homepage is the hub; deep pages link from sections.
  var NAV = [
    ['#quantum',  'Quantum'],
    ['#work',     'Work'],
    ['#research', 'Research'],
    ['#about',    'About'],
    ['#contact',  'Contact']
  ];

  function navHTML() {
    var items = NAV.map(function (n) {
      return '<li><a href="' + sectionHref(n[0]) + '">' + n[1] + '</a></li>';
    }).join('');
    return '' +
      '<nav id="site-nav">' +
        '<a class="nav-logo" href="' + root + '/index.html">Zoeb <span>Izzi</span></a>' +
        '<ul class="nav-links" id="nav-links">' + items + '</ul>' +
        '<button class="nav-hamburger" id="nav-hamburger" aria-label="Toggle menu" aria-expanded="false">' +
          '<span></span><span></span><span></span>' +
        '</button>' +
      '</nav>';
  }

  function footerHTML() {
    var year = new Date().getFullYear();
    return '' +
      '<footer id="site-footer">' +
        '<div class="footer-left">' +
          '<div class="footer-name">Zoeb Izzi</div>' +
          '<div class="footer-copy">© ' + year + ' · Herndon, VA</div>' +
        '</div>' +
        '<div class="footer-links">' +
          '<a href="mailto:zoeb.m.izzi@gmail.com">Email</a>' +
          // TODO(zoeb): confirm exact LinkedIn URL
          '<a href="https://www.linkedin.com/in/zoeb-izzi" target="_blank" rel="noopener">LinkedIn</a>' +
          '<a href="https://github.com/MasterPotter" target="_blank" rel="noopener">GitHub</a>' +
        '</div>' +
      '</footer>';
  }

  function markActive(nav) {
    if (onHome) return; // homepage active-state handled by scroll, not here
    nav.querySelectorAll('.nav-links a').forEach(function (a) {
      // deep pages (about.html, research.html, ...) map to their section
      var href = a.getAttribute('href') || '';
      if (file && href.indexOf(file.replace('.html', '')) > -1 && file !== 'index.html') {
        a.classList.add('active');
      }
    });
  }

  function wireNav() {
    var nav = document.getElementById('site-nav');
    if (!nav) return;
    markActive(nav);

    var burger = document.getElementById('nav-hamburger');
    var links = document.getElementById('nav-links');
    if (burger && links) {
      burger.addEventListener('click', function () {
        var open = links.classList.toggle('open');
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      links.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () {
          links.classList.remove('open');
          burger.setAttribute('aria-expanded', 'false');
        });
      });
    }

    var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 16); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function inject() {
    var navC = document.getElementById('nav-container');
    var footC = document.getElementById('footer-container');
    if (navC) navC.innerHTML = navHTML();
    if (footC) footC.innerHTML = footerHTML();
    wireNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
