const skyCv = document.getElementById('sky');
const sCtx = skyCv.getContext('2d');

let w, h, stars = [], shooters = [];
let t = 0;

function resize() {
  w = skyCv.width = window.innerWidth;
  h = skyCv.height = window.innerHeight;

  stars = [];
  for (let i = 0; i < 70; i++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h * 0.8,
      r: Math.random() * 1.2,
      a: Math.random() * 0.5 + 0.2,
      s: Math.random() * 0.02 + 0.005,
      p: Math.random() * Math.PI * 2
    });
  }
}

resize();
window.addEventListener('resize', resize);

function draw() {

  t += 0.002; // 🌙 ultra slow breathing

  const breathe = Math.sin(t) * 6;

  skyCv.style.transform = `translateY(${breathe}px)`;

  sCtx.clearRect(0, 0, w, h);

  const grad = sCtx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#04061a');
  grad.addColorStop(1, '#080b26');

  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, w, h);

  stars.forEach(s => {
    const tw = s.a + Math.sin(t * 5 + s.p) * 0.2;

    sCtx.beginPath();
    sCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    sCtx.fillStyle = `rgba(255,255,255,${tw})`;
    sCtx.fill();
  });

  requestAnimationFrame(draw);
}

draw();
