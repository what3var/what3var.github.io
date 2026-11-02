// News: one Markdown file per entry in news/, named YYYY-MM-DD-some-slug.md:
//
//   ---
//   title: Circuits make sound
//   tag: Circuits
//   ---
//   First paragraph is the teaser on the home page.
//
//   Everything else only appears on the news page.
//
// GitHub releases of fire are added as entries automatically.

import fs from "node:fs";
import path from "node:path";

function frontMatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w+)\s*:\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return { meta, body: raw.slice(m[0].length) };
}

// first paragraph as plain text, for the teaser
function teaser(md) {
  const para = md.trim().split(/\r?\n\s*\r?\n/)[0] ?? "";
  return para.replace(/\r?\n/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`#>]/g, "")
    .trim();
}

export function loadNews(dir, releases, md) {
  const entries = [];
  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort()) {
      const name = path.basename(file, ".md");
      const date = name.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
      if (!date) { console.warn(`! news file without a date in its name: ${file}`); continue; }
      const { meta, body } = frontMatter(fs.readFileSync(path.join(dir, file), "utf8"));
      if (meta.draft === "true") continue;
      entries.push({
        slug: name,
        date,
        title: meta.title ?? name.slice(11).replace(/-/g, " "),
        tag: meta.tag ?? "",
        teaser: teaser(body),
        html: md.parse(body),
      });
    }
  }
  for (const r of releases) {
    const body = (r.body || "").trim();
    entries.push({
      slug: `release-${r.tag_name}`,
      date: r.published_at.slice(0, 10),
      title: `${r.name || r.tag_name} is out`,
      tag: r.prerelease ? "Pre-release" : "Release",
      teaser: teaser(body) || "A new build is available on the download page.",
      html: (body ? md.parse(body) : "") + `<p><a href="${r.html_url}">Release notes and files on GitHub</a></p>`,
      link: r.html_url,
    });
  }
  return entries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
