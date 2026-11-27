import * as THREE from 'three';
import { LEVEL, ROOMS, WALLS_GF, WALLS_FF, toScene } from '../data/building.js';
import ELEC from '../data/electrical.json';
import { ROOM_STYLE } from './style.js';

/*
 * Electrical fittings from the interior-design package
 * ("13 SEP – Ahmed Ghazi" part 2):
 *   - sockets, data / TV points and outdoor sockets: positions extracted from
 *     the ELECTRICAL GROUND / FIRST FLOOR PLANS (pp. 34–35) by
 *     tools/extract_electrical.py, snapped onto the nearest wall face;
 *   - light switches: one plate inside each room's door with one gang per
 *     lighting circuit, following the KEY LIGHTING plans (pp. 42–43):
 *     ceiling downlights · LED cove + feature walls · chandelier / pendants /
 *     lamps · ceiling fan.
 * Every rocker is interactive (walk mode: aim + E / click; orbit: click):
 * switches turn their room circuit on / off, sockets toggle their switch +
 * indicator.
 */

const FFL = [LEVEL.gf, LEVEL.ff];
const WET = new Set(['bath', 'wash', 'kitchen', 'laundry']);

/** Per-room lighting circuits driving cloned emissive materials. */
export class Lighting {
  constructor() {
    this.rooms = {};
    this.dusk = false;
  }

  room(id) {
    return (this.rooms[id] ||= { spots: null, cove: null, deco: null, fan: null });
  }

  circuit(id, name) {
    const r = this.room(id);
    return (r[name] ||= { on: true, mats: new Map(), rotors: [] });
  }

  /** Material for a light in room `id` on `circuit` (cloned from `base` once per room). */
  matFor(id, circuit, base) {
    const c = this.circuit(id, circuit);
    if (!c.mats.has(base)) {
      const m = base.clone();
      m.userData = { ...base.userData, baseIntensity: base.emissiveIntensity };
      c.mats.set(base, m);
      this._applyMat(c, m, circuit);
    }
    return c.mats.get(base);
  }

  addFan(id, rotor) { this.circuit(id, 'fan').rotors.push(rotor); }

  set(id, circuit, on) {
    const c = this.rooms[id]?.[circuit];
    if (!c) return;
    c.on = on;
    for (const m of c.mats.values()) this._applyMat(c, m, circuit);
    for (const r of c.rotors) r.userData.off = !on;
  }

  toggle(id, circuit) { this.set(id, circuit, !this.isOn(id, circuit)); }
  isOn(id, circuit) { return !!this.rooms[id]?.[circuit]?.on; }
  anyOn(id) { const r = this.rooms[id]; return !!r && ['spots', 'cove', 'deco'].some((k) => r[k]?.on); }

  setDusk(dusk) {
    this.dusk = dusk;
    for (const r of Object.values(this.rooms)) for (const [k, c] of Object.entries(r)) if (c) for (const m of c.mats.values()) this._applyMat(c, m, k);
  }

  _applyMat(c, m, circuit) {
    const k = this.dusk ? { spots: 2.7, cove: 1.3, deco: 3.5 }[circuit] || 1 : 1;
    m.emissiveIntensity = c.on ? m.userData.baseIntensity * k : 0;
  }
}

export function buildElectrical(ctx) {
  const { TL, M, root } = ctx;
  const L = ctx.lighting;
  const mats = {
    plate: new THREE.MeshStandardMaterial({ color: 0xf3f0ea, roughness: 0.35 }),
    rocker: new THREE.MeshStandardMaterial({ color: 0xfbf9f5, roughness: 0.3 }),
    recess: new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc9a56a, roughness: 0.3, metalness: 0.9 }),
    dataBlue: new THREE.MeshStandardMaterial({ color: 0x2a5d9f, roughness: 0.5 }),
    outdoor: new THREE.MeshStandardMaterial({ color: 0x8e9196, roughness: 0.5 }),
    ledOn: new THREE.MeshStandardMaterial({ color: 0xff6b3d, emissive: 0xff3d1a, emissiveIntensity: 2.2 }),
    ledOff: new THREE.MeshStandardMaterial({ color: 0x3a2622, roughness: 0.5 }),
    gangOn: new THREE.MeshStandardMaterial({ color: 0x9fd2ff, emissive: 0x4fa8ff, emissiveIntensity: 1.6 }),
  };
  ctx.interact = ctx.interact || [];
  const group = new THREE.Group();
  group.name = 'electrical';
  root.add(group);

  // ---- light materials per room: deco fittings found in the furniture / bathroom groups ----
  for (const rm of ROOMS) {
    if (rm.key === 'garage') continue; // car lights are not a room circuit
    for (const prefix of ['furniture:', 'bathroom:']) {
      const g = root.getObjectByName(prefix + rm.id);
      g?.traverse((o) => {
        if (o.userData?.isFanRotor) L.addFan(rm.id, o);
        if (!o.isMesh || !o.material?.emissive) return;
        if (o.material.emissiveIntensity > 0 && o.material.emissive.getHex() !== 0) o.material = L.matFor(rm.id, 'deco', o.material);
      });
    }
  }

  /* ---------------- helpers ---------------- */
  const wallsOf = (f) => (f === 0 ? WALLS_GF : WALLS_FF);
  /** Nearest wall face to a plan point: { pos [x,y] on the face, normal [nx,ny] pointing at the point, wall, along } */
  const snap = (f, x, y, extOnly = false) => {
    let best = null;
    for (const w of wallsOf(f)) {
      if (extOnly && !w.ext) continue;
      const [ax, ay] = w.a, [bx, by] = w.b;
      const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
      const k = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
      const cx = ax + dx * k, cy = ay + dy * k;
      const d = Math.hypot(x - cx, y - cy);
      if (!best || d < best.d) best = { d, w, cx, cy, k };
    }
    if (!best || best.d > 450) return null;
    const { w, cx, cy } = best;
    const len = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
    const along = best.k * len;
    // skip points that fall inside an opening of that wall
    const hor = Math.abs(w.a[1] - w.b[1]) < 1;
    const s = hor ? cx : cy;
    if ((w.o || []).some((o) => s > Math.min(o[0], o[1]) - 80 && s < Math.max(o[0], o[1]) + 80)) return null;
    let nx = x - cx, ny = y - cy;
    const nl = Math.hypot(nx, ny);
    if (nl < 1) { nx = -(w.b[1] - w.a[1]) / len; ny = (w.b[0] - w.a[0]) / len; } else { nx /= nl; ny /= nl; }
    const off = w.t / 2 + (w.ext ? 210 : 18); // external walls are clad on the outside
    return { pos: [cx + nx * off, cy + ny * off], normal: [nx, ny], w, along };
  };
  const roomAt = (f, x, y) => ROOMS.find((r) => r.f === f && x >= r.rect[0] - 60 && x <= r.rect[2] + 60 && y >= r.rect[1] - 60 && y <= r.rect[3] + 60);
  const place = (obj, f, pos, normal, h) => {
    const [sx, sz] = toScene(pos[0], pos[1]);
    obj.position.set(sx, FFL[f] + h, sz);
    obj.rotation.y = Math.atan2(normal[0], normal[1]); // local +Z faces into the room
    group.add(obj);
  };
  const box = (w, h, d, m, x = 0, y = 0, z = 0) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z);
    return o;
  };

  /* ---------------- sockets ---------------- */
  const socketModel = (kind) => {
    const g = new THREE.Group();
    const plateMat = kind === 'outdoor' ? mats.outdoor : mats.plate;
    g.add(box(0.146, 0.086, 0.01, plateMat, 0, 0, 0.005));
    if (kind === 'data') {
      g.add(box(0.03, 0.026, 0.004, mats.recess, -0.03, 0, 0.011));
      g.add(box(0.03, 0.026, 0.004, mats.recess, 0.03, 0, 0.011));
      g.add(box(0.12, 0.008, 0.003, mats.dataBlue, 0, -0.033, 0.011));
      return { g };
    }
    for (const sx of [-0.036, 0.036]) {
      g.add(box(0.05, 0.05, 0.003, mats.recess, sx, -0.008, 0.011));
      g.add(box(0.008, 0.012, 0.004, mats.plate, sx, 0.004, 0.012));
    }
    // switch rocker + red indicator (switched socket)
    const rocker = box(0.024, 0.012, 0.006, mats.rocker, 0, 0.028, 0.013);
    const led = box(0.006, 0.006, 0.004, mats.ledOn, 0.022, 0.028, 0.012);
    g.add(rocker, led);
    if (kind === 'outdoor') g.add(box(0.16, 0.1, 0.03, new THREE.MeshStandardMaterial({ color: 0xb9bcc0, transparent: true, opacity: 0.5 }), 0, 0, 0.02));
    return { g, rocker, led };
  };

  let nSock = 0;
  for (const [fk, f] of [['gf', 0], ['ff', 1]]) {
    for (const kind of ['socket', 'data', 'outdoor']) {
      for (const [x, y] of ELEC[fk][kind] || []) {
        const s = snap(f, x, y, kind === 'outdoor');
        if (!s) continue;
        const rm = roomAt(f, s.pos[0], s.pos[1]);
        const h = kind === 'outdoor' ? 0.55 : rm && WET.has(rm.key) ? 1.1 : 0.35;
        const { g, rocker, led } = socketModel(kind);
        place(g, f, s.pos, s.normal, h);
        nSock++;
        if (!rocker) continue;
        const target = {
          kind: 'socket', on: true, room: rm?.key,
          meshes: [g.children[0], rocker],
          toggle() {
            this.on = !this.on;
            led.material = this.on ? mats.ledOn : mats.ledOff;
            rocker.rotation.x = this.on ? 0 : 0.35;
          },
        };
        ctx.interact.push(target);
      }
    }
  }

  /* ---------------- switch plates (one per room, gang per circuit) ---------------- */
  const CIRCUITS = ['spots', 'cove', 'deco', 'fan'];
  let nSw = 0;
  for (const rm of ROOMS) {
    if (['stair', 'lift', 'garden', 'outdoorSeating'].includes(rm.key)) continue;
    const st = ROOM_STYLE[rm.id];
    L.circuit(rm.id, 'spots');
    const circuits = CIRCUITS.filter((c) => L.rooms[rm.id]?.[c]);
    const spot = switchSpot(rm);
    if (!spot) continue;
    const n = circuits.length;
    const g = new THREE.Group();
    const pw = Math.max(0.086, 0.04 + 0.034 * n);
    g.add(box(pw, 0.086, 0.01, mats.plate, 0, 0, 0.005));
    g.add(box(pw + 0.004, 0.09, 0.002, mats.brass, 0, 0, 0.001));
    const gw = (pw - 0.024) / n;
    circuits.forEach((c, i) => {
      const x = -pw / 2 + 0.012 + gw * (i + 0.5);
      const rocker = box(gw - 0.006, 0.056, 0.008, mats.rocker, x, 0, 0.014);
      const dot = box(0.004, 0.004, 0.003, mats.gangOn, x, -0.034, 0.011);
      g.add(rocker, dot);
      const sync = () => {
        const on = L.isOn(rm.id, c);
        rocker.rotation.x = on ? -0.12 : 0.12;
        dot.material = on ? mats.gangOn : mats.ledOff;
      };
      sync();
      ctx.interact.push({
        kind: 'switch', room: rm.key, roomId: rm.id, circuit: c, meshes: [rocker],
        get on() { return L.isOn(rm.id, c); },
        toggle() { L.toggle(rm.id, c); sync(); },
      });
    });
    place(g, rm.f, spot.pos, spot.normal, 1.2);
    nSw++;
  }
  ctx.electricalCounts = { sockets: nSock, switches: nSw };
  group.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.userData.dynamic = true; } });
  TL.add(group, { in: [12.6, 12.7], anim: 'show' });

  /** Inside the room, 150 mm beside its door (or on its longest wall). */
  function switchSpot(rm) {
    const [x0, y0, x1, y1] = rm.rect;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const inside = (x, y) => x > x0 - 60 && x < x1 + 60 && y > y0 - 60 && y < y1 + 60;
    let fallback = null;
    for (const w of wallsOf(rm.f)) {
      const hor = Math.abs(w.a[1] - w.b[1]) < 1;
      const c = hor ? w.a[1] : w.a[0];
      const onEdge = hor ? (Math.abs(c - y0) < 260 || Math.abs(c - y1) < 260) : (Math.abs(c - x0) < 260 || Math.abs(c - x1) < 260);
      if (!onEdge) continue;
      const lo = Math.max(hor ? x0 : y0, Math.min(hor ? w.a[0] : w.a[1], hor ? w.b[0] : w.b[1]));
      const hi = Math.min(hor ? x1 : y1, Math.max(hor ? w.a[0] : w.a[1], hor ? w.b[0] : w.b[1]));
      if (hi - lo < 300) continue;
      const nrm = hor ? [0, Math.sign(cy - c)] : [Math.sign(cx - c), 0];
      const face = (s) => (hor ? [s, c + nrm[1] * (w.t / 2 + 18)] : [c + nrm[0] * (w.t / 2 + 18), s]);
      for (const o of w.o || []) {
        if (!['door', 'slide', 'gap'].includes(o[4])) continue;
        const a = Math.min(o[0], o[1]), b = Math.max(o[0], o[1]);
        if (b < lo || a > hi) continue;
        for (const s of [b + 200, a - 200]) {
          const p = face(s);
          const clear = !(w.o || []).some((q) => s > Math.min(q[0], q[1]) - 120 && s < Math.max(q[0], q[1]) + 120);
          if (s > lo + 100 && s < hi - 100 && clear && inside(p[0], p[1])) return { pos: p, normal: nrm };
        }
      }
      if (!fallback || hi - lo > fallback.len) {
        const s = lo + 350;
        const clear = !(w.o || []).some((q) => s > Math.min(q[0], q[1]) - 120 && s < Math.max(q[0], q[1]) + 120);
        if (clear) fallback = { pos: face(s), normal: nrm, len: hi - lo };
      }
    }
    return fallback;
  }
}

/**
 * Up to three warm point lights follow the lit rooms nearest the camera, so
 * switching a room on / off visibly changes the light inside it. Fixed pool
 * (no shader recompiles when switching).
 */
export function createRoomLightPool(scene, lighting) {
  const pool = [0, 1, 2].map(() => {
    const l = new THREE.PointLight(0xffe2b8, 0, 9, 1.6);
    scene.add(l);
    return l;
  });
  const centres = ROOMS.map((r) => {
    const [x, z] = toScene((r.rect[0] + r.rect[2]) / 2, (r.rect[1] + r.rect[3]) / 2);
    return { r, p: new THREE.Vector3(x, FFL[r.f] + 2.9, z) };
  });
  let last = 0;
  return (camera, now, interiorVisible) => {
    if (now - last < 0.25) return;
    last = now;
    const cand = interiorVisible
      ? centres.filter((c) => lighting.anyOn(c.r.id) && Math.abs(c.p.y - 1.3 - camera.position.y) < 2.6)
        .sort((a, b) => a.p.distanceToSquared(camera.position) - b.p.distanceToSquared(camera.position))
      : [];
    pool.forEach((l, i) => {
      const c = cand[i];
      if (!c || c.p.distanceTo(camera.position) > 14) { l.intensity = 0; return; }
      l.position.copy(c.p);
      l.intensity = lighting.dusk ? 14 : 6;
    });
  };
}
