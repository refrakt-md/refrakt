{% work id="WORK-549" status="ready" priority="high" complexity="moderate" source="SPEC-129" milestone="v0.33.0" tags="runes,authoring,preprocess" %}

# A pre-transform include rune

Implement {% ref "SPEC-129" /%}: an `{% include %}` rune that pastes a file's AST during
preprocess, so `data` and `snippet` inside it resolve. Unblocks
{% ref "WORK-548" /%}'s shared-block criterion.

## Acceptance Criteria
- [ ] A file's AST is pasted into the page during preprocess, before the `data` and `snippet` hooks
- [ ] Content is **spliced as siblings**, so a parent rune's content model reads it as if typed there
- [ ] A test proves a `{% data %}` inside the pasted file resolves — the case `partial` fails
- [ ] Nesting is bounded and a cycle errors by name rather than overflowing the stack
- [ ] The file resolves through the same `ProjectFiles` sandbox `snippet` and `data` use
- [ ] Parameterisation follows SPEC-129's settled option
- [ ] `{% data %}`'s `where` can name the rune without per-page authoring, or the fallback is implemented and its cost recorded
- [ ] `docs/authoring/partials.md` no longer claims partials are "inlined at parse time"
- [ ] The choice between this rune and `partial` is documented where an author will look

## Approach

**The name, the new-rune question and the directory are settled** — see
SPEC-129. What remains open is whether `include` becomes the documented default
over `partial`, which is editorial rather than technical and does not block
implementation.

**Option B needs {% ref "BUG-010" /%} fixed first, not alongside.** Deriving the
query from `$page.slug` means `resolveString` evaluating `Function` nodes — and
while an unresolvable `where` silently matches every row, a mistake there
produces a page that renders every rune's attributes under one heading and looks
plausible. Fix the silent failure, then build on the resolver.

**Splice, don't wrap** — the same constraint {% ref "SPEC-127" /%} settled for
`data` rows, measured there: a container that is itself a rune with a content
model consumes its children, and the pasted content vanishes with no error.

**Recursion is the failure worth designing for.** An include including itself is an
infinite paste. Bound the depth and name the cycle; a stack overflow during
preprocess gives an author nothing to act on.

## Blocked by

- {% ref "BUG-010" /%} — option B builds on the resolver this bug makes untrustworthy

{% /work %}
