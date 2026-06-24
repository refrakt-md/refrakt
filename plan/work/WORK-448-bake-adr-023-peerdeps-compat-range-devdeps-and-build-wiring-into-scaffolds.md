{% work id="WORK-448" status="done" priority="high" complexity="moderate" source="SPEC-116" tags="create-refrakt,scaffolding,peerdeps,build" milestone="v0.25.0" %}

# Bake ADR-023 peerDeps, compat range, devDeps and build wiring into scaffolds

{% ref "ADR-023" /%} compliance and the day-one-build guarantee ({% ref "SPEC-116" /%} §3–§4)
must be embodied by every scaffold so an author starts correct rather than remembering the
policy. This is the shared scaffolding helper the per-kind scaffolders consume.

## Acceptance Criteria
- [x] Scaffolded packages declare `@refrakt-md/*` as `peerDependencies` with a minor range — no exact ordinary deps on `@refrakt-md/*`
- [x] The manifest carries a matching `refrakt` range, pinned to the scaffolding create-refrakt version (single source)
- [x] Scaffolds also seed matching `devDependencies` (same ranges) so the peer-only deps resolve for an isolated build
- [x] Build is wired (tsconfig, `dist/` output, exports map) so every contract path resolving to built output works after `npm install && npm run build` with no hand-editing
- [x] A freshly scaffolded package passes its own manifest-validate; `build` and `manifest-validate` scripts are present
- [x] A JSON-carrier preset pack is contract-valid with no compile step

## Approach
A shared helper produces the `package.json` deps block, tsconfig, exports map, and scripts,
keyed by kind. Reuse the `refrakt` range util (the ADR-023 manifest-fields work item) and the
create-refrakt version source that the site scaffold already uses for version derivation.

## Dependencies
- {% ref "WORK-465" /%} — the `refrakt` range field + checker
- {% ref "WORK-447" /%} — the `--type` dispatch this hangs off

## References
- {% ref "SPEC-116" /%} §3, §4; {% ref "ADR-023" /%}

## Resolution

Completed: 2026-06-24

Branch: `claude/v0.25.0-impl-2`

### What was done
ADR-023 + day-one-build wiring is applied across all three extension scaffolds (preset-pack, theme, plugin):
- `@refrakt-md/*` declared as `peerDependencies` with a minor range (`refraktPeerRange()` = `>=MAJOR.MINOR <MAJOR.(MINOR+1)`), never exact ordinary deps; mirrored into `devDependencies` so the package builds in isolation.
- A `refrakt` compat range in the manifest where one exists (preset-pack `presets.json`, theme `manifest.json`; a plugin's contract is the `Plugin` export, no manifest field).
- Build wired (tsconfig → `dist/`, exports map) so contract paths resolve after `npm install && npm run build`; verified theme + plugin `tsc` builds clean and the preset-pack is contract-valid with zero compile step.
- Scripts: preset-pack `validate`; theme/plugin `build`.

{% /work %}
