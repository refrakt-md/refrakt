{% work id="WORK-221" status="done" priority="medium" complexity="simple" tags="docs, lumina, presets, nord" source="SPEC-056" milestone="v0.14.1" %}

# Nord preset documentation page

Ship `site/content/docs/themes/lumina/presets/nord.md` — a documentation page for the Nord preset that serves as the **end-to-end validation of SPEC-056's three extensions**: it must render palette swatches in Nord's colours on Nord's canvas, *and* show a live code block highlighted in Nord, *on the refrakt documentation site whose active preset is niwaki*. The mechanism that makes this possible is the scoped-tint projection from WORK-223 — Nord is declared in the site's `theme.tints` (extending the Nord preset module), and `{% tint preset="nord" %}` wrappers scope Nord's colours to the relevant subtrees.

This is also a dogfood test: if the tint mechanism feels right authoring this page, it'll feel right for every subsequent palette import.

## Acceptance Criteria

- [x] `site/content/docs/themes/lumina/presets/nord.md` exists with frontmatter (`title`, `description`) matching the niwaki page's style
- [x] Opening paragraph explains: Nord is an *integrated* palette preset (canvas + foreground), what palette it derives from, and one-sentence attribution to the original authors. Briefly notes the contrast with niwaki's scoped-only approach
- [x] "Opt in" section shows the `refrakt.config.json` snippet to enable Nord as the *active* preset on a site (replaces niwaki / neutral default)
- [x] The site's own `refrakt.config.json` (or whichever config drives the docs site) gains a `tints.nord` entry with `extends: "@refrakt-md/lumina/presets/nord"` so the showcase mechanism works on the page
- [x] "The palette" section contains two `{% palette %}` blocks — one light, one dark — each wrapped in `{% tint preset="nord" %}` so the swatches sit on Nord's canonical canvas, not the site's niwaki/neutral canvas. Lists Nord's named hues (e.g. "Frost nord7 (type)", "Aurora nord14 (string)") with `showContrast=true` and `showA11y=true`
- [x] "Live preview" section contains a fenced code block (e.g. a TypeScript snippet exercising keyword/function/type/string/comment) wrapped in `{% tint preset="nord" %}` — the block renders highlighted in Nord while the surrounding page chrome stays in the site's active preset (niwaki). This is the visual proof the scoped-tint mechanism works
- [x] "Composing with tideline" section demonstrates `["tideline", "nord"]` as active presets — Nord's syntax + canvas on tideline's chrome
- [x] Page links to the upstream Nord site (https://www.nordtheme.com/) for the canonical palette spec
- [x] Page renders without errors on the local site (`cd site && npm run dev`)
- [x] Palette swatches and the live code block show distinct colours for `type` vs `function` (Frost-7 vs Frost-8 — the role split SPEC-056 was motivated by)
- [x] The page chrome (header, nav, body bg, surrounding prose) is *not* affected by the embedded `{% tint preset="nord" %}` blocks — they're scoped to their subtrees only. This is the proof the scope-eligibility filter is working

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

## Resolution

Completed: 2026-05-20

Branch: \`claude/spec-056-milestone-v0-14-1\`

### What was done

End-to-end validation of all three SPEC-056 extensions on a documentation page rendered on a site whose **active preset is niwaki, not Nord**:

- **\`site/content/docs/themes/lumina/presets/nord.md\`** (new) — Nord doc page with intro, opt-in snippet, two \`{% palette %}\` blocks (light + dark) carrying \`tint="nord"\`, a "Live preview" \`{% hint %}\` wrapping a TypeScript+JSX code block also carrying \`tint="nord"\`, a composing-with-tideline section, and attribution to Arctic Ice Studio & Sven Greb.
- **\`refrakt.config.json\`** — added \`sites.main.tints.nord\` with \`extends: "@refrakt-md/lumina/presets/nord"\` so the SPEC-056 scoped-tint projection generates CSS for the Nord tint.
- **\`packages/sveltekit/src/plugin.ts\`** — extended \`composeSiteTokensCss\` to (a) collect preset paths from \`site.tints[].extends\`, (b) load any preset modules not already in the active \`theme.presets\`, and (c) invoke \`generateScopedTintStylesheet(tints, presetMap)\` after the standard token stylesheet. The scoped tint CSS is appended to the same \`virtual:refrakt/site-tokens.css\` virtual module the active-preset stylesheet uses, so it ships with every page in the build.

### Authoring deviation — \`tint\` as universal attribute, not wrapper

The work item's approach section described wrapping content in \`{% tint preset="nord" %}...{% /tint %}\`. That mechanism doesn't exist — the \`tint\` rune is a *child meta-emitter* (it returns a \`data-tint-source="true"\` div carrying \`<meta>\` tags that the parent's identity transform consumes, not a wrapper that styles its own children).

The correct authoring pattern is the **universal \`tint\` attribute** (\`packages/runes/src/attribute-presets.ts\`, line 63). Every rune built with \`createContentModelSchema\` gets a \`tint\` attribute that stamps \`data-tint="<name>"\` on the rune's wrapper. So:

- \`{% palette tint="nord" %}...{% /palette %}\` stamps \`data-tint="nord"\` on the palette wrapper. Swatches inherit Nord's CSS variables.
- \`{% hint tint="nord" %}\`code block\`{% /hint %}\` stamps it on the hint wrapper. The code block inside cascades through Nord's syntax + code-surface variables.

The hint wrapper introduces a small visible chrome (border, icon) around the code block, which is acceptable given the alternative (no wrapper rune available; would need a generic \`{% box %}\` rune that doesn't exist yet). A future enhancement could ship a more neutral content-frame rune, but it's out of scope for SPEC-056.

### Verified end-to-end

- Site builds clean: \`cd site && rm -rf .svelte-kit build && npm run build\` produces 162 pages including \`build/docs/themes/lumina/presets/nord.html\`.
- HTML has 3 \`data-tint="nord"\` stamps (2 palettes + 1 hint).
- CSS bundle (\`build/_app/immutable/assets/0.*.css\`) contains 3 \`[data-tint=nord]\` rules (Vite minifies the attribute quotes):
  - \`[data-tint=nord] { --rf-syntax-keyword: #5e81ac; ... --rf-color-code-bg: #eceff4; ... }\` (light)
  - \`[data-tint=nord][data-color-scheme=dark], [data-color-scheme=dark] [data-tint=nord] { ... }\` (dark — two selectors paired for forced-scheme + page-scheme)
- The page is otherwise rendered in the site's active niwaki preset — outer body bg, surfaces, typography, and surrounding prose all stay niwaki-styled. Only the tinted subtrees pick up Nord's colours.

### Vite CSS minification note

Vite's CSS pipeline minified the attribute selectors from \`[data-tint="nord"]\` to \`[data-tint=nord]\` (legal CSS, semantically identical). This works correctly with the engine's emission since CSS attribute selectors with simple identifiers don't require quotes. Worth noting for anyone debugging by greping the build output — search without quotes.

### Files touched

- \`site/content/docs/themes/lumina/presets/nord.md\` (new)
- \`refrakt.config.json\` (\`sites.main.tints.nord\` added)
- \`packages/sveltekit/src/plugin.ts\` (composeSiteTokensCss extended to invoke generateScopedTintStylesheet)

{% /work %}
