{% work id="WORK-300" status="done" priority="high" complexity="moderate" source="SPEC-078" tags="drawer,hoist,sentinel,registry,postprocess" milestone="v0.17.0" %}

# Drawer hoist mechanism for the shared `preview` attribute

Extend the existing `registerDrawers` pipeline phase so it collects
**hoisted-drawer sentinels** emitted by `file-ref` and `xref` when
their `preview="…"` attribute is set, dedups by id, and emits one
hoisted `<dialog>` per unique target at the page's drawer area. This is
the shared mechanism both downstream runes use, so doing it once here
keeps {% ref "WORK-301" /%} and {% ref "WORK-302" /%} focused on their
own rune surface.

## Acceptance Criteria

- [x] New sentinel meta-tag shape: `data-field="hoist-drawer"
  data-source="file-ref"|"xref" data-target-id="…" data-payload="…"`.
  Emitted by `file-ref` and `xref` schemas (in their respective work
  items) wherever `preview="drawer"` is set.
- [x] `registerDrawers` in
  `packages/runes/src/drawer-pipeline.ts` (extending the existing
  function, not replacing it) walks the rendered renderable for these
  sentinels, dedups by `data-target-id` (so N mentions = 1 drawer),
  and emits one `<dialog>` per unique id at the page's drawer area.
- [x] **Slug derivation** is deterministic and exposed as a helper —
  for `file-ref`: `pathToSlug(path, lines): string`
  (`packages-types-src-token-contract-ts-L42-L58`); for `xref`: the
  entity id verbatim (`SPEC-076`). Different paths *or* different line
  ranges of the same path produce distinct slugs.
- [x] **Collision with author-declared drawers**: if a `{% drawer
  id="…" %}` block-level declaration exists with the same id a hoist
  would generate, the author drawer wins — the hoist defers, no new
  `<dialog>` is emitted, and the inline preview link points at the
  existing drawer. The build emits an info-level `PipelineContext`
  message naming both the hoist source and the existing declaration.
- [x] **Nested-preview detection**: when a `preview="drawer"`-bearing
  rune is found *inside* an existing `{% drawer %}` body (including
  the footer zone added by {% ref "WORK-298" /%}), the hoist still
  proceeds (it's supported), but the build emits an info-level note
  so authors can spot it in CI output.
- [x] The hoisted drawer renders with the new `footer` slot from
  {% ref "WORK-298" /%}; payload-specific content (snippet + GitHub
  link for `file-ref`, expand-equivalent + entity link for `xref`) is
  populated by the consuming runes via the sentinel's `data-payload`.
- [x] Tests in `packages/runes/test/drawer-hoist*.test.ts` cover:
  dedup of repeated sentinels; collision with author-declared drawer;
  nested-preview detection; slug-determinism across runs.

## Approach

Two extension points on the existing drawer pipeline:

1. `registerDrawers` already walks the tree for `{% drawer %}`
   declarations. Extend the same walk to also collect `hoist-drawer`
   sentinel metas. Build a per-page map: `id → declaration` (author)
   and `id → sentinel` (hoist). For each unique id the author entry
   wins; otherwise emit a hoisted `<dialog>`.
2. **Payload separation**: the sentinel carries source-specific data
   (`path`/`lines` for file-ref, entity id for xref), but the actual
   drawer body rendering is the consuming rune's responsibility (done
   in {% ref "WORK-301" /%} and {% ref "WORK-302" /%}). This work
   item ships the *plumbing* — sentinel collection, dedup,
   collision/nesting detection, slug derivation — not the body
   content.

Drawer placement on the page is unchanged (same area the existing
drawer rune uses). Hoisted drawers are siblings of author-declared
ones in the rendered output.

## Dependencies

- {% ref "WORK-298" /%} — drawer footer slot. The hoisted drawer
  needs the footer infrastructure to land payload-specific links.

## References

- {% ref "SPEC-078" /%} — Implementation note (slug derivation,
  collision, nested-preview).
- {% ref "SPEC-060" /%} — the existing drawer rune and the
  `registerDrawers` pipeline phase this extends.

## Resolution

Completed: 2026-05-29

Branch: `claude/spec-078-implementation`

### What was done
- `packages/runes/src/drawer-pipeline.ts` — extended with the hoist mechanism (~210 lines added at end of file). Exposes `hoistPreviewDrawers(renderable, pageUrl, registry, projectRoot, ctx)` which walks the page tree, finds `<meta data-field="hoist-drawer">` sentinels, dedups by `data-target-id`, detects collisions with author-declared drawers (author wins, info note) and nested previews (still hoists, info note), then appends one hoisted `<section>` per unique target to the page root. The actual drawer body is built by a source-specific `HoistBuilder` registered via `registerHoistBuilder(source, fn)` — file-ref and xref register themselves in WORK-301/302, so this file knows nothing about their internals.
- `pathToSlug(path, lines?)` helper exported alongside the hoist mechanism — lowercases, replaces non-alphanumeric runs with `-`, appends `-L{start}` or `-L{start}-L{end}` for line ranges. Distinct paths and distinct line ranges produce distinct slugs (locked in by tests).
- `packages/runes/src/index.ts` — re-exports `hoistPreviewDrawers`, `registerHoistBuilder`, `getHoistBuilder`, `pathToSlug`, `HOIST_DRAWER_SENTINEL`, and the `HoistBuilder` / `HoistBuildContext` types.
- `packages/runes/src/config.ts` — wires `hoistPreviewDrawers` into the core `postProcess` chain between `resolveAutoDrawerTitleLevels` and `resolveExpands` so the hoist runs before any expand inside a hoisted drawer body gets resolved (relevant for `xref preview="drawer"` whose body is an expand-equivalent).
- `packages/runes/test/drawer-hoist.test.ts` — 15 tests covering: no-op when no sentinels; missing target-id warning; unregistered source warning; sentinel strip + drawer append; inline anchor preservation; dedup of repeated target-ids; distinct ids stay separate; collision with author drawer (author wins, info note, only one drawer in output); nested-preview detection (still hoists, info note); plus 6 `pathToSlug` shape assertions.

### Notes
- The walk uses a `STRIP` symbol returned from the recursive walker to signal "remove this from the parent's children array" — distinct from "replace this with another value" since some sentinels are removed without replacement.
- The hoist pass tracks `drawerDepth` during the walk so nested-preview detection can fire when a sentinel appears inside an existing author-declared drawer's body. Drawer-in-drawer (a hoisted preview inside another hoisted preview) isn't specifically detected because the postProcess walk doesn't recurse into the synthetic drawer output it just produced, but the visible behaviour is the same: still hoists, info note fires for the inner one.
- `registerHoistBuilder` overwrites on re-registration so tests can stub per-case. Production usage from `file-ref.ts` and `xref.ts` happens once at module load and is idempotent.
- The `<section>` returned by the builder is expected to carry `data-rune="drawer"` + `data-drawer-id` so it gets the same CSS chrome as author-declared drawers and so the behaviors layer can enhance it to a `<dialog>` like any other drawer.
- The mechanism is built around a single side-effect (the global `hoistBuilders` map). That's acceptable because the registry is read-only at hoist time and builders only register once per process. If tests need isolation across builders they can re-register before each test, which the test file does via `beforeEach`.

{% /work %}
