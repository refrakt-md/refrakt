{% work id="WORK-337" status="done" priority="medium" complexity="moderate" source="SPEC-084" milestone="v0.19.0" tags="composability,engine,validation" %}

# Enforce parent nesting at build time

Turn `RuneConfig.parent` into a validated, self-declared `requiresParent`
constraint (SPEC-084). A child rune that declares it must live inside a given
parent, but appears outside it, surfaces a diagnostic instead of rendering
silently-broken output. Crucially this is **open-world**: only a rune that
self-declares a requirement is ever checked — the framework keeps no registry of
allowed children, so third-party runes on either side just work.

## Acceptance Criteria
- [x] `RuneConfig` exposes a self-declared `requiresParent` (formalizing `parent`); there is **no** container-side `allowedParents`/`forbiddenParents`.
- [x] The pipeline detects a rune that declares `requiresParent: X` appearing without an `X` ancestor and reports it with the rune name and location.
- [x] Severity: warning by default; error for the structurally-meaningless set (accordion-item, tab, tab-panel, breadcrumb-item, juxtapose-panel, bento-cell, definition, step, tier, map-pin, itinerary-day, itinerary-stop).
- [x] A rune that declares **no** constraint is never flagged (open composition is unrestricted).
- [x] Tests cover: a valid nesting, an error case (strict child stranded), a warning case, a third-party-style child requiring a known parent, and an unconstrained rune nested freely (no diagnostic).

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

## Resolution

Completed: 2026-06-05

Branch: `claude/v0.19-composability`

### What was done
- Added a self-declared **`requiresParent?: string`** to `RuneConfig` (distinct from the looser, advisory `parent` — which is overloaded: some runes like `track` declare a typical `parent` yet are valid standalone, so it can't be blanket-validated). No container-side `allowedParents`/`forbiddenParents` exist.
- The engine (`transformRune`) validates it where `parentRune` (the nearest ancestor rune) is already threaded: a rune that opts in via `requiresParent` and whose nearest ancestor rune isn't the required one is reported via `warnRequiresParent`, deduped per (rune, actual-parent), matching the existing engine-warning pattern (`warnLayoutCycle`).
- **Severity:** `console.error` for the structurally-meaningless set (`STRUCTURAL_CHILDREN` = accordion-item, tab, tab-panel, breadcrumb-item, juxtapose-panel, bento-cell, definition, step, tier, map-pin, itinerary-day, itinerary-stop); `console.warn` otherwise.
- Set `requiresParent` on those 12 strict children (13 entries incl. FeaturedTier) across core/marketing/places configs.
- `packages/transform/test/requires-parent.test.ts` — 5 scenarios: valid nesting, a stranded structural child (error), a stranded soft child (warning), a third-party-style child requiring a known parent (works), and an unconstrained rune (never flagged).

### Notes
- Validation runs at transform/build time in the engine (where the ancestor-rune context lives), reporting the rune + its actual parent context. Threading the page URL through for a richer "location" is a possible follow-up (the engine isn't URL-aware today).
- Opt-in by design → zero false positives on existing content; full suite green (3070). The contract generator doesn't emit `requiresParent` (validation-only), so no contract drift.

{% /work %}
