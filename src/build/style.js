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
  'gf-hall': { floor: 'greyMarble' },
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

    // ---- perimeter LED cove + linear AC slots ----
    if (st.cove) {
      const band = 380, drop = 0.14, hb = ceil - drop;
      B(x0, y0, x1, y0 + band, hb, ceil, M.gypsum);
      B(x0, y1 - band, x1, y1, hb, ceil, M.gypsum);
      B(x0, y0 + band, x0 + band, y1 - band, hb, ceil, M.gypsum);
      B(x1 - band, y0 + band, x1, y1 - band, hb, ceil, M.gypsum);
      // LED strip along the inner lip, glowing up into the recess
      const l = 12;
      B(x0 + band, y0 + band - l, x1 - band, y0 + band, hb - 0.004, hb + 0.01, led());
      B(x0 + band, y1 - band, x1 - band, y1 - band + l, hb - 0.004, hb + 0.01, led());
      B(x0 + band - l, y0 + band, x0 + band, y1 - band, hb - 0.004, hb + 0.01, led());
      B(x1 - band, y0 + band, x1 - band + l, y1 - band, hb - 0.004, hb + 0.01, led());
      // two black linear diffusers along the long direction, 0.7 m inside the band
      const alongX = x1 - x0 >= y1 - y0;
      const inset = band + 450;
      if (alongX) {
        for (const y of [y0 + inset, y1 - inset]) B(x0 + band + 300, y - 25, x1 - band - 300, y + 25, ceil - 0.006, ceil - 0.001, slot);
      } else {
        for (const x of [x0 + inset, x1 - inset]) B(x - 25, y0 + band + 300, x + 25, y1 - band - 300, ceil - 0.006, ceil - 0.001, slot);
      }
    }

    // ---- feature walls ----
    for (const [wall, a0, a1, kind] of st.feature || []) {
      const top = ceil - (st.cove ? 0.14 : 0);
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
