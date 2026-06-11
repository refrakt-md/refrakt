---
"@refrakt-md/runes": minor
---

Page frontmatter is now indexed onto the `page` entity, so `collection` and `aggregate` can filter and group pages by any frontmatter field — `tags`, `author`, `image`, or your own custom fields (e.g. `category`, `status`). Routing/render-control keys (`layout`, `tint`, `tint-mode`, `tint-lock`, `slug`, `redirect`) are excluded so they don't pollute queries; the curated fields (`title`, `description`, `date`, `order`, `icon`, `draft`) keep their normalised values. Enables tag-driven page collections and registry-fed catalogues (SPEC-092 Layer 1).
