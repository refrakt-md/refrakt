---
'@refrakt-md/design': patch
'@refrakt-md/editor': patch
---

Design tokens now reach the sandbox iframe (BUG-034). The design plugin, and the editor preview, put a sandbox's `design-context` tokens in a child `<meta data-field="design-tokens">` that the `rf-sandbox` behaviour never read, so the iframe always got no tokens. They now set `data-design-tokens` on the `rf-sandbox` element, which is where the behaviour reads them. **This is a visible change:** on a site with a default `design-context`, every sandbox now renders with that context's fonts, colours and spacing variables, and a Tailwind sandbox gets its theme config.
