/*
  music.js — Moonlit Mess ambient sound engine

  Philosophy: music as weather, not performance.
  The sound should be noticed only after you're already inside it.

  Two layers:

  1. OCEAN — pink noise filtered to wave frequencies,
     breathing via slow LFO (~0.09 Hz = one swell every 11s),
     occasional deep crash every 25–45 seconds.
     Grounds the body. Keeps the nervous system calm.

  2. PIANO — sparse single notes in D minor pentatonic.
     Sine + soft triangle overtone. Long decay (4–7s).
     Heavy reverb (4.5s tail, 72% wet) so notes dissolve
     into atmosphere rather than play as melody.
     Silences between notes are 4–9 seconds — intentional.
     The silence is where the writing happens.

  Inspired by: Nils Frahm, Max Richter, Ólafur Arnalds.
  Key: D minor / F major — melancholy that opens, doesn't close.

  No percussion. No rhythm. No chord density.
  Just tones that hold space.
*/

let aCtx = null, mOn = false, mNodes = [];
let crashTimer = null, noteTimer = null;

function buildMusic() {
  if (!aCtx) aCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (aCtx.state === 'suspended') aCtx.resume();

  mNodes.forEach(n => { try { n.stop(); } catch(e) {} });
  mNodes = [];
  if (crashTimer) { clearTimeout(crashTimer); crashTimer = null; }
  if (noteTimer)  { clearTimeout(noteTimer);  noteTimer  = null; }

  /* ── Master bus ─────────────────────────────────── */
  const master = aCtx.createGain();
  master.gain.setValueAtTime(0, aCtx.currentTime);
  master.gain.linearRampToValueAtTime(0.60, aCtx.currentTime + 7);
  master.connect(aCtx.destination);
  mNodes.push(master);

  const limiter = aCtx.createDynamicsCompressor();
  limiter.threshold.value = -14;
  limiter.knee.value = 10;
  limiter.ratio.value = 4;
  limiter.attack.value = 0.004;
  limiter.release.value = 0.5;
  limiter.connect(master);

  /* ── Reverb — long, dark, cathedral-like ─────────
     4.5 second tail makes piano notes dissolve into
     atmosphere. This is the "notes becoming weather"
     quality of Nils Frahm / Ólafur Arnalds.
  ────────────────────────────────────────────────── */
  const revLen = Math.floor(aCtx.sampleRate * 4.5);
  const revBuf = aCtx.createBuffer(2, revLen, aCtx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = revBuf.getChannelData(ch);
    for (let i = 0; i < revLen; i++) {
      const t = i / revLen;
      const env = Math.pow(1 - t, 1.8) * (1 + 0.3 * Math.exp(-t * 8));
      d[i] = (Math.random() * 2 - 1) * env;
    }
  }
  const reverb  = aCtx.createConvolver();
  reverb.buffer = revBuf;

  const wetGain = aCtx.createGain();
  wetGain.gain.value = 0.72;   /* High wet = notes blur into space */
  reverb.connect(wetGain);
  wetGain.connect(limiter);

  const dryGain = aCtx.createGain();
  dryGain.gain.value = 0.18;   /* Mostly reverb tail, barely dry */
  dryGain.connect(limiter);

  /* Piano warmth filter */
  const pianoLp = aCtx.createBiquadFilter();
  pianoLp.type = 'lowpass';
  pianoLp.frequency.value = 3200;
  pianoLp.Q.value = 0.5;

  const pianoHp = aCtx.createBiquadFilter();
  pianoHp.type = 'highpass';
  pianoHp.frequency.value = 120;

  pianoLp.connect(pianoHp);
  pianoHp.connect(dryGain);
  pianoHp.connect(reverb);

  /* ── Piano note function ──────────────────────────
     Sine (fundamental) + triangle (2nd harmonic) +
     sub octave (warmth). Approximates piano overtones
     without harshness. Long attack (0.04s), very long
     release (4–7s exponential decay).
  ────────────────────────────────────────────────── */
  function playNote(freq, velocity, duration) {
    if (!mOn) return;
    const now = aCtx.currentTime;
    const vel = velocity || 0.18;
    const dur = duration || 4.5;

    /* Fundamental — sine */
    const o1 = aCtx.createOscillator();
    const g1 = aCtx.createGain();
    o1.type = 'sine';
    o1.frequency.value = freq;
    g1.gain.setValueAtTime(0, now);
    g1.gain.linearRampToValueAtTime(vel, now + 0.04);
    g1.gain.exponentialRampToValueAtTime(vel * 0.55, now + 0.4);
    g1.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o1.connect(g1); g1.connect(pianoLp);
    o1.start(now); o1.stop(now + dur + 0.1);

    /* 2nd harmonic — triangle, softer */
    const o2 = aCtx.createOscillator();
    const g2 = aCtx.createGain();
    o2.type = 'triangle';
    o2.frequency.value = freq * 2;
    g2.gain.setValueAtTime(0, now);
    g2.gain.linearRampToValueAtTime(vel * 0.22, now + 0.05);
    g2.gain.exponentialRampToValueAtTime(0.0001, now + dur * 0.7);
    o2.connect(g2); g2.connect(pianoLp);
    o2.start(now); o2.stop(now + dur + 0.1);

    /* Sub octave — warmth and body */
    const o3 = aCtx.createOscillator();
    const g3 = aCtx.createGain();
    o3.type = 'sine';
    o3.frequency.value = freq * 0.5;
    g3.gain.setValueAtTime(0, now);
    g3.gain.linearRampToValueAtTime(vel * 0.10, now + 0.08);
    g3.gain.exponentialRampToValueAtTime(0.0001, now + dur * 0.5);
    o3.connect(g3); g3.connect(pianoLp);
    o3.start(now); o3.stop(now + dur + 0.1);

    mNodes.push(o1, o2, o3);
  }

  /* ── Note sequence ────────────────────────────────
     Hand-composed to move through the emotional arc:
     — Tentative high notes at arrival
     — Settling lower as trust builds
     — Open 5th chord = being held
     — Descending release phrase
     — Long silence at the end = space to breathe

     null = rest (3–9 seconds of silence).
     Silences are intentionally longer than notes.
  ────────────────────────────────────────────────── */
  const sequence = [
    /* Arrival — sparse, high, uncertain */
    { f: 587.33, v: 0.14, d: 5.5 },   /* D5  */
    null, null,
    { f: 440.00, v: 0.12, d: 6.0 },   /* A4  */
    null,
    { f: 349.23, v: 0.13, d: 7.0 },   /* F4 — held */
    null, null, null,

    /* Settling — lower, warmer */
    { f: 293.66, v: 0.15, d: 6.5 },   /* D4  */
    null,
    { f: 261.63, v: 0.12, d: 5.0 },   /* C4  */
    { f: 349.23, v: 0.14, d: 8.0 },   /* F4 — held longer */
    null, null,

    /* Being held — open 5th chord */
    { f: [293.66, 440.00], v: 0.11, d: 7.5 },
    null, null, null,

    /* Release phrase — descends, opens outward */
    { f: 523.25, v: 0.13, d: 5.0 },   /* C5  */
    null,
    { f: 440.00, v: 0.12, d: 5.5 },   /* A4  */
    null,
    { f: 349.23, v: 0.13, d: 6.0 },   /* F4  */
    null,
    { f: 220.00, v: 0.15, d: 9.0 },   /* A3 — very low, grounding */
    null, null, null, null,

    /* A single high note like light */
    { f: 698.46, v: 0.09, d: 4.5 },   /* F5 — barely there */
    null, null,

    /* Return to centre */
    { f: 293.66, v: 0.14, d: 6.0 },   /* D4  */
    null,
    { f: [220.00, 349.23], v: 0.10, d: 8.0 }, /* A3 + F4 — open 5th */
    null, null, null, null, null,
  ];

  let seqIdx = 0;

  function scheduleNext() {
    if (!mOn) return;
    const item = sequence[seqIdx++ % sequence.length];

    let gapMs;
    if (!item) {
      /* Rest — 4 to 9 seconds of intentional silence */
      gapMs = 4000 + Math.random() * 5000;
    } else if (Array.isArray(item.f)) {
      /* Chord — both notes together */
      item.f.forEach(freq => playNote(freq, item.v, item.d));
      gapMs = item.d * 1000 * 0.65 + Math.random() * 2000;
    } else {
      playNote(item.f, item.v, item.d);
      gapMs = item.d * 1000 * 0.60 + Math.random() * 1800;
    }

    noteTimer = setTimeout(scheduleNext, gapMs);
  }

  /* First note after 5 seconds — let ocean settle first */
  noteTimer = setTimeout(scheduleNext, 5000);

  /* ── Ocean layer — pink noise ─────────────────────
     Pink noise algorithm (Voss-McCartney) gives the
     correct frequency roll-off for ocean sound.
     Bandpass 80–800 Hz = wave-like, no hiss.
     Breathing LFO at 0.09 Hz = one swell every 11s.
  ────────────────────────────────────────────────── */
  const bufLen = aCtx.sampleRate * 8;
  const nBuf   = aCtx.createBuffer(2, bufLen, aCtx.sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const d = nBuf.getChannelData(ch);
    let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0;
    for (let i = 0; i < bufLen; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886*b0 + w*0.0555179;
      b1 = 0.99332*b1 + w*0.0750759;
      b2 = 0.96900*b2 + w*0.1538520;
      b3 = 0.86650*b3 + w*0.3104856;
      b4 = 0.55000*b4 + w*0.5329522;
      b5 = -0.7616*b5 - w*0.0168980;
      d[i] = (b0+b1+b2+b3+b4+b5+w*0.5362) * 0.11;
    }
  }

  const oceanNoise = aCtx.createBufferSource();
  oceanNoise.buffer = nBuf;
  oceanNoise.loop   = true;

  const oceanHp = aCtx.createBiquadFilter();
  oceanHp.type = 'highpass';
  oceanHp.frequency.value = 80;

  const oceanLp = aCtx.createBiquadFilter();
  oceanLp.type = 'lowpass';
  oceanLp.frequency.value = 800;

  /* Breathing LFO */
  const lfo     = aCtx.createOscillator();
  const lfoGain = aCtx.createGain();
  lfo.type = 'sine';
  lfo.frequency.value = 0.09;
  lfoGain.gain.value  = 0.12;
  lfo.connect(lfoGain);

  const oceanVol = aCtx.createGain();
  oceanVol.gain.value = 0.18;   /* Ocean quiet under piano */
  lfoGain.connect(oceanVol.gain);

  oceanNoise.connect(oceanHp);
  oceanHp.connect(oceanLp);
  oceanLp.connect(oceanVol);
  oceanVol.connect(limiter);
  oceanNoise.start();
  lfo.start();
  mNodes.push(oceanNoise, lfo);

  /* ── Rare deep wave crash ─────────────────────────
     Every 25–45 seconds — a single involuntary exhale.
     Low frequency burst, slow fade, feels physical.
  ────────────────────────────────────────────────── */
  function playCrash() {
    if (!mOn) return;
    const now  = aCtx.currentTime;
    const cLen = aCtx.sampleRate * 3.5;
    const cBuf = aCtx.createBuffer(1, cLen, aCtx.sampleRate);
    const cd   = cBuf.getChannelData(0);
    for (let i = 0; i < cLen; i++) {
      cd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / cLen, 1.6) * 0.9;
    }
    const crash = aCtx.createBufferSource();
    crash.buffer = cBuf;

    const clp = aCtx.createBiquadFilter();
    clp.type = 'lowpass';
    clp.frequency.value = 420;

    const cg = aCtx.createGain();
    cg.gain.setValueAtTime(0, now);
    cg.gain.linearRampToValueAtTime(0.20, now + 0.6);
    cg.gain.linearRampToValueAtTime(0, now + 3.2);

    crash.connect(clp);
    clp.connect(cg);
    cg.connect(limiter);
    crash.start(now);
    mNodes.push(crash);

    crashTimer = setTimeout(playCrash, 25000 + Math.random() * 20000);
  }

  crashTimer = setTimeout(playCrash, 14000 + Math.random() * 10000);
}

/* ── Toggle ──────────────────────────────────────── */
function toggleMusic() {
  const b = document.getElementById('musicBtn');
  if (!mOn) {
    mOn = true;
    buildMusic();
    b.textContent = '♬ on';
    b.style.color = '#e8d98a';
    b.style.borderColor = 'rgba(232,217,138,0.38)';
  } else {
    mOn = false;
    if (crashTimer) { clearTimeout(crashTimer); crashTimer = null; }
    if (noteTimer)  { clearTimeout(noteTimer);  noteTimer  = null; }

    /* Graceful 2.5s fade before killing nodes */
    if (aCtx) {
      const now = aCtx.currentTime;
      mNodes.forEach(n => {
        try {
          if (n.gain) {
            n.gain.cancelScheduledValues(now);
            n.gain.setValueAtTime(n.gain.value, now);
            n.gain.linearRampToValueAtTime(0, now + 2.5);
          }
        } catch(e) {}
      });
      setTimeout(() => {
        mNodes.forEach(n => { try { n.stop(); } catch(e) {} });
        mNodes = [];
      }, 2700);
    }

    b.textContent = '♩ off';
    b.style.color = '#5a5238';
    b.style.borderColor = 'rgba(232,217,138,0.12)';
  }
}
