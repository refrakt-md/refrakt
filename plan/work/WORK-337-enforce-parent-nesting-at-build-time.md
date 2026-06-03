{% work id="WORK-337" status="draft" priority="medium" complexity="moderate" source="SPEC-084" milestone="v0.19.0" tags="composability,engine,validation" %}

# Enforce parent nesting at build time

Turn `RuneConfig.parent` into a validated, self-declared `requiresParent`
constraint (SPEC-084). A child rune that declares it must live inside a given
parent, but appears outside it, surfaces a diagnostic instead of rendering
silently-broken output. Crucially this is **open-world**: only a rune that
self-declares a requirement is ever checked — the framework keeps no registry of
allowed children, so third-party runes on either side just work.

## Acceptance Criteria
- [ ] `RuneConfig` exposes a self-declared `requiresParent` (formalizing `parent`); there is **no** container-side `allowedParents`/`forbiddenParents`.
- [ ] The pipeline detects a rune that declares `requiresParent: X` appearing without an `X` ancestor and reports it with the rune name and location.
- [ ] Severity: warning by default; error for the structurally-meaningless set (accordion-item, tab, tab-panel, breadcrumb-item, juxtapose-panel, bento-cell, definition, step, tier, map-pin, itinerary-day, itinerary-stop).
- [ ] A rune that declares **no** constraint is never flagged (open composition is unrestricted).
- [ ] Tests cover: a valid nesting, an error case (strict child stranded), a warning case, a third-party-style child requiring a known parent, and an unconstrained rune nested freely (no diagnostic).

## Approach
The engine already threads `parentRune` through the recursive walk
(`packages/transform/src/engine.ts`), so the immediate-ancestor chain is
available. Either check during that walk or in a dedicated validation pass over
the transformed tree. The check is purely "does this rune's self-declared
required parent appear among its ancestors" — no cross-rune knowledge, no
allow-list. Default non-breaking; gate the strict set as errors.

## References
- `packages/transform/src/engine.ts` (parentRune propagation)
- `packages/content/src/pipeline.ts`
- Contract: {% ref "SPEC-084" /%}

{% /work %}
