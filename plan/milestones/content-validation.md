{% milestone name="v0.34.0" status="planning" %}

# v0.34.0 — Content validation

Every rune schema declares required attributes, typed attributes and `matches`
enums. Markdoc can check all of them, and has been able to the entire time.
Nothing in the build ever asked it to. This milestone connects the validator
that exists to the content it was written for.

## Why

Three pieces of one feature exist in the repo and none are wired to each other:

- **`Markdoc.validate()`** — called from exactly one place, the language server.
  Not the build, not `npm test`, not CI.
- **Custom attribute-type validators** — `SeparatedString`,
  `SpaceSeparatedNumberList`, and media's. `transform()` never invokes a custom
  type's `validate()`; only `validate()` does. They have never run in a build.
- **The `error` rune** — takes a Markdoc `ValidationError` and renders it as a
  table row. Purpose-built for validation output. **Nothing constructs it.**

And `refrakt validate`, the command whose name promises this, checks theme
config and manifest. It never reads content.

The result is four error classes rendering in silence. The worst is
`tag-undefined`: a mistyped or renamed rune does not fail — it **drops the tag
and renders its children as prose**, so the block simply vanishes from the page.

## Who this is actually for

Not us. A scan of `site/content` found **zero** genuine unknown tags across 124
distinct tags in prose. There is no backlog of latent breakage in our own docs,
and this milestone would be dishonest sold as if there were.

It is for the people running refrakt on sites we never see, who mostly do not
have the VS Code extension, and for whom the entire validation surface is
therefore unreachable. Every `required`, `matches` and type declaration in every
rune schema is currently a promise the framework does not keep for them.

That framing decides the scope: the goal is that a site author who mistypes a
rune finds out, not that our own documentation gets cleaner.

## What lands

- {% ref "BUG-009" /%} — the defect, with the measurements behind each claim.
- {% ref "WORK-549" /%} — settles what an error-severity diagnostic actually
  does. Small, and it goes first: two specs currently assume `ctx.error` is
  loud, and nobody has checked.
- {% ref "SPEC-130" /%} — the wiring. Validation at the point the tag set is
  assembled, findings routed through the diagnostics surface that already
  exists, the `error` rune finally given its input, and the error ids enabled in
  three phases by risk.

## The through-line

*The checks were always written. Nothing was listening.*

This is {% ref "SPEC-126" /%}'s finding in a second place. That spec noticed
this repo has two `--check` flags and neither runs in CI, while the guards that
actually catch things are tests that `npm test` executes. Here the pattern
repeats one level deeper: not a guard nobody runs, but a guard nobody *calls* —
plus a renderer for its output that was built and left unconnected.

Which is why {% ref "WORK-549" /%} is not optional bookkeeping. Wiring
validation into a diagnostics surface that turns out to fail nothing would
reproduce the exact disease, with more code.

## Deliberately not here

- **Build-failure semantics.** Whether an error stops the build waits on
  {% ref "WORK-549" /%}. Phase 1 lands as diagnostics either way.
- **`variable-undefined`.** Markdoc's variable checking is all-or-nothing, and
  `site.ts` already passes a partial bag — enabling it today would flag every
  correct `$item.*` in collection templates. Blocked on completing the bag,
  which is also the prerequisite for generated inline values, so the work pays
  twice.
- **Validating the docs' fenced examples.** Worth doing, and a repo script over
  `site/content` rather than a pipeline feature. Its own work item.
- **Renaming `refrakt validate`.** Real, and a follow-up.

## Minor, not patch

Nothing here changes an existing API. New diagnostics on content that
previously built silently is a behaviour change users will notice, which rules
out patch; Changesets runs in fixed mode, so the release is a minor.

{% /milestone %}
