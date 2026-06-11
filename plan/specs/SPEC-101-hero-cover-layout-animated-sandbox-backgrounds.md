{% spec id="SPEC-101" status="accepted" tags="layout,lumina,marketing,sandbox,engine,docs,showcase" %}

# Hero cover layout — animated sandbox backgrounds

`hero` grammatically accepts `media-position="cover"` today (it's in the shared
`splitLayoutAttributes`), but the combination has never been exercised: no docs
example, no CSS pass, no contract coverage. Meanwhile the pieces for the obvious
payoff — a **live three.js scene as a full-bleed animated hero background** —
already exist separately: cover layout ({% ref "SPEC-089" /%}), sandbox as a media
guest ({% ref "WORK-382" /%}), and the interaction-posture contract that demotes a
cover guest to an inert presentational backdrop ({% ref "SPEC-090" /%}). This spec
closes the gap: make `hero` a first-class cover host, make non-`img`/`video` media
guests (specifically `sandbox`) fill the cover well, and ship the animated-background
composition as a documented, tested pattern.

## Overview

### Why this is a legitimate composition, not a hack

The architecture has already converged on it from three directions:

- **Cover** (SPEC-089) defines "media fills the rune interior, content overlays it,
  default scrim for legibility" — the layout of every hero-with-background ever made.
- **The media-guest contract** (SPEC-084/WORK-382) established that a media zone holds
  *anything*, including a running program in a sandboxed iframe.
- **Interaction posture** (SPEC-090) already decides what a sandbox *means* under
  cover: the engine sets `data-guest-posture="presentational"` on the cover media
  zone (`pointer-events: none`, behaviours skip enhancement), so a cover sandbox is
  by definition a passive animated surface the overlay owns interaction over. The
  engine comment even anticipates it: cover full-bleed widgets are "silently inert."

So `{% hero media-position="cover" %}` + a `{% sandbox %}` media zone is the intended
endpoint of these contracts. What's missing is hero-side styling, guest fill, and docs.

### What already lines up (verified against the code)

- Hero's transform emits exactly the anatomy cover.css keys on: a media wrapper that
  gets `data-section="media"` (via Hero's `sections` config) and a `data-name="content"`
  wrapper, both direct children of the root. The full-scope selectors
  (`[data-media-position="cover"]:not([data-cover-scope="header"])`) match hero markup
  as-is — hero pre-assembles its own media/content split, so the SPEC-091 §7 flat-slot
  migration gate that applied to `card`/`bento-cell` does **not** apply here.
- The engine's cover handling (scrim emission, `data-color-scheme` foreground flip,
  `content-place` vars, posture demotion) keys on the *modifier value*, not the rune,
  so it fires for hero already.

### The gaps

1. **Hero config parity.** Card realizes cover as a `media-position` engine variant
   (`staticModifiers: ['cover']`, `rootAttributes: { 'data-cover-scope': 'full' }`).
   Hero's config (`plugins/marketing/src/config.ts`) has no such variant, and no
   `content-place`/`height`/`aspect` modifiers — the SPEC-089 knobs are card-only today.
2. **Height authority is wrong for a page section.** cover.css defaults the region to
   `aspect-ratio: 3/4` (a portrait *tile* default). A full-width hero band wants a
   landscape/viewport-relative default and an author override; a 3/4 full-width hero
   would be comically tall.
3. **Root padding swallows the well.** `.rf-hero` carries `padding: 7rem 2rem 6.5rem`
   on the root. Under cover that insets the media well — the backdrop would float
   inside a padded frame instead of filling the section. The padding belongs on the
   content overlay in cover mode.
4. **Guest fill stops at `img`/`video`.** cover.css stretches only
   `> :is(img, video)` to fill the well (`object-fit: cover`). An `rf-sandbox` gets
   `width: 100%` but no height fill — and CSS alone can't fix it, because the sandbox
   custom element (`packages/behaviors/src/elements/sandbox.ts`) sets an **inline**
   iframe height: a fixed px value, or live auto-resize via `rf-sandbox-resize`
   postMessage when `data-height="auto"`. Both fight a host-owned height.
5. **Activation posture for backgrounds.** A background is above the fold and inert:
   `visible` activation fires immediately anyway, and the poster + "Run" button
   affordance (WORK-381) is wrong for a backdrop. Eager is the background mode; a
   non-eager sandbox in a cover media zone deserves a build warning.
6. **Foreground legibility is unverified.** Hero's headline uses gradient text
   (`background-clip: text` over `--rf-color-text`→`--rf-color-muted`); whether it
   reads correctly when cover flips the overlay to `data-color-scheme="dark"` over a
   scrim has never been looked at.
7. **No docs, no contracts, no tests** exercise hero-cover at all.

## Design

### 1. Hero as a cover host

- Add the cover variant to Hero's config, mirroring Card: keyed on
  `media-position: cover`, supplying `staticModifiers: ['cover']` and
  `rootAttributes: { 'data-cover-scope': 'full' }`.
- Add the SPEC-089 cover knobs to hero: `content-place` (overlay anchor; hero's
  existing `align`/`valign` continue to govern non-cover layouts), and the intrinsic
  `height`/`aspect` knobs (named scale + ratio), same grammar as card.
- The cover default scrim, scrim controls (`scrim`, `scrim-type`, `scrim-blur`), and
  the scrim-tone foreground flip apply as specified in SPEC-089 §3 — no new mechanism.

### 2. Height authority for a page-section cover

A hero is a *band*, not a tile, so the SPEC-089 precedence gets a hero-appropriate
floor: **explicit `height`/`aspect` → `frame-aspect` → hero band default**. The band
default is landscape/viewport-aware (e.g. `min-height: clamp(…)` or a wide aspect
with a viewport cap — exact values are a Lumina design decision), not the 3/4 tile
default. Mechanically this is a `--cover-aspect`/min-height override scoped to
`.rf-hero--cover`, leaving the shared cover.css default untouched for tiles.

### 3. Cover padding rerouting

In cover mode `.rf-hero`'s root padding moves to the content overlay
(`> [data-name="content"]`), so the media well spans the full section interior while
the overlaid headline/actions keep the hero's generous breathing room. Non-cover hero
layouts are unchanged.

### 4. Generic guest fill — `sandbox` as the reference case

- **CSS:** in a cover media well, non-`img`/`video` guests fill too — the well's
  direct guest (`.rf-sandbox`, and its iframe) gets `height: 100%`. Scoped to
  `[data-media-position="cover"] [data-section="media"]`, not global sandbox CSS.
- **Element:** `sandbox` gains a `fill` height mode (`height="fill"` →
  `data-height="fill"`): the custom element sets the iframe to `height: 100%` and
  **skips** the auto-resize postMessage listener (the host owns height; the iframe
  must not negotiate it). Authors can set it explicitly; the identity transform sets
  it **automatically** when the sandbox is the direct guest of a cover media zone, so
  the composition works with zero sandbox-side config.
- The SPEC-090 demotion already makes the cover sandbox inert; no posture change.

### 5. Activation + motion posture for backgrounds

- **Eager is the background mode.** A non-eager (`visible`/`click`) sandbox in a
  cover media zone gets a build warning (SPEC-084-style validation): the poster/Run
  affordance contradicts an inert backdrop, and `visible` is a no-op above the fold.
- **Perf is an authoring contract, documented not enforced:** pin the dependency
  version, keep the scene small, cap `devicePixelRatio`, pause the RAF loop when the
  document is hidden, and let `prefers-reduced-motion` render a single static frame
  (the `threejs-scene` example already models all of this).
- **No boot flash:** guidance (and the shipped example) put a CSS
  background/gradient on the iframe body and behind the well so first paint reads as
  designed while the scene initializes, and a graceful static fallback covers
  blocked-CDN/no-WebGL.

### 6. Foreground legibility pass

Verify (and fix where needed) the hero overlay under cover: the gradient headline,
blurb (`--rf-color-muted` → full-strength per cover.css), actions (primary/secondary
buttons), and the eyebrow pill against the scrim in light and dark mode. The
mechanism is the existing `data-color-scheme` token flip; this is a verification +
CSS-tuning item, not new machinery.

### 7. Docs + showcase — the prism scene

- **The showcase scene is a new `site/examples/prism-scene/`** (decided; replaces the
  earlier idea of reusing the generic `threejs-scene` icosahedron). Concept — the
  brand metaphor, literally: a slowly rotating prism with a thin stream of markdown
  glyph particles (`#`, `*`, `>`, `{%`) entering one face as a faint beam, and fanned
  **spectrum streams in the Niwaki palette** leaving the other — markdown in,
  structured meaning out.
- **The spectrum is Niwaki** (decided) — the site's own syntax preset
  (`packages/lumina/src/presets/niwaki.ts`), which tightens the metaphor: the prism
  refracts raw markdown into *the colours this site renders syntax in*. The incoming
  beam/glyphs are tinted **ishi** (stone — the comment/punctuation grey:
  undifferentiated input); the outgoing streams are the chromatic roles — **wakaba**
  (keyword green), **sakura** (function pink), **matsu** (pine — link/constant),
  **momiji** (string peach, with the punchy string-expression orange as an accent).
  The preset defines light/dark pairs, which directly supplies the scene's
  theme-aware variants; the scene pins the hex values with a comment pointing at the
  preset source as the palette of record.
- **Faked refraction, not real.** `MeshPhysicalMaterial` transmission/dispersion is
  far too expensive for a hero backdrop. The prism is wireframe/flat-shaded; the beam
  and spectrum are additive-blended `Points`/line geometry; dispersion is cheap
  tinted-copy offsets. Looks like refraction, costs like a particle demo.
- **Ambient by contract.** The SPEC-090 demotion means the iframe never receives
  pointer events, so the scene must carry itself with no interaction (no
  cursor-parallax; host→iframe event forwarding is explicitly out of scope here).
- **Production posture baked into the scene:** designed dim (it lives *under* the
  scrim), `devicePixelRatio` capped (~1.5), RAF paused on `visibilitychange`,
  reduced-motion renders a composed static frame, a CSS gradient on the iframe body
  covers the boot frame, theme-aware light/dark variants via the injected theme.
- The `hero` reference page gains a **cover** section: a plain image-cover hero
  (one-attribute change from a normal hero), then the headline composition — the
  prism scene via `{% sandbox src="prism-scene" /%}` in the media zone, with the
  mechanism note (cover + posture demotion + fill) and the motion/perf guidance
  from §5.
- `media-guests.md` cross-links the pattern from the "Live program" section.
- The sandbox reference documents `height="fill"`.

## Acceptance Criteria

- [ ] `{% hero media-position="cover" %}` renders the SPEC-089 full-scope cover: media well fills the section interior, content overlays it, default scrim + foreground scheme flip apply, and the media zone is demoted to `data-guest-posture="presentational"`.
- [ ] Hero's config gains the cover variant (`data-cover-scope="full"` + `cover` static modifier) and the cover knobs: `content-place`, `height`, `aspect` — grammar-compatible with card's.
- [ ] Hero cover height authority: explicit `height`/`aspect` → `frame-aspect` → a hero band default that is landscape/viewport-appropriate (not the 3/4 tile default); tiles' default is unchanged.
- [ ] In cover mode the hero root padding reroutes to the content overlay; the media well is flush with the section. Non-cover hero layouts are byte-identical.
- [ ] A `sandbox` (and generically any non-`img`/`video` guest) fills the cover media well: cover-scoped fill CSS plus a sandbox `height="fill"` mode that sets `height: 100%` and disables auto-resize messaging; the transform applies `fill` automatically to a sandbox that is a cover media zone's direct guest.
- [ ] A non-eager (`activation="visible"|"click"`) sandbox in a cover media zone produces a build warning naming the conflict (inert backdrop vs. activation affordance).
- [ ] Overlay legibility verified in light + dark: gradient headline, blurb, actions, eyebrow pill against the default scrim (fixes applied where they fail).
- [ ] `prefers-reduced-motion` end-to-end: the shipped background example renders a static frame; no Run-control dead end (eager mounts regardless, the scene self-stills).
- [ ] The prism scene ships as `site/examples/prism-scene/` per §7: faked refraction (no transmission materials), ishi-tinted glyph stream → Niwaki spectrum (wakaba/sakura/matsu/momiji, light+dark pairs from the preset), ambient (no pointer input), dim-under-scrim, capped DPR, visibility-pause, reduced-motion static frame, theme-aware.
- [ ] Docs: hero reference cover section with an image-cover example and the animated prism background example, including the perf/motion authoring contract; sandbox reference documents `height="fill"`; `media-guests.md` cross-links.
- [ ] Contracts regenerated (`refrakt contracts --check` green) and CSS coverage tests pass for the new `rf-hero--cover` selectors.

## Work breakdown

Scheduled into **v0.21.0** (contracts/tests folded into each item's criteria):

1. {% ref "WORK-398" /%} — **hero as a cover host**: config variant + knobs, padding rerouting, band height default, legibility pass (§1–§3, §6).
2. {% ref "WORK-399" /%} — **cover guest fill**: cover-scoped fill CSS + sandbox `height="fill"` mode + transform auto-fill for cover guests (§4).
3. {% ref "WORK-400" /%} — **activation warning**: non-eager sandbox under cover (§5).
4. {% ref "WORK-401" /%} — **prism scene**: `site/examples/prism-scene/` (§7).
5. {% ref "WORK-402" /%} — **docs**: hero cover section, animated-background example, sandbox `fill` docs, cross-links (§7).

## References

- Cover layout, `content-place`, scrim, height authority: {% ref "SPEC-089" /%}; shared CSS `packages/lumina/styles/dimensions/cover.css`.
- Media-guest interaction posture (cover demotion): {% ref "SPEC-090" /%}; engine §6d `packages/transform/src/engine.ts`.
- Engine config variants (how card hosts cover): {% ref "SPEC-091" /%}; card variant `packages/runes/src/config.ts` (Card).
- three.js scene as a media guest + the reusable scene: {% ref "WORK-382" /%}; `site/examples/threejs-scene/index.html`.
- Deferred activation / poster (the affordance that's wrong for backdrops): {% ref "WORK-381" /%}.
- Sandbox element height/auto-resize mechanics: `packages/behaviors/src/elements/sandbox.ts`; sandbox CSS `packages/lumina/styles/runes/sandbox.css`.
- Hero anatomy + current CSS: `plugins/marketing/src/tags/hero.ts`, `plugins/marketing/src/config.ts`, `packages/lumina/styles/runes/hero.css`.
- Niwaki palette (the prism spectrum, palette of record): `packages/lumina/src/presets/niwaki.ts`; preset doc `site/content/themes/niwaki.md`.

{% /spec %}
