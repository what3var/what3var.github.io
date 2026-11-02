# what3var.github.io

The website of [fire](https://github.com/what3var/fire), the language, the forge compiler, the spark IDE and the ember package manager. It is published at https://what3var.github.io.

The site is fully static. A small Node script turns the docs of the fire repository into HTML and writes everything to `dist/`. There is no server or backend, and the browser makes no API calls. Search runs on a JSON index built at deploy time.

## Structure

```
build.mjs              generator: read fire → render docs → write dist/
src/site.config.mjs    content & structure: nav, hero slides, features, screenshots, doc sections
src/templates.mjs      page templates (layout, home, download, docs)
src/biscuit.mjs        draws a .biscuit circuit as SVG (hero slide)
src/assets/            style.css, main.js, logo.svg
public/                copied 1:1 into dist/ (favicon, CNAME …)
fixtures/              sample release data to preview the download page offline
.github/workflows/     pages.yml publishes main, preview.yml builds every other branch
```

| Page | Source |
| --- | --- |
| `/` | `src/site.config.mjs` + `screenshots/` of fire |
| `/download.html` | GitHub releases of `what3var/fire`, fetched **at build time** |
| `/docs/…` | `docs/language/*.md`, `docs/*.md`, `src/fire.Editor/Help/*.md` of fire |

The docs are not copied into this repository. Every build takes them from the default branch of `what3var/fire`.

## Local

```bash
npm install
npm run dev                                   # clones fire into .cache/fire, builds, serves on http://localhost:4321
FIRE_DIR=../fire npm run build                # use a local fire checkout instead
RELEASES_JSON=fixtures/releases.sample.json npm run build   # preview the download page offline
```

## Publishing

1. In this repository, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
2. Push to `main`, or start the *pages* workflow by hand under **Actions**.

The site is rebuilt every night, so changes to the docs and new releases of fire show up by the next morning. For an immediate update, start the *pages* workflow by hand.

## Previews

Every branch except `main` is built by the *preview* workflow without being published. The run has an artifact called **site-preview**. Download it, unzip it, and run `python3 -m http.server` in the folder.
