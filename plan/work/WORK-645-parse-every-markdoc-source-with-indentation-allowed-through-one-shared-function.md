{% work id="WORK-645" status="done" priority="high" complexity="moderate" source="SPEC-170" tags="markdoc, parsing, authoring, composition, tooling" milestone="v0.42.0" pr="refrakt-md/refrakt#716" %}

# Parse every Markdoc source with indentation allowed, through one shared function

Indenting the content of a tag by a tab or four spaces breaks it today: the indented lines
become a code block, with no error. Composition templates nest runes several levels deep, so
this is the first thing an author of a definition runs into. Markdoc's `allowIndentation`
tokenizer option fixes it, and {% ref "SPEC-170" /%} measured that it changes no existing parse.

`Markdoc.parse(` is called directly in about 20 source files across packages and plugins. This
item replaces them with one shared `parse` (SPEC-170 D1), so a page cannot render one way and
validate, or preview, another.

## Acceptance Criteria

- [x] A core package exports a `parse` function that tokenizes with `allowIndentation: true`, and every direct `Markdoc.parse` call in packages and plugins uses it
- [x] A check reports any new direct `Markdoc.parse` call outside the shared function
- [x] A template indented with tabs and one indented with four spaces produce the same AST as the unindented template, including `---`, headings, lists, nested tags and a fence with relative indentation, asserted in a test
- [x] Parsing every tracked `.md` file with the shared function gives the same AST as before, measured on Markdoc 0.5.10 and recorded in the resolution
- [x] `refrakt validate`, the language server and the editor preview parse an indented page the same way the content loader does
- [x] The composed-runes guide documents indentation, and the composed fixtures in `packages/content/test/fixtures/composed-storytelling/runes/` are indented by SPEC-170 D5 with byte-identical rendered output (by hand here; {% ref "WORK-657" /%} enforces it afterwards)
- [x] The changeset describes the behaviour change for lines indented four or more spaces

## Approach

- Put `parse` where every parse site can import it without a new dependency edge. `@refrakt-md/runes`
  is imported by content, cli, editor, language-server and the plugins, so it is the likely home;
  the language server and editor must not pull in anything that reads the file system.
- The "no existing parse changes" measurement in SPEC-170 was taken on Markdoc 0.4.0. Re-run it
  after {% ref "WORK-640" /%}, against the same file set, before turning the option on.
- `Markdoc.format` round trips need no change (SPEC-170 D3).
- The check can be a test that greps `packages/` and `plugins/` source for `Markdoc.parse(`,
  with the shared function as the one allowed site.

## Blocked by

- {% ref "WORK-640" /%}: the Markdoc upgrade lands first, so the measurement is taken once, on the version that ships.

## References

- {% ref "SPEC-170" /%}: D1–D4.
- {% ref "SPEC-177" /%}: every template example in it is indented, and assumes this.

## Resolution

Completed: 2026-10-25

Branch: `claude/v0-42-0-planning-t31f5e`

### What was done
- `packages/runes/src/parse.ts`: `parse(source, args?)`, using a module-level `Markdoc.Tokenizer({ allowIndentation: true })`; exported from `@refrakt-md/runes`.
- 23 direct `Markdoc.parse` calls replaced: content (`layout`, `site` ×4, `validate-content`), cli (`gallery`, `inspect` ×2; `InspectDeps.Markdoc` no longer carries `parse`), editor (`layout-resolver`, `preview`, app `inline-markdown`, `block-renderer`), language-server (`parser/markdoc` ×2, `inspector`), runes (`collection-helpers`, `collection-resolve`, `deferred-body`, `expand-pipeline`, `lib/composition`), plan (`render`, `scanner-core`).
- `packages/runes/test/parse.test.ts`: tab- and four-space-indented templates parse to the flat AST (`---`, heading, nested list, two tag levels, a fence with relative indentation). A `git grep` check fails on any direct call outside `parse.ts`.
- **Measurement on 0.5.10:** `allowIndentation` on vs off over all 1,545 tracked `.md` files gives **0 AST differences**.
- Surface tests: `content/test/indented-content.test.ts` (loader and `validateContent`), `language-server/test/indentation.test.ts`, `editor/test/indented-preview.test.ts`.
- The composed fixtures (`bond`, `character`, `faction`, `realm`, plus `teaser` and `steps`) are indented by D5. All 14 storytelling fixture pages render byte-identically from the old and new definitions, and the snippet review markers stay current.
- The guide has an "Indentation" section, and its first example is indented. The changeset covers the four-space behaviour change.

### Notes
- The guide does not name `refrakt format` yet. WORK-657 adds it.

{% /work %}
