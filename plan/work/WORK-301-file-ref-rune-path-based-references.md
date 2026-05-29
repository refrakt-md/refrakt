{% work id="WORK-301" status="done" priority="high" complexity="moderate" source="SPEC-078" tags="file-ref,runes,github,snippet,sandbox" milestone="v0.17.0" %}

# `file-ref` rune — path-based file references with optional drawer preview

The new inline rune from {% ref "SPEC-078" /%} Capability 1 — a
path-based reference that renders an `<a>` linking to a project file's
canonical GitHub URL (or, with `preview="drawer"`, hoists a drawer
containing the file's snippet plus a footer link to GitHub). The third
member of the registry-reference family alongside `xref` (entity id →
link) and `expand` (entity id → inlined content): `file-ref` is the
path-based sibling.

## Acceptance Criteria

- [x] New rune at `packages/runes/src/tags/file-ref.ts` with attributes
  `path` (required string), `lines` (optional `42-58` or `42` shape),
  `label` (optional), `preview` (enum `"drawer"` for v1; reserved
  `"popover" | "details" | "sidenote"` for the schema's `matches`
  but rejected by the resolver).
- [x] **Without `preview`**: emits an inline `<a>` with `href`
  computed by the helper from {% ref "WORK-299" /%}
  (`buildGithubBlobUrl`). When `repoUrl` is missing the link emits
  *without* `href` and a one-time per-page build warning fires.
- [x] **With `preview="drawer"`**: emits an inline `<a
  href="#drawer-{slug}">` *plus* a hoist sentinel
  (per {% ref "WORK-300" /%}). The hoist's payload populates the
  drawer body with `{% snippet path=… lines=… /%}` and the chrome
  footer with a `View source on GitHub →` link.
- [x] **Label default** is the filename (the path's basename) when no
  explicit `label` is set. Path with no filename falls back to the
  raw path. Documented in the rune description and the site docs.
- [x] **Path sandbox** reuses `packages/runes/src/lib/read-file.ts`:
  absolute paths rejected, traversal escapes (`..`) rejected,
  symlinks escaping the project root rejected, missing files error at
  build time. Same error messages as `snippet`.
- [x] **A11y**: when `preview="drawer"` is set, the inline `<a>`
  carries `aria-controls="drawer-{slug}"` and gains
  `aria-expanded="false"` (the existing drawer behavior layer flips
  it to `"true"` on open, same as the `xref → drawer` flow today).
- [x] **No-JS fallback**: with no JS, `href="#drawer-{slug}"` is a
  real in-page anchor that scrolls to the hoisted drawer's SSR-visible
  fallback (the existing drawer rune's behavior; no new fallback
  needed).
- [x] Engine config entry for `FileRef` in `packages/runes/src/config.ts`:
  `{ block: 'file-ref' }`. Catalog entry via `defineRune` in
  `packages/runes/src/index.ts`.
- [x] Lumina CSS in `packages/lumina/styles/runes/file-ref.css` for
  the inline link — modest font tweak to distinguish from prose
  links, external-link arrow icon when the href is GitHub and
  `preview` is absent.
- [x] Tests in `packages/runes/test/file-ref*.test.ts` cover: GitHub
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

## Resolution

Completed: 2026-05-29

Branch: `claude/spec-078-implementation`

### What was done
- `packages/runes/src/tags/file-ref.ts` — new self-closing rune with `path` (required), `lines`, `label`, `preview` attributes. Transform emits a sentinel meta + placeholder `<a>` inside a `<span data-rune="file-ref">` wrapper that's inline-safe in prose. Label defaults to the path's basename when no explicit `label` is given.
- `packages/runes/src/file-ref-resolve.ts` — postProcess resolver that walks file-ref sentinels and binds each inline `<a>` to its canonical GitHub URL via `buildGithubBlobUrl` (no-preview case) or a `#drawer-{slug}` fragment + a hoist sentinel (preview case). Includes the hoist builder that registers itself with the drawer pipeline at module load — reads the file via the snippet sandbox (`readSnippetFile`), wraps in `<figure class="rf-snippet"><pre data-language="..."><code>{content}</code></pre></figure>`, builds the drawer header / body / footer.
- `packages/runes/src/config.ts` — `FileRef: { block: 'file-ref' }` engine entry; `resolveFileRefs` wired into the postProcess chain between drawer-auto-title and the hoist pass; `repoUrl` / `repoBranch` threaded through `CorePipelineHooksOptions` → coreData → resolver.
- `packages/runes/src/index.ts` — `fileRef` schema imported, side-effect import of `file-ref-resolve.js` registers the hoist builder, `defineRune` catalog entry, exports for `resolveFileRefs` and `FILE_REF_SENTINEL`.
- `packages/lumina/styles/runes/file-ref.css` — inline link styling (monospace font, primary-coloured underline, slightly thicker underline on hover); imported from `index.css`.
- `packages/runes/test/file-ref.test.ts` — 12 tests covering: GitHub URL generation with line range / single line / no lines; label default to filename; missing-repoUrl one-time per-page warning; tag and SHA refs; paragraph preservation in prose; hoist sentinel emission with full payload; complete drawer rendering with snippet body + GitHub footer; footer hides when repoUrl absent; build error on missing projectRoot; sandbox enforcement; per-page dedup of repeated references.
- Contract files (`contracts/structures.json` + `packages/lumina/contracts/structures.json`) regenerated with the new `FileRef` entry.

### Notes
- file-ref is a sentinel-resolved rune (like collection / aggregate) rather than a transform-only rune so that the rune doesn't need site-config access at transform time. The transform just stashes the path / lines / label / preview attrs as metas; the resolver in postProcess binds the actual href and emits the hoist sentinel.
- For the `preview="drawer"` no-JS case the inline `<a href="#drawer-{slug}">` is a real in-page anchor. The hoist mechanism (WORK-300) emits a real `<section class="rf-drawer">` at the page root with `id="drawer-{slug}"` so the anchor resolves to it — readers without JS scroll to the visible block fallback the section produces.
- The hoist builder fails gracefully when `projectRoot` isn't threaded (build error, no drawer emitted) or when the path escapes the sandbox (`SnippetSandboxError` surfaced as a build error). The inline anchor still works in both cases — the resolver's branch that emits the anchor runs before the hoist builder gets a chance to fail.
- 12 file-ref tests + 15 hoist tests + 22 drawer tests + 14 github-url tests = 63 new tests across the WORK-298..301 series. Full suite 1405/1405 green.

{% /work %}
