import path from "node:path";
import hljs from "highlight.js";
import fs from "node:fs";
import { site, nav, toolchain, heroSlides, heroInterval } from "./site.config.mjs";
import { biscuitSvg } from "./biscuit.mjs";

export const esc = (s = "") => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// relative link from one output file to another (keeps the site host-agnostic)
export const rel = (from, to) => {
  const r = path.posix.relative(path.posix.dirname(from), to);
  return r || path.posix.basename(to);
};
const root = (out) => (out.includes("/") ? "../".repeat(out.split("/").length - 1) : "");

const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const fmtSize = (b) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} kB`);

const ICONS = {
  units: '<path d="M3 17h18M6 17v-3M10 17v-5M14 17v-3M18 17v-5"/>',
  own: '<circle cx="12" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M11 8.2 7 15.8M13 8.2l4 7.6"/>',
  threads: '<path d="M4 6h10a4 4 0 0 1 0 8H8M4 18h16"/><path d="m11 11-3 3 3 3"/>',
  native: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  embed: '<path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 4l-4 16"/>',
  devices: '<rect x="3" y="7" width="13" height="10" rx="1.5"/><path d="M16 10h3l2 2-2 2h-3M7 17v3M12 17v3"/>',
  github: '<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
  download: '<path d="M12 3v12m0 0-5-5m5 5 5-5M4 21h16"/>',
  windows: '<path d="M3 5.5 10.5 4.5v7H3zM12 4.3 21 3v8.5h-9zM3 12.5h7.5v7L3 18.5zM12 12.5h9V21l-9-1.3z"/>',
  linux: '<path d="M12 3c-2.2 0-3.5 1.8-3.5 4.5 0 1.6-.4 2.6-1.5 4S5 14.6 5 16.5C5 19 7 21 12 21s7-2 7-4.5c0-1.9-.9-3.6-2-5s-1.5-2.4-1.5-4C15.5 4.8 14.2 3 12 3z"/><circle cx="10.5" cy="8" r=".6"/><circle cx="13.5" cy="8" r=".6"/>',
  macos: '<path d="M16.5 12.6c0-2.6 2.1-3.5 2.2-3.6a4.8 4.8 0 0 0-3.8-2c-1.6-.2-3.1.9-3.9.9s-2-.9-3.4-.9A5 5 0 0 0 3.4 9.6c-1.8 3.1-.5 7.7 1.3 10.2.8 1.2 1.8 2.6 3.1 2.5s1.7-.8 3.3-.8 2 .8 3.4.8 2.2-1.3 3-2.5a10.5 10.5 0 0 0 1.4-2.8 4.3 4.3 0 0 1-2.4-4.4zM14 5.2A4.2 4.2 0 0 0 15 2a4.4 4.4 0 0 0-2.9 1.5 4.1 4.1 0 0 0-1 3.1A3.6 3.6 0 0 0 14 5.2z"/>',
  file: '<path d="M14 3H6v18h12V7zM14 3v4h4"/>',
  book: '<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
};
export const icon = (name, cls = "icon") =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] ?? ""}</svg>`;

// ---------------------------------------------------------------- layout
function layout({ out, title, description = site.tagline, body, active = "", bodyClass = "", rootPrefix }) {
  const r = rootPrefix ?? root(out);
  const links = nav.map((n) => {
    const on = active && n.href.startsWith(active);
    return `<a href="${r}${n.href}"${on ? ' aria-current="page"' : ""}>${n.label}</a>`;
  }).join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#16131c">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${r}assets/banner.png">
<link rel="icon" href="${r}assets/logo.svg" type="image/svg+xml">
<link rel="stylesheet" href="${r}assets/style.css">
<script>try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
</head>
<body class="${bodyClass}" data-root="${r}">
<a class="skip" href="#main">Skip to content</a>
<header class="topbar">
  <div class="topbar-inner">
    <a class="brand" href="${r}index.html"><img src="${r}assets/logo.svg" alt="" width="18" height="24"><span>fire</span></a>
    <nav class="mainnav" id="mainnav">${links}</nav>
    <div class="topbar-tools">
      <button class="search-btn" type="button" data-search-open aria-label="Search docs">${icon("search")}<span>Search</span><kbd>/</kbd></button>
      <button class="theme-btn" type="button" data-theme-toggle aria-label="Toggle colour theme"><span class="sun">☀</span><span class="moon">☾</span></button>
      <a class="gh" href="${site.repoUrl}" aria-label="fire on GitHub">${icon("github")}</a>
      <button class="menu-btn" type="button" data-menu aria-label="Menu" aria-controls="mainnav" aria-expanded="false">${icon("menu")}</button>
    </div>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="footer">
  <div class="footer-inner">
    <div class="footer-brand"><img src="${r}assets/logo.svg" alt="" width="15" height="20"> fire · ${site.license} licensed · © ${new Date().getFullYear()} ${esc(site.author)}</div>
    <nav>
      <a href="${r}docs/index.html">Docs</a>
      <a href="${r}download.html">Download</a>
      <a href="${site.repoUrl}">GitHub</a>
      <a href="${site.repoUrl}/issues">Issues</a>
    </nav>
  </div>
</footer>
<dialog class="search" id="search">
  <form method="dialog" class="search-box">
    ${icon("search")}<input type="search" placeholder="Search the docs…" autocomplete="off" aria-label="Search the docs" data-search-input>
    <button class="search-close" value="close" aria-label="Close">Esc</button>
  </form>
  <ul class="search-results" data-search-results></ul>
</dialog>
<script src="${r}assets/main.js" defer></script>
</body>
</html>
`;
}

// ---------------------------------------------------------------- home
// keywords of fire that C# does not have; only plain code text is touched, not strings or comments
const FIRE_KEYWORDS = /\b(take|taking|sync|leave|terminate|delete|unit|prefixed|unprefixed|coerce|probe|selector|destruct|construct)\b/g;
export function fireKeywords(html) {
  let depth = 0;
  return html.split(/(<[^>]+>)/).map((part) => {
    if (part.startsWith("</")) { depth--; return part; }
    if (part.startsWith("<")) { depth++; return part; }
    return depth ? part : part
      .replace(/\bfire(?=\s+(?:taking\b|\{|[A-Z]\w*\())/g, "\u0000fire\u0001")
      .replace(FIRE_KEYWORDS, '<span class="hljs-keyword">$1</span>')
      .replace(/\u0000fire\u0001/g, '<span class="hljs-keyword">fire</span>');
  }).join("");
}

// highlights line by line, so lines outside `focus` ([first, last], 1-based) can be dimmed
function codeLines(code, focus) {
  return code.split("\n").map((l, i) => {
    const html = fireKeywords(hljs.highlight(l, { language: "csharp" }).value) || " ";
    const dim = focus && (i + 1 < focus[0] || i + 1 > focus[1]);
    return focus ? `<span class="ln${dim ? " dim" : ""}">${html}</span>` : html;
  }).join(focus ? "" : "\n");
}

function insetWindow(inset, fireRoot) {
  const body = inset.shot
    ? `<img src="assets/shots/${path.basename(inset.shot)}" alt="${esc(inset.file)}">`
    : biscuitSvg(fs.readFileSync(path.join(fireRoot, inset.biscuit), "utf8"));
  return `<div class="window window-inset"><div class="window-bar"><span></span><span></span><span></span><em>${esc(inset.file)}</em></div><div class="inset-body">${body}</div></div>`;
}

export function home({ features, screenshots, latest, fireRoot }) {
  const out = "index.html";
  const version = latest ? latest.tag_name : "alpha";
  const shots = screenshots.map((s, i) => `
      <figure class="shot${i === 0 ? " shot-wide" : ""}">
        <button type="button" class="shot-btn" data-lightbox="${i}">
          <img src="assets/shots/${path.basename(s.file)}" alt="${esc(s.title)}" loading="lazy" width="1917" height="1005">
        </button>
        <figcaption><strong>${esc(s.title)}</strong> ${esc(s.text)}</figcaption>
      </figure>`).join("");

  const body = `
<section class="hero" data-hero data-interval="${heroInterval}" aria-roledescription="carousel" aria-label="What fire is about">
  <div class="hero-glow" aria-hidden="true"></div>
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <a class="pill" href="download.html"><span class="pill-dot"></span>${esc(version)} · early and half-baked, on purpose ${icon("arrow")}</a>
      <div class="h1-logo"><img src="assets/logo.svg" alt="" width="54" height="72"></div>
      <div class="slides slides-text" data-slides="text">${heroSlides.map((sl, i) => {
        const title = esc(sl.title).replace(/\{(.+?)\}/, "<em>$1</em>");
        // only the first slide is the page's h1; the others look the same
        const h = i === 0 ? `<h1>${title}</h1>` : `<p class="h1" role="heading" aria-level="2">${title}</p>`;
        return `
        <div class="slide${i === 0 ? " is-active" : ""}" id="hero-slide-${i}"${i ? " aria-hidden=\"true\" inert" : ""}>${h}<p class="lead">${esc(sl.text)}</p></div>`;
      }).join("")}
        <canvas class="pixels" aria-hidden="true"></canvas>
      </div>
      <div class="slide-ctrl" data-slide-ctrl hidden>
        ${heroSlides.map((sl, i) => `<button type="button" class="slide-dot" data-goto="${i}" aria-controls="hero-slide-${i}" aria-label="Show: ${esc(sl.title.replace(/[{}]/g, ""))}"${i === 0 ? ' aria-current="true"' : ""}><span></span></button>`).join("")}
        <button type="button" class="slide-pause" data-pause aria-label="Pause the slides" aria-pressed="false"><span class="i-pause">❚❚</span><span class="i-play">▶</span></button>
      </div>
      <div class="cta">
        <a class="btn btn-primary" href="download.html">${icon("download")} Download</a>
        <a class="btn btn-ghost" href="docs/start/first-steps.html">${icon("book")} First steps</a>
      </div>
      <p class="hero-meta">Windows · Linux · macOS — native targets incl. ESP32 &amp; FreeRTOS</p>
    </div>
    <div class="hero-code">
      <div class="slides slides-visual" data-slides="visual">${heroSlides.map((sl, i) => `
        <div class="slide${i === 0 ? " is-active" : ""}"${i ? ' aria-hidden="true" inert' : ""}>
          ${sl.inset ? `<div class="stack">${insetWindow(sl.inset, fireRoot)}` : ""}
          <div class="window${sl.shot ? " window-shot" : ""}${sl.inset ? " window-sm" : ""}">
            <div class="window-bar"><span></span><span></span><span></span><em>${esc(sl.file)}</em></div>
            ${sl.shot
              ? `<img src="assets/shots/${path.basename(sl.shot)}" alt="${esc(sl.file)}" width="1917" height="1010">`
              : `<pre><code class="hljs">${codeLines(sl.code, sl.focus)}</code></pre>`}
          </div>${sl.inset ? "</div>" : ""}
        </div>`).join("")}
        <canvas class="pixels" aria-hidden="true"></canvas>
      </div>
    </div>
  </div>
</section>

<section class="toolchain">
  <div class="wrap toolchain-grid">
    ${toolchain.map((t) => `
    <div class="tool">
      <div class="tool-name">${esc(t.name)}</div>
      <div class="tool-role">${esc(t.role)}</div>
      <p>${esc(t.text)}</p>
    </div>`).join("")}
  </div>
</section>

<section class="section" id="features">
  <div class="wrap">
    <header class="section-head">
      <p class="eyebrow">Why fire</p>
      <h2>Familiar syntax, deliberately different ideas.</h2>
      <p>Heavily leaning on C#, but some things are designed differently on purpose. Some are weird, others are beautiful — or simply dangerous.</p>
    </header>
    <div class="features">
      ${features.map((f) => `
      <article class="feature">
        <div class="feature-icon">${icon(f.icon)}</div>
        <h3>${esc(f.title)}</h3>
        <p>${esc(f.text)}</p>
      </article>`).join("")}
    </div>
  </div>
</section>

<section class="section section-alt" id="screenshots">
  <div class="wrap">
    <header class="section-head">
      <p class="eyebrow">spark</p>
      <h2>A cute little VS-style IDE.</h2>
      <p>Built with .NET 10 and Avalonia. Debugger, designer, Markdown and raster editors, device panel — all in one window.</p>
    </header>
    <div class="shots">${shots}
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap split">
    <div>
      <p class="eyebrow">Documentation</p>
      <h2>Learn it by running it.</h2>
      <p>Every page of the language reference has examples that run as they are, plus a few exercises. Copy a block into spark and press F5.</p>
      <a class="btn btn-ghost" href="docs/index.html">Browse the docs ${icon("arrow")}</a>
    </div>
    <ol class="doc-teaser">
      <li><a href="docs/start/first-steps.html"><span>01</span>First steps</a></li>
      <li><a href="docs/language/05-units.html"><span>02</span>Units</a></li>
      <li><a href="docs/language/13-ownership.html"><span>03</span>Ownership</a></li>
      <li><a href="docs/language/15-threads-and-actors.html"><span>04</span>Threads and actors</a></li>
      <li><a href="docs/start/embedding.html"><span>05</span>Embedding in C#</a></li>
    </ol>
  </div>
</section>

<section class="cta-band">
  <div class="wrap cta-band-inner">
    <img src="assets/logo.svg" alt="" width="36" height="48">
    <div><h2>Just download it and have a look.</h2><p>Things went further than planned. 🔥</p></div>
    <a class="btn btn-primary" href="download.html">${icon("download")} Get fire</a>
  </div>
</section>

<dialog class="lightbox" id="lightbox" aria-label="Screenshot">
  <button class="lb-close" type="button" data-lb-close aria-label="Close">×</button>
  <button class="lb-nav lb-prev" type="button" data-lb-prev aria-label="Previous">‹</button>
  <figure><img alt=""><figcaption></figcaption></figure>
  <button class="lb-nav lb-next" type="button" data-lb-next aria-label="Next">›</button>
</dialog>`;
  return layout({ out, title: "fire — a language with its very own character", body, bodyClass: "page-home" });
}

// ---------------------------------------------------------------- download
function platformOf(name) {
  const n = name.toLowerCase();
  if (/(win|\.exe$|\.msi$)/.test(n)) return "windows";
  if (/(mac|osx|darwin|\.dmg$|\.pkg$)/.test(n)) return "macos";
  if (/(linux|\.appimage$|\.deb$|\.rpm$|\.tar\.gz$)/.test(n)) return "linux";
  return "file";
}
const PLATFORM_LABEL = { windows: "Windows", macos: "macOS", linux: "Linux", file: "Other" };

export function download({ releases }) {
  const out = "download.html";
  const [latest, ...older] = releases;
  const releasesUrl = `${site.repoUrl}/releases`;

  const assetList = (r) => r.assets.length
    ? `<ul class="assets">${r.assets.map((a) => {
        const p = platformOf(a.name);
        return `<li><a href="${esc(a.browser_download_url)}">${icon(p)}<span class="asset-name">${esc(a.name)}</span><span class="asset-meta">${PLATFORM_LABEL[p]} · ${fmtSize(a.size)}</span>${icon("download")}</a></li>`;
      }).join("")}</ul>`
    : `<p class="muted">No binaries attached — see the release page.</p>`;

  const latestCard = latest ? `
    <article class="release release-latest">
      <header>
        <div><span class="badge">${latest.prerelease ? "Pre-release" : "Latest"}</span><h2>${esc(latest.name || latest.tag_name)}</h2></div>
        <time datetime="${latest.published_at}">${fmtDate(latest.published_at)}</time>
      </header>
      ${assetList(latest)}
      <a class="text-link" href="${esc(latest.html_url)}">Release notes on GitHub ${icon("arrow")}</a>
    </article>` : `
    <article class="release release-latest">
      <header><div><span class="badge">Latest</span><h2>Current release</h2></div></header>
      <p>Installers and archives are published as GitHub releases.</p>
      <div class="platforms">
        <span>${icon("windows")} Windows installer</span><span>${icon("linux")} Linux</span><span>${icon("macos")} macOS</span>
      </div>
      <a class="btn btn-primary" href="${releasesUrl}/latest">${icon("download")} Go to the latest release</a>
    </article>`;

  const olderList = older.length ? `
    <h3 class="sub">Earlier releases</h3>
    <ul class="release-list">${older.map((r) => `
      <li><a href="${esc(r.html_url)}"><strong>${esc(r.name || r.tag_name)}</strong>${r.prerelease ? ' <span class="badge badge-dim">pre</span>' : ""}<time>${fmtDate(r.published_at)}</time></a></li>`).join("")}
    </ul>` : "";

  const body = `
<section class="page-head">
  <div class="wrap">
    <p class="eyebrow">Download</p>
    <h1>Get fire &amp; spark</h1>
  </div>
</section>
<section class="section section-tight">
  <div class="wrap download-grid">
    <div>
      ${latestCard}
      <p class="note">Native builds need a C/C++ toolchain. If none is installed, spark can install one for you on Windows.</p>
      ${olderList}
      <p class="muted all-releases"><a href="${releasesUrl}">All releases on GitHub</a></p>
    </div>
    <aside class="side-cards">
      <div class="card">
        <h3>Build from source</h3>
        <p>Needs the .NET 10 SDK.</p>
        <div class="code"><button class="copy" type="button">Copy</button><pre><code>git clone ${site.repoUrl}
cd fire
dotnet build fire.sln</code></pre></div>
      </div>
      <div class="card card-warn">
        <h3>Heads-up</h3>
        <p>fire is young and changes quickly. Expect rough edges — and please report them.</p>
        <a class="text-link" href="${site.repoUrl}/issues">Open an issue ${icon("arrow")}</a>
      </div>
    </aside>
  </div>
</section>`;
  return layout({ out, title: "Download — fire", body, active: "download" });
}

// ---------------------------------------------------------------- docs
function sidebar(sections, current, out) {
  return `<nav class="docnav" aria-label="Documentation">
    ${sections.map((s) => `
    <details class="docnav-group" ${!current || current.section === s ? "open" : ""}>
      <summary>${esc(s.title)}</summary>
      <ul>${s.pages.map((p) => `<li><a href="${rel(out, p.out)}"${p === current ? ' aria-current="page"' : ""}>${esc(p.title)}</a></li>`).join("")}</ul>
    </details>`).join("")}
  </nav>`;
}

export function docPage({ page, body, toc, sections, prev, next, editUrl }) {
  const out = page.out;
  const tocHtml = toc.length > 1 ? `
    <aside class="toc" aria-label="On this page">
      <p class="toc-title">On this page</p>
      <ul>${toc.map((t) => `<li class="toc-${t.depth}"><a href="#${t.id}">${t.html}</a></li>`).join("")}</ul>
    </aside>` : "";
  const pager = `
    <nav class="pager">
      ${prev ? `<a class="pager-prev" href="${rel(out, prev.out)}"><span>Previous</span>${esc(prev.title)}</a>` : "<span></span>"}
      ${next ? `<a class="pager-next" href="${rel(out, next.out)}"><span>Next</span>${esc(next.title)}</a>` : "<span></span>"}
    </nav>`;
  const html = `
<div class="docs-layout">
  <button class="docnav-toggle" type="button" data-docnav>${icon("menu")} Menu</button>
  ${sidebar(sections, page, out)}
  <article class="prose">
    <p class="crumbs"><a href="${rel(out, "docs/index.html")}">Docs</a> / ${esc(page.section.title)}</p>
    ${body}
    <p class="edit"><a href="${editUrl}">${icon("github")} View this page on GitHub</a></p>
    ${pager}
  </article>
  ${tocHtml}
</div>`;
  return layout({ out, title: `${page.title} — fire docs`, body: html, active: "docs", bodyClass: "page-docs" });
}

export function docsIndex({ sections }) {
  const out = "docs/index.html";
  const blurbs = {
    start: "A tour of spark and the language, and how to host fire in your own .NET application.",
    language: "One page per topic, with examples that run as they are and a few exercises.",
    topics: "Libraries you #import, packages, projects, devices, UI markup and the toolchain.",
  };
  const body = `
<section class="page-head">
  <div class="wrap">
    <p class="eyebrow">Documentation</p>
    <h1>Learn fire</h1>
    <p class="lead">New here? Start with <a href="start/first-steps.html">First steps</a>, then work through the language reference.</p>
  </div>
</section>
<section class="section section-tight">
  <div class="wrap doc-sections">
    ${sections.map((s) => `
    <article class="doc-card">
      <h2>${esc(s.title)}</h2>
      <p>${blurbs[s.id] ?? ""}</p>
      <ul>${s.pages.map((p) => `<li><a href="${rel(out, p.out)}">${esc(p.title)}</a></li>`).join("")}</ul>
    </article>`).join("")}
  </div>
</section>`;
  return layout({ out, title: "Docs — fire", body, active: "docs" });
}

export function notFound(base = "/") {
  const body = `
<section class="page-head center">
  <div class="wrap">
    <img src="${base}assets/logo.svg" alt="" width="54" height="72">
    <h1>404 — burnt down</h1>
    <p class="lead">This page doesn't exist (anymore).</p>
    <a class="btn btn-primary" href="${base}index.html">Back home</a>
  </div>
</section>`;
  // served for any missing path, so it links absolutely from the site root
  return layout({ out: "404.html", title: "Not found — fire", body, rootPrefix: base });
}
