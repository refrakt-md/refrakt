{% bug id="BUG-008" status="fixed" severity="minor" milestone="v0.33.0" tags="docs,runes,reference" %}

# Two universal attributes have no author-facing documentation

`spacing` and `inset` are universal attributes — every one of the 45 block runes
that carries universals accepts both. Neither has a page that says what it does.

Found while checking whether `/runes/surfaces` was a sound link target for
{% ref "SPEC-128" /%} D1's axis accordion. It is, for most axes, but not all.

| Axis | Documented at |
|---|---|
| `elevation`, `prominence`, `width`, `frame*` | `/runes/surfaces` (Chrome) |
| `reading`, `dropcap` | `/runes/surfaces` (Reading) |
| `tint`, `bg`, `substrate*` | `/runes/surfaces` (Fills) |
| `motion` (`reveal`, `stagger`) | `/runes/motion` |
| **`spacing`** | **nowhere** |
| **`inset`** | **nowhere** |

## Expected

An author who sees `spacing` in editor completion, or in a rune's attribute
list, can find out what it does.

## Actual

`spacing` never appears in `site/content/runes/surfaces.md`. `inset` appears
once, in passing, with no definition. Neither has a section anywhere.

`site/content/runes/design/spacing.md` is not it — that documents the
`{% spacing %}` design rune, which renders a spacing *scale* for a design
system. Different thing, similar name, which is likely why the gap survived:
a search for "spacing" finds a page and stops.

## Steps to reproduce

```bash
grep -c '`spacing`' site/content/runes/surfaces.md   # → 0
grep -c '`inset`'   site/content/runes/surfaces.md   # → 1, in passing
```

## Root cause

`/runes/surfaces` is organised by editorial theme — Chrome, Reading, Fills,
Cover, Composition — rather than by the axis list. That is the right shape for
a page an author reads front to back, and it is why the page is good. But it
means an axis that belongs to no theme has no home, and nothing checks that
every axis has one.

`motion` was noticed and given its own page. `spacing` and `inset` were not.

## Acceptance Criteria
- [x] `spacing` is documented as a universal attribute, with its accepted values
- [x] `inset` is documented as a universal attribute, with its accepted values
- [x] Each is reachable from `/runes/surfaces`, whether defined there or linked
- [x] The `{% spacing %}` design rune and the `spacing` universal attribute are distinguishable from their pages — the name collision is the reason this went unnoticed

## Approach

Small, and worth doing before {% ref "WORK-548" /%} rather than after: D1's
accordion links each axis to its documentation, so an axis with no page is a
link with nowhere to go. Fixing it first means the accordion's link map is
complete on the day it ships.

The axis→page map that WORK-548 needs is also the artifact that would have
caught this. Consider asserting every axis in `AXIS_ATTRIBUTES` has an entry —
then a future axis cannot be added without a documentation home, which is the
failure that happened here.

## References

- {% ref "SPEC-128" /%} — D1 makes `/runes/surfaces` the accordion's link target, which is what surfaced this
- `packages/runes/src/universal-attributes.ts` — `AXIS_ATTRIBUTES`, the list every axis should be checkable against

## Resolution

Completed: 2026-09-10

Branch: `claude/content-author-docs-org-vps1un`

### What was done

**`site/content/runes/surfaces.md`** — new `## Spacing and inset` section
documenting both axes: what each controls (rhythm *around* vs padding *within*),
the shared `flush | tight | default | loose | breathe` scale, that `default`
emits nothing, and that the engine declares no closed value set so a theme can
add its own steps. Both attributes added to the page's overview table.

**`site/content/runes/design/spacing.md`** — a note distinguishing the
`{% spacing %}` design rune from the `spacing` attribute, with a link across.
`surfaces.md` carries the reciprocal note. The name collision is the likeliest
reason this gap survived: searching for "spacing" finds a page and stops.

### Notes

- Values were read from the Lumina stylesheets (`--spacing-flush|tight|loose|
  breathe`, and the same four for `inset`) plus the facet contracts in
  `packages/transform/src/facets/box.ts`, which say each is suppressed at
  `default`.
- The section heading is deliberately punctuation-free. The first draft was
  `## Spacing and inset — rhythm around and padding within`, whose real slug
  keeps the em-dash — exactly the {% ref "BUG-005" /%} trap. Verified in the
  built HTML: `id="spacing-and-inset"`.
- The axis→page map that {% ref "SPEC-128" /%} D1 needs is now complete: every
  universal axis has somewhere to point.

{% /bug %}
