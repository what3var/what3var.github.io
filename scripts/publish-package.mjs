#!/usr/bin/env node
// Adds a package (.fpk) to the registry of the website - run by the maintainer, locally or by the
// "publish-package" workflow. See registry/README.md.
//
//   node scripts/publish-package.mjs <file.fpk | https://.../file.fpk> [options]
//     --sha256 <hex>          the hash the file must have (always give it for a download)
//     --url <https-url>       the file stays there (a GitHub release asset); it is not copied into registry/files
//     --source <url>          where the source code of the package is (shown on its page)
//     --readme <file>         a readme instead of the one in the package
//     --license-file <file>   the licence text, when the package has none
//     --allow-license         publish a licence that is not on the list (after reading it)
//     --max-bytes <n>         the largest package (default 5 MB)
//     --dry-run               check only, change nothing
//
//   node scripts/publish-package.mjs --yank name@version [--reason "text"]    withdraw a version (stays installable as name@version)
//   node scripts/publish-package.mjs --unyank name@version
//   node scripts/publish-package.mjs --remove name[@version] --reason "text"  take it down: files and entries are deleted, the
//                                                                             name stays blocked (registry/removed.json)
//   common: --registry <dir> (default: registry/ of this repository)

import fs from "node:fs";
import path from "node:path";
import {
  inspectFpk, readZip, checkPackage, loadRegistry, savePackage, sha256, compareVersions, NAME_PATTERN,
} from "./registry.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

function parseArgs(argv) {
  const opts = { _: [] };
  const flags = new Set(["allow-license", "dry-run", "force"]);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) { opts._.push(a); continue; }
    const key = a.slice(2);
    if (flags.has(key)) opts[key] = true;
    else if (i + 1 < argv.length) opts[key] = argv[++i];
    else throw new Error(`${a} needs a value`);
  }
  return opts;
}

const today = () => new Date().toISOString().slice(0, 10);

function splitSpec(spec) {
  const at = spec.lastIndexOf("@");
  return at > 0 ? [spec.slice(0, at), spec.slice(at + 1)] : [spec, null];
}

function removedLog(registry) {
  const file = path.join(registry, "removed.json");
  return { file, list: fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [] };
}

async function getBytes(input) {
  if (/^https:\/\//.test(input)) {
    const res = await fetch(input, { redirect: "follow" });
    if (!res.ok) throw new Error(`download of ${input}: HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  if (/^http:\/\//.test(input)) throw new Error("only https downloads");
  return fs.readFileSync(input);
}

async function publish(input, opts, registry) {
  const buf = await getBytes(input);
  const hash = sha256(buf);
  if (opts.sha256 && opts.sha256.toLowerCase() !== hash) throw new Error(`the file has sha256 ${hash}, not ${opts.sha256}`);
  if (/^https:\/\//.test(input) && !opts.sha256) console.warn("! no --sha256 given for a download: check the hash below against the one the author published");

  const info = inspectFpk(buf);
  const m = info.manifest;
  if (opts["license-file"]) info.licenseFiles.push(path.basename(opts["license-file"]));
  const { problems, warnings } = checkPackage(info, { allowLicense: !!opts["allow-license"], maxBytes: Number(opts["max-bytes"] ?? 5 * 1024 * 1024), size: buf.length });
  if (opts.url && !/^https:\/\//.test(opts.url)) problems.push("--url must be an https address");

  const entries = loadRegistry(registry);
  const existing = entries.find((e) => e.name.toLowerCase() === String(m.name).toLowerCase());
  if (existing && existing.name !== m.name) problems.push(`the registry has '${existing.name}' - a name that differs only in case is another package`);
  const same = existing?.name === m.name ? existing.versions.find((v) => v.version === m.version) : undefined;
  if (same && same.sha256 !== hash) problems.push(`${m.name} ${m.version} is published already with another file - a published version never changes; publish a new version`);
  const { list: removed } = removedLog(registry);
  if (removed.some((r) => r.name.toLowerCase() === String(m.name).toLowerCase() && !r.version) && !opts.force)
    problems.push(`'${m.name}' was taken down (registry/removed.json); --force publishes it again`);
  for (const dep of m.dependencies ?? []) {
    if (!/^fire-/.test(dep) && !entries.some((e) => e.name.toLowerCase() === dep.toLowerCase()) && dep.toLowerCase() !== String(m.name).toLowerCase())
      warnings.push(`depends on '${dep}', which is not in the registry (publish it first, or ember will not find it)`);
  }

  console.log(`${m.name} ${m.version}  (${buf.length} bytes, sha256 ${hash})`);
  console.log(`  licence: ${m.license || "-"}${info.licenseFiles.length ? ` (${info.licenseFiles.join(", ")})` : ""}; readme: ${info.readme ? "yes" : "no"}`);
  for (const w of warnings) console.log(`  warning: ${w}`);
  if (problems.length) throw new Error("not published:\n  " + problems.join("\n  "));
  if (same) { console.log("  is published already with this file - nothing to do"); return; }
  if (opts["dry-run"]) { console.log("  (dry run: nothing changed)"); return; }

  const version = {
    version: m.version,
    ...(opts.url ? { url: opts.url } : { file: `files/${m.name}/${m.name}-${m.version}.fpk` }),
    sha256: hash,
    size: buf.length,
    published: today(),
    author: m.author || "",
    description: m.description || "",
    license: m.license,
    homepage: m.homepage || undefined,
    dependencies: m.dependencies ?? [],
    imports: (m.imports ?? []).map((i) => ({
      name: i.name,
      ...(i.requires?.length ? { requires: i.requires } : {}),
      ...(i.prelude ? { prelude: true } : {}),
      ...(i.native ? { native: i.native.language ?? "c++", platforms: i.native.platforms?.length ? i.native.platforms : undefined } : {}),
    })),
    ...(info.files.some((f) => f.startsWith("templates/")) ? { templates: true } : {}),
  };
  if (version.file) {
    const target = path.join(registry, version.file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, buf);
  }
  const entry = existing ?? { name: m.name, versions: [] };
  if (opts.source) entry.source = opts.source;
  entry.versions = [...entry.versions, version].sort((a, b) => compareVersions(a.version, b.version));
  savePackage(registry, entry);

  // the readme and the licence of the newest version are shown on the page of the package
  const newest = entry.versions.filter((v) => !v.yanked).at(-1);
  if (newest?.version === m.version) {
    const readme = opts.readme ? fs.readFileSync(opts.readme, "utf8") : info.readme;
    if (readme) fs.writeFileSync(path.join(registry, "packages", `${m.name}.md`), readme);
    const zipLicense = info.licenseFiles.find((f) => /^(LICEN[CS]E|COPYING)/i.test(f));
    const licenseText = opts["license-file"] ? fs.readFileSync(opts["license-file"], "utf8") : zipLicense ? readZip(buf).read(zipLicense).toString("utf8") : null;
    if (licenseText) fs.writeFileSync(path.join(registry, "packages", `${m.name}.LICENSE`), licenseText);
  }
  const shown = (p) => path.relative(process.cwd(), path.join(registry, p));
  console.log(`  published: ${shown(`packages/${m.name}.json`)}${version.file ? `, ${shown(version.file)}` : `, ${opts.url}`}`);
}

function setYanked(spec, yanked, opts, registry) {
  const [name, ver] = splitSpec(spec);
  if (!ver) throw new Error("name@version");
  const entry = loadRegistry(registry).find((e) => e.name === name) ?? (() => { throw new Error(`no package '${name}'`); })();
  const v = entry.versions.find((x) => x.version === ver) ?? (() => { throw new Error(`'${name}' has no version ${ver}`); })();
  if (yanked) { v.yanked = true; if (opts.reason) v.yankedReason = opts.reason; }
  else { delete v.yanked; delete v.yankedReason; }
  if (!opts["dry-run"]) savePackage(registry, entry);
  console.log(`${name} ${ver}: ${yanked ? "withdrawn (yanked)" : "offered again"}`);
}

function remove(spec, opts, registry) {
  const [name, ver] = splitSpec(spec);
  if (!NAME_PATTERN.test(name)) throw new Error(`not a name: ${name}`);
  if (!opts.reason) throw new Error("--reason is required for a takedown (it is kept in registry/removed.json)");
  const entry = loadRegistry(registry).find((e) => e.name === name) ?? (() => { throw new Error(`no package '${name}'`); })();
  const gone = ver ? entry.versions.filter((v) => v.version === ver) : entry.versions;
  if (!gone.length) throw new Error(`'${name}' has no version ${ver}`);
  if (opts["dry-run"]) { console.log(`would remove ${gone.map((v) => `${name} ${v.version}`).join(", ")}`); return; }
  for (const v of gone) if (v.file) fs.rmSync(path.join(registry, v.file), { force: true });
  entry.versions = entry.versions.filter((v) => !gone.includes(v));
  const dir = path.join(registry, "packages");
  if (entry.versions.length) savePackage(registry, entry);
  else {
    for (const ext of [".json", ".md", ".LICENSE"]) fs.rmSync(path.join(dir, name + ext), { force: true });
    fs.rmSync(path.join(registry, "files", name), { recursive: true, force: true });
  }
  const log = removedLog(registry);
  log.list.push({ name, ...(ver ? { version: ver } : {}), date: today(), reason: opts.reason });
  fs.writeFileSync(log.file, JSON.stringify(log.list, null, 2) + "\n");
  console.log(`removed ${gone.map((v) => `${name} ${v.version}`).join(", ")} (${opts.reason})`);
  console.log("  note: the files stay in the git history and in GitHub release assets until you delete those as well (registry/README.md, takedown)");
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const registry = path.resolve(opts.registry ?? path.join(ROOT, "registry"));
  if (opts.yank) return setYanked(opts.yank, true, opts, registry);
  if (opts.unyank) return setYanked(opts.unyank, false, opts, registry);
  if (opts.remove) return remove(opts.remove, opts, registry);
  if (opts._.length !== 1) {
    console.error("usage: node scripts/publish-package.mjs <file.fpk | https-url> [--sha256 hex] [--url https-url] [--source url] [--readme file] [--license-file file] [--allow-license] [--dry-run]");
    console.error("       node scripts/publish-package.mjs --yank|--unyank name@version | --remove name[@version] --reason text");
    process.exit(2);
  }
  await publish(opts._[0], opts, registry);
}

main().catch((e) => { console.error(`publish-package: ${e.message}`); process.exit(1); });
