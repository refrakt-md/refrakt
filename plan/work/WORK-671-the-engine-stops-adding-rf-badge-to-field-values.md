{% work id="WORK-671" status="ready" priority="medium" complexity="moderate" source="ADR-043" tags="engine, theme, skeleton, lumina, metadata, vocabulary" milestone="v0.46.0" %}

# The engine stops adding rf-badge to field values

`CHIP_METATYPES` (`packages/transform/src/engine.ts`) gives `status`, `category` and `tag`
values the `rf-badge` class, so the engine decides that those values look like pills. Under
{% ref "ADR-043" /%} decision 3 the engine emits meaning, not shape: the pill comes from the base
stylesheet, keyed on `data-meta-type`, and a theme restyles it like any other rule.

## Acceptance Criteria

- [ ] The engine no longer adds `rf-badge` to field values; `CHIP_METATYPES` is removed
- [ ] Skeleton keys pill geometry on `[data-meta-type="status"]`, `"category"` and `"tag"`, and Lumina's skin follows, in the same change, so no value loses its pill
- [ ] `{% badge %}` keeps `rf-badge`, and the base rule covers it through its default `data-meta-type="tag"`
- [ ] Every page in the gallery renders its chips unchanged, light and dark
- [ ] Contracts are regenerated on both copies and the diff reviewed; the CSS coverage test passes
- [ ] SPEC-145 D28's open question on which values are chips gets a pointer to ADR-043

## References

- {% ref "ADR-043" /%}: decision 3.
- {% ref "SPEC-145" /%}: D28.

{% /work %}
