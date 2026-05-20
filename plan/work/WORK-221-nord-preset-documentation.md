{% work id="WORK-221" status="ready" priority="medium" complexity="small" tags="docs, lumina, presets, nord" source="SPEC-056" milestone="v0.14.1" %}

# Nord preset documentation page

Ship `site/content/docs/themes/lumina/presets/nord.md` — a documentation page for the Nord preset following the niwaki page's structure (`site/content/docs/themes/lumina/presets/niwaki.md`). Includes `{% palette %}` blocks that honour Nord's original swatch names (Polar Night, Snow Storm, Frost, Aurora) so readers see the palette author's vocabulary, not refrakt-internal role names.

## Acceptance Criteria

- [ ] `site/content/docs/themes/lumina/presets/nord.md` exists with frontmatter (`title`, `description`) matching the niwaki page's style
- [ ] Opening paragraph explains: Nord is a syntax-only preset, what palette it derives from, and one-sentence attribution to the original authors
- [ ] "Opt in" section shows the `refrakt.config.json` snippet to enable Nord on the neutral default
- [ ] "The palette" section contains two `{% palette %}` blocks — one light, one dark — listing Nord's named hues (e.g. "Frost nord7 (type)", "Aurora nord14 (string)") with `showContrast=true` and `showA11y=true`
- [ ] "Composing with tideline" section mirrors niwaki's composition example, demonstrating `["tideline", "nord"]`
- [ ] Page links to the upstream Nord site (https://www.nordtheme.com/) for the canonical palette spec
- [ ] Page renders without errors on the local site (`cd site && npm run dev`)
- [ ] Palette swatches in the rendered page show distinct colours for `type` vs `function` (the role split SPEC-056 was motivated by)

## Approach

Copy the structure of `site/content/docs/themes/lumina/presets/niwaki.md` (with permission — it's our own page) and adapt. Sections to mirror:

1. Title + intro paragraph (replace garden metaphor with Arctic Ice metaphor — Nord's own design language uses Arctic / north-Atlantic / aurora imagery)
2. Opt in (config snippet)
3. The palette (two `{% palette %}` blocks — light and dark)
4. Composing with tideline (mirror niwaki's example)
5. Attribution / credit to Arctic Ice Studio & Sven Greb

The palette-block format that worked for niwaki:

```markdoc
{% palette title="Nord — dark" tint-mode="dark" showContrast=true showA11y=true %}
- Frost nord7 (type): #8fbcbb
- Frost nord8 (function): #88c0d0
- Frost nord9 (keyword): #81a1c1
- Aurora nord14 (string): #a3be8c
- ...
{% /palette %}
```

Skip niwaki's "Why scoped?" section — that argument was specific to introducing the scoped-preset concept. The Nord page can assume the reader already knows what a syntax-only preset is and link to the niwaki page (or to a future "Lumina presets" index) for the concept.

The "Authoring a custom tint that pairs with X" section from niwaki is also skippable — it's pedagogical content that lives better in one place than in every preset page.

## Dependencies

- {% ref "WORK-220" /%} — Nord preset module must exist and have its final hue assignments locked in before the doc can list them accurately

## References

- {% ref "SPEC-056" /%} — "Authoring Surface" → "Palette documentation" subsection
- `site/content/docs/themes/lumina/presets/niwaki.md` — structural reference
- Nord palette: https://www.nordtheme.com/docs/colors-and-palettes

{% /work %}
