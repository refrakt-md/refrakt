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

**Both consolidations are unfinished, and the numbers say how unfinished.** Stating
them here rather than implying a banked win, because a closed vocabulary nobody
adopted is a worse position than the function form it replaced — the gap reads as
the enum being inadequate when it is not.

| Vocabulary | Adopters | Function form remaining |
|---|---|---|
| named `styles[…].transform` enum | in use (`learning/config.ts:35`) | 11 sites → exactly 3 helpers ({% ref "WORK-608" /%}) |
| `ConditionalContentModel`'s `when` | 2 — `steps`, `itinerary` | **15 thunk sites**, of which **only 3 read `attrs`** |

The three that read `attrs` are `breadcrumb.ts:52`, `symbol.ts:156` and
`bento.ts:383`. The other twelve are `() => ({ … })` returning a constant, so they
are noise rather than capability — flattening them is pure deletion. And
`ContentModel`'s union has **no function member**, so all fifteen sites are reaching
an untyped escape rather than a supported form. {% ref "SPEC-157" /%} D4 is where
that measurement was taken, and where a prior draft wrongly proposed inventing the
shape this enum already is.

**Of the three, only two branch, and the third cannot be converted at all.** An
earlier revision of this paragraph read *"flatten twelve, convert three"*, which
assumed reading `attrs` and branching on them were the same thing. Read:

| Site | What it does with `attrs` | Converts to |
|---|---|---|
| `breadcrumb.ts:52` | `if (attrs.auto)` → one of two `sequence` models | `AttributeExistsCondition` |
| `symbol.ts:156` | `if (GROUP_KINDS.includes(attrs.kind))` → one of two models | `AttributeInCondition` |
| `bento.ts:383` | returns **one** `custom` model that closes over the values | **nothing** |

`bento` uses `attrs['media-position']` and a seven-key `GRID_CASCADE` *inside*
`processChildren`, to default grid-level chrome onto cells. `ConditionalContentModel`
chooses between models; it does not parameterise one. So the consolidation is **flatten
twelve, convert two, and one site stays a function.**

**Which leaves a real gap this ADR should not paper over.** `styles[…].transform` can be
fully retired by {% ref "WORK-608" /%} because its 11 sites resolve to 3 named helpers.
`contentModel` cannot: after the migration one legitimate consumer still needs a
function, and the union still has no function member for it to sit in. The three honest
options are to admit a function member to the union for the parameterised case, to give
`custom` a declared way to receive attribute values, or to leave `bento` on an untyped
escape and say so. This ADR picks none of them yet, and that is this entry's open item
beside `itemModel`'s grammar — a smaller one, with no security edge, but owed to the same
reader who is told the function form is going away.

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

**The exception has no owner, and that is the one thing about this ADR that should
worry a reader.** {% ref "ADR-035" /%} was `rejected` largely because its central
obligation was owed to a "follow-on spec" that was never written; this exception is
in the same position, and it carries a security rationale rather than a
convenience one. Nothing specifies the grammar, {% ref "BUG-031" /%} is a
reference-generation defect rather than this, and the hosted story depends on it:
until it exists, `itemModel`'s `pattern` is either closed to user-authored runes or
open as a ReDoS vector. The two honest interim positions are to say which, and
this ADR currently says neither.

The eight sites are not a small corpus, either — `playlist`'s item model alone
carries four patterns across two nesting levels ({% ref "SPEC-155" /%}), so the
grammar has to cover nested extraction rather than one flat line.

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
- **Which makes the names themselves a cost this ADR has to police.** Two closed
  vocabularies already spell the same idea differently: a conditional content model
  is `when` / `default`, and {% ref "SPEC-130" /%}'s variant schema is `by` / `rows`
  / `fallback`. Both mean "pick a shape from an attribute's value, with a
  fallback". {% ref "ADR-018" /%} exists because exactly this drift happened to the
  layout tokens, and "the enum is the documentation" fails if one enum documents
  itself in two dialects. Aligning them is cheap now and a migration later.
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
- **Re-verified on review**: `postTransform` is 4 (`runes/config.ts:494`, `:509`,
  `design/config.ts:95`, `storytelling/config.ts:243`), `pattern: /` is 8, and
  `type: 'custom'` is 14 across rune modules — all three as stated. A first
  re-count said 16 for `custom`; it wrongly included `reference.ts`, which is
  tooling rather than a rune content model.

## References

- {% ref "SPEC-143" /%} — declarative slot labelling; where the residue was measured
- {% ref "SPEC-144" /%} — declarative entity and edge registration; a closed vocabulary applied to the cross-page pipeline
- {% ref "SPEC-145" /%} — composed runes; the pressure valve this ADR relies on
- {% ref "WORK-608" /%} — retires the last non-`postTransform` function in `RuneConfig`
- {% ref "BUG-031" /%} — the item-model authoring grammar, and why the one exception exists
- {% ref "ADR-035" /%} — `rejected`; cited here for its rot principle, which survives the format
- {% ref "ADR-037" /%} — users author composed runes only; which makes composition the graduation path's starting point
- {% ref "ADR-039" /%} — where a rune lives; the three package kinds the graduation path now lands in
- {% ref "SPEC-157" /%} — the docs audit; where the conditional content model's adoption gap was measured
- {% ref "ADR-018" /%} — the canonical layout vocabulary; the precedent for policing enum spellings
- {% ref "SPEC-130" /%} — the variant schema, whose `by` / `rows` / `fallback` is the diverging spelling

{% /decision %}
