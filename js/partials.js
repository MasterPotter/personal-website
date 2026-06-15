/* ============================================================
   partials.js — single source of truth for the nav + footer.
   The banner is identical on every page and links to the real
   pages (not in-page anchors). Every link is RELATIVE, resolved
   from a per-page root prefix declared as <html data-root="..">
   (sub-folder pages) or "." (root pages) — so it works on
   file://, localhost, the Pages subpath, and a custom domain.
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement.getAttribute('data-root') || '.';
  var file = (location.pathname.split('/').pop() || 'index.html');

  // [path, label]
  var NAV = [
    ['pages/quantum.html',  'Quantum'],
    ['pages/projects.html', 'Projects'],
    ['pages/research.html', 'Research'],
    ['pages/about.html',    'About'],
    ['pages/contact.html',  'Contact']
  ];

  // pages that should light up the "Projects" tab
  var PROJECTISH = ['projects.html', 'in-progress.html', 'docket.html', 'o-seal.html', 'swype-ai.html', 'capitalbots.html'];

  function navHTML() {
    var items = NAV.map(function (n) {
      return '<li><a href="' + root + '/' + n[0] + '">' + n[1] + '</a></li>';
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
          '<a href="https://www.linkedin.com/in/zoeb-izzi-6457032bb/" target="_blank" rel="noopener">LinkedIn</a>' +
          '<a href="https://github.com/MasterPotter" target="_blank" rel="noopener">GitHub</a>' +
          '<a href="' + root + '/pages/play.html">Play</a>' +
        '</div>' +
      '</footer>';
  }

  function markActive(nav) {
    var isProject = PROJECTISH.indexOf(file) > -1;
    nav.querySelectorAll('.nav-links a').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      var leaf = href.split('/').pop();
      if (leaf === file || (isProject && leaf === 'projects.html')) a.classList.add('active');
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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();
})();
