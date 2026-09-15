{% bug id="BUG-014" status="fixed" severity="major" milestone="v0.34.0" tags="validation, markdoc, pipeline, runes, dx" %}

# Markdoc validation never runs outside the language server

`Markdoc.validate()` is never called on site content. A rune typo, an unknown
attribute, a missing required attribute and an out-of-enum modifier value all
render silently, and the only user who ever learns is one running the VS Code
extension.

It is called in two places, neither of which sees a user's pages:

- `packages/language-server/src/parser/markdoc.ts:18` — the language server, so
  editor diagnostics only.
- `packages/runes/test/fixture-corpus.test.ts:48` — over the 40-file **rune
  fixture corpus** (WORK-414 / SPEC-102), filtered to error/critical and
  asserted empty, plus a `transform` does-not-throw check.

The second is a real guard that runs under `npm test`, and it is the model
{% ref "SPEC-132" /%} should follow — but its corpus is our fixtures, not
`site/content` and not any user's content.

Three pieces of a validation feature exist and none are connected to each
other.

## Steps to Reproduce

1. Add to any page in `site/content`:

   ```markdoc
   {% hnit type="danger" %}typo'd rune name{% /hnit %}
   {% hint type="danger" bogus="1" %}invalid enum + unknown attribute{% /hint %}
   ```

2. Run `npm run build`, or start the adapter dev server and open the page.
3. Run `npm test`.
4. Run `npx refrakt validate`.

## Expected

Each mistake is reported, naming the page and the tag — the unknown tag
`hnit`, the out-of-enum `type="danger"`, the unknown attribute `bogus`, and any
missing required attribute. All are declared in the rune schemas and all are
detectable by `Markdoc.validate()`.

## Actual

None of the four commands reports anything. The `{% hnit %}` block disappears
from the page with its children left behind as bare prose. The `hint` renders
carrying `data-type="danger"`, for which no CSS exists, so it is silently
unstyled. `refrakt validate` reports success without having read the content at
all.

The only surface that reports any of it is the VS Code extension, through the
language server's `Markdoc.validate()` call. The fixture-corpus test would
catch the same mistakes, but only in `packages/runes/fixtures/`.

## Symptoms

### 1. Four error classes pass through `transform()` silently

Verified against the real `@markdoc/markdoc`, using a two-tag config:

| `validate()` reports | `transform()` does |
|---|---|
| `tag-undefined` | **drops the tag and renders its children as prose** |
| `attribute-missing-required` | renders the tag without it |
| `attribute-value-invalid` (`matches` enum) | passes the bad value straight through |
| `attribute-undefined` | silently drops the attribute |

The first is the most damaging: a renamed or mistyped rune does not fail, it
*dissolves into the paragraph*. This is the same failure `scripts/check-rune-docs.mjs`
was written to catch at the catalogue level, entirely unguarded at the content
level.

The third compounds in this architecture specifically. `{% hint type="danger" %}`
transforms to `<Hint type="danger">`, the engine emits `.rf-hint--danger` and
`[data-type="danger"]`, and no CSS matches — a silently unstyled variant.
Lumina's `css-coverage.test.ts` cannot catch it: it derives expected selectors
from `baseConfig`, so it checks config→CSS, never content→CSS.

### 2. Custom attribute-type validators are dead code in the build path

`transform()` does not invoke a `CustomAttributeTypeInterface`'s `validate()`.
Only `Markdoc.validate()` does. Confirmed by instrumenting a custom type and
running both:

```
transform() invoked custom validate(): false
validate()  invoked custom validate(): true
```

So every validator below runs only where `validate()` is called — the language
server, and the fixture-corpus test for whichever fixtures happen to exercise
them. Never in a build, and never over a user's content:

- `SeparatedString.validate` — `packages/runes/src/attributes.ts`
- `SpaceSeparatedNumberList.validate` — same file
- the validator in `plugins/media/src/attributes.ts`

`SpaceSeparatedNumberList` is the clearest case. Its `validate` exists to reject
non-numeric input; its `transform` runs `parseInt` unguarded. In the build the
check never fires and the `NaN` sails through. Anyone reading that class would
reasonably conclude it protects the pipeline.

### 3. The `error` rune has no producer

`packages/runes/src/tags/error.ts` accepts a Markdoc `ValidationError`
(`error: { type: Object }`) and reads `err.id`, `err.level` and `err.message` to
render a `<tr>` of code / tag / level / message. It is unambiguously built to
display `Markdoc.validate()` output as a table.

Nothing in the repo constructs it. `check-rune-docs.mjs` carries it in
`PAGELESS` annotated "internal — validation error reporting", so the intent is
recorded; the wiring was never done.

### 4. `refrakt validate` does not validate content

The command name suggests otherwise. `packages/cli/src/commands/validate.ts`
calls `validateThemeConfig` and `validateManifest` — theme config and theme
manifest only. No content is read. A user reaching for `refrakt validate` to
check their pages gets a passing result that means nothing about their content.

## Impact

Worst for **users of refrakt**, not this repo. A site author who mistypes a rune
name gets a page with a silently missing block and no diagnostic from the build,
the CLI, or CI. The failure is only visible if they happen to run the VS Code
extension and happen to open that file.

## Not the whole story: there is no backlog in this repo

Scanning `site/content` for unknown tags — 124 distinct tags in prose, fenced
examples excluded because `escapeFenceTags` neutralises those — found **zero**
genuine `tag-undefined`. Every candidate was an inline-code mention in prose
(`` `{% theme-toggle /%}` ``) or a registered name the scan's own list missed
(`humanize` is a function, `link` a node).

The attribute classes could not be checked the same way; they need the built tag
set.

So fixing this is **prospective, not remedial** for the refrakt repo itself. It
should be argued on the user-facing impact above, not on a pile of latent bugs
in our own docs. Anyone scoping the fix should know that up front rather than
discovering it and concluding the bug was overstated.

## Two hazards for the fix

Both measured; both will bite an implementation that just switches validation
on.

**Variable checking is all-or-nothing, and `site.ts` already passes a bag.**

| config | result |
|---|---|
| no `variables` key | check skipped entirely |
| `variables: {}` | *every* variable reference flagged |
| incomplete bag | false positives on whatever is missing |
| complete bag | clean |

`packages/content/src/site.ts:75` already passes
`variables: { generatedIds, path, headings, __source, __sourcePath, …contentVariables }`.
Enabling validation as-is would therefore flag every `$item.*` in collection
templates and deferred bodies, because `$item` binds later and per-entity.
`variable-undefined` cannot be turned on at all. Markdoc validates the **full
path**, not the root, and most variable use in content is scope-local — `$item`
and `$row` alone account for roughly 150 of ~260 references, bound per-iteration
inside rune body templates, with valid paths depending on author-defined
frontmatter. {% ref "SPEC-132" /%} D4 records the measurement; the check is out
of that spec's scope entirely rather than deferred.

**The language server cannot catch undefined variables at all.** It passes
`tags` and `nodes` and no `variables`, so per the table above that check is
skipped — which, given the above, is the correct behaviour rather than a gap.
Anyone "fixing" it by passing a bag would immediately create the false positives
above.

## Approach

Not fixed in place: the wiring carries sequencing and severity decisions that
belong in a design, specified in {% ref "SPEC-132" /%}. This bug records the
defect and the evidence it rests on.

## Resolution

Completed: 2026-09-15

Branch: `claude/milestone-v0-34-0-5zoab0`

Fixed across the v0.34.0 milestone. Each symptom, and where it closed:

| symptom | closed by |
|---|---|
| 1 — four error classes pass through `transform()` silently | {% ref "WORK-556" /%} (`tag-undefined`, `attribute-undefined`) and {% ref "WORK-558" /%} (`attribute-value-invalid`, `attribute-missing-required`) |
| 2 — custom attribute validators are dead code in the build path | {% ref "WORK-558" /%}. They execute for the first time; a test proves one rejects bad input through `loadContent` rather than by calling the class. |
| 3 — the `error` rune has no producer | {% ref "WORK-555" /%}. Deleted rather than wired: it was author-reachable and crashed the build on an unguarded `err.id`. |
| 4 — `refrakt validate` does not validate content | **Deliberately open.** SPEC-132 D1 makes renaming or repurposing that command a follow-up, and argues that adding content validation *to* it would deepen the confusion rather than fix it — a third guard nobody invokes. Validation belongs where the content is already being processed. |

### One claim in this report was wrong

> *Scanning `site/content` … found **zero** genuine `tag-undefined`. So fixing
> this is **prospective, not remedial** for the refrakt repo itself.*

True for `tag-undefined`, and the report is careful to say the attribute classes
"could not be checked the same way; they need the built tag set". Once they
could be, the repo was not clean:

- `{% hint type="tip" %}` — not one of `caution | check | note | warning`, so it
  rendered `data-type="tip"` with no CSS behind it. Symptom 1, third row,
  in our own blog.
- `{% ref "Sandbox" %}` written as an opening tag where `ref` is self-closing,
  swallowing the rest of the paragraph.
- `frame-displace="both"` — a value Lumina styles and the schema's `matches`
  enum omits. The schema and the stylesheet disagreed and the page rendered
  correctly, so nothing could have found it but a validator.
- `collection.limit` declared `String` while its own documentation writes
  `limit=5`, and five quoted booleans in content that worked by accident.

And two defects in the machinery itself: `bindRow` dropped `inline` when cloning
nodes (6,609 findings once the pass ran), and
`plan-site-dogfood-real.test.ts` had been building 786 pages with every plan
rune missing from Markdoc's tag set — passing the whole time, because an
undefined tag drops and renders its children as prose. That last one is this
bug's thesis proved on the test suite written to catch defects.

So the framing should have been "prospective **and** remedial". The
user-facing argument the report rests on is unaffected and was the right one to
lead with.

### The `SpaceSeparatedNumberList` note needs a correction too

> *`SpaceSeparatedNumberList` is the clearest case. Its `validate` exists to
> reject non-numeric input; its `transform` runs `parseInt` unguarded. In the
> build the check never fires and the `NaN` sails through.*

Accurate about the class, but **no shipped rune uses it** — only
`grid.spans` uses `SpaceSeparatedList`. So the `NaN` was never reachable from
content either. The unguarded `parseInt` remains its own small defect, out of
scope per {% ref "WORK-558" /%}, and now genuinely guarded for anyone who does
declare the type.

### Verification

`site/` and `plan-site/` both report zero findings across all five enabled ids,
down from 9,926 when the pass was first switched on. 4,427 tests pass.

{% /bug %}
