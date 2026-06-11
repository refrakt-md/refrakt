---
"create-refrakt": patch
---

The `@refrakt-md/html` scaffold now ships a working client runtime. `template-html`'s build bundles `initPage()` (from `@refrakt-md/html/client` + `@refrakt-md/behaviors`) to `build/client.js` via esbuild and loads it on every page, and it ships the layout-chrome CSS (header, theme-toggle, search, mobile, on-this-page). Scaffolded static HTML sites now have working interactive runes (tabs, accordion, drawer, search) and a functioning, styled theme-toggle — previously all inert.
