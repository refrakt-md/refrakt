---
title: Frontmatter
description: Every frontmatter field refrakt reads
---

# Frontmatter

A page's YAML frontmatter sits between `---` fences at the top of the file:

```markdown
---
title: Surfaces
description: The surface model on one page
tags: [runes, theme]
---

# Surfaces
```

Every field below is generated from `frontmatter.schema.json` — the same schema your editor can validate against — so this lists what refrakt actually reads.

{% hint type="note" %}
**The set is open.** Runes and pipeline hooks read author fields refrakt knows nothing about, so any key you like is valid. The fields here are the ones *refrakt itself* consumes.
{% /hint %}

## Fields

{% data src="site/content/_data/frontmatter-fields.json" root="fields" %}
### {% $row.name %}

**{% $row.type %}**

{% $row.description %}
{% /data %}

## Validating frontmatter in your editor

Point your editor's YAML support at the published schema for hover documentation and completion inside `---` blocks:

```json
{
  "yaml.schemas": {
    "https://refrakt.md/frontmatter.schema.json": ["**/content/**/*.md"]
  }
}
```

See [Schema](/docs/configuration/schema) for the versioned URLs.

## See also

- [Tint](/docs/concepts/tint) — how `tint`, `tint-mode` and `tint-lock` cascade
- [Entities](/docs/authoring/entities) — what `type` and `id` register the page as
- [Configuration reference](/docs/configuration/reference) — the same treatment for `refrakt.config.json`
