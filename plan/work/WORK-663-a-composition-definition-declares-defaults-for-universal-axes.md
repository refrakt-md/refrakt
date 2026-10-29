{% work id="WORK-663" status="done" priority="high" complexity="moderate" source="SPEC-145" tags="runes, composition, universals, defaults, density" milestone="v0.44.0" pr="refrakt-md/refrakt#732" %}

# A composition definition declares defaults for universal axes

A native rune states its chrome defaults in config (`defaultWidth`, `defaultElevation`,
`defaultDensity`). A composition has no way to, and `hero` needs `width: full`, which a template
cannot write because `width` stays on the root ({% ref "SPEC-145" /%} D34).

## Acceptance Criteria

- [x] A definition's frontmatter accepts `defaults`, naming universal axes; any other key, or a value the axis does not accept, is rejected at definition load, naming it
- [x] `density` is accepted as a default only (`full | compact | minimal`) and lands as `data-density` on the carrier
- [x] A default lands where the author's attribute would, by WORK-662's placements
- [x] The order author value > template literal > definition default is asserted for one root-placed axis (`width`) and one carrier-placed axis (`elevation`)
- [x] A literal the template writes on the carrier is replaced by the author's value at expansion
- [x] `inspect` shows a default's source, and `reference` documents the definition's defaults
- [x] The composed-runes guide documents `defaults`, including that a template cannot pin a universal axis against the author

## Approach

Root-placed defaults become the generated config's `defaultWidth`, `defaultSpacing` and
`defaultInset`. The rest are written onto their target tag at expansion when neither the author
nor a literal set them. The placed rune's schema has to admit `density` from a template, since
it is not an author attribute.

SPEC-177 adds site and theme layers above this one later. Nothing here should assume they exist.

## Blocked by

- {% ref "WORK-662" /%}

## References

- {% ref "SPEC-145" /%}: D34.
- {% ref "SPEC-177" /%}: D3's precedence, of which this is the definition's layer.
- {% ref "ADR-042" /%}: compact density as a composition default.

## Resolution

Completed: 2026-10-29

Branch: `claude/milestone-v0-44-0-ism7ni`

### What was done
- `composition.ts`: `defaults` frontmatter key, checked against `lib/universal-attribute-defs.ts` (the universal attribute definitions, moved out of `lib/index.ts`); `defaults-invalid` for a non-universal key, a value its axis rejects, or a default that lands nowhere.
- Root defaults → `defaultWidth` / `defaultSpacing` / `defaultInset` in the generated config (`RuneConfig` gains the latter two; the `spacing`/`inset` facets read them). Others are written on the target at expansion when neither the author nor a template literal set them.
- `density`: accepted from a template on every placed rune via `declareSlotMarkers`, carried to the rune root, read by the density facet; no rune's own schema offers it.
- `inspect` prints each default with its source and the literal that beats it; `reference` lists a composition's defaults.
- Tests in `composition-carrier.test.ts`; guide section "Defaults" and the error code.

### Notes
- Declaring `density` on every assembled schema means Markdoc validation does not flag an author writing it, though no authoring surface offers it.

{% /work %}
