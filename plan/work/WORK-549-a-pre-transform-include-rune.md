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
- [ ] `include` accepts `variables`, substituted into the pasted AST at paste time — the same thing `bindRow` does for `$row`
- [ ] A test proves a variable reaches a `{% data %}` attribute inside the included file, with page variables deliberately empty
- [ ] The preprocessor-in-a-partial failure names the fix — use `include` — rather than describing the pipeline; with `partial` as the default this is the main discovery path for the new rune
- [ ] Both runes read `_partials/` and the same `namespace:file` roots
- [ ] `docs/authoring/partials.md` no longer claims partials are "inlined at parse time"
- [ ] The choice between this rune and `partial` is documented where an author will look

## Approach

**Every design question is settled** — see SPEC-129: a new rune (not a mode on
the Markdoc builtin), named `include`, sharing `_partials/`, with `partial`
staying the documented default.

**That last decision makes the error message the deliverable, not a detail.**
If `partial` is what authors reach for first, the preprocessor failure *is* the
discovery path for `include` — for most people the only time they learn it
exists. Write that message before writing the rune.

**Variables come first; deriving from the page is a later refinement.**
Substituting bindings into the pasted AST needs no changes to `resolveString`,
so this ships without {% ref "BUG-010" /%}. Deriving the query from
`$page.slug` instead — so a rune page carries nothing at all — does need
function evaluation, and that must wait until BUG-010 is fixed: while an
unresolvable `where` silently matches every row, a mistake there renders every
rune's attributes under one heading and looks plausible.

**Splice, don't wrap** — the same constraint {% ref "SPEC-127" /%} settled for
`data` rows, measured there: a container that is itself a rune with a content
model consumes its children, and the pasted content vanishes with no error.

**Recursion is the failure worth designing for.** An include including itself is an
infinite paste. Bound the depth and name the cycle; a stack overflow during
preprocess gives an author nothing to act on.

## Blocked by

Nothing. The variables form needs no resolver changes — {% ref "BUG-010" /%} is
a prerequisite only for the later `$page.slug` refinement, not for shipping.

{% /work %}
