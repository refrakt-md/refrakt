{% work id="WORK-462" status="done" priority="low" complexity="simple" source="SPEC-110" tags="cli,theme,listing" milestone="v0.25.0" %}

# refrakt theme list command

{% ref "SPEC-110" /%} §5 — add `theme list` to round out `theme info`.

## Acceptance Criteria
- [x] `refrakt theme list` reports installed themes (discoverable from `node_modules`) and marks the active one
- [x] Output notes the detected features per theme (`transform`, a framework layer if present, rune CSS) — consistent with the framework-aware view ({% ref "ADR-024" /%})
- [x] Works in single- and multi-site projects

## Approach
Mirror `themeInfoCommand` in `packages/cli/src/commands/theme.ts`, scanning `node_modules`
for packages exporting `./transform`.

## References
- {% ref "SPEC-110" /%} §5; `packages/cli/src/commands/theme.ts`

## Resolution

Completed: 2026-06-23

Branch: `claude/v0.25.0-impl`

### What was done
- `themeListCommand` in `theme.ts` + `theme list` wiring in `bin.ts`. Scans `node_modules` (descending one scope level) for packages exporting `./transform`, marks the active theme(s) across all sites, and annotates each with its framework layer (`[svelte]` / `[framework-agnostic]`) per ADR-024.

{% /work %}
