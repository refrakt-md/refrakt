---
title: Manual setup
description: Add refrakt.md to a project you already have
---

# Manual setup

`npx create-refrakt` sets all of this up for you. Set it up by hand when you are adding refrakt.md to an existing project.

## 1. Install the adapter

Each framework has an adapter package. Its page lists what to install and the files to add:

- [SvelteKit](/docs/adapters/sveltekit)
- [Astro](/docs/adapters/astro)
- [Next.js](/docs/adapters/nextjs)
- [Nuxt](/docs/adapters/nuxt)
- [Eleventy](/docs/adapters/eleventy)
- [Plain HTML](/docs/adapters/html)

## 2. Add `refrakt.config.json`

At the project root:

```json
{
	"$schema": "https://refrakt.md/schemas/v0.48/refrakt.config.schema.json",
	"sites": {
		"main": {
			"contentDir": "./content",
			"theme": "@refrakt-md/lumina",
			"plugins": ["@refrakt-md/marketing"]
		}
	}
}
```

`theme` is the theme package, and `plugins` adds rune packages beyond the core runes. The [configuration reference](/docs/configuration/reference) lists every field.

## 3. Add content

A refrakt.md site is a directory of Markdown files. A page's path is its URL:

```
content/
├── _layout.md
├── index.md
└── docs/
    └── getting-started.md
```

`_layout.md` defines the regions that wrap every page in its directory and below it:

```markdoc
{% layout %}
{% region name="header" %}
# My Site
{% /region %}

{% region name="nav" %}
{% nav %}
## Docs

- docs/getting-started
{% /nav %}
{% /region %}
{% /layout %}
```

`{% nav %}` turns the list into links, titled from each page's `title` frontmatter. A page is Markdown with frontmatter:

```markdoc
---
title: Welcome
---

# Hello

{% hint type="note" %}
This callout is a hint rune.
{% /hint %}
```

[Content](/docs/content) covers layouts, routes and the layout cascade in full.
