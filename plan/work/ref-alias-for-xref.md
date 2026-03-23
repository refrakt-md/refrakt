{% work id="WORK-026" status="ready" priority="medium" complexity="trivial" tags="runes, core" %}

# Add `ref` as Alias for `xref`

> Ref: SPEC-021 (Plan Runes)

## Summary

SPEC-021 uses `{% ref "SPEC-008" /%}` syntax for cross-references. The codebase has `{% xref %}`. Add `ref` as an alias for `xref` so both syntaxes work. This keeps the plan spec examples valid and provides a shorter, more natural syntax for inline references.

## Acceptance Criteria

- [ ] `{% ref "SPEC-008" /%}` produces identical output to `{% xref "SPEC-008" /%}`
- [ ] `ref` registered as alias in the xref tag schema (`packages/runes/src/tags/xref.ts`)
- [ ] All xref attributes work with the `ref` alias (label, type)
- [ ] Test verifying alias produces same output

## Approach

Add `ref` to the xref tag's `aliases` array in the Markdoc schema definition. No changes to the transform logic needed — Markdoc handles alias resolution automatically.

{% /work %}
