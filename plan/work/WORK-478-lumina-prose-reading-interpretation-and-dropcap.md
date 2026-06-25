{% work id="WORK-478" status="done" priority="medium" complexity="moderate" source="SPEC-108" milestone="v0.26.0" tags="reading,prose,lumina,css,dropcap,textblock" %}

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

- [x] `reading="prose"` drives a theme-owned editorial treatment in Lumina: capped measure (distinct from `width`), a paragraph style, lede eligibility, and running-text niceties — selected by `[data-reading="prose"]`, not rune-name lists.
- [x] `dropcap` is a per-instance opt-in available on any `prose` body (generalised from `textblock`), gated on the resolved `prose` register (not a rune allowlist) and a no-op elsewhere; the theme owns the glyph treatment.
- [x] `measure` and `width` remain independent — a `width: full` block can hold `reading: prose` text at a capped measure (the editorial-header composition renders correctly, light + dark).

## Dependencies

- {% ref "WORK-476" /%} — `[data-reading]` emission + the `READING_CAPABILITIES` gate.
- {% ref "WORK-477" /%} — the per-rune/layout defaults that put bodies into `prose` to style.

## References

- Spec: {% ref "SPEC-108" /%} §2 (what prose enables), §3 (dropcap, prose-gated). Composes with {% ref "SPEC-107" /%}.
- `packages/lumina/styles/dimensions/sections.css`, `packages/runes/src/tags/textblock.ts`.

## Resolution

Completed: 2026-06-25

Branch: `claude/spec-108-lumina-prose`

### What was done
- **Generalised dropcap** — `dropcap` is now a universal boolean attribute (`packages/runes/src/lib/index.ts` + `UNIVERSAL_ATTRIBUTE_NAMES`). The engine gates it on the resolved prose register via `READING_CAPABILITIES`: emits `data-dropcap="true"` on the body section only when `reading` is `prose`, else drops it with a warn-once. Threaded through `applyBemClasses`/`applyProjection` alongside `data-reading`.
- **textblock cleanup** — removed its per-rune `dropcap` attribute, meta, and config modifier (now universal); kept `columns`/`lead`/`align`. Removed the dead `.rf-textblock--dropcap` CSS (skeleton + lumina).
- **Lumina prose interpretation** — new `dimensions/reading.css` (skeleton: capped `--rf-measure`, `text-wrap`, hanging punctuation, dropcap float; lumina: line-height, paragraph rhythm, link underline, the dropcap glyph, and a quieter `fine` treatment), keyed on `[data-reading]` — not rune-name lists. Imported in skeleton `index.css` and lumina `index.css` + `base.css`.
- Tests: dropcap emission (prose → data-dropcap, off-register dropped, flips on when author sets prose) in `reading.test.ts`; updated the reference universal-attr list and the textblock test; regenerated contracts (TextBlock lost `--dropcap`).

### Notes
- `measure` (on `[data-reading="prose"]`) is independent of the block's `width` modifier — orthogonal selectors. The gallery visual guard for the full-bleed-frame + capped-measure editorial header lands in WORK-480.
- 1710 transform/runes/lumina tests green (contracts + CSS coverage + entry parity).

{% /work %}
