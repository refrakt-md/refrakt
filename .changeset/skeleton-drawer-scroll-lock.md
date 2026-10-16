---
'@refrakt-md/skeleton': patch
---

The drawer scroll lock now sets `overflow: hidden` only on `<html>`, not on `<body>`. On iOS Safari, locking both left the sticky site header trailing behind page scrolling after a drawer had been opened, until the page was reloaded (BUG-044). Scrolling inside a drawer's body also no longer chains to the page.
