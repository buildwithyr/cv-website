/* ============================================================
   Yannick Reiter — Interaktiver Hero (WebGL, ohne Libraries)
   - Eichenplatte mit eingefrästem "YR" (Parallax-Occlusion + Selbstschatten)
   - Weiches Licht folgt langsam der Maus, Platte reagiert gegenläufig
   - Wenige Holzspäne in verschiedenen Tiefen (Tiefenunschärfe)
   - Idle-Bewegung, Scroll-Übergang, Gyro/Auto-Parallax auf Mobile
   - Pausiert außerhalb des Viewports und bei inaktivem Tab
   Fallback ohne WebGL: statisches Hero-Bild aus style.css.
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;
  var hero = document.querySelector('.hero');
  var canvas = hero && hero.querySelector('.hero-canvas');
  if (!canvas) return;

  function fail() {
    root.classList.remove('hero-3d');
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
  }

  var gl = null;
  try {
    gl = canvas.getContext('webgl', { antialias: true, alpha: false, depth: true, powerPreference: 'low-power' });
  } catch (e) { gl = null; }
  if (!gl || !gl.getExtension('OES_standard_derivatives')) { fail(); return; }

  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var coarse = window.matchMedia('(pointer: coarse)').matches;
  var lowEnd = coarse || Math.min(screen.width, screen.height) < 700 || (navigator.hardwareConcurrency || 8) <= 4;

  var Q = {
    dprCap: lowEnd ? 1.5 : 1.75,
    chips: lowEnd ? 10 : 22,
    steps: lowEnd ? 14 : 24,
    shadowSteps: lowEnd ? 6 : 10
  };

  /* ---------- Plattenmaße (lokale Einheiten, ~1 = 600 mm) ---------- */
  var PW = 2.0, PH = 1.2, PT = 0.075;

  /* ---------- Shader ---------- */
  var HEAD =
    '#extension GL_OES_standard_derivatives : enable\n' +
    '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';

  var NOISE = [
    'float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }',
    'float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }',
    'float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }',
    'const vec3 BG = vec3(0.153, 0.204, 0.227);', ''
  ].join('\n');

  var VS_QUAD = 'attribute vec2 aPos; void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }';

  // Hintergrund: Schiefer, weicher Lichtschein, sehr dezentes Punktraster, Schatten der Platte.
  var FS_BG = HEAD + NOISE + [
    'uniform vec2 uRes; uniform vec2 uLightPx; uniform vec4 uQa; uniform vec4 uQb;',
    'uniform float uBlur; uniform float uDim; uniform float uPx; uniform vec4 uGrid;',
    'float edge(vec2 p, vec2 a, vec2 b){ vec2 e = b - a; return dot(p - a, normalize(vec2(e.y, -e.x))); }',
    'void main(){',
    '  vec2 px = gl_FragCoord.xy;',
    '  float dl = length((px - uLightPx) / uRes.y);',
    '  vec3 col = BG + vec3(0.034, 0.038, 0.036) * exp(-dl * dl * 2.4);',
    '  vec2 uv = px / uRes;',
    '  col *= mix(0.8, 1.0, smoothstep(1.3, 0.3, length((uv - vec2(0.62, 0.55)) * vec2(1.15, 1.0))));',
    // Raster nur im Umfeld der Platte, nach außen ausblendend
    '  float g = 40.0 * uPx; vec2 gp = mod(px + g * 0.5, g) - g * 0.5;',
    '  float dotm = 1.0 - smoothstep(0.55 * uPx, 1.35 * uPx, length(gp));',
    '  float gm = 1.0 - smoothstep(0.0, uGrid.z, length((px - uGrid.xy) * vec2(1.0, 1.35)));',
    '  col += dotm * gm * 0.045 * uGrid.w;',
    // weicher Schatten der schwebenden Platte (konvexes Viereck)
    '  vec2 q0 = uQa.xy, q1 = uQa.zw, q2 = uQb.xy, q3 = uQb.zw;',
    '  float sd = max(max(edge(px, q0, q1), edge(px, q1, q2)), max(edge(px, q2, q3), edge(px, q3, q0)));',
    '  float sh = 1.0 - smoothstep(-uBlur * 0.7, uBlur, sd);',
    '  col *= 1.0 - 0.5 * sh;',
    '  col += (hash(floor(px)) - 0.5) / 255.0;', // Dither gegen Banding
    '  gl_FragColor = vec4(mix(col, BG * 0.55, uDim), 1.0);',
    '}'
  ].join('\n');

  var VS_PLATE = [
    'attribute vec3 aPos; attribute vec3 aNrm; uniform mat4 uMVP;',
    'varying vec3 vLocal; varying vec3 vNrm;',
    'void main(){ vLocal = aPos; vNrm = aNrm; gl_Position = uMVP * vec4(aPos, 1.0); }'
  ].join('\n');

  var FS_PLATE = HEAD + NOISE + [
    '#define STEPS ' + Q.steps,
    '#define SSTEPS ' + Q.shadowSteps,
    '#define DEPTH 0.05',   // Frästiefe
    '#define CH 0.015',      // Fase an der Oberkante (45°)
    '#define WALL 0.0045',   // steile Wand
    '#define STROKE 0.054',  // halbe Nutbreite (Fräserradius-Bahn)
    '#define BEV 0.016',     // gerundete Plattenkante
    'uniform vec3 uCam; uniform vec3 uLight; uniform vec3 uHalf; uniform float uLightInt; uniform float uDim;',
    'varying vec3 vLocal; varying vec3 vNrm;',

    'float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }',
    // "YR" als Werkzeugbahnen: jede Linie ist die Mittelbahn eines Schaftfräsers.
    'float glyphs(vec2 p){',
    '  vec2 y = p - vec2(-0.25, -0.31);',
    '  float d = sdSeg(y, vec2(-0.215, 0.62), vec2(0.0, 0.285));',
    '  d = min(d, sdSeg(y, vec2(0.215, 0.62), vec2(0.0, 0.285)));',
    '  d = min(d, sdSeg(y, vec2(0.0, 0.285), vec2(0.0, 0.0)));',
    '  vec2 r = p - vec2(0.155, -0.31);',
    '  const float R = 0.158; const float BX = 0.125;',
    '  d = min(d, sdSeg(r, vec2(0.0, 0.0), vec2(0.0, 0.62)));',
    '  d = min(d, sdSeg(r, vec2(0.0, 0.62), vec2(BX, 0.62)));',
    '  d = min(d, sdSeg(r, vec2(0.0, 0.62 - 2.0 * R), vec2(BX, 0.62 - 2.0 * R)));',
    '  vec2 rc = r - vec2(BX, 0.62 - R);',
    '  if (rc.x > 0.0) d = min(d, abs(length(rc) - R));',
    '  d = min(d, sdSeg(r, vec2(BX * 0.75, 0.62 - 2.0 * R), vec2(BX + R + 0.03, 0.0)));',
    '  return d - STROKE;',
    '}',
    'float hAt(vec2 p){',
    '  float e = -glyphs(p);',
    '  if (e <= 0.0) return 0.0;',
    '  float h = min(e, CH) + (DEPTH - CH) * smoothstep(CH, CH + WALL, e);',
    // konturparallele Bahnen am Nutgrund
    '  h += 0.0006 * smoothstep(CH + WALL, CH + WALL + 0.004, e) * (0.5 + 0.5 * cos(e * 540.0));',
    '  return -h;',
    '}',

    // Eiche (Fladerschnitt): Jahresringe, Frühholzporen, Faserstreifen
    'vec3 oak(vec2 p, float cut, out float bump){',
    '  float warp = fbm(p * vec2(0.35, 1.4)) * 0.16 + 0.04 * sin(p.x * 1.1 + 0.6);',
    '  float yy = p.y + warp - 0.22;',
    '  float zd = 0.3 + 0.16 * sin(p.x * 0.8 + 1.7) + 0.07 * p.x;',
    '  float rings = sqrt(yy * yy + zd * zd) * 26.0 + fbm(p * vec2(1.2, 9.0)) * 0.7;',
    '  float f = fract(rings);',
    '  float aa = clamp(1.0 - fwidth(rings) * 1.5, 0.0, 1.0);',
    '  float late = smoothstep(0.5, 0.8, f) * (1.0 - smoothstep(0.9, 1.0, f));',
    '  float fy = fwidth(p.y);',
    '  float aaP = clamp(1.0 - fy * 150.0, 0.0, 1.0);',
    '  float aaF = clamp(1.0 - fy * 240.0, 0.0, 1.0);',
    // ringporig: große Poren im Frühholz als kurze dunkle Striche in Faserrichtung
    '  float pn = noise(vec2(p.x * 5.5, p.y * 210.0 + rings * 3.0));',
    '  float pores = smoothstep(0.62, 0.84, pn) * (1.0 - smoothstep(0.05, 0.45, f)) * aaP;',
    '  float fib = (noise(vec2(p.x * 2.0, p.y * 330.0)) * 0.6 + noise(vec2(p.x * 5.0, p.y * 150.0)) * 0.4) * aaF;',
    '  float streak = noise(vec2(p.x * 0.7, p.y * 38.0));',
    '  float ray = smoothstep(0.84, 0.96, noise(vec2(p.x * 9.0, p.y * 110.0))) * aaP;',
    '  vec3 early = vec3(0.74, 0.59, 0.41);',
    '  vec3 lateC = vec3(0.52, 0.38, 0.24);',
    '  vec3 c = mix(early, lateC, mix(0.35, late, aa) * 0.85);',
    '  c *= 1.0 - pores * 0.42;',
    '  c *= 0.9 + 0.14 * fib;',
    '  c *= 0.92 + 0.16 * streak;',
    '  c = mix(c, c * 1.12 + 0.02, ray * 0.35);',
    '  c *= 0.9 + 0.2 * fbm(p * 0.9 + 4.0);',
    '  c = mix(c, c * vec3(1.08, 1.06, 1.02) + 0.035, cut);', // frische Schnittfläche: heller, matter
    '  bump = (fib - 0.5) * 0.7 - pores * 1.1 + late * 0.2;',
    '  return c;',
    '}',

    'float pocketShadow(vec3 P, vec3 L){',
    '  if (L.z <= 0.02) return 0.0;',
    '  float z0 = P.z - uHalf.z;',
    '  float tExit = -z0 / L.z;',
    '  float res = 1.0;',
    '  for (int i = 1; i <= SSTEPS; i++) {',
    '    float t = tExit * float(i) / float(SSTEPS);',
    '    vec3 S = P + L * t;',
    '    float dz = (S.z - uHalf.z) - hAt(S.xy);',
    '    res = min(res, clamp(dz / (0.05 * t + 0.0012), 0.0, 1.0));',
    '  }',
    '  return res * res * (3.0 - 2.0 * res);',
    '}',

    'vec3 shade(vec3 alb, vec3 N, vec3 P, vec3 V, float sh, float ao, float gloss){',
    '  vec3 L = uLight - P; float dist = length(L); L /= dist;',
    '  float att = uLightInt / (1.0 + 0.07 * dist * dist);',
    '  float ndl = max(dot(N, L), 0.0);',
    '  vec3 H = normalize(L - V);',
    '  float spec = pow(max(dot(N, H), 0.0), 34.0) * gloss;',
    '  vec3 a = pow(alb, vec3(2.2));',
    '  vec3 fill = a * 0.14 * max(dot(N, normalize(vec3(-0.5, 0.7, 0.6))), 0.0);',
    '  vec3 amb = a * (0.1 + 0.07 * N.z) * ao;',
    '  return amb + fill * ao + (a * vec3(1.0, 0.94, 0.86) * ndl + spec * vec3(1.0, 0.95, 0.88)) * att * sh * mix(0.5, 1.0, ao);',
    '}',

    'void main(){',
    '  vec3 N0 = normalize(vNrm);',
    '  vec3 P = vLocal;',
    '  vec3 V = normalize(P - uCam);',
    '  vec3 lin;',
    '  if (N0.z > 0.5) {',
    '    float d0 = glyphs(P.xy);',
    '    float vz = max(-V.z, 0.08);',
    '    float reach = DEPTH * length(V.xy) / vz + 0.003;',
    '    vec3 Qp = P; float h = 0.0; vec3 N = vec3(0.0, 0.0, 1.0);',
    '    if (d0 < reach) {',
    '      float dt = (DEPTH / float(STEPS)) / vz;',
    '      float t = 0.0, tp = 0.0;',
    '      for (int i = 0; i < STEPS + 3; i++) {',
    '        vec3 S = P + V * t;',
    '        if (S.z - uHalf.z <= hAt(S.xy) + 1e-5) break;',
    '        tp = t; t += dt;',
    '      }',
    '      if (t > 0.0) {',
    '        for (int j = 0; j < 5; j++) {',
    '          float m = 0.5 * (tp + t); vec3 S = P + V * m;',
    '          if (S.z - uHalf.z <= hAt(S.xy)) t = m; else tp = m;',
    '        }',
    '      }',
    '      Qp = P + V * t;',
    '      h = hAt(Qp.xy);',
    '      float e = 0.0011;',
    '      float hx = hAt(Qp.xy + vec2(e, 0.0)) - hAt(Qp.xy - vec2(e, 0.0));',
    '      float hy = hAt(Qp.xy + vec2(0.0, e)) - hAt(Qp.xy - vec2(0.0, e));',
    '      N = normalize(vec3(-hx, -hy, 2.0 * e));',
    '    }',
    '    float inP = step(0.0004, -h);',
    // gerundete Außenkante
    '    vec2 ed = uHalf.xy - abs(Qp.xy);',
    '    float em = min(ed.x, ed.y);',
    '    if (em < BEV) {',
    '      vec2 dir = ed.x < ed.y ? vec2(sign(Qp.x), 0.0) : vec2(0.0, sign(Qp.y));',
    '      float k = 1.0 - em / BEV;',
    '      N = normalize(N + vec3(dir * k * k * 2.2, 0.0));',
    '    }',
    '    float bump;',
    '    vec3 alb = oak(Qp.xy, inP, bump);',
    '    N = normalize(N + vec3(0.0, bump * 0.06, 0.0));',
    '    float sh = 1.0, ao = 1.0;',
    '    if (inP > 0.5) {',
    '      vec3 L = normalize(uLight - Qp);',
    '      sh = pocketShadow(Qp, L);',
    '      float wallDist = -glyphs(Qp.xy) - CH - WALL;',
    '      ao = mix(0.35, 1.0, smoothstep(-0.004, 0.03, wallDist)) * mix(1.0, 0.62, -h / DEPTH);',
    '    }',
    '    lin = shade(alb, N, Qp, V, sh, ao, mix(0.14, 0.05, inP));',
    '  } else {',
    // Kanten: Hirnholz an den Stirnseiten, Längsholz an den Seiten
    '    vec3 alb;',
    '    if (abs(N0.x) > 0.5) {',
    '      float r = length(vec2(P.y - 0.18 + 0.1 * fbm(P.yz * 3.0), P.z + 0.34 + 0.2 * sin(P.x * 0.85 + 1.7))) * 15.0;',
    '      alb = mix(vec3(0.62, 0.47, 0.31), vec3(0.45, 0.32, 0.2), smoothstep(0.5, 0.9, fract(r)));',
    '      alb *= 0.9 + 0.1 * noise(P.yz * 160.0);',
    '    } else {',
    '      float b; alb = oak(vec2(P.x, P.z * 4.0 + P.y), 0.0, b) * 0.82;',
    '    }',
    '    float ao = mix(0.55, 1.0, smoothstep(-uHalf.z, uHalf.z, P.z));',
    '    lin = shade(alb, N0, P, V, 1.0, ao, 0.05);',
    '  }',
    '  vec3 col = lin / (1.0 + lin * 0.12);',
    '  col = pow(col, vec3(1.0 / 2.2));',
    '  gl_FragColor = vec4(mix(col, BG * 0.55, uDim), 1.0);',
    '}'
  ].join('\n');

  var VS_CHIP = [
    'attribute vec2 aPos; uniform mat4 uView; uniform mat4 uProj;',
    'uniform vec3 uCenter; uniform vec2 uSize; uniform float uRot; uniform float uFlip;',
    'varying vec2 vUv;',
    'void main(){',
    '  vUv = aPos;',
    '  vec4 vp = uView * vec4(uCenter, 1.0);',
    '  vec2 o = aPos * uSize * vec2(uFlip, 1.0);',
    '  float c = cos(uRot), s = sin(uRot);',
    '  vp.xy += vec2(c * o.x - s * o.y, s * o.x + c * o.y);',
    '  gl_Position = uProj * vp;',
    '}'
  ].join('\n');

  var FS_CHIP = HEAD + NOISE + [
    'uniform float uSeed; uniform float uBlur; uniform float uLit; uniform float uDim; uniform float uType; uniform float uAlpha;',
    'varying vec2 vUv;',
    'void main(){',
    '  vec2 p = vUv;',
    '  float soft = fwidth(p.x) * 1.2 + uBlur * 0.32;',
    '  float a; vec3 col;',
    '  vec3 wood = mix(vec3(0.84, 0.72, 0.55), vec3(0.72, 0.57, 0.4), uSeed);',
    '  if (uType < 0.5) {',
    // gerollter Span: gebogenes, zu den Enden auslaufendes Band
    '    vec2 q = p - vec2(0.0, -0.42);',
    '    float r = length(q); float ang = atan(q.x, q.y);',
    '    float span = 1.6 + uSeed * 1.3;',
    '    float along = abs(ang) / (span * 0.5);',
    '    float w = 0.2 * (1.0 - 0.6 * smoothstep(0.3, 1.0, along));',
    '    float R = 0.68 - 0.1 * along * along;',
    '    float across = (r - R) / w;',
    '    float band = 1.0 - smoothstep(1.0 - soft / w, 1.0 + soft / w, abs(across));',
    '    float ends = 1.0 - smoothstep(1.0 - soft * 2.0, 1.0 + soft, along);',
    '    a = band * ends;',
    '    float cyl = sqrt(max(1.0 - across * across, 0.0));',
    '    float streak = noise(vec2(across * 6.0 + uSeed * 9.0, ang * 1.5));',
    '    col = wood * (0.5 + 0.55 * cyl * uLit) * (0.88 + 0.2 * streak);',
    '  } else {',
    // kleiner Frässpan / Flocke
    '    float n = noise(p * 2.6 + uSeed * 13.0);',
    '    float r = length(p * vec2(1.0, 1.7)) + (n - 0.5) * 0.4;',
    '    a = 1.0 - smoothstep(0.6 - soft, 0.6 + soft, r);',
    '    col = wood * (0.62 + 0.4 * uLit) * (0.85 + 0.25 * noise(vec2(p.x * 2.0, p.y * 12.0 + uSeed * 5.0)));',
    '  }',
    '  a *= uAlpha * (1.0 - uBlur * 0.4);',
    '  col = mix(col, BG * 0.55, uDim);',
    '  gl_FragColor = vec4(col * a, a);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(vs, fs, attribs) {
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    attribs.forEach(function (name, i) { gl.bindAttribLocation(p, i, name); });
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    var u = {};
    var n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) {
      var info = gl.getActiveUniform(p, i);
      u[info.name] = gl.getUniformLocation(p, info.name);
    }
    return { p: p, u: u };
  }

  var progBg, progPlate, progChip;
  try {
    progBg = program(VS_QUAD, FS_BG, ['aPos']);
    progPlate = program(VS_PLATE, FS_PLATE, ['aPos', 'aNrm']);
    progChip = program(VS_CHIP, FS_CHIP, ['aPos']);
  } catch (err) {
    if (window.console) console.warn('Hero-Szene deaktiviert:', err);
    fail();
    return;
  }

  /* ---------- Geometrie ---------- */
  var quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

  var boxBuf = gl.createBuffer();
  (function () {
    var x = PW / 2, y = PH / 2, z = PT / 2, v = [];
    function face(n, a, b, c, d) { [a, b, c, a, c, d].forEach(function (p) { v.push(p[0], p[1], p[2], n[0], n[1], n[2]); }); }
    face([0, 0, 1], [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]);
    face([1, 0, 0], [x, -y, -z], [x, y, -z], [x, y, z], [x, -y, z]);
    face([-1, 0, 0], [-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]);
    face([0, 1, 0], [-x, y, -z], [-x, y, z], [x, y, z], [x, y, -z]);
    face([0, -1, 0], [-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]);
    gl.bindBuffer(gl.ARRAY_BUFFER, boxBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STATIC_DRAW);
  })();

  /* ---------- Mathe ---------- */
  function perspective(fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
  }
  function lookAt(e, c) {
    var zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2];
    var zl = Math.hypot(zx, zy, zz); zx /= zl; zy /= zl; zz /= zl;
    var xx = zz, xy = 0, xz = -zx; // up = (0,1,0) × z
    var xl = Math.hypot(xx, xy, xz); xx /= xl; xz /= xl;
    var yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return [xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0,
      -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1];
  }
  function mul(a, b) {
    var o = new Array(16);
    for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  }
  // Modell = T * Ry * Rx * S
  function model(pos, rx, ry, s) {
    var cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry);
    return [cy * s, 0, -sy * s, 0,
      sy * sx * s, cx * s, cy * sx * s, 0,
      sy * cx * s, -sx * s, cy * cx * s, 0,
      pos[0], pos[1], pos[2], 1];
  }
  function toLocal(w, pos, rx, ry, s) {
    var x = w[0] - pos[0], y = w[1] - pos[1], z = w[2] - pos[2];
    var cy = Math.cos(-ry), sy = Math.sin(-ry);
    var x1 = cy * x + sy * z, z1 = -sy * x + cy * z;
    var cx = Math.cos(-rx), sx = Math.sin(-rx);
    var y2 = cx * y - sx * z1, z2 = sx * y + cx * z1;
    return [x1 / s, y2 / s, z2 / s];
  }
  function project(m, p) {
    var x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12];
    var y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
    var w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
    return [(x / w * 0.5 + 0.5) * W, (y / w * 0.5 + 0.5) * H]; // Pixel, y nach oben
  }
  function lerpTo(cur, target, rate, dt) { return cur + (target - cur) * (1 - Math.exp(-rate * dt)); }

  /* ---------- Zustand ---------- */
  var W = 1, H = 1, cssW = 1, cssH = 1, dpr = 1, renderScale = 1;
  var FOV = 30 * Math.PI / 180, CAM_Z = 4.2;
  var layout = { cx: 0.9, cy: 0, s: 0.8, mobile: false, gridPx: [0, 0, 1] };
  var pointer = { x: 0, y: 0, active: false, last: -1e9 };
  var gyro = { x: 0, y: 0, active: false, b0: null };
  var st = { mx: 0, my: 0, lx: 0.35, ly: 0.35, t: 0, scroll: 0 };
  var reduce = reduceMQ.matches;

  // reproduzierbarer Zufall für die Späne
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function range(a, b) { return a + (b - a) * rnd(); }
  var chips = [];
  for (var i = 0; i < Q.chips; i++) {
    // rund um die Platte verteilt, links oben (Textbereich) frei lassen
    var ang = range(-2.0, 1.55), rad = range(0.98, 1.4);
    var c = {
        nx: Math.cos(ang) * rad, ny: Math.sin(ang) * rad * 0.95, z: range(-0.6, 1.0),
        size: range(0.06, 0.11), type: rnd() < 0.6 ? 0 : 1, seed: rnd(),
        rot: range(0, 6.28), rs: range(-0.12, 0.12), fs: range(0.08, 0.25), ph: range(0, 6.28), amp: range(0.015, 0.05)
      };
    if (c.type === 1) c.size *= 0.6;
    chips.push(c);
  }
  chips.sort(function (a, b) { return a.z - b.z; });

  /* ---------- Layout aus dem DOM ---------- */
  var textEls = hero.querySelectorAll('h1, .hero-lede, .hero-actions .btn');
  function measureLayout() {
    var hr = hero.getBoundingClientRect();
    cssW = hr.width; cssH = hr.height;
    var aspect = cssW / cssH;
    var halfH = CAM_Z * Math.tan(FOV / 2), halfW = halfH * aspect;
    var wpp = (2 * halfH) / cssH; // Welt pro CSS-Pixel in Plattenebene
    var right = 0, bottom = 0;
    for (var i = 0; i < textEls.length; i++) {
      var r = textEls[i].getBoundingClientRect();
      right = Math.max(right, r.right - hr.left);
      bottom = Math.max(bottom, r.bottom - hr.top);
    }
    var region;
    layout.mobile = cssW < 900 || aspect < 1.15;
    if (!layout.mobile) {
      region = { l: Math.max(right + 24, cssW * 0.46), r: cssW - Math.max(24, cssW * 0.03), t: 96, b: cssH - 56 };
    } else {
      region = { l: 12, r: cssW - 12, t: bottom + 28, b: cssH - 48 };
    }
    var rw = Math.max(region.r - region.l, 120), rh = Math.max(region.b - region.t, 110);
    var cxPx = region.l + rw / 2, cyPx = region.t + rh / 2;
    layout.cx = (cxPx / cssW * 2 - 1) * halfW;
    layout.cy = (1 - cyPx / cssH * 2) * halfH;
    layout.s = Math.min(rw * wpp * 0.9 / PW, rh * wpp * 0.86 / PH);
    layout.gridPx = [cxPx, cssH - cyPx, Math.max(rw, rh) * 0.75];
  }

  function resize() {
    measureLayout();
    dpr = Math.min(window.devicePixelRatio || 1, Q.dprCap) * renderScale;
    var w = Math.max(1, Math.round(cssW * dpr)), h = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    W = w; H = h;
    gl.viewport(0, 0, W, H);
    kick();
  }

  /* ---------- Eingaben ---------- */
  window.addEventListener('pointermove', function (e) {
    var k = e.pointerType === 'touch' ? 0.5 : 1;
    pointer.x = Math.max(-1, Math.min(1, (e.clientX / window.innerWidth) * 2 - 1)) * k;
    pointer.y = Math.max(-1, Math.min(1, -((e.clientY / window.innerHeight) * 2 - 1))) * k;
    pointer.active = true;
    pointer.last = performance.now();
    kick();
  }, { passive: true });
  document.addEventListener('pointerleave', function () { pointer.active = false; kick(); });

  // Gyro nur, wo es ohne Berechtigungsdialog verfügbar ist (kein Pop-up auf iOS).
  if (coarse && typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission !== 'function') {
    window.addEventListener('deviceorientation', function (e) {
      if (e.gamma == null || e.beta == null) return;
      if (gyro.b0 === null) gyro.b0 = e.beta;
      gyro.x = Math.max(-1, Math.min(1, e.gamma / 22));
      gyro.y = Math.max(-1, Math.min(1, (gyro.b0 - e.beta) / 22));
      gyro.active = true;
      kick();
    }, { passive: true });
  }

  function scrollProgress() {
    var r = hero.getBoundingClientRect();
    return Math.max(0, Math.min(1, -r.top / Math.max(1, r.height)));
  }
  window.addEventListener('scroll', function () { kick(); }, { passive: true });

  /* ---------- Koordinatenanzeige (DRO) ---------- */
  var dro = hero.querySelector('.hero-dro');
  var droX = dro && dro.querySelector('[data-axis="x"]');
  var droY = dro && dro.querySelector('[data-axis="y"]');
  var droLast = 0;

  /* ---------- Update + Zeichnen ---------- */
  var lastLightLocal = [0, 0, 1];

  function targets(now) {
    var t = st.t;
    var idleAmp = reduce ? 0 : (layout.mobile ? 0.75 : 0.35);
    var ix = Math.sin(t * 0.21) * 0.6 + Math.sin(t * 0.13 + 1.3) * 0.4;
    var iy = Math.sin(t * 0.17 + 0.7) * 0.5 + Math.sin(t * 0.11 + 2.1) * 0.3;
    var recent = pointer.active && now - pointer.last < 4000;
    var tx, ty;
    if (gyro.active && !recent) { tx = gyro.x; ty = gyro.y; idleAmp *= 0.3; }
    else if (recent || (pointer.active && !coarse)) { tx = pointer.x; ty = pointer.y; idleAmp *= 0.25; }
    else { tx = 0; ty = 0; }
    return [tx + ix * idleAmp, ty + iy * idleAmp];
  }

  function frameState(dt, now) {
    if (!reduce) st.t += dt;
    var tg = targets(now);
    st.mx = lerpTo(st.mx, tg[0], 2.2, dt);
    st.my = lerpTo(st.my, tg[1], 2.2, dt);
    st.lx = lerpTo(st.lx, tg[0], 1.3, dt); // Licht folgt langsamer
    st.ly = lerpTo(st.ly, tg[1], 1.3, dt);
    st.scroll = scrollProgress();
    return Math.abs(st.mx - tg[0]) + Math.abs(st.my - tg[1]) + Math.abs(st.lx - tg[0]) + Math.abs(st.ly - tg[1]) > 0.002;
  }

  function draw() {
    var par = reduce ? 0.25 : 1;
    var s = st.scroll, sm = reduce ? 0 : s;
    var aspect = W / H;
    var mx = st.mx * par, my = st.my * par;

    // Kamera: minimaler Versatz Richtung Maus, beim Scrollen etwas näher
    var camZ = CAM_Z * (1 - 0.12 * sm);
    var eye = [layout.cx * 0.15 + mx * 0.22, my * 0.14 + 0.05, camZ];
    var center = [layout.cx * 0.15 + mx * 0.05, my * 0.03, 0];
    var view = lookAt(eye, center);
    var proj = perspective(FOV, aspect, 0.1, 20);
    var vp = mul(proj, view);

    // Platte: Grundneigung + gegenläufige Reaktion auf die Maus
    var baseRX = layout.mobile ? -0.3 : -0.14, baseRY = layout.mobile ? 0 : -0.2;
    var rx = baseRX + my * 0.07 - sm * 0.18;
    var ry = baseRY - mx * 0.1;
    var pos = [layout.cx - mx * 0.03, layout.cy - my * 0.02 - sm * layout.s * 0.35, 0];
    var sc = layout.s;
    var M = model(pos, rx, ry, sc);
    var mvp = mul(vp, M);

    // Licht: weich vor der Platte, folgt der (geglätteten) Mausposition
    var lw = [pos[0] + st.lx * 1.6 * sc - 0.35 * sc, pos[1] + st.ly * 1.1 * sc + 0.75 * sc, 1.05 * sc];
    var lightLocal = toLocal(lw, pos, rx, ry, sc);
    var camLocal = toLocal(eye, pos, rx, ry, sc);
    lastLightLocal = lightLocal;
    var dim = Math.min(0.85, s * 1.1);

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);

    // --- Hintergrund ---
    var z = PT / 2, hx = PW / 2, hy = PH / 2;
    var corners = [[-hx, -hy, z], [hx, -hy, z], [hx, hy, z], [-hx, hy, z]].map(function (p) { return project(mvp, p); });
    var lpx = project(vp, lw);
    var ccx = (corners[0][0] + corners[2][0]) / 2, ccy = (corners[0][1] + corners[2][1]) / 2;
    var dx = ccx - lpx[0], dy = ccy - lpx[1], dl = Math.hypot(dx, dy) || 1;
    var off = 0.035 * H;
    var shadow = corners.map(function (p) { return [p[0] + dx / dl * off, p[1] + dy / dl * off - 0.025 * H]; });
    // Wicklung prüfen (gegen den Uhrzeigersinn => Außen positiv)
    var area = 0;
    for (var k = 0; k < 4; k++) { var a = shadow[k], b = shadow[(k + 1) % 4]; area += a[0] * b[1] - b[0] * a[1]; }
    if (area < 0) shadow.reverse();

    gl.useProgram(progBg.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.enableVertexAttribArray(0);
    gl.disableVertexAttribArray(1);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(progBg.u.uRes, W, H);
    gl.uniform2f(progBg.u.uLightPx, lpx[0], lpx[1]);
    gl.uniform4f(progBg.u.uQa, shadow[0][0], shadow[0][1], shadow[1][0], shadow[1][1]);
    gl.uniform4f(progBg.u.uQb, shadow[2][0], shadow[2][1], shadow[3][0], shadow[3][1]);
    gl.uniform1f(progBg.u.uBlur, 0.06 * H);
    gl.uniform1f(progBg.u.uDim, dim);
    gl.uniform1f(progBg.u.uPx, dpr);
    gl.uniform4f(progBg.u.uGrid, layout.gridPx[0] * dpr, layout.gridPx[1] * dpr, layout.gridPx[2] * dpr, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // --- Platte ---
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.CULL_FACE);
    gl.useProgram(progPlate.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, boxBuf);
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
    gl.uniformMatrix4fv(progPlate.u.uMVP, false, new Float32Array(mvp));
    gl.uniform3f(progPlate.u.uCam, camLocal[0], camLocal[1], camLocal[2]);
    gl.uniform3f(progPlate.u.uLight, lightLocal[0], lightLocal[1], lightLocal[2]);
    gl.uniform3f(progPlate.u.uHalf, hx, hy, z);
    gl.uniform1f(progPlate.u.uLightInt, 2.3);
    gl.uniform1f(progPlate.u.uDim, dim);
    gl.drawArrays(gl.TRIANGLES, 0, 30);
    gl.disable(gl.CULL_FACE);
    gl.disableVertexAttribArray(1);

    // --- Späne ---
    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(progChip.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.uniformMatrix4fv(progChip.u.uView, false, new Float32Array(view));
    gl.uniformMatrix4fv(progChip.u.uProj, false, new Float32Array(proj));
    gl.uniform1f(progChip.u.uDim, dim);
    var t = st.t;
    var ldx = st.lx, ldy = st.ly;
    for (var i = 0; i < chips.length; i++) {
      var c = chips[i];
      if (layout.mobile && c.ny > 0.85) continue; // nicht in den Text ragen
      var drift = reduce ? 0 : 1;
      var cxw = pos[0] + c.nx * hx * sc * 1.15 + Math.sin(t * 0.23 + c.ph) * c.amp * drift;
      var cyw = pos[1] + c.ny * hy * sc * 1.2 + Math.sin(t * 0.17 + c.ph * 1.7) * c.amp * 1.4 * drift;
      var czw = c.z * sc;
      var rot = c.rot + t * c.rs * drift;
      var flip = Math.cos(t * c.fs * drift + c.ph);
      flip = (flip < 0 ? -1 : 1) * Math.max(0.3, Math.abs(flip));
      var blur = Math.min(1, Math.pow(Math.abs(c.z) / 1.3, 1.6));
      var lit = Math.max(0.15, Math.min(1, 0.55 + 0.35 * (Math.cos(rot) * ldx + Math.sin(rot) * ldy) * Math.sign(flip)));
      if (flip < 0) lit *= 0.75;
      gl.uniform3f(progChip.u.uCenter, cxw, cyw, czw);
      gl.uniform2f(progChip.u.uSize, c.size * sc * 1.6, c.size * sc * (c.type ? 1.1 : 1.6));
      gl.uniform1f(progChip.u.uRot, rot);
      gl.uniform1f(progChip.u.uFlip, flip);
      gl.uniform1f(progChip.u.uSeed, c.seed);
      gl.uniform1f(progChip.u.uBlur, blur);
      gl.uniform1f(progChip.u.uLit, lit);
      gl.uniform1f(progChip.u.uType, c.type);
      gl.uniform1f(progChip.u.uAlpha, c.z < -0.3 ? 0.7 : 1);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  function updateDro(now) {
    if (!droX || now - droLast < 120) return;
    droLast = now;
    var l = lastLightLocal;
    droX.textContent = (Math.max(0, Math.min(1, l[0] / PW + 0.5)) * 1200).toFixed(2);
    droY.textContent = (Math.max(0, Math.min(1, l[1] / PH + 0.5)) * 720).toFixed(2);
  }

  /* ---------- Loop ---------- */
  var rafId = 0, last = 0, inView = true, ready = false;
  var perf = { n: 0, sum: 0, checks: 0 };

  function frame(now) {
    rafId = 0;
    var dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    var moving = frameState(dt, now);
    draw();
    updateDro(now);
    if (!ready) { ready = true; canvas.classList.add('is-ready'); }

    // adaptive Qualität: bei dauerhaft langsamen Frames Auflösung senken
    if (!reduce && perf.checks < 3) {
      perf.n++;
      if (perf.n > 20) perf.sum += dt;
      if (perf.n === 110) {
        if (perf.sum / 90 > 0.024 && renderScale > 0.55) { renderScale *= 0.78; resize(); }
        perf.n = 0; perf.sum = 0; perf.checks++;
      }
    }
    if (inView && !document.hidden && (!reduce || moving)) rafId = requestAnimationFrame(frame);
  }
  function kick() {
    if (rafId || !inView || document.hidden) return;
    last = performance.now();
    rafId = requestAnimationFrame(frame);
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      if (inView) kick();
    }).observe(hero);
  }
  document.addEventListener('visibilitychange', kick);
  reduceMQ.addEventListener && reduceMQ.addEventListener('change', function (e) { reduce = e.matches; kick(); });

  canvas.addEventListener('webglcontextlost', function (e) {
    e.preventDefault();
    if (rafId) cancelAnimationFrame(rafId);
    fail();
  });

  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(hero);
  else window.addEventListener('resize', resize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
  resize();
})();
