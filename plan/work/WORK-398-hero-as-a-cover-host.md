{% work id="WORK-398" status="ready" priority="high" complexity="moderate" source="SPEC-101" tags="hero,marketing,lumina,layout,engine" milestone="v0.21.0" %}

# Hero as a cover host

`hero` grammatically accepts `media-position="cover"` but has never been styled or
tested for it ({% ref "SPEC-101" /%} §1–§3, §6). The engine side (scrim, foreground
flip, posture demotion) already fires for hero — and hero emits the anatomy
cover.css keys on — so this item is the hero-side delta: config variant parity with
card, a band-appropriate height authority, padding rerouting, and an overlay
legibility pass.

## Acceptance Criteria
- [ ] Hero's config gains the cover variant (`staticModifiers: ['cover']`, `rootAttributes: { 'data-cover-scope': 'full' }`) and the SPEC-089 knobs: `content-place`, `height`, `aspect` — grammar-compatible with card's.
- [ ] `{% hero media-position="cover" %}` renders the full-scope cover: media well fills the section interior, content overlays it, default scrim + `data-color-scheme` flip apply, media zone demoted to `data-guest-posture="presentational"`.
- [ ] Height authority: explicit `height`/`aspect` → `frame-aspect` → a hero band default that is landscape/viewport-appropriate (scoped to `.rf-hero--cover`; the shared 3/4 tile default is untouched).
- [ ] In cover mode the hero root padding (`7rem 2rem 6.5rem`) reroutes to the content overlay so the media well is flush with the section; non-cover hero layouts are byte-identical.
- [ ] Overlay legibility verified in light + dark against the default scrim: gradient headline, blurb, actions (primary/secondary), eyebrow pill — with CSS fixes where they fail.
- [ ] Contracts regenerated (`refrakt contracts --check` green) and CSS coverage tests pass for the new `rf-hero--cover` selectors.

## Approach
- Variant + knobs in `plugins/marketing/src/config.ts` (Hero), mirroring Card
  (`packages/runes/src/config.ts`); attribute plumbing in
  `plugins/marketing/src/tags/hero.ts` (meta tags for `content-place`/`height`/`aspect`,
  same pattern as `card.ts`).
- CSS in `packages/lumina/styles/runes/hero.css` (`.rf-hero--cover` scope: padding
  rerouting, band height default, legibility tuning); shared
  `packages/lumina/styles/dimensions/cover.css` stays generic.
- Hero pre-assembles its own `media`/`content` split, so the SPEC-091 §7 flat-slot
  migration gate does **not** apply — verified in {% ref "SPEC-101" /%}.

## References
- {% ref "SPEC-101" /%} §1–§3, §6 · {% ref "SPEC-089" /%} (cover contract) · {% ref "SPEC-090" /%} (posture demotion)

{% /work %}
