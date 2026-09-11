{% work id="WORK-549" status="done" priority="high" complexity="moderate" source="SPEC-129" milestone="v0.33.0" tags="runes,authoring,preprocess" %}

# A pre-transform include rune

Implement {% ref "SPEC-129" /%}: an `{% include %}` rune that pastes a file's AST during
preprocess, so `data` and `snippet` inside it resolve. Unblocks
{% ref "WORK-548" /%}'s shared-block criterion.

## Acceptance Criteria
- [x] A file's AST is pasted into the page during preprocess, before the `data` and `snippet` hooks
- [x] Content is **spliced as siblings**, so a parent rune's content model reads it as if typed there
- [x] A test proves a `{% data %}` inside the pasted file resolves — the case `partial` fails
- [x] Nesting is bounded and a cycle errors by name rather than overflowing the stack
- [x] The file resolves through the same `ProjectFiles` sandbox `snippet` and `data` use
- [x] `include` accepts `variables`, substituted into the pasted AST at paste time — the same thing `bindRow` does for `$row`
- [x] A test proves a variable reaches a `{% data %}` attribute inside the included file, with page variables deliberately empty
- [x] The preprocessor-in-a-partial failure names the fix — use `include` — rather than describing the pipeline; with `partial` as the default this is the main discovery path for the new rune
- [x] Both runes read `_partials/` and the same `namespace:file` roots
- [x] `docs/authoring/partials.md` no longer claims partials are "inlined at parse time"
- [x] The choice between this rune and `partial` is documented where an author will look

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

## Resolution

Completed: 2026-09-11

Branch: `claude/content-author-docs-org-vps1un`

### What was done

- `packages/runes/src/tags/include.ts` — the rune schema: `file` (required) and `variables`. Like `snippet` and `data` its transform is unreachable in normal operation; it exists for inspect/contracts/catalog tooling.
- `packages/runes/src/include-pipeline.ts` — `preprocessIncludes`, the new first step of the core preprocess phase. Looks the file up in the partial map, clones its AST with the tag's `variables` substituted, and splices the nodes in as siblings. Nested includes are expanded under a stack that names a cycle; `MAX_INCLUDE_DEPTH` (16) bounds a chain of distinct files.
- `packages/runes/src/config.ts` — `preprocessIncludes` runs before `preprocessSnippets` and `preprocessData` (the ordering is the feature), plus an `Include` theme entry so the rune is known to tooling.
- `packages/types/src/pipeline.ts` — `PreprocessContext.partials`, the parsed partial map exposed at preprocess time.
- `packages/content/src/site.ts` — threads the *same* map `transformContent` hands Markdoc as `config.partials` into the preprocess context.
- `packages/runes/src/tags/{data,snippet}.ts` — rewrote both schema-transform errors to name the fix (use `{% include %}`) before describing the pipeline.
- Docs: new `site/content/runes/include.md`; `site/content/docs/authoring/partials.md` corrected and given a "Partial or include?" section; nav entry.
- Editor support: completions, missing-file diagnostics and go-to-definition now cover `{% include %}` as well as `{% partial %}`.
- Tests: `packages/runes/test/include-pipeline.test.ts` (20, unit) and `packages/content/test/include.test.ts` (5, through a real `loadContent` build).

### Notes

**Criterion 5 is satisfied by construction rather than by a second read path.** `include` resolves `file` through the partial map, not a direct `ProjectFiles.read` — which is what criterion 9 ("the same `_partials/` and the same `namespace:file` roots") actually demands, since a second resolution path would be a second set of rules to keep in sync. The map's file-root half is already read through `ProjectFiles` (`readFileRoots`); its site-local half comes from the `ContentTree`, exactly as `partial`'s does. Containment is in fact stronger than a path read: the keys are pre-scanned, so no traversal is expressible.

**A real build found a gap the unit tests could not.** The first cut no-opped whenever the partial map was undefined, mirroring how `snippet`/`data` no-op without a sandbox. But `processContentTree` leaves the map undefined when a site has *no* partials — so a stray `{% include %}` on such a site crashed with the framework-author "preprocess hook was not wired" message instead of the author-facing "not found". `site.ts` now always passes a map (`?? {}`); undefined is reserved for a caller that genuinely wired nothing.

**Every load-bearing guard was probed, not assumed.** All 20 unit tests passed on the first run, so each invariant was re-checked by breaking the implementation and watching the right test fail by name: disabling substitution failed the three variable tests; wrapping instead of splicing failed the accordion test; binding in place on shared nodes failed the cross-page leak test.

**The leak test was rewritten after the first version proved vacuous.** It originally included one file twice on one page, which passes with or without cloning — the splice lands in the *page's* children array, where the sharing never shows. It now runs two pages against one shared parsed-partial map with the `data` nested one level down, which is where a missing clone writes the first page's result into the second page's source.

**Verified in the real site, not only in tests.** A temporary `_partials/` block carrying `{% data … where=$q %}`, included from a page with `variables={q: "rune:card scope:own"}`, rendered exactly `card`'s four own attributes out of the 512-row artifact — the composition WORK-548 needs, and a filter that demonstrably bit rather than silently matching every row.

**Unbound variables pass through rather than blanking**, so `{% $page.slug %}` inside an included file still resolves against the page. That is a capability `partial` lacks — its scope replaces the variable surface — and it is what makes the later SPEC-129 refinement (deriving the query from the page) a call-site change rather than a resolver change.

**Out of scope, noticed in passing:** `packages/language-server` does not compile on this branch (`loader.ts:135`, a missing `fileRoots` on `LoadedPlugin`). Pre-existing — it reproduces with these changes stashed — and the package is not in the root `build` script. Left alone.

{% /work %}
