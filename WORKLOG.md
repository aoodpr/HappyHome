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
