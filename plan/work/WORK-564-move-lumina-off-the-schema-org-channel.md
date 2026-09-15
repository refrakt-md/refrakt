{% work id="WORK-564" status="ready" priority="medium" complexity="simple" source="BUG-015" tags="lumina,css,schema-org,seo" milestone="v0.35.0" %}

# Move Lumina off the schema.org channel

Six Lumina rules select on RDFa `property=` attributes. Four of them already
match nothing. Move all six to the BEM element classes that exist for the same
nodes, and add the assertion that keeps presentation off this channel.

Half of this is a bug fix ({% ref "BUG-015" /%}) regardless of whether anything
else in the milestone ships. The other half is removing a tripwire that
{% ref "WORK-565" /%} onward would otherwise be walking across.

## The six

| Selector | State | Why |
|----------|-------|-----|
| `pricing.css:65` — `.rf-tier h1[property="name"]` | **live** | `nameTag` is in both `refs` and `schema` |
| `plot.css:2` — `.rf-plot > span[property="name"]` | **live** | `titleTag` is in both |
| `pricing.css:71` — `.rf-tier p[property="price"]` | dead | `property="price"` lands on `parsedPriceMeta`, a `<meta>` — not on the `<p>` |
| `lore.css:14` — `.rf-lore > span[property="title"]` | dead | the span carries `property="headline"` |
| `bond.css:6` — `.rf-bond > span[property="from"]` | dead | `bond` has no `schema:` map at all |
| `bond.css:7` — `.rf-bond > span[property="to"]` | dead | as above |

None of the four dead rules has a BEM equivalent elsewhere in its stylesheet, so
a `lore` title, a `bond` endpoint and a `tier` price render **unstyled today**.

The CSS coverage test does not catch this: it checks that config-derived
selectors *exist*, not that hand-written ones *match*.

## Acceptance Criteria

- [ ] No stylesheet in `packages/lumina/styles/` or `plugins/*/styles/` selects on `property=`
- [ ] Each of the six rules is expressed against the rune's BEM element class instead, and the four dead ones are verified to now apply — a screenshot or a rendered-HTML assertion, not an assumption
- [ ] A CSS coverage assertion fails if a `property=` selector is reintroduced anywhere
- [ ] `lore`'s title, `bond`'s endpoints and `tier`'s price are styled after this lands, having been unstyled before
- [ ] {% ref "BUG-015" /%} is resolved, with the four dead rules recorded as the visual change they are
- [ ] Any visual diff is deliberate: a rule that was dead and now applies changes the rendering, and the item says what changed rather than treating it as a no-op

## Approach

**The four dead rules are the interesting half.** Restoring them is a visual
change to three runes, not a refactor, and it should be reviewed as such —
someone has been looking at unstyled `bond` endpoints for long enough that the
styled version may read as a regression.

The rule this establishes: **presentation never selects on the schema.org
channel.** The refs already produce BEM element classes for every one of these
nodes (`.rf-tier__name`, `.rf-lore__title`), which is what the CSS should have
used from the start.

The coupling matters beyond tidiness, and it is the same argument
{% ref "ADR-028" /%} makes pointed the other way. A theme may not redefine a
rune's schema.org output because emission is a claim about content, not about
skin. A theme that *styles off* emission makes the rune's appearance depend on
its SEO channel — so a correction to the structured data becomes a visual
regression. Every rename in {% ref "WORK-565" /%}'s tables would be one.

`schema="none"` is the sharpest case: `stripSchemaOrg` deletes `property`
wholesale, so on `pricing` it would unstyle the tier heading. It is benign on
`accordion` by luck rather than design, and {% ref "WORK-552" /%} has already
shipped.

## Blocks

- {% ref "WORK-565" /%}

## References

- {% ref "BUG-015" /%} — the defect, with each selector verified against `refrakt inspect`
- {% ref "SPEC-130" /%} — "Constraint: styling already selects on this channel"
- {% ref "ADR-028" /%} — emission is not theme configuration
- {% ref "WORK-552" /%} — `schema="none"`, shipped

{% /work %}
