# Rotating Windows

Static single-page piece (“Bonnie Vista”) that animates four panels in an ellipse-driven scaling pattern. Copy and images advance through a script as the animation runs; you can also drag around the center to scrub the cycle and spin it with momentum.

## How it works

**Build output** is a flat site: `dist/index.html` loads `style.css` and bundled `script.js`. Nothing runs on a server beyond static files.

**Layout and motion.** Four `.panel` elements sit in a `.container`. Their positions are driven by a point moving along an ellipse (`src/js/sizer.js`). That point becomes four corner “weights”; each panel’s outer and inner wrappers get complementary CSS `scale()` transforms so the quadrants breathe in a rotating pattern. Progress through one full loop is normalized 0–1 and driven on a timer by [animejs](https://animejs.com/) (`src/js/animation.js`), using `SCALE_CYCLE_DURATION_MS` from `src/js/config.js`.

**Script / copy.** The sequential lines live in `SCRIPT` in `config.js`—each entry is either `{ type: "text", text: "..." }` or `{ type: "image", src, alt }`. A **script looper** (`src/js/script-looper.js`) advances which line appears on which panel: on a fixed quarter-cycle schedule it picks the panel that is “most collapsed” at the current animation phase (argmin of outer scale product) and swaps that panel’s content to the next script line. Initial lines 0–3 map to the four panels in a defined order; after that, updates follow `PANEL_UPDATE_ORDER`.

**Interaction.** `src/js/interactivity.js` attaches pointer handling on the container: radial drag scrubs the same progress as the automatic animation, and release can apply inertial coasting before playback resumes. While scrubbing, script advances are layered on top of the looper’s count so full rotations do not reset the narrative.

**Templates.** `src/templates/index.hbs` is the page shell; `panel.hbs` is registered as the Handlebars partial `panel`. The `{{> panel '…'}}` strings become the first paint of each panel, but on `DOMContentLoaded` the script looper immediately sets copy from `SCRIPT` (lines 0, 1, 3, 2 mapped to the four panels). Treat `SCRIPT` as the source of truth for visible text and images.

## Directory structure

```
rotating-windows/
├── dist/                    # Build output (generated; do not edit by hand)
│   ├── index.html
│   ├── script.js            # Bundled IIFE + source map
│   ├── style.css
│   └── images/              # Copied from src/images
├── scripts/
│   └── build.mjs            # esbuild (JS), Handlebars (HTML), copy CSS & images
├── src/
│   ├── css/
│   │   └── index.css        # Styles for layout and panels
│   ├── images/              # Static assets referenced by SCRIPT (e.g. images)
│   ├── js/
│   │   ├── index.js         # Entry: wires init, animation, looper, scrub
│   │   ├── config.js        # SCRIPT, ellipse factor, timing constants
│   │   ├── animation.js     # animejs scale cycle + shared progress state
│   │   ├── sizer.js         # Ellipse math, panel transforms, argmin panel
│   │   ├── script-looper.js # Timed script advances tied to animation phase
│   │   ├── interactivity.js # Radial scrub + momentum + pause/resume anim
│   │   └── util.js          # Helpers (wrapProgress, roundTo)
│   └── templates/
│       ├── index.hbs        # Full page template
│       └── panel.hbs        # Partial: single panel markup
├── netlify.toml             # Netlify build: publish dist/
├── package.json
└── .nvmrc                   # Node 24
```

## How to edit

| Goal                                            | Where to change                                                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Poem / lines / image sequence                   | `src/js/config.js` — `SCRIPT` array order and entries                                                              |
| Page title, meta, extra head/body markup        | `src/templates/index.hbs`                                                                                          |
| Panel HTML structure (classes, one panel block) | `src/templates/panel.hbs` — keep `.js-panel-content` if script updates should replace inner content                |
| Placeholder panel labels (optional)             | `{{> panel '...'}}` in `index.hbs` — overwritten on load by `SCRIPT`; align if you care about no-JS or first paint |
| Visual design, typography, motion feel          | `src/css/index.css` and timing/`ELLIPSE_VIEWPORT_FACTOR` in `config.js`                                            |
| Faster/slower breathing cycle                   | `SCALE_CYCLE_DURATION_MS` in `config.js`                                                                           |
| Interaction tuning (drag, coast)                | `VELOCITY_*`, `MOMENTUM_*` in `src/js/config.js`                                                                   |
| Add static images                               | Place files under `src/images/` and reference paths in `SCRIPT` (e.g. `./images/...`)                              |

After any source change, rebuild (or use dev watch — see below). The build does not watch by default; `pnpm run build` regenerates `dist/` from scratch.

## Build

```bash
pnpm run build
```

This generates:

- `dist/index.html`
- `dist/script.js`
- `dist/style.css`
- `dist/images/` (copy of `src/images`)

## Run locally

```bash
pnpm start
```

Then open [http://localhost:4173](http://localhost:4173).

To serve a previously built `dist/` without rebuilding:

```bash
pnpm run serve
```

**Development:** `pnpm run dev` runs a file watcher that rebuilds when `src/` changes and serves `dist/` (see `package.json`).

## Deploy to Netlify

- Build command: `pnpm run build` (or `npm run build` if you use npm; `netlify.toml` currently uses `npm run build`)
- Publish directory: `dist`
- Node version: `.nvmrc` is set to `24`

This repo includes `netlify.toml` with publish settings.
