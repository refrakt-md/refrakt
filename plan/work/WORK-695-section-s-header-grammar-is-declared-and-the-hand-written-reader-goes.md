{% work id="WORK-695" status="done" priority="medium" complexity="moderate" source="SPEC-186" tags="content-model, section, header, composition" milestone="v0.47.0" pr="refrakt-md/refrakt#760" %}

# Section's header grammar is declared, and the hand-written reader goes

SPEC-186 D5: `section`'s header is read from a declared `header` group (eyebrow, headline, blurb), and `sectionHeaderParts` and its header-role reader are removed.

## Acceptance Criteria
- [x] `section`'s content model declares its header as an optional group, and its transform reads the header from the resolved model
- [x] The `header` attribute's `headline` and `none` modes are conditional models
- [x] The media and footer zones split as before, through a delimited model
- [x] `sectionHeaderParts` and the reader registered in `schemaHeaderRoles` are removed; the composition audit reads the declared model
- [x] Every existing section, hero, cta and testimonial test passes unchanged

## Blocked by

- {% ref "WORK-692" /%}

## References

- {% ref "SPEC-186" /%}: D5.
- {% ref "ADR-046" /%}

## Resolution

Completed: 2026-11-03

Branch: `claude/milestone-v0-44-0-ism7ni`

### What was done
- `packages/runes/src/tags/section.ts`:
  - `sectionContentModel(attrs)`: a header group by mode, then body; delimited media/content/footer zones when split;
  - the transform reads the resolved model;
  - `sectionHeaderParts`, `SectionHeaderParts` and `sectionZones` are removed.
- `packages/runes/src/lib/header-roles.ts`:
  - `HeaderRoleHost` holds `{ roles, model }`;
  - `readHeaderRoles` resolves the declared model, searching zones one level down;
  - `auditSlotHeaderRoles` uses it.
- `section` registers `{ roles: eyebrow/headline/blurb, model: sectionContentModel }`.
- `packages/runes/test/section-declared-model.test.ts`.

### Notes
- Output unchanged: section, hero, cta and testimonial tests, the SEO baseline and contracts are untouched, and validate is clean on every site.
- Behaviour change only in theory: a split with 4+ `---` zones now reports the extras as `content-unmatched` instead of folding them into the body. None exist.

{% /work %}
