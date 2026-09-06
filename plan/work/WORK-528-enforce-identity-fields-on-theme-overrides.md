{% work id="WORK-528" status="ready" priority="high" complexity="simple" source="SPEC-125" tags="transform,config,theme,validation" milestone="v0.31.0" %}

# Enforce identity fields on theme overrides

`packages/transform/src/validate.ts` already declares
`IDENTITY_FIELDS = ['block', 'modifiers', 'sections', 'variants']` and enforces it
against {% ref "SPEC-091" /%} variant deltas — "a delta restructures a rune, never
redefines it". The theme-override path does not: `mergeRuneConfig` shallow-merges
`{ ...base, ...override }` with no field restrictions, so a theme can write
`runes: { Card: { sections: {} } }` and silently disable `reading` on every card
in a site.

One position, applied to one of two merge paths. This closes the other.

## Why it goes first

It depends on nothing, and it is the guarantee everything else in
{% ref "SPEC-125" /%} rests on. Once schemas narrow ({% ref "WORK-534" /%}), the
schema-time value must be authoritative — an unguarded override would let config
and schema diverge, which is the divergence the spec exists to close.

Expected to be a **no-op in practice**: Lumina overrides none of these fields.
That makes it cheap to land alone, ahead of the ~50-file work that follows.

## Acceptance Criteria

- [ ] `block`, `modifiers` and `sections` are non-overridable on the theme
      override path, not only on variant deltas
- [ ] The rule is expressed once and shared between both paths rather than
      duplicated
- [ ] A violating override is reported with the same clarity as the variant-delta
      case — it names the field and the rune
- [ ] Tests cover both paths, including that a *permitted* field (`layout`,
      `structure`, `styles`, `contentWrapper`, `staticModifiers`, `autoLabel`,
      `editHints`, `projection`) still merges
- [ ] Confirmed no-op against the shipped configs: Lumina and all nine plugins
      build with no new diagnostics
- [ ] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

## Approach

`frameTarget` is deliberately **not** added to the guarded set here. It is moving
into tag modules in {% ref "WORK-533" /%}, and guarding a field in the same
release that relocates it invites a confusing intermediate state. Add it there,
or drop it if the move makes the guard redundant for that field.

## References

- {% ref "SPEC-125" /%} — Phase 2
- {% ref "ADR-028" /%} — the governing decision
- {% ref "SPEC-091" /%} — where `IDENTITY_FIELDS` comes from

{% /work %}
