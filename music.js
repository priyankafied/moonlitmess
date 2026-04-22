let aCtx = null, mOn = false, mNodes = [], chordTimer = null;

/*
  Minimal ambient sound — airy, sparse, ignorable.
  Architecture: single sine oscillator per note (no chorus layers)
  → gentle low-pass → soft reverb → master gain
  + barely audible high-frequency shimmer
  + very faint vinyl noise (almost subliminal)

  Philosophy: sound you notice only after sitting with it.
  No chord density. Long silences. Open intervals only.
*/

function buildMusic() {
  if (!aCtx) aCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (aCtx.state === 'suspended') aCtx.resume();

  mNodes.forEach(n => { try { n.stop(); } catch (e) {} });
  mNodes = [];
  if (chordTimer) { clearTimeout(chordTimer); chordTimer = null; }

  /* ── Master — very low gain, slow rise ───────────── */
  const master = aCtx.createGain();
  master.gain.setValueAtTime(0, aCtx.currentTime);
  /* Slow breath-in over 8 seconds — barely noticeable on arrival */
  master.gain.linearRampToValueAtTime(0.28, aCtx.currentTime + 8);
  master.connect(aCtx.destination);
  mNodes.push(master);

  /* ── Warm low-pass — rolls off everything harsh ──── */
  const lp = aCtx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 600;
  lp.Q.value = 0.4;
  lp.connect(master);

  /* ── Simple convolution reverb — creates space ───── */
  const revSecs = 5;
  const revBuf = aCtx.createBuffer(2, aCtx.sampleRate * revSecs, aCtx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = revBuf.getChannelData(ch);
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3.5);
    }
  }
  const reverb = aCtx.createConvolver();
  reverb.buffer = revBuf;
  const wetG = aCtx.createGain();
  wetG.gain.value = 0.55;   /* High reverb ratio = more "room", less directness */
  reverb.connect(wetG);
  wetG.connect(master);

  /*
    Open, non-cinematic intervals:
    Perfect 5ths and 4ths only — no thirds, no minor chords.
    These feel spacious, not emotional.
    Two notes maximum per "chord". Long rests between.
  */
  const pairs = [
    [130.81, 196.00],   /* C3 + G3 — open 5th */
    [146.83, 220.00],   /* D3 + A3 — open 5th */
    [110.00, 164.81],   /* A2 + E3 — open 5th */
    [123.47, 185.00],   /* B2 + F#3 — open 5th */
    [130.81, null],     /* single note — just C3 alone */
    [110.00, null],     /* single note — just A2 alone */
  ];

  let pi = 0;

  function playPair() {
    if (!mOn) return;
    const pair = pairs[pi++ % pairs.length];
    const now = aCtx.currentTime;
    const noteDur = 8;   /* each note sustains 8 seconds */

    pair.forEach(freq => {
      if (!freq) return;
      const o = aCtx.createOscillator();
      const g = aCtx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;

      /* Very slow attack/release — no percussive quality */
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.18, now + 3.5);  /* 3.5s attack */
      g.gain.linearRampToValueAtTime(0.12, now + 5.5);
      g.gain.linearRampToValueAtTime(0, now + noteDur);

      o.connect(g);
      g.connect(lp);
      g.connect(reverb);
      o.start(now);
      o.stop(now + noteDur + 0.1);
      mNodes.push(o);
    });

    /* Long gap between pairs — silence is part of the texture */
    const gap = 9000 + Math.random() * 4000;   /* 9–13 seconds between events */
    chordTimer = setTimeout(playPair, gap);
  }

  /* ── Shimmer — very faint high partial, barely there */
  function addShimmer() {
    if (!mOn) return;
    const freq = [523.25, 659.25, 783.99][Math.floor(Math.random() * 3)]; /* C5, E5, G5 */
    const o = aCtx.createOscillator();
    const g = aCtx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, aCtx.currentTime);
    g.gain.linearRampToValueAtTime(0.025, aCtx.currentTime + 2);
    g.gain.linearRampToValueAtTime(0, aCtx.currentTime + 7);
    o.connect(g);
    g.connect(reverb);  /* only through reverb, not direct — very diffuse */
    o.start();
    o.stop(aCtx.currentTime + 7.5);
    mNodes.push(o);
    const nextShimmer = 14000 + Math.random() * 8000;  /* 14–22s between shimmers */
    chordTimer = setTimeout(addShimmer, nextShimmer);
  }

  /* ── Vinyl room noise — almost subliminal ─────────── */
  const nBuf = aCtx.createBuffer(1, aCtx.sampleRate * 4, aCtx.sampleRate);
  const nd = nBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * 0.008;
  const noise = aCtx.createBufferSource();
  noise.buffer = nBuf;
  noise.loop = true;
  const nlp = aCtx.createBiquadFilter();
  nlp.type = 'bandpass';
  nlp.frequency.value = 200;
  nlp.Q.value = 0.5;
  const ng = aCtx.createGain();
  ng.gain.value = 0.03;
  noise.connect(nlp);
  nlp.connect(ng);
  ng.connect(master);
  noise.start();
  mNodes.push(noise);

  /* Start with a short silence before anything plays */
  chordTimer = setTimeout(playPair, 2000);
  setTimeout(addShimmer, 6000);
}

function toggleMusic() {
  const b = document.getElementById('musicBtn');
  if (!mOn) {
    mOn = true;
    buildMusic();
    b.textContent = '♬ on';
    b.style.color = '#e8d98a';
    b.style.borderColor = 'rgba(232,217,138,0.36)';
  } else {
    mOn = false;
    if (chordTimer) { clearTimeout(chordTimer); chordTimer = null; }
    /* Fade out over 2s before killing nodes */
    if (aCtx) {
      const fadeOut = aCtx.createGain();
      fadeOut.gain.setValueAtTime(1, aCtx.currentTime);
      fadeOut.gain.linearRampToValueAtTime(0, aCtx.currentTime + 2);
    }
    setTimeout(() => {
      mNodes.forEach(n => { try { n.stop(); } catch (e) {} });
      mNodes = [];
    }, 2200);
    b.textContent = '♩ off';
    b.style.color = '#5a5238';
    b.style.borderColor = 'rgba(232,217,138,0.12)';
  }
}
