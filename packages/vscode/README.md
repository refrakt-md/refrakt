# refrakt.md for VS Code

Syntax highlighting, snippets, and editor support for [refrakt.md](https://github.com/refrakt-md/refrakt) content authoring with Markdoc runes.

## Features

### Syntax Highlighting

Rune tags (`{% hint %}`, `{% /hint %}`) are highlighted within Markdown files with distinct colors for:

- Tag delimiters (`{%`, `%}`)
- Rune names (`hint`, `hero`, `pricing`)
- Attribute names and values (`type="warning"`, `columns=3`)
- Boolean and numeric literals

### Snippets

Type `rune:` to see all available rune snippets. Each snippet expands with smart tabstops and attribute choices:

- `rune:hint` -- callout with type selector (note, warning, caution, check)
- `rune:hero` -- hero section with headline and CTA
- `rune:tabs` -- tabbed interface with heading-based tabs
- `rune:pricing` -- pricing table with tier structure
- `rune:recipe` -- recipe with prep time, cook time, and servings
- `rune:api` -- API endpoint with method, path, and parameter table
- ...and 40+ more for every rune in the library

Also includes `frontmatter` and `frontmatter:blog` snippets for YAML front matter.

### Bracket Matching & Folding

- `{% tag %}` and `{% /tag %}` are matched as bracket pairs
- Rune blocks can be folded using the gutter fold icons

## Requirements

No dependencies. This extension is purely declarative (TextMate grammar + snippets).

## Extension Settings

No configuration required. The extension activates automatically for all Markdown files.
