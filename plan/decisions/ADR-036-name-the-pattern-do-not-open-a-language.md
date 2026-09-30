{% decision id="ADR-036" status="proposed" date="2026-09-28" source="SPEC-143" tags="runes, declarative, hosted, security, dx, api-design" %}

# Name the pattern; do not open a language

## Context

A hosted refrakt cannot ship a plugin for every domain. Users will need to define
runes for their own — and {% ref "SPEC-143" /%} shows how close that already is:
across the storytelling plugin's eight runes, the entire imperative residue is one
custom content model and one `postTransform`.

The recurring temptation, each time a declarative form falls short, is to reach for
a small language: an expression syntax, a template language, a DSL in a code fence.
Each reach is locally reasonable and the aggregate is a second implementation of
JavaScript with worse error messages.

This ADR settles the default so it does not have to be re-argued per gap, and
names the one place a grammar is warranted.

## Decision

**When a declarative form falls short, extend a closed vocabulary. Do not
introduce an expression language, a template language, or a general DSL.**

The codebase already does this, twice, and both are the pattern to copy:

- `styles[…].transform` had a function form and gained
  `'duration' | 'uppercase' | 'capitalize'` — a closed enum resolved in
  `engine.ts:1130`. {% ref "WORK-608" /%} finishes the job: 11 function-form sites
  resolve to exactly 3 helpers, so naming them retires the function form entirely.
- `contentModel` had a thunk form `(attrs) => …` and gained
  `ConditionalContentModel`'s `when` over `AttributeInCondition` /
  `AttributeExistsCondition` / `HasChildCondition` — typed conditions rather than
  arbitrary predicates.

Each addition to a closed vocabulary is a reviewed, documented, schema-validated
thing with a name. Each addition to a language is a new way to be surprised.

**The one exception: a restricted pattern grammar where `itemModel`'s regex sits.**
`pattern: /…/` (8 sites) is where the list-item authoring grammar lives
({% ref "BUG-031" /%}), and it cannot simply be enumerated — the space of item
shapes authors want is genuinely open. A user-supplied regex in a hosted renderer
is a ReDoS vector, so that field needs either a timeout-guarded engine or a
restricted grammar. A restricted grammar is the better answer: bounded,
non-backtracking, safe by construction rather than by watchdog. It is a grammar
for splitting one line of text, not a language for defining runes, and its scope
is exactly that.

## Consequences

- **The security story stays the one SPEC-143 bought.** A user rune is "data to
  validate, not code to sandbox": no `eval`, no VM, no worker isolation, no
  dependency surface. An expression language gives that back, whatever its
  authors intend, because the evaluator becomes a trust boundary.
- **The escape hatches remain, and remain imperative.**
  `contentModel: { type: 'custom', processChildren }` (14 sites) and
  `postTransform` (4 sites) stay functions by design
  ({% ref "SPEC-003" /%}, {% ref "SPEC-081" /%} non-goals). That makes a hosted
  rune necessarily a *subset* of what a plugin can express, and SPEC-143 D4's
  family test is the published boundary of that subset rather than an internal
  heuristic. This is the good outcome, not a gap to close.
- **Each gap costs a named decision.** Extending a vocabulary means someone must
  name the thing and write it down, which is slower than shipping an expression
  syntax and is the point: the enum is the documentation.
- **Some users will be unable to express their domain declaratively.** The honest
  answer for them is a plugin, published as a package — not a richer language in
  the definition file. The path from a composed rune ({% ref "ADR-037" /%} makes that
  the one user-facing form) to a plugin should therefore stay open and documented.
  It is also the answer for a rune needing its own visual form or its own CSS, since
  a composed rune has neither.
- **Composition is the pressure valve, not a language.** Where a domain type is
  structurally a familiar shape, {% ref "SPEC-145" /%} lets it be assembled from
  primitives rather than described in a DSL. Most of what would motivate an
  expression language is really a request for composition.

## Alternatives considered

**A small expression language for computed fields.** The motivating cases —
fallback chains (`attrs.created ?? file.created ?? ''`), a joined list, a
formatted duration — are each a named data form or a named transform. SPEC-143's
`from: ['attrs.created', 'file.created']` covers the first without an evaluator.
Rejected because the cases that look like they need expressions turn out, on
inspection, to be a handful of shapes.

**A general template DSL in a code fence.** Rejected: it is either weak enough to
be a vocabulary in worse clothing, or strong enough to be a sandbox problem.
Markdoc is already a template language, already parsed, already safe — which is
why SPEC-145 reaches for `include`'s existing AST substitution instead of a new
syntax.

**Turing-complete sandboxed JS (QuickJS/WASM).** Rejected for hosted rune
definitions: it solves expressiveness by importing an execution environment, its
dependency surface, and a resource-limit story, in exchange for a capability the
measured residue says is needed by ~4% of runes.

**Keep regexes, add a timeout.** Rejected as the primary answer for `itemModel`,
though it may be a stopgap: a watchdog makes a bad pattern slow rather than
impossible, and the failure mode (a build that times out on some content) is worse
to diagnose than a pattern rejected at authoring time.

## Checked while scoping

- `packages/transform/src/types.ts:120`, `:574`, `packages/transform/src/engine.ts:1130` —
  the named-transform enum and its resolution
- `plugins/learning/src/config.ts:35` — the string form already in use in config
- `plugins/storytelling/src/tags/*.ts` — one `type: 'custom'` across eight runes
  (`storyboard`), and one `postTransform` in `config.ts:243`
- `packages/runes/src/tags/include.ts` — `variables` as paste-time substitution, the
  mechanism SPEC-145 extends rather than replaces

## References

- {% ref "SPEC-143" /%} — declarative slot labelling; where the residue was measured
- {% ref "SPEC-144" /%} — declarative entity and edge registration; a closed vocabulary applied to the cross-page pipeline
- {% ref "SPEC-145" /%} — composed runes; the pressure valve this ADR relies on
- {% ref "WORK-608" /%} — retires the last non-`postTransform` function in `RuneConfig`
- {% ref "BUG-031" /%} — the item-model authoring grammar, and why the one exception exists
- {% ref "ADR-035" /%} — `rejected`; cited here for its rot principle, which survives the format
- {% ref "ADR-037" /%} — users author composed runes only; which makes composition the graduation path's starting point

{% /decision %}
