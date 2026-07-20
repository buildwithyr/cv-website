// Mobile-Navigation: Menü öffnen/schließen
document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');

  if (!toggle || !nav) return;

  function setOpen(isOpen) {
    nav.classList.toggle('open', isOpen);
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    toggle.setAttribute('aria-label', isOpen ? 'Menü schließen' : 'Menü öffnen');
  }

  toggle.addEventListener('click', function () {
    setOpen(!nav.classList.contains('open'));
  });

  // Menü schließen, wenn ein Link angeklickt wird
  nav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      setOpen(false);
    });
  });

  // Menü mit Escape schließen
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && nav.classList.contains('open')) {
      setOpen(false);
      toggle.focus();
    }
  });
});

// Foto-Karussell: Prev/Next scrollen den Track um ~eine Slide-Breite
document.addEventListener('DOMContentLoaded', function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

    function scrollByDir(dir) {
      track.scrollBy({ left: dir * step(), behavior: reduceMotion ? 'auto' : 'smooth' });
    }

    if (prev) prev.addEventListener('click', function () { scrollByDir(-1); });
    if (next) next.addEventListener('click', function () { scrollByDir(1); });
  });
});

// Telefonnummer-Reveal: Nummer wird erst beim Klick aus dem umgekehrten String gebaut
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.tel-link').forEach(function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();

      var reversed = link.getAttribute('data-tel-rev');
      if (!reversed) return;

      var number = reversed.split('').reverse().join('');
      var formatted = number.replace(/^(\+\d{2})(\d{3})(\d{7})$/, '$1 $2 $3');

      link.textContent = formatted;
      link.href = 'tel:' + number;
    });
  });
});

// Kontaktformular: Absenden per fetch, Honeypot-Check, Status-Meldung
document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('contact-form');
  if (!form) return;

  var status = form.querySelector('.form-status');
  var submitBtn = form.querySelector('.form-submit');
  var honeypot = form.querySelector('.form-honeypot');

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
