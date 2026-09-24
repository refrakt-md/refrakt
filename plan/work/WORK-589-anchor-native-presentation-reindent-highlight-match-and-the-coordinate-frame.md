{% work id="WORK-589" status="in-progress" priority="medium" complexity="moderate" source="SPEC-131" tags="snippet, file-ref, resolver, presentation, highlight, drift" milestone="v0.37.0" %}

# Anchor-native presentation — reindent, highlight-match, and the coordinate frame

Anchoring makes nested targets easy for the first time — a class method, a key
inside `"scripts"`, a rule inside `@media`, a step under `jobs:`. Two existing
attributes are defined in terms of `lines=` and stop making sense under an
anchor, and one new attribute is needed because the old form re-couples the
invocation to the coordinates the spec exists to decouple it from.

Small, and it is a prerequisite for two later items rather than a tail:
{% ref "WORK-590" /%}'s byte-identical check has an ordering constraint against
`reindent`, and {% ref "WORK-591" /%}'s hash normalization begins with it.

## `reindent` (D16)

Strip the slice's common leading whitespace. Every nested target carries one or
two levels of indentation it did not ask for and renders with a ragged left edge
that wastes horizontal space a code block does not have.

Removing the *common* prefix preserves relative structure exactly, so the result
stays valid in indentation-significant languages: a dedented Python method is a
function, a dedented YAML subtree is that subtree rooted.

**The default follows the addressing mode**, for the same reason D9's does. An
author writing `lines="10-40"` has seen the file and chosen those columns;
changing how they render would be a silent visual change to all 23 existing
invocations. An author writing `symbol="…"` never saw a column number — the
resolver picked the region, so it owns presenting it legibly.

## The coordinate frame stays (D13)

`linenumbers` and numeric `highlight` are currently *defined* in terms of
`lines=`. Remove `lines=` and neither has a frame. The resolver already produces
a `[start, end]` in file coordinates, so keep it: `linenumbers` continues to
start at `start`, `highlight` continues to mean file lines. No new concept, no
breakage, and the displayed numbers stay meaningful as a pointer back into the
real file.

What changes is that a *numeric* `highlight` under an anchor is no longer
something an author can write from knowledge. Hence `highlight-match=`: one or
more regexes, each highlighting the lines they match within the resolved slice.

Numeric `highlight` stays legal and stays useful with `lines=`. Under an anchor
it carries the old exposure, and the docs should say so plainly rather than
forbidding it.

## Acceptance Criteria

- [x] `reindent` strips the slice's common leading whitespace, defaulting on for `symbol` / `match` and off for `lines`, covered by a test on a nested target
- [x] `reindent=false` and `reindent=true` force either way
- [x] A dedented indentation-significant slice remains structurally valid, covered by a Python method and a YAML subtree
- [x] `linenumbers` and numeric `highlight` stay in file coordinates under an anchor
- [x] `highlight-match` accepts one or more regexes and highlights matching lines within the resolved slice
- [x] The docs state that numeric `highlight` under an anchor carries the coordinate exposure anchoring otherwise removes
- [x] `reindent` is applied after the resolved `[start, end]` is fixed, so it never shifts the coordinates `linenumbers` and `highlight` read

## Approach

Keep `reindent` as a distinct post-resolution step with its own entry point,
rather than folding it into extraction. {% ref "WORK-590" /%} must compare
slices *before* it runs and {% ref "WORK-591" /%} must hash *after* it runs —
both need to call the pipeline at a chosen point, which an inlined transform
does not allow.

## Blocked by

- {% ref "WORK-587" /%} — there is no resolved slice to present without it

## Notes

The ordering constraint is worth stating twice because it is easy to get
backwards and produces a confusing failure in each direction:

- {% ref "WORK-590" /%}'s codemod verifies a rewritten invocation produces a
  **byte-identical slice**. That comparison runs **before** `reindent`, or every
  nested target fails verification for a difference the codemod introduced.
- {% ref "WORK-591" /%}'s hash applies `reindent` **first**, so that moving a
  function into a class — which shifts every line two columns without changing a
  character of content — does not fire the marker.

## References

- {% ref "SPEC-131" /%} — D13 (`highlight` / `linenumbers` keep file coordinates; `highlight-match` is the anchor-native form), D16 (`reindent`, its default, and the codemod interaction)
- {% ref "SPEC-134" /%} — normalization step 1, which is this item's `reindent`
- `packages/runes/src/tags/snippet.ts` — the schema carrying `linenumbers` and `highlight`, and their `lines=`-framed descriptions

{% /work %}
