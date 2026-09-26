import * as THREE from 'three';

function mesh(geo, mat, parent, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

function pivot(parent, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

export function createRabbit(scene) {
  const fur = new THREE.MeshStandardMaterial({
    color: 0xf4ecdf,
    roughness: 0.74,
    metalness: 0.02,
    emissive: 0x2a2118,
    emissiveIntensity: 0.12,
  });
  const inner = new THREE.MeshStandardMaterial({ color: 0xff8fab, roughness: 0.6 });
  const noseMat = new THREE.MeshStandardMaterial({ color: 0xff5d8f, roughness: 0.45 });
  const hoodie = new THREE.MeshStandardMaterial({ color: 0x6a3ec0, roughness: 0.7, emissive: 0x140828, emissiveIntensity: 0.2 });
  const stripe = new THREE.MeshStandardMaterial({
    color: 0xff2d6f,
    roughness: 0.45,
    emissive: 0x6a1030,
    emissiveIntensity: 0.45,
  });
  const shorts = new THREE.MeshStandardMaterial({ color: 0x1b2438, roughness: 0.8 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.55 });
  const brimMat = new THREE.MeshStandardMaterial({
    color: 0xff2d6f,
    roughness: 0.4,
    emissive: 0x5a1030,
    emissiveIntensity: 0.35,
  });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xffd56a,
    metalness: 1,
    roughness: 0.22,
    emissive: 0x6a4810,
    emissiveIntensity: 0.45,
  });
  const lens = new THREE.MeshStandardMaterial({
    color: 0x0c1218,
    metalness: 0.55,
    roughness: 0.08,
    emissive: 0x143044,
    emissiveIntensity: 0.7,
  });
  const shoe = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.42 });
  const teal = new THREE.MeshStandardMaterial({
    color: 0x1ee0c0,
    roughness: 0.35,
    emissive: 0x06382e,
    emissiveIntensity: 0.4,
  });
  const sole = new THREE.MeshStandardMaterial({
    color: 0xff6a1a,
    roughness: 0.5,
    emissive: 0x5a2208,
    emissiveIntensity: 0.35,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x16141c, roughness: 0.6 });
  const speaker = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.5, metalness: 0.4 });

  const root = new THREE.Group();
  const model = new THREE.Group();
  root.add(model);

  const torso = pivot(model, 0, 0.58, 0);
  mesh(new THREE.CapsuleGeometry(0.28, 0.34, 4, 10), hoodie, torso, 0, 0.16, 0);
  mesh(new THREE.BoxGeometry(0.5, 0.08, 0.08), stripe, torso, 0, 0.18, -0.26);
  mesh(new THREE.SphereGeometry(0.16, 12, 10), fur, torso, 0, 0.02, -0.16);
  const tail = mesh(new THREE.SphereGeometry(0.11, 10, 8), fur, torso, 0, 0.02, 0.28);

  const head = pivot(torso, 0, 0.5, -0.02);
  mesh(new THREE.SphereGeometry(0.26, 18, 14), fur, head, 0, 0.08, 0);
  mesh(new THREE.SphereGeometry(0.11, 12, 10), fur, head, 0, -0.02, -0.2);
  mesh(new THREE.SphereGeometry(0.045, 10, 8), noseMat, head, 0, 0.0, -0.3);
  mesh(new THREE.BoxGeometry(0.1, 0.02, 0.02), dark, head, 0.02, -0.07, -0.28).rotation.z = -0.3;

  const earL = pivot(head, -0.1, 0.26, 0);
  earL.rotation.z = 0.28;
  earL.rotation.x = 0.35;
  mesh(new THREE.CapsuleGeometry(0.055, 0.28, 3, 8), fur, earL, 0, 0.2, 0);
  mesh(new THREE.CapsuleGeometry(0.028, 0.18, 2, 6), inner, earL, 0, 0.2, -0.02);

  const earR = pivot(head, 0.1, 0.28, 0);
  earR.rotation.z = -0.12;
  mesh(new THREE.CapsuleGeometry(0.055, 0.32, 3, 8), fur, earR, 0, 0.22, 0);
  mesh(new THREE.CapsuleGeometry(0.028, 0.2, 2, 6), inner, earR, 0, 0.22, -0.02);
  mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 10), gold, earR, 0.06, 0.05, -0.02);

  const cap = pivot(head, 0, 0.2, 0.02);
  cap.rotation.x = 0.15;
  mesh(new THREE.SphereGeometry(0.27, 16, 12), capMat, cap, 0, 0.06, 0).scale.set(1, 0.62, 1);
  const brim = mesh(new THREE.BoxGeometry(0.34, 0.035, 0.2), brimMat, cap, 0, 0.02, 0.2);
  brim.rotation.x = 0.18;

  const shades = pivot(head, 0, 0.08, -0.18);
  shades.rotation.z = -0.06;
  mesh(new THREE.BoxGeometry(0.18, 0.12, 0.05), lens, shades, -0.11, 0, -0.02);
  mesh(new THREE.BoxGeometry(0.18, 0.12, 0.05), lens, shades, 0.11, 0, -0.02);
  mesh(new THREE.BoxGeometry(0.08, 0.025, 0.03), gold, shades, 0, 0.01, 0);
  mesh(new THREE.BoxGeometry(0.34, 0.02, 0.02), gold, shades, 0, 0.06, 0.01);
  mesh(new THREE.BoxGeometry(0.05, 0.03, 0.02), dark, shades, -0.08, 0.1, 0.02).rotation.z = 0.5;
  mesh(new THREE.BoxGeometry(0.05, 0.03, 0.02), dark, shades, 0.09, 0.1, 0.02).rotation.z = -0.35;

  const chain = pivot(torso, 0.04, 0.22, -0.08);
  chain.scale.setScalar(1.35);
  mesh(new THREE.TorusGeometry(0.2, 0.032, 8, 16), gold, chain, 0, 0, 0).rotation.x = Math.PI / 2.15;
  mesh(new THREE.TorusGeometry(0.15, 0.024, 6, 14), gold, chain, 0, -0.08, -0.06).rotation.x = Math.PI / 2.05;
  mesh(new THREE.OctahedronGeometry(0.09, 0), gold, chain, 0.02, -0.28, -0.16);

  const boom = pivot(torso, 0, 0.12, 0.3);
  mesh(new THREE.BoxGeometry(0.28, 0.2, 0.1), dark, boom, 0, 0, 0);
  mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 10), speaker, boom, -0.07, 0.02, -0.06).rotation.x = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 10), speaker, boom, 0.07, 0.02, -0.06).rotation.x = Math.PI / 2;
  mesh(new THREE.BoxGeometry(0.08, 0.03, 0.02), gold, boom, 0, -0.06, -0.06);

  function arm(side) {
    const p = pivot(torso, side * 0.32, 0.28, 0);
    mesh(new THREE.CapsuleGeometry(0.07, 0.22, 3, 8), hoodie, p, 0, -0.16, 0);
    mesh(new THREE.SphereGeometry(0.07, 10, 8), fur, p, 0, -0.32, -0.02);
    return p;
  }
  const armL = arm(-1);
  const armR = arm(1);

  function leg(side) {
    const p = pivot(model, side * 0.14, 0.46, 0);
    mesh(new THREE.CapsuleGeometry(0.09, 0.16, 3, 8), shorts, p, 0, -0.12, 0);
    mesh(new THREE.CapsuleGeometry(0.065, 0.16, 3, 8), fur, p, 0, -0.32, 0);
    const shoeG = pivot(p, 0, -0.46, -0.04);
    mesh(new THREE.BoxGeometry(0.16, 0.08, 0.28), shoe, shoeG, 0, 0, -0.02);
    mesh(new THREE.BoxGeometry(0.17, 0.035, 0.3), sole, shoeG, 0, -0.05, -0.02);
    mesh(new THREE.BoxGeometry(0.08, 0.04, 0.08), teal, shoeG, side * 0.02, 0.02, -0.1);
    return p;
  }
  const legL = leg(-1);
  const legR = leg(1);

  const blobTex = radialTex('rgba(0,0,0,0.5)', 'rgba(0,0,0,0)');
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 18),
    new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.set(0, 0.025, 0);
  blob.receiveShadow = false;

  const moundMat = new THREE.MeshStandardMaterial({ color: 0x7a5532, roughness: 1 });
  const mound = new THREE.Group();
  for (const [x, z, s] of [[0, 0.05, 1], [-0.22, -0.08, 0.72], [0.2, 0.12, 0.64], [0.05, -0.16, 0.5]]) {
    const clod = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), moundMat);
    clod.scale.set(s, s * 0.45, s);
    clod.position.set(x, 0.05, z);
    mound.add(clod);
  }
  mound.visible = false;

  scene.add(root);
  scene.add(blob);
  scene.add(mound);

  const casters = [];
  root.traverse((obj) => {
    if (obj.isMesh) casters.push(obj);
  });

  let phase = 0;
  let squash = 1;
  let deadT = 0;

  function update(dt, s) {
    const moving = s.mode === 'play' || s.mode === 'title';
    const cadence = s.mode === 'title' ? 7 : 8 + s.speed * 0.45;
    if (moving && s.burrowT <= 0 && s.y <= 0.02 && !s.diving) phase += dt * cadence;

    const burrowK = s.burrowT > 0 ? 1 - s.burrowT / 0.66 : 0;
    let depth = 0;
    if (s.burrowT > 0) {
      if (burrowK < 0.16) depth = burrowK / 0.16;
      else if (burrowK > 0.8) depth = Math.max(0, (1 - burrowK) / 0.2);
      else depth = 1;
    }

    if (s.mode === 'dead') {
      deadT += dt;
      root.position.y = Math.max(-0.2, s.y);
      model.rotation.z = Math.min(1.25, deadT * 5);
      model.rotation.x = Math.min(0.9, deadT * 3);
      model.rotation.y = deadT * 2.2;
    } else {
      deadT = 0;
      const yaw = s.burrowT > 0 ? -0.35 : -0.95;
      model.rotation.y += (yaw - model.rotation.y) * Math.min(1, dt * 8);
      model.rotation.z += (0 - model.rotation.z) * Math.min(1, dt * 8);
      if (s.burrowT > 0) {
        root.position.y = -0.38 * depth;
        model.rotation.x = 0.7 * depth;
      } else if (s.diving) {
        root.position.y = s.y;
        model.rotation.x = 0.95;
      } else {
        root.position.y = s.y;
        const lean = s.y > 0.08 ? -0.28 : 0.12;
        model.rotation.x += (lean - model.rotation.x) * Math.min(1, dt * 8);
      }
    }

    const grounded = s.y <= 0.02 && s.burrowT <= 0 && !s.diving && s.mode !== 'dead';
    if (grounded) {
      const swing = Math.sin(phase);
      legL.rotation.x = swing * 0.7;
      legR.rotation.x = -swing * 0.7;
      armL.rotation.x = -swing * 0.55;
      armR.rotation.x = swing * 0.55;
      torso.position.y = 0.58 + Math.abs(Math.sin(phase * 2)) * 0.025;
      earL.rotation.x = 0.35 + Math.sin(phase * 2) * 0.06;
      earR.rotation.x = Math.sin(phase * 2 + 0.4) * 0.05;
    } else if (s.burrowT > 0) {
      legL.rotation.x = 1.1;
      legR.rotation.x = 1.1;
      armL.rotation.x = -1.2;
      armR.rotation.x = -0.8;
    } else {
      const tuck = s.vy > 0 ? -0.9 : 0.45;
      legL.rotation.x += (tuck - legL.rotation.x) * Math.min(1, dt * 10);
      legR.rotation.x += (tuck * 0.8 - legR.rotation.x) * Math.min(1, dt * 10);
      armL.rotation.x = -0.8;
      armR.rotation.x = -0.4;
      earR.rotation.x = -0.4;
      earL.rotation.x = 0.1;
    }

    chain.rotation.z = Math.sin(phase * 1.3) * 0.12;
    chain.rotation.x = 0.2 + Math.sin(phase) * 0.06;
    tail.scale.setScalar(1 + Math.sin(phase * 2) * 0.06);

    const targetSquash = s.squash ?? 1;
    squash += (targetSquash - squash) * Math.min(1, dt * 10);
    const stretch = s.vy > 3 ? 1.08 : 1;
    model.scale.set(1 + (1 - squash) * 0.35, squash * stretch, 1 + (1 - squash) * 0.2);

    const air = Math.min(1.4, s.y);
    const bs = Math.max(0.22, 0.62 - air * 0.2);
    blob.scale.set(bs, bs, bs);
    blob.material.opacity = s.burrowT > 0 ? 0 : 0.32 - air * 0.12;
    blob.position.z = 0.05;

    mound.visible = s.burrowT > 0 && depth > 0.15;
    if (mound.visible) {
      const ms = 0.7 + depth * 0.55;
      mound.scale.set(ms, 0.55 + depth * 0.4, ms);
      mound.position.y = 0.02;
    }

    const hideShadow = s.burrowT > 0 && depth > 0.65;
    for (const c of casters) c.castShadow = !hideShadow;
  }

  return { root, update, blob };
}

function radialTex(inner, outer) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 4, 32, 32, 32);
  grd.addColorStop(0, inner);
  grd.addColorStop(1, outer);
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
