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

  document.documentElement.classList.add('reveal-ready');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) { reveal(entry.target); io.unobserve(entry.target); }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

  reveals.forEach(function (el) { io.observe(el); });

  // Tastaturnavigation darf nie in verborgenen Inhalten landen.
  document.addEventListener('focusin', function (event) {
    var el = event.target.closest('[data-reveal]');
    if (el) { io.unobserve(el); el.classList.add('is-visible'); }
  });
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

/* ---------- Kontaktformular ---------- */
document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('contact-form');
  if (!form) return;

  var status = form.querySelector('.form-status');
  var submitBtn = form.querySelector('.form-submit');
  var honeypot = form.querySelector('.form-honeypot');
  var consent = form.querySelector('#form-consent');

  if (consent && submitBtn) {
    consent.addEventListener('change', function () {
      submitBtn.disabled = !consent.checked;
    });
  }

  function setStatus(message, isError) {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('form-status-ok', !isError && !!message);
    status.classList.toggle('form-status-error', !!isError);
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    if (honeypot && honeypot.value) {
      form.reset();
      setStatus('Danke für deine Nachricht! Ich melde mich zeitnah zurück.', false);
      return;
    }

    var originalLabel = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Wird gesendet...';
    }
    setStatus('', false);

    fetch(form.action, {
      method: form.method,
      body: new FormData(form),
      headers: { 'Accept': 'application/json' }
    })
      .then(function (response) {
        if (response.ok) {
          form.reset();
          setStatus('Danke für deine Nachricht! Ich melde mich zeitnah zurück.', false);
        } else {
          setStatus('Da ist etwas schiefgelaufen. Bitte versuch es erneut.', true);
        }
      })
      .catch(function () {
        setStatus('Da ist etwas schiefgelaufen. Bitte versuch es erneut.', true);
      })
      .finally(function () {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalLabel;
        }
      });
  });
});

/* Das Profilfoto auf ueber-mich.html bleibt jetzt per nativem position:sticky
   (siehe style.css) neben dem Text stehen — kein JS mehr nötig. */


/* ---------- Scroll-Fortschritt, Bildbewegung und Werdegang ---------- */
document.addEventListener('DOMContentLoaded', function () {
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var desktop = window.matchMedia('(min-width: 901px)');
  var progress = document.createElement('div');
  progress.className = 'scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progress);
  var media = document.querySelector('.hero-media');
  var hero = document.querySelector('.hero');
  var timelines = Array.prototype.slice.call(document.querySelectorAll('.timeline'));
  var pending = false;
  function update() {
    pending = false;
    var height = document.documentElement.scrollHeight - window.innerHeight;
    var ratio = height > 0 ? Math.min(1, Math.max(0, window.scrollY / height)) : 0;
    progress.style.transform = 'scaleX(' + ratio + ')';
    if (media && hero) {
      var box = hero.getBoundingClientRect();
      media.style.transform = !motion.matches && desktop.matches && box.bottom > 0
        ? 'translateY(' + Math.min(24, Math.max(0, -box.top * 0.06)) + 'px) scale(1.06)'
        : 'none';
    }
    timelines.forEach(function (timeline) {
      var rect = timeline.getBoundingClientRect();
      var fill = Math.max(0, Math.min(1, (window.innerHeight * 0.65 - rect.top) / rect.height));
      timeline.style.setProperty('--timeline-progress', (motion.matches ? 100 : fill * 100) + '%');
    });
  }
  function schedule() {
    if (!pending) { pending = true; requestAnimationFrame(update); }
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  motion.addEventListener('change', schedule);
  desktop.addEventListener('change', schedule);
  update();
});

/* ---------- Eigene Fotos groß ansehen ---------- */
document.addEventListener('DOMContentLoaded', function () {
  var buttons = Array.prototype.slice.call(document.querySelectorAll('.photo-open'));
  if (!buttons.length) return;
  if (!('HTMLDialogElement' in window)) {
    buttons.forEach(function (button) {
      button.addEventListener('click', function () { window.open(button.querySelector('img').src, '_blank', 'noopener'); });
    });
    return;
  }
  var dialog = document.createElement('dialog');
  dialog.className = 'photo-dialog';
  dialog.setAttribute('aria-label', 'Eigene Aufnahmen');
  dialog.innerHTML = '<img alt=""><div class="photo-dialog-bar"><p class="photo-dialog-caption" aria-live="polite"></p><div class="photo-dialog-controls"><button type="button" data-photo-prev aria-label="Vorheriges Foto">←</button><button type="button" data-photo-next aria-label="Nächstes Foto">→</button><button type="button" data-photo-close>Schließen</button></div></div>';
  document.body.appendChild(dialog);
  var image = dialog.querySelector('img');
  var caption = dialog.querySelector('.photo-dialog-caption');
  var current = 0;
  var previousOverflow = '';
  function show(index) {
    current = (index + buttons.length) % buttons.length;
    var source = buttons[current].querySelector('img');
    image.src = source.currentSrc || source.src;
    image.alt = source.alt;
    caption.textContent = (current + 1) + ' / ' + buttons.length + ' · ' + source.alt;
  }
  buttons.forEach(function (button, index) {
    button.setAttribute('aria-label', button.querySelector('img').alt + ' – vergrößern');
    button.addEventListener('click', function () {
      show(index);
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      dialog.showModal();
    });
  });
  dialog.querySelector('[data-photo-prev]').addEventListener('click', function () { show(current - 1); });
  dialog.querySelector('[data-photo-next]').addEventListener('click', function () { show(current + 1); });
  dialog.querySelector('[data-photo-close]').addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('close', function () { document.body.style.overflow = previousOverflow; });
  dialog.addEventListener('click', function (event) { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowLeft') { event.preventDefault(); show(current - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); show(current + 1); }
  });
});
