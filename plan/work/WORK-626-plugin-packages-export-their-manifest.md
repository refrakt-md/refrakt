{% work id="WORK-626" status="done" priority="medium" complexity="simple" source="SPEC-153" milestone="v0.40.0" tags="packaging,plugins,composition" pr="refrakt-md/refrakt#675" %}

# Every plugin package exports its manifest and publishes what it declares

{% ref "SPEC-153" /%} implementation note 1: the packaging prerequisites everything else in
that spec rests on. All three failures are invisible in the monorepo, so this step must
not be assumed. Measured in SPEC-153:

- **The manifest does not resolve.** `@refrakt-md/plan` and `@refrakt-md/docs` declare an
  `exports` map with no `./package.json` entry, so `require.resolve('<pkg>/package.json')`
  throws `ERR_PACKAGE_PATH_NOT_EXPORTED`. The other seven resolve only because they have
  no `exports` map at all. None of the nine declares `./package.json`.
- **`files` has drifted.** `plan`'s `files` declares `styles`, which does not exist on
  disk.
- **A comment blames the wrong cause.** The comment in `discoverPluginFixtures` blames
  "workspace link" for a failure the exports map causes.

Every plugin gains a `./package.json` export. Adding an `exports` map later is then a
safe, routine change rather than a silent break. `files` matches what is on disk, and the
comment is corrected.

This item does not add a rune directory to any plugin, or to `files`. That is SPEC-153's
plugin-side step, and it is out of this milestone.

## Acceptance Criteria

- [x] `require.resolve('<pkg>/package.json')` succeeds for all nine plugins, asserted by a test that iterates the plugin list rather than naming two
- [x] Every plugin declaring an `exports` map lists `./package.json` in it
- [x] Every entry in each plugin's `files` exists on disk after a build, asserted by the same test
- [x] `discoverPluginFixtures`' comment no longer attributes the failure to workspace links
- [x] A changeset records the `exports` additions

## Resolution

Completed: 2026-10-08

Branch: `claude/v040-plugin-manifest-exports`
PR: refrakt-md/refrakt#675

### What was done
- `plugins/plan/package.json`, `plugins/docs/package.json`: added `"./package.json": "./package.json"` to the `exports` map. `require.resolve('<pkg>/package.json')` used to throw `ERR_PACKAGE_PATH_NOT_EXPORTED` for both and now resolves.
- `plugins/plan/package.json`: dropped `styles` from `files`, since the directory does not exist. `npm pack --dry-run` still publishes 157 entries under `dist` and `package.json`.
- `packages/runes/test/plugin-manifests.test.ts` (new): reads the plugins from `plugins/` instead of naming them. For each one it asserts that `<pkg>/package.json` resolves by name, that any `exports` map lists `./package.json`, and that every `files` entry exists on disk after a build. With the manifest changes reverted it fails for plan and docs, which reproduces SPEC-153's measurement.
- `packages/runes/src/plugins.ts`: corrected the `catch` comment. It now says the failure means the package is not installed or its exports map leaves out `./package.json`. It no longer blames workspace links.
- `.changeset/plugin-manifest-exports.md`: patch for plan and docs.

### Notes
- The work item's prose says every plugin gains a `./package.json` export. The criterion, and SPEC-153 note 1 ("or no `exports` map"), only require it of plugins that declare a map. The other seven have no map, and adding one only to carry this entry would close off deep imports into them, so they keep none. The test catches a future map that leaves the entry out.
- The comment sits in `discoverPluginFixtureManifest`, which `discoverPluginFixtures` calls.
- Finding, not fixed (out of scope): the same `catch {}` also wraps the fixture loop, so it swallows `parseFixture` errors. Its docstring says those throw and that the WORK-414 corpus check relies on that. It does nothing today because no plugin ships `fixtures/`. It should be fixed before one does, ideally together with SPEC-153's plugin-side step.

{% /work %}
