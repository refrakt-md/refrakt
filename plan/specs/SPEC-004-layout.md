{% spec id="SPEC-004" status="review" tags="layout, css" %}

# Layout System — Specification

Standardised layout attributes for grid and section runes, page-level breakout, showcase effects, background media
Tint Rune Specification, Community Runes Specification, Vite Plugin Specification

---

## Problem

Layout control in refrakt.md is currently fragmented. The grid rune uses `layout` for column ratios. The feature rune uses `split` and `mirror` for two-column arrangement. Other section runes have no layout control — their arrangement is entirely theme-determined. Authors who want a hero with a side-by-side layout, a testimonial with a reversed image position, or a feature section that breaks out of the content column have no consistent way to express these choices.

This creates three problems. First, authors lack control over how their content is spatially arranged. Second, each rune reinvents layout attributes independently, leading to inconsistent naming (`split` vs `layout`, `mirror` vs `reverse`). Third, themes must implement split layout separately for every section rune that supports it, duplicating CSS.

---

## Design Principles

**Standardised attributes.** The same attribute names mean the same thing across all runes that support them. `layout`, `ratio`, `align`, `gap`, `width` — each has one meaning regardless of which rune it appears on.

**Section runes own their zones.** A feature rune knows it has a content zone and a media zone. The `hr` delimiter separates them. Layout attributes control how those zones are arranged. The rune stays self-contained — all content is inside the rune tag.

**Theme interprets, author directs.** The author says `layout="split"` and `align="center"`. The theme decides the exact column widths, gap sizes, breakpoint behaviour, and visual treatment. Named presets keep authoring simple while giving themes full control over the specifics.

**Progressive enhancement.** Every layout attribute is optional. A section rune with no layout attributes renders in its default stacked arrangement. Attributes add control incrementally. A theme that doesn't support a particular attribute ignores it gracefully.

---

## Page Grid

The page uses a CSS Grid layout with named column lines that define three width tracks: `content`, `wide`, and `full`. All block-level runes are direct children of this grid.

```css
.rf-page-content > article {
  display: grid;
  grid-template-columns:
    [full-start] 1fr
    [wide-start] minmax(0, var(--rf-wide-inset, 8rem))
    [content-start] min(var(--rf-content-max, 80rem), 100% - var(--rf-content-gutter, 1.5rem) * 2)
    [content-end] minmax(0, var(--rf-wide-inset, 8rem))
    [wide-end] 1fr
    [full-end];
}

/* Default: all children sit in the content column */
.rf-page-content > article > * {
  grid-column: content;
}
```

This upgrades the current 3-column grid (`1fr | content | 1fr`) to a 5-track grid with named lines. The current `grid-column: 1 / -1` full-bleed pattern continues to work during migration. The named lines add the `wide` track and make `[data-width]` selectors possible.

### Width Attribute (base attribute, all block runes)

Every block rune accepts a `width` attribute that controls which page grid track it occupies:

| Value | Grid column | Purpose |
|---|---|---|
| `content` (default) | `content` | Standard content width |
| `wide` | `wide` | Wider than content, narrower than viewport |
| `full` | `full` | Full viewport width |

```markdoc
{% hero width="full" %}          <!-- full-bleed hero -->
{% gallery width="wide" %}       <!-- wider gallery -->
{% datatable width="content" %}  <!-- default, explicit -->
{% sandbox width="wide" %}       <!-- wider sandbox -->
```

The identity transform maps the attribute to a data attribute and BEM modifier:

```html
<section class="rf-hero rf-hero--full" data-width="full">...</section>
<section class="rf-gallery rf-gallery--wide" data-width="wide">...</section>
```

The page grid CSS handles the breakout via data attributes:

```css
.rf-page-content > article > [data-width="wide"] { grid-column: wide; }
.rf-page-content > article > [data-width="full"] { grid-column: full; }
```

For `full`-width runes, the inner content re-centres at content width. This uses the existing `padding-inline` pattern rather than adding an `__inner` wrapper — keeping DOM weight down while matching the current codebase approach:

```css
.rf-page-content > article > [data-width="full"] {
  padding-inline: max(
    var(--rf-content-gutter, 1.5rem),
    calc((100% - var(--rf-content-max, 80rem)) / 2)
  );
}
```

For `wide`-width runes, content fills the wider track naturally — no re-centering needed.

### Vite Plugin / Astro Integration

For the Vite plugin and Astro integration, the page grid CSS is part of the base stylesheet. The user applies the grid to their content wrapper via the existing `.rf-page-content` class:

```svelte
<!-- SvelteKit example -->
<main class="rf-page-content">
  <article>{@html content}</article>
</main>
```

Without the class, runes render at whatever width their container provides. The `data-width` attributes have no effect without the page grid — graceful degradation.

---

## Section Runes — Standardised Layout

### Content Zones

Section runes have at most two zones — a **content zone** and a **media zone**. The content zone contains headings, paragraphs, lists, buttons. The media zone contains images, sandboxes, embeds, showcases. The `hr` delimiter (`---`) separates them.

```markdoc
{% feature layout="split" %}

# Lightning Fast
Built on modern architecture for sub-second page loads.

- [Get Started](/start)

---

![Dashboard](/images/dashboard.png)

{% /feature %}
```

Everything above the `---` is the content zone. Everything below is the media zone. The layout attributes control how these zones are arranged.

When no `---` is present, the rune has only a content zone. Layout defaults to `stacked` and the split attributes have no effect.

**Zone naming:** Schemas emit zones with `data-name="content"` and `data-name="media"`. The engine's `autoLabel` maps these to BEM element classes (`__content`, `__media`). This standardises zone naming across all section runes — replacing the current per-rune names (`__body`/`__showcase` on Feature, implicit structure on Hero).

### Layout Attributes

| Attribute | Values | Default | Purpose |
|---|---|---|---|
| `layout` | `stacked`, `split`, `split-reverse` | `stacked` | Zone arrangement |
| `ratio` | Column ratios: `"1 1"`, `"2 1"`, `"1 2"`, `"3 2"` | `"1 1"` | Column proportions when split |
| `align` | `start`, `center`, `end` | `start` | Cross-axis alignment when split |
| `gap` | `none`, `tight`, `default`, `loose` | `default` | Space between zones |
| `width` | `content`, `wide`, `full` | `content` | Page grid track |
| `collapse` | `sm`, `md`, `lg`, `never` | theme-determined | Breakpoint where split collapses to stacked |

**`layout`** controls zone arrangement:

```markdoc
{% feature layout="stacked" %}       <!-- media above/below content (default) -->
{% feature layout="split" %}          <!-- content left, media right -->
{% feature layout="split-reverse" %}  <!-- media left, content right -->
```

**`ratio`** controls column proportions when split:

```markdoc
{% feature layout="split" ratio="2 1" %}   <!-- content is twice as wide as media -->
{% feature layout="split" ratio="1 2" %}   <!-- media is twice as wide as content -->
{% feature layout="split" ratio="3 2" %}   <!-- content 60%, media 40% -->
```

The identity transform converts space-separated numbers to `fr` units: `"2 1"` becomes `2fr 1fr`. This conversion is handled by the engine's `styles` config via a `transform` function (see Ratio Format Conversion below).

**`align`** controls vertical alignment when columns have different heights:

```markdoc
{% feature layout="split" align="center" %}  <!-- vertically centred -->
{% feature layout="split" align="start" %}   <!-- top-aligned (default) -->
{% feature layout="split" align="end" %}     <!-- bottom-aligned -->
```

Note: `align` means cross-axis alignment (vertical when split). This is distinct from text alignment, which uses the `justify` attribute on runes that support it (e.g., `{% hero justify="center" %}`).

**`collapse`** controls the responsive breakpoint:

```markdoc
{% feature layout="split" collapse="sm" %}    <!-- stays split longer, collapses on phones -->
{% feature layout="split" collapse="lg" %}    <!-- collapses early, single column on tablets -->
{% feature layout="split" collapse="never" %} <!-- never collapses -->
```

### Which Runes Support Split Layout

Section runes that have content + media zones:

| Rune | Package | Notes |
|---|---|---|
| `feature` | `@refrakt-md/marketing` | Feature showcase with text + image/demo |
| `hero` | `@refrakt-md/marketing` | Page hero with headline + media |
| `cta` | `@refrakt-md/marketing` | Call to action with text + visual |
| `testimonial` | `@refrakt-md/marketing` | Quote + avatar/photo (requires schema changes for media zone) |
| `howto` | `@refrakt-md/learning` | Instructions + demonstration |
| `character` | `@refrakt-md/storytelling` | Profile text + portrait |

Runes that do NOT support split layout (no content/media zone distinction):

`hint`, `details`, `tabs`, `accordion`, `datatable`, `chart`, `diagram`, `codegroup`, `compare`, `diff`, `budget`, `form`, `math`, `stat`, `conversation`, `embed`, `sandbox`, `toc`, `breadcrumb`, `nav`, `grid`.

These runes are content blocks or containers. They don't have a natural content/media split.

### Identity Transform

All section runes with `layout="split"` produce the same structural HTML pattern:

Input:
```markdoc
{% feature layout="split" ratio="2 1" align="center" gap="loose" width="wide" %}

# Lightning Fast
Built on modern architecture.

---

![Dashboard](/images/dashboard.png)

{% /feature %}
```

Output:
```html
<section class="rf-feature rf-feature--split rf-feature--wide"
     data-layout="split" data-width="wide" data-collapse="md"
     style="--split-ratio: 2fr 1fr; --split-align: center; --split-gap: var(--rf-spacing-xl);">
  <div class="rf-feature__content" data-name="content">
    <h2 class="rf-feature__headline">Lightning Fast</h2>
    <p>Built on modern architecture.</p>
  </div>
  <div class="rf-feature__media" data-name="media">
    <img src="/images/dashboard.png" alt="Dashboard">
  </div>
</section>
```

### Shared CSS

The split layout CSS is shared across all section runes via data attribute selectors. Themes write it once:

```css
/* Base split layout — targets any rune with data-layout="split" or "split-reverse" */
[data-layout="split"],
[data-layout="split-reverse"] {
  display: grid;
  grid-template-columns: var(--split-ratio, 1fr 1fr);
  align-items: var(--split-align, start);
  gap: var(--split-gap, var(--rf-spacing-lg));
}

/* Reverse: media on the left */
[data-layout="split-reverse"] > [data-name="content"] {
  order: 2;
}

[data-layout="split-reverse"] > [data-name="media"] {
  order: 1;
}

/* Collapse breakpoints */
@media (max-width: 640px) {
  [data-layout^="split"][data-collapse="sm"] {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  [data-layout^="split"][data-collapse="md"] {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1024px) {
  [data-layout^="split"][data-collapse="lg"] {
    grid-template-columns: 1fr;
  }
}
```

Theme developers don't implement split layout separately for feature, hero, cta, testimonial. They style the rune-specific content (feature title styling, testimonial quote styling) and the shared layout handles arrangement.

> **Note — Container Queries:** The page grid already has `container-type: inline-size` on `.rf-page-content`. Consider using container queries (`@container`) instead of media queries for collapse breakpoints — a `wide` rune has more available space than a `content` rune, and container queries would automatically adapt to the rune's actual width. This is a design choice: media queries are simpler and more widely understood; container queries are more correct. Decide explicitly during implementation.

---

## Grid Rune

The grid rune is the general-purpose layout tool for arrangements that don't map to a named section pattern. Three or more columns, arbitrary content per cell, card grids, dashboard layouts.

### Attribute Alignment

The grid's attributes align with the section rune attributes where they overlap:

| Attribute | Values | Default | Purpose |
|---|---|---|---|
| `layout` | `columns`, `auto`, `masonry` | `columns` | Grid mode |
| `ratio` | Column ratios: `"1 1"`, `"2 1"`, `"1 1 1"` | Equal columns from cell count | Column proportions |
| `gap` | `none`, `tight`, `default`, `loose` | `default` | Gap between cells |
| `align` | `start`, `center`, `end`, `stretch`, `baseline` | `stretch` | Vertical alignment of cells |
| `width` | `content`, `wide`, `full` | `content` | Page grid track |
| `collapse` | `sm`, `md`, `lg`, `never` | theme-determined | Breakpoint where columns stack |
| `stack` | `natural`, `reverse` | `natural` | Order when collapsed to single column |
| `min` | CSS length (`"250px"`) | n/a | Minimum column width (auto layout only) |

### Layout Modes

**`columns` (default):** Fixed column layout from `ratio`. The number of `hr` delimiters determines the number of cells. `ratio` controls proportions. This is the current grid behaviour with a renamed attribute.

```markdoc
{% grid layout="columns" ratio="2 1" gap="loose" %}

Main content area with more space.

---

Sidebar with less space.

{% /grid %}
```

If `ratio` is omitted, columns are equal width based on cell count:

```markdoc
{% grid %}

Column one.

---

Column two.

---

Column three.

{% /grid %}
```

Three cells, three equal columns. Same as current behaviour.

**`auto`:** Responsive auto-fill grid. Columns wrap based on available space and minimum width. The number of columns is not fixed — it adapts to the viewport.

```markdoc
{% grid layout="auto" min="280px" gap="default" %}

---

Card one.

---

Card two.

---

Card three.

---

Card four.

---

Card five.

{% /grid %}
```

Produces `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`. Five cards might render as three columns on desktop, two on tablet, one on mobile — all without explicit breakpoints.

**`masonry`:** Masonry layout where items of varying height pack tightly. Uses CSS `grid-template-rows: masonry` where supported, falls back to standard grid where not.

```markdoc
{% grid layout="masonry" ratio="1 1 1" gap="default" %}

---

Short card.

---

Tall card with more content that takes up more vertical space.

---

Medium card.

---

Another short card.

{% /grid %}
```

> **Known limitation:** CSS masonry is currently only supported in Firefox (behind a flag) and Safari Technology Preview. The fallback is standard grid layout — items align to row tracks, leaving vertical gaps between shorter items. Consider deferring masonry to a later phase, or implement it as progressive enhancement with an explicit note that it degrades to standard grid.

### Identity Transform

Input:
```markdoc
{% grid ratio="2 1" gap="loose" align="center" width="wide" %}

Main content.

---

Sidebar content.

{% /grid %}
```

Output:
```html
<section class="rf-grid rf-grid--wide"
     data-layout="columns" data-width="wide" data-collapse="md"
     style="--grid-ratio: 2fr 1fr; --grid-gap: var(--rf-spacing-xl); --grid-align: center;">
  <div class="rf-grid__cell" data-name="cell">
    <p>Main content.</p>
  </div>
  <div class="rf-grid__cell" data-name="cell">
    <p>Sidebar content.</p>
  </div>
</section>
```

Auto layout:
```html
<section class="rf-grid rf-grid--auto"
     data-layout="auto"
     style="--grid-min: 280px; --grid-gap: var(--rf-spacing-md);">
  <div class="rf-grid__cell" data-name="cell">...</div>
  <div class="rf-grid__cell" data-name="cell">...</div>
  <div class="rf-grid__cell" data-name="cell">...</div>
</section>
```

### CSS

```css
/* Columns mode (default) */
.rf-grid {
  display: grid;
  grid-template-columns: var(--grid-ratio);
  gap: var(--grid-gap, var(--rf-spacing-md));
  align-items: var(--grid-align, stretch);
}

/* Auto mode */
.rf-grid[data-layout="auto"] {
  grid-template-columns: repeat(auto-fill, minmax(var(--grid-min, 250px), 1fr));
}

/* Masonry mode — progressive enhancement */
.rf-grid[data-layout="masonry"] {
  grid-template-columns: var(--grid-ratio);
  grid-template-rows: masonry;
}

/* Collapse */
@media (max-width: 640px) {
  .rf-grid[data-collapse="sm"] { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .rf-grid[data-collapse="md"] { grid-template-columns: 1fr; }
}

@media (max-width: 1024px) {
  .rf-grid[data-collapse="lg"] { grid-template-columns: 1fr; }
}

/* Stack order when collapsed */
.rf-grid[data-stack="reverse"] > .rf-grid__cell:last-child {
  order: -1;
}
```

---

## Showcase Rune

The showcase rune is a media effect wrapper for content inside section runes. It handles shadows, displacement (bleed), and aspect ratio enforcement. It composes with the existing `mockup` rune — showcase adds presentation effects; mockup adds device chrome.

### Attributes

| Attribute | Values | Default | Purpose |
|---|---|---|---|
| `shadow` | `none`, `soft`, `hard`, `elevated` | `none` | Drop shadow treatment |
| `bleed` | `none`, `top`, `bottom`, `both` | `none` | Displacement beyond container boundary |
| `offset` | `sm`, `md`, `lg` or CSS value | `md` | Displacement amount when bleeding |
| `aspect` | Ratio value (`16/9`, `1/1`, `4/3`) | n/a | Enforce aspect ratio on content |

Showcase is a **core rune** (not a community package rune) since it's a generic presentation utility used across packages.

### Basic Usage

A showcase without special attributes marks its content as presentational media — the theme can style it differently from a plain image in prose:

```markdoc
{% showcase %}
![Hero image](/images/hero.jpg)
{% /showcase %}
```

### Shadows

```markdoc
{% showcase shadow="soft" %}
![Dashboard](/images/dashboard.png)
{% /showcase %}

{% showcase shadow="elevated" %}
![App](/images/app.png)
{% /showcase %}
```

### Composing with Mockup

Showcase wraps mockup for device frames with presentation effects. Showcase handles bleed, shadow, aspect; mockup handles device chrome:

```markdoc
{% showcase shadow="elevated" bleed="top" offset="lg" %}
{% mockup device="browser" %}
![Dashboard](/images/dashboard.png)
{% /mockup %}
{% /showcase %}

{% showcase shadow="soft" aspect="16/9" %}
{% mockup device="phone" %}
![Mobile app](/images/mobile.png)
{% /mockup %}
{% /showcase %}
```

### Displacement

The showcase extends beyond its parent container's boundary for a dramatic visual effect. Commonly used inside tinted section runes where the media should overlap into the adjacent section.

```markdoc
{% feature layout="split" width="wide" %}

{% tint mode="dark" %}
- background: #1a1a2e
- accent: #e94560
{% /tint %}

# Lightning Fast
Built on modern architecture for sub-second page loads.

---

{% showcase bleed="top" offset="lg" shadow="elevated" %}
{% mockup device="browser" %}
![Dashboard](/images/dashboard.png)
{% /mockup %}
{% /showcase %}

{% /feature %}
```

The dashboard screenshot in a browser frame extends above the dark feature section, overlapping into the section above with an elevated shadow. The content re-centres within the feature section; the media breaks out.

### Wrapping Other Runes

The showcase can wrap any content, not just images or mockups:

```markdoc
{% showcase shadow="soft" %}
{% sandbox framework="tailwind" %}
```html
<div class="p-6 bg-white rounded-lg">
  <h2 class="text-xl font-bold">Hello World</h2>
</div>
```
{% /sandbox %}
{% /showcase %}

{% showcase bleed="bottom" %}
{% embed %}https://www.youtube.com/watch?v=...{% /embed %}
{% /showcase %}
```

### Aspect Ratio

The showcase accepts an `aspect` attribute that enforces a ratio on its content:

```markdoc
{% showcase aspect="16/9" %}
![Dashboard](/images/dashboard.png)
{% /showcase %}

{% showcase aspect="1/1" %}
![Team member](/images/team-sarah.jpg)
{% /showcase %}
```

The image is cropped to fit the ratio using `object-fit: cover`. The showcase container maintains the ratio regardless of content.

Common ratios:

| Value | Proportion | Use case |
|---|---|---|
| `1/1` | Square | Avatars, team photos, thumbnails |
| `4/3` | Classic | Presentations, tablet screenshots |
| `3/2` | Photo | Photography, print-like layouts |
| `16/9` | Widescreen | Videos, hero images, app screenshots |
| `21/9` | Ultrawide | Cinematic, panoramic headers |

### Identity Transform

```html
<div class="rf-showcase rf-showcase--bleed-top rf-showcase--shadow-elevated"
     data-bleed="top" data-shadow="elevated"
     style="--showcase-offset: var(--rf-spacing-lg);">
  <div class="rf-showcase__viewport" data-name="viewport">
    <img src="/images/dashboard.png" alt="Dashboard">
  </div>
</div>
```

With aspect ratio:
```html
<div class="rf-showcase rf-showcase--aspect"
     data-aspect="16/9"
     style="--aspect: 16/9;">
  <div class="rf-showcase__viewport" data-name="viewport">
    <img src="/images/dashboard.png" alt="Dashboard">
  </div>
</div>
```

### CSS

```css
/* Base showcase */
.rf-showcase {
  position: relative;
}

/* Bleed displacement */
.rf-showcase[data-bleed="top"] {
  margin-top: calc(-1 * var(--showcase-offset, 2rem));
  position: relative;
  z-index: 1;
}

.rf-showcase[data-bleed="bottom"] {
  margin-bottom: calc(-1 * var(--showcase-offset, 2rem));
  position: relative;
  z-index: 1;
}

.rf-showcase[data-bleed="both"] {
  margin-top: calc(-1 * var(--showcase-offset, 2rem));
  margin-bottom: calc(-1 * var(--showcase-offset, 2rem));
  position: relative;
  z-index: 1;
}

/* Parent sections need overflow visible for bleed to work */
:has(> .rf-showcase[data-bleed]) {
  overflow: visible;
}

/* Adjacent section compensation */
:has(.rf-showcase[data-bleed="bottom"]) + * {
  padding-top: calc(var(--showcase-offset, 2rem) + var(--rf-spacing-section));
}

*:has(+ :has(.rf-showcase[data-bleed="top"])) {
  padding-bottom: calc(var(--showcase-offset, 2rem) + var(--rf-spacing-section));
}

/* Shadow presets */
.rf-showcase[data-shadow="soft"] {
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1));
}

.rf-showcase[data-shadow="hard"] {
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.25));
}

.rf-showcase[data-shadow="elevated"] {
  filter: drop-shadow(0 12px 40px rgba(0, 0, 0, 0.2));
}

/* Aspect ratio */
.rf-showcase--aspect .rf-showcase__viewport {
  aspect-ratio: var(--aspect);
  overflow: hidden;
}

.rf-showcase--aspect .rf-showcase__viewport > img,
.rf-showcase--aspect .rf-showcase__viewport > video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

### Responsive Behaviour

On mobile viewports, displacement collapses. The showcase renders inline without bleed, preserving the shadow but removing the overlap:

```css
@media (max-width: 768px) {
  .rf-showcase[data-bleed] {
    margin-top: 0;
    margin-bottom: 0;
  }
}
```

---

## Aspect Ratio on Grid

When applied to the grid rune, `aspect` enforces a uniform ratio on all cells. Useful for image galleries and card grids:

```markdoc
{% grid layout="auto" min="200px" aspect="1/1" %}

---

![](/images/team-1.jpg)

---

![](/images/team-2.jpg)

---

![](/images/team-3.jpg)

---

![](/images/team-4.jpg)

{% /grid %}
```

All cells are square. Images crop to fit. The grid stays visually uniform regardless of source image dimensions.

### Identity Transform

```html
<section class="rf-grid rf-grid--auto rf-grid--aspect"
     data-layout="auto"
     style="--grid-min: 200px; --aspect: 1/1;">
  <div class="rf-grid__cell" data-name="cell">
    <img src="/images/team-1.jpg">
  </div>
  <div class="rf-grid__cell" data-name="cell">
    <img src="/images/team-2.jpg">
  </div>
</section>
```

### CSS

```css
.rf-grid--aspect .rf-grid__cell {
  aspect-ratio: var(--aspect);
  overflow: hidden;
}

.rf-grid--aspect .rf-grid__cell > img,
.rf-grid--aspect .rf-grid__cell > video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

---

## Gap Presets

Named gap presets are shared across grid and section runes. They map to spacing design tokens defined by the theme:

| Preset | Token | Default value | Use case |
|---|---|---|---|
| `none` | — | `0` | Elements flush against each other |
| `tight` | `--rf-spacing-sm` | `0.5rem` | Compact arrangements, related items |
| `default` | `--rf-spacing-md` | `1.5rem` | Standard spacing |
| `loose` | `--rf-spacing-xl` | `3rem` | Breathing room, editorial layouts |

Themes define the actual spacing values through design tokens (see Spacing Tokens below). The presets provide a vocabulary the author and theme share.

An author can also pass a CSS value directly for precise control:

```markdoc
{% grid ratio="1 1" gap="2.5rem" %}
```

The identity transform passes it through as the custom property value. Named presets are preferred for consistency; direct values are the escape hatch.

---

## Collapse Breakpoints

| Preset | Max-width | Roughly corresponds to |
|---|---|---|
| `sm` | `640px` | Phones only |
| `md` | `768px` | Phones and small tablets |
| `lg` | `1024px` | Phones, tablets, small laptops |
| `never` | n/a | Never collapses |

When omitted, the theme determines the default collapse breakpoint. Most themes would default to `md` — columns collapse on tablets and below.

The `collapse` attribute lets the author override the theme default when they know their content needs it. A grid of large images should stay columnar longer (`collapse="sm"`). A grid of text-heavy cards should collapse earlier (`collapse="lg"`).

---

## Section Spacing

Layout attributes control spacing *within* runes (gap between grid cells, between split zones). Section spacing controls the space *between* runes on the page — the vertical rhythm.

Without author control, every section gets the same vertical margin from the theme. But page rhythm varies: a landing page might want features stacking tightly with generous breathing room before a testimonial. A blog post might want a diagram flush against its caption with space before the next heading.

### Spacing Attribute (base attribute, all block runes)

Every block rune accepts a `spacing` attribute that controls its vertical margin relative to its neighbours:

| Value | Behaviour | Use case |
|---|---|---|
| `default` | Theme-determined section margin | Normal content flow |
| `flush` | Zero margin above | Sections that visually connect |
| `tight` | Reduced margin above | Related sections that should feel grouped |
| `loose` | Increased margin above | Separation, breathing room |
| `breathe` | Large margin above and below | Isolated section floating in space |

```markdoc
{% hero width="full" %}
# Welcome
{% /hero %}

{% feature layout="split" spacing="flush" %}
...
{% /feature %}

{% feature layout="split-reverse" spacing="flush" %}
...
{% /feature %}

{% feature layout="split" spacing="flush" %}
...
{% /feature %}

{% testimonial spacing="breathe" %}
> This platform changed how our team works.
**Sarah Chen** — VP Engineering
{% /testimonial %}

{% cta width="wide" spacing="loose" %}
# Ready to get started?
{% /cta %}
```

The three feature sections stack flush — no gap between them, creating a continuous band of alternating content. The testimonial floats with generous space above and below. The CTA has moderate extra space above.

### Identity Transform

The spacing attribute maps to a data attribute:

```html
<section class="rf-feature rf-feature--split" data-layout="split" data-spacing="flush">...</section>
<article class="rf-testimonial" data-spacing="breathe">...</article>
```

### CSS

```css
/* Section spacing — applied to all runes via page grid */
.rf-page-content > article > * {
  margin-top: var(--rf-spacing-section, 4rem);
}

.rf-page-content > article > *:first-child {
  margin-top: 0;
}

.rf-page-content > article > [data-spacing="flush"] {
  margin-top: 0;
}

.rf-page-content > article > [data-spacing="tight"] {
  margin-top: var(--rf-spacing-section-tight, 1.5rem);
}

.rf-page-content > article > [data-spacing="loose"] {
  margin-top: var(--rf-spacing-section-loose, 6rem);
}

.rf-page-content > article > [data-spacing="breathe"] {
  margin-top: var(--rf-spacing-section-breathe, 8rem);
  margin-bottom: var(--rf-spacing-section-breathe, 8rem);
}
```

Themes define the actual spacing values through design tokens. The presets provide a vocabulary the author and theme share — the author says "breathe" and the theme determines that 8rem (or 6rem, or 10rem) is the right amount for its design language.

---

## Background Rune

The `bg` rune is a directive — like `tint` — that modifies its parent section's background. It handles background images, videos, colour overlays, and blur effects. Where `tint` controls foreground colours, `bg` controls the backdrop.

### Authoring

The `bg` rune must be a child of a block rune, like `tint`. It produces no visible output — it modifies the parent container's background layer.

**Background image:**

```markdoc
{% hero width="full" %}
{% bg src="/images/mountains.jpg" %}

# Adventure Awaits
Explore the world's most beautiful trails.
{% /hero %}
```

**Background image with overlay for text legibility:**

```markdoc
{% hero width="full" %}
{% bg src="/images/mountains.jpg" overlay="dark" %}

# Adventure Awaits
Explore the world's most beautiful trails.
{% /hero %}
```

**Background image with blur:**

```markdoc
{% hero width="full" %}
{% bg src="/images/mountains.jpg" overlay="dark" blur="sm" %}

# Adventure Awaits
{% /hero %}
```

**Background video:**

```markdoc
{% hero width="full" %}
{% bg video="/videos/timelapse.mp4" overlay="dark" %}

# Watch the World Move
{% /hero %}
```

**Combining bg with tint:**

```markdoc
{% hero width="full" %}
{% bg src="/images/mountains.jpg" overlay="dark" blur="sm" %}
{% tint mode="dark" %}
- accent: #e94560
{% /tint %}

# Adventure Awaits
{% /hero %}
```

The `bg` rune sets the background image with a dark overlay. The `tint` rune overrides the foreground accent colour. They compose — `bg` handles the backdrop, `tint` handles the content colours.

### Attributes

| Attribute | Values | Default | Purpose |
|---|---|---|---|
| `src` | Image path | — | Background image source |
| `video` | Video path | — | Background video source (muted, looping, autoplay) |
| `overlay` | `none`, `light`, `dark`, colour value | `none` | Semi-transparent colour overlay on top of image/video |
| `blur` | `none`, `sm`, `md`, `lg` | `none` | Backdrop blur applied to the image/video |
| `position` | CSS background-position value | `center` | Image focal point (`top`, `center`, `bottom`, `left`, `right`) |
| `fit` | `cover`, `contain` | `cover` | How the image fills the container |
| `opacity` | `0` to `1` | `1` | Background image/video opacity |
| `fixed` | boolean | `false` | Parallax-style fixed background that doesn't scroll with content |

> **Known limitation:** `background-attachment: fixed` is silently ignored on iOS Safari and most mobile browsers. The background renders as `scroll` on mobile regardless of the `fixed` attribute. Consider deferring `fixed` to a later phase or documenting it as a desktop-only effect.

### Overlay Presets

| Value | Effect |
|---|---|
| `none` | No overlay |
| `light` | Semi-transparent white (`rgba(255, 255, 255, 0.6)`) |
| `dark` | Semi-transparent black (`rgba(0, 0, 0, 0.5)`) |
| Colour value | Custom overlay colour (`#1a1a2e80`, `rgba(26, 26, 46, 0.7)`) |

The overlay ensures text remains legible over busy background images. `dark` is the most common — a darkened background with light text on top. `light` is for dark images where the text should stay dark.

### Identity Transform

Input:
```markdoc
{% hero width="full" %}
{% bg src="/images/mountains.jpg" overlay="dark" blur="sm" position="top" %}
# Adventure Awaits
{% /hero %}
```

Output:
```html
<section class="rf-hero rf-hero--full rf-hero--has-bg"
     data-width="full">
  <div class="rf-hero__bg" data-name="bg"
       style="--bg-image: url(/images/mountains.jpg); --bg-position: top; --bg-blur: 4px;">
    <div class="rf-hero__bg-overlay rf-hero__bg-overlay--dark"></div>
  </div>
  <div class="rf-hero__inner">
    <h1 class="rf-hero__headline">Adventure Awaits</h1>
  </div>
</section>
```

Video background:
```html
<section class="rf-hero rf-hero--full rf-hero--has-bg"
     data-width="full">
  <div class="rf-hero__bg" data-name="bg">
    <video class="rf-hero__bg-video" autoplay muted loop playsinline
           src="/videos/timelapse.mp4"></video>
    <div class="rf-hero__bg-overlay rf-hero__bg-overlay--dark"></div>
  </div>
  <div class="rf-hero__inner">
    <h1 class="rf-hero__headline">Watch the World Move</h1>
  </div>
</section>
```

The `bg` rune is consumed during the identity transform — like `tint`, it emits meta tags that the engine reads and converts into structural elements. Its attributes produce a background layer element (`__bg`) that sits behind the content layer (`__inner`). The overlay is a separate element inside the background layer for independent opacity control.

### CSS

```css
/* Background container — position relative for the absolute bg layer */
[data-bg] {
  position: relative;
}

/* Background layer — clips within its own bounds, NOT on the parent.
   This avoids conflicting with showcase bleed which needs overflow: visible. */
[data-name="bg"] {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
}

/* Content layer sits above background */
[data-bg] > :not([data-name="bg"]) {
  position: relative;
  z-index: 1;
}

/* Background image */
[data-name="bg"] {
  background-image: var(--bg-image);
  background-size: var(--bg-fit, cover);
  background-position: var(--bg-position, center);
  background-repeat: no-repeat;
  filter: blur(var(--bg-blur, 0));
  opacity: var(--bg-opacity, 1);
}

/* Fixed (parallax) background — desktop only, see known limitations */
[data-name="bg"][data-bg-fixed] {
  background-attachment: fixed;
}

/* Background video */
.rf-hero__bg-video,
.rf-feature__bg-video,
.rf-cta__bg-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: var(--bg-position, center);
  filter: blur(var(--bg-blur, 0));
  opacity: var(--bg-opacity, 1);
}

/* Overlay presets */
[data-name="bg"] > [class*="bg-overlay"] {
  position: absolute;
  inset: 0;
}

[class*="bg-overlay--dark"] {
  background: rgba(0, 0, 0, 0.5);
}

[class*="bg-overlay--light"] {
  background: rgba(255, 255, 255, 0.6);
}

/* Blur presets — applied via --bg-blur custom property */
/* sm: 4px, md: 8px, lg: 16px */
```

### Accessibility

Background videos autoplay muted with no controls — they're decorative, not content. If the video contains meaningful content, it should be in the content zone, not the background.

The overlay ensures sufficient contrast between background media and foreground text. The inspector could audit contrast ratios between the overlay colour and the section's text colour, similar to tint contrast checking.

Users who prefer reduced motion should see a static frame instead of a looping video:

```css
@media (prefers-reduced-motion: reduce) {
  [data-name="bg"] video {
    animation: none;
  }
}
```

The behaviour script pauses background videos when `prefers-reduced-motion: reduce` is active:

```javascript
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('[data-name="bg"] video').forEach(video => {
    video.pause();
    video.currentTime = 0;
  });
}
```

### Which Runes Support bg

Any block rune can technically have a background, but it's most commonly used on section runes:

| Rune | Package | Typical use |
|---|---|---|
| `hero` | `@refrakt-md/marketing` | Hero with background image/video |
| `cta` | `@refrakt-md/marketing` | CTA with atmospheric background |
| `feature` | `@refrakt-md/marketing` | Feature section with subtle background texture |
| `testimonial` | `@refrakt-md/marketing` | Testimonial with blurred background photo |
| `grid` | core | Grid section with a unifying background |

The `bg` rune on a non-section rune (like `hint` or `details`) is valid but unusual. The identity transform handles it the same way — inserting a background layer behind the content.

---

## Spacing Tokens

The Lumina theme currently has no spacing design tokens — spacing is hardcoded at point of use. This spec requires standardised spacing tokens in `packages/lumina/tokens/base.css`:

```css
:root {
  --rf-spacing-xs: 0.25rem;
  --rf-spacing-sm: 0.5rem;
  --rf-spacing-md: 1.5rem;
  --rf-spacing-lg: 2rem;
  --rf-spacing-xl: 3rem;
  --rf-spacing-2xl: 4rem;

  /* Section spacing tokens */
  --rf-spacing-section: 4rem;
  --rf-spacing-section-tight: 1.5rem;
  --rf-spacing-section-loose: 6rem;
  --rf-spacing-section-breathe: 8rem;
}
```

Gap presets map to these tokens. Section spacing presets reference the section-specific tokens. Themes override these values to control the overall spacing rhythm.

---

## Ratio Format Conversion

The `ratio` attribute uses a space-separated format for authoring simplicity: `"2 1"`, `"1 1 1"`, `"3 2"`. The identity transform converts these to CSS `fr` units: `"2 1"` → `"2fr 1fr"`.

This conversion is handled in the engine's `styles` config. The `styles` type needs extending to support a `transform` function:

```typescript
// In packages/transform/src/types.ts
styles?: Record<string, string | {
  prop: string;
  template?: string;
  transform?: (value: string) => string;
}>;
```

Usage in config:
```typescript
// Section rune shared config
layout: { source: 'meta' },
ratio: { source: 'meta', default: '1 1' },

// styles
ratio: {
  prop: '--split-ratio',
  transform: (v) => v.split(/\s+/).map(n => `${n}fr`).join(' ')
}
```

The grid rune uses the same pattern with `--grid-ratio`.

---

## Composing Layout, Tint, Background, and Showcase

All four systems compose naturally on the same rune:

```markdoc
{% feature layout="split" ratio="3 2" align="center" width="wide" spacing="loose" %}

{% bg src="/images/dark-texture.jpg" overlay="dark" blur="sm" %}
{% tint mode="dark" %}
- accent: #e94560
{% /tint %}

# Lightning Fast
Built on modern architecture for sub-second page loads.

- [Get Started](/start)
- [View Demo](/demo)

---

{% showcase bleed="top" offset="lg" shadow="elevated" %}
{% mockup device="browser" %}
![Dashboard](/images/dashboard.png)
{% /mockup %}
{% /showcase %}

{% /feature %}
```

This produces a wide feature section with extra spacing above, a blurred dark background image, dark colour scheme with a custom accent, content on the left (60%) vertically centred against a browser-framed dashboard screenshot on the right (40%) that bleeds above the section boundary. Five systems, one rune, no CSS.

Each system operates through its own layer:

| System | Layer | Controls |
|---|---|---|
| `spacing` | Page grid margins | Vertical rhythm between sections |
| `width` | Page grid column | How wide the section extends |
| `bg` | Background layer (z-index: 0) | Image, video, overlay, blur behind content |
| `tint` | Custom properties on container | Foreground colours and colour scheme |
| `layout` | Content arrangement | Split/stacked zones, ratio, alignment |
| `showcase` | Media zone presentation | Shadows, displacement, aspect ratio |
| `mockup` | Device chrome (inside showcase) | Browser, phone, tablet frames |

The identity transform merges attributes from all systems onto the container:

```html
<section class="rf-feature rf-feature--split rf-feature--tinted rf-feature--wide rf-feature--has-bg"
     data-layout="split" data-tint="custom" data-color-scheme="dark" data-width="wide" data-collapse="md" data-spacing="loose"
     style="--split-ratio: 3fr 2fr; --split-align: center; --split-gap: var(--rf-spacing-lg); --tint-accent:#e94560;">
  <div class="rf-feature__bg" data-name="bg"
       style="--bg-image: url(/images/dark-texture.jpg); --bg-blur: 4px;">
    <div class="rf-feature__bg-overlay rf-feature__bg-overlay--dark"></div>
  </div>
  <div class="rf-feature__content" data-name="content">
    <h2 class="rf-feature__headline">Lightning Fast</h2>
    <p>Built on modern architecture for sub-second page loads.</p>
    <div class="rf-feature__actions">
      <a href="/start">Get Started</a>
      <a href="/demo">View Demo</a>
    </div>
  </div>
  <div class="rf-feature__media" data-name="media">
    <div class="rf-showcase rf-showcase--bleed-top rf-showcase--shadow-elevated"
         data-bleed="top" data-shadow="elevated"
         style="--showcase-offset: var(--rf-spacing-lg);">
      <div class="rf-showcase__viewport" data-name="viewport">
        <div class="rf-mockup rf-mockup--browser" data-device="browser">
          <!-- mockup chrome structure -->
          <div class="rf-mockup__viewport" data-name="viewport">
            <img src="/images/dashboard.png" alt="Dashboard">
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
```

No conflicts between systems. Layout handles spatial arrangement. Tint handles colour context. Background handles the backdrop (clipping within its own `__bg` element, not the parent — so showcase bleed works). Showcase handles media presentation effects. Mockup handles device frames. Spacing handles vertical rhythm. Each operates through its own CSS custom properties, data attributes, and structural HTML elements.

---

## Migration

### Grid Rune

The `layout` attribute on the grid rune currently specifies column ratios (`layout="2 1"`). This changes to `ratio`:

| Before | After |
|---|---|
| `{% grid layout="2 1" %}` | `{% grid ratio="2 1" %}` |
| `{% grid layout="1 1 1" %}` | `{% grid ratio="1 1 1" %}` |

The old `layout` attribute is accepted as an alias for `ratio` during a deprecation period, with a build warning encouraging migration.

### Feature Rune

The `split` and `mirror` attributes are replaced by the standardised `layout` attribute:

| Before | After |
|---|---|
| `{% feature split %}` | `{% feature layout="split" %}` |
| `{% feature split mirror %}` | `{% feature layout="split-reverse" %}` |

Both old attributes are accepted during a deprecation period.

The `align` attribute (text alignment) is renamed to `justify`:

| Before | After |
|---|---|
| `{% feature align="center" %}` | `{% feature justify="center" %}` |
| `{% feature align="left" %}` | `{% feature justify="left" %}` |

The old `align` attribute is accepted as a deprecated alias for `justify` during a transition period. The `align` attribute is repurposed for cross-axis alignment in split layout.

### Hero Rune

The `align` attribute (text alignment) is renamed to `justify`, same as Feature:

| Before | After |
|---|---|
| `{% hero align="center" %}` | `{% hero justify="center" %}` |
| `{% hero align="left" %}` | `{% hero justify="left" %}` |

### Testimonial Rune

The `layout` attribute (visual variant) is renamed to `variant`:

| Before | After |
|---|---|
| `{% testimonial layout="card" %}` | `{% testimonial variant="card" %}` |
| `{% testimonial layout="inline" %}` | `{% testimonial variant="inline" %}` |

The old `layout` attribute is accepted as a deprecated alias for `variant` during a transition period. The `layout` attribute is repurposed for zone arrangement (`stacked`, `split`, `split-reverse`).

Note: Testimonial currently extracts avatar from inline content — supporting `layout="split"` with a dedicated media zone requires schema changes to support `---` delimiter splitting.

### Other Section Runes

Section runes that previously had no layout control gain the standardised attributes. This is additive — no migration needed. Authors can start using `layout="split"` on heroes, CTAs, etc. immediately.

---

## Implementation Phasing

This spec covers a large surface area. Suggested implementation order:

### Phase 1 — Foundation

- Spacing tokens in `packages/lumina/tokens/base.css`
- 5-track page grid with named column lines (upgrading current 3-column)
- `width` attribute on block runes (`content`, `wide`, `full`)
- `spacing` attribute on block runes
- Migrate existing hardcoded full-bleed CSS to use `[data-width]` selectors

### Phase 2 — Split Layout

- Rename `align` → `justify` on Feature/Hero (with deprecation alias)
- Rename `layout` → `variant` on Testimonial (with deprecation alias)
- Extend engine `styles` config to support `transform` functions
- Standardised `layout`, `ratio`, `align`, `gap`, `collapse` attributes
- Shared split layout CSS via `[data-layout]` selectors
- Zone naming standardisation (`__content`, `__media`) in schemas
- Grid rune `layout` rename from ratios to mode; `ratio` attribute

### Phase 3 — Showcase + Background

- Showcase rune (core) — bleed, shadow, aspect
- `bg` directive rune — background images, video, overlay, blur
- Compose with existing `tint` and `mockup` systems
- Integration testing of composed examples

### Phase 4 — Grid Enhancements

- Grid `auto` mode with `min` attribute
- Grid `masonry` mode (progressive enhancement — degrades to standard grid)
- Grid `aspect` attribute
- Grid `stack` attribute for collapsed order

{% /spec %}
