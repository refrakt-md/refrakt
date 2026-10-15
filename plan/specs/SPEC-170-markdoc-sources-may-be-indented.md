{% spec id="SPEC-170" status="draft" tags="markdoc, parsing, authoring, composition, tooling" %}

# Markdoc sources may be indented

## Summary

Composition templates nest runes several levels deep, and without indentation they are hard to
read. Today, indenting the content of a tag by four spaces or a tab silently breaks it. Markdoc
0.4.0, the version installed, has an `allowIndentation` tokenizer option that fixes this.
Measured across every Markdown file in the repository, turning it on changes no existing parse.
This spec turns it on everywhere refrakt parses Markdoc, through one shared parse function.

## What happens today

A template indented with tabs, which is this repository's indentation convention:

```md
{% card %}
	{% slot name="portrait" /%}

	---

	# {% $attrs.name %}

	- item one
	- item two

	{% details summary="x" %}
		Inner text
	{% /details %}
{% /card %}
```

Parsed with the default tokenizer:

- **Two spaces work.** CommonMark lets a block start up to three spaces in, so `---`, headings
  and lists are recognised.
- **Four spaces or a tab do not, and nothing reports it.** `---`, `# Name` and `- item` become
  literal paragraph text. An indented closing tag becomes inline text, so tags nest wrongly and
  the following content ends up inside the wrong rune.

Markdoc disables CommonMark's indented code blocks (the tokenizer disables the `code` rule,
`node_modules/@markdoc/markdoc/src/tokenizer/index.ts`), so the indentation means nothing; the
text just falls through into paragraphs.

## What `allowIndentation` does

`new Markdoc.Tokenizer({ allowIndentation: true })`, with `Markdoc.parse(tokenizer.tokenize(source))`.
The tokenizer source only declares the option; the behaviour is in Markdoc's bundled copy of
markdown-it, which skips its "four or more spaces is not a block" check in each block rule when
the option is set (`node_modules/@markdoc/markdoc/dist/index.js:3363` and seven similar sites).

Measured on the template above:

- with four spaces or tabs, `hr`, `heading`, `list` and nested tags parse exactly as they do
  unindented;
- a fenced code block inside an indented tag keeps its **relative** indentation: a line written
  with one more tab than the fence keeps that tab, and the shared indentation is removed.

It is a parser-wide setting, not limited to the inside of tags.

## Measured: no existing content changes

Every tracked `.md` file in the repository except changelogs (1,366 files: site content, plan,
fixtures, package docs) was parsed with and without the option, and the ASTs compared. **No
file changed.** Nothing indents inside tags today, because it breaks, so nothing relies on the
old behaviour.

## Decisions

### D1 — one shared parse function, used by every parse site

`Markdoc.parse` is called directly in about 20 source files, among them:

- the content loader and layouts (`packages/content/src/site.ts`, `layout.ts`);
- content validation (`packages/content/src/validate-content.ts`);
- composition templates (`packages/runes/src/lib/composition.ts:425`);
- collections and deferred bodies (`packages/runes/src/collection-*.ts`, `deferred-body.ts`,
  `expand-pipeline.ts`);
- the language server (`packages/language-server/src/parser/`);
- the editor's preview and layout resolver (`packages/editor/`);
- the CLI's `inspect` and `gallery`;
- the plan scanner and renderer (`plugins/plan/src/`).

A core package exports one `parse(source)` that creates the tokenizer with
`allowIndentation: true`, and every site calls it. Setting the option at each call site instead
would let a page render correctly and fail validation, or show differently in the editor, as
soon as one site was missed.

A lint check (or a test that greps the source) reports a direct `Markdoc.parse(` call outside
the shared function, so a new parse site cannot skip it.

### D2 — content gets it too, not only templates

Templates need it most, and they are new, so nothing depends on the old behaviour. Content gets
the same parser because:

- the measurement found no change to any existing file;
- one parser for templates and another for pages would make a snippet behave differently
  depending on where it is pasted;
- authors nesting runes in content have the same readability problem.

There is no opt-out setting. If a third-party site turns out to depend on the old behaviour,
one can be added then.

### D3 — round trips through `Markdoc.format` stay consistent

`Markdoc.format` is used for in-memory round trips (`packages/runes/src/deferred-body.ts:38`,
`collection-helpers.ts:49`, `collection-resolve.ts:120`, `:133`, `packages/content/src/site.ts:547`):
a node is serialised and parsed again later. Its default output is unindented, which both
parsers read the same way, so these need no change. No tool in the repository writes source
files back through `Markdoc.format`. A future one (the editor writing Markdoc, for example)
passes `allowIndentation: true` to the formatter, so an author's indentation is kept.

### D4 — documentation and examples use indentation

- The composed-runes guide (`site/content/extend/rune-authoring/composed-runes.md`) states that
  tag content may be indented with tabs or spaces, and its examples are indented.
- The composed-rune fixtures (`packages/content/test/fixtures/composed-storytelling/runes/`)
  are re-indented, as the first real use. Their rendered output must not change.
- The changeset notes the one behaviour change for content: a line indented four or more spaces
  that used to continue a paragraph as text can now start a block.

## Acceptance Criteria

- [ ] A core package exports a `parse` function that tokenizes with `allowIndentation: true`, and every direct `Markdoc.parse` call in packages and plugins uses it
- [ ] A check reports any new direct `Markdoc.parse` call outside the shared function
- [ ] A template indented with tabs and one indented with four spaces produce the same AST as the unindented template, including `---`, headings, lists, nested tags and a fence with relative indentation, asserted in a test
- [ ] Parsing every tracked `.md` file with the shared function gives the same AST as before, asserted once when the change lands
- [ ] `refrakt validate`, the language server and the editor preview parse an indented page the same way the content loader does
- [ ] The composed-runes guide documents indentation, and the composed fixtures are indented with byte-identical rendered output
- [ ] The changeset describes the behaviour change for lines indented four or more spaces

## References

- {% ref "SPEC-145" /%}: composed-rune templates, the main consumer.
- {% ref "SPEC-169" /%}: what compositions can express; indentation is a readability fix, independent of it.
- {% ref "WORK-640" /%}: the Markdoc 0.5.10 upgrade, which lands first so the shared `parse()` is built on the current version.

{% /spec %}
