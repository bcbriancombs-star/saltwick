import * as THREE from 'three';

export function createParticles(scene, color, count, size) {
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const life = new Float32Array(count);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color,
    map: softDot(),
    size,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    sizeAttenuation: true,
    alphaTest: 0.05,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  scene.add(pts);
  let head = 0;

  function emit(x, y, z, n, speed, lift) {
    for (let i = 0; i < n; i++) {
      const i3 = head * 3;
      positions[i3] = x + (Math.random() - 0.5) * 0.2;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z + (Math.random() - 0.5) * 0.2;
      velocities[i3] = (Math.random() - 0.5) * speed;
      velocities[i3 + 1] = Math.random() * speed * lift;
      velocities[i3 + 2] = (Math.random() - 0.5) * speed;
      life[head] = 0.28 + Math.random() * 0.35;
      head = (head + 1) % count;
    }
    geo.attributes.position.needsUpdate = true;
  }

  function update(dt) {
    let alive = false;
    for (let i = 0; i < count; i++) {
      if (life[i] <= 0) continue;
      alive = true;
      life[i] -= dt;
      const i3 = i * 3;
      velocities[i3 + 1] -= 12 * dt;
      positions[i3] += velocities[i3] * dt;
      positions[i3 + 1] += velocities[i3 + 1] * dt;
      positions[i3 + 2] += velocities[i3 + 2] * dt;
      if (positions[i3 + 1] < 0.02 && velocities[i3 + 1] < 0) {
        positions[i3 + 1] = 0.02;
        velocities[i3 + 1] *= -0.25;
      }
    }
    if (alive) geo.attributes.position.needsUpdate = true;
    pts.visible = alive;
  }

  return { emit, update };
}

let dotTex;
function softDot() {
  if (dotTex) return dotTex;
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(16, 16, 1, 16, 16, 15);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.55, 'rgba(255,255,255,0.7)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 32, 32);
  dotTex = new THREE.CanvasTexture(c);
  return dotTex;
}
