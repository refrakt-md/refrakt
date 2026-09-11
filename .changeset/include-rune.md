---
"@refrakt-md/types": patch
"@refrakt-md/runes": patch
"@refrakt-md/content": patch
"@refrakt-md/language-server": patch
---

Add `{% include %}`, a pre-transform sibling to `{% partial %}` (SPEC-129)

A partial cannot contain `{% data %}` or `{% snippet %}`. Markdoc expands partials during the transform; refrakt resolves those two runes in a preprocess phase that walks the page's syntax tree *before* it. A partial's content is not in that tree yet, so the tag survives, reaches its own transform, and stops the build.

`{% include %}` closes the gap. It runs first in the preprocess phase and splices the file's parsed AST into the page, so everything after it — `snippet`, `data`, and anything later added to the phase — sees the pasted content as ordinary page content.

```markdoc
{% include file="attribute-table.md" variables={q: "rune:card scope:own"} /%}
```

Both runes read the same `_partials/` directory and the same `namespace:file` file roots, so only the call site changes: a file's location does not depend on its contents. `partial` stays the documented default — it is Markdoc's, and it covers the common case.

Details worth knowing:

- **Content is spliced as siblings**, not wrapped, so a parent rune's content model reads it — `{% accordion %}{% include … /%}{% /accordion %}` builds one item per included heading.
- **`variables` are substituted into the pasted content** rather than bound as a transform-time scope, which is what lets a binding reach a preprocessor attribute like `{% data where=$q %}`. Variables the include does not bind are left alone, so `{% $page.slug %}` inside an included file still resolves against the page.
- **Nesting is bounded and cycles are named** — `include error: cycle — a.md → b.md → a.md` rather than a stack overflow.
- Failures render as a caution callout on the page and record a build error; one bad include does not take down the build.

The `data` and `snippet` schema-transform errors now name this fix instead of describing the pipeline, since with `partial` as the default that error is how most authors will discover the rune exists. `docs/authoring/partials.md`'s claim that partials are "inlined at parse time" is corrected, and the choice between the two runes is documented there and on the new `/runes/include` page.

Editor support (completions, missing-file diagnostics, go-to-definition) now covers `{% include %}` alongside `{% partial %}`.
