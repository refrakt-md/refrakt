{% work id="WORK-560" status="done" priority="medium" complexity="simple" source="SPEC-133" tags="runes,transform,contract,docs" milestone="v0.35.0" pr="refrakt-md/refrakt#607" %}

# Give properties and refs a stated rule

State the rule that decides which map a node belongs in, and correct the
authoring docs to describe what the catalog actually emits. **Documentation and
a lint, not a migration** — none of {% ref "SPEC-133" /%}'s ~97 node moves
happen here.

This is in this milestone for one reason: {% ref "WORK-561" /%} has to choose a
map for roughly ten nodes, and without a stated rule those choices get made ad
hoc and re-made later.

## Why it is only the rule

{% ref "SPEC-133" /%} is a draft whose own last open question is *"is this worth
doing at all?"*. Its sweep changes HTML across many runes and breaks the
component-override interface for the ones whose content markers become slots.
None of that belongs in front of an accepted spec that fixes live defects.

But the sweep and the rule are separable, and the rule is free. Stating it costs
a docs edit; not stating it costs {% ref "WORK-561" /%}, {% ref "WORK-568" /%}
and {% ref "WORK-570" /%} each inventing their own answer.

## Scope

The rule, as {% ref "SPEC-133" /%} states it:

- **`refs`** — any node that survives into the output and should be addressable.
  Gets `data-name` and a BEM element class.
- **`properties`** — values only. The value reaches the bag; the carrier is an
  implementation detail that disappears.

`site/content/extend/rune-authoring/output-contract.md` currently documents one
of the six things `data-field` does, under a table whose last row says the
carrier is *"removed from output"*. 111 of 196 `data-field`s in the catalog are
on elements that survive. Correct the table to describe today's reality **and**
state the rule as the one to author against — the gap between them is the work
SPEC-133 is about, and naming it is more useful than pretending it closed.

## Acceptance Criteria

- [x] `output-contract.md` states the `properties` / `refs` rule as a predicate an author can apply to a node without reading the engine
- [x] The same page describes what the catalog emits today, including that `data-field` survives on elements, rather than only the meta-carrier case
- [x] The postprocess sentinels are named as a documented exception rather than left as a footnote in {% ref "SPEC-082" /%}
- [x] The three schema-relevant idioms are spelled out: a value-only source belongs in `properties`, a node the schema stamps in place belongs in `refs`, and a node that is both needs an entry that gives it a name
- [x] No rune transform, config entry or stylesheet changes

## Approach

Resist scope. The tempting additions — fixing the kebab/camelCase `data-field`
split, moving the first batch of content markers, deleting the dead `Page` node
— are all {% ref "SPEC-133" /%}'s, and pulling any of them in imports its wide
HTML diff into a milestone whose risk profile is otherwise "structured data
only, HTML unchanged".

The one judgement call worth recording here rather than deferring: a node that
is *both* structural and value-bearing (`<time data-field="date">`). Under the
rule it is a ref, and its value reaches the schema by the applier stamping the
node in place — which is exactly the resolution strategy
{% ref "WORK-565" /%} builds. So SPEC-133's third open question has an answer
once the applier exists, and this item should say so rather than leave the
authoring docs silent on the case that recurs most.

## Blocks

- {% ref "WORK-561" /%}

## References

- {% ref "SPEC-133" /%} — the rule, the measurements, and the sweep this defers
- {% ref "SPEC-082" /%} — carved the postprocess sentinels out by hand
- {% ref "ADR-008" /%} — the flat namespace both maps share
- `site/content/extend/rune-authoring/output-contract.md` — the page to correct

## Resolution

Completed: 2026-09-15

Branch: `claude/v0.35-parallel-feasibility-eia5le`

### What was done

`site/content/extend/rune-authoring/output-contract.md` — the "Properties vs
Refs" section rewritten. Docs only; no transform, config or stylesheet changed.

- **The rule, as a predicate.** "Does this node survive into the rendered HTML?"
  Survives and might be addressed → `refs`. Exists only to carry a value →
  `properties`. Stated before the mechanism table so an author can apply it
  without reading the engine.
- **What the catalog actually emits.** The existing table's "meta tag removed
  from output" row describes one case out of several. Most `data-field`
  attributes in the catalog are on elements that survive. Names the trap
  explicitly: the discriminator is `n.name === 'meta'`, not the author's choice
  of map, so a non-meta in `properties` behaves like a ref that forgot its BEM
  class and nothing warns.
- **Postprocess sentinels** given their own subsection as a documented
  exception, naming the runes that use it, rather than remaining a footnote in
  SPEC-082.
- **The three schema-relevant idioms** as a table: value-only source →
  `properties`; a node the schema stamps in place → `refs`; both (the
  `<time data-field="date">` case) → `refs` with a named entry, so the schema
  reaches it by name rather than by attribute. Records SPEC-133's third open
  question as answered by the applier WORK-565 builds.
- **One line carried over from WORK-564**: CSS selects the BEM element class,
  never `[property=...]`, and that is now enforced by a test.

### Notes

- **Numbers deliberately not quoted.** SPEC-133 measured 196 `data-field`
  carriers across 95 runes, 111 surviving. Re-measuring through `refrakt inspect`
  today over 126 runes gives 280 carriers, 89 metas, **191 surviving** — the same
  shape, a different catalog scope. Pinning either figure into user-facing docs
  would just create a second thing to drift, so the page states the shape and
  gives the command to reproduce it.
- Scope held: none of SPEC-133's ~97 node moves, no `contentSection` removal, no
  casing fix. Those carry a wide HTML diff and a breaking component-interface
  change, which is SPEC-133's character and not this milestone's.
- The page tells authors to write against the rule rather than against the
  catalog, and says migration is in progress — otherwise the "what it emits
  today" section reads as licence to copy the current shape.

### Verification

`npm run content:check-links`, `npm run runes:check-docs`, `npm run format:check`
all clean; `npx vitest run scripts/ packages/lumina/test/css-coverage.test.ts` —
284 tests passing.

{% /work %}
