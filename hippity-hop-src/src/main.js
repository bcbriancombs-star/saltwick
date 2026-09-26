import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { createAudio } from './audio.js';
import { createRabbit } from './rabbit.js';
import { createWorld } from './world.js';
import { createObstacles, BURROW_TIME, BURROW_CD } from './obstacles.js';
import { createParticles } from './particles.js';

const GRAV = 28;
const HOP_V = 10.2;
const AIR_V = 5.6;
const MAX_Y = 2.04;

const MILESTONES = [
  [1, 'Hop hop!'],
  [3, 'Look at the feet!'],
  [5, 'Ears up!'],
  [8, 'Burrow boss!'],
  [12, 'Chain check!'],
  [16, 'Sneaker science!'],
  [20, 'Still crispy!'],
  [25, 'Midnight meter!'],
  [30, 'Block blessing!'],
  [36, 'Gold feet!'],
  [42, 'No brakes!'],
  [50, 'Carrot karma!'],
  [60, "City can't catch you!"],
  [75, 'Legend of the lane!'],
  [100, 'Hundred club!'],
];

const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    darkness: { value: 0.72 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float darkness;
    varying vec2 vUv;
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec2 uv = (vUv - vec2(0.5, 0.46)) * vec2(0.92, 1.08);
      float dist = dot(uv, uv);
      float vig = smoothstep(0.92, 0.28, dist);
      texel.rgb = mix(texel.rgb * (1.0 - darkness), texel.rgb, vig);
      gl_FragColor = texel;
    }
  `,
};

const audio = createAudio();
const G = {
  mode: 'title',
  score: 0,
  cleared: 0,
  best: readBest(),
  speed: 3.4,
  rabbitY: 0,
  vy: 0,
  burrowT: 0,
  burrowCd: 0,
  diving: false,
  squash: 1,
  shake: 0,
  newBest: false,
  announced: new Set(),
  tippedBurrow: false,
  tippedCoin: false,
};

const els = {
  title: document.getElementById('title'),
  over: document.getElementById('over'),
  score: document.getElementById('score'),
  bestline: document.getElementById('bestline'),
  titleBest: document.getElementById('title-best'),
  finalScore: document.getElementById('final-score'),
  finalBest: document.getElementById('final-best'),
  finalCleared: document.getElementById('final-cleared'),
  newBest: document.getElementById('new-best'),
  callout: document.getElementById('callout'),
  floater: document.getElementById('floater'),
  mute: document.getElementById('mute'),
  burrow: document.getElementById('burrow'),
  burrowFill: document.getElementById('burrow-fill'),
  flash: document.getElementById('flash'),
  retry: document.getElementById('retry'),
};

let renderer;
let composer;
let bloomPass;
let camera;
let scene;
let world;
let rabbit;
let obstacles;
let dirt;
let sparks;
let dust;
let ring;
let useBloom = true;
let quality = 2;
let qualityGrace = 3;
let fpsFrames = 0;
let fpsTime = 0;
let badStreak = 0;

try {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
    stencil: false,
    alpha: false,
  });
} catch {
  showFatal();
}
if (!renderer || !renderer.getContext()) showFatal();

renderer.setClearColor(0x07060f, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.id = 'game';
document.body.prepend(renderer.domElement);

scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(52, 1, 0.12, 260);
scene.add(camera);
const hero = new THREE.PointLight(0xfff1d6, 46, 12, 2);
hero.position.set(1.6, 2.5, 2.4);
scene.add(hero);

world = createWorld(scene, renderer);
rabbit = createRabbit(scene);
obstacles = createObstacles(scene);
dirt = createParticles(scene, 0x6b4423, 70, 0.16);
sparks = createParticles(scene, 0xffd56a, 40, 0.12);
dust = createParticles(scene, 0xcbbba0, 40, 0.11);

ring = new THREE.Mesh(
  new THREE.RingGeometry(0.18, 0.26, 24),
  new THREE.MeshBasicMaterial({ color: 0xe7d7c2, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
);
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.035;
scene.add(ring);
let ringLife = 0;

const renderPass = new RenderPass(scene, camera);
bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.18, 0.32, 0.94);
const vignettePass = new ShaderPass(VignetteShader);
const outputPass = new OutputPass();
composer = new EffectComposer(renderer);
composer.addPass(renderPass);
composer.addPass(bloomPass);
composer.addPass(vignettePass);
composer.addPass(outputPass);

function showFatal() {
  const title = document.getElementById('title');
  if (title) {
    title.style.display = 'flex';
    const tag = title.querySelector('.tag');
    if (tag) tag.textContent = 'WebGL is unavailable on this browser.';
  }
  throw new Error('WebGL unavailable');
}

function readBest() {
  try {
    return Number(localStorage.getItem('hippity-hop-best')) || 0;
  } catch {
    return 0;
  }
}

function writeBest(n) {
  try {
    localStorage.setItem('hippity-hop-best', String(n));
  } catch {
    /* ignore quota / private mode */
  }
}

function portrait() {
  return window.innerHeight >= window.innerWidth * 0.92;
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const mobile = Math.min(w, h) < 760;
  let dpr = mobile ? Math.min(window.devicePixelRatio || 1, 1.25) : Math.min(window.devicePixelRatio || 1, 1.6);
  if (quality === 1) dpr = Math.min(dpr, 1);
  if (quality === 0) dpr = 1;
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  composer.setPixelRatio(dpr);
  composer.setSize(w, h);
  camera.aspect = w / Math.max(1, h);
  camera.fov = portrait() ? 66 : 46;
  camera.updateProjectionMatrix();
  renderer.shadowMap.enabled = quality > 0;
  world.setShadowQuality(quality);
  useBloom = quality > 0;
}

function dropQuality() {
  if (quality <= 0) return;
  quality -= 1;
  resize();
}

let camX = 0.55;
let camY = 2.95;
let camZ = 4.5;

function updateCamera(dt) {
  const p = portrait();
  const tx = p ? 0.55 : 3.1;
  const ty = (p ? 2.95 : 2.05) + Math.min(0.18, G.rabbitY * 0.08);
  const tz = p ? 4.5 : 3.8;
  const k = 1 - Math.exp(-dt * 4);
  camX += (tx - camX) * k;
  camY += (ty - camY) * k;
  camZ += (tz - camZ) * k;
  G.shake *= Math.exp(-dt * 7);
  const sx = (Math.random() - 0.5) * G.shake * 0.22;
  const sy = (Math.random() - 0.5) * G.shake * 0.16;
  camera.position.set(camX + sx, camY + sy, camZ);
  camera.lookAt(0, 0.78 + G.rabbitY * 0.04, p ? -6.2 : -3.2);
}

function doHop() {
  if (G.mode !== 'play' || G.burrowT > 0) return false;
  if (G.rabbitY >= MAX_Y - 0.12) return false;
  const boost = G.rabbitY < 0.05 ? HOP_V : AIR_V;
  G.vy = Math.min(Math.max(G.vy, 0) * 0.25 + boost, HOP_V + 0.8);
  const maxV = Math.sqrt(Math.max(0, 2 * GRAV * (MAX_Y - G.rabbitY)));
  if (G.vy > maxV) G.vy = maxV;
  G.squash = 1.12;
  audio.hop();
  dust.emit(0, 0.05, 0.1, 6, 2.2, 0.8);
  if (navigator.vibrate) navigator.vibrate(10);
  return true;
}

function doBurrow() {
  if (G.mode !== 'play') return false;
  if (G.burrowT > 0 || G.burrowCd > 0) {
    els.burrow.classList.remove('deny');
    void els.burrow.offsetWidth;
    els.burrow.classList.add('deny');
    return false;
  }
  audio.burrow();
  dirt.emit(0, 0.1, 0.15, 18, 3.4, 1.1);
  if (navigator.vibrate) navigator.vibrate(16);
  if (G.rabbitY <= 0.4) {
    G.vy = 0;
    G.rabbitY = 0;
    G.diving = false;
    beginBurrow();
  } else {
    G.diving = true;
    G.vy = Math.min(G.vy, -22);
  }
  if (!G.tippedBurrow) {
    G.tippedBurrow = true;
    callout('Under the street!');
  }
  return true;
}

function beginBurrow() {
  G.burrowT = BURROW_TIME;
  G.diving = false;
  G.vy = 0;
  G.rabbitY = 0;
  dirt.emit(0, 0.15, 0.2, 22, 4.2, 1.3);
}

function onLand(impact) {
  G.squash = Math.max(0.72, 1 - impact / 40);
  G.shake = Math.min(1, impact / 16);
  dust.emit(0, 0.08, 0.15, 10, 2.8, 1);
  ringLife = 0.28;
  ring.scale.setScalar(0.4);
  ring.material.opacity = 0.7;
}

function addScore(n, label) {
  G.score += n;
  floatText(label);
  renderHud();
}

function onClear(cls) {
  G.cleared += 1;
  addScore(1, '+1');
  for (const [at, line] of MILESTONES) {
    if (G.cleared === at && !G.announced.has(at)) {
      G.announced.add(at);
      callout(line);
      audio.cheer();
    }
  }
  if (cls === 'solid' && G.cleared % 7 === 0) callout('Burrow boss!');
}

function onPickup(kind) {
  if (kind === 'carrot') {
    addScore(3, '+3');
    audio.carrot();
    sparks.emit(0, G.rabbitY + 0.7, 0.2, 10, 2.4, 1.4);
  } else {
    addScore(5, '+5');
    audio.coin();
    sparks.emit(0, G.rabbitY + 0.8, 0.2, 12, 2.8, 1.5);
  }
  if (!G.tippedCoin) {
    G.tippedCoin = true;
    callout('Pocket change!');
  }
}

function die() {
  if (G.mode !== 'play') return;
  G.mode = 'dead';
  document.body.dataset.mode = 'dead';
  G.vy = 6;
  G.shake = 1;
  audio.crash();
  sparks.emit(0, 0.8, 0.2, 16, 4, 1.2);
  dirt.emit(0, 0.4, 0.2, 12, 3, 1);
  els.flash.classList.remove('hit');
  void els.flash.offsetWidth;
  els.flash.classList.add('hit');
  if (navigator.vibrate) navigator.vibrate([24, 30, 40]);
  G.newBest = G.score > G.best;
  if (G.newBest) {
    G.best = G.score;
    writeBest(G.best);
  }
  els.finalScore.textContent = String(G.score);
  els.finalBest.textContent = `BEST ${G.best}`;
  els.finalCleared.textContent = `${G.cleared} BLOCK${G.cleared === 1 ? '' : 'S'} CLEARED`;
  els.newBest.hidden = !G.newBest;
  els.over.hidden = false;
  els.burrow.hidden = true;
}

function targetSpeed() {
  if (G.mode === 'title') return 3.5;
  if (G.mode === 'dead') return 0;
  return Math.min(17.4, 9.5 + G.cleared * 0.16);
}

function resetRun() {
  G.mode = 'play';
  G.score = 0;
  G.cleared = 0;
  G.rabbitY = 0;
  G.vy = 0;
  G.burrowT = 0;
  G.burrowCd = 0;
  G.diving = false;
  G.squash = 1;
  G.shake = 0;
  G.newBest = false;
  G.announced = new Set();
  G.tippedBurrow = false;
  G.tippedCoin = false;
  G.speed = 9.5;
  obstacles.reset(G.speed);
  els.over.hidden = true;
  els.title.classList.add('hidden');
  els.burrow.hidden = false;
  document.body.dataset.mode = 'play';
  renderHud();
  callout('Go, Zig!');
}

function startGame() {
  audio.unlock();
  resetRun();
}

function tryRestart() {
  if (G.mode !== 'dead') return;
  audio.unlock();
  resetRun();
}

function renderHud() {
  els.score.textContent = String(G.score);
  els.bestline.textContent = G.best > 0 ? `BEST ${G.best}` : '';
  els.score.classList.remove('pop');
  void els.score.offsetWidth;
  els.score.classList.add('pop');
}

function callout(text) {
  els.callout.textContent = text;
  els.callout.classList.remove('show');
  void els.callout.offsetWidth;
  els.callout.classList.add('show');
}

function floatText(text) {
  els.floater.textContent = text;
  els.floater.classList.remove('go');
  void els.floater.offsetWidth;
  els.floater.classList.add('go');
}

function updateMuteIcon() {
  els.mute.classList.toggle('is-muted', audio.muted);
  els.mute.setAttribute('aria-label', audio.muted ? 'Unmute' : 'Mute');
  els.mute.setAttribute('aria-pressed', audio.muted ? 'true' : 'false');
}

function updateBurrowButton() {
  if (G.mode !== 'play') return;
  const cooling = G.burrowCd > 0 || G.burrowT > 0;
  els.burrow.classList.toggle('cool', cooling);
  const pct = G.burrowT > 0 ? 100 : Math.max(0, (1 - G.burrowCd / BURROW_CD) * 100);
  els.burrowFill.style.height = `${pct}%`;
  els.burrow.querySelector('b').textContent = cooling ? 'WAIT' : 'BURROW';
}

function sim(dt) {
  const goal = targetSpeed();
  const blend = G.mode === 'dead' ? 2.4 : G.mode === 'play' ? 2 : 1;
  G.speed += (goal - G.speed) * Math.min(1, dt * blend);

  if (G.mode === 'play') {
    if (G.burrowT > 0) {
      G.burrowT -= dt;
      G.rabbitY = 0;
      G.vy = 0;
      if (Math.random() < dt * 18) dirt.emit((Math.random() - 0.5) * 0.4, 0.12, 0.2, 1, 2.2, 1);
      if (G.burrowT <= 0) {
        G.burrowT = 0;
        G.burrowCd = BURROW_CD;
        G.squash = 0.8;
        dirt.emit(0, 0.2, 0.15, 16, 3.5, 1.4);
        G.shake = Math.max(G.shake, 0.25);
      }
    } else {
      if (G.burrowCd > 0) G.burrowCd = Math.max(0, G.burrowCd - dt);
      G.vy -= GRAV * dt;
      G.rabbitY += G.vy * dt;
      if (G.rabbitY <= 0) {
        const impact = -G.vy;
        G.rabbitY = 0;
        G.vy = 0;
        if (G.diving) beginBurrow();
        else if (impact > 5) onLand(impact);
      }
      if (G.mode === 'play' && G.rabbitY < 0.05 && Math.random() < dt * 8) {
        dust.emit((Math.random() - 0.5) * 0.3, 0.05, 0.35, 1, 1.4, 0.6);
      }
    }
    G.squash += (1 - G.squash) * Math.min(1, dt * 8);
  } else if (G.mode === 'dead') {
    G.vy -= GRAV * dt;
    G.rabbitY = Math.max(0, G.rabbitY + G.vy * dt);
  }

  world.update(dt, G.speed);
  obstacles.update(dt, {
    speed: G.speed,
    mode: G.mode,
    rabbitY: G.rabbitY,
    burrow: G.burrowT > 0,
    cleared: G.cleared,
    onCrash: die,
    onClear,
    onPickup,
  });
  rabbit.update(dt, {
    mode: G.mode,
    y: G.rabbitY,
    vy: G.vy,
    burrowT: G.burrowT,
    burrowCd: G.burrowCd,
    diving: G.diving,
    speed: G.speed,
    squash: G.squash,
  });
  dirt.update(dt);
  sparks.update(dt);
  dust.update(dt);
  if (ringLife > 0) {
    ringLife -= dt;
    const k = 1 - ringLife / 0.28;
    ring.scale.setScalar(0.4 + k * 2.6);
    ring.material.opacity = Math.max(0, 0.65 * (1 - k));
  }
  updateBurrowButton();
}

function watchFps(dt) {
  if (qualityGrace > 0) {
    qualityGrace -= dt;
    return;
  }
  fpsTime += dt;
  fpsFrames += 1;
  if (fpsTime < 1) return;
  const fps = fpsFrames / fpsTime;
  fpsFrames = 0;
  fpsTime = 0;
  if (fps < 30) badStreak += 1;
  else badStreak = 0;
  if (badStreak >= 2) {
    dropQuality();
    badStreak = 0;
  }
}

let ptr = null;
function onPointerDown(e) {
  if (e.button != null && e.button !== 0) return;
  audio.unlock();
  const t = e.target;
  if (t.closest && t.closest('#mute')) {
    e.preventDefault();
    audio.toggle();
    updateMuteIcon();
    return;
  }
  if (G.mode === 'title') {
    e.preventDefault();
    startGame();
    return;
  }
  if (G.mode === 'dead') {
    if (t.closest && t.closest('#retry')) {
      e.preventDefault();
      tryRestart();
    }
    return;
  }
  e.preventDefault();
  if (t.closest && t.closest('#burrow')) {
    doBurrow();
    return;
  }
  if (ptr) return;
  ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, swiped: false, hopped: false, timer: 0 };
  ptr.timer = window.setTimeout(() => {
    if (ptr && !ptr.swiped) {
      doHop();
      ptr.hopped = true;
    }
  }, 46);
}

function onPointerMove(e) {
  if (!ptr || e.pointerId !== ptr.id || G.mode !== 'play') return;
  const dy = e.clientY - ptr.y;
  const dx = e.clientX - ptr.x;
  if (!ptr.swiped && dy > 46 && dy > Math.abs(dx) * 1.15) {
    ptr.swiped = true;
    clearTimeout(ptr.timer);
    doBurrow();
  }
}

function onPointerUp(e) {
  if (!ptr || e.pointerId !== ptr.id) return;
  clearTimeout(ptr.timer);
  if (G.mode === 'play' && !ptr.swiped && !ptr.hopped) doHop();
  ptr = null;
}

window.addEventListener('pointerdown', onPointerDown, { passive: false });
window.addEventListener('pointermove', onPointerMove, { passive: false });
window.addEventListener('pointerup', onPointerUp, { passive: false });
window.addEventListener('pointercancel', onPointerUp, { passive: false });
window.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  if (k === ' ' || k === 'arrowup' || k === 'arrowdown' || k === 's' || k === 'w' || k === 'm' || k === 'enter') {
    e.preventDefault();
  }
  audio.unlock();
  if (k === 'm') {
    audio.toggle();
    updateMuteIcon();
    return;
  }
  if (G.mode === 'title' && (k === ' ' || k === 'arrowup' || k === 'w' || k === 'enter')) {
    startGame();
    return;
  }
  if (G.mode === 'dead' && (k === ' ' || k === 'enter')) {
    tryRestart();
    return;
  }
  if (G.mode !== 'play') return;
  if (k === 'arrowdown' || k === 's') doBurrow();
  else if (k === ' ' || k === 'arrowup' || k === 'w') doHop();
});

window.addEventListener('resize', resize);

document.body.dataset.mode = G.mode;
if (els.titleBest) els.titleBest.textContent = G.best > 0 ? `BEST ${G.best}` : 'NO BEST YET';
updateMuteIcon();
renderHud();
resize();

let last = performance.now();
let acc = 0;
const STEP = 1 / 60;

function frame(now) {
  const raw = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!document.hidden) {
    acc += raw;
    if (acc > 0.12) acc = 0.12;
    while (acc >= STEP) {
      sim(STEP);
      acc -= STEP;
    }
    watchFps(raw);
  } else {
    acc = 0;
  }
  updateCamera(raw);
  if (useBloom) composer.render();
  else renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__HIP = {
  start: startGame,
  hop: doHop,
  burrow: doBurrow,
  restart: tryRestart,
  get mode() {
    return G.mode;
  },
  get score() {
    return G.score;
  },
  get cleared() {
    return G.cleared;
  },
  get y() {
    return G.rabbitY;
  },
  get burrowT() {
    return G.burrowT;
  },
  get speed() {
    return G.speed;
  },
  get quality() {
    return quality;
  },
  obstacles() {
    return obstacles.snapshot();
  },
};
