import * as THREE from 'three';

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

const SIGNS = ['BUNZ', 'LATE', 'NITE', 'VINYL', 'FRESH', 'RHYME', 'ALLEY', 'HOP', 'OPEN', '88'];
const SIGN_COLORS = ['#ff2d78', '#2de2ff', '#ffd15c', '#c084fc', '#fb7185', '#7cffb2'];

export function createWorld(scene, renderer) {
  const rand = rng(0x51a7);

  scene.background = new THREE.Color(0x07060f);
  scene.fog = new THREE.FogExp2(0x1a1430, 0.026);
  scene.environmentIntensity = 0.85;
  scene.environment = makeEnv(renderer);

  const hemi = new THREE.HemisphereLight(0x9aafef, 0x3a2416, 1.25);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xd0dcff, 3.1);
  sun.position.set(7, 16, 8);
  sun.target.position.set(0, 0.5, -6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 40;
  sun.shadow.camera.left = -14;
  sun.shadow.camera.right = 14;
  sun.shadow.camera.top = 14;
  sun.shadow.camera.bottom = -14;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.035;
  scene.add(sun);
  scene.add(sun.target);
  const fill = new THREE.DirectionalLight(0xffd7a8, 1.35);
  fill.position.set(4, 5, 4);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0x7fd0ff, 1.15);
  rim.position.set(-5, 3, -2);
  scene.add(rim);

  const windows = canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = '#121018';
    g.fillRect(0, 0, w, h);
    for (let y = 3; y < h; y += 8) {
      for (let x = 3; x < w; x += 7) {
        if (rand() > 0.42) {
          g.globalAlpha = 0.35 + rand() * 0.65;
          g.fillStyle = rand() > 0.82 ? '#8fd8ff' : rand() > 0.5 ? '#ffd7a1' : '#ff8fb8';
          g.fillRect(x, y, 3, 5);
        }
      }
    }
    g.globalAlpha = 1;
  });
  const windowMat = new THREE.MeshStandardMaterial({
    map: windows,
    emissive: 0xffe0c0,
    emissiveMap: windows,
    emissiveIntensity: 0.85,
    roughness: 0.55,
    metalness: 0.05,
  });

  const buildingMats = [0x2c2940, 0x3a2a40, 0x262e3c, 0x3a2c44, 0x2a3140, 0x3a283c].map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.86, metalness: 0.04 }),
  );
  const metal = new THREE.MeshStandardMaterial({ color: 0x2a2c33, roughness: 0.42, metalness: 0.72 });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xffe1b0,
    emissive: 0xffb15a,
    emissiveIntensity: 2.2,
    roughness: 0.3,
  });
  const glowTex = canvasTex(64, 64, (g) => {
    const grd = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,210,140,0.95)');
    grd.addColorStop(1, 'rgba(255,160,60,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
  });
  const glowMat = new THREE.SpriteMaterial({
    map: glowTex,
    color: 0xffcc88,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const roadTex = canvasTex(128, 512, (g, w, h) => {
    g.fillStyle = '#34384a';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) {
      const shade = 40 + Math.floor(rand() * 22);
      g.fillStyle = `rgb(${shade},${shade},${shade + 6})`;
      g.fillRect(rand() * w, rand() * h, 2, 2);
    }
    g.fillStyle = '#c8c4bc';
    g.fillRect(8, 0, 3, h);
    g.fillRect(w - 11, 0, 3, h);
    g.fillStyle = '#e6c25a';
    for (let y = 24; y < h; y += 78) g.fillRect(w / 2 - 2, y, 4, 26);
  });
  const roughTex = canvasTex(128, 128, (g, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = 70 + Math.floor(rand() * 150);
        g.fillStyle = `rgb(${n},${n},${n})`;
        g.fillRect(x, y, 1, 1);
      }
    }
  });
  roughTex.colorSpace = THREE.NoColorSpace;
  roadTex.repeat.set(1, 14);
  roughTex.repeat.set(2, 10);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(8.2, 96),
    new THREE.MeshStandardMaterial({
      map: roadTex,
      roughnessMap: roughTex,
      roughness: 0.72,
      metalness: 0.28,
      envMapIntensity: 0.85,
    }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0, -18);
  road.receiveShadow = true;
  scene.add(road);

  const sideMat = new THREE.MeshStandardMaterial({ color: 0x5a5c68, roughness: 0.9, metalness: 0.05 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x6a6c78, roughness: 0.75 });
  for (const side of [-1, 1]) {
    const walk = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 96), sideMat);
    walk.position.set(side * 5.15, 0.06, -18);
    walk.receiveShadow = true;
    scene.add(walk);
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 96), curbMat);
    curb.position.set(side * 3.85, 0.08, -18);
    scene.add(curb);
  }

  const puddleGeo = new THREE.CircleGeometry(1, 12);
  puddleGeo.rotateX(-Math.PI / 2);
  const puddleMat = new THREE.MeshPhysicalMaterial({
    color: 0x2a3148,
    roughness: 0.18,
    metalness: 0.55,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
    envMapIntensity: 0.8,
  });

  const chunks = [];
  const signs = [];
  const CHUNK = 26;
  const COUNT = 7;
  for (let i = 0; i < COUNT; i++) chunks.push(makeChunk(-i * CHUNK + 24));

  const skyline = new THREE.Group();
  scene.add(skyline);
  const skyMats = [0x100e18, 0x141226, 0x0e1018].map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0 }),
  );
  const skyChunks = [];
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Group();
    g.position.z = -i * 40 + 20;
    for (let n = 0; n < 3; n++) {
      const h = 10 + rand() * 18;
      const b = new THREE.Mesh(new THREE.BoxGeometry(3.2 + rand() * 2, h, 3 + rand()), skyMats[n % skyMats.length]);
      b.position.set(-16 - rand() * 6, h / 2, n * 12);
      g.add(b);
      const h2 = 8 + rand() * 14;
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(3 + rand() * 2, h2, 3), skyMats[(n + 1) % skyMats.length]);
      b2.position.set(18 + rand() * 4, h2 / 2, n * 11);
      g.add(b2);
      if (rand() > 0.4) {
        const tip = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 6, 6),
          new THREE.MeshStandardMaterial({ color: 0xff4466, emissive: 0xff2244, emissiveIntensity: 2 }),
        );
        tip.position.set(b.position.x, h + 0.4, b.position.z);
        g.add(tip);
      }
    }
    skyline.add(g);
    skyChunks.push(g);
  }

  const skyGeo = new THREE.SphereGeometry(220, 20, 14);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(0x05040c) },
      mid: { value: new THREE.Color(0x1a1444) },
      horizon: { value: new THREE.Color(0x3a2048) },
    },
    vertexShader: `
      varying vec3 vP;
      void main() {
        vP = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vP;
      uniform vec3 top;
      uniform vec3 mid;
      uniform vec3 horizon;
      void main() {
        float h = normalize(vP).y;
        vec3 col = mix(horizon, mid, smoothstep(-0.02, 0.28, h));
        col = mix(col, top, smoothstep(0.2, 0.75, h));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  skyMat.fog = false;
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  const starPos = new Float32Array(180 * 3);
  for (let i = 0; i < 180; i++) {
    const theta = rand() * Math.PI * 2;
    const y = 20 + rand() * 60;
    const r = 70 + rand() * 50;
    starPos[i * 3] = Math.cos(theta) * r;
    starPos[i * 3 + 1] = y;
    starPos[i * 3 + 2] = Math.sin(theta) * r - 20;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xf4f0ff, size: 0.45, sizeAttenuation: true });
  starMat.fog = false;
  scene.add(new THREE.Points(starGeo, starMat));

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(4.5, 20, 16),
    new THREE.MeshBasicMaterial({ color: 0xfff4d2 }),
  );
  moon.material.fog = false;
  moon.material.depthTest = false;
  moon.renderOrder = -1;
  moon.position.set(14, 52, -130);
  scene.add(moon);

  const rainCount = 140;
  const rainPos = new Float32Array(rainCount * 3);
  const rainVel = new Float32Array(rainCount);
  for (let i = 0; i < rainCount; i++) {
    rainPos[i * 3] = (rand() - 0.5) * 16;
    rainPos[i * 3 + 1] = rand() * 12;
    rainPos[i * 3 + 2] = -rand() * 30;
    rainVel[i] = 10 + rand() * 8;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.Points(
    rainGeo,
    new THREE.PointsMaterial({ color: 0xb9c6e2, size: 0.045, transparent: true, opacity: 0.45, depthWrite: false }),
  );
  scene.add(rain);

  function makeChunk(z) {
    const g = new THREE.Group();
    g.position.z = z;
    const r = rng((z * 13 + 99) >>> 0);
    addBuilding(g, -5.7, -6, -1, r);
    addBuilding(g, -6.4, 6, -1, r);
    if (r() > 0.35) addBuilding(g, 8.8, 0, 1, r);
    addLamp(g, -3.55, -2);
    if (r() > 0.5) addLamp(g, 3.7, 8);

    if (r() > 0.72) {
      const puddle = new THREE.Mesh(puddleGeo, puddleMat);
      const side = r() > 0.5 ? 1 : -1;
      puddle.position.set(side * (2.1 + r() * 0.3), 0.015, (r() - 0.5) * 4);
      puddle.scale.set(0.22 + r() * 0.12, 1, 0.14 + r() * 0.08);
      puddle.receiveShadow = true;
      g.add(puddle);
    }

    if (r() > 0.4) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.02, 1.1),
        new THREE.MeshStandardMaterial({ color: 0xe7e2d6, roughness: 0.5 }),
      );
      stripe.position.set(0, 0.02, 4);
      stripe.receiveShadow = true;
      for (let s = 0; s < 4; s++) {
        const piece = stripe.clone();
        piece.position.x = -1.2 + s * 0.8;
        g.add(piece);
      }
    }
    scene.add(g);
    return g;
  }

  function addBuilding(parent, x, z, side, r) {
    const h = 3.4 + r() * 7.5;
    const w = 2.3 + r() * 1.5;
    const d = 2.2 + r() * 1.8;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), buildingMats[Math.floor(r() * buildingMats.length)]);
    body.position.set(x, h / 2, z);
    body.receiveShadow = true;
    parent.add(body);

    const face = new THREE.PlaneGeometry(w * 0.9, h * 0.86);
    const uv = face.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w / 1.6), uv.getY(i) * (h / 2.4));
    const win = new THREE.Mesh(face, windowMat);
    const faceX = x + side * (w / 2 + 0.02);
    win.position.set(faceX, h * 0.48, z);
    win.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    parent.add(win);

    if (r() > 0.38) {
      const text = SIGNS[Math.floor(r() * SIGNS.length)];
      const color = SIGN_COLORS[Math.floor(r() * SIGN_COLORS.length)];
      const sign = makeSign(text, color);
      sign.position.set(faceX + side * 0.05, 1.8 + r() * Math.min(2.4, h * 0.35), z);
      sign.rotation.y = win.rotation.y;
      parent.add(sign);
      signs.push(sign);
    }

    const lip = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.1, 0.12, d + 0.1),
      new THREE.MeshStandardMaterial({
        color: r() > 0.5 ? 0xff2d78 : 0x2de2ff,
        emissive: r() > 0.5 ? 0xff2d78 : 0x2de2ff,
        emissiveIntensity: 0.7,
        roughness: 0.35,
      }),
    );
    lip.position.set(x, h + 0.04, z);
    parent.add(lip);
  }

  function addLamp(parent, x, z) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.3, 6), metal);
    pole.position.y = 1.65;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.05, 0.05), metal);
    arm.position.set(x > 0 ? -0.35 : 0.35, 3.22, 0);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), bulbMat);
    bulb.position.set(x > 0 ? -0.72 : 0.72, 3.1, 0);
    const glow = new THREE.Sprite(glowMat);
    glow.position.copy(bulb.position);
    glow.scale.set(1.15, 1.15, 1);
    g.add(pole, arm, bulb, glow);
    g.position.set(x, 0, z);
    parent.add(g);
  }

  let travel = 0;
  function update(dt, speed) {
    travel += speed * dt;
    roadTex.offset.y = travel / 6.85;
    roughTex.offset.y = travel / 9.6;
    const dz = speed * dt;
    for (const chunk of chunks) {
      chunk.position.z += dz;
      if (chunk.position.z > CHUNK + 10) chunk.position.z -= CHUNK * COUNT;
    }
    const skyDz = dz * 0.28;
    for (const chunk of skyChunks) {
      chunk.position.z += skyDz;
      if (chunk.position.z > 50) chunk.position.z -= 40 * skyChunks.length;
    }
    const t = travel * 0.15;
    for (let i = 0; i < signs.length; i++) {
      const s = signs[i];
      s.material.emissiveIntensity = 1.35 + Math.sin(t * 3 + i) * 0.18;
    }
    const arr = rainGeo.attributes.position.array;
    for (let i = 0; i < rainCount; i++) {
      arr[i * 3 + 1] -= rainVel[i] * dt;
      arr[i * 3 + 2] += dz * 0.35;
      if (arr[i * 3 + 1] < 0) {
        arr[i * 3 + 1] = 8 + Math.random() * 4;
        arr[i * 3] = (Math.random() - 0.5) * 14;
        arr[i * 3 + 2] = -8 - Math.random() * 24;
      }
    }
    rainGeo.attributes.position.needsUpdate = true;
  }

  function setShadowQuality(level) {
    sun.castShadow = level > 0;
    const size = level >= 2 ? 1024 : 512;
    if (sun.shadow.mapSize.x !== size) {
      sun.shadow.mapSize.set(size, size);
      if (sun.shadow.map) {
        sun.shadow.map.dispose();
        sun.shadow.map = null;
      }
    }
  }

  return { update, setShadowQuality, sun };
}

function makeSign(text, color) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = '#07060c';
  g.fillRect(0, 0, 512, 160);
  g.font = '700 92px Impact, Arial Black, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = color;
  g.fillText(text, 256, 84);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    emissive: new THREE.Color(color),
    emissiveMap: tex,
    emissiveIntensity: 1.5,
    roughness: 0.35,
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.78), mat);
}

function makeEnv(renderer) {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(12, 16, 12), new THREE.MeshBasicMaterial({ color: 0x0a0c16, side: THREE.BackSide })));
  const colors = [0xff2d78, 0x2de2ff, 0xffb15a, 0x7a4dff];
  colors.forEach((color, i) => {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(5, 7), new THREE.MeshBasicMaterial({ color }));
    const a = (i / colors.length) * Math.PI * 2;
    panel.position.set(Math.cos(a) * 7, 2, Math.sin(a) * 7);
    panel.lookAt(0, 1.2, 0);
    env.add(panel);
  });
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.02).texture;
  pmrem.dispose();
  return tex;
}
