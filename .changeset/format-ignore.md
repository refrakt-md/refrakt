---
'@refrakt-md/cli': patch
'@refrakt-md/mcp': patch
---

`refrakt format` takes `--ignore <path>` (repeatable), and the `refrakt.format` MCP tool takes `ignore`. Each leaves out a file, or a directory and everything under it, for generated content that its generator rewrites.
