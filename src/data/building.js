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
  W(2067, 30, 2067, 18392, { ext: true, o: [slide(3400, 5200, 'SD2', 2.6), win(5850, 6450, 1.7, 2.3, 'W7'), win(10700, 11300, 1.7, 2.3, 'W7')] }),
  W(1967, 18292, 7360, 18292, { ext: true, o: [win(3167, 6167, 0.2, 3.2, 'W1')] }),
  W(7260, 16300, 7260, 18392, { ext: true, o: [door(16950, 17900, 'D2')] }),
  W(7260, 16300, 9558, 16300, { ext: true, o: [door(7700, 9300, 'D1', 3.0)] }),
  W(9658, 15092, 9658, 21391, { ext: true }),
  W(9558, 21291, 15950, 21291, { ext: true, o: [shutter(9758, 15750)] }),
  W(15850, 14992, 15850, 21391, { ext: true }),
  W(9558, 15092, 13850, 15092, { ext: true }),
  W(13850, 15092, 15950, 15092, { ext: true }),
  W(13850, 9250, 13850, 15092, { ext: true, o: [win(11000, 13600, 0.2, 3.2, 'W1')] }),
  W(10100, 9250, 13950, 9250, { ext: true, o: [win(10300, 11500, 0.6, 2.8, 'W8'), win(12300, 13500, 0.6, 2.8, 'W8')] }),
  W(10150, 6450, 10150, 9250, { ext: true, o: [slide(6700, 8950, 'SD1')] }),
  W(11300, 5300, 10150, 6450, { ext: true }),
  W(11300, 5300, 15950, 5300, { ext: true, o: [slide(11950, 14650, 'SD3')] }),
  W(15850, 30, 15850, 5400, { ext: true }),
  // --- lift shaft (reinforced concrete)
  W(7260, 130, 7260, 2050, { rc: true }),
  W(9460, 130, 9460, 2050, { rc: true }),
  W(7260, 2050, 9460, 2050, { rc: true, o: [door(7900, 8800, 'LIFT', 2.1)] }),
  // --- interior partitions
  W(9460, 2050, 11300, 2050, { t: 150 }),
  W(11400, 130, 11400, 1200, { t: 150 }),
  W(11300, 2050, 11300, 5300, { t: 150, o: [slide(3200, 4600, 'SD4')] }),
  W(7260, 2050, 7260, 5550, { t: 150 }),
  W(2067, 5550, 7260, 5550, { t: 150, o: [door(5800, 6800, 'D2')] }),
  W(4550, 5550, 4550, 7550, { t: 150, o: [door(5900, 6700, 'D4')] }),
  W(7260, 5550, 7260, 7550, { t: 150, o: [gap(5700, 6700)] }),
  W(2067, 7550, 7260, 7550, { t: 150 }),
  W(3350, 7550, 3350, 10250, { t: 150, o: [door(9150, 9950, 'D3')] }),
  W(2067, 10250, 7260, 10250, { t: 150, o: [door(4500, 5300, 'D3')] }),
  W(4550, 10250, 4550, 12000, { t: 150, o: [door(10800, 11600, 'D4')] }),
  W(7260, 10250, 7260, 12000, { t: 150 }),
  W(2067, 12000, 7260, 12000, { t: 150 }),
  W(7260, 12000, 7260, 16300, { t: 150 }),
];

export const WALLS_FF = [
  // --- external envelope
  W(1967, 130, 15950, 130, { ext: true }),
  W(2067, 30, 2067, 19500, { ext: true, o: [win(2300, 3800, 0.9, 2.9, 'W5'), win(5850, 6450, 1.7, 2.3, 'W7'), win(8500, 9800, 1.0, 2.6, 'W6'), win(10700, 11300, 1.7, 2.3, 'W7')] }),
  W(1967, 19400, 9758, 19400, { ext: true, o: [win(3167, 6167, 0.1, 3.1, 'W2'), win(7500, 9100, 0.1, 3.1, 'W3')] }),
  W(9658, 19400, 9658, 21391, { ext: true }),
  W(9558, 21291, 15950, 21291, { ext: true, o: [win(11050, 14050, 0.1, 3.1, 'W2')] }),
  W(15850, 14992, 15850, 21391, { ext: true }),
  W(13850, 15092, 15950, 15092, { ext: true }),
  W(13850, 9250, 13850, 15092, { ext: true }),
  W(11600, 9250, 13950, 9250, { ext: true, o: [win(12100, 12700, 1.6, 2.4, 'W7')] }),
  W(11700, 5300, 11700, 9250, { ext: true, o: [win(5800, 8800, 0.1, 3.1, 'W2')] }),
  W(11600, 5300, 15950, 5300, { ext: true, o: [win(12100, 13700, 0.1, 3.1, 'W3'), win(14000, 14600, 1.6, 2.4, 'W7')] }),
  W(15850, 30, 15850, 5400, { ext: true }),
  // --- lift shaft
  W(7260, 130, 7260, 2050, { rc: true }),
  W(9460, 130, 9460, 2050, { rc: true }),
  W(7260, 2050, 9460, 2050, { rc: true, o: [door(7900, 8800, 'LIFT', 2.1)] }),
  // --- interior partitions
  W(7260, 2050, 7260, 5550, { t: 150, o: [door(3950, 4850, 'D2')] }),
  W(2067, 5550, 7260, 5550, { t: 150, o: [gap(5300, 6200)] }),
  W(4550, 5550, 4550, 7550, { t: 150, o: [door(5900, 6700, 'D4')] }),
  W(2067, 7550, 7260, 7550, { t: 150 }),
  W(2067, 10250, 7260, 10250, { t: 150 }),
  W(4550, 10250, 4550, 12550, { t: 150 }),
  W(2067, 12550, 7260, 12550, { t: 150, o: [door(3700, 4500, 'D4'), gap(5200, 6400)] }),
  W(7260, 10250, 7260, 19400, { t: 150, o: [door(12950, 13900, 'D2')] }),
  W(7260, 16450, 9658, 16450, { t: 150, o: [door(8000, 8800, 'D4')] }),
  W(9460, 2050, 9460, 5300, { t: 150, o: [door(3950, 4850, 'D2')] }),
  W(13650, 130, 13650, 5300, { t: 150, o: [gap(1000, 1900)] }),
  W(13650, 2250, 15850, 2250, { t: 150, o: [door(14000, 14800, 'D4')] }),
  W(11700, 9250, 11700, 12450, { t: 150 }),
  W(9558, 12450, 13850, 12450, { t: 150, o: [door(11900, 12700, 'D4')] }),
  W(9658, 12450, 9658, 19400, { t: 150, o: [door(15200, 16100, 'D2')] }),
  W(9558, 15092, 13850, 15092, { t: 150, o: [gap(12300, 13200)] }),
];

/** Roof-level rooms: stair room and lift room. */
export const WALLS_RF = [
  W(2067, 7550, 2067, 10250, { ext: true }),
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
export const GF_ENCLOSED = [[1967, 30], [15950, 30], [15950, 5300], [11300, 5300], [10150, 6450], [10150, 9250],
  [13850, 9250], [13850, 15092], [15950, 15092], [15950, 21391], [9658, 21391], [9658, 16300], [7260, 16300],
  [7260, 18292], [1967, 18292]];

/** Hard landscaping at +0.35 (garden, outdoor seating, side yard). */
export const PAVING = [
  { outline: [[10150, 5400], [15850, 5400], [15850, 9250], [10150, 9250]], level: 0.35, kind: 'paving' },
  { outline: [[13950, 9250], [15850, 9250], [15850, 14992], [13950, 14992]], level: 0.25, kind: 'gravel' },
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
  { f: 0, key: 'femaleMajlis', rect: [2167, 230, 7160, 5450], floor: 'marble', furn: 'majlis' },
  { f: 0, key: 'bath', rect: [2167, 5650, 4475, 7450], floor: 'wet' },
  { f: 0, key: 'wash', rect: [4625, 5650, 7160, 7450], floor: 'wet' },
  { f: 0, key: 'stair', rect: [2167, 7650, 7160, 10150], floor: 'marble' },
  { f: 0, key: 'bath', rect: [2167, 10350, 4475, 11900], floor: 'wet' },
  { f: 0, key: 'wash', rect: [4625, 10350, 7160, 11900], floor: 'wet' },
  { f: 0, key: 'maleMajlis', rect: [2167, 12100, 7160, 18192], floor: 'marble', furn: 'majlis' },
  { f: 0, key: 'lift', rect: [7360, 230, 9360, 1950], floor: 'none' },
  { f: 0, key: 'store', rect: [9560, 230, 11300, 1950], floor: 'wet' },
  { f: 0, key: 'kitchen', rect: [11375, 230, 15750, 5200], floor: 'wet', furn: 'kitchen' },
  { f: 0, key: 'dining', rect: [7360, 2150, 11225, 5300], floor: 'marble', furn: 'dining' },
  { f: 0, key: 'hall', rect: [7360, 5300, 10050, 9350], floor: 'marble' },
  { f: 0, key: 'outdoorSeating', rect: [10250, 5400, 11700, 9150], floor: 'none', furn: 'outdoor' },
  { f: 0, key: 'garden', rect: [11700, 5400, 15750, 9150], floor: 'none', furn: 'garden' },
  { f: 0, key: 'living', rect: [7360, 9350, 13750, 14992], floor: 'marble', furn: 'living' },
  { f: 0, key: 'entrance', rect: [7360, 16400, 9558, 18292], floor: 'none' },
  { f: 0, key: 'garage', rect: [9758, 15192, 15750, 21191], floor: 'none', furn: 'garage' },
  // First floor
  { f: 1, key: 'masterBedroom', rect: [2167, 230, 7185, 5475], floor: 'wood', furn: 'bed' },
  { f: 1, key: 'bath', rect: [2167, 5625, 4475, 7475], floor: 'wet' },
  { f: 1, key: 'dress', rect: [4625, 5625, 7185, 7475], floor: 'wood' },
  { f: 1, key: 'stair', rect: [2167, 7650, 7160, 10150], floor: 'marble' },
  { f: 1, key: 'bath', rect: [2167, 10325, 4475, 12475], floor: 'wet' },
  { f: 1, key: 'dress', rect: [4625, 10325, 7185, 12475], floor: 'wood' },
  { f: 1, key: 'masterBedroom', rect: [2167, 12625, 7185, 19300], floor: 'wood', furn: 'bed' },
  { f: 1, key: 'lift', rect: [7360, 230, 9360, 1950], floor: 'none' },
  { f: 1, key: 'masterBedroom', rect: [9535, 230, 13575, 5200], floor: 'wood', furn: 'bed' },
  { f: 1, key: 'dress', rect: [13725, 230, 15750, 2175], floor: 'wood' },
  { f: 1, key: 'bath', rect: [13725, 2325, 15750, 5200], floor: 'wet' },
  { f: 1, key: 'familyLiving', rect: [7335, 2125, 11600, 12375], floor: 'marble', furn: 'familyLiving' },
  { f: 1, key: 'bath', rect: [11775, 9350, 13750, 12375], floor: 'wet' },
  { f: 1, key: 'dress', rect: [9735, 12525, 13750, 15017], floor: 'wood' },
  { f: 1, key: 'lobby', rect: [7335, 12375, 9583, 16375], floor: 'marble' },
  { f: 1, key: 'laundry', rect: [7335, 16525, 9583, 19300], floor: 'wet' },
  { f: 1, key: 'masterBedroom', rect: [9735, 15167, 15750, 21191], floor: 'wood', furn: 'bed' },
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
