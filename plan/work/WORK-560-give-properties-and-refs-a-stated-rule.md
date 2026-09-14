{% work id="WORK-560" status="ready" priority="medium" complexity="simple" source="SPEC-133" tags="runes,transform,contract,docs" milestone="v0.35.0" %}

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

- [ ] `output-contract.md` states the `properties` / `refs` rule as a predicate an author can apply to a node without reading the engine
- [ ] The same page describes what the catalog emits today, including that `data-field` survives on elements, rather than only the meta-carrier case
- [ ] The postprocess sentinels are named as a documented exception rather than left as a footnote in {% ref "SPEC-082" /%}
- [ ] The three schema-relevant idioms are spelled out: a value-only source belongs in `properties`, a node the schema stamps in place belongs in `refs`, and a node that is both needs an entry that gives it a name
- [ ] No rune transform, config entry or stylesheet changes

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

{% /work %}
