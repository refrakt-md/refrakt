---
'@refrakt-md/marketing': minor
'@refrakt-md/lumina': minor
'@refrakt-md/skeleton': minor
'@refrakt-md/cli': minor
---

**Breaking:** `cta` and `testimonial` are now compositions (SPEC-181, WORK-703, WORK-704). The marketing plugin ships them as `runes/cta.md` and `runes/testimonial.md`, beside `hero`; the native runes, their theme config and their Lumina and skeleton stylesheets are removed.

**`cta`**
- **No `rf-cta*` classes, and `data-rune="cta"`.** The native rune rendered as `data-rune="call-to-action"`. A cta is now `<div data-rune="cta">` around a `.rf-section` at `display` prominence and a `.rf-actions`. Style `[data-prominence="display"]` and the `actions` vocabulary, or reach it through `[data-rune="cta"]`.
- **The `call-to-action` alias stays**, and resolves to the composition.
- **`--in-hero` and `--in-pricing` are gone.** A composed rune has no BEM block for a context modifier to extend. A cta inside a pricing table is left-aligned by writing `align="start"`, which the cta now accepts (`start | center | end`).
- **Two leading headings read as a headline and body** (ADR-046), where the native rune read an eyebrow and a headline. An eyebrow is a short paragraph before the headline.

**`testimonial`**
- **No `rf-testimonial*` classes.** A testimonial is a `section` with the avatar as its media and a featured `pullquote`, whose `<figcaption>` holds the attribution (`<cite>` name and source). The `review` alias stays.
- **The `Review` / `Person` / `Rating` graph is unchanged**, except that a comma attribution (`**Name**, Role`) no longer leaves the comma in `jobTitle` (BUG-019).
- **`variant` reaches the root as written.** The native rune always rendered `data-variant="card"`.
- **`parseAttribution` is no longer exported** from `@refrakt-md/marketing`.
- The fixtures for `inspect` moved to `fixtures/cta.md` and `fixtures/testimonial.md`; the editor snippets went with the plugin entries.
