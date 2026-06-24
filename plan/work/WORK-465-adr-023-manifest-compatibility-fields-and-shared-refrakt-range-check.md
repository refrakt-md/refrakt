{% work id="WORK-465" status="done" priority="high" complexity="moderate" source="ADR-023" tags="distribution,versioning,types,manifest" milestone="v0.25.0" %}

# ADR-023 manifest compatibility fields and shared refrakt-range check

{% ref "ADR-023" /%} requires every distributable manifest to declare a `refrakt`
compatibility range and to depend on `@refrakt-md/*` via `peerDependencies`. Today no
manifest type carries a `refrakt` field and there is no shared range-checker. This is the
foundational type + util work the install path and the scaffolds both build on, so it lands
first.

## Acceptance Criteria
- [x] `ThemeManifest`, the `template.json` type, and the `presets.json` type each carry an optional `refrakt` SemVer-range field
- [x] A shared `checkRefraktCompat(range, projectVersion)` utility returns ok / mismatch with a human message (e.g. "needs refrakt ≥0.25, project has 0.24")
- [x] The utility lives where both the CLI install path and the scaffolds can import it — no per-artifact duplication
- [x] A missing range is treated as "universal / no constraint", not a failure
- [x] Unit tests cover satisfied, unsatisfied, missing, and malformed-range cases

## Approach
Add the field to the manifest interfaces in `packages/types/src/theme.ts` (and the new
template/preset manifest types). Implement a small, pure semver-range check, reusing an
existing semver dependency if one is already in the tree. Keep it dependency-free of the CLI
so scaffolds and install both consume it.

## References
- {% ref "ADR-023" /%} — versioning & compatibility for distributed extensions
- `packages/types/src/theme.ts` (`ThemeManifest`)
- `packages/cli/src/commands/theme.ts` (install validation consumer)

## Resolution

Completed: 2026-06-23

Branch: `claude/v0.25.0-impl`

### What was done
- `packages/types/src/compat.ts` — dependency-free `checkRefraktCompat(range, version)` + `satisfiesRange` + `parseVersion`. Supports the comparator-set range grammar the scaffold emits (`>=0.25 <0.26`); missing range = universal; malformed range reported distinctly so callers can downgrade to a warning.
- `packages/types/src/distribution.ts` — `TemplateManifest` (template.json, `site` is a `SiteConfig` partial omitting `contentDir`/`sandbox`), `PresetPackManifest`/`PresetEntry`/`PresetScope` (presets.json), each carrying an optional `refrakt` range.
- `ThemeManifest.refrakt?` added; `target` documented as deprecated/optional per ADR-024.
- Exported all from the types index; `packages/types/test/compat.test.ts` (9 tests, passing).

### Notes
- Kept the checker in `@refrakt-md/types` (no new dependency) so both the CLI install path and create-refrakt import one implementation. Hand-rolled a minimal range parser rather than pulling in semver, since the only ranges in play are the scaffold's `>=MAJOR.MINOR <MAJOR.(MINOR+1)` form.

{% /work %}
