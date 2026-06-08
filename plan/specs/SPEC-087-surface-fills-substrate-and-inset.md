{% spec id="SPEC-087" status="draft" tags="surfaces,runes,engine,lumina,tokens,dx" %}

# Surface fills: substrate patterns and tint-tracked inset surfaces

{% ref "SPEC-086" /%} gave a surface its *chrome* — shadow (`elevation`) and media
presentation (`frame`). A surface also has a *fill*. Today two fill primitives
exist — `tint` (a colour-token bridge) and `bg` (an image/video layer) — but there
is no way to print a generated *pattern/texture* (dots, grid) on a surface, no
*recessed inset* fill that tracks the surface colour, and no way to scope a fill to
a rune's inner media well versus its whole surface. This spec adds `substrate` (the
pattern layer) and a derived inset surface, and defines how surface fills target the
self surface vs an addressable media well — the missing fill column of the surface
model.

## Overview

### The three fill layers (and what each is *not*)

A surface carries three independent visual layers; `substrate` is the one missing.

| Primitive   | Answers                                    | Mechanism                                              | Asset? |
|-------------|--------------------------------------------|--------------------------------------------------------|--------|
| `tint`      | what *colour* is this surface?             | bridges `--tint-*` → `--rf-color-*` (incl. surface/inset) | no — tokens |
| `bg`        | what *image/video* sits behind content?    | `[data-name="bg"]` positioned layer (object-fit/blur/overlay) | yes — a media asset |
| `substrate` | what *texture/pattern* is on the surface?  | token-generated dot/line/grid pattern                  | no — tokens |

They stack and compose: a `hero` may carry a `bg` photo, a `tint` brand colour, *and*
a `substrate` dot-grid at once — image layer, surface colour, surface texture.
`substrate` is defined precisely by exclusion: it is **not** a colour role (`tint`)
and **not** a media asset (`bg`). Being token-generated rather than an image is the
differentiator — themeable, crisp at any size, cheap, and composable: it inherits the
current colour and paints over whatever `tint`/inset fill sits beneath it.

### Fill is target-routed like chrome — but defaults to self

SPEC-086 established that a rune exposes up to two decorable surfaces — **self** and
**media** — and routed chrome to them (`elevation` → self, `frame` → media). Fill uses
the same two surfaces, with the **opposite default**, because "a background" means
"behind everything":

- **`substrate` and the inset fill default to the self surface** (the whole rune). A
  pattern on `hero`/`cta`/`feature` covers the entire banner; on a `card` it covers
  the whole tile.
- The **media well is an addressable inner surface** you opt into (`substrate-target="media"`,
  or by carrying the fill on the guest) — for the scoped case: a dotted backdrop behind
  a displaced guest, with body copy on the clean surface.

This is why fill must **not** reuse `frameTarget`: `frameTarget(hero)` is `media`, so a
media-default would wrongly scope a hero's pattern to its image. Unlike chrome, fill
needs only **one attribute** per layer, target-routed — the dotted pattern is the same
thing whichever surface it lands on, whereas chrome genuinely differs (box-shadow vs
presentation), which is why chrome took two names and fill takes one.

## Design

### 1. `substrate` — generated surface pattern

Substrate is **not** a theme preset registry (unlike `tints`/`frames`/`backgrounds`).
Those are *semantic* — the name is an intent the theme gives meaning (`tint="brand"`).
A pattern name is *concrete* — `substrate="dots"` describes the literal output, so
routing it through the theme would add coupling without semantics and force a
catalogue to maintain. Ownership is split across four layers instead, none of which
is the swappable aesthetic theme:

| Layer | Owns | Portable? |
|-------|------|-----------|
| **Engine** | the pattern *vocabulary + geometry* (`dots`/`grid`/`lines`/`cross`/`checker`/`none`) — a fixed enum, a dot is a dot everywhere | universal |
| **Shared base CSS** | the token-driven gradient *recipes* that realise each pattern (ships with `runes`/`lumina` base, always included — not per-theme) | universal |
| **Theme** | only the *tokens* the recipes read — ink colour, default cell-size | yes (semantic tokens) |
| **Project config** (`refrakt.config.json`) | optional **named recipes** composed from primitives + facets (deferred — see below) | yes (travels with content) |
| **Content** (inline facets) | direct `substrate="dots" substrate-size="md"` | yes (self-contained) |

- **Pattern enum (engine):** `dots | grid | lines | cross | checker | none`. Fixed, spec-owned; `none` is the empty default. New geometry (e.g. `grain`) is an engine/plugin contribution, never a config bundle.
- **Inline facets (content, portable):** `substrate="dots"` plus `substrate-size` (`sm|md|lg`), `substrate-opacity` (`sm|md|lg`), `substrate-fill` (`inherit` (default) | `inset` — selects the *surface token* the pattern sits on; full colour stays with `tint`). Facets are self-contained and travel with the content.
- **The engine emits markers only — it never draws.** It sets `data-substrate="dots"` and `--substrate-*` custom properties on the target surface element; CSS does the rendering, exactly like `data-method="GET"`:

  ```html
  <div data-section="media" data-substrate="dots"
       style="--substrate-cell: 16px; --substrate-ink: var(--rf-color-border);">
  ```

- **Shared base layer realises the geometry, token-driven.** The gradient recipes live in a base stylesheet that ships with the engine/runes (always included, *not* in a theme's swappable CSS), exposing only the `--substrate-*` token hooks. This is what makes "dots = dots on every theme" a guarantee rather than a convention — themes retune tokens, they don't get a `[data-substrate="dots"]{…}` block to redefine. Patterns are pure CSS, no image assets, crisp at any zoom:

  ```css
  /* dots — one tiled radial-gradient */
  [data-substrate="dots"] {
    background-image: radial-gradient(var(--substrate-ink) var(--substrate-dot, 1.5px), transparent 0);
    background-size: var(--substrate-cell, 16px) var(--substrate-cell, 16px);
  }
  /* grid — two tiled linear-gradients */
  [data-substrate="grid"] {
    background-image:
      linear-gradient(var(--substrate-ink) 1px, transparent 1px),
      linear-gradient(90deg, var(--substrate-ink) 1px, transparent 1px);
    background-size: var(--substrate-cell, 24px) var(--substrate-cell, 24px);
  }
  ```

  `--substrate-ink` resolves from `--rf-color-border`/`muted` (tint-bridged), so the pattern recolours with the surface; the pattern is a `background-image` over the `background-color` fill (§3), and the gradient's `transparent` gaps reveal it.
- **Named recipes are a project concern, deferred.** If `substrate="code-well"` (a memorable bundle of pattern + facets) earns its keep, it is defined in `refrakt.config.json` (project-level, theme-independent) so it travels with the content — never in theme config. Start without it (inline facets are concise); add it only if real content shows the inline form repeating.

### 2. Target — rune-declared default (self), theme-overridable, author wins

Three owners, distinct responsibilities:

- **Surface vocabulary is the rune contract.** A rune declares which surfaces a fill can target — `self` (rune root) and, if it has a media section, `media` (`[data-section="media"]`, the WORK-339 zone). This lives in rune config (engine for core runes, plugin for plugin runes), not in swappable CSS, so it is portable.
- **Default surface is `RuneConfig.substrateTarget` (defaults to `'self'`), and a theme may override it** via the existing `mergeThemeConfig` path. This is "themes define where it lands": a theme can declare *its* `card` paints the media well by default while a banner paints the whole surface. It is a *separate* field from `frameTarget` and defaults to `'self'` — it does **not** inherit frame's media-default (which would wrongly scope a `hero`'s pattern to its image).
- **Explicit author intent always wins, on every theme.** A per-instance `substrate-target="self|media"` overrides the rune/theme default and is never relocated by a theme — the portability boundary. Targeting `media` on a rune with no media section emits a **build warning** (SPEC-084 validation), as with `frame`.
- Carrying `substrate` on a media-slot **guest** (Case A) lands it on the guest's own surface (`self`); the guest fills the slot, so the pattern covers the well without targeting it.

### 3. Inset surface — derived, tint-tracking

- New token `--rf-surface-inset-shift` — a *mix amount*, not a colour: light `5%`, dark `8%` (tunable), in `tokens/base.css` / `dark.css`.
- The inset fill is computed **at use-site** from the in-scope surface:

  ```css
  background: color-mix(in oklch, var(--rf-color-surface), black var(--rf-surface-inset-shift));
  ```

- Because the mix reads the *inherited* `--rf-color-surface`, it recomputes from a tinted surface automatically — **tint cascades into the fill with no extra plumbing**. A static absolute `--rf-color-surface-inset` token would freeze to the untinted `:root` surface and would *not* track tint; the derivation must live where surface is in scope.
- Mix toward **`black` in oklch** (lowers lightness, preserves the tinted hue) rather than toward `--rf-color-bg` (which is untinted — both modes have bg darker than surface, but mixing toward it would desaturate a tinted well). Same recipe both modes; only the shift differs.
- Two default consumers:
  - **Media well** of `card`/`bento-cell`/`recipe`/`realm`/`faction`/`playlist` (`[data-section="media"]`): gains the inset fill as its surface — a recessed sub-surface that tracks the card's (possibly tinted) colour. Invisible under a full-bleed cover; visible in the gaps (transparent, displaced, or absent guest).
  - **`chart`/`diagram` self surface**: default `tint` resolves their `--rf-color-surface` to the inset, giving the standalone "darker surface" (the deferred inset-surface idea), tint-tracked.
- `--rf-surface-inset-shift: 0` is the per-rune escape hatch (well flush with its surface).

### 4. Relationship to `tint` and `bg`

- The *solid* inset/darker fill is firmly **`tint`'s** job (a surface-colour token); `substrate` is strictly the **pattern** layer above the fill. Single-purpose primitives.
- `tint` may later want the same self/media-well targeting (to colour a card's well independently). This spec defines the addressable media-well surface **once** and wires `substrate` + the inset fill to it; media-targeted `tint` is a follow-on (the inset-fill default already covers the common "well recedes" case).
- `bg` is unchanged; `substrate` composes above a `bg` layer (pattern over photo) when both are present.

### Case studies

- **hero / cta — pattern the whole banner.** `{% hero substrate="dots" %}` → self surface; the dot-grid covers the entire banner behind eyebrow/title/media. (The self default is load-bearing here: `frameTarget(hero)` is `media`, so a media-default would wrongly scope the pattern to the hero image.)
- **Case A — juxtapose fills the slot with its own dots.** `{% juxtapose substrate="dots" %}` inside a card media slot → self surface; the guest fills the slot, so its pattern covers the well. The card's own well fill is never seen.
- **Case B — displaced codegroup over a dotted well.** `{% card substrate="dots" substrate-fill="inset" substrate-target="media" frame="code-peek" %}` hosting a `codegroup` → the dotted pattern over the inset fill paints the media well; `frame` displaces/oversizes/clips the codegroup over it (SPEC-086 §4); the top-left gap reveals the substrate; body copy sits on the card's clean surface. (A project could bundle `substrate-fill="inset" substrate="dots"` as a named `refrakt.config.json` recipe — deferred.)
- **chart / diagram standalone.** Default inset `tint` → a recessed surface that tracks the page/section tint; dropped into a card media slot, the chart fills the well and its inset surface shows (Case A, no explicit attribute).

## Acceptance Criteria

- [ ] The pattern vocabulary is a **fixed engine-level enum** (`dots|grid|lines|cross|checker|none`), **not** a theme preset registry; `none` is the empty default and new geometry is an engine/plugin contribution.
- [ ] `substrate="dots"` plus inline facets `substrate-size|opacity|fill` work standalone (no preset needed); `substrate-fill` selects `inherit`|`inset` (full colour stays with `tint`).
- [ ] The gradient recipes ship in a **shared base stylesheet** (always included, not per-theme) exposing only `--substrate-*` token hooks; the theme tunes ink colour + cell-size tokens but cannot redefine a pattern's geometry. Patterns are token-generated (no image assets) and coloured from `--rf-color-*` so they track `tint` and the inset fill.
- [ ] Optional **named recipes** are defined in `refrakt.config.json` (project-level, theme-independent), not theme config — and are deferred until inline facets prove insufficient.
- [ ] Surface fill target is `RuneConfig.substrateTarget`, defaulting to `'self'` (separate from `frameTarget`, so `hero`/`cta`/`feature` pattern the whole banner), **theme-overridable** via `mergeThemeConfig`; a per-instance `substrate-target="self|media"` always wins and is never relocated by a theme; targeting `media` on a rune with no media section emits a build warning.
- [ ] A `--rf-surface-inset-shift` token (mix amount, mode-specific) plus a use-site `color-mix(in oklch, var(--rf-color-surface), black …)` recipe yields a recessed inset fill that **tracks tint** (no static absolute inset-colour token); `0` disables it per rune.
- [ ] The media well of `card`/`bento-cell`/`recipe`/`realm`/`faction`/`playlist` carries the inset fill by default (recessed sub-surface), invisible under a full-bleed guest — verified by a visual sweep.
- [ ] `chart`/`diagram` default `tint` to the inset surface for their self surface (the standalone "darker surface"), tint-tracked.
- [ ] The three fill primitives are documented as distinct layers (`tint` = colour, `bg` = image layer, `substrate` = pattern) in a theme-authoring "surfaces" page, with the self/media-well targeting and the Case A/B examples.

## Work breakdown (provisional)

1. **Inset token + recipe** — `--rf-surface-inset-shift`, use-site `color-mix`, applied to media wells + `chart`/`diagram`; visual sweep; `0` escape hatch.
2. **`substrate` attribute + engine enum + shared base layer** — engine emits `data-substrate`/`--substrate-*`; ship the token-driven gradient recipes (`dots|grid|lines|cross|checker`) in an always-included base stylesheet exposing only token hooks; theme contributes ink/scale tokens.
3. **`substrateTarget` routing** — `RuneConfig.substrateTarget` (default `self`, theme-overridable), per-instance `substrate-target` override (author wins), media-zone binding (WORK-339 element), build-time validation; define the addressable media-well surface for later `tint` reuse.
4. **Docs** — theme-authoring "surfaces" page (three layers + targeting), reference updates for `tint`/`bg`/`substrate` and the inset surface; `chart`/`diagram`/`card`/`hero` examples.

## References

- Sibling chrome model: {% ref "SPEC-086" /%} (`elevation`/`frame`, self/media surfaces, host-owned clip, `frameTarget`).
- Composability + validation philosophy: {% ref "SPEC-084" /%}; media-zone contract: {% ref "WORK-339" /%}.
- Colour bridge: `packages/lumina/styles/runes/tint.css`, `TintDefinition` in `packages/transform/src/types.ts`.
- Image layer: `packages/lumina/styles/runes/bg.css`, `BgPresetDefinition`.
- Surface tokens + archetypes: `packages/lumina/tokens/base.css` / `dark.css`, `packages/lumina/styles/dimensions/surfaces.css`.
- Media zone: `packages/lumina/styles/layouts/split.css`.

{% /spec %}
