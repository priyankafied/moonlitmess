/*
  sound.js
  Layered ambient ocean soundscape:
  1. Continuous filtered noise → ocean wave texture (base layer)
  2. Slow LFO-modulated swell — breathing rhythm
  3. Occasional deep "crash" (rare, spaced 18–40s apart)
  4. Very occasional high shimmer (star twinkle feeling)
  Everything fades in gently. Default: off.
*/

let sCtx = null, sOn = false, sNodes = [], crashTimer = null, shimmerTimer = null;

function buildSound() {
  if (!sCtx) sCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (sCtx.state === 'suspended') sCtx.resume();

  sNodes.forEach(n => { try { n.stop(); } catch(e){} });
  sNodes = [];
  if (crashTimer)  { clearTimeout(crashTimer);  crashTimer  = null; }
  if (shimmerTimer){ clearTimeout(shimmerTimer); shimmerTimer = null; }

  /* ── Master — low gain, 6s cinematic fade in ─────── */
  const master = sCtx.createGain();
  master.gain.setValueAtTime(0, sCtx.currentTime);
  master.gain.linearRampToValueAtTime(0.55, sCtx.currentTime + 6);
  master.connect(sCtx.destination);
  sNodes.push(master);

  /* ── Gentle soft compressor ──────────────────────── */
  const comp = sCtx.createDynamicsCompressor();
  comp.threshold.value = -22;
  comp.knee.value = 14;
  comp.ratio.value = 3;
  comp.attack.value = 0.3;
  comp.release.value = 0.8;
  comp.connect(master);

  /* ── Ocean base noise ────────────────────────────── */
  /* Long buffer of pink-ish noise */
  const bufLen = sCtx.sampleRate * 6;
  const nBuf = sCtx.createBuffer(2, bufLen, sCtx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = nBuf.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < bufLen; i++) {
      /* Pink-ish: integrate white noise slightly */
      last = last * 0.98 + (Math.random() * 2 - 1) * 0.02;
      d[i] = last * 8 + (Math.random() * 2 - 1) * 0.04;
    }
  }
  const noise = sCtx.createBufferSource();
  noise.buffer = nBuf;
  noise.loop = true;

  /* Band the noise to ocean frequencies: 80–700Hz */
  const hp = sCtx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 80; hp.Q.value = 0.5;
  const lp = sCtx.createBiquadFilter();
  lp.type = 'lowpass';  lp.frequency.value = 700; lp.Q.value = 0.7;

  /* LFO — breathing swell at ~0.12 Hz (one breath every ~8 seconds) */
  const lfo = sCtx.createOscillator();
  const lfoGain = sCtx.createGain();
  lfo.type = 'sine';
  lfo.frequency.value = 0.12;
  lfoGain.gain.value = 0.18;
  lfo.connect(lfoGain);

  const waveGain = sCtx.createGain();
  waveGain.gain.value = 0.28;
  lfoGain.connect(waveGain.gain);  /* LFO modulates wave volume */

  noise.connect(hp); hp.connect(lp); lp.connect(waveGain); waveGain.connect(comp);
  noise.start(); lfo.start();
  sNodes.push(noise, lfo);

  /* ── Occasional deep wave crash ──────────────────── */
  function playCrash() {
    if (!sOn) return;
    const now = sCtx.currentTime;
    const cLen = sCtx.sampleRate * 3;
    const cBuf = sCtx.createBuffer(1, cLen, sCtx.sampleRate);
    const cd = cBuf.getChannelData(0);
    for (let i = 0; i < cLen; i++) {
      cd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / cLen, 1.4);
    }
    const crash = sCtx.createBufferSource();
    crash.buffer = cBuf;
    const cLp = sCtx.createBiquadFilter();
    cLp.type = 'lowpass'; cLp.frequency.value = 400;
    const cGain = sCtx.createGain();
    cGain.gain.setValueAtTime(0, now);
    cGain.gain.linearRampToValueAtTime(0.18, now + 0.4);
    cGain.gain.linearRampToValueAtTime(0, now + 2.8);
    crash.connect(cLp); cLp.connect(cGain); cGain.connect(comp);
    crash.start(now);
    sNodes.push(crash);
    crashTimer = setTimeout(playCrash, 18000 + Math.random() * 22000);
  }
  crashTimer = setTimeout(playCrash, 8000 + Math.random() * 10000);

  /* ── Very occasional high shimmer ───────────────── */
  function playShimmer() {
    if (!sOn) return;
    const now = sCtx.currentTime;
    const freq = [1046, 1318, 1567][Math.floor(Math.random() * 3)];
    const o = sCtx.createOscillator();
    const g = sCtx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.018, now + 0.6);
    g.gain.linearRampToValueAtTime(0, now + 3.5);
    o.connect(g); g.connect(master);
    o.start(now); o.stop(now + 4);
    sNodes.push(o);
    shimmerTimer = setTimeout(playShimmer, 20000 + Math.random() * 25000);
  }
  shimmerTimer = setTimeout(playShimmer, 12000 + Math.random() * 10000);
}

function toggleSound() {
  const btn = document.getElementById('soundBtn');
  const icon = document.getElementById('soundIcon');
  if (!sOn) {
    sOn = true;
    buildSound();
    icon.textContent = '♬';
    btn.style.color = '#b8a870';
    btn.style.borderColor = 'rgba(200,180,100,0.28)';
  } else {
    sOn = false;
    if (crashTimer)  { clearTimeout(crashTimer);  crashTimer  = null; }
    if (shimmerTimer){ clearTimeout(shimmerTimer); shimmerTimer = null; }
    /* Gentle 2s fade before kill */
    if (sCtx) {
      const fadeOut = sCtx.createGain();
      fadeOut.gain.setValueAtTime(1, sCtx.currentTime);
      fadeOut.gain.linearRampToValueAtTime(0, sCtx.currentTime + 2);
    }
    setTimeout(() => {
      sNodes.forEach(n => { try { n.stop(); } catch(e){} });
      sNodes = [];
    }, 2200);
    icon.textContent = '♩';
    btn.style.color = '';
    btn.style.borderColor = '';
  }
}
