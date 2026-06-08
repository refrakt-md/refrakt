{% work id="WORK-347" status="done" priority="medium" complexity="moderate" source="SPEC-085" milestone="v0.19.0" tags="bento,marketing,authoring" %}

# Explicit bento-cell authoring

Make `{% bento-cell %}` a first-class authoring path for full per-tile control
(the dashboard use case), alongside the heading sugar. Today the `bento-cell` tag
is registered but `convertHeadings` would swallow a hand-authored cell into the
preceding heading's content, so explicit authoring doesn't actually work.

## Acceptance Criteria
- [x] A `bento` whose children include `{% bento-cell %}` tags uses them directly as cells, **short-circuiting** heading conversion (no mixing within one grid — out of scope by decision).
- [x] An explicit cell accepts **`cols` / `rows`** (precise per-axis grid spans) and/or **`size`** (preset), plus `media-position`, `href`, and a `---`-split media zone (the SPEC-085 / WORK-345 contract). The legacy **`span` attribute is removed** (subsumed by `cols`).
- [x] When no explicit cells are present, heading sugar behaves as defined in WORK-348.
- [x] A grid that mixes headings and explicit cells is handled deterministically (explicit cells win / headings ignored) and documented; it is not a supported authoring pattern.
- [x] Tests cover: an all-explicit grid (incl. `cols`/`rows`), an all-heading grid, and the mixed-input fallback.

## Approach
In `bento`'s `processChildren` / transform, detect explicit `bento-cell` tag nodes
up front; if any exist, bypass `convertHeadings` and pass the cells through.
Otherwise run heading conversion. Keep the cell transform identical for both paths
so structure is uniform; `cols`/`rows`/`size` resolve to grid spans per WORK-348.

## References
- `plugins/marketing/src/tags/bento.ts` (convertHeadings, bento transform), `plugins/marketing/src/index.ts` (bento-cell registration)
- Substrate {% ref "SPEC-085" /%}; cell zones {% ref "WORK-345" /%}; sizing {% ref "WORK-348" /%}

## Resolution

Completed: 2026-06-06

Branch: `claude/v0.19-bento`

### What was done
- **Explicit cells short-circuit heading sugar.** `bento`'s `processChildren` now scans for `{% bento-cell %}` tag nodes up front: if any exist, it filters to *only* those (headings and loose content are ignored) and bypasses `convertHeadings`; otherwise it runs heading conversion as before. "Explicit wins, no mixing" is deterministic by construction.
- **Explicit cells are full first-class.** The same `bentoCell` transform serves both paths, so a hand-authored cell accepts `cols`/`rows` (per-axis spans → `--cell-cols`/`--cell-rows`), `size` (preset), `media-position`, `href` (stretched link), and a `---`-split media/body/footer zone set. The leading heading becomes the uniform-level `<h3>` title.
- **`media-position` schema attr is kebab** (`media-position`, matched against `top|bottom|start|end`) so the author-facing attribute matches the emitted `data-media-position`. The legacy `span` attribute was already removed in WORK-348 (subsumed by `cols`).
- Added 2 tests to `plugins/marketing/test/bento.test.ts`: an all-explicit grid (`cols`/`rows`/`href`/`media-position="end"` → resolved field spans, `data-media-position`, `<a data-name="link">`, `<h3>` title) and a mixed-input grid (explicit cell used, sibling heading ignored). The all-heading path is covered by the existing sugar tests. 12 bento tests green.

### Notes
- No config or contract changes vs WORK-348 — this is a transform-only change (the `bento-cell` tag and its config already existed; the gap was purely that `convertHeadings` swallowed explicit cells).
- Mixing headings + explicit cells in one grid is intentionally unsupported: explicit cells win, headings are dropped. Documented in the AC; not surfaced as an error since it is a degenerate authoring case.

{% /work %}
