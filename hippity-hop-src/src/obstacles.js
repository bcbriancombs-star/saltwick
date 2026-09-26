import * as THREE from 'three';

const CLS = {
  cone: 'hop',
  hydrant: 'hop',
  meter: 'hop',
  sawhorse: 'hop',
  van: 'solid',
  dumpster: 'solid',
  fence: 'solid',
  drone: 'over',
  sign: 'over',
  coin: 'pickup',
  coinHigh: 'pickup',
  carrot: 'pickup',
};

const SCRIPT = [
  { kind: 'cone', label: 'HOP' },
  { kind: 'cone', label: 'HOP' },
  { kind: 'coin' },
  { kind: 'drone', label: 'STAY LOW' },
  { kind: 'hydrant', label: 'HOP' },
  { kind: 'coinHigh' },
  { kind: 'van', label: 'BURROW' },
  { kind: 'carrot' },
  { kind: 'sign', label: 'STAY LOW' },
  { kind: 'sawhorse' },
  { kind: 'dumpster', label: 'BURROW' },
];

const LABEL_COLOR = { HOP: '#ffd56a', BURROW: '#3ee0c5', 'STAY LOW': '#8eecff' };

export const BURROW_TIME = 0.66;
export const BURROW_CD = 0.92;

export function createObstacles(scene) {
  const mats = makeMats();
  const pools = {
    cone: fill(5, () => cone(mats)),
    hydrant: fill(4, () => hydrant(mats)),
    meter: fill(3, () => meter(mats)),
    sawhorse: fill(3, () => sawhorse(mats)),
    van: fill(3, () => van(mats)),
    dumpster: fill(3, () => dumpster(mats)),
    fence: fill(3, () => fence(mats)),
    drone: fill(4, () => drone(mats)),
    sign: fill(3, () => gantry(mats)),
    coin: fill(5, () => coin(mats, 0.62)),
    coinHigh: fill(4, () => coin(mats, 1.55)),
    carrot: fill(4, () => carrot(mats)),
  };
  const all = Object.values(pools).flat();
  for (const o of all) scene.add(o.group);

  let pendingZ = -40;
  let lastKind = null;
  let queued = null;
  let scriptI = 0;
  let time = 0;
  let runCleared = 0;

  function acquire(kind) {
    const list = pools[kind];
    for (const o of list) if (!o.active) return o;
    let best = list[0];
    for (const o of list) if (o.group.position.z > best.group.position.z) best = o;
    best.active = false;
    best.group.visible = false;
    return best;
  }

  function roll(prev) {
    if (scriptI < SCRIPT.length) return SCRIPT[scriptI++];
    let kind = weighted(runCleared);
    if (prev && CLS[prev] === 'solid' && CLS[kind] === 'solid') kind = Math.random() < 0.5 ? 'cone' : 'coin';
    return { kind };
  }

  function ensureQueued() {
    if (!queued) queued = roll(lastKind);
  }

  function spawnNext(speed) {
    ensureQueued();
    const item = queued;
    queued = null;
    const o = acquire(item.kind);
    o.active = true;
    o.scored = false;
    o.group.visible = true;
    o.group.position.z = pendingZ;
    o.group.position.x = 0;
    if (o.baseY != null) o.group.position.y = o.baseY;
    setLabel(o, item.label || null);
    lastKind = item.kind;
    ensureQueued();
    const seconds = gapSeconds(item.kind, queued.kind, runCleared);
    const dist = Math.max(7, seconds * Math.max(speed, 9));
    pendingZ -= dist;
  }

  function reset(speed) {
    for (const o of all) {
      o.active = false;
      o.scored = false;
      o.group.visible = false;
      o.group.position.z = 30;
      setLabel(o, null);
    }
    pendingZ = -17;
    lastKind = null;
    queued = null;
    scriptI = 0;
    runCleared = 0;
    let guard = 0;
    while (pendingZ > -36 && guard++ < 16) spawnNext(speed);
  }

  function update(dt, ctx) {
    time += dt;
    runCleared = ctx.cleared;
    if (ctx.mode === 'play') {
      pendingZ += ctx.speed * dt;
      let guard = 0;
      while (pendingZ > -36 && guard++ < 4) spawnNext(ctx.speed);
    }

    const playerZ = 0.35;
    const y0 = ctx.rabbitY + 0.18;
    const y1 = ctx.rabbitY + 1.3;
    const z0 = playerZ - 0.3;
    const z1 = playerZ + 0.3;
    let crashed = false;

    for (const o of all) {
      if (!o.active) continue;
      o.group.position.z += ctx.speed * dt;
      if (o.tick) o.tick(dt, time);
      if (o.label) o.label.position.y = o.labelBase + Math.sin(time * 4 + o.group.position.z) * 0.06;

      if (o.group.position.z > 10) {
        o.active = false;
        o.group.visible = false;
        continue;
      }
      if (ctx.mode !== 'play') continue;

      if (o.cls === 'pickup') {
        const cy = o.group.position.y;
        const dy = ctx.rabbitY + 0.72 - cy;
        const dz = playerZ - o.group.position.z;
        if (dy * dy + dz * dz < o.radius * o.radius) {
          o.active = false;
          o.group.visible = false;
          ctx.onPickup(o.kind);
        }
        continue;
      }

      const hz0 = o.group.position.y + o.hit.y0;
      const hz1 = o.group.position.y + o.hit.y1;
      const oz0 = o.group.position.z - o.hit.halfZ;
      const oz1 = o.group.position.z + o.hit.halfZ;
      const overlap = y1 > hz0 && y0 < hz1 && z1 > oz0 && z0 < oz1;
      if (overlap && !ctx.burrow && !crashed) {
        crashed = true;
        ctx.onCrash();
      } else if (!o.scored && oz0 > playerZ + 0.15) {
        o.scored = true;
        ctx.onClear(o.cls);
      }
    }
  }

  function snapshot() {
    return all
      .filter((o) => o.active)
      .map((o) => ({
        kind: o.kind,
        cls: o.cls,
        z: Math.round(o.group.position.z * 10) / 10,
        y: Math.round(o.group.position.y * 10) / 10,
      }))
      .sort((a, b) => b.z - a.z);
  }

  return { reset, update, snapshot };
}

function gapSeconds(prev, next, cleared) {
  const pc = CLS[prev];
  const nc = CLS[next];
  const base = Math.max(0.66, 1.2 - cleared * 0.01);
  if (nc === 'pickup') return Math.max(0.58, base * 0.7);
  if (pc === 'solid' && nc === 'solid') return BURROW_TIME + BURROW_CD + 0.5;
  if (pc === 'solid') return Math.max(base, BURROW_TIME + 0.42);
  if (pc === 'hop' && nc === 'over') return 1.35;
  if (pc === 'pickup' && nc === 'over') return 1.15;
  if (pc === 'over' && nc === 'hop') return Math.max(0.75, base * 0.85);
  if (nc === 'solid') return Math.max(base, 1.2);
  return base;
}

function weighted(cleared) {
  const bag = [
    ['cone', 5],
    ['hydrant', 4],
    ['meter', 3],
    ['sawhorse', 3],
    ['carrot', 2],
    ['coin', 3],
    ['coinHigh', 2],
    ['drone', cleared > 4 ? 4 : 2],
    ['sign', cleared > 8 ? 3 : 1],
    ['van', cleared > 6 ? 3 : 1],
    ['dumpster', cleared > 8 ? 2 : 0],
    ['fence', cleared > 7 ? 2 : 0],
  ];
  let total = 0;
  for (const b of bag) total += b[1];
  let r = Math.random() * total;
  for (const [k, w] of bag) {
    r -= w;
    if (r <= 0) return k;
  }
  return 'cone';
}

function fill(n, make) {
  const list = [];
  for (let i = 0; i < n; i++) list.push(make());
  return list;
}

function setLabel(o, text) {
  if (!text) {
    if (o.label) o.label.visible = false;
    return;
  }
  if (!o.label) {
    o.label = makeLabel(text);
    o.group.add(o.label);
  } else {
    o.label.material.map = labelTexture(text);
    o.label.material.map.needsUpdate = true;
    o.label.material.needsUpdate = true;
  }
  o.label.visible = true;
  o.label.scale.set(text.length > 6 ? 2.6 : 1.8, 0.9, 1);
  o.labelBase = o.hit.y1 + 0.85;
  o.label.position.set(0, o.labelBase, 0);
}

function makeLabel(text) {
  const mat = new THREE.SpriteMaterial({ map: labelTexture(text), transparent: true, depthWrite: false });
  const s = new THREE.Sprite(mat);
  s.scale.set(text.length > 6 ? 2.6 : 1.8, 0.9, 1);
  return s;
}

const labelCache = new Map();
function labelTexture(text) {
  if (labelCache.has(text)) return labelCache.get(text);
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const g = c.getContext('2d');
  g.font = '700 92px Impact, Arial Black, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 14;
  g.strokeStyle = 'rgba(0,0,0,0.7)';
  g.strokeText(text, 256, 84);
  g.fillStyle = LABEL_COLOR[text] || '#fff';
  g.fillText(text, 256, 84);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  labelCache.set(text, tex);
  return tex;
}

function entity(kind, group, hit, extras = {}) {
  group.visible = false;
  return { kind, cls: CLS[kind], group, hit, active: false, scored: false, radius: 0.5, ...extras };
}

function makeMats() {
  const m = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05, ...opts });
  return {
    orange: m(0xff6a1a, { roughness: 0.45 }),
    white: m(0xf3f0e8, { roughness: 0.4 }),
    red: m(0xd3223a, { roughness: 0.45 }),
    silver: m(0xc5ccd4, { metalness: 0.85, roughness: 0.28 }),
    dark: m(0x1a1c24, { roughness: 0.55, metalness: 0.35 }),
    yellow: m(0xf0c43a, { roughness: 0.4, emissive: 0x5a3e08, emissiveIntensity: 0.25 }),
    green: m(0x2f6a45, { roughness: 0.7 }),
    leaf: m(0x3ecf6e, { roughness: 0.55 }),
    navy: m(0x24304a, { roughness: 0.55, metalness: 0.2 }),
    cream: m(0xe6dcc8, { roughness: 0.6 }),
    teal: m(0x1ee0c0, { roughness: 0.35, emissive: 0x064038, emissiveIntensity: 0.35 }),
    gold: m(0xffd56a, { metalness: 1, roughness: 0.22, emissive: 0x6a4810, emissiveIntensity: 0.55 }),
    carrot: m(0xff7a1a, { roughness: 0.45 }),
    drone: m(0x1b1e28, { metalness: 0.5, roughness: 0.35 }),
    cyan: m(0x2de2ff, { emissive: 0x2de2ff, emissiveIntensity: 1.6, roughness: 0.3 }),
    lightRed: m(0xff3355, { emissive: 0xff2244, emissiveIntensity: 1.4, roughness: 0.3 }),
    lightBlue: m(0x3aa0ff, { emissive: 0x2288ff, emissiveIntensity: 1.4, roughness: 0.3 }),
    stripe: m(0xf4f4f4, { roughness: 0.4 }),
    rubber: m(0x151515, { roughness: 0.9 }),
    headlamp: m(0xfff1c9, { emissive: 0xffd27a, emissiveIntensity: 1.8, roughness: 0.25 }),
  };
}

function add(parent, geo, mat, x, y, z) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function cone(mats) {
  const g = new THREE.Group();
  const body = add(g, new THREE.ConeGeometry(0.28, 0.82, 10), mats.orange, 0, 0.48, 0);
  body.castShadow = true;
  add(g, new THREE.CylinderGeometry(0.3, 0.32, 0.08, 10), mats.dark, 0, 0.05, 0);
  add(g, new THREE.TorusGeometry(0.16, 0.03, 6, 10), mats.white, 0, 0.42, 0).rotation.x = Math.PI / 2;
  return entity('cone', g, { y0: 0, y1: 0.9, halfZ: 0.32 });
}

function hydrant(mats) {
  const g = new THREE.Group();
  add(g, new THREE.CylinderGeometry(0.16, 0.18, 0.7, 10), mats.red, 0, 0.42, 0);
  add(g, new THREE.SphereGeometry(0.16, 10, 8), mats.red, 0, 0.78, 0);
  add(g, new THREE.CylinderGeometry(0.05, 0.05, 0.22, 6), mats.silver, 0, 0.96, 0);
  add(g, new THREE.CylinderGeometry(0.05, 0.05, 0.28, 6), mats.silver, 0.18, 0.48, 0).rotation.z = Math.PI / 2;
  add(g, new THREE.CylinderGeometry(0.05, 0.05, 0.28, 6), mats.silver, -0.18, 0.48, 0).rotation.z = Math.PI / 2;
  return entity('hydrant', g, { y0: 0, y1: 1.05, halfZ: 0.26 });
}

function meter(mats) {
  const g = new THREE.Group();
  add(g, new THREE.CylinderGeometry(0.04, 0.05, 0.85, 6), mats.dark, 0, 0.42, 0);
  add(g, new THREE.BoxGeometry(0.22, 0.28, 0.12), mats.yellow, 0, 0.92, 0);
  add(g, new THREE.BoxGeometry(0.12, 0.08, 0.02), mats.dark, 0, 0.94, -0.07);
  return entity('meter', g, { y0: 0, y1: 1.08, halfZ: 0.16 });
}

function sawhorse(mats) {
  const g = new THREE.Group();
  const plank = add(g, new THREE.BoxGeometry(1.35, 0.16, 0.12), mats.yellow, 0, 0.62, 0);
  plank.rotation.z = 0;
  for (const side of [-1, 1]) {
    const leg = add(g, new THREE.BoxGeometry(0.08, 0.7, 0.08), mats.dark, side * 0.48, 0.32, 0);
    leg.rotation.z = side * 0.25;
  }
  add(g, new THREE.BoxGeometry(0.7, 0.06, 0.13), mats.dark, 0, 0.62, 0);
  return entity('sawhorse', g, { y0: 0, y1: 0.78, halfZ: 0.42 });
}

function van(mats) {
  const g = new THREE.Group();
  add(g, new THREE.BoxGeometry(1.55, 1.35, 2.9), mats.cream, 0, 1.15, -0.15);
  add(g, new THREE.BoxGeometry(1.48, 0.72, 0.9), mats.navy, 0, 2.08, 0.95);
  add(g, new THREE.BoxGeometry(1.15, 0.4, 0.05), mats.dark, 0, 2.08, 1.42);
  add(g, new THREE.BoxGeometry(1.57, 0.16, 2.2), mats.teal, 0, 1.35, -0.1);
  add(g, new THREE.BoxGeometry(0.18, 0.12, 0.06), mats.headlamp, 0.4, 1.12, 1.48);
  add(g, new THREE.BoxGeometry(0.18, 0.12, 0.06), mats.headlamp, -0.4, 1.12, 1.48);
  for (const [x, z] of [[-0.62, 0.85], [0.62, 0.85], [-0.62, -1.05], [0.62, -1.05]]) {
    const w = add(g, new THREE.CylinderGeometry(0.28, 0.28, 0.18, 10), mats.rubber, x, 0.28, z);
    w.rotation.z = Math.PI / 2;
  }
  return entity('van', g, { y0: 0, y1: 2.45, halfZ: 1.6 });
}

function dumpster(mats) {
  const g = new THREE.Group();
  add(g, new THREE.BoxGeometry(1.55, 1.85, 2.05), mats.green, 0, 1.05, 0);
  const lid = add(g, new THREE.BoxGeometry(1.6, 0.12, 2.15), mats.dark, 0, 2.08, 0.05);
  lid.rotation.x = -0.18;
  add(g, new THREE.BoxGeometry(1.2, 0.85, 0.04), graffitiMat(), 0, 1.05, 1.05);
  for (const x of [-0.5, 0.5]) add(g, new THREE.CylinderGeometry(0.1, 0.1, 0.12, 8), mats.rubber, x, 0.12, 0.6).rotation.z = Math.PI / 2;
  return entity('dumpster', g, { y0: 0, y1: 2.35, halfZ: 1.08 });
}

function fence(mats) {
  const g = new THREE.Group();
  for (const x of [-0.7, 0.7]) add(g, new THREE.BoxGeometry(0.1, 2.45, 0.1), mats.dark, x, 1.22, 0);
  for (let i = 0; i < 5; i++) {
    const mat = i % 2 === 0 ? mats.yellow : mats.dark;
    add(g, new THREE.BoxGeometry(1.55, 0.16, 0.08), mat, 0, 0.4 + i * 0.36, 0);
  }
  const red = add(g, new THREE.SphereGeometry(0.1, 8, 8), mats.lightRed, -0.2, 2.5, 0);
  const blue = add(g, new THREE.SphereGeometry(0.1, 8, 8), mats.lightBlue, 0.2, 2.5, 0);
  const ent = entity('fence', g, { y0: 0, y1: 2.6, halfZ: 0.28 });
  ent.tick = (_dt, t) => {
    const blink = Math.sin(t * 16) > 0;
    red.material = blink ? mats.lightRed : mats.dark;
    blue.material = blink ? mats.dark : mats.lightBlue;
  };
  return ent;
}

function drone(mats) {
  const g = new THREE.Group();
  const body = add(g, new THREE.BoxGeometry(0.46, 0.16, 0.46), mats.drone, 0, 0, 0);
  add(g, new THREE.SphereGeometry(0.08, 8, 8), mats.cyan, 0, -0.06, 0.16);
  const rotors = [];
  for (const [x, z] of [[-0.34, -0.34], [0.34, -0.34], [-0.34, 0.34], [0.34, 0.34]]) {
    const arm = add(g, new THREE.BoxGeometry(0.36, 0.035, 0.045), mats.dark, x * 0.55, 0.06, z * 0.55);
    arm.rotation.y = Math.atan2(x, z);
    const rotor = new THREE.Group();
    rotor.position.set(x, 0.1, z);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.015, 0.06), mats.silver);
    blade.castShadow = false;
    rotor.add(blade);
    g.add(rotor);
    rotors.push(rotor);
  }
  g.position.y = 2.05;
  const ent = entity('drone', g, { y0: -0.22, y1: 0.24, halfZ: 0.62 }, { baseY: 2.05 });
  ent.tick = (dt, t) => {
    for (const r of rotors) r.rotation.y += dt * 28;
    g.position.y = 2.05 + Math.sin(t * 3 + body.id) * 0.06;
  };
  return ent;
}

function gantry(mats) {
  const g = new THREE.Group();
  for (const x of [-2.15, 2.15]) add(g, new THREE.CylinderGeometry(0.06, 0.07, 3.1, 6), mats.dark, x, 1.55, 0);
  add(g, new THREE.BoxGeometry(4.5, 0.08, 0.08), mats.dark, 0, 3.05, 0);
  add(g, new THREE.BoxGeometry(2.1, 0.7, 0.12), mats.yellow, 0, 2.15, 0);
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1a1408';
  ctx.fillRect(0, 0, 256, 96);
  ctx.font = '700 54px Impact, Arial Black, sans-serif';
  ctx.fillStyle = '#ffd15c';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LOW', 128, 50);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 0.55),
    new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0xffd15c,
      emissiveMap: tex,
      emissiveIntensity: 0.8,
      roughness: 0.4,
    }),
  );
  board.position.set(0, 2.15, 0.08);
  g.add(board);
  return entity('sign', g, { y0: 1.75, y1: 2.55, halfZ: 0.24 });
}

function coin(mats, y) {
  const g = new THREE.Group();
  const disc = add(g, new THREE.CylinderGeometry(0.28, 0.28, 0.06, 16), mats.gold, 0, 0, 0);
  disc.rotation.x = Math.PI / 2;
  g.position.y = y;
  const ent = entity(y > 1 ? 'coinHigh' : 'coin', g, { y0: -0.3, y1: 0.3, halfZ: 0.3 }, { radius: 0.62, baseY: y });
  ent.tick = (dt) => {
    g.rotation.y += dt * 3.2;
  };
  return ent;
}

function carrot(mats) {
  const g = new THREE.Group();
  const body = add(g, new THREE.ConeGeometry(0.16, 0.55, 8), mats.carrot, 0, 0.22, 0);
  body.rotation.z = Math.PI;
  body.position.y = 0.28;
  add(g, new THREE.ConeGeometry(0.08, 0.22, 6), mats.leaf, -0.05, 0.48, 0).rotation.z = 0.4;
  add(g, new THREE.ConeGeometry(0.07, 0.2, 6), mats.leaf, 0.06, 0.46, 0).rotation.z = -0.5;
  g.position.y = 0.15;
  const ent = entity('carrot', g, { y0: 0, y1: 0.7, halfZ: 0.2 }, { radius: 0.55, baseY: 0.15 });
  ent.tick = (_dt, t) => {
    g.rotation.y = t * 2;
    g.position.y = 0.15 + Math.sin(t * 3) * 0.08;
  };
  return ent;
}

function graffitiMat() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#214833';
  g.fillRect(0, 0, 128, 64);
  g.strokeStyle = '#ffd56a';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(10, 40);
  g.quadraticCurveTo(40, 8, 70, 34);
  g.quadraticCurveTo(96, 52, 118, 16);
  g.stroke();
  g.strokeStyle = '#2de2ff';
  g.beginPath();
  g.arc(40, 30, 10, 0, Math.PI * 1.4);
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 });
}
