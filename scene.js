/*
  scene.js — lightweight scene setup
  No requestAnimationFrame. No physics. No loops.
  - Builds static star field (50 DOM elements, CSS twinkle)
  - Schedules shooting stars (setTimeout + CSS animation, DOM element removed after)
*/

/* ── Stars ──────────────────────────────────────────── */
(function buildStars() {
  const container = document.getElementById('stars');
  const count = 55;
  /* Stars only in the sky portion — top 52% of screen */
  for (let i = 0; i < count; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const x = Math.random() * 100;
    const y = Math.random() * 52;
    const r = Math.random() * 1.2 + 0.3;
    const baseOp = (Math.random() * 0.35 + 0.12).toFixed(2);
    const dur = (Math.random() * 5 + 4).toFixed(1);
    const delay = (Math.random() * 8).toFixed(1);
    const gold = Math.random() < 0.09;
    s.style.cssText = `
      left:${x}%;
      top:${y}%;
      width:${r * 2}px;
      height:${r * 2}px;
      --base-op:${baseOp};
      opacity:${baseOp};
      background:${gold ? 'rgba(232,215,130,0.9)' : 'rgba(210,208,198,0.9)'};
      animation: twinkle ${dur}s ease-in-out ${delay}s infinite;
    `;
    container.appendChild(s);
  }
})();

/* ── Shooting stars ─────────────────────────────────── */
function spawnShooter() {
  const container = document.getElementById('shooters');
  const el = document.createElement('div');
  el.className = 'shooter';

  /* Random position in upper-left sky quadrant */
  const startX = 5 + Math.random() * 55;   /* % from left */
  const startY = 4 + Math.random() * 28;   /* % from top */
  const angle  = 12 + Math.random() * 20;  /* degrees — gentle diagonal */
  const length = 80 + Math.random() * 120; /* px */
  const dur    = 1.1 + Math.random() * 0.8;

  el.style.cssText = `
    left: ${startX}%;
    top: ${startY}%;
    width: ${length}px;
    --angle: ${angle}deg;
    --dist: ${length}px;
    animation-duration: ${dur}s;
  `;

  container.appendChild(el);

  /* Remove from DOM after animation completes — no leak */
  setTimeout(() => el.remove(), (dur + 0.2) * 1000);

  /* Schedule next — 12 to 28 seconds apart */
  const next = 12000 + Math.random() * 16000;
  setTimeout(spawnShooter, next);
}

/* First one after 4–9 seconds */
setTimeout(spawnShooter, 4000 + Math.random() * 5000);
