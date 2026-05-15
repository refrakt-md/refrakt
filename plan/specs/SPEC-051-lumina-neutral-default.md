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
| `color.code.bg` | `#efece5` | `#232017` |
| `color.code.inline-bg` | `#e8e5df` | `#2d2926` |
| `color.code.text` | `#1c1a17` | `#f6f4ef` |

Status colours (`info`, `warning`, `danger`, `success`) stay independent of brand — they communicate function, not personality. Lean muted: a slightly desaturated blue for info, an unsaturated amber for warning, a brick-red rather than fire-engine red for danger, an unsaturated forest green for success. Exact hues nailed down during implementation; the principle is "functionally readable, never garish."

The `primary` colour is intentionally monochromatic — it shadows `text`. Buttons, links, and accents render in the same near-black/near-white as body copy, slightly bolder or shifted on hover. This is the strongest "the brand doesn't paint over your content" move: even refrakt's interactive accents are tonal, not chromatic. The new prism logo carries the visual identity that a coloured `primary` token would otherwise carry.

The `primary-scale` (50→950) follows the same warm-neutral axis — a ramp from near-bg to near-text in eleven stops. Used for hover/active layering and for runes that need internal contrast steps without introducing a hue.

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
- [ ] Lumina's default token values shift to the neutral palette described above (light + dark)
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

- **Exact hues for status colours** (`info`, `warning`, `danger`, `success`) in the neutral default. The principle is "muted, functionally readable, never garish" — actual values are an implementation-time decision once the rest of the palette is rendered.
- **`primary-scale` ramp values.** Eleven stops along the warm-neutral axis from near-bg to near-text. Generated mathematically or hand-picked? Lean hand-picked for visual rightness; tooling can verify monotonicity.
- **Should marketing pages on the refrakt site opt into `seaside` as an example?** Lean no for message coherence. But it's a defensible choice if we feel the homepage needs more visual distinctiveness — would need to be deliberate, framed as "here's a preset in action," with a way for visitors to see the neutral default too.
- **Preset naming convention going forward.** `seaside` is geographic/atmospheric. Future presets follow the same naming axis (`midnight`, `tideline`, `mendocino`) or open it up to anything (`graphite`, `inkwell`)? Worth deciding before the second preset lands so the catalog doesn't feel haphazard.

{% /spec %}
