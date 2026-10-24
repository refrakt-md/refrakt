{% work id="WORK-645" status="ready" priority="high" complexity="moderate" source="SPEC-170" tags="markdoc, parsing, authoring, composition, tooling" milestone="v0.42.0" %}

# Parse every Markdoc source with indentation allowed, through one shared function

Indenting the content of a tag by a tab or four spaces breaks it today: the indented lines
become a code block, with no error. Composition templates nest runes several levels deep, so
this is the first thing an author of a definition runs into. Markdoc's `allowIndentation`
tokenizer option fixes it, and {% ref "SPEC-170" /%} measured that it changes no existing parse.

`Markdoc.parse(` is called directly in about 20 source files across packages and plugins. This
item replaces them with one shared `parse` (SPEC-170 D1), so a page cannot render one way and
validate, or preview, another.

## Acceptance Criteria

- [ ] A core package exports a `parse` function that tokenizes with `allowIndentation: true`, and every direct `Markdoc.parse` call in packages and plugins uses it
- [ ] A check reports any new direct `Markdoc.parse` call outside the shared function
- [ ] A template indented with tabs and one indented with four spaces produce the same AST as the unindented template, including `---`, headings, lists, nested tags and a fence with relative indentation, asserted in a test
- [ ] Parsing every tracked `.md` file with the shared function gives the same AST as before, measured on Markdoc 0.5.10 and recorded in the resolution
- [ ] `refrakt validate`, the language server and the editor preview parse an indented page the same way the content loader does
- [ ] The composed-runes guide documents indentation, and the composed fixtures in `packages/content/test/fixtures/composed-storytelling/runes/` are indented by SPEC-170 D5 with byte-identical rendered output (by hand here; {% ref "WORK-657" /%} enforces it afterwards)
- [ ] The changeset describes the behaviour change for lines indented four or more spaces

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

{% /work %}
