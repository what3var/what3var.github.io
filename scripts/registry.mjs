// The package registry of the website: the packages of ember, kept in this repository and
// published with the site (https://what3var.github.io/packages/).
//
//   registry/packages/<name>.json         what is known about a package and each of its versions
//   registry/files/<name>/<name>-<v>.fpk  the package files that the site serves itself
//   registry/packages/<name>.md           optional: a readme that replaces the one in the package
//
// A version either lies in registry/files (served by GitHub Pages next to the index) or has an
// absolute https "url" (a GitHub release asset, for example) - see registry/README.md.
//
// Used by build.mjs (pages + index.json), scripts/publish-package.mjs and scripts/verify-registry.mjs.
// No dependencies besides node itself: the .fpk (a zip) is read with node:zlib.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";

// the rules of ember (src/fire.Package.Manager/Manifest.cs in fire)
export const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
export const VERSION_PATTERN = /^\d+(\.\d+)*(-[0-9A-Za-z.-]+)?$/;
// the imports of the compiler and of the standard packages: a package of the registry must not take these names
export const RESERVED = new Set(("print graphics windows devices io filesystem dialogs ui linq reflection time random testing net process hash compression ai ai.agent ai.models " +
  "assistant mcp tls http http.rpc http.pages data data.sqlite data.memory data.mysql data.sqlserver data.postgres http.data gpio i2c spi wifi audio usb tracker " +
  "scene3d scene3d.terrain scene3d.effects scene3d.physics ui.docking json net.channel circuits circuits.ui console machine dos xms x86").split(" "));
// "fire-*" are the standard packages that come with fire; "ember", "spark", "forge" would only confuse
export const reservedName = (name) => /^fire[-_.]/i.test(name) || /^(fire|ember|spark|forge|std|core)$/i.test(name);

// licences (SPDX ids) whose terms allow the maintainer to pass a package on unchanged.
// Anything else needs --allow-license after reading the licence (registry/README.md).
export const REDISTRIBUTABLE = new Set([
  "MIT", "MIT-0", "BSD-2-Clause", "BSD-3-Clause", "0BSD", "ISC", "Zlib", "Apache-2.0", "BSL-1.0", "Unlicense", "CC0-1.0",
  "MPL-2.0", "LGPL-2.1-only", "LGPL-2.1-or-later", "LGPL-3.0-only", "LGPL-3.0-or-later", "GPL-2.0-only", "GPL-2.0-or-later",
  "GPL-3.0-only", "GPL-3.0-or-later", "AGPL-3.0-only", "AGPL-3.0-or-later", "EUPL-1.2", "Artistic-2.0", "PSF-2.0",
]);
// these licences want their text (and notices) to go with every copy
export const NEEDS_TEXT = /^(MIT$|BSD-|ISC|Zlib|Apache-|BSL-|MPL-|L?GPL-|AGPL-|EUPL-|Artistic-)/;
const DOCUMENT = /^(README|LICEN[CS]E|COPYING|NOTICE|AUTHORS)(\.(md|txt))?$/i;

export const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

// ---------------------------------------------------------------- zip
// The entries of a zip (from its central directory) and the bytes of one of them.
export function readZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("not a zip file (no end of central directory)");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("broken central directory");
    const method = buf.readUInt16LE(p + 10);
    const compressed = buf.readUInt32LE(p + 20);
    const size = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    entries.set(name, { name, method, compressed, size, local });
    p += 46 + nameLen + extraLen + commentLen;
  }
  const read = (name) => {
    const e = entries.get(name);
    if (!e) return null;
    if (buf.readUInt32LE(e.local) !== 0x04034b50) throw new Error(`broken entry ${name}`);
    const start = e.local + 30 + buf.readUInt16LE(e.local + 26) + buf.readUInt16LE(e.local + 28);
    const data = buf.subarray(start, start + e.compressed);
    if (e.method === 0) return Buffer.from(data);
    if (e.method === 8) return zlib.inflateRawSync(data, { maxOutputLength: 64 * 1024 * 1024 });
    throw new Error(`entry ${name}: compression method ${e.method} is not supported`);
  };
  return { names: [...entries.keys()].filter((n) => !n.endsWith("/")), read };
}

// What the registry needs to know of a package file: its package.json and its documents.
export function inspectFpk(buf) {
  const zip = readZip(buf);
  for (const n of zip.names) {
    if (n.startsWith("/") || n.includes("\\") || n.split("/").includes("..")) throw new Error(`the package has a path that leaves its folder: ${n}`);
  }
  const raw = zip.read("package.json");
  if (!raw) throw new Error("no package.json in the root of the package");
  let manifest;
  try { manifest = JSON.parse(raw.toString("utf8").replace(/^﻿/, "")); } catch (e) { throw new Error(`package.json is not valid JSON: ${e.message}`); }
  const documents = zip.names.filter((n) => !n.includes("/") && DOCUMENT.test(n));
  const readme = documents.find((n) => /^README/i.test(n));
  const licenseFiles = documents.filter((n) => /^(LICEN[CS]E|COPYING|NOTICE)/i.test(n));
  // every file the description names must be in the package (as ember checks it)
  const named = [];
  const list = (l) => (Array.isArray(l) ? l : []).map((x) => (typeof x === "string" ? x : x?.path ?? x?.file)).filter(Boolean);
  for (const imp of manifest.imports ?? []) {
    if (imp.prelude) named.push(imp.prelude);
    const n = imp.native;
    if (n) named.push(...list(n.sources), ...Object.values(n.platformSources ?? {}).flatMap(list), ...Object.values(n.libraries ?? {}), ...(n.headers ?? []));
  }
  named.push(...(manifest.documents ?? []));
  const missing = named.filter((f) => !zip.names.includes(String(f).replace(/\\/g, "/")));
  return {
    manifest,
    files: zip.names,
    readme: readme ? zip.read(readme).toString("utf8") : null,
    licenseFiles,
    missing,
  };
}

// The problems of a package (not empty: it is not published) and the warnings for the maintainer.
export function checkPackage(info, { allowLicense = false, maxBytes = 5 * 1024 * 1024, size = 0 } = {}) {
  const m = info.manifest;
  const problems = [], warnings = [];
  if ((m.format ?? 1) !== 1) problems.push(`unknown format ${m.format}`);
  if (!NAME_PATTERN.test(m.name ?? "")) problems.push(`'name' is missing or not a name: ${m.name}`);
  else if (reservedName(m.name)) problems.push(`'${m.name}' is a name reserved for fire itself`);
  if (!VERSION_PATTERN.test(m.version ?? "")) problems.push(`'version' is missing or not a version: ${m.version}`);
  if (!Array.isArray(m.imports) || m.imports.length === 0) problems.push("the package has no imports");
  for (const imp of m.imports ?? []) {
    if (RESERVED.has(String(imp.name).toLowerCase())) problems.push(`the import '${imp.name}' belongs to fire`);
    if (imp.standard) problems.push(`the import '${imp.name}' says it is a standard library ("standard": true) - only fire's own packages are`);
  }
  if (info.missing.length) problems.push(`files named in package.json are not in the package: ${info.missing.join(", ")}`);
  const license = String(m.license ?? "").trim();
  if (!license) problems.push("'license' is empty - the registry only passes on packages whose licence is known");
  else if (!REDISTRIBUTABLE.has(license) && !allowLicense) problems.push(`the licence '${license}' is not on the list of licences that allow passing the package on (read it, then use --allow-license)`);
  if (license && NEEDS_TEXT.test(license) && info.licenseFiles.length === 0)
    warnings.push(`${license} wants its text with every copy, but the package has no LICENSE file (ember forge takes LICENSE/README next to the description) - ask for a package with it, or give --license-file`);
  if (!m.author) warnings.push("no 'author'");
  if (!m.description) warnings.push("no 'description'");
  if (size > maxBytes) problems.push(`the package has ${size} bytes, more than ${maxBytes} (packages are source only; raise --max-bytes or use --url for a release asset)`);
  if (info.files.some((f) => /\.(exe|dll|so|dylib|a|lib|o|obj|bin)$/i.test(f))) warnings.push("the package contains binaries - fire packages are source only; check what they are");
  return { problems, warnings };
}

// ---------------------------------------------------------------- the registry folder
export function loadRegistry(root) {
  const dir = path.join(root, "packages");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort().map((f) => {
    const entry = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    if (`${entry.name}.json` !== f) throw new Error(`registry/packages/${f} describes '${entry.name}'`);
    const md = path.join(dir, `${entry.name}.md`);
    if (fs.existsSync(md)) entry.readme = fs.readFileSync(md, "utf8");
    const lic = path.join(dir, `${entry.name}.LICENSE`);
    if (fs.existsSync(lic)) entry.licenseText = fs.readFileSync(lic, "utf8");
    return entry;
  });
}

export function savePackage(root, entry) {
  const dir = path.join(root, "packages");
  fs.mkdirSync(dir, { recursive: true });
  const { readme, licenseText, ...data } = entry;
  fs.writeFileSync(path.join(dir, `${entry.name}.json`), JSON.stringify(data, null, 2) + "\n");
}

// numbers part by part; a version with a suffix is older than the same one without (as in ember)
export function compareVersions(a, b) {
  const split = (v) => { const [n, ...s] = String(v).split("-"); return [n.split(".").map(Number), s.join("-")]; };
  const [na, sa] = split(a), [nb, sb] = split(b);
  for (let i = 0; i < Math.max(na.length, nb.length); i++) {
    const x = na[i] ?? 0, y = nb[i] ?? 0;
    if (x !== y) return x - y;
  }
  if (sa === sb) return 0;
  if (!sa) return 1;
  if (!sb) return -1;
  return sa < sb ? -1 : 1;
}

export const sortedVersions = (entry) => [...(entry.versions ?? [])].sort((a, b) => compareVersions(b.version, a.version));
export const latestVersion = (entry) => sortedVersions(entry).find((v) => !v.yanked) ?? null;

// Checks every version against its file: the file that is served has the hash and the size of the registry.
export function verifyRegistry(root) {
  const errors = [];
  const entries = loadRegistry(root);
  for (const e of entries) {
    if (!NAME_PATTERN.test(e.name)) errors.push(`${e.name}: not a name`);
    if (!e.versions?.length) errors.push(`${e.name}: no versions`);
    const seen = new Set();
    for (const v of e.versions ?? []) {
      const id = `${e.name} ${v.version}`;
      if (seen.has(v.version)) errors.push(`${id}: listed twice`);
      seen.add(v.version);
      if (!VERSION_PATTERN.test(v.version ?? "")) errors.push(`${id}: not a version`);
      if (!/^[0-9a-f]{64}$/.test(v.sha256 ?? "")) errors.push(`${id}: no sha256`);
      if (!v.license) errors.push(`${id}: no licence`);
      if (v.file) {
        const file = path.resolve(root, v.file);
        if (!file.startsWith(path.resolve(root, "files") + path.sep)) { errors.push(`${id}: the file is not below registry/files`); continue; }
        if (!fs.existsSync(file)) { errors.push(`${id}: ${v.file} is missing`); continue; }
        const buf = fs.readFileSync(file);
        if (sha256(buf) !== v.sha256) errors.push(`${id}: ${v.file} does not have the sha256 of the registry`);
        if (buf.length !== v.size) errors.push(`${id}: ${v.file} has ${buf.length} bytes, the registry says ${v.size}`);
      } else if (!/^https:\/\//.test(v.url ?? "")) errors.push(`${id}: neither a file in the registry nor an https url`);
    }
  }
  return { entries, errors };
}

// ---------------------------------------------------------------- the index for ember
// `{ format, packages: [ { name, author, description, license, homepage, versions: [ { version, url, sha256, size, yanked } ] } ] }`
// is what ember reads (PackageIndex in src/fire.Package.Manager/PackageSources.cs of fire); the other fields are for people and tools.
// `fileUrl` turns a file of the registry into the url written to the index (relative to the index).
export function buildIndex(entries, { fileUrl, pageUrl, generated = new Date().toISOString() }) {
  return {
    format: 1,
    generated,
    packages: entries.map((e) => {
      const latest = latestVersion(e) ?? sortedVersions(e)[0];
      return {
        name: e.name,
        author: latest?.author ?? "",
        description: latest?.description ?? "",
        license: latest?.license ?? "",
        homepage: latest?.homepage || undefined,
        source: e.source || undefined,
        page: pageUrl(e),
        versions: sortedVersions(e).reverse().map((v) => ({
          version: v.version,
          url: v.file ? fileUrl(v.file) : v.url,
          sha256: v.sha256,
          size: v.size,
          published: v.published,
          license: v.license,
          dependencies: v.dependencies ?? [],
          imports: v.imports ?? [],
          ...(v.yanked ? { yanked: true, yankedReason: v.yankedReason || undefined } : {}),
        })),
      };
    }),
  };
}
