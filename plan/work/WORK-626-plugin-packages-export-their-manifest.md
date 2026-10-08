{% work id="WORK-626" status="ready" priority="medium" complexity="simple" source="SPEC-153" milestone="v0.40.0" tags="packaging,plugins,composition" %}

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

- [ ] `require.resolve('<pkg>/package.json')` succeeds for all nine plugins, asserted by a test that iterates the plugin list rather than naming two
- [ ] Every plugin declaring an `exports` map lists `./package.json` in it
- [ ] Every entry in each plugin's `files` exists on disk after a build, asserted by the same test
- [ ] `discoverPluginFixtures`' comment no longer attributes the failure to workspace links
- [ ] A changeset records the `exports` additions

{% /work %}
