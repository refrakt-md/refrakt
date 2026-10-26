{% work id="WORK-654" status="ready" priority="medium" complexity="moderate" source="SPEC-160,SPEC-169" tags="runes, primitives, marketing, lumina, skeleton, composition" milestone="v0.43.0" %}

# An actions primitive, used by hero and cta

Buttons are a convention, not a primitive. `hero` and `cta` render links through `linkItem`,
and the CSS that makes them buttons is copied into both runes in both packages:

- **Skeleton** (`packages/skeleton/styles/runes/{hero,cta}.css`) has the layout: the flex row,
  `data-align` mapped to `justify-content` and auto margins, `inline-flex` links, and the
  full-width stack below 640px.
- **Lumina** (`packages/lumina/styles/runes/{hero,cta}.css`) has the look. The first link is the
  primary fill and the rest are outlined, chosen by `li:first-child a`, with hover states and the
  row `gap`.

No other rune can get buttons without copying all four files. `{% actions %}` makes it a core
rune ({% ref "SPEC-160" /%} D6).

## Acceptance Criteria

- [ ] `{% actions %}` is a core rune that takes a list of links, and optionally fences, and renders each link item as `<li data-name="action">` with `data-rank="primary"` on the first link of the whole region and `secondary` on the rest; fences are not ranked
- [ ] A fence renders as a `command` block, as in `hero` today
- [ ] `hero` and `cta` emit their actions region as a nested `data-rune="actions"` that keeps `data-name="actions"`, so `rf-hero__actions` and `rf-cta__actions` survive beside `rf-actions`
- [ ] Both packages get `styles/runes/actions.css`, keyed on `.rf-actions` and `[data-rank]`, not list position: skeleton takes the row, alignment and mobile stack, Lumina the button look. The `ul` / `li a` / `nav a` button rules are deleted from `hero.css` and `cta.css` in both packages
- [ ] Button size is read from custom properties (for example `--action-padding` and `--action-font-size`) that `hero.css` and `cta.css` each set in one rule, so hero keeps `0.7rem 1.75rem` at `--rf-text` and cta keeps `0.625rem 1.5rem` at `--rf-text-sm`
- [ ] The primary action's text colour comes from a token that follows the colour scheme instead of hard-coded `white`, and the `.rf-hero--cover li:first-child a` override is deleted; `--rf-color-on-accent`, which the override references and no Lumina token file defines, is either defined or not used
- [ ] `hero` and `cta`, still plugin runes, look unchanged in the gallery, in light and dark, including a cover hero
- [ ] A composed `hero` fixture over `section` with a delimited content model renders its media and content zones and wraps its actions list in `{% actions %}` (the fixture {% ref "SPEC-169" /%} D1 specifies)
- [ ] The CSS coverage test passes, and contracts are regenerated on both copies and the diff reviewed
- [ ] The changeset names the narrower selectors (any list or nav inside a hero or cta was previously styled as a button row) and the per-list rank change below

## Approach

- **Nested rune, not a shared builder.** The composed `hero` will write
  `{% actions %}{% slot name="actions" /%}{% /actions %}`, which produces `data-rune="actions"`.
  If the plugin `hero` already renders that, its later move to a composition (SPEC-160 D7)
  leaves the actions region unchanged. Nothing inside the region is a schema property, so
  SPEC-145 D19's name-resolution boundary costs nothing here.
- **Rank goes on the `<li>`**, beside the existing `data-name="action"`, keeping list semantics.
  CSS styles the link inside it, for example `.rf-actions__action[data-rank="primary"] > a`.
- **Rank stays positional** (SPEC-160 D6's default), but positional over the whole region. Today
  `li:first-child` applies per list, so a hero written as list, fence, list has two primary
  buttons. Primary now means the first link overall. Authorable rank is left for when a rune
  needs it.
- **Size by custom properties for now.** A `size` attribute is decided with SPEC-160 D7, when
  `hero.css` and `cta.css` go away and size has to come from somewhere else, possibly
  `prominence`.

## Blocked by

- {% ref "WORK-652" /%}: the `hero` fixture needs `section`'s split
- {% ref "WORK-659" /%}: the `hero` fixture places eyebrow, headline and blurb slots in `section`, so it is recorded against the final header grammar

## References

- {% ref "SPEC-160" /%}: D6, and D7's table of where `hero` and `cta` CSS goes.
- {% ref "SPEC-169" /%}: D1's acceptance fixture.
- {% ref "WORK-646" /%}: the delimited model the `hero` fixture uses (done in v0.42.0).

{% /work %}
