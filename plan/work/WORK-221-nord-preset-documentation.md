{% work id="WORK-221" status="ready" priority="medium" complexity="small" tags="docs, lumina, presets, nord" source="SPEC-056" milestone="v0.14.1" %}

# Nord preset documentation page

Ship `site/content/docs/themes/lumina/presets/nord.md` — a documentation page for the Nord preset that serves as the **end-to-end validation of SPEC-056's three extensions**: it must render palette swatches in Nord's colours on Nord's canvas, *and* show a live code block highlighted in Nord, *on the refrakt documentation site whose active preset is niwaki*. The mechanism that makes this possible is the scoped-tint projection from WORK-223 — Nord is declared in the site's `theme.tints` (extending the Nord preset module), and `{% tint preset="nord" %}` wrappers scope Nord's colours to the relevant subtrees.

This is also a dogfood test: if the tint mechanism feels right authoring this page, it'll feel right for every subsequent palette import.

## Acceptance Criteria

- [ ] `site/content/docs/themes/lumina/presets/nord.md` exists with frontmatter (`title`, `description`) matching the niwaki page's style
- [ ] Opening paragraph explains: Nord is an *integrated* palette preset (canvas + foreground), what palette it derives from, and one-sentence attribution to the original authors. Briefly notes the contrast with niwaki's scoped-only approach
- [ ] "Opt in" section shows the `refrakt.config.json` snippet to enable Nord as the *active* preset on a site (replaces niwaki / neutral default)
- [ ] The site's own `refrakt.config.json` (or whichever config drives the docs site) gains a `tints.nord` entry with `extends: "@refrakt-md/lumina/presets/nord"` so the showcase mechanism works on the page
- [ ] "The palette" section contains two `{% palette %}` blocks — one light, one dark — each wrapped in `{% tint preset="nord" %}` so the swatches sit on Nord's canonical canvas, not the site's niwaki/neutral canvas. Lists Nord's named hues (e.g. "Frost nord7 (type)", "Aurora nord14 (string)") with `showContrast=true` and `showA11y=true`
- [ ] "Live preview" section contains a fenced code block (e.g. a TypeScript snippet exercising keyword/function/type/string/comment) wrapped in `{% tint preset="nord" %}` — the block renders highlighted in Nord while the surrounding page chrome stays in the site's active preset (niwaki). This is the visual proof the scoped-tint mechanism works
- [ ] "Composing with tideline" section demonstrates `["tideline", "nord"]` as active presets — Nord's syntax + canvas on tideline's chrome
- [ ] Page links to the upstream Nord site (https://www.nordtheme.com/) for the canonical palette spec
- [ ] Page renders without errors on the local site (`cd site && npm run dev`)
- [ ] Palette swatches and the live code block show distinct colours for `type` vs `function` (Frost-7 vs Frost-8 — the role split SPEC-056 was motivated by)
- [ ] The page chrome (header, nav, body bg, surrounding prose) is *not* affected by the embedded `{% tint preset="nord" %}` blocks — they're scoped to their subtrees only. This is the proof the scope-eligibility filter is working

## Approach

Two halves to this page: the palette documentation (swatches on Nord's canvas) and the live code preview (actual highlighter output in Nord on a non-Nord site).

**Palette blocks.** Wrap each `{% palette %}` in `{% tint preset="nord" %}`:

```markdoc
{% tint preset="nord" %}
{% palette title="Nord — dark" tint-mode="dark" showContrast=true showA11y=true %}
- Polar Night nord0 (canvas): #2e3440
- Snow Storm nord4 (text): #d8dee9
- Frost nord7 (type): #8fbcbb
- Frost nord8 (function): #88c0d0
- Frost nord9 (keyword): #81a1c1
- Aurora nord14 (string): #a3be8c
- ...
{% /palette %}
{% /tint %}
```

The tint wrapper sets Nord's `color.code.bg` (and the rest of the scope-eligible namespaces) as scoped CSS variables, so the palette swatches sit on Polar Night even though the page is rendered on a niwaki site.

**Live code preview.** Wrap a fenced code block in the same tint:

```markdoc
{% tint preset="nord" %}
\`\`\`ts
interface User {
  id: number;
  name: string;
}

function greet(user: User): string {
  return \`Hello, \${user.name}!\`; // friendly
}
\`\`\`
{% /tint %}
```

This renders the highlighter's spans against Nord's syntax token CSS variables (scoped) and on Nord's code-surface bg (also scoped). The user sees a "this is what your code will look like in Nord" block without the site itself adopting Nord.

**Structure.** Mirror niwaki's page layout where it makes sense:

1. Title + intro paragraph (Arctic/aurora metaphor — Nord's own design language)
2. Opt in (config snippet for activating Nord as the site preset)
3. The palette (two `{% palette %}` blocks tinted to Nord)
4. Live preview (one code block tinted to Nord)
5. Composing with tideline (mirror niwaki's pattern — `["tideline", "nord"]`)
6. Attribution / credit to Arctic Ice Studio & Sven Greb

Skip niwaki's "Why scoped?" section — Nord is the contrast case (integrated, not scoped). The page can briefly note this difference in the intro and move on.

The "Authoring a custom tint that pairs with X" section from niwaki is also skippable — pedagogical content that belongs in one place, not every preset page.

## Dependencies

- {% ref "WORK-220" /%} — Nord preset module must exist with its final hue assignments locked in before the doc can list them accurately
- {% ref "WORK-223" /%} — scoped tint projection must work end-to-end. Without it, `{% tint preset="nord" %}` doesn't project Nord's colours and the live preview fails

## References

- {% ref "SPEC-056" /%} — "Authoring Surface" → "Tint as scoped preset projection" and "Palette documentation" subsections; "Validation" section names this page as the end-to-end test
- `site/content/docs/themes/lumina/presets/niwaki.md` — structural reference (niwaki is the *scoped* archetype; Nord is the *integrated* archetype)
- Nord palette: https://www.nordtheme.com/docs/colors-and-palettes

{% /work %}
