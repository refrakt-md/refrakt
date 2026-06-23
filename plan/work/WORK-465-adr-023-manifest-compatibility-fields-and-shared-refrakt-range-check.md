{% work id="WORK-465" status="ready" priority="high" complexity="moderate" source="ADR-023" tags="distribution,versioning,types,manifest" milestone="v0.25.0" %}

# ADR-023 manifest compatibility fields and shared refrakt-range check

{% ref "ADR-023" /%} requires every distributable manifest to declare a `refrakt`
compatibility range and to depend on `@refrakt-md/*` via `peerDependencies`. Today no
manifest type carries a `refrakt` field and there is no shared range-checker. This is the
foundational type + util work the install path and the scaffolds both build on, so it lands
first.

## Acceptance Criteria
- [ ] `ThemeManifest`, the `template.json` type, and the `presets.json` type each carry an optional `refrakt` SemVer-range field
- [ ] A shared `checkRefraktCompat(range, projectVersion)` utility returns ok / mismatch with a human message (e.g. "needs refrakt ≥0.25, project has 0.24")
- [ ] The utility lives where both the CLI install path and the scaffolds can import it — no per-artifact duplication
- [ ] A missing range is treated as "universal / no constraint", not a failure
- [ ] Unit tests cover satisfied, unsatisfied, missing, and malformed-range cases

## Approach
Add the field to the manifest interfaces in `packages/types/src/theme.ts` (and the new
template/preset manifest types). Implement a small, pure semver-range check, reusing an
existing semver dependency if one is already in the tree. Keep it dependency-free of the CLI
so scaffolds and install both consume it.

## References
- {% ref "ADR-023" /%} — versioning & compatibility for distributed extensions
- `packages/types/src/theme.ts` (`ThemeManifest`)
- `packages/cli/src/commands/theme.ts` (install validation consumer)

{% /work %}
