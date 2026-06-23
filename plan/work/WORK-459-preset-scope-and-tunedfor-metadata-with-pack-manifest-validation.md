{% work id="WORK-459" status="done" priority="medium" complexity="moderate" source="SPEC-111" tags="presets,scope,validation" milestone="v0.25.0" %}

# Preset scope and tunedFor metadata with pack-manifest validation

{% ref "SPEC-111" /%} §2,§3,§4 — make `scope` a validated property, record advisory
`tunedFor`, and validate the pack manifest (module resolvability + scope-vs-actual-tokens +
`tunedFor` well-formedness).

## Acceptance Criteria
- [x] Each preset declares `scope` (`syntax` | `palette`) in the manifest entry; a declared `syntax` preset that sets chrome tokens is a validation warning (reusing `filterScopeEligible`)
- [x] `tunedFor` (preset → themes) is advisory; absence means universal; applying a preset outside its set is never an error
- [x] Pack-manifest validation checks each `module` resolves, scope-vs-actual-tokens agreement, and `tunedFor` well-formedness
- [x] Validation folds into the existing config/theme validation surface (and the scaffold's `manifest-validate`)

## Approach
Reuse the engine's existing `filterScopeEligible` classification
(`packages/transform/src/token-stylesheet.ts`) to compare a preset's actual token namespaces
against its declared scope. Wire the checks into the shared validation surface.

## Dependencies
- {% ref "WORK-456" /%} — the pack format / manifest
- {% ref "WORK-457" /%} — loading a preset to inspect its tokens

## References
- {% ref "SPEC-111" /%} §2, §3, §4; `packages/transform/src/token-stylesheet.ts` (`filterScopeEligible`)

## Resolution

Completed: 2026-06-23

Branch: `claude/v0.25.0-impl`

### What was done
- `presetChromeKeys()` + `validatePresetEntry()` in `install.ts`: a `syntax`-scoped preset that sets any `color.*` (other than `code`) — top-level or under `modes.*.color` — warns "really a palette preset"; invalid scope errors; malformed `tunedFor` warns. Unit-tested (4 cases).
- `theme presets validate` (`presets.ts`) checks module resolvability + (for JSON-carrier presets) scope-vs-actual-tokens + `tunedFor` well-formedness; JS/TS carriers are checked for resolvability (token check skipped pending build). Verified: all 9 Lumina presets validate clean; a synthetic mis-scoped preset is flagged.

### Notes
- `filterScopeEligible` is private and tint-projection-oriented; I implemented the equivalent syntax-vs-chrome split (syntax + `color.code` allowed; other `color.*` = chrome) rather than exporting it. Applying outside `tunedFor` is never an error — only `list` flags it advisorily.

{% /work %}
