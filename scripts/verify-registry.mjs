#!/usr/bin/env node
// Checks the registry: every package file that the site serves has the sha256 and the size that
// the registry (and so the index of ember) gives; every version has a licence and a hash.
//   node scripts/verify-registry.mjs [--registry dir] [--remote]
// --remote also downloads the versions that live at an https url (release assets) and checks them.
// build.mjs runs the same check without --remote: a registry that does not verify is not published.

import path from "node:path";
import { verifyRegistry, sha256 } from "./registry.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const at = args.indexOf("--registry");
const registry = path.resolve(at >= 0 ? args[at + 1] : path.join(ROOT, "registry"));

const { entries, errors } = verifyRegistry(registry);
if (args.includes("--remote")) {
  for (const e of entries) for (const v of e.versions) {
    if (v.file || !v.url) continue;
    try {
      const res = await fetch(v.url, { redirect: "follow" });
      if (!res.ok) { errors.push(`${e.name} ${v.version}: ${v.url}: HTTP ${res.status}`); continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      if (sha256(buf) !== v.sha256) errors.push(`${e.name} ${v.version}: ${v.url} does not have the sha256 of the registry`);
      if (buf.length !== v.size) errors.push(`${e.name} ${v.version}: ${v.url} has ${buf.length} bytes, the registry says ${v.size}`);
    } catch (err) { errors.push(`${e.name} ${v.version}: ${v.url}: ${err.message}`); }
  }
}
const versions = entries.reduce((n, e) => n + e.versions.length, 0);
if (errors.length) {
  console.error(`registry: ${errors.length} problem(s)\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
console.log(`registry: ${entries.length} packages, ${versions} versions - ok`);
