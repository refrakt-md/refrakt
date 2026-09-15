---
"@refrakt-md/content": minor
"@refrakt-md/types": minor
"@refrakt-md/runes": patch
---

Validate content during the build (WORK-556, SPEC-132 phase 1)

Every rune schema declares required attributes, typed attributes and `matches`
enums. Markdoc can check all of them and has been able to the whole time.
Nothing in the build ever asked it to — the validator ran in the language
server and over the fixture corpus, never over a user's pages (BUG-014).

`Markdoc.validate()` now runs per page in `packages/content/src/site.ts`,
against the *same config object* handed to `Markdoc.transform`. Plugin runes are
covered with no extra wiring, because they are already merged into that config.

Findings become `PipelineWarning`s and nothing else. Nothing is injected into
the page: a validation finding annotates content that rendered perfectly well,
so it belongs beside the page rather than in it. `PipelineWarning.phase` gains a
`'validate'` member; core findings carry `pluginName: 'core'`, and a finding on a
plugin-contributed page is attributed to the contributing plugin and says the
page was generated.

Two error ids are enabled: `tag-undefined` and `attribute-undefined`. The
allow-list is explicit, so adding an id is a deliberate act. `variable-undefined`
is not enabled and a test pins that it stays out — Markdoc validates the full
path and has no scope model, so a collection template using `$item.data.*` would
light up entirely.

Fenced examples stay exempt. `escapeFenceTags` already neutralises tags inside
fences before parsing; a test now pins that ordering, with a companion assertion
that the same rune outside a fence *is* reported.

**Three real defects this found immediately**, all of the "silently wrong" class
the feature exists to catch:

- `{% code %}` cells in the generated rune-attribute tables came out block-level.
  `bindRow` in `data-pipeline.ts` cloned nodes without carrying `inline` across —
  under a comment that claimed it copied exactly that. 6,609 findings; fixed
  here, along with the same omission in `cloneNode`.
- `{% ref "Sandbox" %}` on the security page was written as an opening tag rather
  than self-closing, so the ref swallowed the rest of the paragraph.
- `{% hint type="tip" %}` on an older blog post — `tip` is not one of
  `caution | check | note | warning`, so it rendered `data-type="tip"` with no CSS
  behind it.

Plus one in the test suite: `plan-site-dogfood-real.test.ts` had been building
the plan site with every plan rune missing from Markdoc's tag set, and passing,
because an undefined tag drops and renders its children as prose.

A clean build of `site/` and `plan-site/` now reports zero findings from these
two ids.
