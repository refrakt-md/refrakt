{% work id="WORK-684" status="done" priority="high" complexity="simple" source="SPEC-181" tags="runes, marketing, hero, staging, migration" milestone="v0.44.0" pr="refrakt-md/refrakt#736" %}

# The plugin hero accepts start and end for align, and the site content uses them

The composed `hero` takes `align="start | center | end"`, which is `section`'s vocabulary. The
plugin `hero` takes `left | center | right`. The staging site renders the same content as
`main`, so `align="left"` on the homepage and on the hero reference page would be invalid
there ({% ref "SPEC-181" /%} D7). The plugin `hero` learns the new values first, and the
content moves to them.

## Acceptance Criteria

- [x] The plugin `hero` accepts `start` and `end` for `align`, rendering them exactly as `left` and `right`; `left` and `right` keep working
- [x] `site/content/index.md` and `site/content/runes/marketing/hero.md` use `start` / `end`, and nothing else in `site/content` writes `left` / `right` on a `hero`
- [x] The hero reference page documents `start | center | end`, and notes that `left` / `right` still work for now
- [x] `main`'s rendered output for those pages, the contracts and the SEO baseline are unchanged, or any diff is explained
- [x] A changeset records the new values

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

## Resolution

Completed: 2026-10-30

Branch: `claude/milestone-v0-44-0-ism7ni`

### What was done
- `plugins/marketing/src/tags/hero.ts`: `align` matches `start | center | end | left | right`; `start` / `end` are mapped to `left` / `right` before the modifier reads them, so `data-align` and `hero.css` are unchanged.
- `site/content/index.md` and `site/content/runes/marketing/hero.md` use `start`; no hero in `site/content` writes `left` / `right`. The reference page documents `start | center | end` and notes `left` / `right` still work.
- Test in `plugins/marketing/test/hero.test.ts`: `start` / `end` render a tree identical to `left` / `right`.
- Changeset `hero-align-start-end`.

### Notes
- Rendered output is unchanged by construction (the identical-tree test); contracts and the SEO baseline are unchanged.

{% /work %}
