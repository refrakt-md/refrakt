---
'@refrakt-md/cli': minor
'@refrakt-md/mcp': minor
---

Add a `refrakt.validate` MCP tool.

The MCP surface had `plan_validate` and no content equivalent — exactly the gap
an agent falls into: it could check the plan graph it just edited, and not the
content.

```
refrakt.validate({ site?, only?, deep?, configPath?, limit? })
→ { ok, configPath, sites: [{ site, config, content, counts, … }] }
```

Findings are structured — file, line, severity, error id, message — not a
rendered report, so a caller can filter and act on individual ones rather than
parsing text. Per-site counts come with them, and the content list is capped
(default 200) with a `contentTruncated` count, because a site mid-migration can
produce thousands.

It calls the same function `refrakt validate` calls. `@refrakt-md/cli` now
exports that run as `@refrakt-md/cli/validate.js` (`runValidation`,
`hasErrors`), with the CLI command reduced to formatting and an exit code — no
second implementation, and no shelling out to parse output back into data.
