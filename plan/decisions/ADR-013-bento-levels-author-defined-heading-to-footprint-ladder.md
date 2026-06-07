{% decision id="ADR-013" status="accepted" date="2026-06-07" source="SPEC-085" tags="bento, runes, authoring, sizing, sugar, marketing" %}

# Bento `levels` — an author-defined heading→footprint ladder

## Context

A heading carries one signal: ordinal depth (`h2 > h3 > h4` — prominence, one
number). A bento cell needs a **2-D footprint** (`cols × rows`) on the grid. So
every heading-sugar "mode" is, underneath, just a *projection function* from
`depth → (cols, rows)`. There is nothing privileged about the tiered projection
({% ref "SPEC-085" /%}'s `large=4×2, medium=3×1, small=2×1`); it is one hardcoded
choice. The old `sizing="span"` mode (`spanForLevel = columns + 1 − level`, rows=1)
was simply a *different* hardcoded projection. They felt like "two completely
different systems" only because each baked its projection into code.

{% ref "SPEC-085" /%} removed the `span` cell attribute and the `sizing="span"`
parent mode as a "free cleanup — no content uses it." That reasoning does not
hold up: absence of use is not absence of value, and a concrete need surfaced —
a uniform-height, varied-width grid (the common "first cell wide, then a mix of
halves/thirds" marketing/magazine layout), which tiered cannot express because
its base rung (`large`) is 2 rows tall.

Several revivals were weighed and rejected (below). The throughline of the
discussion: **stop hardcoding the projection; make the depth→footprint mapping
the attribute.** A heading is well-suited to drive *one* dimension; which
dimension(s), and by how much, should be the author's call — not a fixed preset.

## Options Considered

### 1. Revive `sizing="span"` verbatim (`columns + 1 − level`, rows=1)

**Pros:** restores exactly what existed; one-line conceptual revert.

**Cons:** widths `6,5,4,3,2,1` do not tile cleanly into 6 (5 and 4 leave awkward
remainders); the common base (`h2`) lands at 5 cols, **not** full width, so the
"first cell full width" intent isn't even met; and it reintroduces a *second
heading-sugar front door* and the absolute-heading-level interpretation that
SPEC-085 deliberately moved away from (it auto-detects a relative base). Rejected.

### 2. Proportional `tiers` ladder — a list of `size` tokens

A ladder of the existing proportional `size` presets, indexed by relative depth:
`tiers="large medium small"` (= today's tiered) vs `tiers="full medium small"`
(uniform height, varied width — every token but `large` is already 1-row).

**Pros:** scales with `columns` for free (tokens are proportions of the column
count); reuses SPEC-085's blessed vocabulary, so it *parameterizes the tiered
door* rather than adding a new one; "shallowest = full width" becomes a ladder
choice, dissolving the absolute-vs-relative question.

**Cons:** genuinely elegant, but **width-only** — it cannot express "uniform
width, varied height" (a feed/timeline), because rows are baked into the `size`
tokens and only `large` carries a 2nd row. Subsumed by option 3, which can do
everything this can plus varied height. Rejected as the *surface*, retained as
the *default's internal representation* (see Decision).

### 3. `levels` — an author-defined numeric footprint ladder — **chosen**

A comma-separated ladder, indexed by relative heading depth, where each rung is
an explicit footprint: a bare integer `W` (→ `cols=W, rows=1`) or `WxH`
(→ `cols=W, rows=H`). Tiered stays the default when `levels` is omitted.

**Pros:** one mechanism expresses *every* layout we circled — tiered (default),
uniform-width span (`levels="6,5,4,3,2,1"`), **and** varied-height feeds
(`levels="6x1,6x2,6x3"`) that option 2 could not. The bare-integer form keeps the
common "just vary the width" case to a short, readable list. Almost any grid
becomes expressible from headings alone.

**Cons:** integer/`WxH` rungs are **absolute** (relative to the declared
`columns`) — change `columns` and the ladder no longer means what it did; the
author owns keeping `columns` and `levels` in sync. And it requires authoring the
ladder up front — mitigated by (a) tiered remaining the zero-config default, and
(b) short ladders clamping deeper levels to the last rung (write 2–3 rungs, not 6).

### 4. Allow proportional entries inside `levels` (`1/2`, size tokens)

Mixing proportional rungs into `levels` to recover option 2's columns-safety.

**Cons:** adds a second notation to one attribute for marginal MVP gain. The
default already covers the columns-safe case (it stays proportional). **Deferred,
not foreclosed** — the entry grammar is forward-compatible if demand appears.

## Decision

Add a **`levels`** attribute to `bento`, governing the heading-sugar path only:

- **Omitted →** current tiered behavior, via the proportional `large/medium/small`
  presets, which scale with `columns`. Unchanged and backward-compatible.
- **Provided →** a comma-separated ladder, indexed by **relative** heading depth
  (0 = shallowest, auto-detected base). Each rung:
  - `W` (bare integer) → `cols=W, rows=1`
  - `WxH` → `cols=W, rows=H`
- Rungs are **absolute** against the declared `columns`; the author keeps
  `columns` and `levels` in sync. **No proportional entries** in `levels` for now.
- Ladders shorter than the deepest heading **clamp** to the last rung.
- Explicit `{% bento-cell %}` grids **ignore** `levels` — the two front doors
  (heading sugar vs explicit cells) are unchanged.
- The removed span mode is exactly reproducible as `levels="6,5,4,3,2,1"`.

The proportional default and the absolute override **coexist without conflict**:
"no proportional entries" constrains only what an author may *write into*
`levels`, not the built-in default's internal (proportional) representation.

**No `sizing` attribute is revived, and no `span` mode returns.** `levels`
subsumes both; the SPEC-085 cruft stays dead.

## Rationale

The maintenance and conceptual cost of "modes" was the *hardcoded projection*,
not the heading sugar itself. Making the projection an author-supplied ladder
collapses tiered, span, and feed layouts into one system that differs only by the
ladder's contents — exactly the unification the discussion was reaching for.
Numeric-only rungs keep the MVP small and unambiguous to parse (`x` → `WxH`;
integer → width-only), while the proportional default preserves the columns-safe
zero-config experience nobody should have to opt out of.

The bare-integer form directly honors the observation that **headings are suited
to control one dimension** — `levels="6,5,4,3,2,1"` is pure width-by-depth — while
`WxH` keeps the 2-D door open for those who want it.

## Consequences

**Amendment to {% ref "SPEC-085" /%}.** The sugar path becomes *configurably
expressive* — including rows-by-depth — superseding SPEC-085's "deliberately
blunt, three coarse tiers, rows-by-depth rejected (it inverts hierarchy)" stance.
What makes that cheap: **explicit cells already permit any footprint**, including
hierarchy-inverting ones; SPEC-085 only constrained the *sugar* path and pushed
that power into explicit cells. `levels` adds **no new grid capability** — it only
makes the existing expressiveness reachable from headings with less syntax. The
"inverts hierarchy" footgun was always reachable via explicit cells; `levels`
hands it to the author knowingly, in exchange for the ergonomics.

**For `@refrakt-md/marketing`:** add the `levels` attribute to the `bento` schema;
in the heading→cell conversion, when `levels` is present, parse the ladder and
assign each converted cell its `cols`/`rows` by the heading's relative depth
(clamping to the last rung), short-circuiting `tieredSize`. Default path unchanged.

**For `@refrakt-md/lumina`:** no new CSS — cells already render `cols`/`rows`
spans. Composes with the existing `row-height` and `content-height` attributes.

**For docs:** document `levels` on the bento authoring page, with the
`levels="6,5,4,3,2,1"` recipe called out as the "uniform-width grid" / former
span-mode equivalent.

**Tracked by:** {% ref "WORK-356" /%} (queued; design is settled, implementation
intentionally left to marinate).

**Open follow-up:**
- Proportional rungs in `levels` (option 4) if a columns-safe explicit ladder is
  ever wanted — grammar is forward-compatible.
- Named ladder presets (e.g. `levels="strips"`) as sugar over common ladders, if
  the explicit list proves too verbose in practice.

{% /decision %}
