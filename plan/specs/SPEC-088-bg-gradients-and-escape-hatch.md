{% spec id="SPEC-088" status="shipped" tags="surfaces,runes,engine,lumina,bg,dx" released-in="v0.20.0" %}

# `bg` gradients and a formalized custom-CSS escape hatch

`bg` is the deepest layer of the surface model ({% ref "SPEC-087" /%}) — the
image/generated-image fill beneath `tint` (colour) and `substrate` (pattern). Today
it handles image/video/overlay layers plus a theme-level `backgrounds` preset
registry, but it has two gaps and one incidental wart:

- **No first-class gradient fill.** A smooth colour gradient is the most common
  generated backdrop (heroes, CTAs), yet the only way to get one is through raw CSS —
  either the undocumented `BgPresetDefinition.style` map or the unvalidated `overlay`
  string — both of which bypass the token system, aren't portable, and aren't
  documented.
- **The escape hatch is real but incidental.** `BgPresetDefinition.style?: Record<string, string>` (`packages/transform/src/types.ts`) splats arbitrary CSS onto the bg layer (`engine.ts` bg resolution). It's powerful and worth keeping — but it's undocumented, unvalidated, theme-coupled, and has no contract about portability or token discipline.
- **The `overlay` passthrough is unintended fallout.** `overlay` has no `matches` constraint, so any non-`dark`/`light` value is raw-injected as `style="background: …"` (`engine.ts`) — an accidental second escape hatch.

This spec makes gradients a **structured, token-driven `bg` facet**, **formalizes** the
raw-CSS escape hatch as an intentional, documented, last-resort mechanism with the
right config home, and **folds the `overlay` passthrough** into the structured model.

## Overview

### Two tiers: structured facets first, then one honest escape hatch

The governing principle (the same one behind {% ref "SPEC-087" /%}'s substrate
vocabulary): common backdrops become **structured, token-driven facets** so they are
portable and themeable; raw CSS stays available but as a **single, named, documented**
escape hatch for the long tail — not as undocumented fallout scattered across
attributes. Authors reach for the structured path first; the escape hatch is the
explicit "I own this" exit.

This mirrors how concrete vs semantic ownership was resolved for `substrate`: the
*structured* facets are token-referencing and portable; anything raw is an explicit,
bounded escape that travels with the **content/project**, not the theme.

## Design

### 1. `bg` gradient fill — token-driven, structured

Gradients appear in **two positions** on the bg layer, both token-driven: the **fill**
(the base layer, this section — a gradient backdrop replacing/augmenting the image) and
the **scrim** (a gradient in the overlay layer for legibility over an image, §3). Both
generate `background-image: linear-gradient(…)` (and `radial`/`conic`) from **token
references**, never raw colours — so the theme/`tint` still own the actual colours and
gradients track the active theme.

- **Inline facets** (portable):
  - `bg-gradient` — direction, a bounded named set (`to-t|to-b|to-l|to-r|to-tr|to-br|to-bl|to-tl`), consistent with the named-scale convention (no raw angles — that's the escape hatch's job, per {% ref "SPEC-086" /%}'s offset-scale decision).
  - `bg-from` / `bg-to` / `bg-via` — **semantic token references** (`primary`, `surface`, `accent`, …) resolved to `var(--rf-color-*)`. Two-stop is the common case; `via` gives three.
  - `bg-gradient-type` — `linear` (default) | `radial` | `conic`.
- **Named gradient presets** (semantic → theme-ownable): a brand gradient *is* semantic (like `tint="brand"`), so it belongs in a **structured** `gradient` field on `BgPresetDefinition`, not the raw `style` map:

  ```ts
  interface BgPresetDefinition {
    gradient?: { type?: string; direction?: string; stops: string[] };  // stops are token NAMES
    style?: Record<string, string>;   // raw-CSS escape hatch — see §2
    params?: Record<string, string>;
    extends?: string;
  }
  ```

  Applied via `bg="brand-fade"`; resolves to `linear-gradient(<direction>, var(--rf-color-<stop>)…)`.
- **Layering.** A fill gradient occupies the **base** bg layer slot — it composes *beneath* a scrim (§3), a `substrate` pattern ({% ref "SPEC-087" /%}: gradient backdrop + dot overlay), and over/with the `tint`/inset fill. Engine emits `--bg-image: linear-gradient(…)` reusing the existing `--bg-image` plumbing in `bg.css`.

### 2. The escape hatch, formalized

`BgPresetDefinition.style` is **kept** but promoted from incidental to intentional, with
a stated contract:

- **What it is:** raw CSS key/value pairs applied to the bg layer. The genuine long
  tail — animations, exotic effects, custom `background` shorthand — that the
  structured facets (gradient, image, video, overlay, blur, fit, position, opacity)
  don't cover.
- **Contract:** it **bypasses the token system**; the author owns cross-theme behaviour
  and portability. It is explicitly the *last resort*, documented as such.
- **Config home:** a *theme* may use `style` for its own aesthetic presets (the theme
  owns its look). A *site/content author* wanting custom CSS defines the preset in
  **project config** (`refrakt.config.json`), so it travels with the content rather
  than the theme — the same project-vs-theme split decided for SPEC-087 named recipes.
  Project `backgrounds` merge over theme `backgrounds`.
- **Nudge, don't trap:** a build-time **soft warning** flags a raw gradient/background
  in `style` (or `overlay`) that a structured facet now covers, pointing to the facet —
  keeping the escape hatch honest without forbidding it.

### 3. `overlay` and `scrim` reconciled

The overlay layer serves two jobs today, conflated behind one unvalidated string: a flat
wash (`dark`/`light`) and an ad-hoc legibility gradient (`overlay="linear-gradient(…)"`).
Split them into two structured facets:

- **`overlay`** — a flat wash, constrained to a **structured vocabulary**: `none | dark | light` plus an optional token reference + opacity (`overlay="primary"`, `overlay-opacity`).
- **`scrim`** — a structured, token-driven **legibility treatment** behind overlaid text, in two flavours:
  - `scrim-type="gradient"` (default) — a directional, token-coloured darken/lighten gradient; `scrim="bottom"` (direction from the same bounded set as `bg-gradient`) + `scrim-strength="sm|md|lg"`.
  - `scrim-type="frost"` — `backdrop-filter: blur()` + a translucent tint; **colour-adaptive** (the blur samples the image's colours), the iOS-materials look. `scrim-blur="none|sm|md|lg"`.
  - `scrim-tone="dark|light"` — whether it darkens (for light text) or lightens (for dark text). Auto-tone (image-luminance detection) isn't feasible at build without processing the image bytes, so `tone` is **explicit** (or theme-defaulted), not magic — `frost` gets the *colour adaptation* for free but still needs the light/dark decision. `scrim-tone` is **one knob for the whole legibility decision**: it also sets the **foreground polarity** of the overlaid content — a `dark` scrim flips the text/muted tokens to the light ("on-dark") set, a `light` scrim to the dark set — so the overlay's text colour follows the scrim, **not the base-surface tint** (a light card can carry white cover text without the author touching colours).

  The scrim **targets either surface** via the {% ref "SPEC-087" /%} self/media routing: the `bg` overlay layer (a decorative backdrop), or the **media well** when text overlays a media guest in `cover` mode ({% ref "SPEC-089" /%}). It is the **structured replacement** for the raw `overlay="linear-gradient(…)"` scrim.
- **Deprecate** the unvalidated raw-string `overlay` passthrough: keep it working for one minor with a build warning pointing to `scrim` (gradient overlays) or `overlay`/`style` (flat/exotic), then remove — mirroring SPEC-086's deprecation-alias approach. The deprecation is **gated on `scrim` shipping**, so no use case (notably the legibility scrim) loses its path.

## Acceptance Criteria

- [ ] `bg` supports a token-driven gradient via inline facets `bg-gradient` (bounded direction set), `bg-from|to|via` (semantic token references → `var(--rf-color-*)`), `bg-gradient-type` (`linear|radial|conic`); colours stay token-owned so gradients track the theme/`tint`.
- [ ] Named gradient presets are defined **structurally** on `BgPresetDefinition.gradient` (type + direction + token-name stops), not via the raw `style` map; `bg="name"` applies one; `extends` resolution works as for other presets.
- [ ] Gradients exist in **two positions** — a **fill** (base bg layer, reuses `--bg-image`) and a **scrim** (overlay layer); the fill composes beneath the scrim, a `substrate` pattern ({% ref "SPEC-087" /%}), and with the `tint`/inset fill.
- [ ] `BgPresetDefinition.style` is documented as an intentional, last-resort escape hatch with a stated contract (raw CSS on the bg layer, bypasses tokens, author owns portability), valid in both theme config and project config (`refrakt.config.json`); project `backgrounds` merge over theme `backgrounds`.
- [ ] A build-time soft warning flags a raw gradient/background in `style` or `overlay` that a structured facet covers, pointing to the facet.
- [ ] `overlay` (flat wash) is constrained to `none|dark|light` (+ optional token reference / opacity), and a structured **`scrim`** facet provides legibility behind overlaid text via `scrim-type` (`gradient` default | `frost` = `backdrop-filter` blur + tint), `scrim-strength`, `scrim-blur`, and `scrim-tone` (`dark|light`, explicit — no build-time auto-detection), targeting the `bg` overlay or the media well (SPEC-087 routing; `cover` mode {% ref "SPEC-089" /%}) — the structured replacement for raw `overlay="linear-gradient(…)"`.
- [ ] `scrim-tone` sets the overlaid content's **foreground polarity** (text/muted tokens), not just the wash — a `dark` scrim yields light text — so the overlay's colour follows the scrim, not the base-surface tint.
- [ ] The unvalidated raw-string `overlay` passthrough is deprecated with a build warning for one minor, then removed (migration to `scrim`/`overlay`/`style`); the deprecation is **gated on `scrim` shipping** so no use case loses its path.
- [ ] The `bg` reference docs document gradients (facets + presets), the escape hatch (contract + config home), and the `overlay` change; cross-linked with {% ref "SPEC-087" /%} (surface-fill layering) and {% ref "SPEC-086" /%}.

## Work breakdown (provisional)

1. **Gradient facet + structured preset field** — `BgPresetDefinition.gradient`, inline facets, engine resolution (token-name stops → `var(--rf-color-*)`, → `--bg-image`), `bg.css`.
2. **Formalize the escape hatch** — document the `style` contract; add/confirm project-config (`refrakt.config.json`) `backgrounds` home and merge-over-theme semantics.
3. **`overlay` + `scrim` + deprecation path** — flat-wash `overlay` vocabulary; structured `scrim` (`type` gradient/frost, `strength`, `blur`, `tone`) targeting the bg overlay or the media well (SPEC-087 routing); raw-string passthrough warns then removed (gated on `scrim`); migration notes.
4. **Soft-lint** — flag raw CSS in `style`/`overlay` that a structured facet now covers.
5. **Docs** — `bg` reference (gradients + escape hatch + overlay), cross-links.

## References

- Surface-fill layering + sibling specs: {% ref "SPEC-087" /%} (substrate/inset; the gradient seam is noted in its §4), {% ref "SPEC-086" /%} (chrome; named-scale convention, deprecation-alias pattern).
- Cover-mode scrim (media-surface target) + content placement: {% ref "SPEC-089" /%}.
- Current `bg`: `BgPresetDefinition` in `packages/transform/src/types.ts`; bg resolution + `overlay` passthrough in `packages/transform/src/engine.ts`; rune schema in `packages/runes/src/tags/bg.ts`; CSS in `packages/lumina/styles/runes/bg.css`; public docs `site/content/runes/bg.md`.
- Preset `extends` machinery shared with `tint`/`frame`: `packages/transform/src/merge.ts`.

{% /spec %}
