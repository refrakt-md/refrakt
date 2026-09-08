---
'@refrakt-md/transform': patch
---

Serve every published JSON Schema URL, fixing the 404 that scaffolded projects' `$schema` pointed at

`create-refrakt` writes a `$schema` URL derived from its own package version (`https://refrakt.md/schemas/vX.Y/refrakt.config.schema.json`), but the docs site only ever served one hardcoded version — `v0.11`. Every project scaffolded from v0.12 onward pointed at a URL that did not exist, so new projects got no editor validation or autocomplete at all.

The theme-token schema had it worse: `create-refrakt` scaffolds `https://refrakt.md/schemas/vX.Y/theme-tokens.json` for preset authoring, and there was no route for it at any URL. Its own `$id` claimed `https://refrakt.md/schemas/theme-tokens.json`, which also 404'd.

The versioned route is now generated rather than hardcoded: `schemas/[version]/` enumerates `v0.11` through the version `@refrakt-md/transform` ships, for both schemas, plus the unversioned `schemas/theme-tokens.json` alias. Because the release workflow builds the site *after* the version bump, the release that publishes vX.Y now publishes `/schemas/vX.Y/` as part of the same run — the coupling that was missing between the scaffold and the route.

Each endpoint stamps `$id` to match the URL it is served from. The schema file bundled inside this package now carries the unversioned `$id` (`https://refrakt.md/refrakt.config.schema.json`) rather than a hardcoded `v0.11`, so the packaged copy can't go stale between releases.

Versioned URLs are stable addresses, not frozen snapshots — every version serves the latest schema body, which is benign because schema changes are additive. `site/content/docs/configuration/schema.md` now says so plainly instead of promising per-release freezing.
