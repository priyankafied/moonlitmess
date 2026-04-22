let aCtx = null, mOn = false, mNodes = [], master = null;

function buildMusic() {
  if (!aCtx) aCtx = new (window.AudioContext || window.webkitAudioContext)();

  // stop existing
  mNodes.forEach(n => { try { n.stop(); } catch (e) {} });
  mNodes = [];

  // 🎚 MASTER (start silent)
  master = aCtx.createGain();
  master.gain.value = 0;
  master.connect(aCtx.destination);
  mNodes.push(master);

  // 🎛 FILTER
  const lp = aCtx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 900;
  lp.Q.value = 0.7;
  lp.connect(master);

  // 🎧 STEREO BUS
  const panner = aCtx.createStereoPanner();
  panner.pan.value = 0;
  panner.connect(lp);

  // 🎼 CHORDS
  const chords = [
    [130.81, 164.81, 196,    246.94],
    [146.83, 185,    220,    277.18],
    [110,    138.59, 164.81, 207.65],
    [123.47, 155.56, 185,    233.08]
  ];

  let ci = 0;

  function playChord() {
    if (!mOn) return;

    chords[ci++ % chords.length].forEach((f, i) => {
      const o = aCtx.createOscillator();
      const g = aCtx.createGain();
      const pan = aCtx.createStereoPanner();

      o.type = 'sine';
      o.frequency.value = f;

      // slight detune (human feel)
      o.detune.value = (Math.random() - 0.5) * 6;

      // stereo spread
      pan.pan.value = (i - 1.5) * 0.3;

      // envelope (slow + soft)
      g.gain.setValueAtTime(0, aCtx.currentTime);
      g.gain.linearRampToValueAtTime(0.16, aCtx.currentTime + 2.5);
      g.gain.linearRampToValueAtTime(0.09, aCtx.currentTime + 5.5);
      g.gain.linearRampToValueAtTime(0,    aCtx.currentTime + 9);

      o.connect(g);
      g.connect(pan);
      pan.connect(panner);

      o.start();
      o.stop(aCtx.currentTime + 10);

      mNodes.push(o);
    });

    // organic timing
    setTimeout(playChord, 5200 + Math.random() * 900);
  }

  // 🌫 NOISE (alive layer)
  const buf = aCtx.createBuffer(1, aCtx.sampleRate * 2, aCtx.sampleRate);
  const bd  = buf.getChannelData(0);

  for (let i = 0; i < bd.length; i++) {
    bd[i] = (Math.random() * 2 - 1) * 0.02;
  }

  const noise = aCtx.createBufferSource();
  noise.buffer = buf;
  noise.loop = true;

  const ng = aCtx.createGain();
  ng.gain.value = 0.03;

  noise.connect(ng);
  ng.connect(panner);
  noise.start();

  // breathing effect
  function breatheNoise() {
    if (!mOn) return;
    ng.gain.linearRampToValueAtTime(0.055, aCtx.currentTime + 3);
    ng.gain.linearRampToValueAtTime(0.025, aCtx.currentTime + 6);
    setTimeout(breatheNoise, 6000);
  }

  breatheNoise();
  mNodes.push(noise);

  // start chords
  playChord();

  // 🎬 CINEMATIC FADE-IN
  let vol = 0;

  const isMobile = /iPhone|Android/i.test(navigator.userAgent);
  const target = isMobile ? 0.42 : 0.28;

  const fade = setInterval(() => {
    if (vol < target) {
      vol += 0.01;
      master.gain.value = vol * vol; // smooth curve
    } else {
      clearInterval(fade);
    }
  }, 120);
}

function stopMusic() {
  if (!master) return;

  let vol = master.gain.value;

  const fade = setInterval(() => {
    if (vol > 0.01) {
      vol -= 0.02;
      master.gain.value = vol * vol;
    } else {
      mNodes.forEach(n => { try { n.stop(); } catch (e) {} });
      mNodes = [];
      clearInterval(fade);
    }
  }, 100);
}

function toggleMusic() {
  const b = document.getElementById('musicBtn');

  if (!mOn) {
    mOn = true;

    if (aCtx && aCtx.state === 'suspended') {
      aCtx.resume();
    }

    buildMusic();

    b.textContent = '♬ on';
    b.style.color = '#e8d98a';
    b.style.borderColor = 'rgba(232,217,138,0.36)';
  } else {
    mOn = false;
    stopMusic();

    b.textContent = '♩ off';
    b.style.color = '#5a5238';
    b.style.borderColor = 'rgba(232,217,138,0.12)';
  }
}
