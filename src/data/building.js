/**
 * Villa PE-233-25 — building data transcribed from the working drawings
 * (Polygon Engineering, 16-11-2025). All plan coordinates are in millimetres
 * measured from grid line 1 (x, towards grid 10) and grid line A (y, towards
 * the road / grid L). Levels are in metres above road level (±0.000).
 *
 * Sources:
 *   Plans ............ sheets 3 (GF), 4 (FF), 5 (Roof), 11 (Upper roof)
 *   Levels ........... sheets 12 (front elevation), 13 (section B-B)
 *   Structure ........ sheets 39–43 (framing plans + schedules)
 */

export const GRID = {
  x: { 1: 0, 2: 2094, 3: 4694, 4: 5294, 5: 7294, 6: 9494, 7: 9694, 8: 11694, 9: 13894, 10: 15994 },
  y: { A: 0, B: 2224, C: 5325, D: 5624, E: 7624, F: 9425, G: 10324, H: 12124, I: 15125, J: 16325, K: 18324, L: 21425 },
};

export const PLOT = { x0: -100, y0: -150, x1: 16094, y1: 21425, area: 341.31, number: '04070792' };

/** Finished floor levels (FFL) and structural slab levels (SSL), metres. */
export const LEVEL = {
  road: 0.0,
  foundationBottom: -1.55,
  footingTop: -1.1,
  groundBeamBottom: -0.025,
  gfSSL: 0.425,
  gf: 0.5,
  ffSSL: 4.625,
  ff: 4.7,
  rfSSL: 8.75,
  rf: 8.9,
  parapet: 10.1,
  urSSL: 12.95,
  ur: 13.1,
  urParapet: 14.1,
};
export const SLAB_T = 0.22; // post-tensioned slab thickness
export const GRADE_SLAB_T = 0.15;

/* ------------------------------------------------------------------ *
 * Columns [x, y, w, d] (mm, top-left corner + size) — extracted from
 * the vector geometry of the floor plans.
 * ------------------------------------------------------------------ */
const C = (x, y, w, d) => ({ x, y, w, d });
export const COLUMNS_MAIN = [
  C(1967, 114, 501, 199), C(1967, 5491, 600, 201), C(1967, 7491, 399, 199), C(1967, 10192, 600, 199),
  C(1967, 12490, 200, 602), C(1967, 17791, 200, 601),
  C(6761, 10192, 598, 199), C(6860, 5491, 499, 201), C(6860, 7491, 499, 199),
  C(7161, 59, 401, 199), C(7161, 1691, 198, 599), C(7161, 12490, 198, 602), C(7161, 17791, 198, 601),
  C(9154, 38, 402, 201), C(9357, 1691, 201, 599),
  C(9558, 14992, 598, 199), C(9558, 20892, 199, 300), C(9558, 21192, 400, 199),
  C(11156, 5192, 598, 199), C(11655, 9292, 598, 199),
  C(13452, 14992, 499, 199), C(13752, 9292, 199, 400), C(13752, 14791, 199, 201),
  C(15348, -28, 601, 201), C(15450, 14992, 499, 199), C(15549, 21192, 400, 199),
  C(15750, 4792, 199, 599), C(15750, 20892, 199, 300),
];
/** Columns continuing above the roof (stair room + lift room). */
export const COLUMNS_ROOF = [
  C(1967, 7491, 399, 199), C(1967, 10192, 600, 199), C(6761, 10192, 598, 199), C(6860, 7491, 499, 199),
  C(7161, 59, 401, 199), C(7161, 1691, 198, 599), C(9154, 38, 402, 201), C(9357, 1691, 201, 599),
  C(7961, 3524, 200, 200), C(9357, 3524, 200, 200),
];
/** Boundary-wall columns. */
export const COLUMNS_BOUNDARY = [
  C(-25, 135, 201, 199), C(-25, 4424, 201, 298), C(-25, 8494, 201, 199), C(-25, 12677, 201, 298),
  C(-25, 16802, 201, 301), C(-25, 21190, 201, 201), C(1905, 21190, 599, 201), C(4434, 21190, 598, 201),
  C(6960, 21190, 399, 201),
];

/* Footing schedule (sheet 43) */
export const FOOTING_TYPES = {
  F1: { s: 1.4, t: 0.4 }, F2: { s: 1.6, t: 0.4 }, F3: { s: 1.8, t: 0.4 }, F4: { s: 2.0, t: 0.4 },
  F5: { s: 2.2, t: 0.45 }, F6: { s: 2.3, t: 0.5 },
};

/* ------------------------------------------------------------------ *
 * Walls. Each wall is a straight centre-line segment.
 *   t     thickness (mm)          ext  external (insulated block, facade)
 *   rc    reinforced concrete (lift shaft) — built with the structure
 *   o     openings: [from, to, sill, head, kind, mark] along the wall axis
 *         (mm for from/to measured in the plan axis, sill/head in m above FFL)
 * ------------------------------------------------------------------ */
const W = (x1, y1, x2, y2, opts = {}) => ({ a: [x1, y1], b: [x2, y2], t: 200, ext: false, o: [], ...opts });
const win = (from, to, sill, head, mark) => [from, to, sill, head, 'window', mark];
const door = (from, to, mark, head = 2.4) => [from, to, 0, head, 'door', mark];
const slide = (from, to, mark, head = 2.6) => [from, to, 0, head, 'slide', mark];
const gap = (from, to, head = 2.4) => [from, to, 0, head, 'gap', ''];
const shutter = (from, to) => [from, to, 0, 3.0, 'shutter', 'RS'];

export const WALLS_GF = [
  // --- external envelope
  W(1967, 130, 15950, 130, { ext: true }),
  W(2067, 30, 2067, 18392, { ext: true, o: [slide(3490, 5292, 'SD2', 3.0), win(5891, 6492, 1.4, 3.2, 'W7'), win(10890, 11491, 1.4, 3.2, 'W7')] }),
  W(1967, 18292, 7360, 18292, { ext: true, o: [win(3167, 6167, 0, 3.0, 'W1')] }),
  W(7260, 16300, 7260, 18392, { ext: true, o: [door(16950, 17900, 'D2')] }),
  W(7260, 16300, 9558, 16300, { ext: true, o: [door(7700, 9300, 'D1', 3.0)] }),
  W(9658, 15092, 9658, 21391, { ext: true }),
  W(9558, 21291, 15950, 21291, { ext: true, o: [shutter(9758, 15750)] }),
  W(15850, 14992, 15850, 21391, { ext: true }),
  W(9558, 15092, 13850, 15092, { ext: true }),
  W(13850, 15092, 15950, 15092, { ext: true, o: [door(14480, 15300, 'D2')] }), // garage side door
  W(13850, 9390, 13850, 15092, { ext: true, o: [win(11000, 13600, 0, 3.0, 'W1')] }),
  W(10100, 9390, 13950, 9390, { ext: true, o: [win(10300, 11500, 0, 3.0, 'W8'), win(12300, 13500, 0, 3.0, 'W8')] }),
  W(10150, 6450, 10150, 9390, { ext: true, o: [slide(6700, 8950, 'SD1', 3.0)] }),
  W(11300, 5300, 10150, 6450, { ext: true }),
  W(11300, 5300, 15950, 5300, { ext: true, o: [slide(11950, 14650, 'SD3', 3.0)] }),
  W(15850, 30, 15850, 5400, { ext: true }),
  // --- lift shaft (reinforced concrete)
  W(7260, 130, 7260, 2050, { rc: true }),
  W(9460, 130, 9460, 2050, { rc: true }),
  W(7260, 2050, 9460, 2050, { rc: true, o: [door(7900, 8800, 'LIFT', 2.1)] }),
  // --- interior partitions — positions taken from the wall-face lines of
  // sheet 3 (tools/extract_walls.py); 200 mm block unless noted
  W(9458, 2190, 11755, 2190),                                         // store / dining
  W(11655, 130, 11655, 2190, { o: [gap(891, 2090)] }),                 // store opens into the kitchen
  W(11655, 2190, 11655, 5290, { o: [slide(2692, 4991, 'SD4')] }),      // kitchen / dining
  W(7260, 2050, 7260, 5590),                                          // female majlis / dining
  W(2067, 5590, 7260, 5590, { o: [door(5761, 6860, 'D2')] }),          // majlis → wash (D2)
  W(5262, 5590, 5262, 7590, { o: [door(5790, 6590, 'D4')] }),          // bath / wash
  W(7260, 5590, 7260, 7590, { o: [gap(5692, 6892)] }),                 // wash opens to the hall
  W(2067, 7590, 7260, 7590),
  // under-stair store (100 mm): its wall stops below the landing soffit
  W(3415, 7590, 3415, 10290, { t: 100, h: 1.85, o: [door(9091, 10190, 'D3', 1.8)] }),
  W(2067, 10290, 7260, 10290, { o: [door(4800, 5900, 'D3')] }),        // stair → wash
  W(4664, 10290, 4664, 12090, { o: [door(11090, 11890, 'D4')] }),      // bath / wash
  W(7260, 10290, 7260, 12090),
  W(2067, 12090, 7260, 12090, { o: [gap(5362, 6560)] }),               // wash opens to the male majlis
  W(7260, 12090, 7260, 16290),                                        // male majlis / living
];

export const WALLS_FF = [
  // --- external envelope
  W(1967, 130, 15950, 130, { ext: true }),
  W(2067, 30, 2067, 19500, { ext: true, o: [win(1901, 3901, 0.2, 3.0, 'W5'), win(5891, 6492, 1.4, 3.2, 'W7'), win(8240, 9641, 1.0, 3.0, 'W6'), win(10890, 11491, 1.4, 3.2, 'W7')] }),
  W(1967, 19400, 9758, 19400, { ext: true, o: [win(3165, 6161, 0.2, 3.0, 'W2'), win(7657, 9256, 0.2, 3.0, 'W3')] }),
  W(9658, 19400, 9658, 21391, { ext: true }),
  W(9558, 21291, 15950, 21291, { ext: true, o: [win(11050, 14050, 0.2, 3.0, 'W2')] }),
  W(15850, 14992, 15850, 21391, { ext: true }),
  W(13850, 15092, 15950, 15092, { ext: true }),
  W(13850, 9390, 13850, 15092, { ext: true }),
  W(11655, 9390, 13950, 9390, { ext: true, o: [win(12255, 12855, 1.4, 3.2, 'W7')] }),
  W(11755, 5300, 11755, 9390, { ext: true, o: [win(5800, 8800, 0.2, 3.0, 'W2')] }),
  W(11600, 5300, 15950, 5300, { ext: true, o: [win(11853, 13453, 0.2, 3.0, 'W3'), win(13950, 14550, 1.4, 3.2, 'W7')] }),
  W(15850, 30, 15850, 5400, { ext: true }),
  // --- lift shaft
  W(7260, 130, 7260, 2050, { rc: true }),
  W(9460, 130, 9460, 2050, { rc: true }),
  W(7260, 2050, 9460, 2050, { rc: true, o: [door(7900, 8800, 'LIFT', 2.1)] }),
  // --- interior partitions — from the wall-face lines of sheet 4
  W(7260, 2050, 7260, 5590, { o: [door(3892, 4991, 'D2')] }),          // bedroom 1 door
  W(2067, 5590, 7260, 5590, { o: [gap(5362, 6560)] }),                 // bedroom 1 → bath/dress
  W(5262, 5590, 5262, 7590, { o: [door(5790, 6590, 'D4')] }),
  W(7260, 5590, 7260, 7590),                                          // dress / family living
  W(2067, 7590, 7260, 7590),
  W(2067, 10290, 7260, 10290),
  W(4664, 10290, 4664, 12890, { o: [door(11890, 12690, 'D4')] }),
  W(2067, 12890, 7260, 12890, { o: [gap(5362, 6560)] }),               // bedroom 2 → bath/dress
  W(7260, 10290, 7260, 19490, { o: [door(13274, 14374, 'D2')] }),      // bedroom 2 door
  W(7260, 16490, 9655, 16490, { o: [door(8057, 8958, 'D4')] }),        // laundry
  W(9455, 2050, 9455, 5290, { o: [door(3892, 4991, 'D2')] }),          // bedroom 3 door
  W(9455, 5290, 11755, 5290),                                         // bedroom 3 / family living
  W(13850, 130, 13850, 5290, { o: [gap(993, 2193)] }),                 // bedroom 3 → dress/bath
  W(13850, 2292, 15850, 2292, { o: [door(14050, 14850, 'D4')] }),
  W(11755, 9390, 11755, 12490),
  W(9655, 12490, 13850, 12490, { o: [door(11955, 12755, 'D4')] }),
  W(9655, 12490, 9655, 19490, { o: [door(15250, 16150, 'D2')] }),      // bedroom 4 door
  W(9655, 15090, 13850, 15090, { o: [gap(11953, 13152)] }),            // bedroom 4 → dress
];

/** Roof-level rooms: stair room and lift room. */
export const WALLS_RF = [
  W(2067, 7550, 2067, 10250, { ext: true, o: [win(8240, 9641, 1.0, 3.0, 'W6')] }),
  W(1967, 7550, 8294, 7550, { ext: true }),
  W(1967, 10250, 8294, 10250, { ext: true }),
  W(8194, 7550, 8194, 10250, { ext: true, o: [door(9200, 10050, 'D2', 2.2)] }),
  W(7260, 130, 7260, 3724, { ext: true, rc: true }),
  W(9460, 130, 9460, 3724, { ext: true, rc: true }),
  W(7160, 130, 9560, 130, { ext: true, rc: true }),
  W(7160, 3724, 9560, 3724, { ext: true, o: [door(8500, 9300, 'D2', 2.2)] }),
];

/* ------------------------------------------------------------------ *
 * Slab outlines (mm polygons) + holes
 * ------------------------------------------------------------------ */
export const SLAB_GF = {
  outline: [[1967, 30], [15950, 30], [15950, 5400], [11700, 5400], [11700, 9350], [13950, 9350],
    [13950, 14992], [15950, 14992], [15950, 21391], [9558, 21391], [9558, 18392], [1967, 18392]],
  holes: [[[7360, 230], [9360, 230], [9360, 1950], [7360, 1950]]],
};
export const SLAB_FF = {
  outline: [[1967, 30], [15950, 30], [15950, 5400], [11800, 5400], [11800, 9150], [13950, 9150],
    [13950, 14992], [15950, 14992], [15950, 21391], [9558, 21391], [9558, 19500], [1967, 19500]],
  holes: [[[7360, 230], [9360, 230], [9360, 1950], [7360, 1950]], [[2167, 7650], [7160, 7650], [7160, 10150], [2167, 10150]]],
};
export const SLAB_RF = SLAB_FF;
export const SLAB_UR = [
  { outline: [[1967, 7450], [8294, 7450], [8294, 10350], [1967, 10350]], holes: [] },
  { outline: [[7160, 30], [9560, 30], [9560, 3824], [7160, 3824]], holes: [] },
];
/** Enclosed (air-conditioned) ground-floor outline — used to find the outside face of walls. */
export const GF_ENCLOSED = [[1967, 30], [15950, 30], [15950, 5300], [11300, 5300], [10150, 6450], [10150, 9390],
  [13850, 9390], [13850, 15092], [15950, 15092], [15950, 21391], [9658, 21391], [9658, 16300], [7260, 16300],
  [7260, 18292], [1967, 18292]];

/** Hard landscaping at +0.35 (garden, outdoor seating, side yard). */
export const PAVING = [
  { outline: [[10150, 5400], [15850, 5400], [15850, 9390], [10150, 9390]], level: 0.35, kind: 'paving' },
  { outline: [[13950, 9390], [15850, 9390], [15850, 14992], [13950, 14992]], level: 0.25, kind: 'gravel' },
  { outline: [[167, 30], [1967, 30], [1967, 21290], [167, 21290]], level: 0.2, kind: 'gravel' },
  { outline: [[1967, 18392], [9558, 18392], [9558, 21290], [1967, 21290]], level: 0.2, kind: 'paving' },
];

/* ------------------------------------------------------------------ *
 * Stairs (dog-leg, 13 + 13 risers per storey) between x 2167..7160
 * ------------------------------------------------------------------ */
export const STAIR = {
  x0: 2167, x1: 7160, landingX: 3300,
  flight1: { y0: 7700, y1: 8900 }, // runs from x1 → landingX going up
  flight2: { y0: 9000, y1: 10200 }, // runs from landingX → x1 going up
  risersPerFlight: 13,
  storeys: [[0.5, 4.7], [4.7, 8.9]],
};

/* ------------------------------------------------------------------ *
 * Rooms — used for labels, floor finishes and furniture.
 * rect: [x0, y0, x1, y1]  (mm)
 * ------------------------------------------------------------------ */
export const ROOMS = [
  // Ground floor
  { id: 'gf-femaleMajlis', f: 0, key: 'femaleMajlis', rect: [2167, 230, 7160, 5490], floor: 'marble', furn: 'majlis' },
  { id: 'gf-bath', f: 0, key: 'bath', rect: [2167, 5690, 5162, 7490], floor: 'wet' },
  { id: 'gf-wash', f: 0, key: 'wash', rect: [5362, 5690, 7160, 7490], floor: 'wet' },
  { id: 'gf-stair', f: 0, key: 'stair', rect: [2167, 7690, 7160, 10190], floor: 'marble' },
  { id: 'gf-bath2', f: 0, key: 'bath', rect: [2167, 10390, 4564, 11990], floor: 'wet' },
  { id: 'gf-wash2', f: 0, key: 'wash', rect: [4764, 10390, 7160, 11990], floor: 'wet' },
  { id: 'gf-maleMajlis', f: 0, key: 'maleMajlis', rect: [2167, 12190, 7160, 18192], floor: 'marble', furn: 'majlis' },
  { id: 'gf-lift', f: 0, key: 'lift', rect: [7360, 230, 9360, 1950], floor: 'none' },
  { id: 'gf-store', f: 0, key: 'store', rect: [9558, 230, 11555, 2090], floor: 'wet' },
  { id: 'gf-kitchen', f: 0, key: 'kitchen', rect: [11755, 230, 15750, 5190], floor: 'wet', furn: 'kitchen' },
  { id: 'gf-dining', f: 0, key: 'dining', rect: [7360, 2290, 11555, 5300], floor: 'marble', furn: 'dining' },
  { id: 'gf-hall', f: 0, key: 'hall', rect: [7360, 5300, 10050, 9350], floor: 'marble' },
  { id: 'gf-outdoorSeating', f: 0, key: 'outdoorSeating', rect: [10250, 5400, 11700, 9150], floor: 'none', furn: 'outdoor' },
  { id: 'gf-garden', f: 0, key: 'garden', rect: [11700, 5400, 15750, 9150], floor: 'none', furn: 'garden' },
  { id: 'gf-living', f: 0, key: 'living', rect: [7360, 9350, 13750, 14992], floor: 'marble', furn: 'living' },
  { id: 'gf-entrance', f: 0, key: 'entrance', rect: [7360, 16400, 9558, 18292], floor: 'none' },
  { id: 'gf-garage', f: 0, key: 'garage', rect: [9758, 15192, 15750, 21191], floor: 'none', furn: 'garage' },
  // First floor
  { id: 'ff-masterBedroom', f: 1, key: 'masterBedroom', rect: [2167, 230, 7160, 5490], floor: 'wood', furn: 'bed' },
  { id: 'ff-bath', f: 1, key: 'bath', rect: [2167, 5690, 5162, 7490], floor: 'wet' },
  { id: 'ff-dress', f: 1, key: 'dress', rect: [5362, 5690, 7160, 7490], floor: 'wood' },
  { id: 'ff-stair', f: 1, key: 'stair', rect: [2167, 7690, 7160, 10190], floor: 'none' }, // stairwell void — no floor finish
  { id: 'ff-bath2', f: 1, key: 'bath', rect: [2167, 10390, 4564, 12790], floor: 'wet' },
  { id: 'ff-dress2', f: 1, key: 'dress', rect: [4764, 10390, 7160, 12790], floor: 'wood' },
  { id: 'ff-masterBedroom2', f: 1, key: 'masterBedroom', rect: [2167, 12990, 7160, 19390], floor: 'wood', furn: 'bed' },
  { id: 'ff-lift', f: 1, key: 'lift', rect: [7360, 230, 9360, 1950], floor: 'none' },
  { id: 'ff-masterBedroom3', f: 1, key: 'masterBedroom', rect: [9555, 230, 13750, 5190], floor: 'wood', furn: 'bed' },
  { id: 'ff-dress3', f: 1, key: 'dress', rect: [13950, 230, 15750, 2192], floor: 'wood' },
  { id: 'ff-bath3', f: 1, key: 'bath', rect: [13950, 2392, 15750, 5190], floor: 'wet' },
  { id: 'ff-familyLiving', f: 1, key: 'familyLiving', rect: [7360, 5390, 11655, 12390], floor: 'marble', furn: 'familyLiving' },
  { id: 'ff-lobby', f: 1, key: 'lobby', rect: [7360, 2150, 9355, 5390], floor: 'marble' },
  { id: 'ff-bath4', f: 1, key: 'bath', rect: [11855, 9490, 13750, 12390], floor: 'wet' },
  { id: 'ff-dress4', f: 1, key: 'dress', rect: [9755, 12590, 13750, 14990], floor: 'wood' },
  { id: 'ff-lobby2', f: 1, key: 'lobby', rect: [7360, 12390, 9555, 16390], floor: 'marble' },
  { id: 'ff-laundry', f: 1, key: 'laundry', rect: [7360, 16590, 9555, 19390], floor: 'wet' },
  { id: 'ff-masterBedroom4', f: 1, key: 'masterBedroom', rect: [9755, 15190, 15750, 21191], floor: 'wood', furn: 'bed' },
];

/** Openings into which a façade window/door is placed get looked up from the wall lists. */
export const FLOORS = [
  { key: 'gf', walls: WALLS_GF, base: LEVEL.gfSSL, ffl: LEVEL.gf, top: LEVEL.ffSSL - SLAB_T },
  { key: 'ff', walls: WALLS_FF, base: LEVEL.ffSSL, ffl: LEVEL.ff, top: LEVEL.rfSSL - SLAB_T },
  { key: 'rf', walls: WALLS_RF, base: LEVEL.rfSSL, ffl: LEVEL.rf, top: LEVEL.urSSL - SLAB_T },
];

/** Converts plan millimetres to scene metres (scene origin at plot centre, +Z towards the road). */
export const ORIGIN = { x: 8000, y: 10700 };
export const toScene = (x, y) => [(x - ORIGIN.x) / 1000, (y - ORIGIN.y) / 1000];
