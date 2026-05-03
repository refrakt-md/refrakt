---
"@refrakt-md/mcp": patch
---

Include `packages/mcp` in the root build chain so the published tarball contains `dist/`. Previously the package was added to the workspace but never built during `npm run release`, causing `npx -y @refrakt-md/mcp` to fail because `bin: ./dist/bin.js` was missing from the npm artifact (only `package.json` shipped).
