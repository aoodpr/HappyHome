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

#### 5. Windows checked against the schedule and plans (user screenshot)
- Read the door & window schedule (sheet 19) and located every opening from
  the glazing lines and jamb lines in the plan vectors.
- W6 (staircase, "2 nos"): 1400 × 2000, sill +1.0 m. The first-floor one moved
  to y 8240–9641 (was 8500–9800, sill/head wrong) and the **second W6 on the
  roof stair room (sheet 5) was missing** — added at the same position.
- Also corrected: W5 2000 wide at y 1901–3901 (was 1500); W7 600 × 1800,
  sill 1.4 m, at y 5891–6492 / 10890–11491 (was 600 × 600 at 1.7 m); W1 and
  W8 full height from the floor; W2/W3 sill 0.2 → head 3.0; FF front W3 at
  7657–9256; W3 / W7 on the bedroom-3 wall shifted; SD2 at 3490–5292; all
  sliding doors 3.0 m high.
- The dark concrete band under the stair window was the first-floor edge beam
  (270 mm) poking out of the 230 mm plastered wall — visible only in the
  stairwell, which has no ceiling. Beams are now 190 mm, hidden by plaster.

#### 6. Bathrooms from the SHC travertine bathroom drawings
- Read the five Alshehab Ceramica bathroom packages (plans, elevations, tile
  layouts) and mapped each to its room (all drawn north-up):
  3 × 1.8 → GF + FF north baths, 2.4 × 1.6 → GF south bath, 2.5 × 2.4 →
  FF bath 2, 1.8 × 2.8 → FF bath 3, 1.9 × 2.9 → FF bath 4.
- New procedural **travertine** texture (600 × 1200 portrait tiles, cream with
  fine straight streaks and pores); floors and walls tiled up to the
  **2.85 m false ceiling** shown on the elevations (300 − 15 bulkhead).
- New `src/build/bathrooms.js` builds every bathroom from its drawing
  (positions in cm from the room's NW corner): 20 cm × 1.2 m tiled WC
  ledges with black glass top, wall-hung WC, black dual flush plate, bidet
  spray, paper holder; floating vanity (oak, dark fluted walnut in the GF
  south bath) with stone top and vessel basin (black round / white
  rectangular), black wall mixer, capsule mirror; glass shower screen with
  black profiles, 30 cm rain head, shower column / hand shower, black linear
  drain, black shelf; backlit niche with shelves (GF south bath).
- Bathroom doors / windows moved to the positions on these drawings
  (80 cm doors 10 cm from the corner; bath 4 window 40 cm from the corner).
- The window-details sheet (Balexco aluminium, DG1 double glazing) was
  noted; frames are already modelled as black aluminium.

#### 7. Doors you can open and close
- **Sliding doors rebuilt** (were drawn as fixed windows with a transom):
  two-panel sliders — aluminium frame + glass for SD1 (hall ↔ garden /
  outdoor seating), SD2, SD3; the **dining ↔ kitchen door SD4 is now a
  wooden sliding door** (walnut panels with vertical grooves, recessed pull,
  2.6 m). One panel slides back over the fixed one.
- **Every door is interactive**: walk mode shows a "Open door (E)" /
  "Close door" hint when a door is in front within 2.2 m — press E, click, or
  tap the button on iPad; in orbit mode click a door. Doors animate in 0.8 s.
  Hinged doors start open, sliders start closed; closed doors block you.
- Door leaves / panels are excluded from static batching so they keep moving.
- Moved the hall plant and the outdoor seating set/plant so the garden slider
  has a clear path. Verified: closed slider stops the walker at the glass;
  opened, the walker passes into the outdoor seating area.
- The interior-design reference PDF ("13 SEP- Ahmed Ghazi") is on the user's
  PC and > 30 MB — waiting for an upload to apply the interior style.

#### 8. Interior style from the interior-design package (13 SEP – Ahmed Ghazi, parts 2–3)
- Read the mood board, the room renders (living, dining, majlis, office, FF
  living, master / girl / boy / double bedrooms, dressing, baths) and the
  room plans. Palette: warm greige walls, walnut, cream boucle, taupe,
  caramel accents, grey + cream marble, light oak, brass.
- Room uses updated to the design: GF "female majlis" → **Office**, the
  FF bedrooms → **Girl bedroom** (NW), **Boy bedroom** (NE), **Double
  bedroom** (W), **Master bedroom** (SE); labels in EN/AR.
- New `src/build/style.js`: per-room floors (grey marble GF living/dining/
  hall/office, cream marble majlis/FF living/lobbies/stairs, light oak
  bedrooms), **gypsum perimeter LED cove ceilings** with black linear AC
  slots, feature walls (vertical walnut slats with LED edges, nero marble at
  the lift, linen panel, navy panel in the boy bedroom) and white panel
  mouldings (majlis, double bedroom).
- New procedural pieces (`props.js`): modern sofas (boucle / taupe, curved),
  velvet tub chairs, organic marble-and-brass coffee tables, brass ring
  chandelier (majlis), white globe pendant cluster (dining), executive office
  desk + black/walnut shelving, linear fireplace under the living-room TV,
  sheer curtains behind taupe drapes, cream / grey / persian rugs.
- Layouts redone for office, majlis, dining, GF living and FF living; bedrooms
  restyled (beige upholstered beds, taupe / grey bedding, beige tub chairs,
  cream rugs, beige joinery); dining chairs recoloured to brown leather.

#### 9. Stair windows lowered, stair exit unblocked, better walking (user screenshots)
- **W6 position from the side elevation (sheet 16):** the two stair windows
  are 1400 × 2000 centred on the landings and cross the slab band — lower
  ≈ +3.00…+5.00, upper ≈ +7.26…+9.24. They were wrongly at first-floor sill
  height (+5.7). Now built as single storey-spanning windows: walls get a
  hole / band opening, the slab and roof screed are notched and the edge
  beams and façade band stop at the window; white moulding frame outside.
- **Couldn't reach the first floor:** the new black shelving unit in the
  first-floor living room had been placed right in front of the top of the
  stair. Moved to the north part of that wall. Walk test: hall → landing →
  first floor (+4.70) passes.
- **Walking feel:** smooth acceleration / braking, sliding along walls
  instead of sticking, eye height eased on stairs, gentler speed-scaled head
  bob, wider 68° lens in walk mode, and quick jumps — **G** ground-floor hall,
  **F** first-floor living by the stair, **R** roof.

#### 10. Stair balustrade — black iron + wood (user reference picture)
- Removed the glass guard and stainless rails. New balustrade on the inner
  edge of every flight, both storeys: black wrought-iron balusters (one per
  tread, two ornamental knuckles each, rosette at the foot), black newel posts
  with ball caps and oak collars at the foot, both landing corners and the
  top, and a warm oak handrail following the pitch (plus a short oak rail
  across the landing turn). An invisible guard along each balustrade keeps
  walk mode from stepping into the stair well.

#### 11. Façade from the final renders + garage passage (user screenshot + "233 – Final Renders")
- **No wall between front yard and garage:** the garage's west wall now has
  the 1.85 m open passage shown on the plan (y 18745–20591) and in the
  renders.
- **Bigger borders:** window / door surrounds are now 220 mm wide with a
  70 mm deeper inner step and a projecting sill; floor cornices are deep
  stepped bands (body + projecting top and bottom lips); parapets get a
  two-tier stepped cornice.
- Stone cladding changed to the renders' **grey large-format panels**
  (600 × 1200, stack bond); render / trim in greige; dark grey blind box
  across the top of every tall window.

#### 12. First-floor living rearranged (user sketch)
- TV + cabinet moved to the north wall with the walnut slat feature wall;
  the L-sofa sits at that end facing the TV, beside the big window W2.
- New **coffee corner** at the south end: base cabinets with stone top,
  walnut backsplash with two LED-lit floating shelves of cups, espresso
  machine, grinder and kettle, plus a marble bistro table with two beige
  tub chairs.

#### 13. Kitchen ceiling fan
- New `ceilingFan()` prop: 1.32 m five-blade fan with walnut blades on black
  brackets, matte-black motor with brass band and an opal light dome, on a
  0.42 m downrod. Blades spin (~1.3 rev/s) while the fan is on screen.
- Placed over the open floor between the island and the garden slider, clear
  of the two island pendants (blades at ≈ 2.8 m).

#### 14. Collapsible panels
- Each panel has a ▴ / ▾ button: the toolbar collapses to the title bar,
  the stage card to the stage badge + name, the timeline to play + slider.
  Choices are remembered between visits (localStorage, guarded); on narrow
  screens the stage card starts collapsed.
- ⤢ in the toolbar (or **H**) hides every panel for a clean full-screen view;
  ☰ (or H) brings them back. Help text and README updated (EN / AR).

#### 15. Electrical: sockets, switch gangs, working lights
- Source: interior package part 2 — ELECTRICAL GROUND / FIRST FLOOR PLANS
  (pp. 34–35) and KEY LIGHTING plans (pp. 42–43).
- New `tools/extract_electrical.py`: pulls the socket (orange), data/TV
  (blue) and outdoor (pink) symbols from the PDF vectors and converts them to
  plan mm using the sheets' dimension chains → `src/data/electrical.json`
  (109 sockets, 5 data/TV, 14 outdoor). Each is snapped to the nearest wall
  face: twin switched sockets (white plate, rocker, red indicator) at 0.35 m,
  1.1 m in kitchen / baths / laundry; data plates; grey weatherproof boxes
  outside.
- The key-lighting sheets carry no dimensions, so switches are placed by
  rule: one brass-edged plate inside every room's door (latch side, 1.2 m),
  **one gang per circuit** — ceiling downlights · LED cove & feature walls ·
  chandelier / pendants / lamps · ceiling fan (kitchen). 29 plates.
- New `src/build/electrical.js` → `Lighting`: every light is now on a
  per-room circuit (cloned emissive materials); switching dims/brightens the
  fittings, stops the fan, and a pool of three warm point lights follows the
  lit rooms nearest the camera so the room itself gets darker / brighter
  (fixed pool → no shader recompiles). Day / dusk levels respected.
- Interaction unified with doors: walk mode aims with the crosshair (switches,
  sockets within 2.4 m, else the door in front) → prompt "Living Room ·
  Ceiling lights · ON (E)"; orbit mode click. Tested: living-room lights,
  kitchen fan and master-bedroom cove toggle; sockets toggle their indicator.

## 2026-11-27

#### 16. Working lift
- New `src/build/lift.js`: cabin in the RC shaft (walnut back wall with
  mirror, brushed-steel sides, steel handrails, LED ceiling, dark floor,
  car operating panel with floor display); centre-opening stainless landing
  doors on both floors + cabin doors that slide into the shaft; steel
  architraves and call buttons on the hall / lobby side.
- Controls (walk: aim + E / click; orbit: click): landing "Call the lift",
  in-cabin "Go to ground floor / first floor / open doors". State machine:
  closing → moving (1 m/s, eased stop) → opening → dwell 7 s → closing;
  extra calls are queued. Door safety edge: anyone in the doorway re-opens
  the doors.
- A walker standing in the cabin rides with it. Tested: walk in at GF, press
  "first floor" → cabin and walker reach +4.70, doors open, walk out into
  the first-floor lobby.

#### 17. Realism pass + overall review
- **Tone mapping:** ACES → Khronos *PBR Neutral* (exposure 0.62 day / 0.95
  dusk). Material colours now read true (stone, travertine, oak); the sky is
  blue instead of washed-out grey. AgX was tried and rejected (too flat).
- **High preset:** N8AO quality *High* and slightly stronger; a subtle
  high-threshold bloom so lamps and LED coves glow (stronger at dusk); 1024 px
  textures for the close-up finishes (stone, marbles, travertine, oak), while
  the rest stay at 512 px. Startup cost is about +1 s instead of +3 s if every
  texture were 1024 px.
- **Site:** grey paving to match the final renders; soft broadleaf-tree
  backdrop (noise-displaced foliage blobs) around the plot. It shows when the
  neighbouring villas are hidden (the default) and swaps out when they are
  shown.
- **Fixed: dotted line through rooms.**
  - What it was: a dotted line ran across the office, living room, washrooms
    and stair landing.
  - How it was found: bisecting the scene by hiding meshes.
  - Cause: the 400 m road / pavement boxes and the 400 m ground polygon.
    Their long triangle edges lost depth precision and bled through the walls.
  - Fix: the ground is now four strips around the pit, and the street pieces
    are boxes; both are tessellated every ~8 m. Verified the line is gone in
    all affected rooms.
- **Fixed:** room labels could flash through walls for a frame when the
  camera jumped onto a floor; occlusion is now recomputed immediately on a
  floor change.
- **Review:**
  - Room-by-room sweep: 35 rooms × 2 views.
  - 14-stage sheet.
  - Console error sweep: no errors.
  - Day and dusk exterior / interior before-after renders.

#### 18. Stair window W6 + stairwell gap (user report from phone)
- **Gap between ground and first floor in the stairwell.**
  - Cause: where the FF (and roof) slab is cut away for the stair, nothing
    filled the 220 mm slab band between the GF wall head and the FF wall
    foot. You could see through to the back of the façade, and the FF
    skirting hung in mid-air above the gap.
  - Fix, filling the band: `walls.js` now detects the stretches of each wall
    that border the stair void and fills that band with blockwork and
    plaster, at both the GF→FF and FF→roof levels.
  - Fix, skirting: skirting is now built per face and skipped where the face
    borders the open stairwell.
- **Slab strip in front of the glass:** an 18 mm strip of the FF slab edge
  crossed the window outside, because the notch for W6 stopped at x 1985.
  The cast slab now uses an outline with the stair void as an inlet that
  reaches the outer edge (`SLAB_FF.cut`). The original outline is kept for
  façade-side tests.
- **Edge beam in the window reveals:** the beam pieces split at W6 were
  still lengthened by half their width and poked 95 mm into the opening as
  grey blocks. They now stop at the jambs. Jamb reveal linings were added:
  white outside, plaster inside.
- **W6 is a fixed single pane:** the transom was removed.
- **Checks:**
  - Renders from inside and outside the stairwell.
  - Console sweep: no errors.
  - Walk test: off the top step onto FF +4.70; the half landing holds +2.6.

#### 19. Jotun paint schedule (owner's choice)
New `src/data/colours.js` holds the schedule. Hex values are the published
on-screen approximations; a physical sample is the reference.

| Code | Name | Approx. hex | Where |
|---|---|---|---|
| 8181 | Pastel Mint | #E7E1C9, −30 % | First-floor bedrooms + dressing rooms |
| 1931 | Cashew | #E3DDCD, −30 % | All other interior walls (GF, FF lobby / family living, stair) |
| 1964 | Sadaf | #EDDDC6 | Exterior painted walls, roof parapets (both faces) |
| 0568 | Woodsmoke | #DBCAB5 | Exterior cornices, window surrounds, projections, W6 frame |

- **Dilution:** "مخفف 30 %" is applied as 30 % lighter, i.e. the tint is mixed
  30 % towards white. It is one number per colour (`dilute`).
- **Texture compensation:** the procedural plaster / render textures carry their
  own tint, so the material colour is divided by the texture base. The surface
  albedo then equals the paint colour.
- **Bedroom faces:** FF wall faces that border a bedroom or dressing room
  (sampled along each wall) get a 3 mm coat in 8181. Everything else keeps
  the 1931 plaster.
- **Painted finish:** at the paint stage the walls switch to the finer paint
  texture with softer relief. A warm-bounce term on the indirect light stops
  light warm whites reading as cool grey under the blue sky probe.
  Measured: the wall changed from RGB 176/183/181 (cyan cast) to 184/183/169.
- **Stone cladding:** the road-façade grey stone cladding (final renders) is
  unchanged.

#### 20. Upper stair window W6 clear + exterior paint in shade
- **Upper W6 (roof level):** a bar crossed the glass. It was the roof
  build-up (screed, membrane, cool-roof coat): its cut-out for the roof-room
  footprint was a hole starting at x 1990, which left a 23 mm strip in front of
  the window at 8.75–8.89. The build-up outline now has the roof-room
  footprint as an inlet reaching the west edge. Both stair windows are now a
  single fixed pane with nothing crossing them.
- **Exterior paint in shade:** shaded façades read green-grey (RGB 147/151/145)
  instead of Sadaf beige. A shared `warmBounce()` (materials.js) now warms the
  indirect light on the exterior paints (ground bounce from the sand), giving
  RGB 156/151/134 in shade. The interior paints use the same helper.

#### 21. Furniture toggle + site photos (owner's Pixel 10 Pro wide-angle photos)
- **Furniture toggle:**
  - A "Furniture / الأثاث" checkbox (and `?furniture=0`) hides every piece of furniture and all curtains.
  - All furniture now hangs under one `furniture:all` group.
- **Photo log:** `docs/site-photos.md` records what each batch showed. Measurements were read from known sizes (600 × 1200 tiles, blocks, scaffold frames), allowing for wide-lens distortion.
- **Applied from the photos:**
  - Gypsum ceiling design: perimeter band and cornice, LED step, and a coffer grid with downlights at the crossings.
  - The hall's linear slot.
  - 2.70 m dressing ceilings.
  - The stair window W6 lowered to sit just above the half landings.
  - Ensuite windows W7 made tall and narrow, under the false ceiling.
- **Checks:**
  - Console sweep: no errors.
  - Walk test: off the top step onto FF +4.70.
  - Walk-mode renders: bedroom and master ceilings, hall slot, stair window from the landing and from FF, ensuite window.

#### 22. Front boundary wall, entrance door, porch ↔ garage, stair slab edge
- **Front boundary wall** (owner's site photo + reference render):
  - The wall is 2.3 m high, was 1.2 m. It is rendered in Jotun 1964 with a 0568 coping.
  - Pilaster pairs every ~2.4 m frame grey stone strips with ground uplights.
  - The gate piers are 2.6 m with stepped caps and slim black wall lights.
  - The gate is dark aluminium: a solid leaf with a long pull, plus a fixed slatted side panel. The leaf opens and closes in walk mode.
- **Main entrance door D1:** aluminium with a wood-grain finish (`M.woodAlu`), black aluminium frame, black reveal lines and long black pulls.
- **Entrance porch ↔ garage:** now open under a beam, as on site (`gap(16400, 20591, 2.9)` on x 9658).
- **Stair slab edge (user screenshot):** the FF and roof slab stair cut-out stopped at y 10150, 40 mm short of the wall face (10190). That left a dark concrete strip running along the flight. The cut-out now meets the wall face.
- **Wall check against the working drawings** (`tools/check_walls.py`): all walls are ≥ 80 % covered except:
  - the back boundary, drawn as a party wall;
  - the lift front, which has door openings.

  No other changes were needed. Note: the drawing does show a wall along x 9658 by the porch. It was opened here because the site photo shows a column and beam.

#### 23. First-floor family living re-laid out (sheet 4 + owner's mark-up); garage side door removed
- **South wall of the living room** (TV wall): it now runs x 8872 → 11743, as drawn on sheet 4 (was 9655). This leaves a 1.5 m opening to the lobby, as on site.
- **Furniture**, following the drawn layout:
  - 3.6 m sofa along the big window W2, facing the room.
  - 2.2 m sofa on the north wall.
  - TV and media unit centred on the south wall, with the walnut feature panel moved behind it.
  - Coffee corner (1.8 m) on the east wall past the window.
  - Bistro table on the stair side.
- **Garage:** the side door in the back wall is removed. The site photo shows a solid wall with the DB panel.

#### 24. Ceilings re-done to the site photos; wooden doors; garage side opening
- **Gypsum ceilings:** the coffer grid and LED step are removed. The photos show a plain tray:
  - a 600 mm perimeter band, 160 mm down, with a small cornice at the walls;
  - a step up into a plain raised centre field, with a crown moulding in the step's top corner;
  - downlights along the band and over the field, and a linear AC diffuser in the band.
- **GF hall:** a narrow raised strip (480 mm) with crown mouldings along both edges, as in the photos.
- **Doors:**
  - Interior doors are now natural wood veneer (`M.doorVeneer`), with matching frames and matt-black levers.
  - The entrance door is a more natural wood-grain tone.
  - The owner's Instagram references can't be opened from here (host blocked / login), so I'll refine the doors once screenshots arrive.
- **Garage north wall:** an open side passage with no door, at the drawn position (14480–15300), as on site.
