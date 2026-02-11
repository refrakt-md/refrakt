---
title: Getting Started
description: Learn how to work with your refract.md site
---

# Getting Started

This is your first documentation page. You can find this file at `content/docs/getting-started.md`.

## Project Structure

Your site has three key directories:

- `content/` — Markdown files that make up your pages
- `src/` — SvelteKit application shell (rarely needs editing)
- `static/` — Static assets served as-is

## Writing Content

Every Markdown file in `content/` becomes a page. Add frontmatter at the top for metadata:

```markdown
---
title: Page Title
description: A brief description
---
```

## Using Runes

Runes are Markdoc tags that give your Markdown semantic meaning:

{% hint type="note" %}
This callout is created with the `hint` rune. Try changing the `type` attribute to `warning`, `caution`, or `check`.
{% /hint %}

## Next Steps

- Add more pages by creating `.md` files in `content/`
- Edit `content/_layout.md` to customize your site's header and navigation
- Explore the available runes in the refract.md documentation
