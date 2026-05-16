{% spec id="SPEC-051" status="draft" tags="theme, lumina, presets, branding, positioning, v1" %}

# Lumina neutral default & seaside preset

Reposition Lumina from "refrakt's opinionated cream-and-navy theme" to "refrakt's flagship theme, neutral by default, with named presets for those who want a starting palette." The current cream-and-navy values move out of Lumina's defaults into a named preset (`seaside`) that anyone can opt into. The defaults become a deliberately quiet warm-neutral so refrakt's documentation surface reads as a canvas any brand could occupy.

This is primarily a positioning decision. SPEC-048 already designed the preset mechanism as plain data merged in order; this spec is about *what we ship* in that mechanism, not new infrastructure. It depends on SPEC-048 being implemented.

## Problem

**The default palette is competing with the user's brand.** Today every refrakt site looks like cream-and-navy until a user manually overrides it. New visitors form a first impression: "this is what refrakt looks like." That impression then has to be argued against when those users imagine putting their own brand on top — the default is doing the opposite of what refrakt's value proposition claims. Refrakt sells the pipeline (Markdoc + runes + theming as data); the visual default is currently selling a look.

**The architecture says "themes are pluggable," the defaults say "this is the theme."** SPEC-048 promotes design tokens to a typed contract and treats presets as plain data — exactly the architecture you'd want if themes and palettes were genuinely interchangeable. But the flagship demo (the refrakt site, scaffolded projects, every screenshot) renders Lumina's one opinionated palette. The architecture story and the visual story aren't aligned.

**The current palette has no name.** "Lumina" is the theme — typography, spacing, rune CSS, component structure. The cream-and-navy palette layered on top of Lumina is unnamed, which makes it hard to talk about ("the default colours? the lumina colours? the navy palette?") and hard to opt in or out of as a discrete unit. Naming it makes it portable.

**Docs examples look "branded," not canvas-like.** When a user lands on a doc page that shows a rune with cream-and-navy chrome, they read the example as "what refrakt looks like" rather than "what your refrakt site could look like." Examples should feel like a neutral canvas the reader can mentally re-skin onto their own brand. Cream-and-navy makes that mental swap harder than it needs to be.

-----

## Design Principles

**Lumina stays. The palette gets named.** This isn't a new theme package, and Lumina isn't getting demoted. Lumina remains refrakt's flagship theme — same typography, spacing, rune styling, component structure, dark-mode handling. The only change is what colour values it ships with by default, and that the *current* colour values become a named preset (`seaside`) anyone can opt into in one line of config.

**Neutral is a design choice, not an absence.** "Neutral default" doesn't mean "no design." It means a quiet warm-neutral palette built with the same care as the current cream-and-navy — typography is still confident, spacing is still deliberate, chrome is still composed. The goal is the *Vercel docs* register: clearly designed, unmistakably restrained. Not the *blank Bootstrap* register.

**Slight warm, not cool.** Pure cool greys read as system UI and feel cold. Pure warm reads as cream and feels branded. The default sits between — low chroma, a warmth bias around 70–80° hue, low enough saturation that the warmth is felt rather than seen. The previews in SPEC-050's icon-scale section use `#f6f4ef` light / `#1c1a17` dark as anchors; the full palette extends from there.

**Brand identity lives in chrome and in the prism.** With the palette doing less brand work, the new prism logo (SPEC-050) and the site's typographic chrome carry refrakt's identity. The body content area renders neutral; the header, footer, navigation, and marketing surfaces can still feel distinctly refrakt-shaped. This is the same split Vercel, Stripe, and Linear use.

**One preset at launch.** Ship `seaside` (the current cream-and-navy palette, named) and nothing else at v1. Demonstrates the architecture with a real example, doesn't commit refrakt to maintaining a preset catalog before there's user signal for which palettes matter. Additional presets (`midnight`, `slate`, etc.) are explicitly future work — out of scope here, in scope for community contribution.

**`create-refrakt` defaults match the site.** Scaffolded projects get the neutral default. Users who want the cream-and-navy starter add `"presets": ["@refrakt-md/lumina/presets/seaside"]` to their `refrakt.config.json`, or pick it from a prompt during scaffolding. Either way, the *default* impression of refrakt — both on its docs site and in every new project — is the neutral palette.

-----

## The Neutral Default

Light surface anchors at `#f6f4ef` (warm off-white, ~OKLCH L 0.967 C 0.005 H 80) with `#1c1a17` for text (~OKLCH L 0.205 C 0.005 H 50). Dark surface inverts: `#1c1a17` background, `#f6f4ef` text. From those anchors the rest of the palette extends:

| Token | Light | Dark |
|---|---|---|
| `color.bg` | `#f6f4ef` | `#1c1a17` |
| `color.text` | `#1c1a17` | `#f6f4ef` |
| `color.muted` | `#6b6661` | `#94908a` |
| `color.border` | `#e8e5df` | `#2d2926` |
| `color.surface.base` | `#fcfaf6` | `#232017` |
| `color.surface.raised` | `#ffffff` | `#2a2622` |
| `color.surface.hover` | `#efece5` | `#2d2926` |
| `color.surface.active` | `#e8e5df` | `#3a342d` |
| `color.primary` | `#1c1a17` | `#f6f4ef` |
| `color.primary-hover` | `#3a342d` | `#d4cfc5` |
| `color.code.bg` | `#ebeae8` | `#222220` |
| `color.code.inline-bg` | `#e6e5e3` | `#2b2b29` |
| `color.code.text` | `#1c1a17` | `#f6f4ef` |

Status colours (`info`, `warning`, `danger`, `success`) stay independent of brand — they communicate function, not personality. Lean muted: a slightly desaturated blue for info, an unsaturated amber for warning, a brick-red rather than fire-engine red for danger, an unsaturated forest green for success. Exact hues nailed down during implementation; the principle is "functionally readable, never garish."

The `primary` colour is intentionally monochromatic — it shadows `text`. Buttons, links, and accents render in the same near-black/near-white as body copy, slightly bolder or shifted on hover. This is the strongest "the brand doesn't paint over your content" move: even refrakt's interactive accents are tonal, not chromatic. The new prism logo carries the visual identity that a coloured `primary` token would otherwise carry.

The `primary-scale` (50→950) follows the same warm-neutral axis — a ramp from near-bg to near-text in eleven stops. Used for hover/active layering and for runes that need internal contrast steps without introducing a hue.

-----

## The Syntax Highlighting Palette

With the rest of the theme intentionally monochromatic, code blocks become the one place chromatic colour appears in body content. That's a deliberate move — syntax roles carry real cognitive information (keywords vs functions vs types is structural, not decorative), so functional colour use is justified there. It's also where refrakt's "refraction" metaphor can show up subtly: five hues that walk quietly across the spectrum, hinting at light being split without literally drawing a rainbow.

The proposed palette uses five "meaning-bearing" hues plus muted tones. Roles like `variable`, `operator`, `punctuation`, and ordinary identifiers stay tonal (text-coloured or muted) — the eye gets fatigued when every token is doing something different.

| Role | Light (`#f6f4ef` bg) | Dark (`#1c1a17` bg) | Hue |
|---|---|---|---|
| `syntax.keyword` | `#2a5c63` | `#7eb6bc` | deep teal |
| `syntax.function` | `#4a3b6e` | `#a89bc7` | slate violet |
| `syntax.string` | `#8a3a3a` | `#c79a9a` | warm rust |
| `syntax.number` | `#876327` | `#d4b07e` | antique ochre |
| `syntax.type` | `#3a5c2a` | `#94b385` | sage moss |
| `syntax.comment` | `#8a857d` *(italic)* | `#6b6661` *(italic)* | warm muted |
| `syntax.punctuation` | `color.muted` | `color.muted` | tonal |
| `syntax.variable` | `color.text` | `color.text` | tonal |

The five chromatic hues walk teal → violet → rust → ochre → sage around the wheel — cool, cool, warm, warm, cool/warm. Spectrum-adjacent without being on the nose. All five sit comfortably on the warm-neutral surface: warm-leaning hues (rust, ochre) are deep enough not to wash out into the bg; cool-leaning hues (teal, violet, sage) provide the contrast that gives the highlighter its read.

A live preview of the palette on the proposed neutral default, light then dark:

{% sandbox height=420 %}
<style>
  html, body { margin: 0; padding: 0; height: 100%; }
  body {
    background: #f6f4ef;
    font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
    padding: 32px;
    box-sizing: border-box;
    color: #1c1a17;
  }
  pre {
    background: #ebeae8;
    padding: 22px 26px;
    border-radius: 8px;
    margin: 0;
    overflow-x: auto;
    font-size: 13px;
    line-height: 1.65;
    border: 1px solid #e2e1df;
  }
  code { color: #1c1a17; }
  .kw  { color: #2a5c63; }
  .fn  { color: #4a3b6e; }
  .str { color: #8a3a3a; }
  .num { color: #876327; }
  .typ { color: #3a5c2a; }
  .com { color: #8a857d; font-style: italic; }
  .pun { color: #6b6661; }
</style>
<pre><code><span class="com">// A small plugin defining one rune</span>
<span class="kw">import</span> { createContentModelSchema } <span class="kw">from</span> <span class="str">'@refrakt-md/runes'</span><span class="pun">;</span>
<span class="kw">import type</span> { <span class="typ">Plugin</span> } <span class="kw">from</span> <span class="str">'@refrakt-md/types'</span><span class="pun">;</span>

<span class="kw">const</span> recipeRune <span class="pun">=</span> <span class="fn">createContentModelSchema</span>({
  contentModel<span class="pun">:</span> { type<span class="pun">:</span> <span class="str">'sections'</span> }<span class="pun">,</span>
  <span class="fn">transform</span>(resolved<span class="pun">,</span> attrs<span class="pun">:</span> { servings<span class="pun">:</span> <span class="typ">number</span> }) {
    <span class="kw">const</span> total <span class="pun">=</span> attrs.servings <span class="pun">*</span> <span class="num">5</span><span class="pun">;</span>
    <span class="kw">return</span> { title<span class="pun">:</span> resolved.title ?? <span class="str">'Untitled'</span><span class="pun">,</span> total }<span class="pun">;</span>
  }<span class="pun">,</span>
})<span class="pun">;</span>

<span class="kw">export const</span> plugin<span class="pun">:</span> <span class="typ">Plugin</span> <span class="pun">=</span> {
  name<span class="pun">:</span> <span class="str">'@example/cookbook'</span><span class="pun">,</span>
  theme<span class="pun">:</span> { runes<span class="pun">:</span> { recipe<span class="pun">:</span> recipeRune } }<span class="pun">,</span>
}<span class="pun">;</span></code></pre>
{% /sandbox %}

{% sandbox height=420 %}
<style>
  html, body { margin: 0; padding: 0; height: 100%; }
  body {
    background: #1c1a17;
    font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
    padding: 32px;
    box-sizing: border-box;
    color: #f6f4ef;
  }
  pre {
    background: #222220;
    padding: 22px 26px;
    border-radius: 8px;
    margin: 0;
    overflow-x: auto;
    font-size: 13px;
    line-height: 1.65;
    border: 1px solid #2c2c2a;
  }
  code { color: #f6f4ef; }
  .kw  { color: #7eb6bc; }
  .fn  { color: #a89bc7; }
  .str { color: #c79a9a; }
  .num { color: #d4b07e; }
  .typ { color: #94b385; }
  .com { color: #6b6661; font-style: italic; }
  .pun { color: #94908a; }
</style>
<pre><code><span class="com">// A small plugin defining one rune</span>
<span class="kw">import</span> { createContentModelSchema } <span class="kw">from</span> <span class="str">'@refrakt-md/runes'</span><span class="pun">;</span>
<span class="kw">import type</span> { <span class="typ">Plugin</span> } <span class="kw">from</span> <span class="str">'@refrakt-md/types'</span><span class="pun">;</span>

<span class="kw">const</span> recipeRune <span class="pun">=</span> <span class="fn">createContentModelSchema</span>({
  contentModel<span class="pun">:</span> { type<span class="pun">:</span> <span class="str">'sections'</span> }<span class="pun">,</span>
  <span class="fn">transform</span>(resolved<span class="pun">,</span> attrs<span class="pun">:</span> { servings<span class="pun">:</span> <span class="typ">number</span> }) {
    <span class="kw">const</span> total <span class="pun">=</span> attrs.servings <span class="pun">*</span> <span class="num">5</span><span class="pun">;</span>
    <span class="kw">return</span> { title<span class="pun">:</span> resolved.title ?? <span class="str">'Untitled'</span><span class="pun">,</span> total }<span class="pun">;</span>
  }<span class="pun">,</span>
})<span class="pun">;</span>

<span class="kw">export const</span> plugin<span class="pun">:</span> <span class="typ">Plugin</span> <span class="pun">=</span> {
  name<span class="pun">:</span> <span class="str">'@example/cookbook'</span><span class="pun">,</span>
  theme<span class="pun">:</span> { runes<span class="pun">:</span> { recipe<span class="pun">:</span> recipeRune } }<span class="pun">,</span>
}<span class="pun">;</span></code></pre>
{% /sandbox %}

A few notes on the choices:

- **Code surfaces step down chroma, not just lightness.** The page bg is deliberately warm — it's the "paper" character of the theme. But code blocks are a different material, and stacking a warm-equal surface on a warm surface compounds visually into "brown." So `code.bg` keeps roughly the same lightness as a one-step-deeper surface would, but drops chroma to about a third of the page bg's. The result reads as an architectural inset rather than more paper. Same principle in dark mode (less warmth in the code surface, more neutral grey).
- **Teal over blue for keywords.** Blue is the universal default in syntax highlighting (every editor since Borland Turbo Pascal has done blue keywords). Teal sits in the same cool family but reads as deliberate rather than default. Swappable for a conventional ink-blue (`#2c4a6e` / `#9bb4c7`) if "deliberate" feels too try-hard once we see it in real docs.
- **Light mode is mid-saturation; dark mode is lifted and slightly desaturated.** Pure inversions of the light hues read as too saturated against the warm-dark surface — the dark variants pull a step toward muted to keep code visually calm in dark mode.
- **Verify against real code, not single tokens.** A palette that's beautifully balanced on a hand-curated snippet can read as noisy when half the screen is strings or half is comments. Implementation should include a visual pass on at least one substantial block per popular language (TS, Python, Markdown, JSON, HTML, Bash) before locking exact values.

-----

## The Status Palette

The four sentiment colours (`info`, `warning`, `danger`, `success`) are the other chromatic surface in the theme — used for callouts, hint runes, form validation messages, banner notifications. Like syntax highlighting, their colour is functional (it communicates state), so colour is earned. Unlike syntax highlighting, they appear in chrome and content equally, so they need to read clearly at a glance without competing with surrounding text.

The four hues are tuned to a single saturation/lightness band so they form a visual family — none more aggressive than another. Each sentiment uses three tokens per SPEC-048's contract: `base` (text and accent line), `bg` (filled surface), `border`.

| Token | Light | Dark |
|---|---|---|
| `info.base` | `#34547a` | `#9bb4c7` |
| `info.bg` | `#e8edf4` | `#1f2530` |
| `info.border` | `#c5d2e0` | `#3d4655` |
| `warning.base` | `#9c5a18` | `#d4a868` |
| `warning.bg` | `#f5ebd9` | `#2a2519` |
| `warning.border` | `#e0c9a3` | `#4a3f2a` |
| `danger.base` | `#a83232` | `#d48888` |
| `danger.bg` | `#f5e0e0` | `#2a1818` |
| `danger.border` | `#e0b8b8` | `#4a2a2a` |
| `success.base` | `#2d6a3e` | `#7eb398` |
| `success.bg` | `#e0eee4` | `#1a2a1f` |
| `success.border` | `#b8d4be` | `#2a4a35` |

Hue map: info is **deep ink blue** (cool, structural), warning is **deep amber** (orange-leaning so it doesn't collide with `syntax.number` ochre), danger is **brick red** (saturated enough to read as alert without going fire-engine), success is **forest green** (saturated enough to be distinct from `syntax.type` sage). Across all four, the *light* bases sit at roughly the same darkness as body text; the dark bases sit at roughly the same lightness. Bg tints are very pale washes of the same hue; borders are one step deeper than the bg.

Light theme:

{% sandbox height=360 %}
<style>
  html, body { margin: 0; padding: 0; height: 100%; }
  body {
    background: #f6f4ef;
    font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
    padding: 28px;
    box-sizing: border-box;
    color: #1c1a17;
    line-height: 1.55;
  }
  .stack { display: flex; flex-direction: column; gap: 12px; max-width: 580px; margin: 0 auto; }
  .callout {
    padding: 12px 16px;
    border-radius: 6px;
    border: 1px solid;
    border-left-width: 4px;
    font-size: 14px;
  }
  .callout strong { display: block; margin-bottom: 3px; font-weight: 600; letter-spacing: 0.01em; }
  .callout p { margin: 0; color: #1c1a17; }
  .info { background: #e8edf4; border-color: #c5d2e0; border-left-color: #34547a; }
  .info strong { color: #34547a; }
  .warning { background: #f5ebd9; border-color: #e0c9a3; border-left-color: #9c5a18; }
  .warning strong { color: #9c5a18; }
  .danger { background: #f5e0e0; border-color: #e0b8b8; border-left-color: #a83232; }
  .danger strong { color: #a83232; }
  .success { background: #e0eee4; border-color: #b8d4be; border-left-color: #2d6a3e; }
  .success strong { color: #2d6a3e; }
</style>
<div class="stack">
  <div class="callout info"><strong>Info</strong><p>Refrakt sites are statically generated; content updates require a rebuild.</p></div>
  <div class="callout warning"><strong>Warning</strong><p>The legacy adapter package is deprecated and will be removed in v1.1.</p></div>
  <div class="callout danger"><strong>Danger</strong><p>Running this command will overwrite existing token values in your config file.</p></div>
  <div class="callout success"><strong>Success</strong><p>Your refrakt site built successfully — 47 pages emitted in 2.1 seconds.</p></div>
</div>
{% /sandbox %}

Dark theme:

{% sandbox height=360 %}
<style>
  html, body { margin: 0; padding: 0; height: 100%; }
  body {
    background: #1c1a17;
    font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
    padding: 28px;
    box-sizing: border-box;
    color: #f6f4ef;
    line-height: 1.55;
  }
  .stack { display: flex; flex-direction: column; gap: 12px; max-width: 580px; margin: 0 auto; }
  .callout {
    padding: 12px 16px;
    border-radius: 6px;
    border: 1px solid;
    border-left-width: 4px;
    font-size: 14px;
  }
  .callout strong { display: block; margin-bottom: 3px; font-weight: 600; letter-spacing: 0.01em; }
  .callout p { margin: 0; color: #f6f4ef; }
  .info { background: #1f2530; border-color: #3d4655; border-left-color: #9bb4c7; }
  .info strong { color: #9bb4c7; }
  .warning { background: #2a2519; border-color: #4a3f2a; border-left-color: #d4a868; }
  .warning strong { color: #d4a868; }
  .danger { background: #2a1818; border-color: #4a2a2a; border-left-color: #d48888; }
  .danger strong { color: #d48888; }
  .success { background: #1a2a1f; border-color: #2a4a35; border-left-color: #7eb398; }
  .success strong { color: #7eb398; }
</style>
<div class="stack">
  <div class="callout info"><strong>Info</strong><p>Refrakt sites are statically generated; content updates require a rebuild.</p></div>
  <div class="callout warning"><strong>Warning</strong><p>The legacy adapter package is deprecated and will be removed in v1.1.</p></div>
  <div class="callout danger"><strong>Danger</strong><p>Running this command will overwrite existing token values in your config file.</p></div>
  <div class="callout success"><strong>Success</strong><p>Your refrakt site built successfully — 47 pages emitted in 2.1 seconds.</p></div>
</div>
{% /sandbox %}

A few notes on the choices:

- **All four hues sit at the same saturation/lightness band.** This is the "family" property — no single sentiment should look more aggressive than another. If `danger` ever needs to feel more alarming, the move is to *animate* it (pulse the border), not to push its red louder. The base palette stays calm.
- **The bg tints are very pale.** Around 4–6% saturation of the base hue. Strong enough to identify the sentiment at a glance, weak enough that body text on top reads in `color.text` without needing colour adjustment. Same in reverse for dark mode.
- **Deliberate distance from syntax colours.** `warning` is orange-amber, not yellow-ochre (vs. `syntax.number`). `danger` is fuller red, not warm rust (vs. `syntax.string`). `success` is fuller green, not sage moss (vs. `syntax.type`). The two palettes coexist in the same docs page without anyone reading a callout as code or vice versa.
- **No "neutral" or "tip" sentiment in the contract.** SPEC-048's contract is exactly these four. A "tip" or "note" hint without sentiment colour falls back to a neutral chrome (default `border`, `surface.base`, body text) — no chromatic accent. That's intentional: if it doesn't communicate state, it doesn't need colour.

-----

## The Seaside Preset

Everything currently in `packages/lumina/tokens/base.css` and `packages/lumina/tokens/dark.css` becomes the content of a new preset module:

```
packages/lumina/presets/seaside/
  index.ts    — exports a ThemeTokensConfig with base + dark mode overlays
  README.md   — what this preset is, when to use it
```

Opt-in:

```json
{
  "theme": {
    "package": "@refrakt-md/lumina",
    "presets": ["@refrakt-md/lumina/presets/seaside"]
  }
}
```

That single line restores today's appearance exactly — same cream, same navy, same primary-700, same surface colours, same dark-mode treatment. The preset is a verbatim transcription of the current values into SPEC-048's `ThemeTokensConfig` shape; no design decisions are re-opened during migration.

Naming: `seaside` is on the nose for cream + maritime navy — the cream reads as paper/sand, the navy reads as deep water. Alternative candidates considered: `tideline`, `marin`, `mendocino`, `cove`. `Seaside` wins on clarity and immediate recognition. Renaming costs nothing if we want to revisit before v1.0 ships.

-----

## Site & Scaffold Implications

**The refrakt documentation site** rebuilds against the neutral default. Most pages need no content changes — runes restyle automatically since their CSS reads token variables. Screenshots in docs that show "what a refrakt page looks like" need re-shooting against the neutral palette. Marketing pages (the landing page, blog, about) can either render neutral (consistent message: "this is what refrakt looks like by default") or opt into `seaside` (the original, more visually distinctive presentation, framed as "an example preset"). I lean **neutral throughout** for message coherence — the homepage shouldn't quietly use a different palette than the docs.

**`create-refrakt` scaffolding** defaults to the neutral palette. Two options for how to surface presets during scaffolding:

1. **Neutral always, prompt to add a preset.** `npm create refrakt` produces a neutral project; the post-init message mentions `lumina/presets/seaside` and other future presets as one-line opt-ins.
2. **Prompt during scaffolding.** Ask "use a preset? (neutral / seaside / no)" with neutral as default. The chosen preset gets baked into the generated `refrakt.config.json`.

Option 2 is slightly more discoverable but adds prompt friction. Recommend option 1 for v1; revisit if users report not finding the preset surface.

**Existing refrakt sites** that depend on the current cream-and-navy appearance get a one-line migration: add `"presets": ["@refrakt-md/lumina/presets/seaside"]` to `refrakt.config.json`. Document this prominently in the v1.0 release notes and the migration guide. Sites that have already customised the palette via `theme.tokens` are unaffected — their overrides still win against whatever Lumina ships as defaults.

-----

## Implementation

1. **Implement SPEC-048 first.** This spec depends on the typed token contract, the preset merge order, and the `ThemeTokensConfig` shape landed there. If SPEC-048 isn't merged, this spec is blocked.
2. **Write the neutral default palette** into `packages/lumina/tokens/base.css` (or wherever SPEC-048's implementation parks the theme's base values). Cover both light and dark modes.
3. **Extract the current values into `packages/lumina/presets/seaside/`** as a `ThemeTokensConfig` module exporting base and dark mode overlays. Verify against a visual diff that a site with `presets: ["@refrakt-md/lumina/presets/seaside"]` renders pixel-identical to today's Lumina.
4. **Update the refrakt site config** to drop any implicit reliance on the old defaults (it should be using base Lumina with no explicit preset, which now means neutral).
5. **Update `create-refrakt` template** so `refrakt.config.json` ships without a `presets` array — the user gets neutral by default and adds presets explicitly.
6. **Re-shoot site screenshots** that show Lumina rendering, against the neutral default.
7. **Write the v1.0 migration note**: a one-line config snippet for users who want the old look back.

-----

## Marketing & Positioning

This shift gives refrakt a stronger story to tell:

> Lumina is refrakt's flagship theme. It ships with a quiet warm-neutral palette so your content is what your readers see — not refrakt's brand sitting on top of it. Want a starting palette? Lumina ships `seaside` (cream and deep maritime navy) as a named preset you can opt into in one line of config. Want your own? Override the tokens. Want to build your own theme on top of the same contract? Go.

This story sells SPEC-048's architecture in the same breath as it sells Lumina. The current palette doesn't disappear — it gets a name, becomes shareable, and demonstrates that presets are real product surface, not a hypothetical extension point.

It also subtly reframes refrakt's category. "Themed SSG" implies you adopt the theme. "Content pipeline + flagship theme with optional presets" implies you adopt the pipeline and dress it however you want. The second framing is closer to refrakt's actual shape.

-----

## Acceptance Criteria

- [ ] SPEC-048 is implemented and merged
- [ ] Lumina's default token values shift to the neutral palette described above (light + dark), including the five-hue syntax highlighting palette and the four-sentiment status palette
- [ ] `packages/lumina/presets/seaside/` exists, exports a `ThemeTokensConfig`, and contains verbatim values from the previous Lumina defaults
- [ ] A test site with `presets: ["@refrakt-md/lumina/presets/seaside"]` renders pixel-identical to the previous Lumina default (visual regression test, or curated diff review)
- [ ] The refrakt documentation site renders against the neutral default (no implicit `seaside` opt-in)
- [ ] `create-refrakt` scaffolds projects with no `presets` array, producing the neutral default appearance out of the box
- [ ] v1.0 release notes include the one-line migration snippet for existing sites that want the old look
- [ ] The `seaside` preset has a README explaining what it is and when to use it

-----

## Out of Scope

- **Additional presets** beyond `seaside` (e.g., `midnight`, `slate`, `graphite`). Future work, possibly community-contributed. The architecture supports any number; we just don't ship them at v1.
- **A coloured `primary` token in the neutral default.** Explicitly chosen as monochrome — see Design Principles. If user feedback after v1 says the neutral default feels too austere, revisit then with data.
- **Brand wordmark, typeface selection, marketing-site refresh.** Adjacent but distinct work. Worth a follow-up spec once the neutral palette and the new prism logo (SPEC-050) are both landed.
- **Migration tooling** for sites already using the cream-and-navy palette. Manual one-line config edit is the migration; we don't need a codemod for that.
- **Renaming Lumina.** Out of scope. The theme keeps its name. Only its default colour values change.

-----

## Open Questions

- **Final syntax palette values.** The proposed teal / violet / rust / ochre / sage walk is a starting point; the implementation step needs a visual pass on real code in multiple languages before locking. Teal vs. conventional ink-blue for keywords is the most likely place to revisit.
- **Status palette saturation check at scale.** The proposed values look calm in isolation but need verification on a page with multiple stacked callouts, on a form with several validation states visible at once, and at small sizes (toast notifications, inline badges). If any of the four bgs feel too saturated when several are visible together, dial the bg tints down further; the `base` and `border` values are more stable.
- **`primary-scale` ramp values.** Eleven stops along the warm-neutral axis from near-bg to near-text. Generated mathematically or hand-picked? Lean hand-picked for visual rightness; tooling can verify monotonicity.
- **Should marketing pages on the refrakt site opt into `seaside` as an example?** Lean no for message coherence. But it's a defensible choice if we feel the homepage needs more visual distinctiveness — would need to be deliberate, framed as "here's a preset in action," with a way for visitors to see the neutral default too.
- **Preset naming convention going forward.** `seaside` is geographic/atmospheric. Future presets follow the same naming axis (`midnight`, `tideline`, `mendocino`) or open it up to anything (`graphite`, `inkwell`)? Worth deciding before the second preset lands so the catalog doesn't feel haphazard.

{% /spec %}
