import * as THREE from 'three';
import { box, cyl } from '../build/helpers.js';
import { LEVEL, PLOT, toScene } from '../data/building.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (v) => v * v * (3 - 2 * v);
const inWin = (t, w) => t >= w[0] && t <= w[1];

function wheel(M, r, w, x, y, z) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 18), M.rubber);
  m.rotation.z = Math.PI / 2;
  m.position.set(x, y, z);
  m.castShadow = true;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.02, 12), M.galvanised);
  hub.rotation.z = Math.PI / 2;
  hub.position.copy(m.position);
  return [m, hub];
}

/** Truck chassis + cab facing +X. */
function truckBase(M, cabMat, length = 7.5) {
  const g = new THREE.Group();
  g.add(box(length, 0.3, 2.3, M.darkSteel, 0, 0.75, 0));
  const cab = new THREE.Group();
  cab.add(box(1.9, 1.9, 2.4, cabMat, 0, 0.9, 0));
  cab.add(box(0.05, 0.9, 2.1, M.glass, 0.96, 1.75, 0, { cast: false }));
  cab.add(box(1.2, 0.7, 0.05, M.glass, 0.1, 1.85, 1.21, { cast: false }));
  cab.add(box(1.2, 0.7, 0.05, M.glass, 0.1, 1.85, -1.21, { cast: false }));
  cab.add(box(0.1, 0.4, 2.3, M.darkSteel, 0.97, 0.9, 0));
  cab.position.x = length / 2 - 0.95;
  g.add(cab);
  for (const x of [length / 2 - 1.2, -length / 2 + 1.6, -length / 2 + 0.4]) {
    for (const z of [-1.0, 1.0]) g.add(...wheel(M, 0.5, 0.4, x, 0.5, z));
  }
  return g;
}

export function buildMachines(ctx) {
  const { M, root } = ctx;
  const front = toScene(0, PLOT.y1)[1];
  const machines = [];

  /* ---------- excavator ------------------------------------------------ */
  const ex = (() => {
    const g = new THREE.Group();
    for (const x of [-1.05, 1.05]) {
      g.add(box(0.6, 0.75, 3.8, M.darkSteel, x, 0, 0));
      for (let z = -1.4; z <= 1.4; z += 0.7) g.add(...wheel(M, 0.2, 0.62, x, 0.28, z));
    }
    const turret = new THREE.Group();
    turret.position.y = 0.95;
    g.add(turret);
    turret.add(cyl(0.9, 0.2, M.darkSteel, 0, -0.2, 0, 16));
    turret.add(box(2.5, 1.05, 2.8, M.yellowSteel, 0, 0, -0.3));
    turret.add(box(2.5, 0.8, 0.8, M.darkSteel, 0, 0.1, -1.75));
    const cab = new THREE.Group();
    cab.add(box(0.95, 1.55, 1.25, M.yellowSteel, 0, 0, 0));
    cab.add(box(0.85, 1.0, 0.05, M.glass, 0, 0.45, 0.63, { cast: false }));
    cab.add(box(0.05, 1.0, 1.1, M.glass, -0.48, 0.45, 0, { cast: false }));
    cab.position.set(0.7, 1.05, 0.55);
    turret.add(cab);
    const boom = new THREE.Group();
    boom.position.set(-0.3, 0.9, 1.0);
    turret.add(boom);
    const boomGeo = new THREE.BoxGeometry(0.38, 0.5, 4.6);
    boomGeo.translate(0, 0, 2.3);
    const boomMesh = new THREE.Mesh(boomGeo, M.yellowSteel);
    boomMesh.castShadow = true;
    boom.add(boomMesh);
    const stick = new THREE.Group();
    stick.position.z = 4.5;
    boom.add(stick);
    const stickGeo = new THREE.BoxGeometry(0.3, 0.38, 2.7);
    stickGeo.translate(0, 0, 1.35);
    stick.add(new THREE.Mesh(stickGeo, M.yellowSteel));
    stick.children[0].castShadow = true;
    const bucket = new THREE.Group();
    bucket.position.z = 2.7;
    stick.add(bucket);
    const bGeo = new THREE.BoxGeometry(0.9, 0.7, 0.7);
    bGeo.translate(0, -0.25, 0.3);
    const bMesh = new THREE.Mesh(bGeo, M.darkSteel);
    bMesh.castShadow = true;
    bucket.add(bMesh);
    const soil = box(0.8, 0.25, 0.6, M.soil, 0, -0.1, 0.3);
    bucket.add(soil);
    root.add(g);
    return { g, turret, boom, stick, bucket, soil };
  })();

  machines.push((t, time) => {
    const dig = inWin(t, [1.02, 1.95]);
    const fill = inWin(t, [3.66, 3.98]);
    ex.g.visible = dig || fill;
    if (!ex.g.visible) return;
    const c = (time / 7) % 1; // dig cycle
    let swing, boomA, stickA, bucketA, loaded;
    if (c < 0.35) { const k = c / 0.35; swing = 0; boomA = 0.05 + k * 0.25; stickA = 0.4 + k * 1.0; bucketA = -0.3 + k * 1.6; loaded = k > 0.6; }
    else if (c < 0.6) { const k = (c - 0.35) / 0.25; swing = smooth(k) * 1.6; boomA = 0.3 - k * 0.75; stickA = 1.4 - k * 0.4; bucketA = 1.3; loaded = true; }
    else if (c < 0.72) { const k = (c - 0.6) / 0.12; swing = 1.6; boomA = -0.45; stickA = 1.0 - k * 0.5; bucketA = 1.3 - k * 1.8; loaded = k < 0.5; }
    else { const k = (c - 0.72) / 0.28; swing = 1.6 * (1 - smooth(k)); boomA = -0.45 + k * 0.5; stickA = 0.5 - k * 0.1; bucketA = -0.5 + k * 0.2; loaded = false; }
    ex.turret.rotation.y = swing;
    ex.boom.rotation.x = boomA;
    ex.stick.rotation.x = stickA;
    ex.bucket.rotation.x = bucketA;
    ex.soil.visible = loaded;
    if (dig) {
      const p = smooth(clamp01((t - 1.1) / 0.65));
      const y = LEVEL.foundationBottom + (-LEVEL.foundationBottom) * (1 - p);
      const u = clamp01((t - 1.02) / 0.93);
      ex.g.position.set(-2.5 + Math.sin(u * 6) * 2.0, Math.max(y, LEVEL.foundationBottom), -7 + u * 15);
      ex.g.rotation.y = Math.PI;
    } else {
      const y = LEVEL.foundationBottom + clamp01((t - 3.68) / 0.3) * 1.75;
      ex.g.position.set(3.5, Math.max(0, y), front - 3);
      ex.g.rotation.y = Math.PI;
    }
  });

  /* ---------- dump truck --------------------------------------------- */
  const dump = (() => {
    const g = truckBase(M, M.white, 7.2);
    const bed = new THREE.Group();
    bed.position.set(-3.4, 1.0, 0);
    const bedBox = new THREE.Group();
    bedBox.add(box(4.6, 0.1, 2.3, M.yellowSteel, 2.3, 0, 0));
    bedBox.add(box(4.6, 1.0, 0.08, M.yellowSteel, 2.3, 0, 1.12));
    bedBox.add(box(4.6, 1.0, 0.08, M.yellowSteel, 2.3, 0, -1.12));
    bedBox.add(box(0.08, 1.2, 2.3, M.yellowSteel, 4.6, 0, 0));
    bedBox.add(box(4.2, 0.6, 2.0, M.soil, 2.2, 0.1, 0));
    bed.add(bedBox);
    g.add(bed);
    root.add(g);
    return { g, bed };
  })();
  machines.push((t, time) => {
    const on = inWin(t, [1.05, 1.95]) || inWin(t, [3.6, 3.95]);
    dump.g.visible = on;
    if (!on) return;
    dump.g.position.set(-6, 0, front + 6.2);
    const c = (time / 14) % 1;
    dump.bed.rotation.z = c > 0.8 ? Math.sin((c - 0.8) / 0.2 * Math.PI) * 0.6 : 0;
  });

  /* ---------- concrete mixer truck ------------------------------------ */
  const mixer = (() => {
    const g = truckBase(M, M.white, 8);
    const drum = new THREE.Group();
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const u = i / 12;
      const r = u < 0.15 ? 0.6 + u / 0.15 * 0.6 : u < 0.6 ? 1.2 : 1.2 - (u - 0.6) / 0.4 * 0.75;
      pts.push(new THREE.Vector2(r, u * 4.2 - 2.1));
    }
    const drumGeo = new THREE.LatheGeometry(pts, 20);
    drumGeo.rotateZ(Math.PI / 2 - 0.22);
    const drumMesh = new THREE.Mesh(drumGeo, new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4, metalness: 0.3 }));
    drumMesh.castShadow = true;
    drum.add(drumMesh);
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(1.19, 0.06, 6, 24), M.tape);
    stripe.rotation.y = Math.PI / 2;
    drum.add(stripe);
    drum.position.set(-1.2, 2.15, 0);
    g.add(drum);
    root.add(g);
    return { g, drum };
  })();
  const pours = [[2.45, 2.93], [4.42, 4.97], [5.15, 5.38], [5.72, 5.99], [6.15, 6.36], [6.7, 6.99], [7.1, 7.3], [7.53, 7.78], [10.48, 10.66]];
  machines.push((t, time) => {
    const w = pours.find((p) => inWin(t, p));
    mixer.g.visible = !!w;
    if (!w) return;
    const arrive = clamp01((t - w[0]) / 0.04), leave = clamp01((w[1] - t) / 0.04);
    const k = Math.min(arrive, leave);
    mixer.g.position.set(-14 + (1 - smooth(k)) * -40, 0, front + 6.3);
    mixer.drum.rotation.x = time * 2.2;
  });

  /* ---------- concrete pump with boom -------------------------------- */
  const pump = (() => {
    const g = truckBase(M, M.white, 9);
    g.add(box(3.2, 1.0, 2.2, M.yellowSteel, -2.6, 1.0, 0));
    for (const x of [-3.5, 2.0]) for (const z of [-1, 1]) {
      g.add(box(0.2, 0.15, 2.2, M.yellowSteel, x, 0.8, z * 2.1));
      g.add(cyl(0.2, 0.05, M.darkSteel, x, 0, z * 3.1, 10));
      g.add(box(0.15, 0.8, 0.15, M.yellowSteel, x, 0.05, z * 3.1));
    }
    const base = new THREE.Group();
    base.position.set(-1.0, 2.0, 0);
    g.add(base);
    base.add(cyl(0.45, 0.6, M.yellowSteel, 0, 0, 0, 14));
    const segs = [];
    let parent = base;
    const lens = [7.5, 7.0, 6.5];
    lens.forEach((L, i) => {
      const s = new THREE.Group();
      s.position.set(0, i === 0 ? 0.6 : 0, i === 0 ? 0 : lens[i - 1]);
      const geoS = new THREE.BoxGeometry(0.32 - i * 0.05, 0.36 - i * 0.05, L);
      geoS.translate(0, 0, L / 2);
      const mesh = new THREE.Mesh(geoS, M.yellowSteel);
      mesh.castShadow = true;
      s.add(mesh);
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, L, 8), M.galvanised);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(0, 0.25, L / 2);
      s.add(pipe);
      parent.add(s);
      segs.push(s);
      parent = s;
    });
    const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3, 10), M.rubber);
    hose.geometry.translate(0, -1.5, 0);
    const tip = new THREE.Group();
    tip.position.z = lens[2];
    segs[2].add(tip);
    tip.add(hose);
    root.add(g);
    return { g, base, segs, tip };
  })();
  const pumpJobs = [
    { w: [2.48, 2.92], y: -1.0, x: 8000, yy: 10000 },
    { w: [4.45, 4.97], y: 0.6, x: 7000, yy: 9000 },
    { w: [5.72, 5.99], y: 4.8, x: 7000, yy: 9000 },
    { w: [6.7, 6.99], y: 8.9, x: 8000, yy: 10000 },
    { w: [7.53, 7.78], y: 13.1, x: 5000, yy: 8900 },
  ];
  machines.push((t, time) => {
    const job = pumpJobs.find((j) => inWin(t, j.w));
    pump.g.visible = !!job;
    if (!job) return;
    pump.g.position.set(4, 0, front + 6.2);
    // aim the boom: yaw towards target, then a simple 3-link arch
    const [tx, tz] = toScene(job.x + Math.sin(time * 0.15) * 2500, job.yy + Math.cos(time * 0.11) * 3000);
    const bx = pump.g.position.x - 1.0, bz = pump.g.position.z;
    const dx = tx - bx, dz = tz - bz;
    pump.base.rotation.y = Math.atan2(dx, dz);
    const dist = Math.hypot(dx, dz);
    const h = job.y + 3.5 - 2.6;
    const a1 = -0.9 - Math.max(0, h) * 0.05;
    const reach = THREE.MathUtils.clamp(dist / 20, 0.3, 1.0);
    pump.segs[0].rotation.x = a1;
    pump.segs[1].rotation.x = 0.9 + (1 - reach) * 0.9;
    pump.segs[2].rotation.x = 0.55 + (1 - reach) * 0.6;
    pump.tip.rotation.x = -(pump.segs[0].rotation.x + pump.segs[1].rotation.x + pump.segs[2].rotation.x);
  });

  /* ---------- small plant --------------------------------------------- */
  const compactor = (() => {
    const g = new THREE.Group();
    g.add(box(0.5, 0.12, 0.6, M.darkSteel, 0, 0, 0));
    g.add(box(0.4, 0.35, 0.4, M.yellowSteel, 0, 0.12, 0));
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1), M.darkSteel);
    h.position.set(0, 0.75, -0.55);
    h.rotation.x = -0.9;
    g.add(h);
    root.add(g);
    return g;
  })();
  machines.push((t, time) => {
    const on = inWin(t, [3.72, 3.97]);
    compactor.visible = on;
    if (!on) return;
    const y = LEVEL.foundationBottom + clamp01((t - 3.68) / 0.3) * 1.75;
    const [x, z] = toScene(6000 + Math.sin(time * 0.3) * 3000, 12000 + Math.cos(time * 0.23) * 4000);
    compactor.position.set(x, y + Math.abs(Math.sin(time * 40)) * 0.01, z);
  });

  const floatM = (() => {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.03, 6, 24), M.galvanised);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.08;
    g.add(ring);
    const blades = new THREE.Group();
    for (let i = 0; i < 4; i++) { const b = box(0.85, 0.01, 0.12, M.darkSteel, 0, 0.02, 0); b.rotation.y = (i * Math.PI) / 4; blades.add(b); }
    g.add(blades);
    g.add(box(0.3, 0.3, 0.3, M.yellowSteel, 0, 0.1, 0));
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4), M.darkSteel);
    h.position.set(0, 0.7, -0.6);
    h.rotation.x = -0.9;
    g.add(h);
    root.add(g);
    return { g, blades };
  })();
  machines.push((t, time) => {
    const on = inWin(t, [4.8, 4.99]);
    floatM.g.visible = on;
    if (!on) return;
    floatM.blades.rotation.y = time * 12;
    const [x, z] = toScene(5000 + Math.sin(time * 0.2) * 2000, 15000 + Math.cos(time * 0.17) * 2000);
    floatM.g.position.set(x, LEVEL.gfSSL, z);
  });

  const station = (() => {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.5), M.yellowSteel);
      const a = (i / 3) * Math.PI * 2;
      leg.position.set(Math.sin(a) * 0.25, 0.72, Math.cos(a) * 0.25);
      leg.rotation.set(Math.cos(a) * 0.3, 0, -Math.sin(a) * 0.3);
      g.add(leg);
    }
    g.add(box(0.18, 0.25, 0.14, M.yellowSteel, 0, 1.45, 0));
    g.add(box(0.12, 0.08, 0.2, M.darkSteel, 0, 1.6, 0));
    const [x, z] = toScene(2500, 20600);
    g.position.set(x, 0, z);
    root.add(g);
    return g;
  })();
  machines.push((t) => { station.visible = inWin(t, [0.4, 0.98]); });

  return {
    update(t, time) { for (const m of machines) m(t, time); },
  };
}
