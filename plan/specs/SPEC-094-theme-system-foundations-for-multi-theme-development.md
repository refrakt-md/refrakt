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

Extract a theme-agnostic structural layer — layout geometry and the *behaviour* of the
universal dimensions (flex/grid arrangement, density truncation, sequence connectors,
section anatomy) — out of `packages/lumina` into a shippable base a theme imports. A theme
then owns only the **skin**: colour, type, radius, shadow, ornament, and surface treatment.
This is the largest single lever for "fast **and** distinctive": theme #2 starts from a
working, neutral skeleton and writes only what makes it different. (Exact packaging —
a `@refrakt-md/skeleton` package vs. a genuinely neutral `base.css` export — to be settled
in implementation.)

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
- [ ] A theme-agnostic skeleton layer (dimension behaviour + structural geometry) is extracted from `packages/lumina` and consumable by a new theme independent of Lumina's aesthetic.
- [ ] A theme scaffold generator emits a buildable starter theme including a kitchen-sink gallery route covering every rune and variant.
- [ ] Visual-regression (screenshot) testing runs against the gallery page with per-theme golden baselines, wired into CI.
- [ ] A theme can declare its fonts such that the adapter loads them, decoupled from the consuming site's HTML head.
- [ ] A first-class theme→layout registration contract exists (no `undefined as any`), plus layout primitives for editorial/section-front and card-grid briefs.
- [ ] A default surface/density mapping is codified so a new theme inherits sane assignments and only restyles them.

## Work breakdown (provisional)

1. **Typography tokens** — extend `TokenContract`; map to `--rf-*`; update token-merge/validate and the stylesheet generator.
2. **Lumina type refactor** — replace hardcoded `font-size`/weights/leading with tokens; keep coverage + contracts green.
3. **Token CSS generation** — wire `generateThemeStylesheet` into Lumina's build; retire the hand-maintained mirror + coverage test.
4. **Skeleton/skin split** — spike, then extract the structural/dimension layer into a shippable base; re-point Lumina at it.
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
