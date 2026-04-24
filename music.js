/*
  music.js — Moonlit Mess ambient sound
  
  Direction: moonlit sea at night. Lofi warmth. No melody.
  
  Layers:
  1. Ocean — pink noise shaped to deep wave texture.
     Two LFOs: slow swell (0.07Hz) + subtle variation.
  2. Sub-bass hum — very low sine (~55Hz), barely felt.
     The frequency of large waves. Grounds the body.
  3. Night air — high-passed pink noise, very faint.
     The "open air" quality of being outside at night.
  4. Lofi pad — two soft sine tones a 5th apart (D2 + A2)
     with slow, independent fade cycles. Not a chord,
     not a melody — just warmth. Like a distant foghorn
     or a whale you can't quite hear.
  5. Occasional deep crash — every 30–50s, barely audible.

  Master: 0.42. Everything felt, almost nothing heard.
  Fade in: 10 seconds. Piano: none. Melody: none.
*/

let aCtx = null, mOn = false, mNodes = [];
let crashTimer = null, padTimers = [];

function buildMusic() {
  if (!aCtx) aCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (aCtx.state === 'suspended') aCtx.resume();

  mNodes.forEach(n => { try { n.stop(); } catch(e) {} });
  mNodes = [];
  if (crashTimer) { clearTimeout(crashTimer); crashTimer = null; }
  padTimers.forEach(t => clearTimeout(t));
  padTimers = [];

  /* ── Master ────────────────────────────────────── */
  const master = aCtx.createGain();
  master.gain.setValueAtTime(0, aCtx.currentTime);
  master.gain.linearRampToValueAtTime(0.42, aCtx.currentTime + 10);
  master.connect(aCtx.destination);
  mNodes.push(master);

  /* Soft limiter — no peaks */
  const limiter = aCtx.createDynamicsCompressor();
  limiter.threshold.value = -16;
  limiter.knee.value      = 16;
  limiter.ratio.value     = 4;
  limiter.attack.value    = 0.008;
  limiter.release.value   = 0.8;
  limiter.connect(master);

  /* ── Reverb — long, dark, outdoor space ────────── */
  const revSec = 3.8;
  const revLen = Math.floor(aCtx.sampleRate * revSec);
  const revBuf = aCtx.createBuffer(2, revLen, aCtx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = revBuf.getChannelData(ch);
    for (let i = 0; i < revLen; i++) {
      /* Shaped impulse — heavier early reflections, smooth tail */
      const t = i / revLen;
      const env = Math.pow(1 - t, 1.4) * (1 + 0.5 * Math.exp(-t * 6));
      d[i] = (Math.random() * 2 - 1) * env;
    }
  }
  const reverb = aCtx.createConvolver();
  reverb.buffer = revBuf;
  const revG = aCtx.createGain(); revG.gain.value = 0.55;
  reverb.connect(revG); revG.connect(limiter);

  /* ── Pink noise generator ───────────────────────
     4-second looping buffer.
     Voss-McCartney algorithm — correct 1/f spectrum.
  ─────────────────────────────────────────────────*/
  function makePinkNoise(durationSecs, gainFactor) {
    const len = Math.floor(aCtx.sampleRate * durationSecs);
    const buf = aCtx.createBuffer(2, len, aCtx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
        b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
        b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
        d[i] = (b0+b1+b2+b3+b4+b5+w*0.5362) * gainFactor;
      }
    }
    return buf;
  }

  /* ── 1. OCEAN ───────────────────────────────────
     Pink noise bandpass-filtered to wave texture.
     Primary swell LFO at 0.07Hz (~14s cycle).
     Variation LFO at 0.13Hz adds irregularity.
  ─────────────────────────────────────────────────*/
  const oceanBuf = makePinkNoise(4, 0.18);
  const ocean    = aCtx.createBufferSource();
  ocean.buffer = oceanBuf; ocean.loop = true;

  /* Shape to ocean frequency range */
  const oHp = aCtx.createBiquadFilter();
  oHp.type = 'highpass'; oHp.frequency.value = 60; oHp.Q.value = 0.5;
  const oLp = aCtx.createBiquadFilter();
  oLp.type = 'lowpass'; oLp.frequency.value = 680; oLp.Q.value = 0.6;
  /* Slight mid-low presence boost */
  const oEq = aCtx.createBiquadFilter();
  oEq.type = 'peaking'; oEq.frequency.value = 180; oEq.gain.value = 3.5; oEq.Q.value = 1;

  /* Primary swell LFO */
  const lfo1 = aCtx.createOscillator();
  const lfoG1 = aCtx.createGain();
  lfo1.frequency.value = 0.07; lfo1.type = 'sine';
  lfoG1.gain.value = 0.10;
  lfo1.connect(lfoG1);

  /* Variation LFO — slightly irregular swell */
  const lfo2 = aCtx.createOscillator();
  const lfoG2 = aCtx.createGain();
  lfo2.frequency.value = 0.13; lfo2.type = 'sine';
  lfoG2.gain.value = 0.05;
  lfo2.connect(lfoG2);

  const oVol = aCtx.createGain(); oVol.gain.value = 0.22;
  lfoG1.connect(oVol.gain);
  lfoG2.connect(oVol.gain);

  ocean.connect(oHp); oHp.connect(oLp); oLp.connect(oEq);
  oEq.connect(oVol); oVol.connect(limiter);
  ocean.start(); lfo1.start(); lfo2.start();
  mNodes.push(ocean, lfo1, lfo2);

  /* ── 2. SUB-BASS HUM ────────────────────────────
     ~55Hz sine — the physical feeling of large water.
     Below conscious hearing almost. Felt in the chest.
  ─────────────────────────────────────────────────*/
  const sub  = aCtx.createOscillator();
  const subG = aCtx.createGain();
  sub.type = 'sine'; sub.frequency.value = 54;
  subG.gain.value = 0.055;
  sub.connect(subG); subG.connect(limiter);
  sub.start();
  mNodes.push(sub);

  /* ── 3. NIGHT AIR ───────────────────────────────
     High-passed pink noise — the texture of open air.
     Very faint. Adds "outdoors" quality.
  ─────────────────────────────────────────────────*/
  const airBuf = makePinkNoise(4, 0.04);
  const air    = aCtx.createBufferSource();
  air.buffer = airBuf; air.loop = true;

  const airHp = aCtx.createBiquadFilter();
  airHp.type = 'highpass'; airHp.frequency.value = 1800;
  const airLp = aCtx.createBiquadFilter();
  airLp.type = 'lowpass'; airLp.frequency.value = 6000;
  const airG = aCtx.createGain(); airG.gain.value = 0.08;

  air.connect(airHp); airHp.connect(airLp); airLp.connect(airG); airG.connect(limiter);
  air.start();
  mNodes.push(air);

  /* ── 4. LOFI PADS ───────────────────────────────
     Two soft sines: D2 (73.4Hz) + A2 (110Hz).
     Open 5th — the interval of open space, not music.
     Each fades in and out on independent slow cycles
     (41s and 57s). Never both at zero at the same time.
     Very soft reverb send.
  ─────────────────────────────────────────────────*/
  function makePad(freq, vol, cycleSecs, startPhase) {
    const o = aCtx.createOscillator();
    const g = aCtx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.value = 0;
    o.connect(g); g.connect(reverb); g.connect(limiter);
    o.start();
    mNodes.push(o);

    /* Manual slow LFO via scheduled gain automation */
    let phase = startPhase;
    function scheduleCycle() {
      const now  = aCtx.currentTime;
      const half = cycleSecs / 2;
      /* Sine-shaped rise/fall */
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      /* Rise */
      g.gain.linearRampToValueAtTime(vol, now + half);
      /* Fall */
      g.gain.linearRampToValueAtTime(0, now + cycleSecs);
      const t = padTimers.push(setTimeout(scheduleCycle, cycleSecs * 1000)) - 1;
    }
    /* Start offset by phase */
    const offset = cycleSecs * startPhase;
    padTimers.push(setTimeout(scheduleCycle, offset * 1000));
  }

  makePad(73.42,  0.045, 41, 0.0);   /* D2 */
  makePad(110.00, 0.038, 57, 0.4);   /* A2 */

  /* ── 5. DEEP CRASH ──────────────────────────────
     Every 30–50s. Almost inaudible. Just the
     low-frequency weight of a larger wave arriving.
  ─────────────────────────────────────────────────*/
  function playCrash() {
    if (!mOn) return;
    const now  = aCtx.currentTime;
    const cLen = Math.floor(aCtx.sampleRate * 3.5);
    const cBuf = aCtx.createBuffer(1, cLen, aCtx.sampleRate);
    const cd   = cBuf.getChannelData(0);
    for (let i = 0; i < cLen; i++) {
      cd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / cLen, 1.4) * 0.85;
    }
    const crash = aCtx.createBufferSource(); crash.buffer = cBuf;
    const clp   = aCtx.createBiquadFilter();
    clp.type = 'lowpass'; clp.frequency.value = 280;
    const cG = aCtx.createGain();
    cG.gain.setValueAtTime(0, now);
    cG.gain.linearRampToValueAtTime(0.10, now + 1.2);
    cG.gain.linearRampToValueAtTime(0,    now + 3.8);
    crash.connect(clp); clp.connect(cG); cG.connect(limiter);
    crash.start(now); mNodes.push(crash);
    crashTimer = setTimeout(playCrash, 30000 + Math.random() * 20000);
  }
  crashTimer = setTimeout(playCrash, 18000 + Math.random() * 12000);
}

function toggleMusic() {
  const b = document.getElementById('musicBtn');
  if (!mOn) {
    mOn = true;
    buildMusic();
    b.textContent = '♬';
    b.style.color = 'rgba(218, 200, 145, 0.80)';
  } else {
    mOn = false;
    if (crashTimer)  { clearTimeout(crashTimer);  crashTimer = null; }
    padTimers.forEach(t => clearTimeout(t)); padTimers = [];
    if (aCtx) {
      const now = aCtx.currentTime;
      mNodes.forEach(n => {
        try {
          if (n.gain) {
            n.gain.cancelScheduledValues(now);
            n.gain.setValueAtTime(n.gain.value, now);
            n.gain.linearRampToValueAtTime(0, now + 3);
          }
        } catch(e) {}
      });
      setTimeout(() => {
        mNodes.forEach(n => { try { n.stop(); } catch(e) {} });
        mNodes = [];
      }, 3200);
    }
    b.textContent = '♩';
    b.style.color = '';
  }
}
