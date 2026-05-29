{% work id="WORK-300" status="ready" priority="high" complexity="moderate" source="SPEC-078" tags="drawer,hoist,sentinel,registry,postprocess" milestone="v0.17.0" %}

# Drawer hoist mechanism for the shared `preview` attribute

Extend the existing `registerDrawers` pipeline phase so it collects
**hoisted-drawer sentinels** emitted by `file-ref` and `xref` when
their `preview="…"` attribute is set, dedups by id, and emits one
hoisted `<dialog>` per unique target at the page's drawer area. This is
the shared mechanism both downstream runes use, so doing it once here
keeps {% ref "WORK-301" /%} and {% ref "WORK-302" /%} focused on their
own rune surface.

## Acceptance Criteria

- [ ] New sentinel meta-tag shape: `data-field="hoist-drawer"
  data-source="file-ref"|"xref" data-target-id="…" data-payload="…"`.
  Emitted by `file-ref` and `xref` schemas (in their respective work
  items) wherever `preview="drawer"` is set.
- [ ] `registerDrawers` in
  `packages/runes/src/drawer-pipeline.ts` (extending the existing
  function, not replacing it) walks the rendered renderable for these
  sentinels, dedups by `data-target-id` (so N mentions = 1 drawer),
  and emits one `<dialog>` per unique id at the page's drawer area.
- [ ] **Slug derivation** is deterministic and exposed as a helper —
  for `file-ref`: `pathToSlug(path, lines): string`
  (`packages-types-src-token-contract-ts-L42-L58`); for `xref`: the
  entity id verbatim (`SPEC-076`). Different paths *or* different line
  ranges of the same path produce distinct slugs.
- [ ] **Collision with author-declared drawers**: if a `{% drawer
  id="…" %}` block-level declaration exists with the same id a hoist
  would generate, the author drawer wins — the hoist defers, no new
  `<dialog>` is emitted, and the inline preview link points at the
  existing drawer. The build emits an info-level `PipelineContext`
  message naming both the hoist source and the existing declaration.
- [ ] **Nested-preview detection**: when a `preview="drawer"`-bearing
  rune is found *inside* an existing `{% drawer %}` body (including
  the footer zone added by {% ref "WORK-298" /%}), the hoist still
  proceeds (it's supported), but the build emits an info-level note
  so authors can spot it in CI output.
- [ ] The hoisted drawer renders with the new `footer` slot from
  {% ref "WORK-298" /%}; payload-specific content (snippet + GitHub
  link for `file-ref`, expand-equivalent + entity link for `xref`) is
  populated by the consuming runes via the sentinel's `data-payload`.
- [ ] Tests in `packages/runes/test/drawer-hoist*.test.ts` cover:
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

{% /work %}
