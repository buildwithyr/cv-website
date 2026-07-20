/* ============================================================
   Yannick Reiter — Interaktion (Vanilla JS, keine Libraries)
   - Mobile-Navigation
   - Scroll-Reveal (IntersectionObserver)
   - Zähler-Animation der Kennzahlen
   - Foto-Karussell
   ============================================================ */

/* ---------- Mobile-Navigation ---------- */
document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');
  if (!toggle || !nav) return;

  function setOpen(isOpen) {
    nav.classList.toggle('open', isOpen);
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    toggle.setAttribute('aria-label', isOpen ? 'Menü schließen' : 'Menü öffnen');
  }
  toggle.addEventListener('click', function () { setOpen(!nav.classList.contains('open')); });
  nav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () { setOpen(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('open')) { setOpen(false); toggle.focus(); }
  });
});

/* ---------- Scroll-Reveal + Zähler ---------- */
document.addEventListener('DOMContentLoaded', function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var reveals = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));

  function animateCount(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    var target = parseFloat(el.getAttribute('data-count'));
    var suffix = el.getAttribute('data-suffix') || '';
    if (reduce) { el.textContent = target + suffix; return; }
    var dur = 1300, start = null;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function reveal(el) {
    var delay = parseFloat(el.getAttribute('data-delay') || '0');
    setTimeout(function () {
      el.classList.add('is-visible');
      var counter = el.matches('[data-count]') ? el : el.querySelector('[data-count]');
      if (counter) setTimeout(function () { animateCount(counter); }, 140);
    }, reduce ? 0 : delay);
  }

  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(reveal);
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) { reveal(entry.target); io.unobserve(entry.target); }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

  reveals.forEach(function (el) { io.observe(el); });

  // Sicherheits-Fallback: alles, was nach 2,5s noch verborgen ist, sichtbar machen
  // (falls der IntersectionObserver in einer Umgebung nicht auslöst).
  setTimeout(function () {
    reveals.forEach(function (el) {
      if (!el.classList.contains('is-visible')) { io.unobserve(el); reveal(el); }
    });
  }, 2500);
});

/* ---------- Foto-Karussell ---------- */
document.addEventListener('DOMContentLoaded', function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('.carousel').forEach(function (carousel) {
    var track = carousel.querySelector('.carousel-track');
    var prev = carousel.querySelector('.carousel-prev');
    var next = carousel.querySelector('.carousel-next');
    if (!track) return;

    function step() {
      var slide = track.querySelector('.carousel-slide');
      var gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
      return slide ? slide.getBoundingClientRect().width + gap : track.clientWidth * 0.8;
    }
    function scrollDir(dir) {
      track.scrollBy({ left: dir * step(), behavior: reduce ? 'auto' : 'smooth' });
    }
    if (prev) prev.addEventListener('click', function () { scrollDir(-1); });
    if (next) next.addEventListener('click', function () { scrollDir(1); });
  });
});

document.addEventListener('DOMContentLoaded', function () {
  var header = document.querySelector('.site-header');
  if (!header) return;
  var threshold = 24;
  function updateHeaderState() {
    header.classList.toggle('is-scrolled', window.scrollY > threshold);
  }
  updateHeaderState();
  window.addEventListener('scroll', updateHeaderState, { passive: true });
});
