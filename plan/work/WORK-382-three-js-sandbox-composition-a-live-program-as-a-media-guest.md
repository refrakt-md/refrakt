{% work id="WORK-382" status="ready" priority="medium" complexity="moderate" source="SPEC-084" tags="docs,compositions,sandbox,showcase,threejs" milestone="v0.20.1" %}

# three.js sandbox composition — a live program as a media guest

The compositions catalogue ({% ref "WORK-346" /%}) shows visual guests in a media
zone — images, charts, maps, diagrams. The ultimate flex is a **running program**:
a `sandbox` runs arbitrary JS in an isolated iframe, so a live three.js scene drops
into a card/bento media zone like any other guest. It makes the "the media zone
holds *anything*" claim undeniable.

`sandbox` already supports this with no new primitives: inline
`<script type="module">` importing three from a pinned CDN ESM URL, plus the
existing `height` knob. The JS runs only in the browser, so the static build stays
green.

## Approach
- A small, self-contained **three.js scene** authored as a `sandbox`: a lit,
  slowly rotating mesh (e.g. icosahedron) on a transparent/themeable background.
  Import three from a **version-pinned** CDN ESM URL
  (`https://cdn.jsdelivr.net/npm/three@<pinned>/+esm`).
- **Reusable snippet** so both the catalogue and (later) the index can use it.
- **`prefers-reduced-motion`:** render a single static frame, no RAF loop.
- **Static poster fallback** so a blocked/failed CDN degrades to an image rather
  than an empty frame (and pairs with WORK-381 for the lazy index use).
- A **catalogue pattern page** (`runes/compositions/sandbox-in-card.md`) presenting
  it as a media guest in a card, with the mechanism note: a `sandbox` is
  `interactive`, so in a plain card it's live; in a linked or cover card it's
  demoted to a presentational backdrop (the interaction-posture contract).

## Acceptance Criteria
- [ ] A reusable three.js `sandbox` snippet renders a small scene client-side; the static `vite build` stays green (no SSR/WebGL execution at build time).
- [ ] A compositions catalogue page (`sandbox-in-card`) presents it as a media guest — authored Markdown + live `preview` + the mechanism/interaction-posture note — and is wired into the compositions nav + landing index.
- [ ] The scene honours `prefers-reduced-motion` (static frame, no spin) and pins the three.js version; a poster fallback covers a blocked CDN.
- [ ] Catalogue use renders correctly in light and dark mode and at mobile widths (eager load is acceptable here — the catalogue page is not perf-critical).

## Notes
- **Catalogue use is eager** (the page isn't perf-critical). Headlining the scene
  as the **index** anchor cell is gated on WORK-381 (lazy/poster activation) and
  lives in WORK-350 — those depend on this item, not the reverse.

## References
- `runes/sandbox.md` (`dependencies`, inline module scripts, `height`)
- Depends on {% ref "WORK-346" /%} (compositions catalogue). Related (downstream): WORK-381 (lazy activation), WORK-350 (index anchor)
- Interaction posture: `/extend/rune-authoring/composability#media-guest-interaction-posture`

{% /work %}
