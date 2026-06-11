{% spec id="SPEC-094" status="draft" tags="theme,tokens,typography,css,dx,architecture" %}

# Theme system foundations for multi-theme development

Lumina is the only theme refrakt ships, and several things "work" only because there
is exactly one of them. Lumina is tuned for a specific brief — project landing pages
plus Tailwind/Linear-style docs. The next themes target a different audience entirely:
magazines, editorial blogs, and businesses. Two requirements pull against the current
design: a new theme must be **quick to build** (the workflow is AI-assisted), and it
must be able to **look unmistakably unlike Lumina**.

The transform/dimension architecture is sound — the identity transform emits semantic
data attributes (`data-meta-type`, `data-section`, `data-density`, `data-media`, …) and
a theme styles them generically, covering the bulk of runes without per-rune CSS. The
override and cascade machinery is also strong: a typed {% ref "SPEC-048" /%} token
contract, site-level `theme.tokens`/`modes`, presets that merge as `ThemeTokensConfig`,
a four-level tint cascade, and FOUC-safe dark mode. CSS swapping is already wired — the
SvelteKit Vite plugin routes a theme's CSS through virtual modules, so pointing
`site.theme.package` at a different package rewires the import chain automatically.

What is missing is not plumbing but **differentiation surface** and **anti-duplication
wiring**. This spec defines the foundations that must land before theme #2, so that a
new theme is largely *a token file plus a layout plus targeted surface CSS* rather than
a fork of 13.6k lines of Lumina CSS.

## Problem evidence

Measured against the current `packages/lumina` tree:

- **Typography is not tokenized.** The token contract defines only `font.sans` and
  `font.mono` — no type scale, line-heights, font-weights, letter-spacing, or heading
  family. Rune CSS carries **351 hardcoded `font-size` declarations against 5 that read
  a token**. Typography is the single largest visual differentiator between a product/docs
  theme and an editorial/magazine one, yet it is the least themeable thing in the system.
- **Tokens are authored twice.** `generateThemeStylesheet(luminaTokens)` exists, but
  Lumina hand-maintains `tokens/base.css` + `tokens/dark.css` and bridges them to the
  TypeScript source with a coverage test. The base.css header itself notes "or run a
  future build script that regenerates this file." Every new theme would inherit this tax.
- **Skeleton and skin are entangled.** The dimension layer and structural geometry live
  inside `packages/lumina` alongside its colour/type/ornament choices. Theme #2 must either
  *extend Lumina* (and inherit its look) or *rebuild from scratch* (and re-implement the
  dimension layer and 90 runes' structural CSS). Neither path is fast **and** distinctive.
- **Themes do not own their fonts.** A theme declares font *families* in tokens, but the
  actual webfont *loading* is hardcoded in the consuming site's `app.html` (a Google Fonts
  link for Inter + JetBrains Mono). The tideline preset can name `IBM Plex Sans` and it
  will silently not load. Installing an editorial theme should bring its display face with it.
- **No theme scaffold, no visual safety net.** `create-refrakt` has no theme template;
  `scaffold-css` only stubs rune files. There is no screenshot/visual-regression testing
  anywhere — building or restyling a 100+-rune surface is done blind.
- **The layout set is thin for the new verticals.** Four layouts exist (`default`, `docs`,
  `blog-article`, `plan`), they live in `@refrakt-md/transform`, and the authoring docs
  show themes "registering" new ones with `undefined as any`. Magazine/business briefs need
  section fronts, multi-column editorial, and card-grid landings the current set lacks.

## Design

The work is sequenced in three tiers. Tier 1 is the gate: without it, every "new theme"
is Lumina recoloured. Tier 2 makes the build fast and safe. Tier 3 extends reach into the
new verticals.

### Tier 1 — Foundations (block theme #2 until done)

#### 1. Tokenize typography

Extend the {% ref "SPEC-048" /%} `TokenContract` with a typographic system, then refactor
Lumina's rune CSS to consume it. The contract gains:

- a **type scale** (e.g. `--rf-text-xs … --rf-text-4xl`, ideally ratio-derived so a theme
  sets a base size + ratio rather than every step),
- **line-height** tokens (tight/normal/relaxed or per-step),
- **font-weight** tokens,
- **letter-spacing/tracking** tokens,
- a distinct **display/heading family** slot (`font.display` or `font.serif` — already
  reserved in a contract comment per SPEC-051).

The contract addition is the deliverable; the Lumina refactor (replacing the 351 literals)
is the proof it covers the real surface and is tracked as its own work item. After this, a
theme's typographic voice is mostly a token file — an editorial theme can ship a dramatic
serif display scale without touching rune CSS.

#### 2. Generate token CSS from the typed source

Wire `generateThemeStylesheet` into the build so `tokens.ts` (typed against `TokenContract`)
is the single source and `tokens/base.css` + `tokens/dark.css` are generated artifacts, not
hand-maintained mirrors. The token-config coverage test is replaced by generation; drift
becomes impossible rather than merely caught. New themes get this for free.

#### 3. Separate skeleton (structure) from skin (aesthetic)

This is the largest single lever for "fast **and** distinctive" — and the riskiest piece
of the spec, because it defines a public contract every future theme depends on. The goal:
ship a theme-agnostic **skeleton** a theme imports, so theme #2 starts from a working,
neutral base and writes only the **skin** that makes it different.

**The naïve cut does not work.** Lumina's CSS is already informally layered — dimension CSS
(`styles/dimensions/*`), surface assignment (`styles/dimensions/surfaces.css`), and per-rune
CSS (`styles/runes/*`) — so the obvious move is "ship the dimension + surface layers as the
skeleton, let each theme write per-rune CSS." But structure and aesthetics are braided
together *inside individual rules*, in every layer. `dimensions/sections.css` bills itself
as generic, yet:

```css
[data-section="header"] {
  display: flex; flex-wrap: wrap; align-items: center;  /* neutral */
  gap: 0.5rem; margin-bottom: 3rem;                      /* Lumina's taste */
}
[data-section="title"] {
  font-size: 1.5rem; font-weight: 700; line-height: 1.2; /* Lumina's voice */
}
[data-section="footer"] {
  display: flex; gap: var(--rf-spacing-sm);
  border-top: 1px solid var(--rf-color-border);          /* the *decision* to draw a rule */
}
```

A magazine theme wants a serif display title, no footer rule, a centred preamble — so even
"structural" properties (`flex-direction: column` on a preamble, the footer border) are
partly a Lumina opinion. **The cut is at the property level, not the file or selector
level.** There is no file to move; every declaration must be classified.

**The decidable criterion: correctness, not "structure".** "Is this structural?" is too
fuzzy — `gap`, `margin`, `border-top` can be either. The sharper test:

- **Skeleton = correctness.** Declarations a rune would *break* without, regardless of
  visual identity: `[data-state="closed"] { display: none }`, sequence-connector
  positioning scaffolds, the icon-mask *mechanism*, the grid/flex scaffolding the dimension
  contract relies on, accessibility (`:focus-visible`, sr-only). Small; themes rarely touch
  it.
- **Skin = anything a different theme would plausibly want different.** Every number,
  colour, and layout *opinion* — expressed as a token where a value suffices (Tier 1
  typography does most of this), or as overridable theme CSS where it is structural-taste
  (the footer rule, preamble direction, title scale).

**Two complications push the split beyond CSS into the engine:**

- *Some "CSS" is really data.* `surfaces.css` opens with a 25-selector list enumerating
  "which runes are cards", then applies the card treatment. The treatment is skin; the
  *list* is configuration in a CSS costume. A theme should not re-type it to restyle cards.
  This wants the engine to emit a `data-surface="card"` attribute (Tier 3 §8) so skins
  target `[data-surface="card"]` — an engine change, not a CSS reshuffle.
- *Load-bearing mechanisms carry aesthetic parameters.* The relative-colour inset derivation
  (`oklch(from var(--rf-color-surface) calc(l - var(--rf-surface-inset-shift)) c h)`) and
  mask-based icon recolouring are mechanisms a theme benefits from inheriting, but each
  bakes in a parameter that is aesthetic (the *shift amount*, *which* SVG — currently a
  data-URI hardcoded in `hint.css` rather than driven from the icon config). The skeleton
  keeps the mechanism; the parameter becomes a token or config value.

**Approach — hybrid, chosen against the distinctiveness/speed tradeoff:**

| Archetype | Skeleton holds | Distinctiveness | Per-theme effort |
|-----------|----------------|-----------------|------------------|
| Tokenize-only | All selectors + geometry, every value a `var()` | Low — inherits Lumina's geometry | Lowest |
| **Cascade layers** (chosen) | Correctness + behaviour; skin layer overrides | Medium–high | Medium |
| Headless | Only correctness | Highest | Highest (≈ from scratch) |

Tokenize-only fails "stand out from Lumina" (a magazine inherits its section geometry and
spacing rhythm); headless reintroduces the rebuild cost the dimension layer exists to avoid.
The hybrid uses CSS cascade layers (`@layer skeleton, skin`) so a theme's skin reliably wins
without specificity wars — which also means the virtual-module loader's import order must
guarantee layer order.

**De-risk by spike, not by argument.** The boundary is a per-declaration design call; settle
it empirically. Take one card-surface rune + `hint` + one dimension file, perform the split,
then build a deliberately un-Lumina skin on top (serif editorial: large display titles, no
footer rules, centred preambles, a different inset feel). Wherever Lumina's opinion leaks
into the editorial look, that declaration belongs in skin. This converges on the real cut
line in a day or two and yields the template for the full pass. The spike **gates** the
wholesale extraction. (Exact packaging — a `@refrakt-md/skeleton` package vs. a neutral
`base.css` export — is settled by the spike.)

### Tier 2 — Velocity & safety

#### 4. Theme scaffold + kitchen-sink gallery

A `create-refrakt theme` generator (or equivalent CLI) that emits a building theme: a typed
`tokens.ts`, generated token CSS, the shared skeleton import, a manifest, adapter glue, and
a **gallery route that renders every rune in every variant**. The gallery is what makes
AI-assisted theming tractable — one page to see the whole system at once. It composes with
the existing `refrakt inspect --audit` and `contracts --check`, which every theme's CI
should run.

#### 5. Visual-regression testing

Playwright screenshots of the gallery page as per-theme golden baselines. This closes the
AI iteration loop: change tokens → diff screenshots → iterate, with structural breakage
caught automatically. No such testing exists today.

#### 6. Themes own their fonts

Add a font-loading declaration to the manifest/token layer that the adapter injects
(`<link>` tags and/or `@font-face`), so installing a theme loads its faces. Decouples
font loading from the consuming site's `app.html`. Tideline naming `IBM Plex Sans` should
then actually render in it.

### Tier 3 — Reach into the new verticals

#### 7. Richer, cleanly-registrable layouts

A first-class theme→layout registration contract (replacing the `undefined as any` pattern
the docs currently show) plus additional layout primitives for the new briefs: section/issue
fronts, multi-column editorial bodies, and card-grid landings. This is what actually unlocks
magazine/business themes beyond recolouring.

#### 8. Standardize surface & density defaults

The "surface" dimension (card / banner / inline / inset) is theme-only and hand-encoded as
CSS selector groupings in Lumina, so every theme re-derives "which of 100+ runes is a card."
Codify a default surface/density mapping (documented config or a shared default) a new theme
inherits and *restyles*, rather than re-decides.

## Implications

- **The token contract is a breaking-ish surface.** Adding typographic tokens is additive,
  but the Lumina refactor touches most rune CSS files; it must keep the CSS-coverage and
  contracts checks green throughout.
- **Generated token CSS changes the authoring loop.** Contributors edit `tokens.ts`, not
  CSS; docs and any contributor muscle memory update accordingly.
- **The skeleton/skin split is the riskiest extraction** and should be spiked before being
  committed to wholesale — it determines the public shape every future theme depends on.
- **Tier 1 gates the rest.** Tiers 2 and 3 are valuable independently but assume a tokenized,
  generated, skeleton-backed foundation; sequencing them before Tier 1 would bake the current
  entanglement into the tooling.

## Acceptance Criteria

- [ ] `TokenContract` gains a typographic system — type scale, line-heights, font-weights, letter-spacing, and a display/heading family slot — with the documented `--rf-*` mapping.
- [ ] Lumina's rune CSS consumes the typographic tokens; the count of hardcoded `font-size` literals in `packages/lumina/styles` drops to near-zero, with CSS-coverage and contracts checks green.
- [ ] `tokens/base.css` and `tokens/dark.css` are generated from `tokens.ts` via `generateThemeStylesheet` at build time; the hand-maintained mirror and its coverage test are retired.
- [ ] A skeleton/skin spike (one card-surface rune + `hint` + one dimension file, split then re-skinned with a deliberately un-Lumina editorial look) is completed first and sets the per-declaration cut line and packaging decision.
- [ ] A theme-agnostic skeleton layer is extracted using the correctness-not-taste criterion, delivered via cascade layers (`@layer skeleton, skin`) with loader-guaranteed layer order, and is consumable by a new theme independent of Lumina's aesthetic.
- [ ] A theme scaffold generator emits a buildable starter theme including a kitchen-sink gallery route covering every rune and variant.
- [ ] Visual-regression (screenshot) testing runs against the gallery page with per-theme golden baselines, wired into CI.
- [ ] A theme can declare its fonts such that the adapter loads them, decoupled from the consuming site's HTML head.
- [ ] A first-class theme→layout registration contract exists (no `undefined as any`), plus layout primitives for editorial/section-front and card-grid briefs.
- [ ] A default surface/density mapping is codified so a new theme inherits sane assignments and only restyles them.

## Work breakdown (provisional)

1. **Typography tokens** — extend `TokenContract`; map to `--rf-*`; update token-merge/validate and the stylesheet generator.
2. **Lumina type refactor** — replace hardcoded `font-size`/weights/leading with tokens; keep coverage + contracts green.
3. **Token CSS generation** — wire `generateThemeStylesheet` into Lumina's build; retire the hand-maintained mirror + coverage test.
4. **Skeleton/skin split** — (a) spike on one rune + `hint` + one dimension file to fix the correctness-not-taste cut line, cascade-layer strategy, and packaging; (b) extract the skeleton wholesale under `@layer skeleton`; (c) re-point Lumina's skin at it; couple with the `data-surface` engine change (§8) and icon-from-config so embedded data-URIs leave CSS.
5. **Theme scaffold + gallery** — `create-refrakt theme`; gallery route generator.
6. **Visual regression** — Playwright baselines against the gallery; CI wiring.
7. **Theme font loading** — manifest/contract field + adapter injection.
8. **Layout registration + primitives** — clean theme layout contract; editorial/section-front + card-grid layouts.
9. **Surface/density defaults** — codify and document the default mapping.
10. **Docs** — theme-authoring updates across tokens, generation, skeleton, scaffold, fonts, layouts.

## References

- Token contract + stylesheet generation: {% ref "SPEC-048" /%}; `packages/types/src/token-contract.ts`, `packages/transform/src/token-merge.ts`, `generateThemeStylesheet` in `@refrakt-md/transform`.
- Universal dimensions (the generic styling layer): `site/content/extend/theme-authoring/dimensions.md`.
- Theme authoring surface to update: `site/content/extend/theme-authoring/` (overview, creating-a-theme, css, dimensions, layouts, tint-cascade).
- Lumina reference theme: `packages/lumina/` — `src/tokens.ts`, `tokens/base.css`, `styles/runes/*`, `manifest.json`, `test/token-config-coverage.test.ts`.
- CSS loading / theme swap: `packages/sveltekit/src/virtual-modules.ts`; dark-mode pre-paint: `packages/sveltekit/src/theme-hook.ts`.
- Layout configs: `packages/transform/src/layouts.ts` (`defaultLayout`, `docsLayout`, `blogArticleLayout`, `planLayout`).
- Engine config variants (relevant to per-theme restructuring): {% ref "SPEC-091" /%}.

{% /spec %}
