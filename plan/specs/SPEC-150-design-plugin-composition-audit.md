{% spec id="SPEC-150" status="draft" tags="runes, composition, design, plugins, feasibility" %}

# Design plugin composition audit

## Summary

Fourth plugin audited against {% ref "SPEC-145" /%}, and **the first that comes back
no**. Design is 1,958 lines across seven runes, and it should stay a plugin: two runes
compose cleanly, two more could with {% ref "SPEC-147" /%}'s `segmented` model, one is a
misfiled documentation tool, and the remaining one is uncomposable **by nature** rather
than by any gap the roadmap closes.

That the answer is sometimes no is the point of running the audit, and this is the
result that establishes it. The previous three all resolved to retire, dissolve or shed
a rune; this one does not.

It also produces a blocker category the first three did not, and shows the per-property
method has a precondition.

## The five-path method does not apply here

**No design rune declares a `schema` table.** Not one of the seven, confirmed by
inspection and by their absence from `contracts/seo-baseline/fixtures/` — the corpus
covers 30 emitting runes and none of them is a design rune.

So {% ref "SPEC-148" /%}'s five resolution paths and {% ref "SPEC-149" /%}'s
B-intrinsic / B-by-choice split have nothing to bite on. That is worth stating rather
than passing over: **the per-property method has a precondition — that the rune makes a
structured-data claim at all.** Where it does not, composability is decided entirely by
content model, behaviour and pipeline, and the audit is a different shape.

## The audit

| Rune | Lines | Verdict |
|---|---|---|
| `swatch` | 76 | **Composes today.** `sequence` with no fields; renders a chip from attributes alone |
| `mockup` | 193 | **Composes today.** `sequence` body + a named viewport wrapper; its own comment notes the device chrome is `data-*` attributes "not in a postTransform", so it already follows the declarative convention |
| `palette` | 309 | Needs {% ref "SPEC-147" /%}'s `segmented` model (two `groupByHeading` sites), **and** see the coupling below |
| `spacing` | 270 | Same — two `groupByHeading` sites, same coupling |
| `typography` | 284 | No heading grouping; composable in principle, same coupling |
| `preview` | 237 | **Triply blocked**, and misfiled — see below |
| `design-context` | 99 | **Uncomposable by nature** — see below |

## The new blocker — output that is derived data, not arranged content

`design-context` dispatches on its children's rune names and calls
`extractPaletteTokens`, `extractTypographyTokens` and `extractSpacingTokens`, folding the
result into a `DesignTokens` blob it emits as a field. Its job is not to arrange its
children; it is to **read them and compute a value**.

Composition places content. It has no facility for computing over content, and
{% ref "ADR-036" /%} is the reason it should not grow one — a general "read my children
and derive a value" capability is an expression language by another name.

So this is a fourth blocker category, distinct from the three the earlier audits found
(a peer schema type, a required parent, a client lifecycle):

> **A rune whose output is derived data rather than arranged content cannot be composed,
> and should not be.**

Worth naming because it is not obvious from the outside: `design-context` looks like a
container, is described in the catalog as *"composing palette, typography, and spacing
runes"*, and is the plugin's least composable rune.

### And it constrains its children

The extractors walk `palette` / `typography` / `spacing`'s **output trees**. So those
three runes' emitted structure is a contract `design-context` depends on — composing them
changes that structure and breaks the extraction silently.

This is the first cross-rune output coupling any audit has turned up, and it means the
three display runes cannot be composed independently of `design-context`'s fate. They are
composable in isolation and not in place.

## `preview` — triply blocked, and in the wrong plugin

Three independent blockers, any one sufficient:

1. **A custom content model** — the plugin's only `type: 'custom'`.
2. **Behaviour-driven** — listed among the behaviour runes in
   `packages/svelte/src/registry.ts` (tabs, accordion, datatable, form, reveal, preview,
   details).
3. **A `postTransform` that serialises HTML.** `plugins/design/src/config.ts:95` calls
   `renderToHtml(contentChildren, { pretty: true })` to build a themed-source view, and
   its comment states why it cannot move: *"This must happen in postTransform (not the
   rune) because it needs the fully-transformed tree with BEM classes and structural
   elements."* Unlike `plot`'s `postTransform` ({% ref "SPEC-147" /%} Finding 1, which
   only sets a data attribute) there is no plausible declarative form for rendering a
   tree to a string.

And it is misfiled. The catalog describes it as *"Component preview with theme toggle and
adjustable width **for documentation**"* — a docs tool, not a design-domain rune, and
adjacent to `sandbox`, which lives in core.

**Third data point for the misfiled-capability pattern**, and the second where the
misfiled rune is behaviour-driven (`map` was the first). storytelling shed `storyboard`,
places dissolved around `map`, business had none, design has `preview`.

## The pipeline — half declarable, and the other half correctly imperative

| Hook | What it does | Declarable |
|---|---|---|
| `register` | Finds `design-context` runes, reads their `tokens` field, registers by `scope` | **Yes** — {% ref "SPEC-144" /%}'s `entity` with `idFrom: scope` |
| `aggregate` | Collects contexts into a `scope → DesignTokens` map | **Yes** — generic |
| `postProcess` | Finds every `sandbox`, reads its `context` attribute, injects a `design-tokens` meta into that sandbox's children | **No** |

The `postProcess` is a different animal from storytelling's. That one was generic entity
auto-linking, which {% ref "SPEC-147" /%} Finding 4 promotes to core because nothing in it
knew about stories. This one is a **specific wiring between two named runes** —
`design-context` feeding `sandbox` — and `sandbox` is a client-lifecycle rune composition
can never produce. There is nothing generic to promote; it is plugin logic doing exactly
what plugin logic is for.

That is a useful contrast to record: *an imperative `postProcess` is a candidate for
promotion when it is domain-agnostic, and correct as it stands when it wires two named
runes together.*

## Verdict — design stays a plugin

Not "retires later" or "dissolves". Of its seven runes:

- `swatch` and `mockup` could compose, and gain little from it — they are small and
  already declarative
- `palette`, `spacing` and `typography` could compose in isolation but not in place,
  because `design-context` reads their output
- `preview` belongs elsewhere and cannot compose regardless
- `design-context` cannot compose and should not

Removing `preview` would leave a coherent plugin whose core is a computation over its own
runes' output, wired to an interactive core rune. That is precisely what the plugin
mechanism exists for, and {% ref "ADR-036" /%} already names it as the escape hatch for
anything composition cannot express.

## Decisions

### D1 — design is not a composition target

Recorded so it is not re-examined every time the composition vocabulary grows. The
blocker is `design-context`'s nature, not a missing feature, and the three display runes
are coupled to it.

### D2 — a rune whose output is derived data cannot be composed

The fourth blocker category, alongside a peer schema type ({% ref "SPEC-145" /%} D9), a
required parent (D12) and a client lifecycle ({% ref "SPEC-148" /%} D3). Added to the
authoring guide's list of what disqualifies a rune, because `design-context` demonstrates
it is not visible from the rune's description.

### D3 — `preview` moves out of design

To core beside `sandbox`, or to the docs plugin. It is a documentation tool by its own
description, and its three blockers are independent of where it lives. Relocation does
not require composition to exist.

### D4 — an imperative `postProcess` is judged by whether it is domain-agnostic

storytelling's auto-linking is promoted to core ({% ref "SPEC-147" /%} Finding 4);
design's sandbox-token injection stays plugin code. The test is whether the hook names
specific runes, not whether it is imperative.

### D5 — the per-property method applies only where a rune emits schema

Stated as a precondition. Design's audit is decided by content model, behaviour and
pipeline alone, and a future audit should check for schema tables before reaching for the
five-path table.

## Implementation notes, deliberately not yet work items

1. **Relocate `preview`** to core beside `sandbox`, or to docs. Independent of everything
   else here, and the only item with a clear payoff.
2. **Leave the rest.** No composition work is proposed for design. If `palette`,
   `spacing` or `typography` are ever composed, `design-context`'s extractors must move
   to reading a declared field rather than walking output trees — a prerequisite, not a
   side effect.

## Non-goals

- Composing any design rune; the plugin stays (D1)
- Promoting design's `postProcess` to core (D4)
- Changing `design-context`'s token extraction; it is cited as correct for what it does
- Auditing the remaining plugins (`learning`, `media`, `docs`, `marketing`)

## Acceptance Criteria

- [ ] `preview` renders from its new home with its existing fixtures unchanged, including the themed-source `postTransform` (D3)
- [ ] The authoring guide lists all four disqualifying properties, with `design-context` named as the example for derived-data output (D2)
- [ ] The authoring guide records the per-property method's precondition (D5)
- [ ] `plugins/design/` still builds and passes its tests after `preview` leaves
- [ ] If any display rune is later composed, `design-context` reads a declared field rather than walking its children's output, asserted by a test that changes the child's structure and expects the tokens to survive

## References

- {% ref "SPEC-147" /%} — the storytelling audit; the `segmented` model `palette` and `spacing` would need, and the promotable `postProcess` this one contrasts with
- {% ref "SPEC-148" /%} — the places audit; the per-property method and the client-lifecycle blocker `preview` shares with `map`
- {% ref "SPEC-149" /%} — the business audit; the plugin with nothing misfiled, against which this one has `preview`
- {% ref "SPEC-145" /%} — composed runes; the mechanism audited
- {% ref "SPEC-144" /%} — entity registration; covers design's `register` and `aggregate`
- {% ref "ADR-036" /%} — the plugin escape hatch, which design is a correct use of
- {% ref "SPEC-151" /%} — the marketing audit; corroborates the derived-data blocker in a second plugin

{% /spec %}
