/*
  sky.js — single canvas renders the entire Moonlit Mess scene.

  Layer order (bottom to top, drawn each frame):
  1. Deep night sky gradient
  2. Moon atmospheric glow bloom
  3. Stars — 120 soft dots, slow individual twinkle
  4. Moon body — bright sphere with crater detail + limb darkening
  5. Ocean — dark water, horizon blend, moonpath reflection, ripple hints

  Shooting stars: rare DOM elements (CSS animation), created + destroyed
  via setTimeout. No rAF overhead.

  Performance:
  - Single rAF loop pauses when tab is hidden
  - Sky gradient cached, rebuilt only on resize
  - Resize debounced 150ms
*/

const cv  = document.getElementById('sky');
const ctx = cv.getContext('2d');

let W, H, MX, MY, MR;
let stars   = [];
let skyGrad = null;
let fr      = 0;
let paused  = false;

document.addEventListener('visibilitychange', () => { paused = document.hidden; });

/* ── Resize ──────────────────────────────────────── */
function resize() {
  W  = cv.width  = window.innerWidth;
  H  = cv.height = window.innerHeight;
  skyGrad = null;
  MX = W * 0.50;
  MY = H * 0.16;
  MR = Math.min(W, H) * 0.072;
  buildStars();
}

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(resize, 150);
});

/* ── Stars ───────────────────────────────────────── */
function buildStars() {
  stars = [];
  const HORIZON = H * 0.52;
  const target  = Math.min(Math.max(Math.round(W * HORIZON / 4800), 80), 140);
  let attempts  = 0;

  while (stars.length < target && attempts < target * 5) {
    attempts++;
    const x  = Math.random() * W;
    const y  = Math.random() * HORIZON;
    const dx = x - MX, dy = y - MY;
    if (dx*dx + dy*dy < (MR * 3.5) * (MR * 3.5)) continue;

    stars.push({
      x, y,
      r:    Math.random() * 1.1 + 0.15,
      base: Math.random() * 0.45 + 0.10,
      spd:  Math.random() * 0.016 + 0.003,
      ph:   Math.random() * Math.PI * 2,
      gold: Math.random() < 0.09,
      blue: Math.random() < 0.07,
    });
  }
}

/* ── Shooting stars — rare DOM elements ─────────── */
(function injectShooterCSS() {
  const s = document.createElement('style');
  s.textContent = `@keyframes shootstar{
    0%  {opacity:0; transform:rotate(var(--sa)) translateX(0)          scaleX(0.05);}
    7%  {opacity:0.88;}
    82% {opacity:0.55;}
    100%{opacity:0; transform:rotate(var(--sa)) translateX(var(--sd))  scaleX(1);}
  }
  .shooter{
    position:fixed;pointer-events:none;z-index:1;
    height:1.5px;border-radius:2px;
    background:linear-gradient(90deg,transparent,rgba(255,255,255,0.88),rgba(255,255,255,0.22),transparent);
    transform-origin:left center;
    animation:shootstar var(--sdur) linear forwards;
  }`;
  document.head.appendChild(s);
})();

function spawnShooter() {
  if (paused) { setTimeout(spawnShooter, 3000); return; }

  const el  = document.createElement('div');
  el.className = 'shooter';
  const sx  = W * (0.06 + Math.random() * 0.58);
  const sy  = H * (0.03 + Math.random() * 0.28);
  const ang = 13 + Math.random() * 19;
  const len = 88 + Math.random() * 130;
  const dur = (1.0 + Math.random() * 0.85).toFixed(2);

  el.style.cssText += `left:${sx}px;top:${sy}px;width:${len}px;`;
  el.style.setProperty('--sa',   ang  + 'deg');
  el.style.setProperty('--sd',   len  + 'px');
  el.style.setProperty('--sdur', dur  + 's');

  document.body.appendChild(el);
  setTimeout(() => el.remove(), (parseFloat(dur) + 0.5) * 1000);

  /* 10–18 seconds between shooters */
  setTimeout(spawnShooter, 10000 + Math.random() * 8000);
}

/* ── Sky gradient ────────────────────────────────── */
function drawSky() {
  if (!skyGrad) {
    skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0.00, '#01030b');
    skyGrad.addColorStop(0.20, '#02050f');
    skyGrad.addColorStop(0.42, '#030818');
    skyGrad.addColorStop(0.56, '#050b20');
    skyGrad.addColorStop(1.00, '#07102a');
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);
}

/* ── Moon glow ───────────────────────────────────── */
function drawMoonGlow() {
  const pulse = 0.5 + Math.sin(fr * 0.007) * 0.11;

  const gOut = ctx.createRadialGradient(MX, MY, MR * 0.4, MX, MY, MR * 7);
  gOut.addColorStop(0,    `rgba(185,212,255,${0.11 * pulse})`);
  gOut.addColorStop(0.30, `rgba(165,198,248,${0.045 * pulse})`);
  gOut.addColorStop(0.60, `rgba(145,183,240,${0.018 * pulse})`);
  gOut.addColorStop(1,    'rgba(125,168,230,0)');
  ctx.beginPath();
  ctx.arc(MX, MY, MR * 7, 0, Math.PI * 2);
  ctx.fillStyle = gOut;
  ctx.fill();

  const gIn = ctx.createRadialGradient(MX, MY, MR * 0.2, MX, MY, MR * 2.6);
  gIn.addColorStop(0,    `rgba(218,235,255,${0.22 * pulse})`);
  gIn.addColorStop(0.40, `rgba(198,220,255,${0.09 * pulse})`);
  gIn.addColorStop(1,    'rgba(178,205,252,0)');
  ctx.beginPath();
  ctx.arc(MX, MY, MR * 2.6, 0, Math.PI * 2);
  ctx.fillStyle = gIn;
  ctx.fill();
}

/* ── Stars ───────────────────────────────────────── */
function drawStars() {
  stars.forEach(s => {
    const tw = s.base + Math.sin(fr * s.spd + s.ph) * 0.27;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = s.gold  ? `rgba(235,220,148,${tw})`
                  : s.blue  ? `rgba(172,202,255,${tw})`
                  :            `rgba(215,212,205,${tw})`;
    ctx.fill();
  });
}

/* ── Moon body ───────────────────────────────────── */
function drawMoon() {
  ctx.save();
  ctx.beginPath();
  ctx.arc(MX, MY, MR, 0, Math.PI * 2);
  ctx.clip();

  /* Base sphere */
  const gB = ctx.createRadialGradient(
    MX - MR*0.18, MY - MR*0.14, MR*0.04,
    MX, MY, MR
  );
  gB.addColorStop(0.00, '#ffffff');
  gB.addColorStop(0.10, '#f4f8ff');
  gB.addColorStop(0.25, '#dce8ff');
  gB.addColorStop(0.46, '#b6ccf0');
  gB.addColorStop(0.66, '#8eaad8');
  gB.addColorStop(0.84, '#6886c0');
  gB.addColorStop(1.00, '#5070b0');
  ctx.fillStyle = gB;
  ctx.fillRect(MX-MR, MY-MR, MR*2, MR*2);

  /* Crater patches */
  const craters = [
    { ox:-0.08, oy:-0.10, r:0.30, ry:0.22, a:0.20 },
    { ox: 0.24, oy: 0.12, r:0.13,          a:0.14 },
    { ox:-0.22, oy: 0.24, r:0.09,          a:0.11 },
    { ox: 0.30, oy:-0.22, r:0.08,          a:0.09 },
    { ox: 0.02, oy: 0.32, r:0.07,          a:0.08 },
    { ox:-0.30, oy:-0.10, r:0.10,          a:0.07 },
  ];
  craters.forEach(cr => {
    const cx = MX + cr.ox * MR;
    const cy = MY + cr.oy * MR;
    const cr2 = cr.r * MR;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr2);
    g.addColorStop(0,   `rgba(45,65,125,${cr.a})`);
    g.addColorStop(0.55,`rgba(45,65,125,${cr.a*0.4})`);
    g.addColorStop(1,   'rgba(45,65,125,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, cr2, 0, Math.PI*2);
    ctx.fillStyle = g;
    ctx.fill();
  });

  /* Limb darkening */
  const gL = ctx.createRadialGradient(MX, MY, MR*0.46, MX, MY, MR);
  gL.addColorStop(0,    'rgba(0,0,0,0)');
  gL.addColorStop(0.62, 'rgba(12,22,62,0.14)');
  gL.addColorStop(0.86, 'rgba(8,16,52,0.38)');
  gL.addColorStop(1,    'rgba(4,10,42,0.58)');
  ctx.fillStyle = gL;
  ctx.fillRect(MX-MR, MY-MR, MR*2, MR*2);

  ctx.restore();
}

/* ── Ocean ───────────────────────────────────────── */
function drawOcean() {
  const HORIZON = H * 0.52;

  /* Water base */
  const gSea = ctx.createLinearGradient(0, HORIZON, 0, H);
  gSea.addColorStop(0.00, '#060e20');
  gSea.addColorStop(0.30, '#050a1a');
  gSea.addColorStop(0.65, '#040812');
  gSea.addColorStop(1.00, '#02060c');
  ctx.fillStyle = gSea;
  ctx.fillRect(0, HORIZON, W, H - HORIZON);

  /* Horizon luminance — sky meets sea */
  const gHz = ctx.createLinearGradient(0, HORIZON-18, 0, HORIZON+28);
  gHz.addColorStop(0,   'rgba(85,140,210,0)');
  gHz.addColorStop(0.38,`rgba(95,150,215,${0.07 + Math.sin(fr*0.009)*0.02})`);
  gHz.addColorStop(0.62,`rgba(105,160,220,${0.10 + Math.sin(fr*0.009)*0.02})`);
  gHz.addColorStop(1,   'rgba(85,140,210,0)');
  ctx.fillStyle = gHz;
  ctx.fillRect(0, HORIZON-18, W, 46);

  /* Moonpath — tapered trapezoid centred under moon */
  const pulse  = 0.72 + Math.sin(fr * 0.011) * 0.14;
  const topHW  = W * 0.038;
  const botHW  = W * 0.16;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(MX - topHW, HORIZON);
  ctx.lineTo(MX + topHW, HORIZON);
  ctx.lineTo(MX + botHW, H);
  ctx.lineTo(MX - botHW, H);
  ctx.closePath();

  const gPath = ctx.createLinearGradient(0, HORIZON, 0, H);
  gPath.addColorStop(0.00, 'rgba(215,238,255,0)');
  gPath.addColorStop(0.10, `rgba(215,238,255,${0.038 * pulse})`);
  gPath.addColorStop(0.32, `rgba(222,242,255,${0.09  * pulse})`);
  gPath.addColorStop(0.55, `rgba(228,245,255,${0.135 * pulse})`);
  gPath.addColorStop(0.78, `rgba(220,240,255,${0.085 * pulse})`);
  gPath.addColorStop(1.00, `rgba(208,232,255,${0.035 * pulse})`);
  ctx.fillStyle = gPath;
  ctx.globalCompositeOperation = 'screen';
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();

  /* Ripple hints — three faint horizontal glimmers */
  const rippleYs = [0.60, 0.73, 0.87];
  rippleYs.forEach((yf, i) => {
    const ry  = HORIZON + (H - HORIZON) * yf;
    const rw  = W * (0.28 + i * 0.10);
    const osc = 0.5 + Math.sin(fr * 0.008 + i * 1.5) * 0.28;
    const gr  = ctx.createLinearGradient(MX - rw/2, 0, MX + rw/2, 0);
    gr.addColorStop(0,    'rgba(185,215,255,0)');
    gr.addColorStop(0.30, `rgba(185,215,255,${0.038 * osc})`);
    gr.addColorStop(0.50, `rgba(205,230,255,${0.062 * osc})`);
    gr.addColorStop(0.70, `rgba(185,215,255,${0.038 * osc})`);
    gr.addColorStop(1,    'rgba(185,215,255,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(MX - rw/2, ry - 0.7, rw, 1.4);
  });
}

/* ── Loop ────────────────────────────────────────── */
function loop() {
  if (!paused) {
    ctx.clearRect(0, 0, W, H);
    drawSky();
    drawMoonGlow();
    drawStars();
    drawMoon();
    drawOcean();
    fr++;
  }
  requestAnimationFrame(loop);
}

resize();
loop();
setTimeout(spawnShooter, 5000 + Math.random() * 3000);
