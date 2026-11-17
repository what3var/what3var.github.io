// Static site generator for the fire website (what3var.github.io).
// Reads docs + screenshots from the fire repository and writes a fully
// static site to dist/. No server, no runtime API calls.
//
//   npm run build               clones github.com/what3var/fire into .cache/fire
//   FIRE_DIR=/path/to/fire npm run build   uses a local checkout instead
//   GITHUB_TOKEN=...            optional, raises the rate limit for the release lookup
//   REGISTRY_DIR=fixtures/registry   the package pages from another registry (default: registry/)
//   SHOW_DRAFTS=1               also renders the legal pages marked `draft: true` (preview only)

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { Marked } from "marked";
import hljs from "highlight.js";
import { site, docSections, screenshots, features, heroSlides } from "./src/site.config.mjs";
import * as T from "./src/templates.mjs";
import { loadNews, frontMatter } from "./src/news.mjs";
import * as P from "./src/packages.mjs";
import { verifyRegistry, buildIndex, latestVersion, sortedVersions } from "./scripts/registry.mjs";

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

// a fenced code block: highlighted, with a copy button (docs and news)
function renderCode({ text, lang }) {
  const language = (lang || "").trim().toLowerCase();
  const grammar = language === "fire" ? "csharp" : language;
  const body = grammar && hljs.getLanguage(grammar)
    ? (language === "fire" ? T.fireKeywords : (h) => h)(hljs.highlight(text, { language: grammar }).value)
    : T.esc(text);
  const label = language ? `<span class="code-lang">${T.esc(language)}</span>` : "";
  return `<div class="code">${label}<button class="copy" type="button" aria-label="Copy code">Copy</button><pre><code class="hljs">${body}</code></pre></div>\n`;
}

// tables scroll inside their own box instead of widening the page
const wrapTables = (html) => html
  .replace(/<table>/g, '<div class="table-wrap"><table>')
  .replace(/<\/table>/g, "</table></div>");

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
      code: renderCode,
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

// ---------------------------------------------------------------- legal pages
// legal/*.md with a front matter (title, slug, draft). A page marked `draft: true` is only
// rendered with SHOW_DRAFTS=1; files without a front matter (notes) are never rendered.
function loadLegal() {
  const dir = path.join(ROOT, "legal");
  if (!fs.existsSync(dir)) return [];
  const show = process.env.SHOW_DRAFTS === "1";
  return fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort().flatMap((f) => {
    const raw = fs.readFileSync(path.join(dir, f), "utf8");
    if (!raw.startsWith("---")) return [];
    const { meta, body } = frontMatter(raw);
    const draft = meta.draft === "true";
    if (!meta.title || (draft && !show)) return [];
    return [{ title: meta.title, draft, body, out: `legal/${meta.slug || path.basename(f, ".md")}.html`, footer: meta.footer !== "false" }];
  });
}

// ---------------------------------------------------------------- packages
// registry/ (or REGISTRY_DIR) → packages/index.json for ember, the files, the overview and a
// page per package. A registry whose files do not match their hashes stops the build.
function buildPackages(legal) {
  const registry = path.resolve(ROOT, process.env.REGISTRY_DIR || "registry");
  const { entries, errors } = verifyRegistry(registry);
  if (errors.length) throw new Error(`the registry ${registry} does not verify:\n  ${errors.join("\n  ")}`);
  const listed = entries.filter((e) => e.versions?.length).sort((a, b) => a.name.localeCompare(b.name));

  // the files Pages serves itself
  for (const e of listed) for (const v of e.versions) {
    if (!v.file) continue;
    const to = path.join(DIST, "packages", v.file);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(path.join(registry, v.file), to);
  }
  // the index of ember; the urls are relative to it
  const generated = new Date().toISOString();
  const index = buildIndex(listed, { fileUrl: (f) => f, pageUrl: (e) => P.pageOf(e.name), generated });
  write("packages/index.json", JSON.stringify(index, null, 1));
  // the address that ember used before 2026-11 (fire-packages/index.json): the same index, its urls one folder up
  const legacy = buildIndex(listed, { fileUrl: (f) => `../packages/${f}`, pageUrl: (e) => `../packages/${P.pageOf(e.name)}`, generated });
  write("fire-packages/index.json", JSON.stringify(legacy, null, 1));

  const legalLinks = legal.filter((p) => /packages|terms|nutzung/i.test(p.out));
  write("packages/index.html", P.packagesIndex({ entries: listed, legal: legalLinks }));
  for (const entry of listed) {
    const readmeHtml = entry.readme ? P.renderReadme(entry.readme, renderCode) : "";
    write(`packages/${P.pageOf(entry.name)}`, P.packagePage({ entry, entries: listed, readmeHtml, legal: legalLinks }));
  }
  console.log(`✓ packages: ${listed.length} packages, ${listed.reduce((n, e) => n + e.versions.length, 0)} versions from ${path.relative(ROOT, registry) || "."}`);
  // for the search of the site
  return listed.map((e) => {
    const v = latestVersion(e) ?? sortedVersions(e)[0];
    return { t: e.name, s: "Packages", u: `packages/${P.pageOf(e.name)}`, h: [v.description || "", ...(v.imports ?? []).map((i) => `#import "${i.name}"`)] };
  });
}

async function main() {
  const src = fireSource();
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  const legal = loadLegal();
  site.legalLinks = legal.filter((p) => p.footer);

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
    const body = wrapTables(md.parse(page.raw));
    write(page.out, T.docPage({
      page, body, toc, sections: docSections,
      prev: pages[i - 1], next: pages[i + 1],
      editUrl: `${site.repoUrl}/blob/master/${encodeURI(page.source)}`,
    }));
  });
  write("docs/index.html", T.docsIndex({ sections: docSections }));

  // landing + download
  const releases = await fetchReleases();
  // the version on the buttons: the latest release, or the version of the
  // installer script in fire while the release lookup is not available
  const setup = path.join(src, "setup.iss");
  const version = releases[0]?.tag_name
    ?? (fs.existsSync(setup) && fs.readFileSync(setup, "utf8").match(/#define\s+MyAppVersion\s+"([^"]+)"/)?.[1])
    ?? "alpha";
  // news get the code blocks and tables of the docs
  const newsMd = new Marked({ gfm: true });
  newsMd.use({ renderer: { code: renderCode } });
  const news = loadNews(path.join(ROOT, "news"), releases, { parse: (text) => wrapTables(newsMd.parse(text)) });
  write("index.html", T.home({ version, news, fireRoot: src }));
  write("explore.html", T.explore({ version, features, screenshots }));
  write("news.html", T.newsPage({ news }));
  write("download.html", T.download({ releases, version }));
  // 404.html is served for any path, so it needs absolute links. BASE_PATH is
  // the URL prefix of the site, e.g. "/fire/" on GitHub Pages.
  const base = (process.env.BASE_PATH || "/").replace(/\/?$/, "/");
  write("404.html", T.notFound(base));

  // packages and the legal pages
  const packageSearch = buildPackages(legal);
  const legalMd = new Marked({ gfm: true });
  legalMd.use({ renderer: { code: renderCode } });
  for (const page of legal) write(page.out, P.legalPage({ page, html: wrapTables(legalMd.parse(page.body)) }));

  // search index for the client-side doc search (static JSON, no server)
  const index = pages.map((p) => ({
    t: p.title, s: p.section.title, u: p.out,
    h: [...p.raw.matchAll(/^#{2,3}\s+(.+)$/gm)].map((m) => m[1].replace(/`/g, "")),
  })).concat(packageSearch);
  write("assets/search-index.json", JSON.stringify(index));

  console.log(`✓ built ${pages.length} doc pages, ${releases.length} releases, ${news.length} news, ${legal.length} legal pages (version ${version}) → dist/`);
}

main().catch((e) => { console.error(e); process.exit(1); });
