# The package registry

The packages of `ember`, published with this website at **https://what3var.github.io/packages/**.
Only the maintainer adds packages; there are no accounts and no uploads by others. Someone who wants
a package listed opens an issue with a link to its source, its licence and the SHA-256 of the `.fpk`.

```
registry/
  packages/<name>.json          the package and each version: file or url, sha256, size, licence, dependencies, imports, date
  packages/<name>.md            the readme shown on its page (taken from the package; replace it if you like)
  packages/<name>.LICENSE       the licence text shown on its page (from the package, or --license-file)
  files/<name>/<name>-<v>.fpk   the package files that GitHub Pages serves
  removed.json                  what was taken down, when and why (a removed name stays blocked)
```

`npm run build` turns this into:

| Output | For |
| --- | --- |
| `/packages/index.json` | ember (the default source since fire 2026-11, `EmberSettings.DefaultIndexUrl`) |
| `/packages/files/…` | the package files (versions kept in `registry/files`) |
| `/packages/index.html`, `/packages/<name>.html` | people: list with filter, a page per package |
| `/fire-packages/index.json` | the address older ember versions read; the same index |

The build checks every file against its SHA-256 and size (`scripts/verify-registry.mjs`) and stops when one
does not match - a broken registry is never deployed.

## The index

ember reads `format`, and for each package `name`, `author`, `description`, `license`, `homepage` and the
`versions` with `version`, `url` (relative to the index, or absolute https), `sha256`, `size` and `yanked`. The
other fields (`published`, `dependencies`, `imports`, `page`, `source`) are for people and tools. ember refuses
an index with a higher `format`, plain http (except localhost), a download without `sha256` and a file whose
hash or size differs.

## Publishing a package

1. Get the `.fpk` from its author (built with `ember forge`, which takes `README.md` and `LICENSE` next to the
   description into the package) and the SHA-256 the author published.
2. Check it (see the checklist below), then:

   ```bash
   node scripts/publish-package.mjs path/to/kit-1.2.0.fpk --source https://github.com/someone/kit --dry-run
   node scripts/publish-package.mjs path/to/kit-1.2.0.fpk --source https://github.com/someone/kit
   git add registry && git commit -m "packages: kit 1.2.0" && git push
   ```

   or start the workflow **publish-package** (Actions → publish-package → Run workflow) with the address of the
   `.fpk`, its SHA-256 and the source link: it checks the file, commits to `main` and starts the *pages* workflow.

The script refuses: no or unknown licence (`--allow-license` after reading it), a reserved name (`fire-*`, the
imports of fire), an import marked `standard`, missing files, a name that differs from an existing one only in
case, a new file for a version that is published already (versions never change), a name taken down before
(`--force`), more than 5 MB (`--max-bytes`). It warns about: no licence text in the package, binaries,
dependencies that are not in the registry.

### Checklist before publishing (redistribution)

- [ ] The licence allows passing the package on, and its text (and a `NOTICE`, for Apache-2.0) is in the package
      or given with `--license-file`.
- [ ] The source is public (`--source`), the package is the unchanged file of the author (compare the SHA-256).
- [ ] Read the code, especially C/C++ natives: nothing that downloads, starts processes or touches files it should not.
- [ ] The name does not imitate another project or a trademark.
- [ ] Author, description and homepage are right (they come from `package.json`).

## Withdrawing and taking down

```bash
node scripts/publish-package.mjs --yank kit@1.2.0 --reason "crashes on start"   # not offered as newest any more; kit@1.2.0 still installs
node scripts/publish-package.mjs --unyank kit@1.2.0
node scripts/publish-package.mjs --remove kit --reason "takedown request 2026-12-01"   # files and entries gone, name blocked
```

A removed file stays in the git history (and as a release asset, if it was one): for a real infringement also
rewrite the history (`git filter-repo --path registry/files/kit --invert-paths`) and delete the release asset.

## Where the files live: Pages or releases

**Default: the files are part of the site** (`registry/files`, served by GitHub Pages). fire packages are source
only (a few kB), so this goes a long way: a Pages site may have up to 1 GB, with a soft limit of 100 GB of traffic
a month; a file in the repository must stay below 100 MB.

**When the registry grows: GitHub release assets.** Each file may be up to 2 GiB, up to 1000 assets per release,
and GitHub does not limit their total size or traffic. The workflow does it with `storage: release`: it uploads the
file to the release `pkg-<name>` of this repository and writes its address (`--url`) into the registry; the build then
only lists it. By hand:

```bash
gh release create pkg-kit --title "kit" --notes "Package files of kit" || true
gh release upload pkg-kit kit-1.2.0.fpk
node scripts/publish-package.mjs kit-1.2.0.fpk --url https://github.com/what3var/what3var.github.io/releases/download/pkg-kit/kit-1.2.0.fpk
```

`node scripts/verify-registry.mjs --remote` downloads those files and checks them, too.

## Trying it locally

```bash
REGISTRY_DIR=fixtures/registry npm run build     # the sample packages of fixtures/registry
python3 -m http.server -d dist 4321
# ember.json next to ember: { "sources": [ "http://localhost:4321/packages/index.json" ] }
ember find && ember install colorkit
```
