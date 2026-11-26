# HappyHome — work log

A running record of the review and improvement work on the 3D construction
timeline. Newest entries at the top of each day.

## 2026-11-25

### Session 2 — review & improvement pass

**Requests:** add a switch to hide the surrounding houses (hidden by default),
fix the mistakes inside the house, use realistic furniture, keep reviewing and
improving, log everything here, push to `main` and run the GitHub Action.

#### 1. Neighbouring houses toggle
- Context buildings now live in their own `neighbours` group.
- New **Neighbours** checkbox in the toolbar (Arabic: «المباني المجاورة»),
  **off by default**. `#neighbours=1` in the URL turns them on at load.

#### 2. Furniture source research
- Most asset hosts (Poly Haven, ambientCG, Kenney, Quaternius) are blocked
  from the build environment, but GitHub is reachable.
- Found a GitHub mirror of **Poly Haven** models (CC0 — public domain) and
  evaluated 30 candidates on a rendered contact sheet.
- Rejected: Kenney furniture kit (cartoon style, clashes with the realistic
  look), Khronos/Wayfair samples (3–10 MB each, CC-BY).
- Selected realistic CC0 pieces (classic armchair, sofas, tufted dining
  chairs, coffee tables, chandeliers, TV/sideboard cabinet, ottoman, outdoor
  bistro set, potted plants, vases, pendant lamp). Each is optimised with
  gltf-transform (meshopt geometry + 512–1024 px WebP textures):
  200–500 KB per model.

#### 3. Interior review (room-by-room camera sweep)
Wrote an automated review that renders every room from two opposite corners
at eye height (`rooms.js` + contact sheets) and a debug picker
(`happyhome.pick(x, y)`) that reports the mesh/material under a pixel.
Mistakes found and fixed:

| # | Problem | Cause | Fix |
|---|---|---|---|
| 1 | Door leaves standing in the middle of rooms / swinging through walls | every leaf rotated the same fixed way | doors now look up the rooms on both sides, swing into the more private room (bath/dress/store > bedroom/majlis > hall), hinge on the jamb nearest a wall end and open ~85° so the leaf rests against the wall; main entrance D1 is a double door |
| 2 | Beige strips along the base of first-floor walls and diagonal "planks" on the family-living floor | the slab-edge moulding band of ground-floor external walls stuck 100 mm above the first-floor finished floor wherever an FF room sits over a GF external wall (porch, garage side, diagonal wall) | band lowered so its top stays below the slab top |
| 3 | Vertical cladding strips inside room corners (e.g. living room by the side yard) | façade cladding was always extended 170 mm past wall ends to wrap corners — at inside corners that ran into the room | extension only when the corner is outside the building outline |
| 4 | First-floor family living overlapped bedroom 3 (marble over oak, double ceiling) | room rectangle too large | split into family living + upper lobby |
| 5 | Brown, gloomy ceilings | ceilings only lit by the warm ground bounce | gypsum and plaster get a small emissive term standing in for bounced daylight |
| 6 | Crude box furniture, beds/sofas ignoring doors and windows | generic per-room-type placement | new hand-placed layouts per room (see 4) |
| 7 | Stair flights had no handrails | — | stainless handrails + posts on every flight |

#### 4. Furniture overhaul
- New `src/build/furniture.js`: a hand-placed layout for every room, following
  the furniture drawn on sheets 3–4 (sofas against the right walls, beds on the
  walls shown on plan, TV on the garage wall in the living room, etc.).
- New `src/build/props.js`: detailed procedural pieces for what the CC0 library
  doesn't cover — upholstered beds with tufted headboards, pillows, duvet and
  throw; nightstands with lamps; wardrobes; dressing table; dining table;
  wall TVs; patterned rugs; traditional built-in majlis seating; kitchen runs
  with sink, hob, hood, uppers and splashback, fridge, island with bar stools;
  wall-hung WCs, vanities with mirrors and light lines, glass showers, towel
  rails; washer/dryer; and rounded cars in the garage.
- Curtains are added automatically to every full-height window of majlis,
  living, dining and bedroom spaces.
- Models load in the background after the scene appears, so first paint isn't
  delayed by the ~6 MB of furniture.

#### 5. Walk-mode furniture collisions
- Walking no longer passes through sofas, beds, tables or kitchen units: each
  furniture piece contributes a world-space footprint box (rugs, chandeliers
  and pendants excluded). Tested: walking north in the living room stops at
  the coffee table edge + body radius.

#### 6. Performance pass (iPad)
- Measured with `renderer.info`: ~2 M triangles/frame at handover, almost all
  from the CC0 models (plants 60–70k tris, dining chairs 22k, chandelier 27k).
- Decimated the heavy models with meshoptimizer simplification
  (chandelier 27k→8k, dining chair 22k→4k, sideboard 25k→11k, plants 62–70k→7–17k,
  vase 10k→2k) — visually checked on a contact sheet. Furniture folder 5.9 MB → 4.0 MB.
- Furniture of rooms more than 24 m from the camera is skipped (unless a
  section cut is active). Triangles per frame: aerial 2 M → 60 k,
  living room 1 M → 360 k, street 2 M → 130 k.

#### 7. Realistic rigged workers
- Searched GitHub for CC0 characters; found Quaternius "Ultimate Modular
  Men/Women" construction **Worker** models (hard hat + hi-vis vest, 62-bone
  rig, 24 animation clips). Converted to meshopt GLB (~740 KB each).
- New `src/people/rigged.js`: each worker is a skinned clone with its own
  AnimationMixer (Idle / Walk base clips, cross-faded), plus task motions
  (hammering, shovelling, kneeling rebar fixing, laying blocks, plastering,
  painting, drilling, surveying, pointing, vibrating concrete) layered on top
  as world-space bone rotations — independent of the bones' local axes.
- Per-worker variation: hard-hat colour, skin tone, trousers; 1 in 3 workers
  uses the women's model.
- Bug found while testing: GLTFLoader strips dots from node names
  (`UpperArm.R` → `UpperArmR`), so arm/leg bones weren't found at first and
  only the spine bent — fixed, then verified with numeric bone positions and
  close-up renders.
- The procedural capsule workers remain as a fallback until the models load.

#### 8. Finishing details
- Skirting boards at the foot of every interior wall (appear with the floor
  finishes), marble inner window sills, framed abstract wall art (generated
  canvases) above beds, sofas and the dining sideboard.
- Ceilings brightened further (bedroom ceilings still read tan).
- Plan cutaways of both floors re-checked against sheets 3–4: furniture,
  doors and fixtures all sit where the drawings show them.
- Deploys: every push to `main` triggered "Deploy to GitHub Pages"; runs
  #3–#6 all succeeded.
- Slim vertical façade wall lights on the front piers (ground and first floor),
  as drawn on the front elevation (sheet 12).

#### 9. Day / dusk lighting
- New ☀/☾ toolbar button (and `#tod=dusk` URL option). Dusk lowers a warm sun
  in the west, regenerates the sky reflections, dims the ambient light, turns
  up the façade LEDs, wall lights, ceiling spots and lamp shades and adds a
  soft bloom (medium/high quality). Help text updated in both languages.
- Courtyard palm trunk rebuilt as one smooth tapered, curved trunk with a
  banded bark texture (was visibly stacked cylinders).
- Full 37-room sweep repeated after all changes. Known minor issue: one faint
  sub-pixel dashed line in the GF living room at low quality — couldn't be
  isolated by picking or bisection; not visible at medium/high quality.
- Verified at medium quality (with AO) that the living-room dashed line is not visible.
- Room labels no longer show through walls when you're inside the house:
  each label is ray-tested against the walls (throttled to ~3×/s) and hidden
  when a wall is in the way (e.g. "Garage" seen from the living room).

#### 10. Static batching (big iPad win)
- Measured ~2,750 draw calls per frame even after decimation: the cost was
  thousands of small meshes (blocks, plaster pieces, frames, columns…).
- New `src/core/baker.js`: when the timeline is still for 0.6 s, every fully
  built, non-animating element is merged into one mesh per material; the
  originals move to a hidden render layer (raycasters see all layers, so walk
  collisions, label occlusion and picking still work). Moving the slider
  drops the batch instantly. Glass, furniture (distance-culled), skinned
  workers and instanced meshes are left alone.
- Draw calls per frame: aerial ~2,750 → ~250, street ~2,800 → ~360,
  living room ~1,870 → ~470. Visuals, section cuts and collisions verified
  unchanged.
- Window/door frames no longer cast shadows (thin, invisible in the shadow map).

#### 11. Wet-area wall tiling
- Baths, washrooms and the laundry get glazed 600×300 wall tiles (procedural
  texture with grout) up to 2.4 m. Tiles follow each room edge, stop at door
  openings and run only up to the sill under windows. Applied during the
  interior-finishes stage, before the fixtures arrive.

## 2026-11-26

### Session 3 — fixes from the user's screen recording

**Reported:** a worker's hand/tool hitting the camera and spinning; can't walk
up the stairs ("stair wall"); wall positions not accurate ("no wall between the
majlis and the hall"); improve the assets with Blender.

#### 1. Workers rebuilt in Blender
- Installed Blender 4.0 in the build container (`apt-get install blender`).
- New `tools/blender/worker_anims.py` (run headless):
  - bakes 11 looping task clips on the worker rig — Hammer, Shovel, Kneel,
    Trowel, Plaster, Paint, Drill, Survey, Point, Vibrate, Carry — keyed every
    frame (location, rotation **and scale**), plus the original Idle/Walk/Run;
  - models the hand tools (hammer, shovel, trowel, paint roller, drill,
    concrete vibrator, block, clipboard, survey pole) **in their working pose**
    and maps them back to the rest pose through the inverse wrist deformation,
    then skins them 100 % to the wrist bone — the tool can never leave the hand;
  - exports one GLB per character with all clips and tools.
- Verified every clip with Cycles renders in Blender (contact sheet).
- Bugs found and fixed on the way: unkeyed bone channels leaking between
  baked frames (forearm scale ballooned to 16×), source clips' bone scale not
  being baked, and the exporter skipping actions not on the armature (fixed by
  registering each clip as a muted NLA strip).
- `src/people/rigged.js` no longer does any bone maths at runtime (the old
  runtime bone layering is what produced the half-missing body, spinning
  roller and arm in the camera in the recording): it just cross-fades to the
  baked clip and shows the right tool.
- Workers are now kept ≥ 450 mm (650 mm when facing a wall: painting,
  plastering, laying blocks, drilling) from every wall on their floor once
  the walls exist, so bodies and tools don't poke through walls.

#### 2. Stairs
- Cause: the under-stair store wall ran full storey height right across the
  top of flight 1 / the landing — a wall in the way of anyone walking up.
- Its wall now stops at 1.85 m (below the landing soffit), as on sheet 3.
- Automated walk test: hall → flight 1 → landing (+2.60) → turn → flight 2 →
  first floor (+4.70). Passes.

#### 3. Wall accuracy — measured from the PDF vectors
- New `tools/extract_walls.py`: finds pairs of parallel drawn lines 140–260 mm
  apart (two faces of a wall) on sheets 3–4, merges them and lists solid
  stretches and gaps (door openings) in plan millimetres.
- New `tools/check_walls.py`: checks every model wall against the drawn
  faces every 100 mm and reports stretches with no drawn wall.
- Rewrote the interior walls of both floors from these measurements
  (positions were 40–90 mm off, several were wrong):
  - GF: the wash areas are open — the north wash opens to the hall
    (1.2 m opening) and the female majlis (D2); the south wash opens straight
    into the **male majlis** (1.2 m opening, no wall); bath/wash partitions
    moved to x 5262 / 4664; store/kitchen and kitchen/dining wall moved to
    x 11655 (store opens into the kitchen, SD4 2.3 m); store wall y 2190;
    garden/bath wall y 9390; missing garage side door added.
  - FF: bath/dress walls y 12890 (was 12550); new wall bedroom 3 / family
    living (y 5290) and dress / family living (x 7260); bath 4 wall x 11755;
    door and opening positions corrected (bedroom doors, laundry, dressings).
- After: every interior wall ≥ 80 % matched by drawn faces (the two remaining
  flags are the hatched rear wall and the lift door — expected).
- Room rectangles, floor finishes and the furniture of affected rooms
  (dressing rooms, bath 4) moved to match.

#### 4. Floor over the stairwell (user screenshot)
- The first-floor "stair" room had a marble floor finish, so a tiled slab was
  laid across the stairwell opening (visible from the stair and walkable in
  walk mode). The stairwell is now a void (`floor: 'none'`), and finishes are
  never placed over stair/lift voids on upper floors.
- Verified by casting rays straight up from above both flights and the
  landing: the first hit is the underside of the next flight, nothing at
  +4.70; the walk test still climbs hall → landing → first floor.
