{% work id="WORK-255" status="ready" priority="medium" complexity="moderate" source="SPEC-062" tags="runes, docs, code, transform" milestone="v0.15.0" %}

# Snippet rune

The `snippet` rune renders the contents of a file (path relative to the project root) as a syntax-highlighted code block. Solves the recurring "docs example drifts from source" problem and incidentally enables the view-source-of-current-page pattern via `{% snippet path=$file.path /%}`. Lives in `@refrakt-md/docs`.

## Acceptance Criteria

- [ ] `{% snippet path="..." /%}` reads the file from project root and renders it as a syntax-highlighted code block
- [ ] Paths are resolved relative to the directory containing `refrakt.config.json`
- [ ] Absolute paths (`/etc/passwd`) are rejected with a build error
- [ ] Traversal paths (`../../foo`) escaping project root are rejected with a build error
- [ ] Symlinks pointing outside project root are rejected with a build error
- [ ] Missing files produce a build error naming the resolved path and the referencing source location
- [ ] Directory paths are rejected with a build error
- [ ] `lines="10-25"` extracts lines 10–25 inclusive
- [ ] `lines="10-"` extracts from line 10 to end of file
- [ ] `lines="-20"` extracts from line 1 to line 20
- [ ] `lines="10"` extracts just line 10
- [ ] Out-of-range end clamps to file length with a build warning
- [ ] Out-of-range start (entirely past EOF) is a build error
- [ ] Inverted range (`"25-10"`) is a build error
- [ ] Malformed range string is a build error with the input echoed
- [ ] Language is inferred from file extension via the shared `lang-map` module from WORK-254
- [ ] `lang=` overrides inferred language
- [ ] `title=` renders as a caption in `.rf-snippet__title`
- [ ] `data-source-path` is set on the wrapper to the resolved path (relative to project root)
- [ ] `data-lines` is set when `lines=` is used
- [ ] `{% snippet path=$file.path /%}` works end-to-end (project-root frame matches the sandbox)
- [ ] CSS in the docs plugin covers `.rf-snippet*` selectors
- [ ] Authoring docs cover the rune, sandbox rules, line range syntax, language inference table

## Approach

Per the spec's Engine Changes section:

- `plugins/docs/src/runes/snippet.ts` — rune schema (`createContentModelSchema`)
- `plugins/docs/src/lib/read-file.ts` — file-reading utility with sandbox enforcement (absolute-path reject, traversal reject, symlink reject, existence check) and line-range slicing
- Plugin's `theme.runes` adds the `Snippet` config entry
- CSS in `plugins/docs/styles/snippet.css`
- Output produces the same internal Markdoc node shape as a fenced code block (so existing rendering picks it up) plus the `snippet` wrapper

Project-root resolution helper is reusable by future file-reading runes; placement at `plugins/docs/src/lib/` for now, can be promoted to a shared module if more consumers appear.

## Dependencies

- {% ref "WORK-249" /%} — `$file.path` (for the view-source-of-current-page pattern)
- {% ref "WORK-254" /%} — shared `lang-map` module

## References

- {% ref "SPEC-062" /%} — snippet-rune spec (full)
- {% ref "SPEC-060" /%} — drawer rune (composes for view-source pattern)
- {% ref "SPEC-068" /%} — deferred HMR follow-up for referenced-file watching
- `packages/lumina/styles/runes/code-block.css` — existing code-block CSS to compose with

{% /work %}
