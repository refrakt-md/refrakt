---
"@refrakt-md/runes": patch
"@refrakt-md/lumina": patch
---

Add nav top-level links support. Items before the first heading in a `{% nav %}` rune now render as prominent top-level links above the grouped navigation, styled with `.rf-nav__top-level`. Explicit markdown links (`[Label](/path)`) in nav items pass through as-is rather than being treated as slugs for web component resolution.
