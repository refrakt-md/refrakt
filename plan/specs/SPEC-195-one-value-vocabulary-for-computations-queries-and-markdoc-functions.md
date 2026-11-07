{% spec id="SPEC-195" status="draft" tags="vocabulary, functions, query, composition, content-model, values, architecture" %}

# One value vocabulary for computations, queries and Markdoc functions

## Summary

refrakt does the same small set of operations on values in many places, each with its own
syntax and its own implementation: testing a condition, adding numbers up, splitting a comma
list, picking the first non-empty value, formatting a date. This spec makes them **one
vocabulary of registered functions**, written in Markdoc's own call syntax wherever an
expression is written, with the {% ref "SPEC-070" /%} filter grammar as the one predicate
language inside it.

An author learns two things:

1. **Functions**, written `sum($attrs.prepTime, $attrs.cookTime)`. The same names work in a
   definition's frontmatter, in a template and in a page.
2. **The filter grammar**, written `status:done tags:data`. It is how `filter=` is written,
   and `matches()` makes it usable inside any expression.

**Where an expression is written decides what its result is**, not which function it calls:
under `computes` it is a field of the rune, in a template or page it is display text.

## Prerequisites

| Needs | From | State on 2026-11-07 |
|---|---|---|
| Value kinds (duration, amount, number, date) and their formatters | {% ref "SPEC-166" /%} | draft |
| `computes` and the input/template split | {% ref "SPEC-194" /%} | draft |
| The query seam and core gaps (comparison, existence, dotted paths, `measure`) | {% ref "SPEC-138" /%} | draft |

D1, D2, D5 and D6 can start before SPEC-166 lands, with values treated as strings. Typed
reductions and comparisons (D4's value and reduction rows) need it.

## What exists, measured

- **Six registered functions** (`packages/runes/src/functions.ts`): `currency`, `date`, `number`,
  `join`, `concat`, `humanize`. `currency`, `date` and `number` hard-code `LOCALE = 'en-US'`;
  SPEC-166 D6.6 already routes them through the kind formatters.
- **Markdoc's built-ins** (`@markdoc/markdoc/src/functions/index.ts`): `and`, `or`, `not`,
  `equals`, `default`, `debug`. Two semantics matter here:
  - `default(a, b)` takes exactly two arguments and returns `b` only when `a` is
    `undefined`; an empty string passes through.
  - `or` returns a boolean, not the first truthy value.
- **`ConfigFunction` already carries signatures**: `parameters`, `returns` (a `ValidationType`,
  which may be a custom type) and `validate`. Typed functions need no new mechanism.
- **Templates already evaluate function calls.** Composition expansion substitutes `$attrs` and
  `$each` inside a function's parameters and leaves the call for Markdoc's transform
  (`packages/runes/src/lib/composition.ts`, `substitute`).
- **Predicates are written three ways:**
  - SPEC-070 strings at seven query call sites (`packages/runes/src/field-match.ts`);
  - `ConditionalContentModel` conditions: `attribute in`, `exists`, `hasChild`
    (`packages/types/src/content-model.ts`);
  - `metaFields.*.condition`, which tests truthiness only.
- **Comma lists are split in at least six places:**
  - `field-match.ts` (`candidates`);
  - `metaFields.*.splitOn`;
  - `codegroup`, `compare` and `juxtapose` `labels`;
  - `conversation` `speakers`.

  BUG-025 (grouping by `tags`) is the one place a list is *not* split and should be.
- **Durations are parsed twice:** `parseIsoDuration` (`packages/transform/src/engine.ts`) and
  `parseDuration` (`plugins/media/src/duration.ts`).
- **Reductions:** `aggregate` counts (`aggregate-resolve.ts`), `budget` sums privately
  (`computeSubtotal`), and SPEC-138 plans `measure="sum|avg|min|max:<field>"`.

## Decisions

### D1: one registry, written in three places

Every operation is one registered function with one implementation:

| Place | Who writes there | Form |
|---|---|---|
| a definition's frontmatter: `computes`, `when`, `metaFields.*.condition` | rune authors | Markdoc call syntax, in a YAML string |
| a template or a page | rune, theme and page authors | Markdoc call syntax, as today |
| `filter=`, `where`, `entityRoutes.filter` | page and site authors | the SPEC-070 grammar, unchanged |

The query surface keeps its own grammar (D7), and that grammar is reachable from the other two
through `matches()` (D5). Nothing else is a third syntax.

### D2: the place decides what the result is

The same call means different things depending on where it is written:

| Written in | The result is | So it may |
|---|---|---|
| `computes` | a field of the rune | carry `metaFields` meaning, feed the schema row, be placed by the template; a replacement template cannot change or remove it |
| `when`, `condition` | a structural choice made in the input | select a content model, decide whether a field renders |
| a template or page | display text | be shown; never published, never a field |

So no function is restricted by where it may be called: a theme may display `sum(…)`. Only a
definition can make a value **meaningful**, which keeps {% ref "ADR-043" /%} (labels and
meaning are the definition's) and {% ref "ADR-045" /%} decision 4 (published data does not
depend on the template).

### D3: every function has a typed signature

- Each function declares `parameters` and `returns` through `ConfigFunction`. Value kinds
  (SPEC-166) are registered as custom `ValidationType`s, so `sum` reads as "durations to a
  duration, amounts to an amount, numbers to a number".
- `computes` expressions are checked when the definition loads:
  - an unknown function reports `function-unknown`;
  - an argument of the wrong kind reports `function-argument-kind`;
  - a result that does not match a declared `metaFields.*.metaType` reports
    `computes-kind-mismatch`.
- `refrakt reference` documents every function from its signature, so the vocabulary is
  listed the same way runes are.

### D4: the initial function set

| Family | Functions | Notes |
|---|---|---|
| Values | `duration()`, `amount()`, `number()`, `date()`, `coordinates()` as explicit coercions | an attribute declared with a `kind` arrives already typed; the coercions are for untyped sources. `duration` accepts clock times (`mm:ss`, `audio`'s chapters) as well as ISO 8601. `coordinates` is a new value kind for `map` and `map-pin`, to add to SPEC-166 |
| Arithmetic | `add`, `subtract`, `multiply`, `divide`, `mod`, `round`, `clamp` | named functions, not operators, so D9 holds. `progress` (value/max as a clamped, rounded percentage), `conversation` (`$index` mod the speaker count), `embed` (aspect-ratio padding), `drawer` (heading-level clamp) |
| Reductions | `count`, `sum`, `avg`, `min`, `max` | one implementation shared with SPEC-138's `measure`; each takes listed values or a repeated field (`sum($items.amount)`) |
| Lists | `split`, `item`, `size`, `join` | `split` and `item` follow D6's fan-out rule; `split` takes an optional delimiter (`grid`'s `c:r` spans) |
| Text | `first`, `text`, `humanize`, `basename`, `language`, `concat` | `first` returns the first non-empty argument, any number of them; Markdoc's two-argument `default` is left as it is. `text($slot)` is a slot's plain text (`progress`'s `aria-label`) |
| Choice | `if(condition, then, else)`, `lookup(table, key)` | `if` is a value, not control flow (`progress`'s display default, `codegroup`'s `name:lines` label). `lookup` reads a table declared in the definition (`showcase`'s attribute aliases, and the table behind `language`) |
| Predicates | `matches`, `equals`, `and`, `or`, `not` | `matches` is D5's bridge; the rest are Markdoc's own |
| Formatting | `currency`, `date`, `number` (existing) | they call SPEC-166's formatters and defer display text to stage 4, as SPEC-166 D6.4 requires of primitives |

*Extended 2026-11-07* with the arithmetic, choice, `text`, clock-time and `coordinates` entries,
from the measurement below. Not every one of them meets the two-adopter bar alone: `mod` and
`text` have one adopter each today. Arithmetic is admitted as a family, since its members share
one implementation and meaning. `text` is admitted because a slot's plain text is the input
`aria-label`s and summaries need; recheck it if no second adopter appears.

- **Admission.** A new function joins the set when it has at least two adopters, or when it
  closes a SPEC-138 core gap. A function one rune alone needs belongs in that rune's `prepare`
  stage (SPEC-194 D2).
- **`language`** maps a code-fence language to its display name. It is `codegroup`'s table,
  moved into the vocabulary because `compare` needs it too.
- **Candidates not admitted**, each with one adopter today:
  - **URL parsing** (host, query parameter, path rewrite) would move `embed` off its `prepare`
    stage;
  - **per-item search** (`find`, `some`: the first item with a link, whether any item is
    media) serves `actions` and `figure`, and may be better as content-model facts than as
    functions;
  - **collecting values from child runes** serves `design-context`, and is closer to a
    pipeline concern than to a function.

  Each is admitted when a second rune needs it.

**How many runes this serves, measured 2026-11-07.** Of the 66 runes that stay native after
every planned composition ({% ref "SPEC-194" /%}, "The native runes that remain"), 8 need this
vocabulary and nothing else: `grid`, `details`, `compare`, `conversation`, `progress`,
`actions`, `figure` and `map-pin`. `codegroup`, `juxtapose`, `audio` and `map` also use it
beside their behaviour or drawing. Only 6 of the 66 still need a `prepare` stage.

### D5: `matches()` makes the filter grammar the one predicate language

```md
{% if matches($attrs, "kind:class,interface,module") %} … {% /if %}
```

- `matches(value, query)` evaluates a SPEC-070 query against a record (`$attrs`, `$item`, a
  repeated slot's item), with the grammar's semantics unchanged. It is the same parser and
  matcher as `field-match.ts`.
- **`when` takes an expression:**

  ```yaml
  content:
    when:
      - if: matches($attrs, "kind:class,interface,module")
        model: { … }
  ```

  The existing condition objects (`attribute in`, `exists`, `hasChild`) stay valid. They are
  documented as shorthand, and a codemod rewrites them.
- **`metaFields.*.condition` takes an expression** as well as a bare attribute name. A bare
  name stays shorthand for "this attribute is non-empty".
- **SPEC-138's core gaps land in the grammar, not in functions.** Comparison, existence and
  dotted paths become part of SPEC-070, so `filter=` and `matches()` gain them at once.

### D6: one fan-out rule for comma lists

A comma list is a list. The rule is to split on `,`, trim each entry, and drop empty entries.
It applies everywhere a list is read:

- `field-match.ts`;
- `metaFields.*.splitOn`;
- `split` and `item`;
- BUG-025's grouping.

Where an existing call site differs (for example, keeping empty entries), the difference is
recorded in the work item and either adopted as the rule or removed.

### D7: queries keep their grammar and do not take expressions

`filter=` is resolved in the cross-page pipeline, against entities that do not exist when
Markdoc evaluates functions at stage 2. Markdoc's `and(…)` returns a boolean at once. A filter
needs a predicate it can apply later. Letting the same names mean "evaluate now" in a template
and "build a predicate" in a filter would confuse more than the second syntax costs. So:

- a query is a SPEC-070 string, as today;
- for what the grammar cannot express, SPEC-138's structured form (an engine plugin) is the
  route;
- `concat` stays for text, and the docs stop presenting it as the way to build filter strings
  once structured predicates exist.

### D8: frontmatter expressions, and how they meet `prepare`

- **A frontmatter expression is a YAML string**, parsed with Markdoc's attribute-expression
  parser so it has exactly the grammar a template has. *To verify in the first work item:*
  wrapping the string as an attribute of a throwaway tag and reading its AST.
- **A `computes` entry is one of two things:**

  ```yaml
  computes:
    totalTime: sum($attrs.prepTime, $attrs.cookTime)   # an expression: evaluated by the vocabulary
    single:    { type: boolean }                        # a declaration: filled by the rune's prepare stage
  ```

  A string is an expression. An object is a declaration that SPEC-194's `prepare` must fill. A
  rune may mix both. A rune whose every entry is an expression needs no `prepare` stage.
- **Scopes** available to a `computes` expression:
  - `$attrs`;
  - other computed values (`$computed`), with cycles reported as `computes-cycle`;
  - for a per-item key (`panels.label`): the item's emitted values (`$node`) and `$index`.

  Page variables are not available (see Open questions).

### D9: guardrails

These keep {% ref "ADR-036" /%} ("name the pattern; do not open a language") true:

- **Only packages register functions.** A site calls them and never defines one, as with
  `prepare` stages.
- **The grammar is Markdoc's and is not extended:** no operators, no lambdas, no iteration, no
  assignment. Per-item computation comes from the key (`panels.label`), not from a loop.
- **Deterministic only.** No function reads the clock or a random source, for the same reason
  SPEC-138 bans `$sample`: contracts and the SEO baseline are reviewed as diffs.
- **Nesting is linted.** An expression nested deeper than three calls reports
  `expression-depth`, a warning. It is the signal that a computation wants a dedicated function
  or a `prepare` stage.

## Worked examples

Each has a *query twin*: the same operation on the query side.

**`budget`: typed amounts and a sum.** Today: a custom model, a private `parseAmount` (which
counts a range "100–200" as its midpoint), and `computeSubtotal`.

```yaml
content:
  type: sequence
  fields:
    items:
      match: list
      itemModel:
        fields:
          - { name: description, match: text, pattern: '^(.+?)\s*:' }
          - { name: amount, match: text, pattern: ':\s*(.+)$', kind: amount }
computes:
  subtotal: sum($items.amount)
```

Twin: `{% aggregate … measure="sum:points" /%}`. Whether a range is its midpoint is the `amount`
kind's rule, decided once in SPEC-166.

**`codegroup`, `compare`, `juxtapose`: one label rule.** Today: three implementations, and the
first two disagree about the same fence ("JavaScript" vs "js").

```yaml
computes:
  panels.label: first(item($attrs.labels, $index), $node.label, basename($node.source), language($node.language))
```

Twin: D6's fan-out rule, which BUG-025 also needs.

**`symbol`: one predicate form.** Today: a content-model function branching on
`GROUP_KINDS.includes(attrs.kind)` (`plugins/docs/src/tags/symbol.ts`).

```yaml
content:
  when:
    - if: matches($attrs, "kind:class,interface,module")
      model: { type: sections, sectionHeading: "heading:3", emitTag: symbol-group }
```

Twin: `{% collection type="symbol" filter="kind:class,interface,module" /%}`, the same query
string.

**`recipe`: a computed, published duration.** Today: no `totalTime` (SPEC-145's open `{% let %}`
question).

```yaml
attributes:
  prepTime: { type: string, kind: duration }
  cookTime: { type: string, kind: duration }
computes:
  totalTime: sum($attrs.prepTime, $attrs.cookTime)
metaFields:
  totalTime: { metaType: temporal }
schema:
  properties: { totalTime: totalTime }
```

Twin: `filter="totalTime:<PT30M"`, which needs the same duration kind for comparison (SPEC-138's
first gap). One SPEC-166 implementation unblocks both.

## Acceptance criteria

- [ ] Every registered function declares `parameters` and `returns`, and `refrakt reference` lists them
- [ ] `computes` accepts expression strings, checked when the definition loads (`function-unknown`, `function-argument-kind`, `computes-kind-mismatch`, `computes-cycle`)
- [ ] A rune whose `computes` entries are all expressions loads without a `prepare` stage
- [ ] `matches()` evaluates SPEC-070 queries with the same parser and matcher as `field-match.ts`
- [ ] `when` and `metaFields.*.condition` accept expressions; the existing condition forms still load, and a codemod rewrites them
- [ ] One fan-out implementation serves `field-match.ts`, `splitOn`, `split` and `item`; BUG-025 is fixed through it
- [ ] `first`, `item`, `basename` and `language` exist, and `codegroup`, `compare` and `juxtapose` label panels through one expression; every label difference this causes is listed and accepted
- [ ] `sum` shares its implementation with SPEC-138's `measure`
- [ ] `functions.ts` is reimplemented over the shared formatters and operations; output is unchanged except that the site's locale is used
- [ ] `recipe` publishes `totalTime` from `computes`, and the SEO baseline diff shows it
- [ ] An expression nested deeper than three calls reports `expression-depth`
- [ ] `grid`, `details`, `compare`, `conversation`, `progress`, `actions`, `figure` and `map-pin` express their computations with the function set, or each gap is recorded as a candidate function

## Open questions

- **Page scope in `computes`.** May an expression read page variables (`$frontmatter`)? Doing
  so makes a rune's fields depend on the page it sits on, which is sometimes the point (a
  default author) and sometimes a surprise. Proposed: not at first.
- **An engine for `computes`.** SPEC-138's engine plugin (mingo) evaluates structured queries.
  Should a site with the plugin also be able to write a structured expression under `computes`?
  It would give code-free runes more power, but expressions would then come in two languages.
  Proposed: no, until a real case outgrows the function set.
- **How much the "display text only" rule constrains in practice.** Measure how many templates
  and pages call functions today, and for what, before the first work item.
- **The nesting limit.** Three is a guess, to be checked against the first real definitions.

## References

- {% ref "SPEC-194" /%}: `computes`, and why computation belongs in the input half.
- {% ref "SPEC-166" /%}: value kinds and formatters.
- {% ref "SPEC-138" /%}: the query seam, its core gaps and `measure`.
- {% ref "SPEC-070" /%}: the filter grammar.
- {% ref "SPEC-145" /%}: the `{% let %}` open question this answers.
- {% ref "SPEC-162" /%}: `amount` and `tally`.
- {% ref "ADR-036" /%}: name the pattern; do not open a language.
- {% ref "ADR-043" /%}, {% ref "ADR-045" /%}: what a theme and a template may change.
- {% ref "BUG-025" /%}: multi-value grouping.

{% /spec %}
