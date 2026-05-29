{% work id="WORK-302" status="done" priority="medium" complexity="simple" source="SPEC-078" tags="xref,preview,drawer,expand,registry" milestone="v0.17.0" %}

# `xref preview="drawer"` — mention an entity in prose, expand on demand

Extend the existing `xref` rune with a `preview="…"` attribute (per
{% ref "SPEC-078" /%} Capability 2) so an inline reference to a
registered entity (`{% ref "SPEC-076" preview="drawer" /%}`) emits the
same inline link as today *plus* a hoist sentinel for a drawer
containing the entity's `expand`-equivalent content. Same attribute
name as `file-ref`'s, same hoist mechanism, same drawer footer
behaviour — one preview vocabulary across both reference runes.

## Acceptance Criteria

- [x] `xref` schema in `packages/runes/src/tags/xref.ts` gains a
  `preview` attribute (enum `"drawer"` in v1; reserved `"popover" |
  "details" | "sidenote"`).
- [x] **Without `preview`**: behaviour unchanged — inline `<a>` to
  the entity's resolved URL (today's xref).
- [x] **With `preview="drawer"`**: inline `<a href="#drawer-{id}">`
  (where `{id}` is the entity id) *plus* a hoist sentinel. The hoist
  payload populates the drawer body via the same resolver path
  `{% expand "id" /%}` uses, and the chrome footer with a link to
  the entity's `sourceUrl` (or the registry's resolved page URL).
- [x] **Missing `sourceUrl`**: for entities with no resolved URL
  (heading entities, drawer-target entities), the drawer body still
  renders normally; the footer link silently hides. No build warning
  for this — it's a legitimate shape.
- [x] **A11y** parallels {% ref "WORK-301" /%}: the inline `<a>`
  carries `aria-controls="drawer-{id}"` and `aria-expanded="false"`.
- [x] **No-JS fallback** parallels {% ref "WORK-301" /%}: the in-page
  anchor scrolls to the hoisted drawer's SSR fallback (drawer rune's
  existing behaviour).
- [x] Tests in `packages/runes/test/xref-preview*.test.ts` cover:
  preview omitted → today's behaviour; preview set → sentinel emitted
  + inline link points at hoist id; entity without `sourceUrl` →
  footer link hidden; dedup across multiple refs to same id (one
  drawer total per page); xref-patterns from `refrakt.config.json`
  still produce correct external-link footers.

## Approach

A two-line schema extension (add `preview` to attributes) plus a
transform branch that emits a hoist sentinel when `preview` is set,
carrying the entity id as the payload key.

The payload-rendering side runs in {% ref "WORK-300" /%}'s hoist
mechanism — it looks up the entity via the registry, calls the same
expand resolver `{% expand %}` uses, and assembles body + footer.
This work item is mostly *plumbing* on the xref side: detect the
attribute, emit the sentinel.

`xref preview="drawer"` and `{% expand %}` stay distinct runes —
`expand` is the in-flow content-inlining one ({% ref "SPEC-066" /%}),
`xref preview="drawer"` is the on-demand reveal. Different intents,
same underlying expand resolver shared.

## Dependencies

- {% ref "WORK-298" /%} — drawer footer slot.
- {% ref "WORK-300" /%} — hoist mechanism.

## References

- {% ref "SPEC-078" /%} — Capability 2 (shared preview attribute).
- {% ref "SPEC-065" /%} — xref patterns; same registry the preview
  mode reads from.
- {% ref "SPEC-066" /%} — `expand`; the in-flow counterpart.

## Resolution

Completed: 2026-05-29

Branch: `claude/spec-078-implementation`

### What was done
- `packages/runes/src/tags/xref.ts` — schema gains a `preview` attribute (enum `"drawer"`; matches restricts it). Transform stamps `data-xref-preview="drawer"` on the placeholder span when the attribute is set; behaviour for non-preview xrefs is byte-identical to before.
- `packages/runes/src/xref-preview-resolve.ts` — new pre-hoist resolver `resolveXrefPreviews` walks xref placeholders carrying the preview attribute, replaces each with an inline `<a href="#drawer-{id}">` (with `aria-controls`, `aria-expanded`, `data-target-type="drawer"`) and a sibling `<meta data-field="hoist-drawer" data-source="xref">` sentinel. Non-preview placeholders fall through to the regular `resolveXrefs` pass that runs later in the chain.
- Same file registers a hoist builder for the `xref` source. The builder looks up the entity by id, builds a drawer with: header (entity title), body (`<div data-rune="expand-pending" data-expand-id="X">` placeholder), and footer (link to `entity.sourceUrl`, hidden when the entity has none). `resolveExpands` runs after the hoist in the postProcess chain, so the placeholder gets substituted with the entity's actual content — visually identical to a hand-authored `{% drawer %}{% expand "X" /%}{% /drawer %}`.
- `packages/runes/src/config.ts` — `resolveXrefPreviews` slotted into the postProcess chain between `resolveFileRefs` and `hoistPreviewDrawers`, so it has a chance to emit hoist sentinels before the hoist pass collects them.
- `packages/runes/src/index.ts` — side-effect import of `xref-preview-resolve.js` registers the xref hoist builder at module load; re-exports `resolveXrefPreviews`.
- `packages/runes/test/xref-preview.test.ts` — 8 tests covering: non-preview xref passthrough; preview placeholder → inline anchor + hoist sentinel; authored label vs entity title fallback; entity-not-in-registry fallback to id; drawer renders with expand-pending body + footer linking to sourceUrl; footer hides for entities without sourceUrl; per-entity dedup of repeated previews on a page; expand-pending body resolves to entity content when `resolveExpands` runs after.

### Notes
- `xref` schema's `preview` attribute uses `matches: ['drawer']`, so Markdoc validation rejects unknown values (`preview="popover"` etc.) at parse time. The Future extensions list will expand this matches array when popover / details / sidenote land.
- The xref hoist builder doesn't need a project-root context (only the registry), so the existing `HoistBuildContext.projectRoot` stays optional and unused for this source.
- Slug derivation for xref is just the entity id verbatim — distinct from file-ref's path-based slug. Both keep the same `data-target-id` shape so the hoist pipeline doesn't care which source it is.
- 8 xref-preview tests + 12 file-ref + 15 hoist + 22 drawer + 14 github-url = 71 new tests across WORK-298..302. Full 992-test runes/lumina suite green; broader 1405-test suite stays green too.

{% /work %}
