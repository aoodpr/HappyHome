import * as THREE from 'three';
import { LEVEL, ROOMS } from '../data/building.js';
import { rectBox, toScene } from './helpers.js';
import { stagger } from '../core/timeline.js';

/*
 * Interior style from the client's interior-design package
 * ("13 SEP – Ahmed Ghazi", parts 2–3: mood board, renders, ceiling and
 * flooring plans, elevations):
 *   - warm greige walls, walnut feature walls with LED, nero marble at the lift
 *   - floors: grey marble (GF living / dining / hall / office), cream marble
 *     (majlis, FF living, lobbies, stairs), light oak (bedrooms)
 *   - gypsum ceilings with a perimeter LED cove and black linear AC slots
 *   - thin wall-panel mouldings in the majlis and the double bedroom
 *
 * Feature walls are given per room as [wall, from, to] in plan millimetres
 * along that wall (N/S walls: x, E/W walls: y).
 */

export const ROOM_STYLE = {
  'gf-femaleMajlis': { floor: 'greyMarble', cove: true }, // now the OFFICE
  'gf-maleMajlis': {
    floor: 'creamMarble', cove: true,
    feature: [['W', 13700, 16700, 'linen'], ['W', 13300, 13700, 'walnut'], ['W', 16700, 17100, 'walnut']],
    mouldings: [['E', 12600, 16100], ['S', 2400, 3000], ['S', 6300, 6950]],
  },
  'gf-dining': { floor: 'greyMarble', cove: true, feature: [['N', 7360, 7880, 'nero'], ['N', 8820, 9358, 'nero'], ['W', 2700, 4900, 'walnut']] },
  'gf-hall': { floor: 'greyMarble', slot: true }, // linear light slot (site photos)
  'gf-living': { floor: 'greyMarble', cove: true, feature: [['S', 9700, 12900, 'walnut']] },
  'gf-entrance': { floor: 'greyMarble' },
  'gf-stair': { floor: 'creamMarble' },
  'ff-familyLiving': { floor: 'creamMarble', cove: true, feature: [['N', 9500, 11650, 'walnut']] }, // TV wall (north)
  'ff-lobby': { floor: 'creamMarble', feature: [['N', 7360, 7880, 'nero'], ['N', 8820, 9355, 'nero']] },
  'ff-lobby2': { floor: 'creamMarble' },
  'ff-masterBedroom': { floor: 'lightOak', cove: true, feature: [['N', 3100, 5700, 'linen']] },        // GIRL bedroom
  'ff-masterBedroom2': { floor: 'lightOak', cove: true, feature: [['W', 15300, 18100, 'walnut']], mouldings: [['E', 14600, 19000]] }, // DOUBLE
  'ff-masterBedroom3': { floor: 'lightOak', cove: true, feature: [['N', 10000, 12600, 'navy']] },      // BOY bedroom
  'ff-masterBedroom4': { floor: 'lightOak', cove: true, feature: [['E', 16700, 19500, 'walnut']] },    // MASTER
};

const FFL = [LEVEL.gf, LEVEL.ff];
const CEIL = [3.3, 3.2];

/** Rooms whose downlights are part of the gypsum design (built in buildStyle). */
export const ownsCeilingLights = (rm) => !!(ROOM_STYLE[rm.id]?.cove || ROOM_STYLE[rm.id]?.slot);

export function floorMaterialFor(rm, M) {
  const s = ROOM_STYLE[rm.id];
  return s && M[s.floor] ? M[s.floor] : null;
}

export function buildStyle(ctx) {
  const { TL, M, root } = ctx;
  const slot = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });
  const groups = [];
  for (const rm of ROOMS) {
    const st = ROOM_STYLE[rm.id];
    if (!st) continue;
    const [x0, y0, x1, y1] = rm.rect;
    const ffl = FFL[rm.f], ceil = CEIL[rm.f];
    const g = new THREE.Group();
    g.position.y = ffl;
    g.name = 'style:' + rm.id;
    let LEDm = null; // created only if the room actually has LED cove / feature lighting
    const led = () => (LEDm ||= ctx.lighting ? ctx.lighting.matFor(rm.id, 'cove', M.covedLed) : M.covedLed);
    const B = (ax0, ay0, ax1, ay1, h0, h1, m, o) => g.add(rectBox(ax0, ay0, ax1, ay1, h0, h1 - h0, m, o || { cast: false }));

    /** Box on a wall face: along-wall range [a0,a1] (mm), off the wall [d0,d1] (mm), heights in m. */
    const onWall = (wall, a0, a1, d0, d1, h0, h1, m) => {
      if (wall === 'N') B(a0, y0 + d0, a1, y0 + d1, h0, h1, m);
      else if (wall === 'S') B(a0, y1 - d1, a1, y1 - d0, h0, h1, m);
      else if (wall === 'W') B(x0 + d0, a0, x0 + d1, a1, h0, h1, m);
      else B(x1 - d1, a0, x1 - d0, a1, h0, h1, m);
    };

    // ---- gypsum ceiling design (site photos): perimeter band + cornice, LED step, coffer grid ----
    if (st.cove) {
      const band = 560, drop = 0.18, hb = ceil - drop;       // perimeter band, 180 mm down
      const step = 220, hs = ceil - 0.09;                   // second step (LED cove behind its lip)
      const ring = (inset, w, h0, h1, m) => {
        B(x0 + inset, y0 + inset, x1 - inset, y0 + inset + w, h0, h1, m);
        B(x0 + inset, y1 - inset - w, x1 - inset, y1 - inset, h0, h1, m);
        B(x0 + inset, y0 + inset + w, x0 + inset + w, y1 - inset - w, h0, h1, m);
        B(x1 - inset - w, y0 + inset + w, x1 - inset, y1 - inset - w, h0, h1, m);
      };
      ring(0, band, hb, ceil, M.gypsum);
      ring(band, step, hs, ceil, M.gypsum);
      // moulded cornice on the band's inner face: three stepped fillets
      ring(band, 25, hb - 0.035, hb, M.white);
      ring(band - 15, 15, hb - 0.06, hb - 0.035, M.white);
      // small cornice where the band meets the walls
      ring(0, 30, hb - 0.05, hb, M.white);
      // LED strip on the inner lip of the second step, glowing up into the recess
      const l = 12, e = band + step;
      B(x0 + e, y0 + e - l, x1 - e, y0 + e, hs - 0.004, hs + 0.012, led());
      B(x0 + e, y1 - e, x1 - e, y1 - e + l, hs - 0.004, hs + 0.012, led());
      B(x0 + e - l, y0 + e, x0 + e, y1 - e, hs - 0.004, hs + 0.012, led());
      B(x1 - e, y0 + e, x1 - e + l, y1 - e, hs - 0.004, hs + 0.012, led());
      // linear AC diffuser in the band along the long sides
      const alongX = x1 - x0 >= y1 - y0;
      if (alongX) for (const y of [y0 + band / 2, y1 - band / 2]) B(x0 + band + 200, y - 25, x1 - band - 200, y + 25, hb - 0.004, hb + 0.001, slot);
      else for (const x of [x0 + band / 2, x1 - band / 2]) B(x - 25, y0 + band + 200, x + 25, y1 - band - 200, hb - 0.004, hb + 0.001, slot);
      // coffer grid over the centre field: 200 mm ribs, 60 mm down; a downlight at every crossing
      const fx0 = x0 + e, fx1 = x1 - e, fy0 = y0 + e, fy1 = y1 - e;
      const nx = Math.max(2, Math.round((fx1 - fx0) / 1500)), ny = Math.max(2, Math.round((fy1 - fy0) / 1500));
      const rib = 200, hr = ceil - 0.06;
      const spots = ctx.lighting ? ctx.lighting.matFor(rm.id, 'spots', M.led) : M.led;
      for (let i = 1; i < nx; i++) { const x = fx0 + ((fx1 - fx0) * i) / nx; B(x - rib / 2, fy0, x + rib / 2, fy1, hr, ceil, M.gypsum); }
      for (let j = 1; j < ny; j++) { const y = fy0 + ((fy1 - fy0) * j) / ny; B(fx0, y - rib / 2, fx1, y + rib / 2, hr, ceil, M.gypsum); }
      for (let i = 1; i < nx; i++) for (let j = 1; j < ny; j++) {
        const x = fx0 + ((fx1 - fx0) * i) / nx, y = fy0 + ((fy1 - fy0) * j) / ny;
        B(x - 45, y - 45, x + 45, y + 45, hr - 0.006, hr, spots);
      }
      // downlights along the perimeter band
      for (const [ax, ay, bx, by] of [[x0, y0, x1, y0], [x0, y1, x1, y1]]) {
        const n = Math.max(2, Math.round((bx - ax) / 1400));
        for (let k = 0; k < n; k++) { const x = ax + ((bx - ax) * (k + 0.5)) / n, y = ay === y0 ? y0 + band * 0.3 : y1 - band * 0.3; B(x - 40, y - 40, x + 40, y + 40, hb - 0.006, hb, spots); }
      }
    }
    // ---- linear light slot along a hall (site photos) ----
    if (st.slot) {
      const alongX = x1 - x0 >= y1 - y0, w = 200, d = 0.15, hd = ceil - d;
      const spots = ctx.lighting ? ctx.lighting.matFor(rm.id, 'spots', M.led) : M.led;
      if (alongX) {
        const yc = (y0 + y1) / 2;
        B(x0, y0, x1, yc - w / 2, hd, ceil, M.gypsum); B(x0, yc + w / 2, x1, y1, hd, ceil, M.gypsum);
        B(x0 + 300, yc - 15, x1 - 300, yc + 15, ceil - 0.01, ceil, led());
        for (let x = x0 + 700; x < x1 - 400; x += 1200) for (const y of [y0 + 500, y1 - 500]) B(x - 40, y - 40, x + 40, y + 40, hd - 0.006, hd, spots);
      } else {
        const xc = (x0 + x1) / 2;
        B(x0, y0, xc - w / 2, y1, hd, ceil, M.gypsum); B(xc + w / 2, y0, x1, y1, hd, ceil, M.gypsum);
        B(xc - 15, y0 + 300, xc + 15, y1 - 300, ceil - 0.01, ceil, led());
        for (let y = y0 + 700; y < y1 - 400; y += 1200) for (const x of [x0 + 500, x1 - 500]) B(x - 40, y - 40, x + 40, y + 40, hd - 0.006, hd, spots);
      }
    }

    // ---- feature walls ----
    for (const [wall, a0, a1, kind] of st.feature || []) {
      const top = ceil - (st.cove ? 0.18 : st.slot ? 0.15 : 0);
      if (kind === 'walnut') {
        // vertical walnut slats on a dark backing, LED strips at both edges
        onWall(wall, a0, a1, 0, 12, 0, top, M.darkSteel);
        for (let a = a0 + 15; a < a1 - 60; a += 90) onWall(wall, a, a + 60, 12, 42, 0, top, M.walnut);
        onWall(wall, a0, a0 + 10, 0, 44, 0.05, top - 0.05, led());
        onWall(wall, a1 - 10, a1, 0, 44, 0.05, top - 0.05, led());
      } else if (kind === 'nero') {
        onWall(wall, a0, a1, 0, 20, 0, top, M.neroMarble);
      } else if (kind === 'linen') {
        onWall(wall, a0, a1, 0, 30, 0, top, M.linenPanel);
        onWall(wall, a0 - 10, a0, 0, 32, 0, top, led());
        onWall(wall, a1, a1 + 10, 0, 32, 0, top, led());
      } else if (kind === 'navy') {
        onWall(wall, a0, a1, 0, 25, 0, top, M.navyPanel);
        onWall(wall, a0 - 120, a0, 0, 30, 0, top, M.walnut);
        onWall(wall, a1, a1 + 120, 0, 30, 0, top, M.walnut);
      }
    }

    // ---- panel mouldings (thin raised frames) ----
    for (const [wall, a0, a1] of st.mouldings || []) {
      const n = Math.max(1, Math.round((a1 - a0) / 1100));
      const w = (a1 - a0) / n;
      for (let i = 0; i < n; i++) {
        const p0 = a0 + i * w + 120, p1 = a0 + (i + 1) * w - 120;
        for (const [h0, h1] of [[0.35, 0.38], [2.55, 2.58]]) onWall(wall, p0, p1, 0, 18, h0, h1, M.white);
        onWall(wall, p0, p0 + 30, 0, 18, 0.35, 2.58, M.white);
        onWall(wall, p1 - 30, p1, 0, 18, 0.35, 2.58, M.white);
      }
    }
    root.add(g);
    groups.push(g);
  }
  // fitted with the gypsum ceilings / joinery during the interior-finishes stage
  groups.forEach((g, i) => TL.add(g, { in: stagger(i, groups.length, 12.3, 12.55), anim: 'show' }));
  void toScene;
}
