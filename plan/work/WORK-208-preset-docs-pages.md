{% work id="WORK-208" status="ready" priority="medium" complexity="medium" tags="docs, presets, design-runes, dogfood" source="SPEC-051, SPEC-053" milestone="v0.14.0" %}

# Preset documentation pages with design-plugin runes

Author three documentation pages on the refrakt site — one per palette surface (neutral default, tideline, niwaki) — that visualise the tokens using runes from `@refrakt-md/design` (`palette`, `swatch`, `typography`, `spacing`). The pages double as the canonical marketing surface for the design plugin: refrakt documenting refrakt's own theme via refrakt's own runes. Per SPEC-053, niwaki's page also includes a *user-defined* tint example to surface the site-author tint-authoring path.

## Acceptance Criteria

- [ ] `/docs/themes/lumina/neutral-default` page exists and documents:
  - [ ] The body palette using `palette` / `swatch` runes (one swatch per token in the SPEC-051 table)
  - [ ] The syntax palette with a live code block rendered with the colours documented
  - [ ] The status palette with one example callout per sentiment
  - [ ] The typography pair using `typography` rune (Inter sample + JetBrains Mono sample)
- [ ] `/docs/themes/lumina/presets/tideline` page exists and documents:
  - [ ] The cream-and-navy palette swatches
  - [ ] The Plex Sans + Plex Mono typography
  - [ ] A `{% preview source=true %}` showing a page section rendered with tideline applied
  - [ ] The one-line opt-in config snippet
- [ ] `/docs/themes/lumina/presets/niwaki` page exists and documents:
  - [ ] The seven syntax swatches with their Japanese names (matsu, sakura, momiji, kuri, wakaba, ishi)
  - [ ] A live code block (rendered with niwaki applied — works because the refrakt site uses niwaki anyway)
  - [ ] A composition example showing `["tideline", "niwaki"]` rendering
  - [ ] At least one site-level user-defined tint example (per SPEC-053 acceptance criterion — gives the authoring surface visibility)
  - [ ] A brief note crediting the Japanese visual tradition
- [ ] All three pages link to each other so readers can navigate the palette story end-to-end
- [ ] All three pages render correctly on `cd site && npm run dev`

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
