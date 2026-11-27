# HappyHome

A web-based 3D model of a two-storey villa (project **PE-233-25**) with an interactive timeline. Drag the slider to watch the house being built, from the empty plot to handover. Workers and machines are on site at every stage. You can orbit the site, walk around and inside the house at eye level, and look at it from any angle.

The model is built from the project's working drawings: plans, elevations, sections, framing plans and schedules.

## Features

- **Continuous construction timeline.** There are 14 stages, and every footing, column, slab, block course, pipe, window and piece of furniture has its own start and end time. Dragging the slider slowly shows the building grow piece by piece. You can also press ▶ to play it at 0.5×, 1×, 2× or 4× speed.
- **Construction stages.**
  - **Structure:** survey, excavation, blinding and footings, neck columns and ground beams, backfill, grade slab, and columns with post-tensioned slabs (shoring → deck → rebar → pour → cure → strip).
  - **Envelope and services:** roof rooms, blockwork laid course by course, MEP rough-in, plaster and roof waterproofing.
  - **Finishing:** stone façade and windows, interior finishes and furniture, then landscaping and handover.
- **Workers and machinery.** Rigged construction workers (CC0 models with hard hats and hi-vis vests) hammer, shovel, tie rebar, lay blocks, plaster, paint and drill. Each stage has its own crew in the right place and at the right level. The machines are an excavator digging the pit, a dump truck, a concrete mixer, a pump truck with a 3-section boom, a plate compactor, a power float and a total station.
- **Camera modes.**
  - **Orbit:** rotate, zoom and pan.
  - **Walk:** first person with collisions, and you can climb the stairs. On desktop use the mouse with W A S D. On iPad use the on-screen joystick and drag to look.
  - **Tour:** a cinematic fly-around.
  - **Preset views:** street, aerial, rear, garden, living room, bedroom and roof.
- **Section cut.** Hide the upper floors to look into the ground or first floor.
- **Furnished interior.** Every room is furnished following the furniture shown on the plans: realistic CC0 sofas, armchairs, dining chairs, coffee tables, chandeliers, plants and more, plus detailed procedural beds, wardrobes, kitchen, bathrooms, laundry, curtains and rugs. Walk mode collides with furniture.
- **Neighbours toggle.** The surrounding houses are hidden by default; tick **Neighbours** (or add `#neighbours=1`) to show the street context.
- **Bilingual interface.** English and Arabic, with a full right-to-left layout and room labels in both languages.
- **Realistic rendering.** Physically based materials with procedural textures (concrete, blockwork, stone cladding, marble, oak, pavers and more), a physical sky with image-based lighting, soft shadows and N8AO ambient occlusion. There are High, Medium and Low quality presets; iPad defaults to Medium.

## Controls

| Action | Desktop | iPad |
|---|---|---|
| Scrub the timeline | Drag the slider · ← / → step through stages | Drag the slider |
| Play / pause | ▶ button · Space | ▶ button |
| Orbit / zoom / pan | Left-drag / wheel / right-drag | One finger / pinch / two fingers |
| Walk mode | Click the scene, then W A S D + mouse, Shift to run, Esc to release | Left joystick to move, drag to look |
| Open / close doors | Walk mode: E or click when the door hint shows · Orbit: click a door | Tap the door button |
| Light switches & sockets | Walk mode: aim the crosshair at a switch gang or socket, press E / click · Orbit: click it | Aim, then tap the button |
| Camera views | Views menu · keys 1–7 | Views menu |
| Language | ع / EN button · L | ع / EN button |
| Collapse a panel / hide all panels | ▴ ▾ on each panel · ⤢ or H | ▴ ▾ · ⤢, then ☰ to bring them back |

Add `#lang=ar`, `#t=7.5` (timeline position, 0–14) or `#q=low|medium|high` to the URL to start in a given state.

## How the model was made from the drawings

| Data | Source sheets |
|---|---|
| Structural grid 1–10 / A–L (15.99 m × 21.43 m), levels (road ±0.00 → upper parapet) | Plans, front elevation, section B-B |
| Column positions and sizes | Extracted from the PDF vector geometry of the floor plans (1:100) |
| Footings F1–F7, ground beams GB1–GB3, PT beams, slab thickness | Framing plans and the schedule of beams, columns and footings |
| Walls, doors, windows, rooms | Ground, first and roof floor plans, transcribed against a millimetre overlay |
| Façade (300×1200 stone, mouldings, rolling shutter) | Front elevation |
| Stair and lift rooms, upper roof with 2 × 2500 L tanks | Roof and upper-roof framing plans |

All of the building data is in [`src/data/building.js`](src/data/building.js). Coordinates are millimetres from grid 1 / grid A, and levels are metres above road level. The construction stages and their descriptions are in [`src/data/stages.js`](src/data/stages.js).

## Project structure

```
src/
  data/        building.js (geometry from the drawings) · stages.js (14 stages, EN/AR)
  core/        scene.js (renderer, sky, lights, post-processing) · textures.js (procedural PBR)
               materials.js · timeline.js (drives every element from one value t)
  build/       site.js · structure.js · walls.js · interior.js
  people/      worker.js (procedural rig + animations) · crew.js (who works where) · machines.js
  controls/    cameras.js (orbit, walk, tour, presets)
  i18n.js      UI strings (English / Arabic)
  main.js      wiring + UI
```

## Development

Requires Node.js 20 or newer.

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

The build is a static site in `dist/`, with no server code and no external assets.

## Deployment (GitHub Pages)

`.github/workflows/deploy.yml` builds the site and publishes it to GitHub Pages on every push to `main`. It can also be run manually from the Actions tab. To turn it on:

1. Open **Settings → Pages** and set **Source** to **GitHub Actions**.
2. Merge into `main`. The site is published at `https://<owner>.github.io/HappyHome/`.

## Asset credits

All third-party assets are CC0 (public domain); no attribution is required, but credit where due:

- Furniture, lighting and plants: [Poly Haven](https://polyhaven.com/models) (CC0), optimised with gltf-transform.
- Construction worker characters: [Quaternius](https://quaternius.com/) "Ultimate Modular Men / Women" (CC0).

## Work log

See [WORKLOG.md](WORKLOG.md) for a record of every review and improvement pass.

## Tech

[three.js](https://threejs.org/) · [N8AO](https://github.com/N8python/n8ao) · [Vite](https://vitejs.dev/). Textures and machines are procedural; furniture and workers are CC0 models (see credits).
