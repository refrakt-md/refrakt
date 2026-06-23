{% work id="WORK-462" status="ready" priority="low" complexity="simple" source="SPEC-110" tags="cli,theme,listing" milestone="v0.25.0" %}

# refrakt theme list command

{% ref "SPEC-110" /%} §5 — add `theme list` to round out `theme info`.

## Acceptance Criteria
- [ ] `refrakt theme list` reports installed themes (discoverable from `node_modules`) and marks the active one
- [ ] Output notes the detected features per theme (`transform`, a framework layer if present, rune CSS) — consistent with the framework-aware view ({% ref "ADR-024" /%})
- [ ] Works in single- and multi-site projects

## Approach
Mirror `themeInfoCommand` in `packages/cli/src/commands/theme.ts`, scanning `node_modules`
for packages exporting `./transform`.

## References
- {% ref "SPEC-110" /%} §5; `packages/cli/src/commands/theme.ts`

{% /work %}
