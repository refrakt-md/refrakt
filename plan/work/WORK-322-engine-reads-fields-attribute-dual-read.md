{% work id="WORK-322" status="done" priority="high" complexity="moderate" source="SPEC-082" tags="engine,transform,data-channel,fields" milestone="v0.18.0" %}

# Engine reads the `fields` attribute (dual-read)

Step 2 of {% ref "SPEC-082" /%}. The engine resolves `modifierValues` /
`metaFields` from the parsed `data-rune-fields` first, falling back to the legacy
`<meta data-field>` children when a key is absent. Parse the reserved attribute
once per node. With both channels carrying the same data (after
{% ref "WORK-321" /%}), output is unchanged.

## Acceptance Criteria

- [x] The engine parses `data-rune-fields` once into a typed object before
  modifier / metaField resolution.
- [x] `modifierValues` is populated from `fields` (preferred) then legacy metas
  (fallback). Present-but-empty values are handled correctly — no `if (value)`
  collapse (the `renderWhenEmpty` case resolves from `key in fields`).
- [x] Typed values are consumed without re-parsing (numbers / booleans / arrays
  arrive typed).
- [x] No output change with both channels present; full suite + contracts green.
- [x] Test: a node carrying only `data-rune-fields` (no legacy metas) resolves
  identically to one carrying only the legacy metas.

## Dependencies

- {% ref "WORK-321" /%} — the `fields` attribute must be emitted first.

## References

- {% ref "SPEC-082" /%} — typed node data channel.

## Resolution

Completed: 2026-06-02

Branch: claude/rune-contract-hardening

### What was done
- Engine (packages/transform/src/engine.ts): parse `data-rune-fields` once per node (`parseFields`), and resolve each `source: 'meta'` modifier via a new `readField` helper that prefers the parsed bag and falls back to `readMeta` (the legacy `<meta data-field>` child) when a key is absent or non-scalar.
- A scalar in the bag equals the legacy meta's `content` (WORK-321 copied it verbatim), so resolution is byte-identical; present-but-empty (`''`) flows through the existing `else if (value === '')` path; typed values (number/boolean) are returned as-is, matching pre-existing readMeta runtime behavior.
- The tint/bg/sentinel `readMeta` calls are a separate channel (not modifiers, not in the bag) and are intentionally left on the legacy path.

### Verification
- New engine-blocks tests: a modifier read from `data-rune-fields` resolves identically to one read from the legacy meta (same `data-hint-type` + `rf-hint--warning`); fields wins when both present; default applies when neither. The internal attribute is stripped from output.
- Full suite green (3057 passing). The heavy `plan-site-dogfood-real` test flaked once under parallel load (reproducible flake — passes in isolation, unrelated to this change); worth a follow-up to stabilize.

### Notes
- Output-neutral: both channels still present (dual-emit) and the legacy metas are still consumed/stripped; only the *source* of modifierValues changed (fields preferred). WORK-323 drops the legacy metas + the kebab/strip/leak machinery.

{% /work %}
