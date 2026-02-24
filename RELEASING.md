# Release Process

All packages in this monorepo are versioned together using [Changesets](https://github.com/changesets/changesets) in **fixed mode**. Every release bumps all `@refrakt-md/*` packages and `create-refrakt` to the same version.

## How it works

1. Contributors create changesets describing their changes
2. When merged to `main`, CI opens a "Version Packages" PR that bumps all versions
3. Merging that PR triggers the publish step

## Creating a changeset

After making changes, run:

```bash
npx changeset
```

Select the affected packages and describe the change. The changeset file is committed alongside your code.

## Versioning

Bumps all fixed-group packages and regenerates changelogs:

```bash
npm run version-packages
```

This runs `changeset version` followed by `scripts/generate-changelog.mjs` which aggregates per-package changelogs into `site/content/releases.md`.

## Publishing

Build and publish all packages:

```bash
npm run release
```

This is normally handled by CI (`.github/workflows/release.yml`) — you shouldn't need to run it locally.

## Pre-release checklist

Before merging a release PR, verify:

- [ ] `npm run build` succeeds
- [ ] `npm test` passes
- [ ] Scaffold smoke test: run `node packages/create-refrakt/dist/bin.js test-site` in a temp directory, `npm install`, and `npm run dev` — the site should start without errors
- [ ] Inter-package dependency versions are correct (exact pins for workspace deps, `~` ranges for scaffolded sites)

## Post-release verification

After packages are published to npm:

- [ ] `npx create-refrakt test-site && cd test-site && npm install && npm run dev` works
- [ ] The scaffolded `package.json` references the newly published version

## Key configuration

| File | Purpose |
|------|---------|
| `.changeset/config.json` | Changesets config — `fixed` array keeps all packages in sync |
| `.github/workflows/release.yml` | CI workflow that versions and publishes on merge to `main` |
| `scripts/generate-changelog.mjs` | Aggregates changelogs into `site/content/releases.md` |

## Semver note (0.x)

While packages are pre-1.0, caret ranges (`^0.x.0`) only allow patch updates — `^0.4.0` means `>=0.4.0 <0.5.0`. The `create-refrakt` template uses tilde ranges (`~0.x.0`) derived from its own package version to ensure scaffolded sites install the correct minor version.
