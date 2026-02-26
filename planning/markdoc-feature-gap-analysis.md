# Markdoc Feature Gap Analysis for Refrakt

## Context

Investigation of Markdoc features not currently leveraged by refrakt.md, assessed for potential value.

## Currently Used

- `parse()`, `transform()`, `validate()` (full pipeline)
- Custom tags (52 rune schemas) and custom nodes (heading, paragraph, fence, list, etc.)
- Variables (for `generatedIds`, `path`, `headings`, `__icons`, `urls`, `svg`)
- Custom attribute types (`CommaSeparatedList`, `SpaceSeparatedList`, etc.)
- AST walking (`node.walk()`)
- Programmatic node creation (`Markdoc.Ast.Node()`)
- Serialization for SvelteKit SSR boundary
- Built-in `Markdoc.tags` (spread into tag map, includes `if`, `table`, `partial`)

## Not Used (with Assessment)

### 1. Partials (`{% partial file="header.md" /%}`)

**What it does:** Includes content from another `.md` file at transform time. Supports passing variables to the included file.

```markdoc
{% partial file="header.md" /%}
{% partial file="cta.md" variables={product: "Pro"} /%}
```

Config requires pre-parsing partials into AST nodes:
```js
config.partials = { 'header.md': Markdoc.parse(headerContent) }
```

**Potential value: Medium-High.** Refrakt content authors could reuse common content blocks (CTAs, disclaimers, author bios, shared warnings/notes) across pages without duplicating markdown. This is different from layouts - layouts provide structural framing, while partials provide reusable *content* fragments.

**Considerations:**
- Requires a resolution step to find and parse partial files at build time
- The `packages/content` loader would need to scan for partial references, load the referenced files, parse them, and pass them in config
- Could integrate with the existing content directory structure (e.g., a `_partials/` convention)
- Variable passing makes them flexible (same partial, different context)

---

### 2. Content-Level Variables (`{% $variable %}`)

**What it does:** Interpolates variables directly into rendered content, not just in tag attributes. Variables are passed via `config.variables`.

```markdoc
Hello, {% $user.name %}! Your plan is {% $plan %}.
```

**Potential value: Medium.** Currently variables are used internally (headings, icons, paths) but not exposed to content authors. Exposing frontmatter fields or site-level config as variables would let authors write dynamic content:
- Reference frontmatter values in body text: `Last updated: {% $frontmatter.date %}`
- Site-wide values: `{% $site.name %}`, `{% $site.version %}`
- Per-page computed values

**Considerations:**
- Already partially supported since `config.variables` is passed to transform - just need to populate it with author-useful data
- Low implementation cost - mostly a convention/documentation change
- Could expose frontmatter as `$frontmatter.*` automatically

---

### 3. Conditionals (`{% if %}` / `{% else %}`)

**What it does:** Conditionally renders content based on variable values.

```markdoc
{% if $flags.beta %}
This feature is in beta.
{% /if %}

{% if equals($plan, "pro") %}
Pro content here.
{% else /%}
Upgrade to see this.
{% /if %}
```

**Potential value: Medium.** Useful for:
- Feature-flagged content (show/hide sections based on deployment environment)
- Audience-targeted docs (different content for different user roles/plans)
- Draft/preview content that only shows in dev mode
- Platform-specific instructions (show macOS vs Linux commands)

**Considerations:**
- Requires content-level variables (#2 above) to be useful
- These two features naturally compose together
- Already included in `Markdoc.tags` spread, so the tag is technically registered - just no variables to condition on

---

### 4. Functions (Built-in + Custom)

**What it does:** Six built-in functions (`equals`, `and`, `or`, `not`, `default`, `debug`) plus ability to define custom functions for use in content.

```markdoc
{% if and(equals($lang, "js"), not($legacy)) %}
Modern JS content
{% /if %}

Title: {% uppercase($title) %}
```

**Potential value: Low-Medium.** Built-in functions become useful if conditionals (#3) are adopted. Custom functions could enable:
- `{% includes($tags, "tutorial") %}` - check if page has a specific tag
- `{% formatDate($date) %}` - format dates in content
- `{% uppercase($title) %}` - text transforms

**Considerations:**
- Main value is unlocked in combination with conditionals
- Custom functions risk creating a "template language within a template language"
- Should be used sparingly - complex logic belongs in runes, not functions

---

### 5. `Markdoc.resolve()`

**What it does:** Resolves all Functions and Variables in the AST without performing the full transform. Returns the AST with all dynamic values replaced by their concrete values.

**Potential value: Low.** Could be useful for pre-processing or analysis, but the current pipeline goes straight from parse to transform, which handles resolution internally.

---

### 6. Formatter (`Markdoc.format()`)

**What it does:** Converts an AST back to formatted Markdoc source text. Essentially a pretty-printer.

**Potential value: Low-Medium.** Could be useful for:
- The CLI `refrakt write` command (AI-generated content formatting)
- Editor tooling (auto-format on save)
- Round-trip editing (parse, modify AST, write back)

---

### 7. Slots

**What it does:** Named content slots in tag schemas, similar to Svelte slots.

```markdoc
{% dialog %}
  {% slot "header" %}Dialog Title{% /slot %}
  {% slot "body" %}Dialog content{% /slot %}
{% /dialog %}
```

**Potential value: Low for content authoring.** The rune system already handles content decomposition through `@group()` decorators and child node processing, which is more intuitive for content authors than explicit slot syntax. Slots are designed for component-library-style composition, which isn't the refrakt content model.

---

### 8. Annotations (inline metadata on nodes)

**What it does:** Attach metadata to standard markdown elements using `{% %}` annotations.

```markdoc
# Heading {% .custom-class #custom-id %}
Paragraph {% align="center" %}
```

**Potential value: Low.** The rune system already handles metadata via tag attributes and meta tags. Annotations on standard markdown elements could be useful for one-off styling, but could also undermine the theme system's design consistency.

---

## Recommendation Summary

| Feature | Value | Effort | Recommendation |
|---------|-------|--------|---------------|
| Partials | Medium-High | Medium | Investigate further - clear content reuse value |
| Content Variables | Medium | Low | Quick win - mostly convention/docs |
| Conditionals | Medium | Low | Already registered, needs variables |
| Functions | Low-Medium | Low | Adopt if conditionals are used |
| resolve() | Low | N/A | Skip |
| format() | Low-Medium | Low | Consider for CLI/editor |
| Slots | Low | Medium | Skip - rune groups are better fit |
| Annotations | Low | Low | Skip - undermines theme consistency |

## Highest-Value Bundle

**Partials + Variables + Conditionals** form a natural feature cluster:
1. Expose frontmatter and site config as content-level variables (low effort)
2. Conditionals become useful immediately (already registered)
3. Partials enable DRY content authoring (medium effort, high author value)

This trio would give content authors significantly more power without changing the rune/theme architecture.
