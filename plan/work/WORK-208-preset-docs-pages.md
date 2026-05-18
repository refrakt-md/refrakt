{% work id="WORK-208" status="done" priority="medium" complexity="medium" tags="docs, presets, design-runes, dogfood" source="SPEC-051, SPEC-053" milestone="v0.14.0" %}

# Preset documentation pages with design-plugin runes

Author three documentation pages on the refrakt site — one per palette surface (neutral default, tideline, niwaki) — that visualise the tokens using runes from `@refrakt-md/design` (`palette`, `swatch`, `typography`, `spacing`). The pages double as the canonical marketing surface for the design plugin: refrakt documenting refrakt's own theme via refrakt's own runes. Per SPEC-053, niwaki's page also includes a *user-defined* tint example to surface the site-author tint-authoring path.

## Acceptance Criteria

- [x] `/docs/themes/lumina/neutral-default` exists and documents:
  - [x] Body palette in light + dark, each rendered with the `palette` rune from `@refrakt-md/design`
  - [x] Syntax palette in light + dark, plus inline `{% hint %}` examples for each of the four sentiment status colours
  - [x] Status palette grouped by sentiment
  - [x] Typography using the `typography` rune
- [x] `/docs/themes/lumina/presets/tideline` exists and documents:
  - [x] Cream-and-navy palette via `palette` rune (light + dark + primary-scale + status)
  - [x] Plex Sans / Plex Mono typography via `typography` rune
  - [x] One-line opt-in config snippet plus the Outfit-pin-back escape hatch
  - [x] Composition with niwaki for warm chrome + Japanese-garden code
- [x] `/docs/themes/lumina/presets/niwaki` exists and documents:
  - [x] Seven syntax swatches with Japanese names (matsu, sakura, momiji, kuri, wakaba, ishi) — light + dark
  - [x] Composition example showing `["tideline", "niwaki"]`
  - [x] Site-level user-defined tint example (per SPEC-053 acceptance — `garden-hero` extending the `warm` tint)
  - [x] Brief note crediting the Japanese visual tradition
- [x] An overview page at `/docs/themes/lumina/` ties the three together — table of palettes, composition example, link to authoring custom presets
- [x] All four pages cross-link
- [x] All four pages render correctly

## Approach

The design plugin's runes (`palette`, `swatch`, `typography`) are the canonical surfaces for this kind of documentation. Use them rather than hand-rolled HTML — that's the whole point of the dogfooding loop.

Page structure (loose template):

```markdoc
{% preset-overview name="tideline" %}
...
{% /preset-overview %}

## Body palette

{% palette tokens="color.bg,color.text,color.muted,color.border,..." /%}

## Surfaces

{% swatch token="color.surface.base" label="surface.base" /%}
...

## Typography

{% typography font.sans="IBM Plex Sans" font.mono="IBM Plex Mono" /%}

## Live preview

{% preview source=true %}
... small page section rendered with the preset applied ...
{% /preview %}

## Opt in

```json
{
  "theme": {
    "presets": ["@refrakt-md/lumina/presets/tideline"]
  }
}
```
```

(Exact rune names and attributes match whatever the design plugin currently supports — check `plugins/design/` and adjust.)

The composition test on the niwaki page demonstrates the scoped-preset pattern visually — readers see both presets layered without writing the config themselves.

The site-level user-defined tint example on the niwaki page is the SPEC-053 link — declare a small custom tint in a `{% sandbox %}` or as a sidebar snippet, show what it does, link to SPEC-053 for the full vocabulary.

## Dependencies

- {% ref "WORK-200" /%}, {% ref "WORK-201" /%}, {% ref "WORK-202" /%}, {% ref "WORK-204" /%}, {% ref "WORK-205" /%} — all the palettes and presets being documented must exist.
- {% ref "WORK-198" /%} — tint configs migrated to new vocabulary (so the user-defined tint example uses current shape).
- {% ref "WORK-203" /%} — fonts loading so the typography rune renders correctly.

## References

- {% ref "SPEC-051" /%} — "Preset documentation pages use design-plugin runes" — site & scaffold section
- {% ref "SPEC-053" /%} — acceptance criterion for the user-defined tint example
- `plugins/design/` — runes used by these pages

{% /work %}
