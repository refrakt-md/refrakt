{% work id="WORK-396" status="done" priority="medium" complexity="moderate" source="SPEC-085" milestone="v0.21.0" tags="runes,layout,page-section,composability,bento" %}

# Generic section rune (eyebrow/headline/blurb preamble + body)

A generic, content-agnostic **`section`** rune: the shared page-section header
(eyebrow → headline → blurb → image) followed by an **arbitrary body**. It exists
so a preamble-less grid primitive like [`bento`](/runes/bento) can be introduced
with a title and intro — the role the `feature` "runes that work together" block
plays on the site index today. Unblocks {% ref "WORK-350" /%} (the bento capstone),
which replaces that `feature` section with a `section` + `bento`.

## Why a new rune

`bento` is deliberately a bare grid ("a grid primitive, not a page-section — no
preamble semantics"). The eyebrow/headline/blurb header is a shared pattern
(`pageSectionProperties`, used by feature/hero/cta/steps/pricing/accordion/reveal/
tabs/blog/budget), but every consumer bakes it into a *specific* body layout
(definitions, steps, tabs…). There is no generic "header + pass-through body"
wrapper. `section` is that wrapper.

## Approach (5-link chain, core rune)

- **Schema** `packages/runes/src/tags/section.ts` — `createContentModelSchema`, a
  `sequence` content model `{ eyebrow:paragraph?, headline:heading?, blurb:paragraph?,
  body:any* }`. Transform mirrors `feature`/`reveal`: build the header cursor from
  eyebrow/headline/blurb, wrap the rest in a body `div`. Emit
  `createComponentRenderable({ rune:'section', tag:'section', property:'contentSection',
  properties:{align,width}, refs:{ ...pageSectionProperties(header), body } })`.
  Attributes: `align` (start|center|end), `width` (default|wide|full).
- **Config** `packages/runes/src/config.ts` — `Section: { block:'section',
  sections:{ preamble:'preamble', headline:'title', blurb:'description' },
  autoLabel: pageSectionAutoLabel, modifiers:{ align, width }, editHints }`.
- **Catalog** `packages/runes/src/index.ts` — `defineRune({ name:'section',
  schema:section, typeName:'Section', category:'Layout', snippet })`.
- **CSS** `packages/lumina/styles/runes/section.css` (+ import in `index.css`) —
  `.rf-section`, `__header`/`__eyebrow`/`__title`/`__description`, `__body`, the
  `--align-*` / `--width-*` modifiers. Tokens only.
- **Docs** `site/content/runes/section.md`; **tests** schema + CSS coverage.

## Acceptance Criteria
- [x] A `{% section %}` rune parses a leading eyebrow paragraph, headline heading, and blurb paragraph into a `<header>`, and renders all remaining children as the section body.
- [x] BEM output: `.rf-section`, `.rf-section__preamble` (+ `__eyebrow`/`__headline`/`__blurb`/`__image`), `.rf-section__body`; `align` emits a `rf-section--{value}` modifier class + `data-align`.
- [x] The header is optional — a `section` with only body content renders just the body (no empty header).
- [x] Registered in the catalog (`refrakt inspect section` works) and configured in `coreConfig`; CSS coverage test passes for the generated selectors.
- [x] A docs page at `runes/section.md` with a `section`-wrapping-`bento` example.
- [x] Schema unit test covers header split, optional header, and body pass-through.

## References
- {% ref "SPEC-085" /%} · {% ref "WORK-350" /%} (consumer)
- `packages/runes/src/tags/common.ts` (`pageSectionProperties`), `tags/reveal.ts` / marketing `tags/feature.ts` (pattern), `config.ts` (`pageSectionAutoLabel`)

## Resolution

Completed: 2026-06-11

Branch: `claude/work-section-rune` (off main).

### What was done (5-link chain, core rune)
- **Schema** `packages/runes/src/tags/section.ts` — `createContentModelSchema` with a `sequence` model `{ eyebrow:paragraph?, headline:heading?, blurb:paragraph?, body:any* }`. Builds the header cursor from eyebrow/headline/blurb (classified by the shared `pageSectionProperties`), wraps the rest in a body `div`, emits `createComponentRenderable({ rune:'section', tag:'section', property:'contentSection', properties:{align}, refs:{ ...pageSectionProperties(header), body } })`. Header is omitted entirely when empty.
- **Config** `packages/runes/src/config.ts` — `Section: { block:'section', modifiers:{ align }, sections:{ preamble, headline→title, blurb→description }, autoLabel: pageSectionAutoLabel, editHints }`.
- **Catalog** `packages/runes/src/index.ts` — `defineRune({ name:'section', typeName:'Section', category:'Layout', snippet })`.
- **CSS** `packages/lumina/styles/runes/section.css` (+ import in `index.css`) — `.rf-section`, `__preamble`/`__eyebrow`/`__headline`/`__blurb`/`__image`, `__body`, and `[data-align="center"|"end"]` header alignment. Tokens only; eyebrow pill mirrors reveal.
- **Docs** `site/content/runes/section.md` — basic, header/body-only, and `align="center"` examples, each wrapping a `bento`; attributes + anatomy tables.
- **Tests** `packages/runes/test/section.test.ts` — header split, body-only (no empty header), and the align field channel.

### Scope change from the draft
Dropped the speculative `width`/bleed attribute — fuzzy semantics, and not what the rune is for. Kept it focused on the preamble + `align`. The actual BEM is `__preamble/__eyebrow/__headline/__blurb` (from the shared page-section autoLabel), not the `__header/__title/__description` the draft guessed.

### Verification
- `refrakt inspect section` shows the expected structure; the real identity transform applies `align` (`rf-section--center` + `data-align="center"`) — verified by running `createTransform(baseConfig)` directly, since `inspect`'s `--align` flag doesn't wire the attribute through.
- 778/778 runes tests pass (3 new); CSS coverage test passes (added `.rf-section__image`); `contracts/structures.json` regenerated (131 runes, section included).
- **Not** verified via a full `site` build: the build currently fails on `main` for an unrelated reason — a duplicate `SPEC-041` id (`SPEC-041-agent-rune-reference.md` vs `SPEC-041-rune-diff-format.md`) errors the plan scan before any page renders. Pre-existing, untouched here.

### Unblocks
- {% ref "WORK-350" /%} — the bento capstone can now author `{% section %}` + `{% bento %}` to replace the `feature` "runes that work together" block.

{% /work %}
