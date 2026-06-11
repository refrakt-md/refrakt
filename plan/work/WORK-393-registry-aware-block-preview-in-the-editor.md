{% work id="WORK-393" status="ready" priority="high" complexity="moderate" source="SPEC-096" tags="editor,registry,preview,collection,aggregate,sandbox" %}

# Registry-aware block preview in the editor

In block mode, registry-resolved runes — `collection`, `relationships`,
`aggregate`, `xref`, `expand`, and data-bound `sandbox` — render as
unresolved sentinel shells with no explanation. They resolve in core
postProcess against `coreData.registry`, which the client-side block
renderer never runs; `RUNTIME_ONLY_TYPES` in `block-renderer.ts` only
placeholders `nav*`. The server already holds the registry and resolvers
(the full-page iframe preview uses them), so render these blocks
server-side; where that's not possible, show an honest placeholder instead
of an empty shell.

## Acceptance Criteria
- [ ] Blocks containing `collection` / `relationships` / `aggregate` /
  `xref` / `expand` render with real resolved entity data in block mode
  (server-rendered against the cached registry).
- [ ] Data-bound sandboxes ({% ref "SPEC-093" /%}) receive their
  `data-rf-records` payload in block mode so `window.RF_DATA` previews
  work.
- [ ] When resolution isn't possible (registry still indexing, resolver
  error), the block shows a labelled placeholder stating what it is and
  why it can't render — never a silent empty shell.
- [ ] Resolved block previews refresh when the pipeline cache refreshes
  (today: on save; live updates arrive with {% ref "WORK-056" /%}).
- [ ] Non-registry blocks keep the current pure client-side render path
  (no latency regression for ordinary blocks).

## Approach
- Detect registry-dependent runes in a block client-side (tag-name set
  derived from served rune metadata, not hardcoded — the resolver-backed
  runes are known to the core config).
- For those blocks, call the existing `POST /api/preview-data` (or a
  lighter `POST /api/preview-block`) so the server runs the Phase-4
  postProcess chain with `cachedAggregated` + hook sets — the same path
  `renderPreviewContent` already uses (`packages/editor/src/preview.ts`).
- Extend `RUNTIME_ONLY_TYPES` handling in
  `app/src/lib/preview/block-renderer.ts` into a general
  "server-resolved" branch with the labelled-placeholder fallback.
- Invalidate server-rendered block previews on the existing
  pipeline-cache refresh signal.

## References
- {% ref "SPEC-096" /%} · {% ref "SPEC-093" /%} · {% ref "WORK-056" /%}
- `packages/editor/app/src/lib/preview/block-renderer.ts`
  (`RUNTIME_ONLY_TYPES`), `packages/editor/src/preview.ts`
  (`renderPreviewContent`, `runPreviewPostProcess`),
  `packages/runes/src/config.ts` (core postProcess resolver chain).

{% /work %}
