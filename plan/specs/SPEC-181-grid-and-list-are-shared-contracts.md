{% spec id="SPEC-181" status="draft" tags="runes, theme, layout, arrangements, composition, vocabulary, grid, list, skeleton" %}

# Grid and list are shared contracts

## Summary

{% ref "ADR-018" /%} made `grid`, `list` and `carousel` canonical layout tokens: *"the same value
implies the same emitted structure … wherever it appears."* Only `carousel` was given that
structure ({% ref "SPEC-100" /%}): a host `[data-layout="carousel"]`, a track
`[data-name="items"]`, styled once for every rune. `grid` and `list` never were. Every rune that
offers them writes its own CSS, with its own selectors and its own sizes.

This spec gives `grid` and `list` the contract `carousel` has. It also lets a composition
template reach all three through `{% group %}`, which is how {% ref "SPEC-156" /%} D2 reaches
the row and the ladder. Measuring both showed that SPEC-156's `ladder` is ADR-018's `list` under
a second name, so the two are made one.

{% ref "SPEC-156" /%} D1 left `grid` to its own spec, and {% ref "ADR-030" /%} rule 5a's bar
for a consolidation is cleared many times over: 17 item grids are written by hand today.

## What exists, measured

Read from `packages/skeleton/styles/runes/` on 2026-10-29.

### Item grids: 17, and no shared rule

An item grid is a container whose children are peer items laid out in columns. Two-region
layouts (`mediatext`, `diff`, the split layout, the page layouts) are not counted.

| Group | Runes | Columns |
|---|---|---|
| Author chooses `layout="grid"` (ADR-018) | `gallery`, `cast`, `blog`, `collection`, `relationships`, `compare`, `feature`, `pricing` | as many as fit, with a minimum width; `gallery` a fixed count |
| Always a grid | `palette`, `storyboard`, `bento`, `nav`, `comparison`, `howto` and `recipe` metadata, the metadata dimension, the plan layout | fixed counts from a variable (`palette`, `storyboard`, `bento`), as many as fit elsewhere |
| The `{% grid %}` rune | `grid` | every form: auto-fit, `columns` 1 to 6, `mode="auto"` with `min`, masonry, spans, flow, ratio, aspect, collapse |

Two mechanisms are written out again in each file:

- **As many as fit**: `repeat(auto-fit | auto-fill, minmax(MIN, 1fr))`. The minimum varies with no
  stated reason: 6rem, 8rem, 10rem, 16rem (four runes), 200px, 240px (two, plus `feature`'s
  `max(240px, a third)`), 250px, 280px (two) and 24rem.
- **A fixed count**: `repeat(var(--x-cols, N), 1fr)`, in `gallery`, `palette`, `storyboard`,
  `bento` and the `grid` rune.

Only `grid` and `bento` place a cell across several columns or rows (spans).

### The selectors differ as much as the sizes

- `.rf-collection[data-layout="grid"] .rf-collection__items`, `.rf-relationships[data-layout="grid"]
  .rf-relationships__items`, `.rf-feature[data-layout="grid"] .rf-feature__items`: keyed on the
  token, scoped to the rune.
- `.rf-cast--grid .rf-cast__items`: keyed on a BEM modifier, not the token.
- `.rf-pricing > ul[data-layout="grid"]`: the token on the list itself, not on the rune.
- `.rf-grid [data-layout="grid"]`: the `grid` rune's own rules, which apply only inside the
  `grid` rune.

### Who already names an items container

`gallery`, `collection` and `relationships` emit `data-name="items"`, the name the carousel
contract reads. `cast` and `feature` name it through `refs` (`items`). `blog`, `compare` and
`pricing` do not name it. So five of the eight `layout="grid"` runes already have the track the
contract needs.

### Collapse already has a shared form

`carousel.css` collapses with container queries, measured against the rune's own width
(`collapse-to="carousel"`, `data-collapse="sm|md|lg"`). The `grid` rune and `feature` collapse
with their own media queries on the same `sm | md | lg` names.

### `list` is the same story, and it is SPEC-156's ladder

ADR-018's canonical `list` has no contract either. `cast`'s `list` mode is a column of items with
the list markers reset (`.rf-cast--list .rf-cast__items`), and `feature` has
`[data-layout="list"]`. That is exactly the topology {% ref "SPEC-156" /%} D3 calls a ladder, which
it planned to emit as `data-zone-layout="ladder"`. Two names and two attributes for one
arrangement is what {% ref "ADR-030" /%}'s naming rule exists to prevent, and it is caught before
either ships.

## Decisions

### D1 — the grid contract

Modelled on {% ref "SPEC-100" /%}'s carousel:

| Part | Contract |
|---|---|
| Host | `[data-layout="grid"]` |
| Track | `[data-name="items"]`, a direct or nested child of the host |
| Cells | the track's direct children, whatever the rune names them |

Skeleton styles it once, for every rune (`packages/skeleton/styles/dimensions/layout.css`, new):

- **As many as fit**, by default: `repeat(auto-fill, minmax(var(--grid-min), 1fr))`.
- **A fixed count** when the host carries `data-columns="1"` to `"6"`.
- **Spans** when a cell carries `data-colspan` or `data-rowspan`, read from the cell
  ({% ref "SPEC-171" /%} D1), so a composition that places cells with `each` can size each one.
- **Collapse** to one column below the host's `data-collapse` breakpoint (`sm | md | lg`, default
  `sm`), measured with a container query against the host's own width, as carousel does.
- **Gap** from the density dimension's spacing token, so `compact` grids are tighter.

What the contract does not cover stays with the rune that needs it, as ADR-018's local tokens:
`masonry`, `flow`, `ratio`, `aspect` and `stack` on the `grid` rune; bento's sizing ladder and
row height (SPEC-171 D2, D3), which build on the contract's spans.

### D2 — the minimum width is a named size

`--grid-min` takes one of five named sizes, emitted as `data-grid-min` on the host and mapped to
theme tokens:

| Size | Default | Today's runes nearest it |
|---|---|---|
| `xs` | 8rem | `howto`/`recipe` metadata (6rem), the metadata dimension (8rem), `nav` (10rem) |
| `sm` | 12rem | `cast` (200px) |
| `md` | 16rem | `collection`, `relationships`, `nav` cards (16rem), `grid` (250px), `pricing`, `comparison` (240px) |
| `lg` | 18rem | `blog`, `compare` (280px) |
| `xl` | 24rem | the plan layout |

- Each rune declares its size as a default; an author overrides it with `min`, which also accepts
  a length (`min="14rem"`), as the `grid` rune's `min` does today.
- The values are tokens (`--rf-grid-min-sm` and so on), so a theme retunes every grid of a size at
  once ({% ref "ADR-043" /%}).
- Each rune's move to its nearest size is a visible change, recorded per rune (D6). `feature`'s
  `max(240px, a third)` becomes `md` with `data-columns="3"` at wide widths, or keeps its own rule
  as a local variant if the comparison shows the difference matters.

### D3 — the list contract, which replaces SPEC-156's ladder

| Part | Contract |
|---|---|
| Host | `[data-layout="list"]` |
| Track | `[data-name="items"]`: an `<ol>` when the rune declares a `sequence`, a `<ul>` otherwise |
| Items | `<li>`, the track's direct children |

Skeleton gives the track the list reset and a column flow with the density gap. A sequence is the
`sequence` dimension's, unchanged: the track carries `data-sequence` from the rune's declared
sequence, and the dimension draws the markers ({% ref "SPEC-156" /%} D12–D14 apply to a list as
they did to the ladder).

`ladder` remains {% ref "ADR-030" /%}'s name for the topology. Authors and themes see `list`.

### D4 — `{% group %}` takes the three item layouts and the row

{% ref "SPEC-156" /%} D2's `{% group %}` takes:

| `layout` | Kind | Emits |
|---|---|---|
| `grid` | item layout (ADR-018) | a host `data-layout="grid"` and an items track |
| `list` | item layout (ADR-018) | a host `data-layout="list"` and an `<ol>` or `<ul>` items track |
| `carousel` | item layout (ADR-018) | a host `data-layout="carousel"` and an items track, with SPEC-100's behaviour |
| `bar` | zone layout | `data-zone-layout="bar"` over what it holds, as SPEC-156 D2 decided |

- **Item layouts and zone layouts are different things.** An item layout arranges peer items, each
  one placed by an `each` iteration or a top-level node. A zone layout arranges the values inside
  one item (`bar`, `definition-list`, `lead`). They keep their two attributes.
- **A group with an item layout** places each `each` iteration placed directly in it, or else each
  top-level node, as a child of the track: an `<li>` for `list`, the node itself otherwise.
- **The group's own attributes** are the contract's: `columns`, `min`, `collapse` for `grid`;
  nothing extra for `list`. The `name` stays required, and carries no geometry (SPEC-156 D6).
- **`carousel` joins** because nothing stops it: SPEC-100's contract and behaviour bind to any host
  that emits it.

### D5 — the `grid` rune emits the contract

`{% grid %}` stays the page author's tool, and its output joins the contract:

- its root gains `data-layout="grid"`, and its cell container gains `data-name="items"`;
- `columns`, `min` and `collapse` map onto D1 and D2, so the shared rules lay it out;
- its local settings (`masonry`, `flow`, `ratio`, `aspect`, `stack`) keep their rules, keyed on
  `.rf-grid`;
- {% ref "SPEC-165" /%} D7's `cells="each"` (each top-level child a cell) is kept, because a
  composition that places the `grid` rune needs it. A composition that wants no rune boundary
  places `{% group layout="grid" %}` instead.

**When to use which.** A page author writes `{% grid %}`: it splits authored content on `---` and
has every setting. A composition template writes `{% group layout="grid" %}`: it carries no
`data-rune`, so a schema property inside it stays reachable (SPEC-145 D19, SPEC-156 D9). Both
emit the same structure and get the same rules.

### D6 — the migration is per rune, and compared

Each rune moves onto the contract on its own, with its own grid CSS deleted:

1. **Already naming `items`**: `gallery`, `collection`, `relationships`, then `cast` and `feature`.
2. **Naming a track first**: `blog`, `compare`, `pricing`.
3. **Always-grid runes**: `palette` and `typography` when they compose ({% ref "SPEC-165" /%}),
   `bento` with {% ref "SPEC-171" /%}, `storyboard`, `comparison`, the metadata dimension.
4. **Lists**: `cast`'s and `feature`'s `list` modes onto D3.

`nav` and the plan layout are reviewed last: `nav`'s grid is one of several arrangements in a
264-line stylesheet, and the plan layout is a page layout, not a rune.

Each move is compared in the gallery, light and dark, at the three collapse widths. The visible
changes are the minimum widths moving to named sizes (D2) and collapse measured against the
rune's own width instead of the viewport, both recorded per rune. Contracts change on both copies
and are reviewed. None of these runes' structured data changes; the SEO baseline must not move.

## Not in scope

- `masonry` as a canonical token. It stays local to `gallery` and `grid` (ADR-018).
- `split` and `tree` (ADR-030 rule 1). They are separate topologies, each with its own evidence.
- Changing `carousel`'s contract. D4 only lets a group emit it.
- Bento's sizing ladder and row height, which stay {% ref "SPEC-171" /%}'s.

## Open questions

- **Five sizes or three.** The measured minimums cluster around 8, 12, 16, 18 and 24rem. `sm` and
  `lg` each serve one or two runes; folding them into their neighbours would give three sizes and
  larger visible changes.
- **`gallery`'s fixed count.** It is the one `layout="grid"` rune with a fixed column count. D1's
  `data-columns` covers it, but its `columns` attribute also drives its lightbox navigation, which
  should be checked before it moves.

## Acceptance Criteria

- [ ] Skeleton styles `[data-layout="grid"] [data-name="items"]` once for every rune: as many as fit by `--grid-min`, a fixed count by `data-columns`, spans by the cell's `data-colspan`/`data-rowspan`, collapse by a container query on `data-collapse`, gap by density (D1)
- [ ] `--grid-min` takes the named sizes `xs`–`xl` as theme tokens, or a length through `min` (D2)
- [ ] Skeleton styles `[data-layout="list"] [data-name="items"]`: list reset and column flow, with markers from the `sequence` dimension when the track carries `data-sequence` (D3)
- [ ] `{% group %}` takes `grid`, `list`, `carousel` and `bar`; the item layouts emit a host and an items track, and an unknown value is rejected at schema construction (D4)
- [ ] The `grid` rune's root carries `data-layout="grid"` and its cell container `data-name="items"`; `columns`, `min` and `collapse` are laid out by the shared rules, and its local settings keep their own (D5)
- [ ] `gallery`, `collection` and `relationships` move onto the grid contract with their grid CSS deleted, each compared in the gallery at three widths, light and dark (D6)
- [ ] The remaining runes in D6 each move in their own change, with the same comparison and the per-rune visible changes recorded
- [ ] ADR-018's canonical-token const carries `grid`, `list` and `carousel`, and each contract is documented in the theme-authoring guide beside carousel's
- [ ] The CSS-coverage test's known-gap sets shrink rather than grow, and contracts are regenerated on both copies

## References

- {% ref "ADR-018" /%}: the canonical layout tokens this spec gives a contract.
- {% ref "SPEC-100" /%}: the carousel contract D1 and D3 are modelled on.
- {% ref "ADR-030" /%}: rule 5a, and the topology names; `ladder` is the topology `list` emits.
- {% ref "SPEC-156" /%}: `{% group %}` (D2), the ladder D3 replaces, and the sequence rules (D12–D14).
- {% ref "SPEC-165" /%}: D7's `cells="each"`, kept on the `grid` rune.
- {% ref "SPEC-171" /%}: D1's per-cell spans, and the bento extensions built on the contract.
- {% ref "SPEC-145" /%}: D19, why a template groups with an engine wrapper.

{% /spec %}
