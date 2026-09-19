{% work id="WORK-585" status="ready" priority="medium" complexity="trivial" source="ADR-030" tags="runes, output-contract, refs, data-name, marketing, media, hygiene" %}

# Name the Steps item container, and normalise Playlist onto refs

Every rune that declares `sequence:` names the container holding its items —
except one. `Steps` builds its `<ol>` at `plugins/marketing/src/tags/steps.ts:166`
and pushes it straight into `children` two lines later, so the element carries no
`data-name`, gets no BEM element class, and cannot be addressed from a `layout`
tree.

| Rune | Container | Named | Via |
|---|---|---|---|
| `HowTo` | `howto.ts:116` | yes | `refs: { tools, steps }` (`:138`) |
| `Recipe` | `recipe.ts:218` | yes | `refs: { ingredients, steps, … }` (`:264`) |
| `Timeline` | `timeline.ts:135` | yes | `refs: { entries }` (`:151`) |
| `Itinerary` | `itinerary.ts:134` | yes | `refs: { stops }` (`:151`) |
| `Playlist` | `playlist.ts:354` | yes | `data-name` set on the `Tag` directly |
| **`Steps`** | `steps.ts:166` | **no** | `refs` carries only `pageSectionProperties(headerNodes)` |

## Why it matters

**It is the last blocker on the `arrange` rename.** {% ref "ADR-030" /%} moves
geometry from a rune-level `sequence:` flag — applied by walking the tree for
`<ol>` elements — to a per-container `arrange` declaration in the `layout` tree.
That requires the container to be addressable by name. Five of the six already
are; this is the sixth.

**`Steps` is doubly closed off.** Its items are child runes (`.rf-step`), so a
theme can restructure an individual step through `Step`'s own config
({% ref "WORK-584" /%} Q1), but cannot touch the container holding them. It is
the one rune in the family where the outer arrangement is unreachable.

**It is why the CSS reaches for a bare descendant selector.** With no element
class, both stylesheets fall back to `.rf-steps ol`:

```css
packages/skeleton/styles/runes/steps.css:26   .rf-steps ol { list-style: none; }
packages/lumina/styles/runes/steps.css:47     .rf-steps ol { padding-left: 0; margin: 0; }
```

Those match *any* `<ol>` inside a steps block, including one an author writes
inside a step's prose. A named container makes the selector say what it means.

## Scope

1. Pass `stepList` through `refs` in `steps.ts` so the engine names it.
2. Normalise `Playlist` onto the same channel — `playlist.ts:354` sets
   `data-name` directly on the `Tag`, which produces identical output but
   bypasses the declared path. `refs` is what the output contract documents, and
   consistency here is the point of the item.
3. Retarget the two `.rf-steps ol` rules at the new element class.
4. Regenerate both copies of `structures.json`; the new `data-name` is a
   contract addition.

## The name is a small decision

The convention across the family is *plural of the contained item*: `tracks`,
`entries`, `stops`, `ingredients`, `tools`, `steps`. Applied literally here it
yields `.rf-steps__steps`, which stutters because the rune is itself called
`steps`.

Recommendation: **take the stutter and use `steps`.** The convention is worth
more than the cosmetics, `refrakt inspect steps` will show it plainly either
way, and an exception invites the next author to invent a different one.
`items` is the readable alternative if the stutter is judged too ugly — decide
before the contract is regenerated, because changing it afterwards is a second
contract churn.

## Acceptance Criteria

- [ ] `Steps` passes its item container through `refs`, so the engine emits `data-name` and the BEM element class
- [ ] `Playlist` sets its `tracks` name through `refs` rather than on the `Tag` directly, with identical output
- [ ] The two `.rf-steps ol` descendant selectors are retargeted at the element class
- [ ] An author-written `<ol>` inside a step's prose is no longer matched by the steps container rules
- [ ] Both copies of `structures.json` are regenerated and carry the new `data-name`
- [ ] `npm run seo:baseline:check` passes — this adds no property-bearing node, so an unexpected diff is a finding

## Notes

Trivial in isolation, and worth doing on its own rather than inside the rename
spec: it is correct regardless of whether {% ref "ADR-030" /%} is ever
implemented, and it keeps a contract regeneration out of a change that will
already have plenty.

{% /work %}
