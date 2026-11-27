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
  // split: wall-mounted split AC [wall, along (mm), underside height (m)] — owner: split units in the
  // office, bedrooms and kitchen; ducted only in the master bedroom over the garage and the living spaces
  'gf-femaleMajlis': { floor: 'greyMarble', cove: true, split: ['S', 4300, 2.55] }, // now the OFFICE
  'gf-kitchen': { split: ['S', 13300, 3.0] }, // above the garden slider (owner's mark-up)
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
  'ff-familyLiving': { floor: 'creamMarble', cove: true, feature: [['S', 9000, 11000, 'walnut']] }, // TV wall (south, sheet 4)
  'ff-lobby': { floor: 'creamMarble', feature: [['N', 7360, 7880, 'nero'], ['N', 8820, 9355, 'nero']] },
  'ff-lobby2': { floor: 'creamMarble' },
  'ff-masterBedroom': { floor: 'lightOak', cove: true, split: ['S', 3800, 2.45], feature: [['N', 3100, 5700, 'linen']] },        // GIRL bedroom
  'ff-masterBedroom2': { floor: 'lightOak', cove: true, split: ['N', 4200, 2.5], feature: [['W', 15300, 18100, 'walnut']], mouldings: [['E', 14600, 19000]] }, // DOUBLE
  'ff-masterBedroom3': { floor: 'lightOak', cove: true, split: ['W', 2200, 2.45], feature: [['N', 10000, 12600, 'navy']] },      // BOY bedroom
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

    // ---- gypsum ceiling (site photos): dropped perimeter band, step up into a plain raised
    //      centre field, classical cornice moulding on the step and a small one at the wall ----
    const spots = ctx.lighting ? ctx.lighting.matFor(rm.id, 'spots', M.led) : M.led;
    const ring = (inset, w, h0, h1, m) => {
      B(x0 + inset, y0 + inset, x1 - inset, y0 + inset + w, h0, h1, m);
      B(x0 + inset, y1 - inset - w, x1 - inset, y1 - inset, h0, h1, m);
      B(x0 + inset, y0 + inset + w, x0 + inset + w, y1 - inset - w, h0, h1, m);
      B(x1 - inset - w, y0 + inset + w, x1 - inset, y1 - inset - w, h0, h1, m);
    };
    // crown profile, widest at the top: [from top, to top, width] (m, m, mm)
    const CROWN = [[0, 0.03, 100], [0.03, 0.07, 75], [0.07, 0.11, 50], [0.11, 0.14, 25]];
    const SMALL = [[0, 0.02, 60], [0.02, 0.04, 40], [0.04, 0.06, 18]];
    if (st.cove) {
      const band = 600, drop = 0.16, hb = ceil - drop;
      ring(0, band, hb, ceil, M.gypsum);            // perimeter band (lower)
      for (const [a, b, d] of SMALL) ring(0, d, hb - b, hb - a, M.white);   // small cornice at the walls
      for (const [a, b, d] of CROWN) ring(band, d, ceil - b, ceil - a, M.white); // crown in the step's top corner
      // downlights: along the band and in a loose grid over the centre field
      for (const [ya, side] of [[y0 + band / 2, 1], [y1 - band / 2, -1]]) {
        const n = Math.max(2, Math.round((x1 - x0) / 1500));
        for (let k = 0; k < n; k++) { const x = x0 + ((x1 - x0) * (k + 0.5)) / n; B(x - 40, ya - 40, x + 40, ya + 40, hb - 0.006, hb, spots); }
        void side;
      }
      const fx0 = x0 + band, fx1 = x1 - band, fy0 = y0 + band, fy1 = y1 - band;
      const nx = Math.max(1, Math.round((fx1 - fx0) / 1600)), ny = Math.max(1, Math.round((fy1 - fy0) / 1600));
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
        const x = fx0 + ((fx1 - fx0) * (i + 0.5)) / nx, y = fy0 + ((fy1 - fy0) * (j + 0.5)) / ny;
        B(x - 40, y - 40, x + 40, y + 40, ceil - 0.006, ceil, spots);
      }
      // linear AC diffuser in the band along the long sides
      const alongX = x1 - x0 >= y1 - y0;
      if (!st.split && alongX) for (const y of [y0 + band * 0.75, y1 - band * 0.75]) B(x0 + band + 300, y - 25, x1 - band - 300, y + 25, hb - 0.004, hb + 0.001, slot);
      else if (!st.split) for (const x of [x0 + band * 0.75, x1 - band * 0.75]) B(x - 25, y0 + band + 300, x + 25, y1 - band - 300, hb - 0.004, hb + 0.001, slot);
    }
    // ---- hall: narrow raised strip with cornice mouldings on both edges (site photos) ----
    if (st.slot) {
      const alongX = x1 - x0 >= y1 - y0, w = 480, d = 0.15, hd = ceil - d;
      const c = alongX ? (y0 + y1) / 2 : (x0 + x1) / 2;
      if (alongX) {
        B(x0, y0, x1, c - w / 2, hd, ceil, M.gypsum); B(x0, c + w / 2, x1, y1, hd, ceil, M.gypsum);
        for (const [a, b, dd] of CROWN) { B(x0, c - w / 2, x1, c - w / 2 + dd, ceil - b, ceil - a, M.white); B(x0, c + w / 2 - dd, x1, c + w / 2, ceil - b, ceil - a, M.white); }
        for (let x = x0 + 700; x < x1 - 400; x += 1300) B(x - 40, c - 40, x + 40, c + 40, ceil - 0.006, ceil, spots);
      } else {
        B(x0, y0, c - w / 2, y1, hd, ceil, M.gypsum); B(c + w / 2, y0, x1, y1, hd, ceil, M.gypsum);
        for (const [a, b, dd] of CROWN) { B(c - w / 2, y0, c - w / 2 + dd, y1, ceil - b, ceil - a, M.white); B(c + w / 2 - dd, y0, c + w / 2, y1, ceil - b, ceil - a, M.white); }
        for (let y = y0 + 700; y < y1 - 400; y += 1300) B(c - 40, y - 40, c + 40, y + 40, ceil - 0.006, ceil, spots);
      }
    }

    // ---- wall-mounted split AC indoor unit ----
    if (st.split) {
      const [wall, a, h] = st.split;
      onWall(wall, a - 450, a + 450, 0, 215, h, h + 0.29, M.sanitary);                // body
      onWall(wall, a - 430, a + 430, 150, 222, h - 0.005, h + 0.035, M.alu);          // louver
      onWall(wall, a - 430, a + 430, 214, 220, h + 0.2, h + 0.203, M.blindBox);       // front panel line
      onWall(wall, a + 300, a + 360, 215, 221, h + 0.08, h + 0.11, M.darkSteel);      // display
    }

    // ---- feature walls ----
    for (const [wall, a0, a1, kind] of st.feature || []) {
      const top = ceil - (st.cove ? 0.16 : st.slot ? 0.15 : 0);
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
