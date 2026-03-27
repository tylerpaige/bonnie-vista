# Rotating Windows

This project builds into `dist/` using a modern Node toolchain.

## Build

```bash
pnpm run build
```

This generates:

- `dist/index.html`
- `dist/script.js`
- `dist/style.css`

## Run Locally

```bash
pnpm start
```

Then open [http://localhost:4173](http://localhost:4173).

To serve a previously built `dist/` without rebuilding:

```bash
pnpm run serve
```

## Notes

- `index.html` remains the flat generated page.
- Template source is `src/templates/index.hbs` with `src/templates/panel.hbs`.
- Styles are plain CSS in `src/css/index.css`.
- Animation/math functions in `src/js/index.js` are preserved.

## Deploy To Netlify

- Build command: `pnpm run build`
- Publish directory: `dist`
- Node version: `.nvmrc` is set to `24`

This repo includes `netlify.toml` with the required build and publish settings.
