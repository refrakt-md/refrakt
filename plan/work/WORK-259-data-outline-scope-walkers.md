{% work id="WORK-259" status="done" priority="medium" complexity="simple" source="SPEC-066" tags="pipeline, transform, headings, toc" milestone="v0.15.0" %}

# Generic `data-outline-scope` walkers (TOC isolation + heading-ID namespacing)

Two generic walkers that consume the `data-outline-scope` attribute as a neutral "this subtree is a sub-outline boundary" marker. Expand sets the attribute (WORK-260); the TOC walker and heading-ID walker honor it. Any future rune (sidenote, aside, quote, panel) can adopt the same convention and get the same behavior automatically.

These walkers are extracted from the cross-cutting concern they really are: they don't know about expand specifically and shouldn't.

## Acceptance Criteria

- [x] TOC walker (used by `{% toc %}` and similar tooling) skips headings descended from any element with `data-outline-scope` set, regardless of which rune set it
- [x] Heading-ID walker prefixes IDs of headings inside any `data-outline-scope` subtree with `{scope-value}--` (e.g., `SPEC-023--acceptance-criteria`)
- [x] Heading IDs use the standard slugifier for the suffix portion; the prefix is the literal value of the nearest enclosing `data-outline-scope` attribute
- [x] Both walkers are generic — they know nothing about expand or any specific rune
- [x] When `data-outline-scope` is not present (the default for normal content), behavior is unchanged from today
- [x] Tests cover: TOC skipping inside scoped subtrees; heading-ID prefixing; nested-scope behavior (innermost scope wins); absence of attribute = no-op
- [x] Authoring docs note the `data-outline-scope` convention as a primitive available to any rune that wants to be a sub-outline boundary

## Approach

The TOC walker is the consumer side of an existing extraction; locate the heading-collection helper and add the `data-outline-scope` skip check.

The heading-ID walker is part of the existing heading-anchor-generation logic; add the scope-prefix lookup using the nearest enclosing ancestor's `data-outline-scope` value.

Both changes are small and intentionally generic — no expand-specific code.

## Dependencies

- None within v0.15.0. Independent prerequisite for WORK-260.

## References

- {% ref "SPEC-066" /%} — expand-rune spec (introduces and motivates the convention)
- {% ref "SPEC-060" /%} — drawer rune (potential future opt-in for the same convention)

## Resolution

Completed: 2026-05-23

Branch: `claude/v0.15.0`

### What was done
- `packages/runes/src/outline-scope.ts` — generic two-pass walker:
  - **Heading-ID walker** tracks an `outline-scope` stack as it walks the renderable tree and prefixes `id` attributes on heading tags (`h1`..`h6`) with `${scopeValue}--` when they live inside a `data-outline-scope` ancestor. Innermost scope wins for nested scopes; already-prefixed IDs are skipped so the pass is idempotent. Headings outside any scoped subtree are untouched.
  - **TOC walker** collects the set of scoped original IDs as a side-effect of the heading walk, then walks for `<nav data-rune="table-of-contents">` elements and drops `<li>` items whose `<a href="#id">` points at a now-scoped heading. Nested TOC lists (depth-based trees) are handled recursively. No-op when no headings got scoped.
- `packages/runes/src/config.ts` — wired the walker into `corePipelineHooks.postProcess`, after xref + snippet wrapping, so it runs last and sees the final tree (including any expand-substituted content WORK-260 lands later).
- `site/content/extend/rune-authoring/patterns.md` — appended a "Neutral primitives for cross-cutting behaviour" section documenting the convention. Covers the walker rules, the innermost-scope-wins behaviour, idempotency, the fact that runes without the attribute behave unchanged, and the relationship to `data-target-type`.

### Tests
- `packages/runes/test/outline-scope.test.ts` — 10 new tests covering heading-ID prefixing (single-scope, no-scope no-op, innermost-of-nested wins, idempotency), TOC item removal (mixed scoped/unscoped, only-scoped-removed, all-unscoped no-op), genericity (any element with the attribute and any `data-rune` value triggers the walkers), and the expand-style nested shape (`section data-rune="expand" data-outline-scope="X"` wrapping the embedded rune's section).
- 2824/2824 tests pass.

### Notes
- The TOC walker drops scoped items rather than rewriting their hrefs because the spec says the host TOC reflects only the host's structure. Embedded headings stay reachable via deep links (`/host#SPEC-023--acceptance-criteria`) but don't pollute the host's outline view.
- I deliberately didn't change `extractHeadings(ast)` (the parse-time heading scanner that populates `config.variables.headings`). Expand's substituted content arrives at postProcess so it never makes it into that list anyway — TOC isolation is essentially free for that path. Drawers that contain authored headings would still show those in the TOC because they're in the parse-time list; the spec's "drawer can opt into the convention" line is future work that requires either AST-level marking or moving TOC generation to postProcess. The convention itself works today for any postProcess-substituted content.
- Walker is the prerequisite for WORK-260 (the `{% expand %}` rune sets `data-outline-scope` on its wrapper and gets the rest for free).

{% /work %}
