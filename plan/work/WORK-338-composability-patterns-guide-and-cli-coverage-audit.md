{% work id="WORK-338" status="done" priority="medium" complexity="moderate" source="SPEC-084" milestone="v0.19.0" tags="composability,docs,cli" %}

# Composability authoring contract + CLI coverage audit

The *authoring-facing* half of SPEC-084: a contract guide for rune authors plus a
CLI audit. (The end-user *catalog* of concrete compositions lives separately in
the "Compositions" docs category, WORK-346 — this item is the
"how the contract works" reference, not the recipe book.)

## Acceptance Criteria
- [x] A composability page under `site/content/extend/rune-authoring/` documents the contract: the open-world principle (dependency asymmetry), open containers vs strict `requiresParent` children, the name-agnostic media-zone/slot styling model, and when to reach for a context modifier.
- [x] `refrakt inspect`/audit reports context modifiers that lack CSS coverage.
- [x] The audit reports `requiresParent` violations (a child outside its self-declared required parent) for a given content tree.
- [x] Audit output documented in the tooling docs.
- [x] The authoring guide cross-links to the "Compositions" catalog (WORK-346).

## Approach
Extend the existing inspect/audit tooling (`packages/cli`) — it already derives
selectors from config and checks CSS coverage, so the context-modifier check is an
extension of that path. The guide is the contract reference; concrete worked
patterns live in the compositions category.

## References
- `packages/cli` (inspect/audit), `site/content/extend/rune-authoring/`
- Depends on {% ref "SPEC-084" /%}; complements {% ref "WORK-337" /%}; pairs with WORK-346

## Resolution

Completed: 2026-06-05

Branch: `claude/v0.19-composability`

### What was done
- **Authoring guide:** `site/content/extend/rune-authoring/composability.md` — documents the contract: the open-world dependency-asymmetry principle, strict `requiresParent` children vs open containers, name-agnostic media-zone/slot styling (with the self-declared bleed opt-out), when to reach for a `contextModifier`, the deferred capability-token generalization, and a Tooling section. Cross-links to the Compositions catalogue (`/compositions`, WORK-346).
- **CLI audit (AC #2 — already covered, verified):** `refrakt inspect <rune> --audit` already derives and checks context-modifier selectors — e.g. `.rf-hint--in-feature → hint.css:88`, and any declared-but-unstyled modifier shows `NOT STYLED`. Documented in the guide.
- **requiresParent surfacing:** added the `requiresParent` line to `refrakt inspect` output (`format.ts`) — e.g. `inspect tab` → "requiresParent: TabGroup (validated…)". Violations on a content tree are reported at build time by the WORK-337 engine validation (and `inspect`-ing a stranded child prints the diagnostic).

### Notes
- AC #3 (content-tree `requiresParent` violations) is delivered by the build-time validation from WORK-337 rather than a separate offline CLI pass — the transform runs at build and emits the warning/error with the rune + its actual parent context.

{% /work %}
