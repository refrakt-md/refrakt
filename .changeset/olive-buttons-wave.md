---
'@refrakt-md/cli': patch
---

Fix `npx refrakt` not working from a fresh clone.

npm skips creating a workspace bin symlink when its target does not exist at
install time, and every bin in this repo points into `dist/` — which `npm ci`
runs before. So `node_modules/.bin/refrakt` was never created, and every
documented `npx refrakt …` command failed with "could not determine executable
to run".

The root `build` script now ends with `npm rebuild --workspaces` (~3s), which
relinks `refrakt`, `create-refrakt` and `refrakt-mcp` once their `dist/` exists.

This only ever affected working in this repository; consumers install the CLI
from npm, where the bin is linked normally.
