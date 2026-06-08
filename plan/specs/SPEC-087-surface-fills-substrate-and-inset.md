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

- New theme-config registry `substrates`, structurally parallel to `backgrounds`/`frames`/`tints`, with `extends` resolution shared with `bg`/`tint`/`frame`.

  ```ts
  interface SubstratePresetDefinition {
    pattern?: string;   // dots | grid | lines | checker | none
    size?: string;      // pattern cell size — named scale: sm | md | lg
    fill?: string;      // surface token the pattern sits on: inherit (default) | inset — full colour is `tint`'s job
    opacity?: string;   // pattern ink strength — named scale: sm | md | lg
    extends?: string;   // layer onto a base preset (same `extends` resolution as bg/tint/frame)
  }
  ```

  ```jsonc
  "substrates": {
    "dots":      { "pattern": "dots", "size": "md" },
    "code-well": { "pattern": "dots", "fill": "inset" }
  }
  ```

- Applied via `substrate="dots"`, with **inline facet overrides** `substrate-pattern`, `substrate-size`, `substrate-fill`, `substrate-opacity` mirroring `bg`/`frame` inline overrides; a preset is optional (facets work standalone).
- Patterns are **CSS-generated** (repeating gradients / inline-SVG mask), coloured from the current `--rf-color-*` tokens (ink derives from `--rf-color-border`/`muted`) so they track `tint` and the inset fill. No image assets.
- The `fill` facet is a convenience that selects the *surface token* the pattern sits on (`inherit` or `inset`); it is **not** a colour mechanism — full colour control stays with `tint`, keeping each primitive single-purpose.
- Engine reuses the `bg`/`frame` machinery (`packages/transform/src/engine.ts` bg resolution, `merge.ts` `extends` resolution): read meta → look up `substrates` → resolve `extends` → emit `data-substrate` / `--substrate-*` custom properties onto the **target surface element**.

### 2. Target — self by default, media well opt-in

- Surface fill defaults to the rune's **self** surface universally; there is no per-rune `surfaceTarget` config (and it does not inherit `frameTarget`). The media well is targeted explicitly — simpler than chrome's media-default routing.
- `substrate-target` accepts `self` (default) | `media`. On `media`, the fill lands on the `[data-section="media"]` zone (the WORK-339 media-zone element) instead of the rune root.
- `substrate-target="media"` on a rune with **no** media section emits a **build warning** (SPEC-084 validation philosophy), consistent with `frame` on a rune with no frame target.
- Carrying `substrate` on a media-slot **guest** (Case A) lands it on the guest's own surface (self); the guest fills the slot, so the pattern covers the well without targeting it.

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
- **Case B — displaced codegroup over a dotted well.** `{% card substrate="code-well" substrate-target="media" frame="code-peek" %}` hosting a `codegroup` → the dotted inset fill paints the media well; `frame` displaces/oversizes/clips the codegroup over it (SPEC-086 §4); the top-left gap reveals the substrate; body copy sits on the card's clean surface.
- **chart / diagram standalone.** Default inset `tint` → a recessed surface that tracks the page/section tint; dropped into a card media slot, the chart fills the well and its inset surface shows (Case A, no explicit attribute).

## Acceptance Criteria

- [ ] A `substrates` preset registry exists in theme config, structurally parallel to `backgrounds`/`frames`, with `extends` resolution shared with `bg`/`tint`/`frame`.
- [ ] `substrate="preset"` applies a named pattern; inline `substrate-pattern|size|fill|opacity` override facets and work without a preset.
- [ ] Patterns are token-generated (no image assets) and coloured from `--rf-color-*` so they track `tint` and the inset fill; `pattern="none"` is the empty default.
- [ ] Surface fill defaults to the rune's **self** surface (whole rune), not a media default, so `hero`/`cta`/`feature` pattern the entire banner; `substrate-target="media"` opts into the `[data-section="media"]` well; targeting `media` on a rune with no media section emits a build warning.
- [ ] A `--rf-surface-inset-shift` token (mix amount, mode-specific) plus a use-site `color-mix(in oklch, var(--rf-color-surface), black …)` recipe yields a recessed inset fill that **tracks tint** (no static absolute inset-colour token); `0` disables it per rune.
- [ ] The media well of `card`/`bento-cell`/`recipe`/`realm`/`faction`/`playlist` carries the inset fill by default (recessed sub-surface), invisible under a full-bleed guest — verified by a visual sweep.
- [ ] `chart`/`diagram` default `tint` to the inset surface for their self surface (the standalone "darker surface"), tint-tracked.
- [ ] The three fill primitives are documented as distinct layers (`tint` = colour, `bg` = image layer, `substrate` = pattern) in a theme-authoring "surfaces" page, with the self/media-well targeting and the Case A/B examples.

## Work breakdown (provisional)

1. **Inset token + recipe** — `--rf-surface-inset-shift`, use-site `color-mix`, applied to media wells + `chart`/`diagram`; visual sweep; `0` escape hatch.
2. **`substrates` registry + `substrate` attribute + inline overrides** — types + engine, modelled on `bg`/`frame`; CSS-generated dot/line/grid patterns coloured from tokens.
3. **Self/media-well targeting** — `substrate-target` (self default, media opt-in), media-zone binding (WORK-339 element), build-time validation; define the addressable media-well surface for later `tint` reuse.
4. **Docs** — theme-authoring "surfaces" page (three layers + targeting), reference updates for `tint`/`bg`/`substrate` and the inset surface; `chart`/`diagram`/`card`/`hero` examples.

## References

- Sibling chrome model: {% ref "SPEC-086" /%} (`elevation`/`frame`, self/media surfaces, host-owned clip, `frameTarget`).
- Composability + validation philosophy: {% ref "SPEC-084" /%}; media-zone contract: {% ref "WORK-339" /%}.
- Colour bridge: `packages/lumina/styles/runes/tint.css`, `TintDefinition` in `packages/transform/src/types.ts`.
- Image layer: `packages/lumina/styles/runes/bg.css`, `BgPresetDefinition`.
- Surface tokens + archetypes: `packages/lumina/tokens/base.css` / `dark.css`, `packages/lumina/styles/dimensions/surfaces.css`.
- Media zone: `packages/lumina/styles/layouts/split.css`.

{% /spec %}
