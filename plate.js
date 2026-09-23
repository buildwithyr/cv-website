/* ============================================================
   Yannick Reiter — Durchgehende Eichenplatte + horizontaler Seitenwechsel
   - Eine lange Platte (plate-oak.webp, gespiegelt gekachelt) unter allen Seiten
   - Jede Seite sitzt an ihrer eigenen Stelle der Platte, mit eingefrästem Begriff
   - Klick auf einen Reiter: Seite wird im Hintergrund geladen, die Platte fährt
     horizontal zur Zielstelle, der Inhalt läuft aus bzw. ein
   - Die Seiten selbst bleiben normale HTML-Seiten (direkt aufrufbar, ohne JS nutzbar)
   ============================================================ */
(function () {
  'use strict';

  var stage = document.querySelector('.plate-stage');
  if (!stage) return;

  var PAGES = [
    { file: 'index.html',      word: 'YR',       weight: 700, size: 300, depth: 1.0 },
    { file: 'ueber-mich.html', word: 'PERSON',   weight: 500, size: 180, depth: 0.65 },
    { file: 'werdegang.html',  word: 'LAUFBAHN', weight: 600, size: 170, depth: 0.75, extra: 'dim' },
    { file: 'skills.html',     word: 'KNOW-HOW', weight: 500, size: 170, depth: 0.7, extra: 'marks' },
    { file: 'projekte.html',   word: 'PROJEKTE', weight: 700, size: 178, depth: 1.0 },
    { file: 'kontakt.html',    word: 'KONTAKT',  weight: 500, size: 180, depth: 0.6 }
  ];

  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mobileMQ = window.matchMedia('(max-width: 900px)');
  var SVGNS = 'http://www.w3.org/2000/svg';

  function pageIndex(url) {
    var name = new URL(url, location.href).pathname.split('/').pop() || 'index.html';
    for (var i = 0; i < PAGES.length; i++) if (PAGES[i].file === name) return i;
    return -1;
  }

  /* ---------- Aufbau der Bühne ---------- */
  var wood = document.createElement('div');
  wood.className = 'plate-wood';
  var move = document.createElement('div');
  move.className = 'plate-move';
  var light = document.createElement('div');
  light.className = 'plate-light';
  var shade = document.createElement('div');
  shade.className = 'plate-shade';
  move.appendChild(wood);
  stage.appendChild(move);
  stage.appendChild(light);
  stage.appendChild(shade);

  /* ---------- Eingefräste Begriffe (SVG-Filter auf dem Foto) ---------- */
  function el(name, attrs, parent) {
    var n = document.createElementNS(SVGNS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  // Licht kommt von links oben: Fase und Wand unten rechts hell, oben links Schatten.
  function engraveFilter(defs, id, depth) {
    var c = (2 + 1.6 * depth).toFixed(2);       // Fasenbreite
    var d = (4 + 10 * depth).toFixed(2);           // Schattenwurf in die Nut
    var w = (1.8 + 2.2 * depth).toFixed(2);       // beleuchtete Wand
    var f = el('filter', { id: id, x: '-5%', y: '-15%', width: '110%', height: '130%', 'color-interpolation-filters': 'sRGB' }, defs);
    var p = function (name, attrs) { return el(name, attrs, f); };
    p('feMorphology', { in: 'SourceAlpha', operator: 'dilate', radius: c, result: 'dil' });
    p('feComposite', { in: 'dil', in2: 'SourceAlpha', operator: 'out', result: 'ring' });
    p('feOffset', { in: 'SourceAlpha', dx: c, dy: c, result: 'sBR' });
    p('feOffset', { in: 'SourceAlpha', dx: -c, dy: -c, result: 'sTL' });
    p('feComposite', { in: 'ring', in2: 'sBR', operator: 'in', result: 'chLit' });
    p('feComposite', { in: 'ring', in2: 'sTL', operator: 'in', result: 'chDark' });
    // Nutgrund: etwas dunkler, das Holz bleibt sichtbar
    p('feFlood', { 'flood-color': '#3b2310', 'flood-opacity': (0.3 + 0.2 * depth).toFixed(2) });
    p('feComposite', { in2: 'SourceAlpha', operator: 'in', result: 'floor' });
    // Schlagschatten der oberen/linken Wand
    p('feOffset', { in: 'SourceAlpha', dx: d * 0.8, dy: d, result: 'sh' });
    p('feComposite', { in: 'SourceAlpha', in2: 'sh', operator: 'out', result: 'shBand' });
    p('feGaussianBlur', { in: 'shBand', stdDeviation: (d * 0.26).toFixed(2), result: 'shBlur' });
    p('feComposite', { in: 'shBlur', in2: 'SourceAlpha', operator: 'in', result: 'shIn' });
    p('feFlood', { 'flood-color': '#170b03', 'flood-opacity': '0.9' });
    p('feComposite', { in2: 'shIn', operator: 'in', result: 'shadow' });
    // beleuchtete Wand unten/rechts
    p('feOffset', { in: 'SourceAlpha', dx: -w, dy: -w, result: 'wl' });
    p('feComposite', { in: 'SourceAlpha', in2: 'wl', operator: 'out', result: 'wallBand' });
    p('feGaussianBlur', { in: 'wallBand', stdDeviation: '0.7', result: 'wallBlur' });
    p('feComposite', { in: 'wallBlur', in2: 'SourceAlpha', operator: 'in', result: 'wallIn' });
    p('feFlood', { 'flood-color': '#f8dcb0', 'flood-opacity': '0.55' });
    p('feComposite', { in2: 'wallIn', operator: 'in', result: 'wall' });
    // Fasen
    p('feFlood', { 'flood-color': '#fff2dc', 'flood-opacity': '0.75' });
    p('feComposite', { in2: 'chLit', operator: 'in', result: 'lit' });
    p('feFlood', { 'flood-color': '#24130a', 'flood-opacity': '0.7' });
    p('feComposite', { in2: 'chDark', operator: 'in', result: 'dark' });
    var m = p('feMerge', {});
    ['floor', 'shadow', 'wall', 'dark', 'lit'].forEach(function (r) { el('feMergeNode', { in: r }, m); });
  }

  var words = PAGES.map(function (page, i) {
    var box = document.createElement('div');
    box.className = 'plate-word plate-word--' + i;
    var svg = el('svg', { viewBox: '0 0 1000 400', preserveAspectRatio: 'xMidYMid meet', focusable: 'false' }, box);
    var defs = el('defs', {}, svg);
    engraveFilter(defs, 'engrave-' + i, page.depth);
    engraveFilter(defs, 'engrave-thin-' + i, 0.25);
    var text = el('text', {
      x: 500, y: 290, 'text-anchor': 'middle', filter: 'url(#engrave-' + i + ')',
      'font-family': 'Space Grotesk, sans-serif', 'font-weight': page.weight,
      'font-size': page.size, 'letter-spacing': page.word.length > 2 ? '0.04em' : '0.02em', fill: '#000'
    }, svg);
    text.textContent = page.word;

    // Laufbahn: dezente Bemaßungslinie unter dem Wort
    if (page.extra === 'dim') {
      var g = el('g', { filter: 'url(#engrave-thin-' + i + ')', fill: 'none', stroke: '#000', 'stroke-width': 4, 'stroke-linecap': 'square' }, svg);
      el('path', { d: 'M40 345 H960 M40 325 V365 M960 325 V365 M40 345 l22 -9 v18 z M960 345 l-22 -9 v18 z' }, g);
    }
    // Know-how: Koordinatenpunkte an den Ecken
    if (page.extra === 'marks') {
      var gm = el('g', { filter: 'url(#engrave-thin-' + i + ')', fill: 'none', stroke: '#000', 'stroke-width': 4 }, svg);
      [[30, 70], [970, 70], [30, 350], [970, 350]].forEach(function (pt) {
        el('circle', { cx: pt[0], cy: pt[1], r: 12 }, gm);
        el('path', { d: 'M' + (pt[0] - 22) + ' ' + pt[1] + ' h44 M' + pt[0] + ' ' + (pt[1] - 22) + ' v44' }, gm);
      });
    }
    move.appendChild(box);
    return { box: box, text: text, page: page };
  });

  // Nach dem Laden der Schrift: zu breite Begriffe einpassen.
  function fitWords() {
    words.forEach(function (w) {
      try {
        w.text.setAttribute('font-size', w.page.size);
        var len = w.text.getComputedTextLength();
        if (len > 940) w.text.setAttribute('font-size', (w.page.size * 940 / len).toFixed(1));
      } catch (e) { /* noch nicht gerendert */ }
    });
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitWords);

  /* ---------- Position der Platte ---------- */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  var current = pageIndex(location.href);
  if (current < 0) current = parseFloat(getComputedStyle(stage).getPropertyValue('--pos')) || 0;
  var pos = current;
  var W = stage.clientWidth;

  function apply(p, travel) {
    // Holz und Begriffe bewegen sich exakt gemeinsam (eine Platte).
    wood.style.backgroundPosition = (-p * W) + 'px 0';
    for (var i = 0; i < words.length; i++) {
      var off = (i - p) * W;
      var vis = Math.abs(i - p) < 1.05;
      words[i].box.style.visibility = vis ? 'visible' : 'hidden';
      if (vis) words[i].box.style.transform = 'translate3d(' + off + 'px,0,0)';
    }
    // während der Fahrt: Kamera minimal zurück, Licht mit leichter Trägheit
    var t = travel || 0;
    move.style.transform = t ? 'scale(' + (1 + 0.02 * Math.sin(Math.PI * t)).toFixed(4) + ')' : '';
    light.style.transform = t ? 'translate3d(' + (Math.sin(Math.PI * t) * 3).toFixed(2) + '%,0,0)' : '';
  }

  function syncHeight() {
    var hero = document.querySelector('main .hero');
    if (hero) {
      var r = hero.getBoundingClientRect();
      stage.style.height = Math.round(r.bottom + window.scrollY) + 'px';
    }
    W = stage.clientWidth;
    apply(pos, 0);
  }
  window.addEventListener('resize', syncHeight, { passive: true });
  syncHeight();
  stage.classList.add('is-ready');

  /* ---------- Seitenwechsel ohne Neuladen ---------- */
  if (!window.fetch || !window.DOMParser || !history.pushState) return;

  var cache = {};
  function load(url) {
    var key = new URL(url, location.href).pathname;
    if (!cache[key]) {
      cache[key] = fetch(url, { credentials: 'same-origin' }).then(function (res) {
        if (!res.ok) throw new Error(res.status);
        return res.text();
      }).then(function (html) {
        return new DOMParser().parseFromString(html, 'text/html');
      });
      cache[key].catch(function () { delete cache[key]; });
    }
    return cache[key];
  }

  function internalLink(a) {
    if (!a || a.target || a.hasAttribute('download')) return -1;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return -1;
    return pageIndex(url.href);
  }

  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  var busy = false, queued = null;

  function travel(from, to, dur) {
    return new Promise(function (resolve) {
      if (dur <= 0 || from === to) { pos = to; apply(pos, 0); resolve(); return; }
      var start = performance.now();
      function step(now) {
        var t = Math.min(1, (now - start) / dur);
        pos = from + (to - from) * ease(t);
        apply(pos, t < 1 ? t : 0);
        if (t < 1) requestAnimationFrame(step); else resolve();
      }
      requestAnimationFrame(step);
    });
  }

  function updateNav(url) {
    var name = new URL(url, location.href).pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.main-nav a').forEach(function (a) {
      var n = new URL(a.href, location.href).pathname.split('/').pop() || 'index.html';
      if (n === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  function navigate(url, push) {
    var target = pageIndex(url);
    if (target < 0) { location.href = url; return; }
    if (busy) { queued = { url: url, push: push }; return; }
    busy = true;
    document.documentElement.classList.add('is-traveling');

    var reduce = reduceMQ.matches;
    var steps = Math.abs(target - current);
    var dur = reduce ? 0 : (mobileMQ.matches ? 620 : Math.min(1000, 760 + 60 * (steps - 1)));
    var dir = target >= current ? 1 : -1;
    var oldMain = document.querySelector('main');
    var docPromise = load(url);

    if (push) history.pushState({ plate: target }, '', url);
    updateNav(url);

    // Aktueller Inhalt läuft weich aus.
    oldMain.style.setProperty('--dir', dir);
    oldMain.classList.add('is-leaving');
    var scrolled = window.scrollY > 4;
    var outDone = wait(reduce ? 0 : (scrolled ? 260 : 180)).then(function () {
      if (scrolled) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    });

    Promise.all([docPromise, outDone]).then(function (res) {
      var doc = res[0];
      var newMain = doc.querySelector('main');
      if (!newMain) throw new Error('main fehlt');
      var from = current;
      current = target;
      var ride = travel(from, target, dur);

      // Neuer Inhalt fährt ein, sobald die Platte die Hälfte geschafft hat.
      return wait(dur * 0.42).then(function () {
        newMain = document.importNode(newMain, true);
        newMain.style.setProperty('--dir', dir);
        newMain.classList.add('is-entering');
        oldMain.replaceWith(newMain);
        document.title = doc.title;
        var md = doc.querySelector('meta[name="description"]');
        var cur = document.querySelector('meta[name="description"]');
        if (md && cur) cur.setAttribute('content', md.getAttribute('content'));
        if (typeof window.initPage === 'function') window.initPage();
        syncHeight();
        // Layout einmal lesen, damit der Übergang sicher startet
        void newMain.offsetWidth;
        newMain.classList.remove('is-entering');
        return ride.then(function () {
          var h1 = newMain.querySelector('h1');
          if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
        });
      });
    }).catch(function () {
      location.href = url; // Fallback: normal laden
    }).then(function () {
      busy = false;
      document.documentElement.classList.remove('is-traveling');
      if (queued) { var q = queued; queued = null; navigate(q.url, q.push); }
    });
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest('a[href]');
    var idx = internalLink(a);
    if (idx < 0) return;
    var url = new URL(a.href, location.href);
    if (url.hash && url.pathname === location.pathname) return; // Anker auf derselben Seite
    e.preventDefault();
    if (idx === current && !busy) {
      window.scrollTo({ top: 0, behavior: reduceMQ.matches ? 'auto' : 'smooth' });
      return;
    }
    navigate(url.href, true);
  });

  // Zielseite vorladen, sobald der Zeiger in die Nähe kommt
  function prefetch(e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (internalLink(a) >= 0) load(a.href);
  }
  document.addEventListener('pointerover', prefetch, { passive: true });
  document.addEventListener('focusin', prefetch);
  document.addEventListener('touchstart', prefetch, { passive: true });

  history.replaceState({ plate: current }, '', location.href);
  window.addEventListener('popstate', function () {
    if (pageIndex(location.href) >= 0) navigate(location.href, false);
  });
})();
