{% work id="WORK-302" status="ready" priority="medium" complexity="simple" source="SPEC-078" tags="xref,preview,drawer,expand,registry" milestone="v0.17.0" %}

# `xref preview="drawer"` — mention an entity in prose, expand on demand

Extend the existing `xref` rune with a `preview="…"` attribute (per
{% ref "SPEC-078" /%} Capability 2) so an inline reference to a
registered entity (`{% ref "SPEC-076" preview="drawer" /%}`) emits the
same inline link as today *plus* a hoist sentinel for a drawer
containing the entity's `expand`-equivalent content. Same attribute
name as `file-ref`'s, same hoist mechanism, same drawer footer
behaviour — one preview vocabulary across both reference runes.

## Acceptance Criteria

- [ ] `xref` schema in `packages/runes/src/tags/xref.ts` gains a
  `preview` attribute (enum `"drawer"` in v1; reserved `"popover" |
  "details" | "sidenote"`).
- [ ] **Without `preview`**: behaviour unchanged — inline `<a>` to
  the entity's resolved URL (today's xref).
- [ ] **With `preview="drawer"`**: inline `<a href="#drawer-{id}">`
  (where `{id}` is the entity id) *plus* a hoist sentinel. The hoist
  payload populates the drawer body via the same resolver path
  `{% expand "id" /%}` uses, and the chrome footer with a link to
  the entity's `sourceUrl` (or the registry's resolved page URL).
- [ ] **Missing `sourceUrl`**: for entities with no resolved URL
  (heading entities, drawer-target entities), the drawer body still
  renders normally; the footer link silently hides. No build warning
  for this — it's a legitimate shape.
- [ ] **A11y** parallels {% ref "WORK-301" /%}: the inline `<a>`
  carries `aria-controls="drawer-{id}"` and `aria-expanded="false"`.
- [ ] **No-JS fallback** parallels {% ref "WORK-301" /%}: the in-page
  anchor scrolls to the hoisted drawer's SSR fallback (drawer rune's
  existing behaviour).
- [ ] Tests in `packages/runes/test/xref-preview*.test.ts` cover:
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

{% /work %}
