{% work id="WORK-398" status="done" priority="high" complexity="moderate" source="SPEC-101" tags="hero,marketing,lumina,layout,engine" milestone="v0.21.0" %}

# Hero as a cover host

`hero` grammatically accepts `media-position="cover"` but has never been styled or
tested for it ({% ref "SPEC-101" /%} §1–§3, §6). The engine side (scrim, foreground
flip, posture demotion) already fires for hero — and hero emits the anatomy
cover.css keys on — so this item is the hero-side delta: config variant parity with
card, a band-appropriate height authority, padding rerouting, and an overlay
legibility pass.

## Acceptance Criteria
- [x] Hero's config gains the cover variant (`staticModifiers: ['cover']`, `rootAttributes: { 'data-cover-scope': 'full' }`) and the SPEC-089 knobs: `content-place`, `height`, `aspect` — grammar-compatible with card's.
- [x] `{% hero media-position="cover" %}` renders the full-scope cover: media well fills the section interior, content overlays it, default scrim + `data-color-scheme` flip apply, media zone demoted to `data-guest-posture="presentational"`.
- [x] Height authority: explicit `height`/`aspect` → `frame-aspect` → a hero band default that is landscape/viewport-appropriate (scoped to `.rf-hero--cover`; the shared 3/4 tile default is untouched).
- [x] In cover mode the hero root padding (`7rem 2rem 6.5rem`) reroutes to the content overlay so the media well is flush with the section; non-cover hero layouts are byte-identical.
- [x] Overlay legibility verified in light + dark against the default scrim: gradient headline, blurb, actions (primary/secondary), eyebrow pill — with CSS fixes where they fail.
- [x] Contracts regenerated (`refrakt contracts --check` green) and CSS coverage tests pass for the new `rf-hero--cover` selectors.

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

## Resolution

Completed: 2026-06-11

Branch: `claude/spec-101-hero-cover-prism`

### What was done
- `plugins/marketing/src/config.ts` (Hero) — cover variant (`staticModifiers: ['cover']`, `data-cover-scope: full`), modifiers `content-place`/`height`/`aspect`, `styles.aspect → aspect-ratio`.
- `plugins/marketing/src/tags/hero.ts` — the three cover-knob attributes + metas (card pattern); in cover mode a bare `<p><img></p>` media zone is unwrapped to a direct `img` (scoped to cover so non-cover markup stays byte-identical).
- `packages/lumina/styles/runes/hero.css` — `.rf-hero--cover` block: root padding → overlay (`--rune-padding` on the content element), band height authority (`--cover-aspect: 21/9` + `min-height: clamp(22rem, 55vh, 40rem)`, named scale sm–xl releases the aspect), flush media well (radius 0), centred-band overlay default with an even slightly-bottom-weighted scrim, and the primary-action legibility fix (token colour instead of hard-coded white, which inverted under the dark cover scheme).
- `plugins/marketing/test/hero-cover.test.ts` — 7 engine-level tests (variant, posture demotion, scheme flip, all three knobs, non-cover guard).
- Contracts regenerated (root + `packages/lumina/contracts`); CSS coverage green.

### Notes
- The engine side (scrim, foreground flip, posture) keyed on the modifier value and fired for hero without changes — this item was purely the hero-side delta, as SPEC-101 predicted.
- Legibility was verified by construction (the `data-color-scheme` token flip + the one fix found by inspection) and in the built page markup; a browser eyeball of /runes/marketing/hero in light/dark is still worthwhile.


---

Completed: 2026-06-12

### Follow-up fix (mobile overflow)
The 21/9 default `--cover-aspect` + `min-height` combination transferred a winning
min-height back into *width* on narrow screens (aspect-ratio size transfer), pushing
the band ~2× off-screen on phones. The band default is now `--cover-aspect: auto` +
the viewport floor only; an explicit `aspect` knob drops the floor
(`[data-aspect] { min-height: 0 }`) so it can't reintroduce the transfer. Also:
cover containment released for hero (`container-type: normal` — the band grows with
content instead of clipping at min-height) and the overlay padding tightens on
mobile (3.5rem/1.25rem under 640px).


---

Completed: 2026-06-12

### Follow-up fix 2 (backdrop covering only a top strip)
The previous follow-up traded away too much: releasing the shared
`container-type: size` (so the band could grow with content) also removed the last
source of height *definiteness* — and the cover grid's `minmax(0, 1fr)` row only
fills a definite-height container. With aspect already `auto` (the mobile fix) and
containment released, the row collapsed to the overlay's content height and the
backdrop (well + filled iframe) covered only a top strip of the band. The shared
size containment is restored and documented as load-bearing: with the aspect
released, it is what makes `min-height` definite so the row, the well, and a
`fill` sandbox span the full band. The trade — content taller than the band clips —
is the cover contract (bounded region, short overlay content), softened by the
mobile overlay-padding reduction.

{% /work %}
