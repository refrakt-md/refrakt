{% spec id="SPEC-051" status="draft" tags="theme, lumina, presets, branding, positioning, v1" %}

# Lumina neutral default & tideline preset

Reposition Lumina from "refrakt's opinionated cream-and-navy theme" to "refrakt's flagship theme, neutral by default, with named presets for those who want a starting palette." The current cream-and-navy values move out of Lumina's defaults into a named preset (`tideline`) that anyone can opt into. The defaults become a deliberately quiet warm-neutral so refrakt's documentation surface reads as a canvas any brand could occupy.

This is primarily a positioning decision. SPEC-048 already designed the preset mechanism as plain data merged in order; this spec is about *what we ship* in that mechanism, not new infrastructure. It depends on SPEC-048 being implemented.

## Problem

**The default palette is competing with the user's brand.** Today every refrakt site looks like cream-and-navy until a user manually overrides it. New visitors form a first impression: "this is what refrakt looks like." That impression then has to be argued against when those users imagine putting their own brand on top — the default is doing the opposite of what refrakt's value proposition claims. Refrakt sells the pipeline (Markdoc + runes + theming as data); the visual default is currently selling a look.

**The architecture says "themes are pluggable," the defaults say "this is the theme."** SPEC-048 promotes design tokens to a typed contract and treats presets as plain data — exactly the architecture you'd want if themes and palettes were genuinely interchangeable. But the flagship demo (the refrakt site, scaffolded projects, every screenshot) renders Lumina's one opinionated palette. The architecture story and the visual story aren't aligned.

**The current palette has no name.** "Lumina" is the theme — typography, spacing, rune CSS, component structure. The cream-and-navy palette layered on top of Lumina is unnamed, which makes it hard to talk about ("the default colours? the lumina colours? the navy palette?") and hard to opt in or out of as a discrete unit. Naming it makes it portable.

**Docs examples look "branded," not canvas-like.** When a user lands on a doc page that shows a rune with cream-and-navy chrome, they read the example as "what refrakt looks like" rather than "what your refrakt site could look like." Examples should feel like a neutral canvas the reader can mentally re-skin onto their own brand. Cream-and-navy makes that mental swap harder than it needs to be.

-----

## Design Principles

**Lumina stays. The palette gets named.** This isn't a new theme package, and Lumina isn't getting demoted. Lumina remains refrakt's flagship theme — same typography, spacing, rune styling, component structure, dark-mode handling. The only change is what colour values it ships with by default, and that the *current* colour values become a named preset (`tideline`) anyone can opt into in one line of config.

**Neutral is a design choice, not an absence.** "Neutral default" doesn't mean "no design." It means a quiet warm-neutral palette built with the same care as the current cream-and-navy — typography is still confident, spacing is still deliberate, chrome is still composed. The goal is the *Vercel docs* register: clearly designed, unmistakably restrained. Not the *blank Bootstrap* register.

**Slight warm, not cool.** Pure cool greys read as system UI and feel cold. Pure warm reads as cream and feels branded. The default sits between — low chroma, a warmth bias around 70–80° hue, low enough saturation that the warmth is felt rather than seen. The previews in SPEC-050's icon-scale section use `#f6f4ef` light / `#1c1a17` dark as anchors; the full palette extends from there.

**Brand identity lives in chrome and in the prism.** With the palette doing less brand work, the new prism logo (SPEC-050) and the site's typographic chrome carry refrakt's identity. The body content area renders neutral; the header, footer, navigation, and marketing surfaces can still feel distinctly refrakt-shaped. This is the same split Vercel, Stripe, and Linear use.

**Two presets at launch — one full, one scoped.** Ship `tideline` (full preset, the current cream-and-navy palette named) and `niwaki` (syntax-only preset, the Japanese garden code palette). The pair demonstrates both preset patterns the architecture supports — full identity overhaul and scoped layered override — at modest maintenance cost (niwaki is only seven tokens). Together they make the "presets are real product surface, composable, not all-or-nothing" story land at v1 rather than asking users to take it on faith. Additional presets (`midnight`, `slate`, etc.) remain explicit future work — out of scope here, in scope for community contribution.

**Presets can be scoped, not all-or-nothing.** A preset is just a `ThemeTokensConfig` — and that config can override any subset of tokens. *Full* presets (like tideline) override body, chrome, syntax, and primary for a complete identity overhaul. *Syntax* presets (like the niwaki proposal) override only the syntax palette, leaving chrome to inherit. *Chrome* presets are also conceivable (body + status only). Users compose by layering — `presets: ["tideline", "niwaki"]` gives tideline chrome with niwaki code blocks; `presets: ["niwaki"]` against the neutral default gives Japanese garden code against neutral chrome. The mechanism doesn't enforce scope; preset authors choose it based on what the preset is *for*.

**`create-refrakt` shows the unopinionated baseline.** Scaffolded projects get the pure neutral default — no presets array, no syntax theme, just Lumina's base values. The refrakt site itself diverges by one layer (it adds `niwaki` for syntax), and that divergence is intentional: fresh projects represent "what defaults look like" so users see an honest baseline before opting into any preset. The post-init message surfaces both `tideline` and `niwaki` as one-line opt-ins for users who want a starting point, with a pointer to the site for live examples of each.

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

## The Tideline Preset

Everything currently in `packages/lumina/tokens/base.css` and `packages/lumina/tokens/dark.css` becomes the content of a new preset module:

```
packages/lumina/presets/tideline/
  index.ts    — exports a ThemeTokensConfig with base + dark mode overlays
  README.md   — what this preset is, when to use it
```

Opt-in:

```json
{
  "theme": {
    "package": "@refrakt-md/lumina",
    "presets": ["@refrakt-md/lumina/presets/tideline"]
  }
}
```

That single line restores today's appearance exactly — same cream, same navy, same primary-700, same surface colours, same dark-mode treatment. The preset is a verbatim transcription of the current values into SPEC-048's `ThemeTokensConfig` shape; no design decisions are re-opened during migration.

Naming: `tideline` evokes the boundary where land meets water — which is exactly the warm/cool boundary the palette walks (sand-cream paper against deep maritime navy). Alternatives considered: `seaside`, `marin`, `mendocino`, `cove`. `Tideline` wins on poetic specificity — it names a *line*, not a place, which fits the palette's two-element character.

-----

## The Niwaki Preset *(syntax-only, committed to v1 launch)*

The second of two v1 presets — a Japanese-garden-inspired *syntax* palette. Where tideline is a full identity overhaul (body, chrome, syntax, primary), niwaki is deliberately scoped to syntax tokens only. It overrides how code blocks render and nothing else, letting page chrome inherit from whichever theme or preset is layered above. The result composes: `presets: ["niwaki"]` gives Japanese garden code against neutral chrome; `presets: ["tideline", "niwaki"]` gives tideline chrome with niwaki code. The preset demonstrates that opinionated identity doesn't require overhauling the whole surface — sometimes the strongest move is to do one thing very well. The refrakt site itself uses `presets: ["niwaki"]` (see Site & Scaffold Implications).

The six elements each map to a structural role in code:

| Element | Japanese | Syntax role | Why |
|---|---|---|---|
| Pine | *matsu* | `keyword` | year-round structural backbone of the garden |
| Cherry blossom | *sakura* | `function` | eye-catching, the moment you act |
| Maple leaf | *momiji* | `string` | warm seasonal content |
| Young leaf | *wakaba* | `type` | fresh growth, generative |
| Amber / dried bamboo | *kuri* | `number` | earthy, plain, weight-bearing |
| Stone | *ishi* | `comment`, muted | quiet background presence |

The colour-to-role assignments aren't decorative — pine as keyword maps the most stable garden element to the most structural code element; sakura as function maps the eye-catching seasonal moment to the eye-catching call-to-action. The metaphor does real work.

Naming: `niwaki` (庭木, Japanese for "garden tree") refers to the deliberately pruned and shaped trees — most often pines — that form the sculptural backbone of a Japanese garden. The art of niwaki is patient, multi-decade shaping: pruning what's there to reveal structural form. That maps remarkably well to what a syntax preset does — it doesn't generate code, it shapes how code's existing structure becomes legible. The name also mirrors the preset's scope: niwa (garden) is the whole; niwaki (garden tree) is one element within it — paralleling how the preset overrides one layer of the theme rather than the whole. The pine reference also resonates with the matsu-as-keyword mapping (most niwaki are pines; pine is our structural backbone token). Alternatives considered: `niwa` (whole garden, broader but less specific), `hanami` (cherry-blossom viewing, spring-leaning), `momiji` (autumn maple, orange-leaning), `kyoto` (geographic).

### Palette

Niwaki overrides *only* the syntax tokens. Body, chrome, surfaces, primary, status — all inherit from whichever theme or preset sits beneath it. Used on its own against the neutral default, the Japanese garden colours read against a calm neutral chrome (the colours pop more this way — no warm-paper surface competing for the eye).

| Token | Light | Dark |
|---|---|---|
| `syntax.keyword` | `#2d5230` *matsu* | `#8ab589` |
| `syntax.function` | `#b35070` *sakura* | `#e89db0` |
| `syntax.string` | `#c4501c` *momiji* | `#e87a3a` |
| `syntax.number` | `#9c721a` *kuri* | `#d4a85a` |
| `syntax.type` | `#6b8a35` *wakaba* | `#b4c97a` |
| `syntax.comment` | `#7d7062` *(italic)* | `#7d7062` *(italic)* |
| `syntax.punctuation` | `#8a7c6e` | `#7d7062` |

That's it. Seven tokens (six chromatic plus punctuation), light and dark variants, nothing else. Everything outside code blocks looks exactly like the layer beneath — the neutral default if used alone, tideline if layered as `["tideline", "niwaki"]`.

### Live preview

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
  .kw  { color: #2d5230; }
  .fn  { color: #b35070; }
  .str { color: #c4501c; }
  .num { color: #9c721a; }
  .typ { color: #6b8a35; }
  .com { color: #7d7062; font-style: italic; }
  .pun { color: #8a7c6e; }
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
  .kw  { color: #8ab589; }
  .fn  { color: #e89db0; }
  .str { color: #e87a3a; }
  .num { color: #d4a85a; }
  .typ { color: #b4c97a; }
  .com { color: #7d7062; font-style: italic; }
  .pun { color: #7d7062; }
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

### Notes

- **Why syntax-only.** The neutral default's chrome is already calm, deliberate, and pleasant to read against. A "full Japanese garden" preset would override good chrome with merely-different chrome, dilute the focus, and lock users into an all-or-nothing choice. Scoping niwaki to syntax keeps the strongest part of the metaphor (the colours on code) and lets users compose freely — niwaki on neutral, niwaki on tideline, niwaki on a future custom theme. The preset earns its name through what it commits to most clearly: the code surface.
- **Sakura is deliberately more saturated than literal cherry blossom.** Real sakura is `#ffd1dc`-pale — beautiful in a garden, unreadable in code. The preset's `#b35070` is closer to a "depicted sakura" — what an ink painter would paint to *suggest* sakura, not what a camera would capture. Same instinct applies to momiji and the other elements: stylised for readability, not literal.
- **Pine and wakaba differentiate generations.** Mature deep pine for structural elements (keywords); brighter young-leaf green for fresh entities (types). The age difference reads visually and conceptually — static framework vs. generative declaration.
- **The colours pop more against neutral than they would against warm paper.** The previous draft put niwaki code on a `#ebe5dc` warm code surface; the result felt "brown" and competed with the syntax colours. With the code surface inheriting the neutral default's `#ebeae8`, the garden palette has the chromatic stage to itself — pine reads as pine, sakura reads as sakura, without the warm bg pulling them toward "all earth tones."
- **Cultural sensitivity.** Naming a preset after a non-Western aesthetic warrants intentionality. Using Japanese terms (*niwaki*, *matsu*, *sakura*) rather than translated descriptors reads as homage rather than exoticism, but the preset's README should briefly credit the visual tradition it draws from.

-----

## Site & Scaffold Implications

**The refrakt documentation site** rebuilds against `base + niwaki` — the neutral default carrying chrome (body, surfaces, status, primary), niwaki carrying syntax. This composition does two jobs at once: chrome stays identical to a fresh `create-refrakt` project, so every callout, rune, and component example a visitor sees is an honest demonstration of "what refrakt looks like by default"; and the syntax surface carries niwaki's Japanese garden identity, making code blocks the site's brand carrier — refrakt's voice on the one surface most uniquely *refrakt's* (the code rendering). Marketing pages, blog, docs — all render the same way; the homepage doesn't quietly use a different palette than the docs. The site also becomes a live demo of the scoped-preset pattern: visitors see `presets: ["niwaki"]` doing real work, not just described as architecture.

**Signal what the site is using.** A small "this site uses the niwaki preset" note in the footer, a theme indicator in the docs sidebar, or a deliberate mention on the homepage — something to help visitors mentally separate "default refrakt" (the chrome they're seeing) from "this site's choice" (the syntax they're seeing). The signal doesn't need to be loud, just present. Otherwise visitors may attribute the garden code colours to the default and feel surprised when their own scaffolded project renders neutral syntax.

**Preset documentation pages use design-plugin runes.** Each of the neutral default, `tideline`, and `niwaki` gets a dedicated docs page (`/docs/themes/lumina/neutral-default`, `/docs/themes/lumina/presets/tideline`, `/docs/themes/lumina/presets/niwaki`). These pages use runes from `@refrakt-md/design` — `palette`, `swatch`, `typography`, `spacing` — to render token values visually rather than describing them in prose. Combined with `preview` and `sandbox` runes for live composition examples, the result is a closed self-demonstration loop: the niwaki page's `palette` rune shows the seven syntax colours via swatches; the code blocks elsewhere on the same page already render with niwaki syntax (because the site uses it); the colours match exactly. It also gives the `@refrakt-md/design` plugin its canonical use case — refrakt's own theme docs become the reference example of what design runes are *for*.

**`create-refrakt` scaffolding** defaults to the neutral palette. Two options for how to surface presets during scaffolding:

1. **Neutral always, prompt to add a preset.** `npm create refrakt` produces a neutral project; the post-init message mentions `lumina/presets/tideline` and other future presets as one-line opt-ins.
2. **Prompt during scaffolding.** Ask "use a preset? (neutral / tideline / no)" with neutral as default. The chosen preset gets baked into the generated `refrakt.config.json`.

Option 2 is slightly more discoverable but adds prompt friction. Recommend option 1 for v1; revisit if users report not finding the preset surface.

**Existing refrakt sites** that depend on the current cream-and-navy appearance get a one-line migration: add `"presets": ["@refrakt-md/lumina/presets/tideline"]` to `refrakt.config.json`. Document this prominently in the v1.0 release notes and the migration guide. Sites that have already customised the palette via `theme.tokens` are unaffected — their overrides still win against whatever Lumina ships as defaults.

-----

## Implementation

1. **Implement SPEC-048 first.** This spec depends on the typed token contract, the preset merge order, and the `ThemeTokensConfig` shape landed there. If SPEC-048 isn't merged, this spec is blocked.
2. **Write the neutral default palette** into `packages/lumina/tokens/base.css` (or wherever SPEC-048's implementation parks the theme's base values). Cover both light and dark modes, including the five-hue syntax palette and the four-sentiment status palette.
3. **Extract the current values into `packages/lumina/presets/tideline/`** as a `ThemeTokensConfig` module exporting base and dark mode overlays. Verify against a visual diff that a site with `presets: ["@refrakt-md/lumina/presets/tideline"]` renders pixel-identical to today's Lumina.
4. **Author `packages/lumina/presets/niwaki/`** as a `ThemeTokensConfig` overriding only the seven syntax tokens (light + dark). Write the README crediting the Japanese visual tradition the palette draws from.
5. **Update the refrakt site config** to use `presets: ["niwaki"]` against the neutral default — neutral chrome, niwaki syntax. Add the visible "this site uses niwaki" signal to footer/sidebar/homepage.
6. **Update `create-refrakt` template** so `refrakt.config.json` ships without a `presets` array, and update the post-init message to surface both `tideline` and `niwaki` with config snippets.
7. **Author preset documentation pages** at `/docs/themes/lumina/neutral-default`, `/docs/themes/lumina/presets/tideline`, and `/docs/themes/lumina/presets/niwaki`, using design-plugin runes (`palette`, `swatch`, `typography`, `spacing`) for visual token rendering and `preview` / `sandbox` runes for live composition examples.
8. **Re-shoot site screenshots** against the new appearance (neutral chrome + niwaki syntax).
9. **Write the v1.0 migration note**: a one-line config snippet for users who want the old look back.

-----

## Marketing & Positioning

This shift gives refrakt a stronger story to tell:

> Lumina is refrakt's flagship theme. It ships with a quiet warm-neutral palette so your content is what your readers see — not refrakt's brand sitting on top of it. Two presets demonstrate the architecture: `tideline` (a full preset — cream and deep maritime navy across chrome, syntax, and primary) and `niwaki` (a syntax-only preset that overlays Japanese garden colours on code blocks without touching chrome). Compose them — `presets: ["tideline", "niwaki"]` gives tideline chrome with niwaki code. Layer your own on top, or override tokens directly. The refrakt site itself uses `niwaki` on the neutral default, so what you read here is the architecture doing real work.

This story sells SPEC-048's architecture in the same breath as it sells Lumina. The current palette doesn't disappear — it gets a name, becomes shareable, and joins niwaki to demonstrate the two preset patterns the system supports (full and scoped) at the moment refrakt v1.0 ships.

It also subtly reframes refrakt's category. "Themed SSG" implies you adopt the theme. "Content pipeline + flagship theme with optional presets" implies you adopt the pipeline and dress it however you want. The second framing is closer to refrakt's actual shape.

-----

## Acceptance Criteria

- [ ] SPEC-048 is implemented and merged
- [ ] Lumina's default token values shift to the neutral palette described above (light + dark), including the five-hue syntax highlighting palette and the four-sentiment status palette
- [ ] `packages/lumina/presets/tideline/` exists, exports a `ThemeTokensConfig`, and contains verbatim values from the previous Lumina defaults
- [ ] `packages/lumina/presets/niwaki/` exists, exports a `ThemeTokensConfig` overriding only the seven syntax tokens (light + dark), and inherits everything else
- [ ] A test site with `presets: ["@refrakt-md/lumina/presets/tideline"]` renders pixel-identical to the previous Lumina default (visual regression test, or curated diff review)
- [ ] A test site with `presets: ["@refrakt-md/lumina/presets/niwaki"]` renders neutral chrome with niwaki syntax colours; layering as `presets: ["tideline", "niwaki"]` produces tideline chrome with niwaki syntax (composition test)
- [ ] The refrakt documentation site renders with `presets: ["niwaki"]` against the neutral default chrome
- [ ] The refrakt site has visible signal of which preset(s) it uses (footer note, theme indicator, or homepage mention)
- [ ] Each of `neutral-default`, `tideline`, and `niwaki` has a dedicated documentation page on the refrakt site that uses design-plugin runes (`palette`, `swatch`, `typography`, `spacing`) for visual token rendering, paired with `preview` / `sandbox` runes for live composition examples
- [ ] `create-refrakt` scaffolds projects with no `presets` array, producing the neutral default appearance out of the box
- [ ] `create-refrakt` post-init message surfaces both `tideline` and `niwaki` as one-line opt-ins with config snippets
- [ ] v1.0 release notes include the one-line migration snippet for existing sites that want the old look
- [ ] Both `tideline` and `niwaki` presets have READMEs explaining what they are and when to use them; niwaki's README credits the Japanese visual tradition it draws from

-----

## Out of Scope

- **Additional presets** beyond `tideline` (e.g., `midnight`, `slate`, `graphite`). Future work, possibly community-contributed. The architecture supports any number; we just don't ship them at v1.
- **A coloured `primary` token in the neutral default.** Explicitly chosen as monochrome — see Design Principles. If user feedback after v1 says the neutral default feels too austere, revisit then with data.
- **Brand wordmark, typeface selection, marketing-site refresh.** Adjacent but distinct work. Worth a follow-up spec once the neutral palette and the new prism logo (SPEC-050) are both landed.
- **Migration tooling** for sites already using the cream-and-navy palette. Manual one-line config edit is the migration; we don't need a codemod for that.
- **Renaming Lumina.** Out of scope. The theme keeps its name. Only its default colour values change.

-----

## Open Questions

- **Final syntax palette values.** The proposed teal / violet / rust / ochre / sage walk is a starting point; the implementation step needs a visual pass on real code in multiple languages before locking. Teal vs. conventional ink-blue for keywords is the most likely place to revisit.
- **Status palette saturation check at scale.** The proposed values look calm in isolation but need verification on a page with multiple stacked callouts, on a form with several validation states visible at once, and at small sizes (toast notifications, inline badges). If any of the four bgs feel too saturated when several are visible together, dial the bg tints down further; the `base` and `border` values are more stable.
- **Final syntax-palette tuning for niwaki.** The proposed values look right in the spec's sandbox, but need a multi-language visual pass (TS, Python, Markdown, JSON, HTML, Bash) before locking — same standard as the neutral default's syntax palette. Sakura saturation against the neutral surface is the most likely place to tweak.
- **`primary-scale` ramp values.** Eleven stops along the warm-neutral axis from near-bg to near-text. Generated mathematically or hand-picked? Lean hand-picked for visual rightness; tooling can verify monotonicity.
- **Should marketing pages on the refrakt site opt into `tideline` as an example?** Lean no for message coherence. But it's a defensible choice if we feel the homepage needs more visual distinctiveness — would need to be deliberate, framed as "here's a preset in action," with a way for visitors to see the neutral default too.
- **Preset naming convention going forward.** `tideline` is geographic/atmospheric. Future presets follow the same axis (`midnight`, `mendocino`, `driftwood`) or open it up to anything (`graphite`, `inkwell`)? Worth deciding before the second preset lands so the catalog doesn't feel haphazard.

{% /spec %}
