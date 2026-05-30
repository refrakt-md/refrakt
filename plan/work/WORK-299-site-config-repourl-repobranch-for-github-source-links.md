{% work id="WORK-299" status="done" priority="medium" complexity="simple" source="SPEC-078" tags="config,schema,types,site,github" milestone="v0.17.0" %}

# Site config — `repoUrl` + `repoBranch` for GitHub source links

Add `repoUrl` and `repoBranch` to `SiteConfig` so {% ref "SPEC-078" /%}'s
`file-ref` rune can build a canonical `https://github.com/{owner}/{repo}/blob/{ref}/{path}#L{start}-L{end}`
URL without per-call configuration. Small, isolated, no other dependencies
— bumping it ahead of the rune work means the URL helper is ready when
WORK-301 lands.

## Acceptance Criteria

- [x] `SiteConfig` in `packages/types/src/theme.ts` gains `repoUrl?:
  string` (e.g. `"https://github.com/refrakt-md/refrakt"`) and
  `repoBranch?: string` (default `"main"`, accepts any git ref —
  branch / tag / commit SHA).
- [x] `refrakt.config.schema.json` schema in
  `packages/transform/refrakt.config.schema.json` reflects both fields
  with descriptions explaining the `{ref}` placeholder substitution
  and the SHA-for-archival use case.
- [x] `RefraktConfig` (the flat-shape legacy) gains the same two
  fields as `@deprecated` shorthand mirrors of `sites.default.*`, per
  the existing pattern for all other site fields.
- [x] New helper `buildGithubBlobUrl(repoUrl, repoBranch, path,
  lines?): string | null` in `packages/transform/src/github-url.ts`
  (or `packages/runes/src/lib/github-url.ts` — wherever neighbouring
  helpers sit). Returns `null` when `repoUrl` is missing. Handles the
  line-range suffix (`#L42`, `#L42-L58`) and encodes per path segment
  so paths with special characters round-trip cleanly.
- [x] Unit tests cover: line range with start+end, single line, no
  lines, missing `repoUrl` (returns null), missing `repoBranch`
  (defaults to `main`), commit SHA as ref, repo URLs with and without
  trailing slash.
- [x] `site/content/docs/configuration/sites.md` updates the Core
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

## Resolution

Completed: 2026-05-29

Branch: `claude/spec-078-implementation`

### What was done
- `packages/types/src/theme.ts` — `SiteConfig` gains `repoUrl?: string` and `repoBranch?: string` with the same `@deprecated` shorthand mirrors on `RefraktConfig` for the flat-shape legacy. Doc comments explain the canonical URL shape and the SHA-for-archival use case.
- `packages/transform/src/config-normalize.ts` — `repoUrl` and `repoBranch` added to `SITE_FIELDS` so the legacy flat-shape <-> per-site mirroring picks them up automatically.
- `packages/transform/refrakt.config.schema.json` — both fields added to the top-level legacy mirror block and inside the `SiteConfig` definition, each with a description explaining the URL template + branch-vs-tag-vs-SHA flexibility.
- `packages/transform/src/github-url.ts` — new `buildGithubBlobUrl(repoUrl, repoBranch, path, lines?)` helper plus a `formatLineAnchor(lines)` sub-helper (exported separately so `file-ref` can produce a matching `#L42-L58` fragment when falling back to in-page anchors). Returns `null` when `repoUrl` is missing; defaults `repoBranch` to `"main"` when omitted; tolerates trailing slash on `repoUrl`; percent-encodes path segments while preserving the `/` separators. Both helpers re-exported from `@refrakt-md/transform`.
- `packages/transform/test/github-url.test.ts` — 14 unit tests cover: missing repoUrl returns null; default-to-main; tag as ref; commit SHA as ref; single-line anchor; range anchor; whitespace tolerance; trailing slash on repoUrl; URL-encoding of special characters in path segments preserving the `/` separators; the canonical SPEC-078 example round-trip; plus the `formatLineAnchor` shape variants.
- `site/content/docs/configuration/sites.md` — SEO and branding section gains both fields with description rows pointing at `file-ref` and explaining the URL template.

### Notes
- `formatLineAnchor` is exported as a separate helper (not inlined into `buildGithubBlobUrl`) because `file-ref` may need it directly when generating in-page anchor fragments — same shape, no `repoUrl` required.
- The helper handles the no-`repoBranch` case by defaulting to `"main"` rather than erroring; this is what most users expect and matches the documented default.
- Schema validation: spot-checked that the existing repo's `refrakt.config.json` (which doesn't have `repoUrl` yet) still validates against the updated schema — both fields are optional so it's a strict superset.

{% /work %}
