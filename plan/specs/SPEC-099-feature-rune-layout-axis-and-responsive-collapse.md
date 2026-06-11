{% spec id="SPEC-099" status="draft" tags="feature,layout,collapse,marketing,runes" source="ADR-018" %}

# Feature rune layout axis and responsive collapse

Give the `feature` rune an honest `layout` axis (`grid | list`, drawn from the
{% ref "ADR-018" /%} canonical pool) for arranging its feature-items, retire the
implicit coupling that infers the grid from `media-position`, and define how the
item arrangement collapses responsively. Carousel is **explicitly out of scope**
here — it lands in {% ref "SPEC-100" /%} once the shared contract exists.

Target: next minor.

## Motivation

`feature` currently fuses three orthogonal axes into one tag: **section framing**
(eyebrow / headline / blurb preamble + an optional media slot in a split layout),
**item identity** (the definition list — icon/title/description triplets), and
**item arrangement** (grid vs. flat column). The third axis has no attribute of
its own. Instead, arrangement is inferred from media placement, in
`plugins/marketing/src/config.ts`:

```ts
variants: {
  'media-position': {
    top:    { staticModifiers: ['definitions-grid'] },
    bottom: { staticModifiers: ['definitions-grid'] },
  },
},
```

"Media stacked → tile as grid; media beside → stack in a column" is a reasonable
*default*, but wiring two orthogonal concerns to one dial is exactly what makes
the rune hard to reason about, and it makes some combinations unreachable (e.g.
media beside content *and* a grid of items). Promoting arrangement to a
first-class `layout` axis decouples the two: `media-position` controls where the
media sits, `layout` controls how the items lay out, and they become independent.

This is also the first real consumer of the {% ref "ADR-018" /%} canonical pool —
`feature` needs no bespoke values, only `grid` and `list`.

## Current state

- `feature` (`plugins/marketing/src/tags/feature.ts`) is a page-section built on
  `SplitLayoutModel` (`splitLayoutAttributes` in
  `packages/runes/src/tags/common.ts`). Its body content model is
  `media --- content`, where `content` resolves `eyebrow`, `headline`, `blurb`,
  and a `definitions` list.
- The definitions render to a flat `<dl>` carrying an item count. Whether that
  `<dl>` tiles as a grid or stacks is toggled today by the `definitions-grid`
  static modifier, driven by the `media-position` variant above (SPEC-091).
- **`feature` already has a `collapse` attribute** — inherited from
  `splitLayoutAttributes` (`common.ts:24`): *"Breakpoint at which side-by-side
  layouts collapse to a single stacked column."* It governs the **media↔content
  split** (`sm | md | lg | never`), surfaced via `buildLayoutMetas`. It does
  **not** today govern the item arrangement.

## Design

### 1. `layout` axis (`grid | list`)

Add a `layout` attribute to `feature`, with values drawn from the
{% ref "ADR-018" /%} canonical const:

- `layout="grid"` — feature-items tile as a grid (today's "definitions-grid"
  look).
- `layout="list"` — feature-items stack in a single column (today's "beside-media"
  look). Note this is the canonical `list` token, **not** a bespoke `columns`
  value — `feature` adds no new vocabulary to the pool.

The engine sets `data-layout` from the `layout` meta modifier (the same mechanism
`gallery` already uses), and CSS keys the grid-vs-stack arrangement off
`[data-layout="grid"]` / `[data-layout="list"]` instead of the
`definitions-grid` modifier class.

**Default:** preserve today's behaviour as the *default resolution* so existing
content doesn't shift — when `layout` is unset, derive it from `media-position`
(stacked media → `grid`, beside media → `list`). The difference from today is that
the author can now **override** that default explicitly, and the two axes are
independent when they do.

### 2. Retire the `media-position → definitions-grid` coupling

Remove the `variants: { 'media-position': { … } }` block and the
`definitions-grid` static modifier from the `Feature` config. The grid/stack
decision moves entirely onto `[data-layout]`. The media-position-derived
*default* from §1 replaces the old hard coupling, so the rendered output for
existing content is unchanged when `layout` is unset — but this is a behaviour
change with visual-regression surface and is owned by this spec, not a silent
side effect. CSS in `packages/lumina/styles/runes/feature.css` (and the
`definitions-grid` selector) is updated accordingly.

### 3. Resolve the `collapse` collision

`feature` already has a `collapse` (the media-split breakpoint, §Current state).
The item `layout` also needs a responsive form — on a narrow viewport a `grid`
should reflow to a single stacked column. These are two orthogonal axes
(media↔content vs item↔item) that share the word *and* the `sm|md|lg|never`
vocabulary.

**Decision (this spec): reuse the single `collapse` breakpoint for both.** Below
the `collapse` breakpoint the media stacks under the content **and** a `grid`
layout reflows to a single column — one dial, one mental model, which is the
behaviour authors almost always want anyway. We do **not** introduce a second
`layout-collapse` attribute. The item-layout reflow is **CSS-only** (a media query
that flattens the grid track), requiring no new behavior code and no new meta. If
a real case later demands independent control, a distinct dial can be added
without breaking this default — but it is a non-goal here.

Because carousel is out of scope, the collapsed item form in this spec is always
a single stacked column. The "collapse *to* a carousel" target is deferred to
{% ref "SPEC-100" /%}, which builds on this `collapse` semantics.

## Acceptance Criteria

- [ ] `feature` accepts a `layout` attribute matching `grid | list`, with both
  values imported from the {% ref "ADR-018" /%} canonical const (no bespoke
  `columns` value).
- [ ] The engine emits `data-layout` from the `layout` modifier; `feature.css`
  keys grid-vs-stack arrangement off `[data-layout="grid"]` / `[data-layout="list"]`.
- [ ] When `layout` is unset, it defaults from `media-position` (stacked → `grid`,
  beside → `list`) so existing content renders identically; an explicit `layout`
  overrides that default.
- [ ] The `media-position` → `definitions-grid` variant coupling and the
  `definitions-grid` modifier are removed from the `Feature` config and CSS; the
  grid/stack decision lives solely on `[data-layout]`.
- [ ] Item arrangement and media placement are independently controllable (e.g.
  media beside content *and* `layout="grid"` is reachable).
- [ ] Below the existing `collapse` breakpoint, a `grid` layout reflows to a
  single stacked column (CSS-only); no second collapse attribute is introduced.
- [ ] CSS-coverage tests pass for the new `[data-layout]` selectors; the
  `definitions-grid` selector is removed from `KNOWN_*`/coverage as appropriate.
- [ ] `feature` rune docs document `layout` and the shared-`collapse` semantics
  with an example; the `media-position`-derived default is noted.
- [ ] Tests cover: explicit `layout` overriding the media-derived default,
  independence of the two axes, and unchanged output when `layout` is unset.

## Non-goals

- **Carousel** (`layout="carousel"`) and collapse-to-carousel — deferred to
  {% ref "SPEC-100" /%}.
- A second, independent `layout-collapse` breakpoint — the single `collapse` dial
  is reused; a separate dial is only revisited if a concrete case demands it.
- Letting `feature` host arbitrary layout primitives (e.g. a `bento`) in place of
  feature-items — that belongs to a generic section primitive, not `feature`
  (out of scope; noted for the record).
- Changes to the canonical pool itself or to other runes' `layout` values — owned
  by {% ref "ADR-018" /%} (lazy migration).

## References

- {% ref "ADR-018" /%} — canonical layout vocabulary this draws `grid`/`list` from.
- {% ref "SPEC-100" /%} — carousel as a shared layout mode (the deferred third value).
- SPEC-091 — the `media-position` definitions-grid variant being retired.
- `plugins/marketing/src/tags/feature.ts`, `plugins/marketing/src/config.ts`
  (`Feature`), `packages/runes/src/tags/common.ts` (`splitLayoutAttributes`,
  `buildLayoutMetas`), `packages/lumina/styles/runes/feature.css`.

{% /spec %}
