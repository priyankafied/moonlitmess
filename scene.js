/*
  scene.js — Moonlit Mess
  Responsibilities: lunar phase shadow on moon, ripple timing, shooting stars.
  No animations started here. The scene is still.
*/

function getLunarPhase() {
  const JD    = Date.now() / 86400000 + 2440587.5;
  const CYCLE = 29.53058770576;
  return ((JD - 2451550.1) % CYCLE + CYCLE) % CYCLE / CYCLE;
}

(function init() {
  applyPhaseShadow(getLunarPhase());
  setTimeout(spawnShooter, 10000 + Math.random() * 10000);
})();

function applyPhaseShadow(phase) {
  const moon   = document.getElementById('moon');
  const shadow = document.getElementById('moon-shadow');
  if (!moon || !shadow) return;

  if (phase > 0.46 && phase < 0.54) return;  /* full moon */

  if (phase < 0.03 || phase > 0.97) {
    shadow.style.cssText = 'position:absolute;inset:0;border-radius:50%;background:rgba(3,2,8,0.90);';
    return;
  }

  const R      = (moon.offsetWidth || 72) / 2;
  const S      = R * 2;
  const waxing = phase < 0.5;
  const t      = waxing ? phase * 2 : (phase - 0.5) * 2;
  const ex     = Math.max(R * Math.abs(1 - t * 2), 1);
  const A      = 'rgba(3,2,8,0.86)';
  let inner    = '';

  if (waxing) {
    inner = `<rect x="0" y="0" width="${R}" height="${S}" fill="${A}"/>`;
    if (t < 0.5) inner += `<ellipse cx="${R}" cy="${R}" rx="${ex}" ry="${R}" fill="${A}"/>`;
    else         inner += `<ellipse cx="${R}" cy="${R}" rx="${ex}" ry="${R}" fill="black" style="mix-blend-mode:destination-out"/>`;
  } else {
    inner = `<rect x="${R}" y="0" width="${R+1}" height="${S}" fill="${A}"/>`;
    if (t < 0.5) inner += `<ellipse cx="${R}" cy="${R}" rx="${ex}" ry="${R}" fill="${A}"/>`;
    else         inner += `<ellipse cx="${R}" cy="${R}" rx="${ex}" ry="${R}" fill="black" style="mix-blend-mode:destination-out"/>`;
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

let shooterActive = false;
function spawnShooter() {
  if (shooterActive) { setTimeout(spawnShooter, 5000); return; }
  shooterActive = true;
  const el  = document.createElement('div');
  el.className = 'mm-shooter';
  const vw  = window.innerWidth;
  const vh  = window.innerHeight;
  const sx  = vw * (0.06 + Math.random() * 0.55);
  const sy  = vh * (0.04 + Math.random() * 0.32);
  const ang = 14 + Math.random() * 20;
  const len = 55 + Math.random() * 85;
  const dur = (0.75 + Math.random() * 0.55).toFixed(2);
  el.style.left  = sx  + 'px';
  el.style.top   = sy  + 'px';
  el.style.width = len + 'px';
  el.style.setProperty('--a', ang + 'deg');
  el.style.setProperty('--l', len + 'px');
  el.style.setProperty('--d', dur + 's');
  const c = document.getElementById('shooters');
  if (c) c.appendChild(el);
  setTimeout(() => { el.remove(); shooterActive = false; }, (parseFloat(dur) + 0.5) * 1000);
  setTimeout(spawnShooter, 16000 + Math.random() * 16000);
}
