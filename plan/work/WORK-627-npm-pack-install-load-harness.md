{% work id="WORK-627" status="done" priority="medium" complexity="moderate" source="SPEC-153" milestone="v0.40.0" tags="packaging,plugins,testing,composition" pr="refrakt-md/refrakt#681" %}

# An `npm pack` → install → load harness for plugins

{% ref "SPEC-153" /%} implementation note 2. It is the only gate that catches the measured
breakages, and nothing like it exists today. A monorepo test resolves packages through
workspace links, so it passes whatever the tarball contains.

The harness packs a plugin, installs the tarball into a temporary fixture project outside
the workspace, and loads it through the same `loadPlugin()` path a site uses. The first
target is the plugins as they ship today. That proves the harness on known-good input,
and proves {% ref "WORK-626" /%}'s fix against the tarball rather than the workspace.
Shipping composed runes in a tarball is a later SPEC-153 step that reuses this harness.

## Blocked by

- {% ref "WORK-626" /%}

## Acceptance Criteria

- [x] A script packs a plugin with `npm pack`, installs the tarball into a temporary project outside the workspace, and loads it with `loadPlugin()`, failing with the plugin name and the cause
- [x] The harness runs against at least `@refrakt-md/plan` and one plugin without an `exports` map, and both load
- [x] Reverting WORK-626's `./package.json` export on `plan` makes the harness fail, demonstrated once and recorded in the resolution
- [x] The harness runs in CI, or the reason it cannot (time, network) is recorded with where it does run

## Resolution

Completed: 2026-10-08

Branch: `claude/v040-pack-harness`
PR: refrakt-md/refrakt#681

### What was done
- `scripts/pack-harness.mjs` (new; `npm run plugins:pack-check`) does the following for every plugin under `plugins/`, or for the ones named:
  - packs the plugin and the transitive closure of its internal `@refrakt-md/*` dependencies and peers with `npm pack`, always including `runes`;
  - installs the tarballs into a fresh project under `os.tmpdir()`, after asserting that the project is outside the workspace;
  - resolves `<pkg>/package.json` by name and checks that the plugin and runes entry points resolve inside the fixture;
  - loads the plugin with `loadPlugin()` from the installed runes and requires at least one rune back.
  - A failure prints `✗ <plugin>: <install|manifest|load> failed: <cause>` and exits 1.
- `scripts/pack-harness.test.mjs` (new) unit-tests plugin selection, the closure (every internal dependency of every member is in it), the outside-workspace check, and that CI runs the harness.
- `.github/workflows/validate.yml`: a "Plugin pack harness" step after `npm test`.
- `package.json`: the `plugins:pack-check` script.
- Result on this tree: all 9 plugins load from their tarballs in about 26s. That includes `@refrakt-md/plan` (10 runes) and the seven plugins with no `exports` map, such as marketing (14 runes).

### Revert demonstration (local only, not committed)
I deleted `"./package.json"` from `plugins/plan/package.json` `exports` and ran `node scripts/pack-harness.mjs plan marketing --keep`:
```
✗ @refrakt-md/plan: manifest failed: Package subpath './package.json' is not defined by "exports" in /tmp/refrakt-pack-harness-sSEHsn/plan-2bXCgR/node_modules/@refrakt-md/plan/package.json
  fixture kept at /tmp/refrakt-pack-harness-sSEHsn/plan-2bXCgR
✓ @refrakt-md/marketing: loaded 14 runes from the tarball (2.0s)

1 of 2 plugin(s) failed (8.6s)
```
Exit 1. I then restored the export.

### Notes
- **The spec did not hold here: `loadPlugin()` alone does not catch the revert.** In the same reverted fixture, `loadPlugin('@refrakt-md/plan')` returned 10 runes and no error. `discoverPluginFixtureManifest` swallows the `require.resolve` failure in a bare `catch {}`, and plan has no static `fileRoots`, so nothing else resolves the manifest. The harness therefore checks the manifest explicitly as its own stage before it calls `loadPlugin()`. I left `loadPlugin()` unchanged. Making that path fail loudly is the swallowed-`catch` finding WORK-626 already deferred to SPEC-153's plugin-side step.
- **Internal dependencies come from local tarballs, pinned with `overrides`.** Each internal package in the closure is a `file:` tarball dependency of the fixture project, and the same specs are repeated under `overrides`, so a transitive `@refrakt-md/*` cannot be fetched from the registry. A registry copy would test the last release, not this tree. Every package in the closure gets packed, because skipping one would mean either a workspace link or a registry fetch. `npm ls` shows them `overridden`/`deduped`, installed as real directories.
- **It runs in CI** in the validate job, on every PR and on push to main. It costs about 25s. Third-party dependencies install with `--prefer-offline` from the cache `npm ci` has just filled, so network use is negligible. It needs a built tree, which is why it runs after `npm run build`. It is not part of vitest because of its runtime and its npm and cache dependency.
- `@refrakt-md/runes` also has no `./package.json` export, so the harness locates it by entry point (`import.meta.resolve`). Runes is not a plugin, so WORK-626 did not cover it, but SPEC-153's "one ordinary change away" argument applies to it as well.

{% /work %}
