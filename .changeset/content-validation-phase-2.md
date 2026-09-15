---
"@refrakt-md/content": minor
"@refrakt-md/runes": minor
"@refrakt-md/media": patch
---

Enforce attribute schemas during the build (WORK-558, SPEC-132 phase 2)

`attribute-value-invalid`, `attribute-missing-required` and
`attribute-type-invalid` join the validation allow-list. This is the half that
makes rune schemas mean something: `required` and `matches` are declared on ~175
tags and, until now, enforced on none of them.

It is also the first release in which refrakt's **custom attribute validators
run at all**. `transform()` does not invoke a `CustomAttributeTypeInterface`'s
`validate()` — only `Markdoc.validate()` does — so `SeparatedString`,
`SpaceSeparatedList` and `SpaceSeparatedNumberList` had been dead code in the
build path since they were written. A test now proves one rejects non-numeric
input through the real pipeline.

**Severity correction.** All four custom validators returned
`level: 'critical'` for `attribute-type-invalid`, an id Markdoc emits at
`error` — the identical failure reported at two severities depending on which
code path produced it. They now emit `error`. This matters because `critical` is
the band configuration cannot silence: it means "the document could not be
understood", which an out-of-range attribute is not.

**Three schema defects this found**, each one a case where the schema disagreed
with something else in the repo and only a validator could notice:

- `frame-displace` rejected `"both"` — a value Lumina has styled all along
  (`[data-displace="both"]`). The page rendered correctly and the schema refused
  it; nothing else in the toolchain compares the two.
- `collection.limit` was declared `String` while its own documentation writes
  `limit=5` and `limit=20`, and the resolver reads it as `Number(limitRaw)`.
  Now `Number`, matching the plan plugin's `backlog` and `plan-activity`.
- `aggregate.limit` had the identical declaration. No content exercised it, so
  it produced no finding; corrected anyway.

Markdoc's `if` / `else` are overridden to drop the `Object` type on their
`primary` attribute. That type describes expression *syntax* — `{% if $var %}`
passes an AST node — and stops holding once preprocess hooks substitute
variables for their values, so `{% if true %}` failed it. That accounted for
3,302 findings on `site/`, every one a false positive, and the check cannot
catch a real error in either direction. `render: false` is preserved.

Five content fixes in this repo's own docs, all quoted booleans and numbers
(`showContrast="true"`, `route="true"`, `limit="5"`) that worked by accident
because a non-empty string is truthy — and would have failed silently the first
time anyone wrote the negative case.

`SeparatedString` and friends are now exported from `@refrakt-md/runes`. They
were not before, which is why `plugins/media` carries its own copies.

A clean build of `site/` and `plan-site/` reports zero findings across all five
enabled ids, down from 9,926 when the pass was first switched on.
