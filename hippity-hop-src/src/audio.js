// Original boom-bap beat and one-shots. Nothing is sampled from a record.
export function createAudio() {
  let ctx = null;
  let master = null;
  let music = null;
  let sfx = null;
  let noise = null;
  let started = false;
  let muted = false;
  let timer = 0;
  let step = 0;
  let nextTime = 0;
  const bpm = 93;

  try {
    muted = localStorage.getItem('hippity-hop-mute') === '1';
  } catch {
    muted = false;
  }

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.knee.value = 16;
    comp.ratio.value = 2.6;
    comp.attack.value = 0.004;
    comp.release.value = 0.16;
    music = ctx.createGain();
    music.gain.value = 0.62;
    sfx = ctx.createGain();
    sfx.gain.value = 0.85;
    music.connect(comp);
    sfx.connect(comp);
    comp.connect(master);
    master.connect(ctx.destination);
    const len = ctx.sampleRate * 1;
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }

  function envGain(t, peak, dur, dest) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(dest);
    return g;
  }

  function kick(t, vel = 1) {
    const o = ctx.createOscillator();
    const g = envGain(t, 0.9 * vel, 0.22, music);
    o.type = 'sine';
    o.frequency.setValueAtTime(168, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.09);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.24);
    const click = ctx.createBufferSource();
    click.buffer = noise;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1400;
    const cg = envGain(t, 0.18 * vel, 0.03, music);
    click.connect(hp);
    hp.connect(cg);
    click.start(t);
    click.stop(t + 0.04);
  }

  function snare(t) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1900;
    bp.Q.value = 0.7;
    const g = envGain(t, 0.48, 0.16, music);
    src.connect(bp);
    bp.connect(g);
    src.start(t);
    src.stop(t + 0.18);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(196, t);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
    const og = envGain(t, 0.16, 0.09, music);
    o.connect(og);
    o.start(t);
    o.stop(t + 0.1);
  }

  function hat(t, open) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = open ? 6200 : 7600;
    const g = envGain(t, open ? 0.16 : 0.09, open ? 0.09 : 0.032, music);
    src.connect(hp);
    hp.connect(g);
    src.start(t);
    src.stop(t + (open ? 0.1 : 0.04));
  }

  function bass(t, freq) {
    if (!freq) return;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(freq, t);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, t);
    filter.frequency.exponentialRampToValueAtTime(90, t + 0.16);
    const g = envGain(t, 0.34, 0.2, music);
    o.connect(filter);
    filter.connect(g);
    o.start(t);
    o.stop(t + 0.22);
  }

  const bassLine = [55, 0, 0, 55, 0, 0, 49, 0, 65.41, 0, 0, 55, 0, 49, 41.2, 0];

  function schedule() {
    if (!ctx) return;
    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.04;
    const horizon = ctx.currentTime + 0.18;
    const sixteenth = 60 / bpm / 4;
    while (nextTime < horizon) {
      const swing = step % 2 === 1 ? 0.02 : 0;
      const t = nextTime + swing;
      if (!muted) {
        const s = step % 16;
        if (s === 0 || s === 8) kick(t, 1);
        else if (s === 10) kick(t, 0.45);
        if (s === 4 || s === 12) snare(t);
        if (s % 2 === 0) hat(t, s === 14);
        else hat(t, false);
        bass(t, bassLine[s]);
      }
      step++;
      nextTime += sixteenth;
    }
    timer = window.setTimeout(schedule, 40);
  }

  function tone(freq, dur, type, peak, delay = 0) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    const g = envGain(t, peak, dur, sfx);
    o.connect(g);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noiseBurst(dur, freq, peak, type = 'lowpass') {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    const g = envGain(t, peak, dur, sfx);
    src.connect(f);
    f.connect(g);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  return {
    get muted() {
      return muted;
    },
    unlock() {
      ensure();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      if (!started) {
        started = true;
        nextTime = ctx.currentTime + 0.06;
        schedule();
      }
    },
    toggle() {
      ensure();
      muted = !muted;
      if (ctx && master) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.02);
      try {
        localStorage.setItem('hippity-hop-mute', muted ? '1' : '0');
      } catch {
        /* private mode */
      }
      return muted;
    },
    hop() {
      tone(340, 0.09, 'triangle', 0.16);
      tone(520, 0.07, 'sine', 0.06, 0.02);
    },
    burrow() {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(210, t);
      o.frequency.exponentialRampToValueAtTime(48, t + 0.22);
      const g = envGain(t, 0.28, 0.26, sfx);
      o.connect(g);
      o.start(t);
      o.stop(t + 0.28);
      noiseBurst(0.2, 400, 0.12);
    },
    coin() {
      tone(880, 0.08, 'sine', 0.14);
      tone(1320, 0.12, 'sine', 0.11, 0.07);
    },
    carrot() {
      tone(620, 0.08, 'triangle', 0.12);
      tone(930, 0.1, 'triangle', 0.08, 0.06);
    },
    crash() {
      noiseBurst(0.42, 700, 0.42);
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(110, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.28);
      const g = envGain(t, 0.4, 0.34, sfx);
      o.connect(g);
      o.start(t);
      o.stop(t + 0.36);
      if (music) {
        music.gain.setTargetAtTime(0.2, t, 0.02);
        music.gain.setTargetAtTime(0.62, t + 0.45, 0.18);
      }
    },
    cheer() {
      tone(523, 0.08, 'square', 0.05);
      tone(659, 0.09, 'square', 0.05, 0.07);
      tone(784, 0.12, 'square', 0.05, 0.14);
    },
  };
}
