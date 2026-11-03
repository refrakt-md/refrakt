---
'@refrakt-md/marketing': minor
'@refrakt-md/lumina': minor
'@refrakt-md/skeleton': minor
'@refrakt-md/cli': minor
'@refrakt-md/runes': minor
---

**Breaking:** `hero` is now a composition (SPEC-181, WORK-702). The marketing plugin ships it as `runes/hero.md`, a `section` at `marquee` prominence with an `actions` list, and the native rune, its theme config and its stylesheets are removed. It is the first rune to go live from the staging site.

- **No `rf-hero*` classes.** A hero renders as `<div data-rune="hero">` around a `.rf-section` and a `.rf-actions`. Theme CSS written against `.rf-hero`, `.rf-hero__headline`, `.rf-hero__blurb`, `.rf-hero__actions` or `.rf-hero--cover` no longer matches: style the `section` (`[data-prominence="marquee"]`) and `actions` vocabulary instead, or reach the hero through `[data-rune="hero"]`. `packages/lumina/styles/runes/hero.css` and the skeleton's `hero.css` are deleted. Context modifiers keyed on `hero` (`--in-hero`) still apply.
- **`align` takes `start | center | end`.** `left`, `right` and the deprecated `justify` are no longer accepted. `refrakt migrate hero <paths> --apply` rewrites them on `{% hero %}` tags: `left` → `start`, `right` → `end`, `justify` → `align`.
- **What it reads is unchanged otherwise.** Media and content split on `---`; `media-position`, `media-ratio`, `valign`, `collapse`, `content-place`, `height` and `aspect` behave as before. A second leading heading is now kept as body instead of being dropped (BUG-047).
- **The marketing plugin declares `runeDir: 'runes'`** and publishes `runes/` and `fixtures/`. `hero`'s gallery fixture moved to `fixtures/hero.md`; its editor snippet is gone with its plugin entry.
- **Page metadata still comes from the hero.** `extractSeo` reads the composed hero's `headline` and `blurb` slots for the OG title and description, as it read the native hero's fields; without it a hero's eyebrow became the page description.
