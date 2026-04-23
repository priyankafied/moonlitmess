/*
  scene.js — Moonlit Mess
  Pure CSS + minimal JS. No canvas. No rAF loop. No particles.

  Responsibilities:
  1. Calculate real lunar phase from today's date/time
  2. Apply accurate phase shadow to moon via inline SVG (no canvas)
  3. Spawn rare shooting stars via DOM + CSS animation (one at a time)
  4. Randomise ripple timings so water feels organic, not mechanical
*/

/* ── Lunar phase ──────────────────────────────────────
   Standard astronomical formula using Julian Date.
   Returns 0–1: 0 = new moon, 0.5 = full moon
───────────────────────────────────────────────────── */
function getLunarPhase() {
  const JD    = Date.now() / 86400000 + 2440587.5;
  const CYCLE = 29.53058770576;
  return ((JD - 2451550.1) % CYCLE + CYCLE) % CYCLE / CYCLE;
}

/* ── Init ────────────────────────────────────────────── */
(function init() {
  const phase = getLunarPhase();
  applyPhaseShadow(phase);

  /* Randomise ripple widths + durations per session */
  [
    ['r1', 150 + Math.random()*50,  '25%', (7  + Math.random()*2.5).toFixed(1)+'s', '0s'   ],
    ['r2', 220 + Math.random()*60,  '53%', (10 + Math.random()*3  ).toFixed(1)+'s', '1.6s' ],
    ['r3', 305 + Math.random()*70,  '76%', (8.5+ Math.random()*3  ).toFixed(1)+'s', '3.2s' ],
  ].forEach(([id, w, top, dur, delay]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.width             = w    + 'px';
    el.style.top               = top;
    el.style.animationDuration = dur;
    el.style.animationDelay    = delay;
  });

  /* First shooting star: 8–18s after load */
  setTimeout(spawnShooter, 8000 + Math.random() * 10000);
})();

/* ── Phase shadow ────────────────────────────────────
   Draws the unlit portion of the moon using an SVG
   data-URI clipped to the moon circle — no canvas.

   Waxing (phase < 0.5): right side lit, left dark.
   Waning (phase > 0.5): left side lit, right dark.
   Terminator = ellipse whose x-radius tracks phase.
   Shadow alpha = 0.84 (not pitch black — feels natural).
─────────────────────────────────────────────────── */
function applyPhaseShadow(phase) {
  const moon   = document.getElementById('moon');
  const shadow = document.getElementById('moon-shadow');
  if (!moon || !shadow) return;

  /* Full moon — no shadow at all */
  if (phase > 0.46 && phase < 0.54) return;

  /* New moon — entirely dark */
  if (phase < 0.03 || phase > 0.97) {
    shadow.style.cssText = `
      position:absolute;inset:0;border-radius:50%;
      background:rgba(3,1,10,0.88);
    `;
    return;
  }

  const R      = (moon.offsetWidth || 78) / 2;
  const S      = R * 2;
  const waxing = phase < 0.5;
  /* t: 0 = new/full edge, 1 = quarter */
  const t      = waxing ? phase * 2 : (phase - 0.5) * 2;
  /* Terminator ellipse x-radius */
  const ex     = Math.max(R * Math.abs(1 - t * 2), 1);
  const A      = 'rgba(3,1,10,0.84)';  /* shadow colour */

  /*
    Strategy:
    - Fill the dark half-circle
    - For crescent phases (t < 0.5): add terminator ellipse on same side
    - For gibbous phases (t > 0.5): ellipse on opposite side clips INTO light
      (simulated via destination-out in SVG)
  */
  let inner = '';

  if (waxing) {
    /* Dark half = left */
    inner += `<rect x="0" y="0" width="${R}" height="${S}" fill="${A}"/>`;
    if (t < 0.5) {
      /* Crescent: dark ellipse bulges right into lit area */
      inner += `<ellipse cx="${R}" cy="${R}" rx="${ex}" ry="${R}" fill="${A}"/>`;
    } else {
      /* Gibbous: lit ellipse punches into dark half (reveals light) */
      inner += `<ellipse cx="${R}" cy="${R}" rx="${ex}" ry="${R}" fill="rgba(0,0,0,1)" style="mix-blend-mode:destination-out"/>`;
    }
  } else {
    /* Dark half = right */
    inner += `<rect x="${R}" y="0" width="${R+1}" height="${S}" fill="${A}"/>`;
    if (t < 0.5) {
      inner += `<ellipse cx="${R}" cy="${R}" rx="${ex}" ry="${R}" fill="${A}"/>`;
    } else {
      inner += `<ellipse cx="${R}" cy="${R}" rx="${ex}" ry="${R}" fill="rgba(0,0,0,1)" style="mix-blend-mode:destination-out"/>`;
    }
  }

  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">` +
    `<clipPath id="mc"><circle cx="${R}" cy="${R}" r="${R}"/></clipPath>` +
    `<g clip-path="url(#mc)">${inner}</g></svg>`
  );

  shadow.style.cssText = `
    position:absolute;inset:0;border-radius:50%;
    background-image:url("data:image/svg+xml;charset=utf-8,${svg}");
    background-size:100% 100%;background-repeat:no-repeat;
  `;
}

/* ── Shooting stars ──────────────────────────────────
   DOM element + CSS @keyframes.
   One at a time. 15–30s between appearances.
   Position: upper sky only.
   Low opacity, short streak, warm white.
─────────────────────────────────────────────────── */
let shooterActive = false;

function spawnShooter() {
  if (shooterActive) { setTimeout(spawnShooter, 5000); return; }
  shooterActive = true;

  const el  = document.createElement('div');
  el.className = 'mm-shooter';

  const vw  = window.innerWidth;
  const vh  = window.innerHeight;
  /* Sky = top 52% of viewport */
  const sx  = vw * (0.05 + Math.random() * 0.58);
  const sy  = vh * (0.04 + Math.random() * 0.32);
  const ang = 12 + Math.random() * 22;
  const len = 58 + Math.random() * 95;
  const dur = (0.80 + Math.random() * 0.65).toFixed(2);

  el.style.left  = sx  + 'px';
  el.style.top   = sy  + 'px';
  el.style.width = len + 'px';
  el.style.setProperty('--a', ang  + 'deg');
  el.style.setProperty('--l', len  + 'px');
  el.style.setProperty('--d', dur  + 's');

  const container = document.getElementById('shooters');
  if (container) container.appendChild(el);

  setTimeout(() => {
    el.remove();
    shooterActive = false;
  }, (parseFloat(dur) + 0.5) * 1000);

  /* Schedule next: 15–30 seconds */
  setTimeout(spawnShooter, 15000 + Math.random() * 15000);
}
