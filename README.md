# gta6-cover-art-01

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/lkapi0819-cli/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/lkapi0819-cli/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Vice Panel is a cover art maker that turns your own photos and a caption into GTA-poster-style multi-panel cover art. Drop in one photo or several, arrange them across a poster layout with warm white gutters, frame each panel by dragging and zooming, give panels their own colour filters, finish with a sunset or neon grade and big gradient caption lettering, then export a share-ready PNG. Everything runs as static files in your browser on your own machine — photos are never uploaded — and any panel you leave empty is filled with an original code-drawn sunset scene (gradient sky, sun disc, skyline and palm silhouettes), so a striking cover is three clicks away even before you add a photo.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. There is no build step and no network use: `serve.ts` serves the static `app/` folder, and the app works the same from any static file server.

To hand the entry in the way the grader does:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Features

- Five poster layouts: Hero Poster (title band over a 3-over-2 panel grid), Cover Story, Duo Split, Quad Grid and Full Bleed with an overlaid title.
- Multi-photo tray: add several photos at once, click a tray photo to place it in the selected panel, or fill every panel in one click; two bundled sample photos are included to start with.
- Per-panel framing and colour: click a panel in the live preview to select it, drag to reposition its photo, scroll or slide to zoom, and pick a Sunset, Neon, Noir or Chrome filter per panel.
- Caption lettering in a bold condensed system stack with a warm gradient fill and heavy dark outline, auto-fitted to the poster width, plus a letter-spaced subtitle line.
- Whole-cover finishing: a global grade (Sunset, Neon, Noir, Chrome) with a strength slider, optional deterministic film grain and a vignette.
- One-click PNG export at the common post sizes: 1080 × 1080, 1080 × 1350 and 1920 × 1080.
- Fully offline and original: no libraries, no web fonts, no network requests, and no third-party artwork — the scenes, lettering and layout are drawn by the app's own code.

## Layout of this repository

- `app/` — the static web app (`index.html`, `style.css`, `src/panels.js` layouts, `src/cover.js` renderer, `src/main.js` editor, `src/shots.js` screenshot scenes, `samples/` photos).
- `screenshots/` — the cover and editor screenshots, taken with the app itself.
- `main.ts` — the entrypoint the grader runs; it copies `app/` and `screenshots/` to the output and writes `dossier.json`.
- `vendor/makefun-app.ts` — the make.fun dossier library, unchanged from the kit.

<sub>Entered on [make.fun](https://make.fun/?ref=nhastfac&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
