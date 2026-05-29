{% work id="WORK-301" status="ready" priority="high" complexity="moderate" source="SPEC-078" tags="file-ref,runes,github,snippet,sandbox" milestone="v0.17.0" %}

# `file-ref` rune — path-based file references with optional drawer preview

The new inline rune from {% ref "SPEC-078" /%} Capability 1 — a
path-based reference that renders an `<a>` linking to a project file's
canonical GitHub URL (or, with `preview="drawer"`, hoists a drawer
containing the file's snippet plus a footer link to GitHub). The third
member of the registry-reference family alongside `xref` (entity id →
link) and `expand` (entity id → inlined content): `file-ref` is the
path-based sibling.

## Acceptance Criteria

- [ ] New rune at `packages/runes/src/tags/file-ref.ts` with attributes
  `path` (required string), `lines` (optional `42-58` or `42` shape),
  `label` (optional), `preview` (enum `"drawer"` for v1; reserved
  `"popover" | "details" | "sidenote"` for the schema's `matches`
  but rejected by the resolver).
- [ ] **Without `preview`**: emits an inline `<a>` with `href`
  computed by the helper from {% ref "WORK-299" /%}
  (`buildGithubBlobUrl`). When `repoUrl` is missing the link emits
  *without* `href` and a one-time per-page build warning fires.
- [ ] **With `preview="drawer"`**: emits an inline `<a
  href="#drawer-{slug}">` *plus* a hoist sentinel
  (per {% ref "WORK-300" /%}). The hoist's payload populates the
  drawer body with `{% snippet path=… lines=… /%}` and the chrome
  footer with a `View source on GitHub →` link.
- [ ] **Label default** is the filename (the path's basename) when no
  explicit `label` is set. Path with no filename falls back to the
  raw path. Documented in the rune description and the site docs.
- [ ] **Path sandbox** reuses `packages/runes/src/lib/read-file.ts`:
  absolute paths rejected, traversal escapes (`..`) rejected,
  symlinks escaping the project root rejected, missing files error at
  build time. Same error messages as `snippet`.
- [ ] **A11y**: when `preview="drawer"` is set, the inline `<a>`
  carries `aria-controls="drawer-{slug}"` and gains
  `aria-expanded="false"` (the existing drawer behavior layer flips
  it to `"true"` on open, same as the `xref → drawer` flow today).
- [ ] **No-JS fallback**: with no JS, `href="#drawer-{slug}"` is a
  real in-page anchor that scrolls to the hoisted drawer's SSR-visible
  fallback (the existing drawer rune's behavior; no new fallback
  needed).
- [ ] Engine config entry for `FileRef` in `packages/runes/src/config.ts`:
  `{ block: 'file-ref' }`. Catalog entry via `defineRune` in
  `packages/runes/src/index.ts`.
- [ ] Lumina CSS in `packages/lumina/styles/runes/file-ref.css` for
  the inline link — modest font tweak to distinguish from prose
  links, external-link arrow icon when the href is GitHub and
  `preview` is absent.
- [ ] Tests in `packages/runes/test/file-ref*.test.ts` cover: GitHub
  URL build for all `lines` shapes; missing `repoUrl` warning;
  `preview="drawer"` sentinel emission; sandbox enforcement; label
  default vs explicit; in-page anchor href when previewing; CSS
  coverage selectors.

## Approach

Mostly composition of pieces shipping in the prior work items —
`buildGithubBlobUrl` (WORK-299), the hoist mechanism (WORK-300), the
drawer footer slot (WORK-298), and the `read-file` sandbox + snippet
rune (existing). The new rune is the glue.

Two transform branches:
- No `preview`: emit `<a>` directly with GitHub URL (or no-href +
  warning).
- `preview="drawer"`: emit `<a href="#drawer-{slug}">` *and* the
  hoist sentinel meta tag carrying path / lines / repoUrl context.

The hoist mechanism's payload-rendering side (turning the sentinel
into a snippet body + footer link) is part of this work item — it
calls `{% snippet %}` programmatically with the same options the
`snippet` rune supports.

Catalog entry goes in the **Registry** category established in v0.16
({% ref "SPEC-078" /%}'s framing: `file-ref` sits with `xref` /
`expand` as the path-based sibling of the entity-id-based pair).

## Dependencies

- {% ref "WORK-298" /%} — drawer footer slot.
- {% ref "WORK-299" /%} — `repoUrl` / `repoBranch` + URL helper.
- {% ref "WORK-300" /%} — hoist mechanism.

## References

- {% ref "SPEC-078" /%} — Capability 1.
- {% ref "SPEC-062" /%} — `snippet` rune; drawer body composition.

{% /work %}
