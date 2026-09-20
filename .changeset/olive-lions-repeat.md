---
'@refrakt-md/content': minor
---

Add `validateContent` — validate a content tree without building it.

`loadContent` validates as a side effect of building a `Site`: it resolves
routes and layouts, shells out to git for timestamps, runs the identity
transform, then runs three cross-page phases over every page. `validateContent`
runs only what validation needs — parse, preprocess, `Markdoc.validate` — and
returns findings rather than a `Site`. On refrakt's own 235-page site that is
**8x faster** (460ms vs 3.8s).

Findings are structured, so a caller can filter by error id or open a file at a
line without parsing text:

```ts
import { validateContent } from '@refrakt-md/content';

const findings = await validateContent('./site/content', { siteConfig });
// → [{ file, url, line, severity, id, message }, …]
```

The two paths validate against a config built by the *same* function, so they
cannot disagree about which tags and attributes exist — and a test asserts they
produce identical findings over the real site corpus, including under
`disableIds`, a narrowed `ids` allow-list, and `enabled: false`.

Also exported: `validatePageDetailed` and `DetailedFinding`, which carry the
Markdoc error id and source line alongside the `PipelineWarning` that
`validatePage` already returns. `validatePage` is unchanged.
