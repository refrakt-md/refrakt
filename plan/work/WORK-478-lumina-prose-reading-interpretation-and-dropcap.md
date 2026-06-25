{% work id="WORK-478" status="ready" priority="medium" complexity="moderate" source="SPEC-108" milestone="v0.26.0" tags="reading,prose,lumina,css,dropcap,textblock" %}

# Lumina prose interpretation + generalised dropcap

Give Lumina its theme-owned interpretation of `[data-reading="prose"]` and generalise `textblock`'s
`dropcap` to a prose-register-gated opt-in. Per {% ref "SPEC-108" /%} §2–§3 + Work breakdown 3.

## Scope

- Style `[data-reading="prose"]` (not rune-name lists) in Lumina: capped **measure**
  (`--rf-measure`, distinct from `width`), a **paragraph style**, **lede** eligibility, and
  running-text niceties (hanging punctuation, link underline, widow/orphan, hyphenation). `fine`
  gets its smaller/tighter treatment; `ui` is unchanged.
- **Generalise `dropcap`**: plumb it centrally (not re-declared per rune) and gate it on the
  resolved `prose` register via `READING_CAPABILITIES` ({% ref "WORK-476" /%}); a no-op (dev warn)
  off-register. The non-rune article body reaches it by wrapping the opening passage in
  `textblock`. The theme owns the glyph treatment; the author owns where.
- `textblock` keeps `columns` as its own feature; its body becomes `reading="prose"`.

## Acceptance Criteria

- [ ] `reading="prose"` drives a theme-owned editorial treatment in Lumina: capped measure (distinct from `width`), a paragraph style, lede eligibility, and running-text niceties — selected by `[data-reading="prose"]`, not rune-name lists.
- [ ] `dropcap` is a per-instance opt-in available on any `prose` body (generalised from `textblock`), gated on the resolved `prose` register (not a rune allowlist) and a no-op elsewhere; the theme owns the glyph treatment.
- [ ] `measure` and `width` remain independent — a `width: full` block can hold `reading: prose` text at a capped measure (the editorial-header composition renders correctly, light + dark).

## Dependencies

- {% ref "WORK-476" /%} — `[data-reading]` emission + the `READING_CAPABILITIES` gate.
- {% ref "WORK-477" /%} — the per-rune/layout defaults that put bodies into `prose` to style.

## References

- Spec: {% ref "SPEC-108" /%} §2 (what prose enables), §3 (dropcap, prose-gated). Composes with {% ref "SPEC-107" /%}.
- `packages/lumina/styles/dimensions/sections.css`, `packages/runes/src/tags/textblock.ts`.

{% /work %}
