{% work id="WORK-653" status="done" priority="medium" complexity="moderate" source="SPEC-160,SPEC-147" tags="runes, composition, storytelling, section" milestone="v0.43.0" pr="refrakt-md/refrakt#723" %}

# The storytelling compositions place section instead of card

The composed `character`, `realm` and `faction` place `{% card %}`, because it was the only
primitive with a media split. Once `section` has the split, they move to it
({% ref "SPEC-160" /%} D4). The expected differences are listed in D4: `rf-section__*` element
classes, a real `<header>` for title and description, no surface, and the portrait regaining
`data-media="portrait"`.

## Acceptance Criteria

- [x] `character`, `realm` and `faction` place `{% section %}` with `media-position` passed through, and `character` passes `media="portrait"`
- [x] The composed `character` declares a `media-position` attribute with `default: top` (today it writes a bare `{% card %}` and declares none), so its output position matches the card default it had
- [x] The three compositions raise no slot-role warning ({% ref "WORK-659" /%}) on `section`, asserted in a test
- [x] The composed `character` renders its portrait with `data-media="portrait"` again
- [x] The JSON-LD, RDFa and registry comparisons against the plugin are re-run, not re-recorded, and any movement is explained in the resolution
- [x] The recorded rendered-tree differences in the composed-storytelling tests are updated, each change explained
- [x] `plugins/storytelling/` is unchanged and still passing its own tests (SPEC-147 D1)

## Blocked by

- {% ref "WORK-652" /%}
- {% ref "WORK-659" /%}: `section`'s anchored header grammar, so the comparisons are taken against it
- {% ref "WORK-650" /%}: so the comparisons are re-run once, without the dead `content-section` difference

## References

- {% ref "SPEC-160" /%}: D4.
- {% ref "SPEC-147" /%}: D1, D2.

## Resolution

Completed: 2026-10-26

Branch: `claude/v0-43-0-review-ny4nl1`

### What was done
- `packages/content/test/fixtures/composed-storytelling/runes/{character,realm,faction}.md` place `{% section %}`.
  - `realm` and `faction` forward the split attributes they already declared.
  - `character` declares `media-position` (`top | bottom | start | end`, default `top`) and passes `media="portrait"`.
- `composed-character.test.ts`, `composed-realm-faction.test.ts` and the realm/faction snapshot are updated, each changed assertion commented.
- `packages/content/test/composed-section-roles.test.ts` (new): no `slot-header-role` on any fixture of the three, plus a control without the metablock that gets the expected blurb finding.

### Comparisons, re-run not re-recorded
- JSON-LD against the SEO baseline at both harvest points, the `mediatext` comparison's graph, and the storytelling registry snapshot (registrations, name index, types, warnings, and the cross-links lost inside nested runes): all unchanged.

### Rendered-tree differences, each as SPEC-160 D4 predicts
- Element classes `rf-card__*` → `rf-section__*`.
- The name is `section`'s headline (`<h1 data-name="headline">`) in a real `<header>`, where inside `card` it was `rf-card__title` in the body. The metablock after it keeps the description out of the blurb role.
- No `card` surface.
- The composed `character`'s portrait is `data-media="portrait"` again.

### Notes
- Two differences D4 did not list:
  - `section`'s `align` default adds `rf-section--start` and `data-align="start"`;
  - the composed `character` root now carries `data-media-position="top"`, as `realm` and `faction` already did. Its new enum attribute becomes a modifier of the generated config (D2a).
- `plugins/storytelling/` is untouched.

{% /work %}
