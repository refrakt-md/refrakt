{% work id="WORK-253" status="ready" priority="high" complexity="moderate" source="SPEC-065" tags="runes, xref, pipeline, resolver" milestone="v0.15.0" %}

# Decoupled entity-lookup/URL-resolution chain; per-segment encoding; `data-target-type` propagation

Refactor the xref postProcess resolver to separate entity lookup from URL resolution: the registry provides metadata (label, type, kind); URL comes from the entity's `sourceUrl` if present and non-empty, else falls through to the patterns compiled in WORK-252, else unresolved. Encodes substituted values per URL segment so path-shaped captures preserve slashes. Propagates entity `type` as `data-target-type` on the rendered anchor (the generic hook drawer behaviors will consume in WORK-258).

## Acceptance Criteria

- [ ] Resolution chain: entity lookup (registry exact-ID → registry name) captures entity metadata; URL resolution uses entity `sourceUrl` if present and non-empty, else falls through to patterns (first match), else unresolved
- [ ] Registry entities with `sourceUrl: undefined` or `sourceUrl: ""` never produce `<a href="">`; the resolver always falls through to patterns or to the unresolved state
- [ ] At registration time, `sourceUrl: ""` is normalized to `sourceUrl: undefined`
- [ ] Patterns evaluated in array order; first match wins for any ID
- [ ] Named groups in regex are accessible as `{name}` in templates
- [ ] All placeholder values are encoded per URL segment: split on `/`, encode each segment via `encodeURIComponent`, rejoin with `/` (path-shaped captures preserve slashes)
- [ ] Single-segment captures are encoded the same as full `encodeURIComponent` would produce
- [ ] `type` field assigns `rf-xref--{type}` CSS modifier (default `external`)
- [ ] `label` field templates the link text (default `{id}`)
- [ ] `label=` attribute on the rune still overrides any computed label
- [ ] Rendered anchor includes `data-xref-id="{matched-id}"`, `data-xref-source="registry"` (URL from entity) or `data-xref-source="pattern"` (URL from pattern), and `data-target-type="{entity-type}"` when the entity is registry-resolved (drawer and any future addressable rune query against this)
- [ ] Self-reference warning fires when resolved href equals current page URL (after normalization)
- [ ] Existing refs unaffected when no `xrefs` config present (no regression)
- [ ] Unresolved xrefs still render as `rf-xref--unresolved`
- [ ] Lumina ships baseline `.rf-xref--external` styling
- [ ] Authoring docs cover the resolution chain, regex anchoring, placeholder semantics, per-segment URL encoding behavior, and recipe examples (trace, GitHub, RFC, npm at minimum)

## Approach

Per the spec's Engine Changes section. Extend `resolveXrefs` in `packages/runes/src/xref-resolve.ts` with a `patterns: CompiledXrefPattern[]` parameter; split the resolver into entity lookup + URL resolution.

Per-segment encoding helper: `segments(value).map(encodeURIComponent).join('/')`.

`data-target-type` propagation is small but architecturally important — it's the generic convention drawer and any future addressable rune (popover, modal, sheet) consume to opt into trigger behavior.

## Dependencies

- {% ref "WORK-252" /%} — compiled `XrefPattern[]` must exist before the resolver can iterate them

## References

- {% ref "SPEC-065" /%} — xref-resolution spec (full)
- {% ref "SPEC-060" /%} — drawer rune (consumes `data-target-type`)
- {% ref "SPEC-064" /%} — plan entities with `sourceUrl: undefined` (the case the decoupling enables)
- `packages/runes/src/xref-resolve.ts` — current resolver
- `packages/lumina/styles/runes/xref.css` — CSS scaffolding

{% /work %}
