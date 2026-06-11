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

#### 4. Kitchen-sink gallery — a generated static artifact

A single dense surface that renders **every rune in every meaningful variant** — each rune
across its modifier values, densities, surfaces, and light/dark. The gallery is what makes
AI-assisted theming tractable (change a token → see 100+ runes react at once) and is the
deterministic *subject* the visual-regression harness photographs.

It is **generated, not authored**, and produced by a **CLI command** (an `inspect`/`contracts`
family command, in `packages/cli`), not a site or a hand-written route:

- It reuses the existing `inspect` pipeline (parse → transform → serialize → identity
  transform → `renderToHtml`) extended from one rune to the whole catalogue (~60 core
  `defineRune` entries + plugin runes from `refrakt.config.json`), with each rune's variant
  matrix taken from config / `structures.json`.
- It renders through the **HTML adapter's `renderPage`** into a **self-contained static HTML
  file** (per mode: `lumina.light.html`, `lumina.dark.html`), with the theme's CSS and fonts
  inlined/linked. Static HTML — no SvelteKit app, no doc-site chrome, no hydration timing — is
  the most deterministic possible screenshot subject; interactive runes render in their stable
  pre-enhancement state.
- Determinism is a hard requirement: fixed sample content and dates, fonts actually loaded
  (this leans on §6), animations/caret disabled. The generator emits a stable
  `data-gallery-cell` anchor per variant so the harness can clip per rune.

Because the theme (config + CSS) is the *input* and the gallery is the *output*, the command
is theme-agnostic and works for every future theme for free. It complements — does not
replace — `inspect --audit` and `contracts --check`: audit proves a selector *has* CSS, the
gallery proves the rune *looks right*.

A theme scaffold (`create-refrakt theme`) is a separate, **deferred** deliverable: it only
drops in per-theme *glue* (manifest, adapter glue, the harness config + npm script + baseline
dir — see §5). The gallery generator and harness ship as shared tooling independent of it.

#### 5. Visual-regression harness — shared, with thin per-theme glue

Playwright photographs the generated gallery into **per-theme golden baselines** (per rune,
per mode), committed and image-diffed on every PR. This closes the AI iteration loop (change
tokens → diff screenshots → iterate) and — critically — makes the §3 extraction **provable**:
capture Lumina's baseline before the skeleton/skin split, extract, re-shoot, and the diff
**must be empty**; a non-empty diff is the exact list of declarations that leaked. It also
retroactively guards the shipped surface model.

Architecture:

- The reusable logic — Playwright config and the "load artifact → await `document.fonts.ready`
  → disable animation → snapshot per-`data-gallery-cell` clip" test — lives **once** (a shared
  harness package / config), not copy-pasted per theme. Per-rune element clips (not full-page)
  so a diff localises to the rune that changed.
- Each theme contributes only **glue**: a `playwright.config.ts` extending the shared one, the
  committed baselines (e.g. `packages/lumina/gallery/__screenshots__/`), and an npm script.
  Baselines refresh via `--update-snapshots`.
- CI runs in a **pinned container** (Playwright's official image) so anti-aliasing and font
  hinting are deterministic — the main flakiness risk, and the reason the harness is built as
  infrastructure ahead of (not during) the extraction.

No screenshot testing exists in the repo today, so this is greenfield.

##### Distribution (§4 + §5)

The gallery and harness are **public theme-dev tooling**, not internal-only — the spec's
"quick to build with AI assistance" promise only holds if external (community) theme authors
get the same instrument. They sit beside the toolchain refrakt already publishes (`inspect
--audit`, `contracts`, `scaffold-css`). They split into two distribution shapes on purpose:

- **Gallery generator → in the published CLI, for everyone.** It only renders HTML through the
  adapter (no browser), so it ships in `@refrakt-md/cli` and runs wherever `refrakt` is
  installed. It serves two audiences: **theme authors** (their development surface) and **site
  authors** (`refrakt gallery` previews how *their* configured theme + token overrides +
  community plugins render every rune — a QA win even with no screenshots).
- **Visual-regression harness → a separately-installed, opt-in package** (e.g.
  `@refrakt-md/gallery-harness`). Hard constraint: Playwright pulls browser binaries, so it
  **must not** be in the core CLI / runtime install path — no site author running `npm install`
  should transitively download Chromium. The lightweight generator is always available; the
  heavyweight harness is added only by repos that want screenshot testing. `create-refrakt
  theme` scaffolds the per-theme glue against it.

External baselines track the rune catalogue, which evolves — adding/changing a rune requires
a community theme to regenerate (`--update-snapshots`). Same churn we carry internally; it
needs to be a documented, smooth step, not a surprise.

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

#### 8. Surface as engine-emitted config (and the classification criterion)

The "surface" dimension (card / banner / inline / inset) is the **lone holdout** in an
otherwise-consistent design. The engine already emits every other cross-rune classification
from config as a `data-*` attribute — `data-meta-type`, `data-zone-layout`, `data-density`,
`data-section`, `data-media`, `data-sequence`, `data-state`, plus `defaultWidth` and the
frame/substrate/elevation machinery ({% ref "SPEC-086" /%}, {% ref "SPEC-087" /%}). Surface
never got an attribute, so it fell back to **rune-name selector lists** — and a grep confirms
`styles/dimensions/surfaces.css` is the *only* cross-rune file in Lumina that enumerates rune
names (49 standalone `.rf-*,` selector lines across its four buckets, plus two nested
`:where(.rf-card, …)` media-chrome lists). Every theme therefore re-derives "which of 100+
runes is a card."

Move the rune→surface assignment into engine config and **emit `data-surface`**, exactly like
the other dimensions: a base default mapping ships in the skeleton, and a theme overrides it
through `mergeThemeConfig` (a magazine might make `testimonial` a banner, not a card). Skins
then target `[data-surface="card"]` instead of enumerating runes, and the two `:where`/`:is`
media lists collapse to attribute selectors. This is the engine-side half of the §3 split —
the rune→bucket *assignment* is config; the bucket→treatment is skin.

**The criterion this establishes** (so future axes are judged, not accreted): a concern
belongs in engine config — as a config-driven `data-*` attribute — only when **(a)** it is a
classification into a small **closed set of buckets** (not a continuous value), **(b)** the
bucket→treatment is skin but the **rune→bucket assignment is a design call a theme would
plausibly vary**, and **(c)** CSS cannot express it without enumerating rune names. If an
existing attribute already carries it, or it is author-controlled / continuous, it is a
**modifier or token**, not a new axis. Resist redundant axes: `emphasis`/`prominence` overlaps
surface (banner = loud, inline = quiet); tone overlaps tints; chrome overlaps frame/substrate;
width and elevation are already config. Each axis carries combinatorial cost (per-variant
contracts, CSS-coverage, author surface), so the bar is "closes a gap that currently forces
rune-name enumeration."

**Reserved candidate — a prose/reading classification.** Not built here, but flagged because
the editorial briefs will want it: which runes' bodies are long-form **editorial prose**
(article body, `pullquote`, `lore`, `blockquote`) versus UI text (a `card` body, a `nav`) is
today implicit in `[data-section="body"]` line-height plus scattered per-rune CSS — there is
no attribute to hang an editorial reading treatment on (measure, paragraph rhythm, drop-cap
eligibility, styled first paragraph). It passes the criterion above, but may be better modeled
as a refinement of `data-section` (e.g. a `prose` body role) than a new top-level axis; the
shape is deferred to whenever an editorial theme first needs it.

Density defaults (`defaultDensity`) are already config and overridable — no change needed
beyond documenting them alongside surface as the two theme-tunable rune-level defaults.

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
- [ ] A CLI command generates a self-contained static gallery artifact (via the HTML adapter's `renderPage`, reusing the `inspect` pipeline) covering every rune across its variant matrix, deterministically (fixed content, loaded fonts, no animation), with a stable per-variant clip anchor.
- [ ] A shared Playwright harness photographs the gallery into per-theme, per-mode golden baselines (per-rune clips), runs in a pinned CI container, and a theme wires it in with thin glue only (config + baselines + script).
- [ ] Distribution: the gallery generator ships in the public CLI (no browser dependency, usable by theme *and* site authors); the harness ships as a separately-installed opt-in package so Playwright/browser binaries never enter the core install path.
- [ ] A theme scaffold (`create-refrakt theme`) — deferred — emits a buildable starter that drops in the per-theme harness glue and skeleton/token wiring.
- [ ] A theme can declare its fonts such that the adapter loads them, decoupled from the consuming site's HTML head.
- [ ] A first-class theme→layout registration contract exists (no `undefined as any`), plus layout primitives for editorial/section-front and card-grid briefs.
- [ ] The engine emits `data-surface` from a config-driven rune→surface mapping (default in the skeleton, overridable per theme via `mergeThemeConfig`); Lumina's rune-name surface lists are replaced by `[data-surface]` selectors. The classification criterion (closed buckets / theme-variable assignment / not expressible without rune-name enumeration) is documented, and `defaultDensity` is documented alongside as the other tunable rune-level default.

## Work breakdown (provisional)

1. **Typography tokens** — extend `TokenContract`; map to `--rf-*`; update token-merge/validate and the stylesheet generator.
2. **Lumina type refactor** — replace hardcoded `font-size`/weights/leading with tokens; keep coverage + contracts green.
3. **Token CSS generation** — wire `generateThemeStylesheet` into Lumina's build; retire the hand-maintained mirror + coverage test.
4. **Skeleton/skin split** — (a) spike on one rune + `hint` + one dimension file to fix the correctness-not-taste cut line, cascade-layer strategy, and packaging; (b) extract the skeleton wholesale under `@layer skeleton`; (c) re-point Lumina's skin at it; couple with the `data-surface` engine change (§8) and icon-from-config so embedded data-URIs leave CSS.
5. **Gallery generator** — CLI command extending the `inspect` pipeline + HTML-adapter `renderPage` to emit a deterministic static all-runes/all-variants artifact with per-cell anchors.
6. **Visual-regression harness** — shared Playwright config + per-rune snapshot test; per-theme glue (config + baselines + script); pinned CI container. (Theme scaffold `create-refrakt theme` is deferred.)
7. **Theme font loading** — manifest/contract field + adapter injection.
8. **Layout registration + primitives** — clean theme layout contract; editorial/section-front + card-grid layouts.
9. **Surface as engine config** — add a rune→surface mapping to config, emit `data-surface`, default in skeleton + theme-overridable; replace Lumina's surface rune-name lists with `[data-surface]`; document the classification criterion and the reserved prose candidate.
10. **Docs** — theme-authoring updates across tokens, generation, skeleton, scaffold, fonts, layouts.

## References

- Token contract + stylesheet generation: {% ref "SPEC-048" /%}; `packages/types/src/token-contract.ts`, `packages/transform/src/token-merge.ts`, `generateThemeStylesheet` in `@refrakt-md/transform`.
- Universal dimensions (the generic styling layer): `site/content/extend/theme-authoring/dimensions.md`.
- Theme authoring surface to update: `site/content/extend/theme-authoring/` (overview, creating-a-theme, css, dimensions, layouts, tint-cascade).
- Lumina reference theme: `packages/lumina/` — `src/tokens.ts`, `tokens/base.css`, `styles/runes/*`, `manifest.json`, `test/token-config-coverage.test.ts`.
- CSS loading / theme swap: `packages/sveltekit/src/virtual-modules.ts`; dark-mode pre-paint: `packages/sveltekit/src/theme-hook.ts`.
- Layout configs: `packages/transform/src/layouts.ts` (`defaultLayout`, `docsLayout`, `blogArticleLayout`, `planLayout`).
- Engine config variants (relevant to per-theme restructuring): {% ref "SPEC-091" /%}.
- Gallery/harness building blocks: `inspect` pipeline in `packages/cli/src/commands/inspect.ts`; HTML adapter `renderPage` in `packages/html/src/render.ts` (+ `page-shell.ts`); variant matrix from `refrakt contracts` / `structures.json`. (No Playwright in the repo today — greenfield.)

{% /spec %}
