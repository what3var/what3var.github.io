// The package pages: the overview (/packages/index.html) and one page per package
// (/packages/<name>.html), from the registry (scripts/registry.mjs). Plus the pages of legal/.

import { Marked } from "marked";
import { site } from "./site.config.mjs";
import { layout, esc, icon } from "./templates.mjs";
import { sortedVersions, latestVersion } from "../scripts/registry.mjs";

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");
const fmtSize = (b) => (b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : b >= 1e3 ? `${(b / 1e3).toFixed(1)} kB` : `${b} B`);
export const pageOf = (name) => `${name}.html`;

// A readme comes from a package author: it is shown as Markdown, but raw HTML is shown as text
// and only http(s)/mailto links and https images are kept - no script ever reaches the site.
export function renderReadme(text, renderCode) {
  const md = new Marked({ gfm: true });
  const safeUrl = (u, images = false) => (images ? /^https:\/\//i : /^(https?:|mailto:|#)/i).test(String(u ?? "").trim()) ? u : null;
  md.use({
    renderer: {
      html: ({ text: t }) => esc(t),
      code: renderCode,
      heading({ tokens, depth }) {
        const d = Math.min(6, depth + 1);   // the page has its own h1
        return `<h${d}>${this.parser.parseInline(tokens)}</h${d}>\n`;
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const url = safeUrl(href);
        return url ? `<a href="${esc(url)}"${title ? ` title="${esc(title)}"` : ""} rel="nofollow noopener ugc">${text}</a>` : text;
      },
      image({ href, text }) {
        const url = safeUrl(href, true);
        return url ? `<img src="${esc(url)}" alt="${esc(text)}" loading="lazy" referrerpolicy="no-referrer">` : esc(text);
      },
    },
  });
  return md.parse(text).replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, "</table></div>");
}

const installCmd = (name, version) => `ember install ${name}${version ? `@${version}` : ""}`;
const codeBox = (text, lang = "") => `<div class="code">${lang ? `<span class="code-lang">${esc(lang)}</span>` : ""}<button class="copy" type="button" aria-label="Copy code">Copy</button><pre><code>${esc(text)}</code></pre></div>`;

function legalLinks(legal, out) {
  const r = out.includes("/") ? "../" : "";
  return legal.length ? `<p class="pkg-legal">${legal.map((p) => `<a href="${r}${p.out}">${esc(p.title)}</a>`).join(" · ")}</p>` : "";
}

export function packagesIndex({ entries, legal }) {
  const out = "packages/index.html";
  const rows = entries.map((e) => {
    const v = latestVersion(e) ?? sortedVersions(e)[0];
    const search = [e.name, v.description, v.author, v.license, ...(v.imports ?? []).map((i) => i.name)].join(" ").toLowerCase();
    return `
    <li class="pkg-row" data-pkg="${esc(search)}">
      <a href="${pageOf(e.name)}">
        <span class="pkg-name">${esc(e.name)}</span><span class="pkg-version">${esc(v.version)}</span>
        <span class="pkg-desc">${esc(v.description || "")}</span>
        <span class="pkg-meta">${esc(v.author || "?")} · ${esc(v.license)} · ${fmtDate(v.published)}${(v.imports ?? []).some((i) => i.native) ? ' · <span class="badge badge-dim">natives</span>' : ""}</span>
      </a>
    </li>`;
  }).join("");
  const body = `
<section class="page-head">
  <div class="wrap">
    <p class="eyebrow">Packages</p>
    <h1>Packages for fire</h1>
    <p class="lead">Libraries you can add with <code>ember</code>, the package manager of fire. Packages are source only: fire code, and C or C++ for the natives that your machine builds.</p>
  </div>
</section>
<section class="section section-tight">
  <div class="wrap pkg-layout">
    <div>
      ${entries.length ? `
      <label class="pkg-search">${icon("search")}<input type="search" placeholder="Filter ${entries.length} package${entries.length === 1 ? "" : "s"}…" aria-label="Filter packages" data-pkg-filter></label>
      <ul class="pkg-list" data-pkg-list>${rows}
      </ul>
      <p class="muted" data-pkg-none hidden>No package matches.</p>` : `
      <div class="card"><h3>No packages yet</h3><p>The first packages are on their way. Until then: write your own - <a href="../docs/packages/index.html">Packages and ember</a>.</p></div>`}
    </div>
    <aside class="side-cards">
      <div class="card">
        <h3>Install a package</h3>
        ${codeBox("ember find sensor\nember install sensorkit\nember list", "shell")}
        <p>ember reads <a href="index.json">index.json</a> of this page and checks every download against its SHA-256.</p>
      </div>
      <div class="card">
        <h3>Use another index</h3>
        <p><code>ember.json</code> next to the compiler lists the sources:</p>
        ${codeBox(`{ "sources": [ "PackageSource",\n  "https://what3var.github.io/packages/index.json" ] }`, "json")}
      </div>
      <div class="card">
        <h3>Your package here?</h3>
        <p>Packages are added by the maintainer. Build it with <code>ember forge</code> (with a <code>LICENSE</code> and a <code>README.md</code>), publish it with its source, then <a href="${site.repoUrl}/issues/new?title=Package:%20">open an issue</a> with the link and its SHA-256.</p>
      </div>
      ${legalLinks(legal, out)}
    </aside>
  </div>
</section>`;
  return layout({ out, title: "Packages — fire", description: "Packages for the fire language, installed with ember.", body, active: "packages" });
}

export function packagePage({ entry, entries, readmeHtml, legal }) {
  const out = `packages/${pageOf(entry.name)}`;
  const versions = sortedVersions(entry);
  const v = latestVersion(entry) ?? versions[0];
  const known = new Set(entries.map((e) => e.name.toLowerCase()));
  const dep = (d) => known.has(d.toLowerCase()) ? `<a href="${pageOf(entries.find((e) => e.name.toLowerCase() === d.toLowerCase()).name)}">${esc(d)}</a>`
    : /^fire-/.test(d) ? `${esc(d)} <span class="muted">(comes with fire)</span>` : `${esc(d)} <span class="muted">(not in this registry)</span>`;
  const dependents = entries.filter((e) => (latestVersion(e) ?? sortedVersions(e)[0])?.dependencies?.some((d) => d.toLowerCase() === entry.name.toLowerCase()));
  const imports = (v.imports ?? []).map((i) => `<li><code>#import "${esc(i.name)}"</code>${i.native ? ` <span class="badge badge-dim">natives in ${esc(i.native === "c" ? "C" : "C++")}</span>` : ""}${i.platforms ? ` <span class="muted">${esc(i.platforms.join(", "))}</span>` : ""}${i.requires?.length ? ` <span class="muted">needs ${i.requires.map(esc).join(", ")}</span>` : ""}</li>`).join("");
  const url = (x) => (x.file ? x.file.replace(/^files\//, "files/") : x.url);
  const versionRows = versions.map((x) => `
        <tr${x.yanked ? ' class="yanked"' : ""}>
          <td><strong>${esc(x.version)}</strong>${x.yanked ? ` <span class="badge badge-dim" title="${esc(x.yankedReason || "withdrawn")}">yanked</span>` : ""}</td>
          <td>${fmtDate(x.published)}</td>
          <td>${esc(x.license)}</td>
          <td>${fmtSize(x.size)}</td>
          <td><a href="${esc(url(x))}" rel="nofollow">.fpk</a> <code class="sha" title="SHA-256">${esc(x.sha256.slice(0, 12))}…</code></td>
        </tr>`).join("");
  const body = `
<section class="page-head pkg-head">
  <div class="wrap">
    <p class="eyebrow"><a href="index.html">Packages</a></p>
    <h1>${esc(entry.name)} <span class="pkg-version">${esc(v.version)}</span></h1>
    <p class="lead">${esc(v.description || "")}</p>
  </div>
</section>
<section class="section section-tight">
  <div class="wrap pkg-layout">
    <article class="prose pkg-readme">
      ${readmeHtml || `<p class="muted">This package has no readme.</p>`}
      ${entry.licenseText ? `<details class="pkg-license"><summary>Licence text (${esc(v.license)})</summary><pre>${esc(entry.licenseText)}</pre></details>` : ""}
    </article>
    <aside class="side-cards">
      <div class="card">
        <h3>Install</h3>
        ${codeBox(installCmd(entry.name), "shell")}
        <p class="muted">A version: <code>${esc(installCmd(entry.name, v.version))}</code></p>
      </div>
      <div class="card">
        <h3>About</h3>
        <dl class="pkg-facts">
          <dt>Author</dt><dd>${esc(v.author || "?")}</dd>
          <dt>Licence</dt><dd>${esc(v.license)}</dd>
          ${v.homepage ? `<dt>Homepage</dt><dd><a href="${esc(v.homepage)}" rel="nofollow noopener ugc">${esc(v.homepage.replace(/^https?:\/\//, ""))}</a></dd>` : ""}
          ${entry.source ? `<dt>Source</dt><dd><a href="${esc(entry.source)}" rel="nofollow noopener ugc">${esc(entry.source.replace(/^https?:\/\//, ""))}</a></dd>` : ""}
          <dt>Imports</dt><dd><ul class="plain">${imports}</ul></dd>
          <dt>Depends on</dt><dd>${v.dependencies?.length ? `<ul class="plain">${v.dependencies.map((d) => `<li>${dep(d)}</li>`).join("")}</ul>` : "nothing"}</dd>
          ${dependents.length ? `<dt>Used by</dt><dd>${dependents.map((e) => `<a href="${pageOf(e.name)}">${esc(e.name)}</a>`).join(", ")}</dd>` : ""}
        </dl>
      </div>
      ${legalLinks(legal, out)}
    </aside>
    <div class="pkg-versions">
      <h2>Versions</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>Version</th><th>Published</th><th>Licence</th><th>Size</th><th>File</th></tr></thead>
        <tbody>${versionRows}
        </tbody>
      </table></div>
      <p class="muted">ember checks each file against the SHA-256 of <a href="index.json">the index</a>. Packages are published by the maintainer of this site, unchanged, under the licence of their authors - see the licence of each package.</p>
    </div>
  </div>
</section>`;
  return layout({ out, title: `${entry.name} — fire packages`, description: v.description || `The fire package ${entry.name}`, body, active: "packages" });
}

export function legalPage({ page, html }) {
  const body = `
<section class="page-head">
  <div class="wrap">
    <p class="eyebrow">Legal</p>
    <h1>${esc(page.title)}</h1>
    ${page.draft ? `<p class="badge">Entwurf (nur in der Vorschau)</p>` : ""}
  </div>
</section>
<section class="section section-tight">
  <div class="wrap"><article class="prose legal">${html}</article></div>
</section>`;
  return layout({ out: page.out, title: `${page.title} — fire`, body });
}
