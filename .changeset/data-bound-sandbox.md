---
"@refrakt-md/runes": minor
"@refrakt-md/behaviors": minor
---

**Data-bound sandboxes** (SPEC-093 core) — the registry's third render target, after `collection` (HTML) and `aggregate` (SVG): bring your own renderer. A `{% sandbox data="type:page" %}` binds a registry query (SPEC-070 field-match grammar); the build resolves it, projects (`data-fields`) and shapes it (`data-shape="flat"` | `"tree"`), caps the payload, and injects the JSON so the iframe code can read it as a frozen `window.RF_DATA`. The payload rides the same data-attribute rail as design tokens, so it works across every adapter. Over-cap payloads warn and truncate; a sandbox with no static fallback warns (progressive-enhancement reminder). Enables registry-fed visualizations like a 3D sitemap or relationship graph.
