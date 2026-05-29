{% work id="WORK-299" status="ready" priority="medium" complexity="simple" source="SPEC-078" tags="config,schema,types,site,github" milestone="v0.17.0" %}

# Site config — `repoUrl` + `repoBranch` for GitHub source links

Add `repoUrl` and `repoBranch` to `SiteConfig` so {% ref "SPEC-078" /%}'s
`file-ref` rune can build a canonical `https://github.com/{owner}/{repo}/blob/{ref}/{path}#L{start}-L{end}`
URL without per-call configuration. Small, isolated, no other dependencies
— bumping it ahead of the rune work means the URL helper is ready when
WORK-301 lands.

## Acceptance Criteria

- [ ] `SiteConfig` in `packages/types/src/theme.ts` gains `repoUrl?:
  string` (e.g. `"https://github.com/refrakt-md/refrakt"`) and
  `repoBranch?: string` (default `"main"`, accepts any git ref —
  branch / tag / commit SHA).
- [ ] `refrakt.config.schema.json` schema in
  `packages/transform/refrakt.config.schema.json` reflects both fields
  with descriptions explaining the `{ref}` placeholder substitution
  and the SHA-for-archival use case.
- [ ] `RefraktConfig` (the flat-shape legacy) gains the same two
  fields as `@deprecated` shorthand mirrors of `sites.default.*`, per
  the existing pattern for all other site fields.
- [ ] New helper `buildGithubBlobUrl(repoUrl, repoBranch, path,
  lines?): string | null` in `packages/transform/src/github-url.ts`
  (or `packages/runes/src/lib/github-url.ts` — wherever neighbouring
  helpers sit). Returns `null` when `repoUrl` is missing. Handles the
  line-range suffix (`#L42`, `#L42-L58`) and encodes per path segment
  so paths with special characters round-trip cleanly.
- [ ] Unit tests cover: line range with start+end, single line, no
  lines, missing `repoUrl` (returns null), missing `repoBranch`
  (defaults to `main`), commit SHA as ref, repo URLs with and without
  trailing slash.
- [ ] `site/content/docs/configuration/sites.md` updates the Core
  Site Configuration table with the two new fields and a short
  example.

## Approach

Mechanical type extension + a single URL-build helper. The helper is
small enough that a focused unit-test file (`github-url.test.ts`) is
the right granularity. JSON schema follows the same pattern as the
`theme` object form WORK from v0.16 — add the field to both the
top-level flat-shape mirror and the `SiteConfig` definition.

`repoBranch` is typed as `string` rather than a discriminated union of
`"branch" | "tag" | "sha"` — refrakt doesn't need to know which kind
it is, just substitute the string into the URL template.

## Dependencies

_None._

## References

- {% ref "SPEC-078" /%} — Capability 1 (file-ref rune); this work item
  unblocks the GitHub URL part.

{% /work %}
