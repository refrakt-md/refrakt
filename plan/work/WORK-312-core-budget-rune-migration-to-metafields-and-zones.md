{% work id="WORK-312" status="ready" priority="low" complexity="simple" source="SPEC-079" tags="core,runes,budget,migration,metafields,zones,phase-2" milestone="v0.18.0" %}

# Core Budget rune migration to metaFields + zones

Phase 2 of {% ref "SPEC-079" /%}. Migrates the core `{% budget %}`
rune (the only core rune using meta-projection — currency, duration
meta fields) from the legacy `slots + structure` config shape to the
new `metaFields + zones + contentSlots` model.

## Acceptance Criteria

- [ ] **`packages/runes/src/config.ts` Budget entry rewritten.**
  - **Budget**: currency, duration. Metadata zone projected via
    def-list (or chip-row, depending on how it reads with 1-2
    fields). `currency` keeps `metaType: 'category'`, `duration`
    keeps `metaType: 'temporal'` + `tag: 'time'`.
  - The `conditionAny: ['currency', 'duration']` wrapper that
    today's structure declares becomes implicit: the def-list
    layout naturally skips rendering rows for absent fields when
    each field carries its own `condition`.

- [ ] **`packages/lumina/styles/runes/budget.css` updated.**
  Selectors referencing `__header-primary` / `__header-secondary` /
  `__meta` rewritten if present.

- [ ] **BudgetCategory / BudgetLineItem untouched.** Container child
  runes without meta projection — stay on existing path.

- [ ] **Core tests updated.** Tests touching Budget output DOM
  reflect the new shape.

- [ ] **Backwards-compat shim warning silent for Budget.**

- [ ] **Docs.** `site/content/runes/budget.md` output-contract
  snippets updated where they reference the legacy class names.

## Approach

Tiny migration — one rune, two meta fields. Quick win. Lands on its
own branch or batched with another Phase 2 item.

## Dependencies

- {% ref "WORK-305" /%} — engine + layout primitives (done).
- {% ref "WORK-306" /%} — plan plugin migration reference (done).

## References

- {% ref "SPEC-079" /%} — the spec being implemented.

{% /work %}
