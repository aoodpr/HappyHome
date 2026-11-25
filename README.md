# HappyHome

A web-based 3D house model with an interactive timeline slider that lets users view and switch between the stages of a home's construction.

## Overview

HappyHome shows how a house is built, step by step. Drag the timeline slider to move through the build. The 3D model updates to show the house at that stage, and you can orbit, zoom and pan to look at it from any angle.

## Planned construction stages

| # | Stage | What you see |
|---|-------|--------------|
| 1 | Site Preparation | Cleared and graded lot, survey stakes and string lines |
| 2 | Foundation | Footings and concrete slab |
| 3 | Framing | Timber studs, plates and headers around door and window openings |
| 4 | Roofing | Ridge beam, rafters, gable framing and roof sheathing |
| 5 | Exterior Envelope | Siding, shingles, windows, trim and front door |
| 6 | Finishing & Landscaping | Porch, chimney, garden path, trees and fence |

## Planned features

- Interactive 3D scene rendered in the browser with [three.js](https://threejs.org/)
- Timeline slider plus play/pause and previous/next controls
- Animated transitions as building elements appear or are removed
- Info panel with each stage's description, typical duration and key tasks
- Orbit controls: drag to rotate, scroll to zoom, right-drag to pan
- Keyboard shortcuts: ← / → to step through stages, Space to play/pause
- Responsive layout for desktop and mobile

## Tech stack

- HTML, CSS and JavaScript (ES modules)
- three.js for 3D rendering
- No build step: a static site that any web server can host

## Getting started

Once the app is added, serve the project folder with any static file server, for example:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000> in a browser.

## License

To be determined.
