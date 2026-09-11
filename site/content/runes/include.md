---
title: Include
description: Paste a partial's content into the page before the preprocess phase, so data and snippet inside it resolve
category: "Code & Data"
plugin: core
status: stable
type: rune
---

# Include

`{% include %}` pastes a shared file's content into the page, like `{% partial %}` — but early enough that `{% data %}` and `{% snippet %}` inside that file resolve.

```markdoc
{% include file="attribute-table.md" variables={rune: "card"} /%}
```

Both runes read the same `_partials/` directory and the same [file roots](/docs/authoring/partials#namespaced-partials-via-file-roots), so moving between them changes the call site and nothing else. A file's location does not depend on its contents.

## When to use which

**Reach for `{% partial %}` first.** It is Markdoc's own tag, it works the same way in every Markdoc project, and it covers the common case: a reusable chunk of content, with or without variables.

**Reach for `{% include %}` when the file contains `{% data %}` or `{% snippet %}`.** Those are refrakt's, and they resolve in a phase Markdoc does not know about — see below. `include` is otherwise a strict superset, so switching costs nothing but the tag name.

| | `partial` | `include` |
|---|---|---|
| Whose tag | Markdoc's | refrakt's |
| Reads `_partials/` and file roots | yes | yes |
| Takes `variables` | yes | yes |
| Contains `data` / `snippet` | **no** — the build stops | yes |
| Sees the page's own variables | no — its scope replaces them | yes, for anything it does not bind |

## The problem it solves

Markdoc expands `{% partial %}` during the **transform** phase. refrakt resolves `data` and `snippet` in a **preprocess** phase that runs before that, walking the page's syntax tree — and a partial's content is not in that tree yet when it runs. So the tag survives, reaches its own transform, and the build stops:

```
{% data %} reached the transform phase unresolved.

If this file is pulled in with {% partial %}: use {% include %} instead.
```

`include` runs first in the preprocess phase and splices the file's content into the page, so everything that follows sees it as ordinary page content.

## Setup

There is no separate setup. Put the file in `_partials/` exactly as you would for a partial, and reference it by the same key.

```
content/
├── _partials/
│   ├── cta.md                  ← plain content: use {% partial %}
│   └── attribute-table.md      ← contains {% data %}: use {% include %}
└── runes/
    └── card.md
```

```markdoc
{% include file="attribute-table.md" /%}
{% include file="shared/attribute-table.md" /%}
{% include file="shared:attribute-table.md" /%}
```

## Passing variables

`variables` works the way it does on `partial` — a map of bindings the file reads with `$`.

**Included file** (`_partials/attribute-table.md`):

```markdoc
{% data src="_data/rune-attributes.json" root="attributes" where=$q %}
### {% $row.name %}

{% $row.description %}
{% /data %}
```

**Usage:**

```markdoc
{% include file="attribute-table.md" variables={q: "rune:card scope:own"} /%}
```

The difference from `partial` is where the binding lands. A partial's variables are a scope the transform reads, which is exactly the phase a preprocessor rune never reaches. An include substitutes them into the content as it pastes, so a binding reaches `{% data where=$q %}` — the case above.

One consequence worth knowing: variables the include **does not** bind are left alone rather than blanked, so `{% $page.slug %}` inside an included file still resolves against the page. A partial cannot do that — its scope replaces the variable surface.

## Nesting

An included file can include another. Depth is bounded, and a cycle is reported by name rather than overflowing the stack:

```
include error: cycle — a.md → b.md → c.md → a.md
```

## Content boundaries

The pasted content lands as **siblings** at the call site, not wrapped in a container. That is what lets a parent rune read it:

```markdoc
{% accordion %}
{% include file="faq-items.md" /%}
{% /accordion %}
```

The accordion sees the included headings as its own children and builds one item per heading. Had the content been wrapped, `{% section %}` and `{% grid %}` would consume it and the items would vanish with no error — so it is not.

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:include"} /%}

## Errors

Failures render on the page as a caution callout and record a build error; one bad include does not take down the build.

| Message | Cause |
|---------|-------|
| `"x.md" was not found in _partials/ or any registered file root` | No such key. The message lists what is available. |
| `the \`file\` attribute is required` | Omitted, or a variable reference that resolved to empty. |
| `cycle — a.md → b.md → a.md` | A file includes itself, directly or through a chain. |
| `nested more than 16 deep` | A chain of distinct files past the depth bound. |

## Related

- [Partials](/docs/authoring/partials) — the shared `_partials/` directory, file roots, and the choice between the two runes
- [data](/runes/data) — the rune that most often forces this choice
- [snippet](/runes/snippet) — the other preprocessor rune
