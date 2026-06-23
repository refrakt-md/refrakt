{% work id="WORK-459" status="ready" priority="medium" complexity="moderate" source="SPEC-111" tags="presets,scope,validation" milestone="v0.25.0" %}

# Preset scope and tunedFor metadata with pack-manifest validation

{% ref "SPEC-111" /%} §2,§3,§4 — make `scope` a validated property, record advisory
`tunedFor`, and validate the pack manifest (module resolvability + scope-vs-actual-tokens +
`tunedFor` well-formedness).

## Acceptance Criteria
- [ ] Each preset declares `scope` (`syntax` | `palette`) in the manifest entry; a declared `syntax` preset that sets chrome tokens is a validation warning (reusing `filterScopeEligible`)
- [ ] `tunedFor` (preset → themes) is advisory; absence means universal; applying a preset outside its set is never an error
- [ ] Pack-manifest validation checks each `module` resolves, scope-vs-actual-tokens agreement, and `tunedFor` well-formedness
- [ ] Validation folds into the existing config/theme validation surface (and the scaffold's `manifest-validate`)

## Approach
Reuse the engine's existing `filterScopeEligible` classification
(`packages/transform/src/token-stylesheet.ts`) to compare a preset's actual token namespaces
against its declared scope. Wire the checks into the shared validation surface.

## Dependencies
- {% ref "WORK-456" /%} — the pack format / manifest
- {% ref "WORK-457" /%} — loading a preset to inspect its tokens

## References
- {% ref "SPEC-111" /%} §2, §3, §4; `packages/transform/src/token-stylesheet.ts` (`filterScopeEligible`)

{% /work %}
