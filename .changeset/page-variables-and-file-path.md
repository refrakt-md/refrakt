---
"@refrakt-md/runes": minor
"@refrakt-md/content": minor
"@refrakt-md/sveltekit": minor
"@refrakt-md/eleventy": minor
"@refrakt-md/editor": minor
---

Page variables: add `$page.dir`, `$page.slug`, `$page.title`, and `$file.path`; rename `$page.filePath` to `$page.path` (breaking).

The Markdoc variable surface available to authored content is now:

- `$page.path` — content-root-relative file path, POSIX-normalized (replaces `$page.filePath`)
- `$page.dir` — directory portion of `$page.path` (`""` for content-root pages, no trailing slash)
- `$page.slug` — last segment of `$page.url` (for index pages, the directory name; `""` for the homepage)
- `$page.title` — `$frontmatter.title` when present and non-empty after trimming, else the first H1 in the page AST (depth-first, descending into rune children), else `undefined`
- `$file.path` — project-root-relative source file path, POSIX-normalized (project root is the directory containing `refrakt.config.json`)

**Breaking:** `$page.filePath` is removed. Authored content that referenced `$page.filePath` must use `$page.path` instead. A grep of the refrakt corpus showed zero usages; external sites that adopted it should rename in the same step they upgrade.

Adapters (SvelteKit, Eleventy, Editor) now thread the project root through to the content loader so `$file.path` works out of the box. Hosts using `loadContentFromTree` directly can pass `projectRoot` on the options bag; when omitted, `$file.path` falls back to the content-root-relative path.
