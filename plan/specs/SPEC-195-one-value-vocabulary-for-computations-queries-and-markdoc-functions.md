{% spec id="SPEC-195" status="accepted" tags="vocabulary, functions, query, composition, content-model, values, architecture" %}

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

  A seventh, grouping by a multi-value field, was added when {% ref "BUG-025" /%} was fixed
  (v0.39.0, refrakt-md/refrakt#666), with its own split.
- **Durations are parsed twice:** `parseIsoDuration` (`packages/transform/src/engine.ts`) and
  `parseDuration` (`plugins/media/src/duration.ts`).
- **Reductions:** `aggregate` counts (`aggregate-resolve.ts`), `budget` sums privately
  (`computeSubtotal`), and SPEC-138 plans `measure="sum|avg|min|max:<field>"`.

## Decisions

### D1: one registry, written in three places

Every operation is one registered function with one implementation:

| Place | Who writes there | Form |
|---|---|---|
| a definition's frontmatter: `computes`, `metaFields.*.condition`, `rootAttributes`, `tag:` | rune authors | Markdoc call syntax, in a YAML string |
| a template or a page | rune, theme and page authors | Markdoc call syntax, as today |
| `filter=`, `where`, `entityRoutes.filter` | page and site authors | the SPEC-070 grammar, unchanged |

The query surface keeps its own grammar (D7), and that grammar is reachable from the other two
through `matches()` (D5). Nothing else is a third syntax.

### D2: the place decides what the result is

The same call means different things depending on where it is written:

| Written in | The result is | So it may |
|---|---|---|
| `computes` | a field of the rune | carry `metaFields` meaning, feed the schema row, be placed by the template; a replacement template cannot change or remove it |
| `condition` | a choice made in the input | decide whether a field renders (a content model never depends on attributes, D5) |
| a template or page, as content | display text | be shown; never published, never a field |
| a template or page, as an attribute of a rune it places (`{% collection filter=… %}`, `{% link href=… %}`) | that placed rune's input | be whatever that attribute is to the placed rune |
| a template or page, in `{% if %}` | an arrangement choice | choose what is shown, never whether a slot is placed at all (SPEC-177 D5) |

So no function is restricted by where it may be called: a theme may display `sum(…)`. Only a
definition can make a value **meaningful** for its own rune, which keeps {% ref "ADR-043" /%}
(labels and meaning are the definition's) and {% ref "ADR-045" /%} decision 4 (published data
does not depend on the template).

*Extended 2026-11-09* with the attribute and `{% if %}` rows, after a count of real usage:

- **Few calls are affected.** Of the 24 function calls in content that renders today, 23 are
  already display text or a condition choosing a partial: `humanize`, `date` and `equals`,
  mostly in `plan-site/` partials and the plan plugin's built-in item bodies. The one
  attribute call is `filter=concat("milestone:", $item.id)` in
  `plan-site/content/_partials/entity/milestone.md:8`. No composed definition, staged rune or
  fixture calls a function.
- **An attribute call is the placed rune's input**, not the outer rune's. A replacement template
  that changed it would change the placed rune's input, so ADR-045 decision 4's
  structured-data comparison is what catches a change that matters.
- **Some attributes are read before functions run**: `data`'s `where` and the
  {% ref "SPEC-129" /%} include reject function calls (`packages/runes/test/data-rune.test.ts:358`).
  The docs list those attributes rather than leaving authors to find them.
- **A substitution gap to fix:** {% ref "WORK-709" /%} records that `$row` is not substituted
  inside a function's arguments in partials, so `not($row.plugin)` was always true. D8's
  scopes must hold inside arguments as well as at the top level.

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
| Values | `toDuration`, `toAmount`, `toNumber`, `toDate`, `toCoordinates` as explicit coercions | an attribute declared with a `kind` arrives already typed; the coercions are for untyped sources. `toDuration` accepts clock times (`mm:ss`, `audio`'s chapters) as well as ISO 8601. `coordinates` is a new value kind for `map` and `map-pin`, to add to SPEC-166. *Renamed 2026-11-08* from `duration()`, `number()` and so on: `number` and `date` are already the formatters' names |
| Arithmetic | `add`, `subtract`, `multiply`, `divide`, `mod`, `round`, `clamp` | named functions, not operators, so D9 holds. `progress` (value/max as a clamped, rounded percentage), `conversation` (`$index` mod the speaker count), `drawer` (heading-level clamp). `embed`'s aspect padding no longer needs it: the `frame` primitive owns the ratio (SPEC-194 D14) |
| Reductions | `count`, `sum`, `avg`, `min`, `max` | one implementation shared with SPEC-138's `measure`; each takes listed values, or a list and the name of the field to reduce (`sum($items, "amount")`). A path through a list (`$items.amount`) is not a projection: Markdoc resolves it to `undefined` (verified 2026-11-09) |
| Lists | `split`, `item`, `join` | `split` and `item` follow D6's fan-out rule; `split` takes an optional delimiter (`grid`'s `c:r` spans). A list's length is `count`; an earlier draft also had `size`, which did the same |
| Page and site | `url`, `neighbours`, `select` | read the page index of {% ref "SPEC-194" /%} D12, so they work at transform once every page is parsed |
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
- **Not in content models.** A definition's content model never depends on attribute values:
  {% ref "SPEC-169" /%} D2 (accepted) keeps `when` rejected for compositions, and SPEC-194 gives
  native runes the same definition format. Where an arrangement varies with an attribute, the
  model stays one and the template branches with `{% if matches(…) %}`. `symbol` is the case
  SPEC-169 D5 already settles that way. The `when` models native runes use today (`steps`,
  `itinerary`) keep working until those runes move, and both are planned compositions.

  *Corrected 2026-11-09.* An earlier draft let `when` take an expression, which contradicted
  SPEC-169 D2.
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
- the multi-value grouping BUG-025's fix added, which moves onto this rule.

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
- `concat` stays for text, and stops being presented as the way to build filter strings once
  structured predicates exist. *Measured 2026-11-09:* the site's docs never present it that way
  (`site/content/runes/data.md` says the opposite). The one place that teaches it is the doc
  comment in `packages/runes/src/functions.ts` (lines 12 and 65), and the one live use is the
  milestone partial above. Both move to the structured form together.

### D8: frontmatter expressions, and how they meet `prepare`

- **A frontmatter expression is a YAML string**, parsed with Markdoc's attribute-expression
  parser so it has exactly the grammar a template has. *Verified 2026-11-09:*
  - wrapping the string as an attribute of a throwaway tag (`{% x v=<expression> /%}`) and
    reading the attribute parses every expression in this spec, including nested calls,
    `if(…)` and bracketed paths (`$attrs["prev-label"]`);
  - the result is Markdoc's own `Function`/`Variable` AST, evaluated with
    `.resolve({ functions, variables })`, with no tag or transform needed;
  - a malformed expression parses to an `error` node (`parse-error`), reported as
    `expression-syntax` with its location;
  - `Markdoc.validate` does **not** report an unknown function, so `function-unknown` (D3) is
    refrakt's own check over the AST.
- **A `computes` entry is one of three things:**

  ```yaml
  computes:
    totalTime: sum($attrs.prepTime, $attrs.cookTime)   # an expression: evaluated by the vocabulary
    single:    { type: boolean }                        # a declaration: filled by the rune's prepare stage
    layout:                                             # an expression with a closed set of results
      value: if(equals(count($slots.panels), 1), "single", "tabs")
      values: [single, tabs]
  ```

  A string is an expression. An object with `type` is a declaration that SPEC-194's `prepare`
  must fill. An object with `value` and `values` is an expression whose result must be one of
  the listed values; it is the form a template selector needs ({% ref "SPEC-168" /%} D9, as
  amended), and is only required there. A rune may mix all three. A rune whose every entry is an
  expression needs no `prepare` stage.
- **Scopes** available to a `computes` expression:
  - `$attrs`;
  - other computed values (`$computed`), with cycles reported as `computes-cycle`;
  - `$slots`, the content model's fields, so a count of items can decide something
    (*added 2026-11-09*, for `codegroup`);
  - for a per-item key (`panels.label`): the item's emitted values (`$node`), `$index`, and the
    item's other computed values (`$each.<name>`), with cycles reported as for `$computed`;
  - the page and the site: `$page`, `$site` and `$frontmatter`.

  *Decided 2026-11-09.* An earlier draft kept page variables out of `computes`, so that a rune's
  fields could not depend on the page it sits on. {% ref "SPEC-194" /%} D12 makes that
  dependence the point for a whole group of runes: a `pagination` or `breadcrumb` in a layout
  must compute different values on every page, from `$page`. So page variables are available,
  and the dependence is documented rather than prevented. A rune that reads the registry is not
  covered by this: registry reads are `data:` entries, and they defer the rune (SPEC-194 D12.4).

- **Paste-time bindings come first** (*added 2026-11-10*). `data`'s `$row` and `include`'s
  `variables` are bound at preprocess by substitution; functions are evaluated at transform. So a
  function in a row template or an included file sees the literal its argument was replaced
  with: `{% if equals($row.status, "done") %}` tests each row's own status. The reverse does not
  hold. A function cannot feed a preprocessor attribute (`{% data where=concat(…) %}`), because
  the call has not run when `data` reads it, and `data` already reports that as an error. Today
  the substitution misses a variable inside a function's parameters, so the call reads
  `undefined` silently: {% ref "BUG-054" /%}, fixed before this vocabulary ships. See
  {% ref "SPEC-194" /%} D15.

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
  or a `prepare` stage. *Kept 2026-11-09* as a warning at three. `codegroup`'s label nests
  exactly three deep (`first(item(split(…)))`), and its template selector first nested four,
  which the lint caught; it now names the intermediate fact (`single`) instead. The limit is
  revisited once the first definitions are written.
- **One expression language** (*decided 2026-11-09*). `computes` takes only this vocabulary.
  A site with {% ref "SPEC-138" /%}'s engine plugin (mingo) cannot write structured expressions
  under `computes`: that would give expressions two languages, which is what this spec removes.
  The engine stays a query tier. The question is reopened only when a real computation outgrows
  the function set and no function or `prepare` stage fits it.

## Function reference

The complete set, *compiled 2026-11-08* from D4 and SPEC-194 D12. Arguments in `[brackets]`
are optional; `…values` takes any number. Kinds are SPEC-166's (`duration`, `amount`,
`number`, `date`) plus `coordinates`. Lists are arrays, or comma lists split by D6's rule.
Indexes count from 0.

**Exist today, unchanged in meaning**

| Function | Arguments | Returns | What it does |
|---|---|---|---|
| `and` | `…values` | boolean | true when every value is truthy (Markdoc) |
| `or` | `…values` | boolean | true when any value is truthy; returns a boolean, not the value (Markdoc) |
| `not` | `value` | boolean | negation (Markdoc) |
| `equals` | `…values` | boolean | true when all values are identical (Markdoc) |
| `default` | `value, fallback` | any | `fallback` when `value` is `undefined`; an empty string passes through (Markdoc) |
| `debug` | `value` | string | the value as JSON, for development (Markdoc) |
| `concat` | `…values` | string | joins the values' text, no separator |
| `join` | `list, [separator=", "]` | string | joins a list's entries |
| `humanize` | `text` | string | `prepTime` → "Prep Time", `blocked-by` → "Blocked By" |
| `currency` | `value, [code="USD"]` | display text | formats an amount; under SPEC-166 D6 it uses the site's locale and `formats`, and display text is produced at stage 4 |
| `date` | `value` | display text | formats a date, likewise |
| `number` | `value` | display text | formats a number, likewise |

**New: values**

| Function | Arguments | Returns | What it does | Needed by |
|---|---|---|---|---|
| `toDuration` | `text` | duration | reads ISO 8601 (`PT15M`) or a clock time (`mm:ss`, `h:mm:ss`) | `audio` chapters, `recipe` |
| `toAmount` | `text, [currency]` | amount | reads "€1,200" and "$40"; how a range ("100–200") is read is SPEC-166's to decide | `budget` |
| `toNumber` | `text` | number | reads "1,234.5"; `undefined` when it is not a number | `progress`, `grid` |
| `toDate` | `text` | date | reads an ISO date | date filters, `blog` |
| `toCoordinates` | `text` | coordinates | reads "59.33, 18.07" | `map`, `map-pin` |

**New: arithmetic**

| Function | Arguments | Returns | What it does | Needed by |
|---|---|---|---|---|
| `add` | `…values` | the operands' kind | sums numbers, or durations, or amounts of one currency; mixed kinds report `function-argument-kind` | `recipe`, `toc` (depth + 1) |
| `subtract` | `a, b` | the operands' kind | `a − b` | date and duration differences |
| `multiply` | `…values` | number | product | `progress` (× 100) |
| `divide` | `a, b` | number | `a ÷ b`; dividing by zero returns `undefined`, never `Infinity` | `progress` |
| `mod` | `a, b` | number | remainder | `conversation` (`$index` mod speaker count) |
| `round` | `value, [digits=0]` | number | rounds half away from zero | `progress` |
| `clamp` | `value, min, max` | number | limits to the range | `progress`, `drawer` (heading level) |

**New: reductions** (one implementation with SPEC-138's `measure`)

| Function | Arguments | Returns | What it does | Needed by |
|---|---|---|---|---|
| `count` | `list` | number | number of entries | empty states, `collection` |
| `sum` | `list, [field]` or `…values` | the entries' kind | total; with `field`, of that field of each entry | `budget`, `recipe`, `aggregate` |
| `avg` | `list, [field]` or `…values` | the entries' kind | mean | `aggregate` |
| `min` | `list, [field]` or `…values` | the entries' kind | smallest | `aggregate`, `drawer` |
| `max` | `list, [field]` or `…values` | the entries' kind | largest | `aggregate` |

**New: lists and text**

| Function | Arguments | Returns | What it does | Needed by |
|---|---|---|---|---|
| `split` | `text, [delimiter=","]` | list | D6's rule: split, trim, drop empty entries | `grid` (`c:r` spans), `labels`, `speakers` |
| `item` | `list, index` | entry | the entry at `index`; `undefined` past the end | `codegroup`, `compare`, `juxtapose`, `conversation` |
| `first` | `…values` | any | the first argument that is neither `undefined` nor empty | every fallback chain |
| `text` | `slot` | string | a slot's plain text (`text($slots.label)`) | `progress`'s `aria-label` |
| `basename` | `path` | string | last path segment: `src/lib/a.ts` → `a.ts` | `codegroup`, `file-ref` |
| `language` | `code` | string | a code-fence language's display name: `ts` → "TypeScript"; unknown codes are capitalised | `codegroup`, `compare` |

**New: choice and predicates**

| Function | Arguments | Returns | What it does | Needed by |
|---|---|---|---|---|
| `if` | `condition, then, [else]` | any | a value, not control flow: `then` when `condition` is truthy, else `else` | `pagination`, `progress`, `codegroup` |
| `lookup` | `table, key, [fallback]` | any | the value under `key` in an object, written inline or declared once in the definition | `showcase` aliases, `language` |
| `matches` | `record, query` | boolean | evaluates a SPEC-070 query against a record, with `field-match.ts`'s parser and matcher (D5) | `symbol`'s template `{% if %}`, `condition` |

**New: page and site** (SPEC-194 D12)

| Function | Arguments | Returns | What it does | Needed by |
|---|---|---|---|---|
| `url` | `slugOrUrl` | URL | a URL passes through; a slug resolves through the page index; an unknown slug reports `url-unknown-slug` and returns `undefined`, so `first(…)` falls through | `pagination`, `nav`, `breadcrumb` |
| `neighbours` | `page, [scope="siblings"]` | `{ prev, next }` | the previous and next page, among siblings or across the page's top-level section | `pagination` with `scope="section"` |
| `select` | `page, type, [filter]` | list | entries of one kind from the page as written. `type` is `heading` (`text`, `id`, `level`), `image` (`src`, `alt`), `fence` (`language`), `table`, `link` (`href`, `text`) or `tag:<name>` (the tag's attributes); `filter` is a SPEC-070 query over the entries | `toc`, lists of figures, code listings or links |

**Not functions**

These are variables and declarations, listed so the whole surface is in one place:

- **Variables:** `$attrs`, `$computed`, `$slots`, `$frontmatter`, and inside a repeated slot
  `$item` (a data list's entry) or `$each` (a content-model item), `$index`, and in
  `emitAttributes` and per-item `computes`, `$node` (the matched node's own attributes).
- **`$page`:** `url`, `path`, `dir`, `slug`, `title`, `draft` (existing); `parent`,
  `ancestors`, `children`, `prev`, `next`, `headings` (SPEC-194 D12).
- **`$site`:** `pages` and the page tree.
- **A registry read** is a `data:` entry (`{ query: entities, type, filter, sort, limit }`), not
  a function, because it is what makes a rune wait (SPEC-194 D12.4).

**Totals.** 12 exist; 29 are new: 5 values, 7 arithmetic, 5 reductions, 6 lists and text,
3 choice and predicates, 3 page and site.

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
  subtotal: sum($items, "amount")
```

Twin: `{% aggregate … measure="sum:points" /%}`. Whether a range is its midpoint is the `amount`
kind's rule, decided once in SPEC-166.

**`codegroup`, `compare`, `juxtapose`: one label rule.** Today: three implementations, and the
first two disagree about the same fence ("JavaScript" vs "js").

```yaml
computes:
  panels.file:  if($node.lines, concat(basename($node.source), ":", $node.lines), basename($node.source))
  panels.label: first(item(split($attrs.labels), $index), $node.label, $each.file, language(first($node.language, "shell")))
```

Twin: D6's fan-out rule, which grouping by a multi-value field also uses.

This is `codegroup`'s own expression ({% ref "SPEC-194" /%} D14). `compare` and `juxtapose`
use the same chain without the source step.

**`symbol`: one predicate form.** Today: a content-model function branching on
`GROUP_KINDS.includes(attrs.kind)` (`plugins/docs/src/tags/symbol.ts`). Under SPEC-169 D5 the
model is one `sections` model at `heading:3`, and the template chooses the arrangement:

```md
{% if matches($attrs, "kind:class,interface,module") %}
	{% slot name="sections" each %} … {% /slot %}
{% else /%}
	{% slot name="body" /%}
{% /if %}
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
- [ ] `metaFields.*.condition` and template `{% if %}` accept expressions, including `matches()`; a bare attribute name still works as a condition
- [ ] One fan-out implementation serves `field-match.ts`, `splitOn`, `split`, `item` and multi-value grouping (the split BUG-025's fix added moves onto it)
- [ ] `first`, `item`, `basename` and `language` exist, and `codegroup`, `compare` and `juxtapose` label panels through one expression; every label difference this causes is listed and accepted
- [ ] `sum` shares its implementation with SPEC-138's `measure`
- [ ] `functions.ts` is reimplemented over the shared formatters and operations; output is unchanged except that the site's locale is used
- [ ] `recipe` publishes `totalTime` from `computes`, and the SEO baseline diff shows it
- [ ] An expression nested deeper than three calls reports `expression-depth`
- [ ] A malformed frontmatter expression reports `expression-syntax` with its location (D8)
- [ ] `computes` accepts the closed `{ value, values }` form; a result outside `values` is an error, and such a value can select a template variant (D8, SPEC-168 D9)
- [ ] `computes` can read `$page`, `$site`, `$frontmatter` and `$slots`, and per-item keys can read `$node`, `$index` and `$each.<name>`; cycles report `computes-cycle` (D8)
- [ ] The `to*` coercions, the arithmetic family, `if`, `lookup` and `text` exist with typed signatures (D4)
- [ ] `url`, `neighbours` and `select` read the page index at transform; an unknown slug reports `url-unknown-slug` and returns `undefined` (D4, SPEC-194 D12)
- [ ] Only packages register functions; no function reads the clock or a random source; `computes` accepts no expression language but this one (D9)
- [ ] `grid`, `details`, `compare`, `conversation`, `progress`, `actions`, `figure` and `map-pin` express their computations with the function set, or each gap is recorded as a candidate function

## Open questions

None remain within this spec. The last one (how much the "display text only" rule constrains)
was answered by the 2026-11-09 count recorded under D2. The open items it depends on belong to
other specs: value kinds ({% ref "SPEC-166" /%}) and range comparisons in the filter grammar
({% ref "SPEC-138" /%}).

## References

- {% ref "SPEC-194" /%}: `computes`, and why computation belongs in the input half.
- {% ref "SPEC-166" /%}: value kinds and formatters.
- {% ref "SPEC-138" /%}: the query seam, its core gaps and `measure`.
- {% ref "SPEC-070" /%}: the filter grammar.
- {% ref "SPEC-145" /%}: the `{% let %}` open question this answers.
- {% ref "SPEC-162" /%}: `amount` and `tally`.
- {% ref "ADR-036" /%}: name the pattern; do not open a language.
- {% ref "ADR-043" /%}, {% ref "ADR-045" /%}: what a theme and a template may change.
- {% ref "BUG-025" /%}: multi-value grouping, fixed in v0.39.0 with its own split.

{% /spec %}
