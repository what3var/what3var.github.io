// Static site generator for the fire website (what3var.github.io).
// Reads docs + screenshots from the fire repository and writes a fully
// static site to dist/. No server, no runtime API calls.
//
//   npm run build               clones github.com/what3var/fire into .cache/fire
//   FIRE_DIR=/path/to/fire npm run build   uses a local checkout instead
//   GITHUB_TOKEN=...            optional, raises the rate limit for the release lookup

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { Marked } from "marked";
import hljs from "highlight.js";
import { site, docSections, screenshots, features, heroSlides } from "./src/site.config.mjs";
import * as T from "./src/templates.mjs";

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const DIST = path.join(ROOT, "dist");

// ---------------------------------------------------------------- source
// The docs and screenshots live in github.com/what3var/fire. FIRE_DIR points at a
// checkout (the workflow checks it out next to the site); without it, the build
// clones the repository into .cache/fire.
function fireSource() {
  if (process.env.FIRE_DIR) {
    const dir = path.resolve(process.env.FIRE_DIR);
    if (!fs.existsSync(path.join(dir, "docs", "language"))) {
      throw new Error(`no fire checkout at ${dir} (docs/language missing)`);
    }
    return dir;
  }
  const dir = path.join(ROOT, ".cache", "fire");
  if (fs.existsSync(path.join(dir, ".git"))) {
    try { execSync("git pull --ff-only", { cwd: dir, stdio: "inherit" }); } catch { /* keep the cached copy */ }
  } else {
    fs.mkdirSync(path.dirname(dir), { recursive: true });
    execSync(`git clone --depth 1 ${site.repoUrl}.git "${dir}"`, { stdio: "inherit" });
  }
  return dir;
}

// ---------------------------------------------------------------- releases
async function fetchReleases() {
  // RELEASES_JSON=file.json lets you preview the download page offline
  if (process.env.RELEASES_JSON) return JSON.parse(fs.readFileSync(process.env.RELEASES_JSON, "utf8"));
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "what3var-site-build" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  try {
    const res = await fetch(`https://api.github.com/repos/${site.repo}/releases?per_page=10`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.filter((r) => !r.draft);
  } catch (e) {
    console.warn(`! release lookup failed (${e.message}) - download page falls back to the GitHub releases link`);
    return [];
  }
}

// ---------------------------------------------------------------- markdown
function slugify(text) {
  return text.toLowerCase().trim()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");
}

function makeMarked(page, pageBySource) {
  const seen = new Map();
  const toc = [];
  const md = new Marked({ gfm: true });
  md.use({
    renderer: {
      heading({ tokens, depth, text }) {
        const html = this.parser.parseInline(tokens);
        let id = slugify(text);
        const n = seen.get(id) ?? 0;
        seen.set(id, n + 1);
        if (n) id = `${id}-${n}`;
        if (depth === 2 || depth === 3) toc.push({ id, depth, html });
        return `<h${depth} id="${id}"><a class="anchor" href="#${id}" aria-hidden="true">#</a>${html}</h${depth}>\n`;
      },
      code({ text, lang }) {
        const language = (lang || "").trim().toLowerCase();
        const grammar = language === "fire" ? "csharp" : language;
        const body = grammar && hljs.getLanguage(grammar)
          ? (language === "fire" ? T.fireKeywords : (h) => h)(hljs.highlight(text, { language: grammar }).value)
          : T.esc(text);
        const label = language ? `<span class="code-lang">${T.esc(language)}</span>` : "";
        return `<div class="code">${label}<button class="copy" type="button" aria-label="Copy code">Copy</button><pre><code class="hljs">${body}</code></pre></div>\n`;
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const resolved = resolveHref(href, page, pageBySource);
        const ext = /^https?:/.test(resolved) && !resolved.startsWith(site.url);
        return `<a href="${T.esc(resolved)}"${title ? ` title="${T.esc(title)}"` : ""}${ext ? ' rel="noopener"' : ""}>${text}</a>`;
      },
      image({ href, title, text }) {
        const src = /^https?:/.test(href) ? href
          : `${site.repoUrl}/blob/master/${path.posix.join(path.posix.dirname(page.source), href)}?raw=true`;
        return `<img src="${T.esc(src)}" alt="${T.esc(text)}"${title ? ` title="${T.esc(title)}"` : ""} loading="lazy">`;
      },
    },
  });
  return { md, toc };
}

// Rewrites a link inside a doc page: links to other rendered docs become
// site links, other repo files go to GitHub, everything else stays.
function resolveHref(href, page, pageBySource) {
  if (!href || /^(https?:|mailto:|#)/.test(href)) return href;
  const [file, hash] = href.split("#");
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(page.source), decodeURIComponent(file)));
  const hit = pageBySource.get(target);
  if (hit) return T.rel(page.out, hit.out) + (hash ? `#${hash}` : "");
  return `${site.repoUrl}/blob/master/${encodeURI(target)}${hash ? `#${hash}` : ""}`;
}

// ---------------------------------------------------------------- build
function write(rel, html) {
  const file = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  fs.cpSync(from, to, { recursive: true });
}

async function main() {
  const src = fireSource();
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  // static assets of the site itself + images from the fire repo
  copyDir(path.join(ROOT, "src", "assets"), path.join(DIST, "assets"));
  copyDir(path.join(ROOT, "public"), DIST);
  fs.mkdirSync(path.join(DIST, "assets", "shots"), { recursive: true });
  const shotFiles = new Set([...screenshots.map((s) => s.file), ...heroSlides.flatMap((s) => [s.shot, s.inset?.shot]).filter(Boolean)]);
  for (const file of shotFiles) {
    const s = { file };
    const from = path.join(src, s.file);
    if (fs.existsSync(from)) fs.copyFileSync(from, path.join(DIST, "assets", "shots", path.basename(s.file)));
    else console.warn(`! screenshot missing: ${s.file}`);
  }
  const banner = path.join(src, "logosources", "banner.png");
  if (fs.existsSync(banner)) fs.copyFileSync(banner, path.join(DIST, "assets", "banner.png"));

  // collect doc pages
  const pages = [];
  for (const section of docSections) {
    let files = section.files;
    if (section.glob) {
      const dir = path.join(src, section.glob);
      files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"))
        .sort((a, b) => (a === "README.md" ? -1 : b === "README.md" ? 1 : a.localeCompare(b)))
        .filter((f) => !(section.exclude || []).includes(f))
        .map((f) => path.posix.join(section.glob, f));
    }
    section.pages = [];
    for (const source of files) {
      const abs = path.join(src, source);
      if (!fs.existsSync(abs)) { console.warn(`! doc missing: ${source}`); continue; }
      const raw = fs.readFileSync(abs, "utf8");
      const h1 = raw.match(/^#\s+(.+)$/m)?.[1]?.replace(/`/g, "") ?? path.basename(source, ".md");
      const base = path.basename(source, ".md");
      const slug = (section.slugs?.[base] ?? base).toLowerCase().replace(/[_\s]+/g, "-");
      const page = { source, raw, title: section.titles?.[base] ?? h1, section, out: `docs/${section.id}/${slug}.html` };
      section.pages.push(page);
      pages.push(page);
    }
  }
  const pageBySource = new Map(pages.map((p) => [p.source, p]));

  // render doc pages
  pages.forEach((page, i) => {
    const { md, toc } = makeMarked(page, pageBySource);
    const body = md.parse(page.raw)
      .replace(/<table>/g, '<div class="table-wrap"><table>')
      .replace(/<\/table>/g, "</table></div>");
    write(page.out, T.docPage({
      page, body, toc, sections: docSections,
      prev: pages[i - 1], next: pages[i + 1],
      editUrl: `${site.repoUrl}/blob/master/${encodeURI(page.source)}`,
    }));
  });
  write("docs/index.html", T.docsIndex({ sections: docSections }));

  // landing + download
  const releases = await fetchReleases();
  write("index.html", T.home({ features, screenshots, latest: releases[0], fireRoot: src }));
  write("download.html", T.download({ releases }));
  // 404.html is served for any path, so it needs absolute links. BASE_PATH is
  // the URL prefix of the site, e.g. "/fire/" on GitHub Pages.
  const base = (process.env.BASE_PATH || "/").replace(/\/?$/, "/");
  write("404.html", T.notFound(base));

  // search index for the client-side doc search (static JSON, no server)
  const index = pages.map((p) => ({
    t: p.title, s: p.section.title, u: p.out,
    h: [...p.raw.matchAll(/^#{2,3}\s+(.+)$/gm)].map((m) => m[1].replace(/`/g, "")),
  }));
  write("assets/search-index.json", JSON.stringify(index));

  console.log(`✓ built ${pages.length} doc pages, ${releases.length} releases → dist/`);
}

main().catch((e) => { console.error(e); process.exit(1); });
