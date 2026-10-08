{% work id="WORK-627" status="ready" priority="medium" complexity="moderate" source="SPEC-153" milestone="v0.40.0" tags="packaging,plugins,testing,composition" %}

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

- [ ] A script packs a plugin with `npm pack`, installs the tarball into a temporary project outside the workspace, and loads it with `loadPlugin()`, failing with the plugin name and the cause
- [ ] The harness runs against at least `@refrakt-md/plan` and one plugin without an `exports` map, and both load
- [ ] Reverting WORK-626's `./package.json` export on `plan` makes the harness fail, demonstrated once and recorded in the resolution
- [ ] The harness runs in CI, or the reason it cannot (time, network) is recorded with where it does run

{% /work %}
