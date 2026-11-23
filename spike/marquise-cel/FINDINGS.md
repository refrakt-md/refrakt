# CEL for `computes`: the two JavaScript implementations, measured

A throwaway spike, run on 2026-11-23 for `notes/marquise-foundation.md` (the CEL decision, "a spike on both JS
implementations before freezing"). Marquise decided that `computes` is written in a defined profile of CEL,
checked when a shape loads, evaluated after Kubernetes' `variables`, behind Marquise's own interface in
`@marquise-md/cel`. This spike writes refrakt's and Rivière's worked computations in CEL on both candidates and
measures conformance, the checker, custom types and functions, safety, size and speed.

```bash
npm install
npm run conformance   # CEL's conformance suite on both, in plain-value terms
npm run cases         # the worked computations
npm run checker       # what each catches when a shape loads
npm run safety        # regular expressions, limits, determinism
npm run computes      # the evaluation model: declared order, flowing types, lazy and memoised
npm run bench         # compile and evaluate times
npm run size          # gzipped browser bundles, in bytes
```

Versions: `@marcbachmann/cel-js` 8.0.0, `@bufbuild/cel` 0.6.2 (with `@bufbuild/re2` 0.6.2), CEL's conformance
suite from `@bufbuild/cel-spec` 0.6.2 (cel-spec v0.25.1), Node 22.

## The answer

**`@marcbachmann/cel-js`, behind Marquise's interface, with four conditions.** It is the only one of the two
that can do what the decision asks: check `computes` when a shape loads. `@bufbuild/cel` is more conformant and
safer with regular expressions, but its checker is a stub, and Marquise's decision rests on the checker.

The conditions, each small:

1. **The profile refuses `matches()` in `computes`,** because cel-js runs regular expressions on JavaScript's
   backtracking engine (below). Choosing stays with selectors; a regular expression inside a computation is
   not a need any worked case showed. Lifted if cel-js gains an RE2 option (upstream), as `@bufbuild/cel` has.
2. **The profile refuses a macro inside a macro's body,** which is what keeps evaluation linear in the input
   (CEL's linear-time promise rests on a cost model neither JavaScript implementation has). Chained macros
   (`filter(…).map(…)`) stay allowed.
3. **The vocabulary keeps `first`, `round` and `clamp` as Marquise's own functions:** neither implementation has
   CEL's math extension, cel-js cannot register namespaced names (`math.round`), and optional values mean
   *present*, not *non-empty*.
4. **CI runs the profile's part of CEL's conformance suite on cel-js, with its known deviations listed,** and
   fixes go upstream. The profile stays a true subset of CEL in what it accepts; where cel-js deviates on that
   subset, the list says so.

The adapter interface held: about 150 lines per implementation (`src/engines.mjs`), so the evaluator can be
swapped if `@bufbuild/cel` ships a checker.

## Conformance

CEL's conformance suite, run in plain-value terms (`src/conformance.mjs`): no protobuf messages, which
Marquise never uses, so the proto, enum and wrapper files and any test building a message are excluded.

| File | Run | cel-js | @bufbuild/cel |
|---|---:|---:|---:|
| basic | 43 | 41 (95%) | 43 (100%) |
| comparisons | 334 | 309 (93%) | 334 (100%) |
| conversions | 109 | 96 (88%) | 109 (100%) |
| fields | 60 | 43 (72%) | 53 (88%) |
| fp_math | 30 | 30 (100%) | 30 (100%) |
| integer_math | 64 | 62 (97%) | 64 (100%) |
| lists | 39 | 34 (87%) | 39 (100%) |
| logic | 30 | 25 (83%) | 30 (100%) |
| macros | 44 | 42 (95%) | 44 (100%) |
| string | 51 | 51 (100%) | 51 (100%) |
| timestamps | 73 | 54 (74%) | 73 (100%) |
| optionals | 59 | 22 (37%) | 3 (5%) |
| string_ext | 131 | 52 (40%) | 131 (100%) |
| parse | 193 | 167 (87%) | 193 (100%) |
| macros2 (two-variable) | 46 | 8 (17%) | 8 (17%) |
| math_ext | 116 | 17 (15%) | 17 (15%) |
| bindings_ext (`cel.bind`) | 5 | 5 (100%) | 0 (0%) |
| block_ext, encoders_ext, namespace, plumbing | 35 | 5 | 6 |
| **all** | **1,462** | **1,063 (73%)** | **1,228 (84%)** |

**What cel-js gets wrong, by kind:**

- **Heterogeneous numbers:** `1.0 == 1`, `dyn(3u) in [1, 2, 3]` and similar mixed int, uint and double
  comparisons, which the spec now defines.
- **Unchecked expressions:** `false && 32`, `true ? 'cows' : 17`. Conformance runs these without the checker;
  cel-js always checks, so it refuses them. Stricter, not wrong, and Marquise always checks anyway.
- **Timestamps and durations:** `int(timestamp(…))` and `string(timestamp(…))` (formatting), nanosecond precision
  (JavaScript `Date` keeps milliseconds), and range overflow at the year 0001 and 9999 boundaries.
- **Fields:** `has()` on a map *literal* (on a variable or typed record it works), backquoted field names
  (a recent addition to the spec), and dotted variable names resolved by container.
- **Bytes** ordering and escapes; **raw byte strings** in the parser; reserved words as method names.
- **Extensions it does not have:** most of the strings extension (`charAt`, `format`, `quote`; `split`, `join`,
  `trim` and the case functions pass), `optMap`/`optFlatMap`/`ofNonZeroValue`, two-variable comprehensions.

None of these blocks a worked case. The ones inside the profile (mixed-number equality, timestamp conversions,
`has()` on literal maps) go on the deviation list and upstream.

**What `@bufbuild/cel` gets wrong:** almost nothing in the core, but it has no optional values at all (neither
the syntax nor the functions), no `cel.bind`, no math extension, and one bug the suite misses:
**`timestamp(int)` reads milliseconds, not seconds** (`timestamp(1000000000)` is 1970-01-12, not
2001-09-09T01:46:40Z; the suite only compares two identical conversions).

## The worked computations

25 cases (`src/cases.mjs`): refrakt's from SPEC-195 and Rivière's worked pages, with the vocabulary registered
as custom functions on both (`src/vocabulary.mjs`).

| Case | cel-js | @bufbuild/cel |
|---|---|---|
| recipe `prepTime + cookTime`, and `+ days(2)` | ✓ duration | ✓ |
| progress `max == 0 ? 0 : value * 100 / max`; division by zero an error | ✓ int | ✓ |
| progress rounded, `math.round` | ✗ no math extension | ✗ no math extension |
| progress rounded in core CEL, `(value * 200 / max + 1) / 2` | ✓ | ✓ |
| conversation `speakers[index % size(speakers)]` | ✓ | ✓ |
| drawer clamp as a ternary; `math.least` | ✓; ✗ | ✓; ✗ |
| layout `size(panels) == 1 ? 'single' : 'tabs'` | ✓ | ✓ |
| codegroup label with optionals, `…[?index].or(node.?label).orValue(language(…))` | ✓ | ✗ cannot parse |
| the same with `labels=""` | ✗ gives `""` (see below) | ✗ cannot parse |
| codegroup label with `first([…])` | ✓ | ✓ |
| codegroup file, `has(node.lines) ? basename(…) + ':' + … : …` | ✓ | ✓ |
| symbol `selects(attrs, 'kind:class,interface,module')` | ✓ | ✓ |
| an optional attribute, `has(attrs.title) ? … : 'Untitled'` | ✓ | ✓ |
| budget `sumAmounts(items.map(i, i.amount)).value` | ✓ | ✓ |
| traceability coverage %, with `filter` | ✓ | ✓ |
| traceability the latest run, `latest(runs, 'at').result` | ✓ | ✓ |
| plan progress, `selects` inside `filter` | ✓ | ✓ |
| events next occurrence, `nextAfter(start, days(7), now)` | ✓ timestamp | ✓ |
| the same in core CEL, through `int(timestamp)` | ✗ refused | ✗ wrong (the ms bug) |
| traceability stale, `today - reviewed > days(365)` | ✓ | ✓ |
| docs year in the site's zone, `published.getFullYear('Europe/Stockholm')` | ✓ | ✓ |

**What the cases teach:**

- **Optional values mean present, not non-empty.** `"".split(",")` is `[""]`, so `[?0]` is present and empty,
  and the chain returns `""`. refrakt's fallback chains want "the first non-empty", which is `first([…])`.
  Optionals stay in the profile for absent attributes (`node.?label.orValue("")`); `first` stays in the
  vocabulary.
- **Core CEL needs a few vocabulary functions to stay readable:** `days()` (the duration literal stops at
  hours), `round`/`clamp` (no math extension), `nextAfter` (the core-CEL version is unreadable and hits a bug
  in each implementation). This matches SPEC-195's admission rule: each has two adopters.
- **Amounts work as a map with functions,** not a custom type: `@bufbuild/cel` allows custom types only as
  protobuf messages, and cel-js's custom types would differ from that. A map with `value` and `currency`,
  plus `sumAmounts`, does it on both; a real `amount` type waits for E3 (money), after 1.0.
- **Integer and number are strict:** `rating * 1.5` is refused (`int * double`), and the author writes
  `double(rating) * 1.5`. Recommended: keep it strict, as CEL is; the checker's message names the overload.
- **Division by zero is an error, not `undefined`** (SPEC-195 wanted `undefined`). Under Marquise, an
  evaluation error becomes a finding and the value is absent, which is the same outcome with a reason.
- **Timezones work** with IANA names on both; dates as timestamps at the start of the day in the host's zone
  behave as the docs describe.

## The checker

18 cases (`src/checker.mjs`): ten mistakes a shape author makes, eight expressions with the type they should
have.

| | cel-js | @bufbuild/cel |
|---|---|---|
| Unknown name, unknown function, wrong operand, wrong argument | ✓ refused | accepted |
| Unknown field on a record, and inside a macro (`items.map(i, i.amont)`) | ✓ refused | accepted |
| Branches of different types, `int * double`, `int == string`, `duration > int` | ✓ refused | accepted |
| Result types: duration, int, double, `list<string>`, a field of a list item, an optional's value | ✓ all | none |
| **Right** | **18/18** | **0/18** |

`@bufbuild/cel`'s checker is not exported, and imported by its file path it **handles only constants and
identifiers**: every call, field selection or comprehension throws `Unsupported expression kind`. It is a stub,
not a private API.

cel-js's errors carry a line and a caret (`>    2 |   cokTime` / `^`), so findings can point into the shape
file. Records registered as typed objects (`registerType` with fields) give field checking; the checked result
type is a string (`google.protobuf.Duration`, `list<string>`) that registers directly as the type of a later
value.

## Safety

`src/safety.mjs`, for untrusted shapes (the site builder's customer blocks):

| Check | cel-js | @bufbuild/cel |
|---|---|---|
| `s.matches('^(a+)+$')` on 28 a's and `!` | **10.2 s** (doubles per character) | 10 ms |
| RE2-only syntax `(?i)`, `\pL` | refused, wrong | ✓ |
| Non-RE2 syntax: backreferences, lookahead | accepted | refused |
| A nested macro over 2,000 × 2,000 | 0.7 s | 8.7 s |
| 600-term expression | ✓; refused with `limits: { maxAstNodes: 200 }` | ✓, no limits |
| `now()`, randomness | none | none |
| Integer overflow | error | error |

- **cel-js's `matches()` is JavaScript's `RegExp`,** so it backtracks catastrophically and accepts a different
  dialect than CEL specifies (RE2). It cannot be overridden: registering `string.matches(string)` again is
  refused as an overlapping overload. Hence condition 1.
- **Neither has a runtime cost budget.** cel-js has parse-time limits (AST nodes, depth, list and map literal
  sizes, call arguments); `@bufbuild/cel` has none. With the macro-nesting rule (condition 2) an expression's
  work is linear in its inputs, and the host bounds list sizes.
- **Both are deterministic:** no clock and no randomness in the standard library.
- **cel-js accepts async functions** (and then returns a promise). Marquise's reads are synchronous, so
  `@marquise-md/cel` registers only synchronous functions.

## The evaluation model

`src/computes.mjs` loads a shape's `computes` as the docs describe, on cel-js:

- **Declared order, flowing types:** each value is checked with the attributes and the values declared before
  it; its checked type becomes that name's type for later ones (`totalTime: google.protobuf.Duration`, then
  `quick: bool`, then `label: string`).
- **Cycles cannot be written:** a value reading a later one, or itself, is an unknown name at that point
  (`computes-order`).
- **The profile is an AST walk:** `matches`, `cel.bind`, the two-variable macros and a macro inside a macro are
  refused (`computes-not-in-profile`); a type error is `computes-type`.
- **Lazy and memoised:** cel-js reads its context through a `Proxy`, so a value is computed when first read
  and once per record (`totalTime` read twice, evaluated once).
- **References** are extracted from either implementation's AST in a few lines, for dependency tracking.

## Size and speed

| Bundle (esbuild, browser, minified) | Minified | Gzipped |
|---|---:|---:|
| cel-js | 80 kB | 23 kB |
| @bufbuild/cel (with its RE2 and protobuf runtime) | 277 kB | 68 kB |
| @bufbuild/re2 alone | 48 kB | 16 kB |
| cel-js + @bufbuild/re2, if RE2 is ever added | 128 kB | 39 kB |

| Expression | Engine | Compile (µs) | Evaluate (µs) |
|---|---|---:|---:|
| `prepTime + cookTime` | cel-js / buf | 18 / 176 | 7 / 7 |
| `value * 100 / max` | cel-js / buf | 27 / 202 | 5 / 2 |
| a `filter` over 40 items | cel-js / buf | 36 / 238 | 38 / 65 |
| `selects` inside a `filter` over 40 items | cel-js / buf | 11 / 202 | 54 / 135 |

Evaluation includes the adapter's value conversion. Compiling is once per shape; evaluating, once per record:
milliseconds per thousand records on either.

## Smaller notes

- **cel-js names types as protobuf does** in signatures (`google.protobuf.Duration`, not `duration`); the
  adapter maps Marquise's names.
- **`@bufbuild/cel` takes timestamps and durations as protobuf messages** (`timestampFromDate`), and custom
  types only as messages; the adapter converts.
- **Empty list literals in a macro** (`[].all(e, e > 0)`) fail in cel-js with an overload error; through a
  variable they work. A UTC offset needs its sign (`'+02:00'`).
- **`@bufbuild/cel` is 0.x and beta,** with a checker in progress; worth rechecking when it ships one, since its
  conformance and RE2 are better.

## What this changes in the docs

- Marquise's `syntax.md`, "Expressions in shape files": the implementation (cel-js), the four conditions, the
  profile's refusals (`matches`, nested macros), integer and number strict, evaluation errors as findings.
- SPEC-195's vocabulary keeps `first`, `round`, `clamp`, and gains `days`, `nextAfter` (Rivière) and the
  amount functions as maps until money is designed.
- Rivière's computed values (the latest run, coverage, the next occurrence) are written and run.
