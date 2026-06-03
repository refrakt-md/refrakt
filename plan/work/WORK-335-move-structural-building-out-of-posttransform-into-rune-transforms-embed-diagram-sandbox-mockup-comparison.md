{% work id="WORK-335" status="done" priority="medium" complexity="complex" source="SPEC-081" tags="runes,engine,postTransform,computation-boundary,cleanup" %}

# Move structural building out of postTransform into rune transforms (embed/diagram/sandbox/mockup/comparison)

Apply the {% ref "SPEC-081" /%} computation boundary to the five runes whose
engine `postTransform` hand-builds **deterministic, theme-invariant structure
from self-emitted data** — the same misplacement {% ref "WORK-326" /%} fixed for
budget. (Chart is excluded — its rendering is a genuine variation point and gets
its own design in {% ref "SPEC-083" /%}.)

## Background — the shared anti-pattern (2026-06-03 investigation)

Each rune's transform is a thin meta-emitter; the engine `postTransform` reads
those values back and builds the real markup. By SPEC-081's test — *"does it
need the assembled, theme-shaped tree?"* — **none of them do**; they read their
own fields (now the bag, via {% ref "WORK-331" /%}'s reroute) plus children that
already exist at transform time. They are post-engine only "because they happen
to be," exactly like budget.

- **embed** — builds `__wrapper` + iframe, computes `paddingPercent` from aspect;
  also manually filters its own consumed metas.
- **diagram** — builds figcaption + container + hidden source, renames to the
  `rf-diagram` web-component tag, sets `data-language`.
- **sandbox** — wraps fallback/source in `<template>`s, renames to `rf-sandbox`,
  sets many `data-*`.
- **mockup** — builds device-frame chrome (notch / bezel / status bar / URL)
  from the `device` value; manually filters consumed metas.
- **comparison** — transposes column children into a table/card layout.

Two flavours: **static** (embed, mockup, comparison — the `postTransform` output
is the final markup) and **web-component glue** (diagram, sandbox — build the SSR
fallback + `data-*` and hand off to a `behaviors` element). Both are deterministic
from authored data and movable into the transform (the transform can emit
custom-element tags + `<template>`s).

## Acceptance Criteria

- [x] embed, diagram, sandbox, mockup, comparison build their structure in the
  rune transform (emitting structural slots / `data-name`, letting the engine
  apply BEM via `layout` / `autoLabel`), not in engine `postTransform`.
- [x] Each rune's `postTransform` is removed (or reduced to only genuinely
  presentation-dependent residue, if any is found).
- [x] These runes stop emitting the field-metas that existed only to ferry data
  to `postTransform` — closing them out of the {% ref "WORK-331" /%} problem.
- [x] **Nested-node case**: `comparison`'s column-level `highlighted` (a child's
  field, currently read off the column's meta because the column's own bag is
  stripped before the parent's `postTransform`) is handled — e.g. the comparison
  transform reads it from the column renderable directly.
- [x] Per-rune output parity, verified before/after on a rich example (the budget
  method); full suite + both structure contracts green.

## Approach

- Per rune, do what {% ref "WORK-326" /%} did for budget: lift the
  `postTransform` body into the transform, reading values from locals it already
  has instead of round-tripping through metas; emit the structure directly.
- For diagram/sandbox, emit the custom-element tag + `<template>` fallback in the
  transform; set `data-*` from modifiers via engine config where possible.
- Verify each rune independently (build → inspect/render before vs after).

## Dependencies

- {% ref "WORK-331" /%} — the bag-first reroute already moved value-reads off the
  metas; this removes the metas (and the hooks) entirely for these runes.

## References

- {% ref "SPEC-081" /%} — declarative structure assembly / computation boundary.
- {% ref "WORK-326" /%} — budget: the worked example of this exact move.

## Resolution

Completed: 2026-06-03

Branch: claude/rune-contract-hardening

### What was done
Migrated all five runes' structure-building out of the engine postTransform and
into their rune transforms (the budget/WORK-326 move), per the SPEC-081
computation boundary. Each now builds its structure directly and emits no
field-metas; the engine postTransform is removed.

- **embed** — transform builds wrapper/iframe + a single fallback (the old
  postTransform double-wrapped it — fixed); provider is a bag-only modifier.
- **diagram** — emits the rf-diagram custom element + SSR fallback; language is
  a bag-only modifier. Also hardened the source channel to an inert <template>
  (so a future highlighted <pre> can't corrupt the renderer's input).
- **comparison** — the heaviest: the transform now builds the table/cards
  directly from the parsed column/row AST tags (no intermediate column
  renderables, no postTransform). Resolved the WORK-331 nested-column
  highlighted gap for free (read straight from the AST attribute). Removed the
  dead comparison helper cluster from marketing config.
- **mockup** — device-frame chrome built in the transform; element classes from
  data-name (prefix-correct BEM), and the 6 compound element-modifier classes
  converted to data-* variant attributes (data-notch / data-light) with the CSS
  rules rewritten to match (user-approved convention alignment).
- **sandbox** — emits the rf-sandbox element with its config on data-*
  attributes + the two inert <template>s directly; dropped the discarded
  source-panel meta wrappers and the vestigial context/designTokens fields.

### Notes
- Output parity verified per-rune via before/after renders. All are
  visually/byte identical except: (a) invisible data-name attrs added, (b) SEO
  metas reorder, (c) the embed double-fallback fix, and (d) mockup's deliberate
  CSS change (compound classes -> data-* variants, visually identical).
- Side effect: these five also stop emitting field-metas, so they drop out of
  the WORK-331 meta-channel problem entirely.
- Chart deliberately excluded (its own design, SPEC-083).
- Full suite green (3074); both structure contracts regenerated/unchanged.

{% /work %}
