{% work id="WORK-684" status="ready" priority="high" complexity="simple" source="SPEC-181" tags="runes, marketing, hero, staging, migration" milestone="v0.44.0" %}

# The plugin hero accepts start and end for align, and the site content uses them

The composed `hero` takes `align="start | center | end"`, which is `section`'s vocabulary. The
plugin `hero` takes `left | center | right`. The staging site renders the same content as
`main`, so `align="left"` on the homepage and on the hero reference page would be invalid
there ({% ref "SPEC-181" /%} D7). The plugin `hero` learns the new values first, and the
content moves to them.

## Acceptance Criteria

- [ ] The plugin `hero` accepts `start` and `end` for `align`, rendering them exactly as `left` and `right`; `left` and `right` keep working
- [ ] `site/content/index.md` and `site/content/runes/marketing/hero.md` use `start` / `end`, and nothing else in `site/content` writes `left` / `right` on a `hero`
- [ ] The hero reference page documents `start | center | end`, and notes that `left` / `right` still work for now
- [ ] `main`'s rendered output for those pages, the contracts and the SEO baseline are unchanged, or any diff is explained
- [ ] A changeset records the new values

## Approach

- Map the value at the attribute, before the modifier is read, so the root's `data-align` stays
  `left` / `right` and Lumina's `hero.css` needs no change.
- Whether `left` / `right` raise a deprecation warning is left to the go-live item. While the
  plugin is live, both are valid.

## Blocks

- {% ref "WORK-681" /%}

## References

- {% ref "SPEC-181" /%}: D7, the rollout's gate 3.
- {% ref "WORK-665" /%}: the `align` difference.

{% /work %}
