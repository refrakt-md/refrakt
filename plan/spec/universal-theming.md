{% spec id="SPEC-025" status="draft" tags="transform, themes, css, dimensions" %}

# Universal Theming Dimensions

> Cross-rune semantic data attributes — surface, density, section anatomy, interactive state, media slots, and checklist — so themes can style every rune generically with ~46 CSS rules instead of per-rune overrides. Builds on the metadata system (SPEC-024) to complete the nine-dimension universal theming model.

---

## Problem

Theme development is expensive. A theme supporting 30+ runes needs hundreds of per-rune CSS rules. A recipe card, a character card, a work item card, and an event card all need the same container treatment (background, border, radius, padding) but the theme author writes it four times because each has a different BEM class. An accordion panel and a details block both need the same open/closed transition but are styled independently.

Every new rune — from official packages or the community — requires new theme CSS. A `@refrakt-community/wine` package releases a tasting rune. Every theme needs updating. If the theme author hasn’t written rules for `.rune-wine-tasting`, it renders unstyled.

The metadata system (SPEC-024) solved this for badges — three dimensions, ~18 rules, every badge styled. This specification extends the same principle to the rest of the rune: containers, anatomy, density, interactivity, and media.

---

## Design Principles

**Semantic data attributes.** The identity transform emits `data-*` attributes that describe what something is, not how it should look. The theme maps semantics to visuals. The rune config declares semantics.

**Generic rules, specific overrides.** A theme’s generic rules (targeting `data-*` attributes) handle the baseline for every rune. Per-rune BEM rules override when a specific rune needs special treatment. The generic layer eliminates the need for most per-rune CSS.

**Additive and incremental.** The data attributes don’t change existing BEM classes. Themes that don’t use the generic system continue working. Runes can be migrated one at a time.

**Community-proof.** A community package rune that declares its dimensions gets themed automatically by any theme that implements the generic rules. No per-rune CSS contribution needed from theme authors.

---

## Dimensions

### Overview

|Dimension|Attribute     |Values                                                        |Controls                |Declared by          |
|-------|----------|--------------------------------------|----------------|-------------|
|Density  |`data-density`|`full`, `compact`, `minimal`                                  |Spacing and detail level|Rune config + context|
|Section  |`data-section`|`header`, `title`, `description`, `body`, `footer`            |Structural anatomy      |Rune config          |
|State    |`data-state`  |`open`, `closed`, `active`, `inactive`, `selected`, `disabled`|Interactive states      |Behaviour script     |
|Media    |`data-media`  |`portrait`, `cover`, `thumbnail`, `hero`                      |Image treatment         |Rune config          |
|Checklist|`data-checked`|`checked`, `unchecked`, `active`, `skipped`                   |Checkbox list items     |Content detection    |
|Surface  |(class-based) |`card`, `inline`, `banner`, `inset`                           |Container treatment     |**Theme only**       |

Combined with the metadata system’s three dimensions (`data-meta-type`, `data-meta-sentiment`, `data-meta-rank`), the full set is nine dimensions covering every visual aspect of rune rendering.

**Note on surface:** Surface is deliberately excluded from the rune config. Which runes render as cards, banners, or inline elements is a visual design decision that belongs to the theme, not the rune. A minimal theme might render recipes inline. A dashboard theme might render everything as cards. The rune doesn’t know or care — it declares its structure (sections, media, metadata), and the theme decides the container treatment. See the Surface section for how themes assign surfaces.

---

## Surface

Controls the container treatment — how the rune visually separates from its surroundings. **Surface is owned entirely by the theme.** The rune config does not declare a surface. The theme decides which runes are cards, which are inline, which are banners.

### Values

|Value   |Treatment                                             |Typical use                                     |
|------|----------------------------------|------------------------------|
|`card`  |Elevated container with background, border, and radius|Recipe, character, work item, testimonial, event|
|`inline`|No visual boundary — flows with surrounding prose     |Hint, details, sidenote, conversation message   |
|`banner`|Full-width strip with background                      |Hero, CTA, feature section                      |
|`inset` |Recessed container with muted background, no border   |Code block, blockquote, exercise prompt         |

### Why Theme-Owned

A rune declaring `surface: 'card'` would impose a visual opinion that themes must fight against. A minimal theme that wants recipes to flow inline would have to override the card treatment. A magazine theme that wants characters as full-width banners would have to undo the card default.

The rune knows what it *is* — a recipe, a character, a work item. The theme knows how to *present* it. Surface is presentation.

Compare with the other dimensions: a recipe *has* a header section and a body section (structural fact). A recipe’s difficulty *is* a categorical metadata field (semantic fact). Whether the recipe renders as a card or inline is a design choice that varies between themes.

### Theme Implementation

The theme defines surface styles once, then assigns runes to surfaces:

```css
/* === Surface definitions (written once) === */

/* Card: elevated container */
.surface-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md, 0.5rem);
  padding: var(--rune-padding, var(--spacing-md));
}

/* Inline: no boundary */
.surface-inline {
  padding: var(--rune-padding, var(--spacing-sm)) 0;
}

/* Banner: full-width strip */
.surface-banner {
  background: var(--color-surface);
  padding: var(--rune-padding, var(--spacing-xl)) 0;
}

/* Inset: recessed area */
.surface-inset {
  background: var(--color-bg-muted, color-mix(in oklch, var(--color-bg) 95%, black));
  border-radius: var(--radius-md, 0.5rem);
  padding: var(--rune-padding, var(--spacing-md));
}

/* === Surface assignments (theme-specific) === */

/* Cards */
.rune-recipe,
.rune-character,
.rune-work,
.rune-bug,
.rune-decision,
.rune-testimonial,
.rune-event,
.rune-track {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md, 0.5rem);
  padding: var(--rune-padding, var(--spacing-md));
}

/* Inline */
.rune-hint,
.rune-details,
.rune-sidenote,
.rune-conversation {
  padding: var(--rune-padding, var(--spacing-sm)) 0;
}

/* Banners */
.rune-hero,
.rune-cta,
.rune-feature {
  background: var(--color-surface);
  padding: var(--rune-padding, var(--spacing-xl)) 0;
}

/* Inset */
.rune-exercise,
.rune-codegroup,
.rune-sandbox {
  background: var(--color-bg-muted);
  border-radius: var(--radius-md, 0.5rem);
  padding: var(--rune-padding, var(--spacing-md));
}
```

A different theme makes different assignments. A minimal theme might render everything inline. A dashboard theme might render everything as cards. The rune output is the same — only the theme CSS changes.

### Surface and Tint Interaction

When a rune has a tint, the tint overrides the surface’s default background through the CSS cascade. The theme doesn’t need special interaction rules:

```css
/* The tint bridge overrides --color-surface within the tinted container */
[data-tint] {
  --color-surface: var(--tint-background, var(--color-surface));
}
```

A tinted card picks up the tinted background. A tinted banner picks up the tinted background. The surface assignment and the tint compose naturally.

### Surface and Density Interaction

Surface and density interact through the `--rune-padding` custom property. The density rules set `--rune-padding`, and the surface styles consume it:

```css
/* Density sets the padding scale */
[data-density="full"] { --rune-padding: var(--spacing-lg); }
[data-density="compact"] { --rune-padding: var(--spacing-sm); }
[data-density="minimal"] { --rune-padding: var(--spacing-xs); }

/* Surface uses --rune-padding */
.rune-recipe { padding: var(--rune-padding, var(--spacing-md)); }
```

A compact card has tighter padding than a full card. The density and surface systems compose through the shared custom property without either knowing about the other.

### Community Runes

A community rune that the theme hasn’t explicitly assigned a surface gets no container treatment — it renders as unstyled content. This is intentional. The theme author can add the community rune to their surface assignment list when they want to support it:

```css
/* Adding support for a community rune */
.rune-recipe,
.rune-character,
.rune-wine-tasting {  /* ← add community rune here */
  /* card surface styles */
}
```

Alternatively, the theme can provide a catch-all for unassigned runes:

```css
/* Fallback: any rune not explicitly assigned gets card treatment */
[class^="rune-"]:not(.rune-hint):not(.rune-hero):not(.rune-details) {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--rune-padding, var(--spacing-md));
}
```

This ensures community runes look reasonable even before the theme explicitly supports them. The catch-all excludes runes the theme has already assigned to non-card surfaces.

---

## Density

Controls how much detail a rune shows and how tightly it’s spaced. A rune on a dedicated page shows full detail. The same rune in a grid card or list shows a condensed version.

### Values

|Value    |Treatment                                                       |Context                               |
|-------|----------------------------------------|------------------------|
|`full`   |All sections visible, generous spacing                          |Dedicated page, expanded view         |
|`compact`|Descriptions truncated, secondary metadata hidden, tight spacing|Grid cell, card grid, sidebar         |
|`minimal`|Title and primary metadata only, very tight                     |List view, backlog row, search results|

### Automatic Density

The identity transform sets density based on context. The rune config declares a default, and the rendering context overrides it:

|Context                                 |Density                      |
|------------------------|-------------------|
|Rune on a dedicated page                |`full`                       |
|Rune inside a grid cell                 |`compact`                    |
|Rune inside a backlog or list view      |`minimal`                    |
|Rune inside a split section’s media zone|`compact`                    |
|Author override via attribute           |Whatever the author specified|

The author can override the automatic density:

```markdoc
{% recipe density="compact" %}
...
{% /recipe %}
```

### Rune Config

```typescript
Recipe: {
  block: 'recipe',
  surface: 'card',
  defaultDensity: 'full',
  // ...
}
```

### Identity Transform Output

```html
<!-- Full density on a page -->
<div class="rune-recipe" data-density="full">
  <div data-section="header">
    <span data-meta-type="temporal" data-meta-rank="primary">30 min</span>
    <span data-meta-type="category" data-meta-rank="primary" data-meta-sentiment="positive">Easy</span>
    <span data-meta-type="quantity" data-meta-rank="primary">4 servings</span>
  </div>
  <h2 data-section="title">Classic Sourdough</h2>
  <p data-section="description">A rustic loaf with an open crumb and crispy crust...</p>
  <div data-section="body"><!-- full recipe content --></div>
</div>

<!-- Compact density in a grid -->
<div class="rune-recipe" data-density="compact">
  <!-- same HTML, styled differently by theme -->
</div>
```

### Theme CSS

```css
/* === Full: all content visible, generous spacing === */
[data-density="full"] {
  --rune-padding: var(--spacing-lg);
}

/* === Compact: truncated, tight === */
[data-density="compact"] {
  --rune-padding: var(--spacing-sm);
}

[data-density="compact"] [data-section="description"] {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

[data-density="compact"] [data-meta-rank="secondary"] {
  display: none;
}

/* === Minimal: title and primary metadata only === */
[data-density="minimal"] {
  --rune-padding: var(--spacing-xs);
}

[data-density="minimal"] [data-section="description"] {
  display: none;
}

[data-density="minimal"] [data-section="body"] {
  display: none;
}

[data-density="minimal"] [data-section="footer"] {
  display: none;
}

[data-density="minimal"] [data-meta-rank="secondary"] {
  display: none;
}
```

At compact density, descriptions are clamped to two lines and secondary metadata is hidden. At minimal density, only the header (primary metadata) and title remain. These rules apply to every rune — a compact recipe card, a compact character card, and a compact work item card all truncate the same way.

---

## Section Anatomy

Controls the structural parts of a rune. Most runes follow the same pattern: header with metadata, title, description, body content, footer with actions. The identity transform emits `data-section` attributes on each structural element, enabling universal anatomy styling.

### Values

|Value        |Purpose                         |Contents                                       |
|---------|--------------------|-----------------------------|
|`header`     |Metadata row above the title    |Badges, status pills, category chips           |
|`title`      |Primary heading                 |The rune’s name/headline                       |
|`description`|Secondary text below the title  |Summary, blurb, subtitle                       |
|`body`       |Main content area               |The rune’s primary content                     |
|`footer`     |Actions and links below the body|Buttons, links, related items                  |
|`media`      |Visual content area             |Images, showcases, sandboxes (in split layouts)|

### Rune Config

The config maps each ref to a section role:

```typescript
Recipe: {
  block: 'recipe',
  surface: 'card',
  sections: {
    header: 'header',     // ref name → section role
    title: 'title',
    description: 'description',
    content: 'body',
    tips: 'footer',
  },
  // ...
}
```

The identity transform reads the `sections` mapping and emits `data-section` alongside the BEM class:

```html
<div class="rune-recipe__header" data-section="header">...</div>
<h2 class="rune-recipe__title" data-section="title">...</h2>
```

### Identity Transform Output

**Recipe:**

```html
<div class="rune-recipe" data-density="full">
  <div class="rune-recipe__header" data-section="header">
    <span data-meta-type="temporal" data-meta-rank="primary">30 min</span>
    <span data-meta-type="category" data-meta-rank="primary">Easy</span>
  </div>
  <h2 class="rune-recipe__title" data-section="title">Classic Sourdough</h2>
  <p class="rune-recipe__description" data-section="description">A rustic loaf...</p>
  <div class="rune-recipe__content" data-section="body">
    <!-- ingredients, steps -->
  </div>
  <div class="rune-recipe__tips" data-section="footer">
    <!-- chef tips -->
  </div>
</div>
```

**Character:**

```html
<div class="rune-character" data-density="full">
  <div class="rune-character__badges" data-section="header">
    <span data-meta-type="category" data-meta-rank="primary">Antagonist</span>
    <span data-meta-type="status" data-meta-rank="primary" data-meta-sentiment="positive">Alive</span>
  </div>
  <img class="rune-character__portrait" data-section="media" data-media="portrait" src="...">
  <h2 class="rune-character__name" data-section="title">Veshra</h2>
  <div class="rune-character__content" data-section="body">
    <!-- sections: Appearance, Personality, Backstory -->
  </div>
</div>
```

**Work Item:**

```html
<div class="rune-work" data-density="full">
  <div class="rune-work__header" data-section="header">
    <span data-meta-type="id" data-meta-rank="primary">RF-142</span>
    <span data-meta-type="status" data-meta-rank="primary" data-meta-sentiment="neutral">In Progress</span>
    <span data-meta-type="category" data-meta-rank="primary" data-meta-sentiment="caution">High</span>
  </div>
  <h2 class="rune-work__title" data-section="title">Implement tint dark mode</h2>
  <p class="rune-work__description" data-section="description">The tint rune needs dual...</p>
  <div class="rune-work__content" data-section="body">
    <!-- acceptance criteria, edge cases, approach -->
  </div>
  <div class="rune-work__refs" data-section="footer">
    <!-- references, links -->
  </div>
</div>
```

All three follow the same anatomy. The theme styles them uniformly.

### Theme CSS

```css
/* === Header: metadata row === */
[data-section="header"] {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: var(--spacing-sm);
}

/* === Title: primary heading === */
[data-section="title"] {
  font-size: var(--font-size-title, 1.5rem);
  font-weight: 700;
  line-height: 1.2;
  margin: 0;
}

/* Scale title with density */
[data-density="compact"] [data-section="title"] {
  font-size: var(--font-size-title-compact, 1.125rem);
}

[data-density="minimal"] [data-section="title"] {
  font-size: var(--font-size-title-minimal, 1rem);
}

/* === Description: secondary text === */
[data-section="description"] {
  color: var(--color-text-muted);
  font-size: var(--font-size-body, 1rem);
  line-height: 1.5;
  margin: var(--spacing-xs) 0 var(--spacing-md);
}

/* === Body: main content === */
[data-section="body"] {
  line-height: 1.6;
}

/* === Footer: actions and links === */
[data-section="footer"] {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--color-border);
}

/* === Media: visual content === */
[data-section="media"] {
  margin: var(--spacing-sm) 0;
}
```

Six rules for the anatomy. Combined with the density rules, titles scale down, descriptions truncate or hide, and footers disappear — all universally.

---

## Interactive State

Controls the visual state of interactive rune elements — collapsible panels, tabbed sections, selectable items.

### Values

|Value     |Meaning                   |Used by                                         |
|------|----------------|------------------------------|
|`open`    |Expanded, visible content |Accordion panel, details content, reveal step   |
|`closed`  |Collapsed, hidden content |Accordion panel, details content                |
|`active`  |Currently selected/visible|Active tab, active accordion panel, current step|
|`inactive`|Not currently selected    |Inactive tab, other accordion panels            |
|`selected`|User-selected item        |Quiz answer, datatable row                      |
|`disabled`|Non-interactive           |Disabled form field, locked content             |

### Identity Transform Output

The identity transform sets the initial state. The behaviour script toggles it.

```html
<!-- Accordion -->
<div class="rune-accordion__panel" data-state="open">
  <button class="rune-accordion__trigger">Section One</button>
  <div class="rune-accordion__content">...</div>
</div>
<div class="rune-accordion__panel" data-state="closed">
  <button class="rune-accordion__trigger">Section Two</button>
  <div class="rune-accordion__content">...</div>
</div>

<!-- Tabs -->
<button class="rune-tabs__tab" data-state="active">Tab One</button>
<button class="rune-tabs__tab" data-state="inactive">Tab Two</button>
<div class="rune-tabs__panel" data-state="active">Panel content...</div>
<div class="rune-tabs__panel" data-state="inactive">Panel content...</div>
```

### Theme CSS

```css
/* === Open/Closed: collapsible content === */
[data-state="open"] > [class*="__content"] {
  display: block;
}

[data-state="closed"] > [class*="__content"] {
  display: none;
}

/* Animated transition (theme opt-in) */
[data-state="open"] > [class*="__content"] {
  animation: rune-expand 0.2s ease-out;
}

@keyframes rune-expand {
  from { opacity: 0; transform: translateY(-0.5rem); }
  to { opacity: 1; transform: translateY(0); }
}

/* === Active/Inactive: selection state === */
[data-state="active"] {
  /* Tabs, accordion triggers */
}

[data-state="inactive"] {
  opacity: 0.7;
}

/* Active tab indicator */
button[data-state="active"] {
  border-bottom: 2px solid var(--color-accent);
  color: var(--color-accent);
}

button[data-state="inactive"] {
  border-bottom: 2px solid transparent;
  color: var(--color-text-muted);
}

/* === Selected: user selection === */
[data-state="selected"] {
  background: color-mix(in oklch, var(--color-accent) 10%, transparent);
  outline: 2px solid var(--color-accent);
}

/* === Disabled === */
[data-state="disabled"] {
  opacity: 0.4;
  pointer-events: none;
}
```

The behaviour script toggles `data-state` values. The theme animates the transitions. Every collapsible rune gets the same expand animation. Every tabbed rune gets the same active indicator. The behaviour script doesn’t need to know about styling — it just sets state.

### Behaviour Script Integration

The existing `@refrakt-md/behaviors` script already toggles classes for interactive runes. Migrating to `data-state` attributes is a straightforward refactor:

```javascript
// Before: class-based
panel.classList.toggle('rune-accordion__panel--open');

// After: state-based
panel.dataset.state = panel.dataset.state === 'open' ? 'closed' : 'open';
```

The behaviour script sets state. The theme reads state. Clean separation.

---

## Media Slots

Controls the visual treatment of images and media elements within runes.

### Values

|Value      |Treatment                                         |Use cases                                             |
|-------|------------------------------|----------------------------------|
|`portrait` |Circular crop, 1:1 aspect ratio                   |Character portrait, team member headshot, artist photo|
|`cover`    |Full-width, 16:9 aspect ratio, rounded top corners|Recipe photo, album cover, event image                |
|`thumbnail`|Small fixed-size preview                          |Track artwork, search result preview, list item icon  |
|`hero`     |Large responsive image, may bleed                 |Hero background, feature section image                |
|`icon`     |Small square, no crop                             |Logo, badge, small illustration                       |

### Rune Config

```typescript
Recipe: {
  block: 'recipe',
  surface: 'card',
  mediaSlots: {
    image: 'cover',
  },
  // ...
}

Character: {
  block: 'character',
  surface: 'card',
  mediaSlots: {
    portrait: 'portrait',
  },
  // ...
}

Track: {
  block: 'track',
  mediaSlots: {
    artwork: 'thumbnail',
  },
  // ...
}
```

### Identity Transform Output

```html
<!-- Recipe cover image -->
<img class="rune-recipe__image" data-media="cover" src="/images/sourdough.jpg" alt="...">

<!-- Character portrait -->
<img class="rune-character__portrait" data-media="portrait" src="/images/veshra.jpg" alt="...">

<!-- Track thumbnail -->
<img class="rune-track__artwork" data-media="thumbnail" src="/images/album.jpg" alt="...">
```

### Theme CSS

```css
/* === Portrait: circular crop === */
[data-media="portrait"] {
  border-radius: 50%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  width: var(--media-portrait-size, 5rem);
  height: var(--media-portrait-size, 5rem);
}

/* === Cover: full-width banner image === */
[data-media="cover"] {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: var(--radius-md, 0.5rem) var(--radius-md, 0.5rem) 0 0;
}

/* Cover inside a card: negative margin to reach card edges */
[data-surface="card"] > [data-media="cover"]:first-child {
  margin: calc(-1 * var(--rune-padding, var(--spacing-md)));
  margin-bottom: var(--spacing-md);
  width: calc(100% + 2 * var(--rune-padding, var(--spacing-md)));
  border-radius: var(--radius-md, 0.5rem) var(--radius-md, 0.5rem) 0 0;
}

/* === Thumbnail: small fixed preview === */
[data-media="thumbnail"] {
  width: var(--media-thumbnail-size, 3rem);
  height: var(--media-thumbnail-size, 3rem);
  border-radius: var(--radius-sm, 0.25rem);
  object-fit: cover;
  flex-shrink: 0;
}

/* === Hero: large responsive image === */
[data-media="hero"] {
  width: 100%;
  object-fit: cover;
}

/* === Icon: small square, no crop === */
[data-media="icon"] {
  width: var(--media-icon-size, 2rem);
  height: var(--media-icon-size, 2rem);
  object-fit: contain;
  flex-shrink: 0;
}
```

Five rules. Every rune’s images are handled. A character portrait and a team member headshot both get the same circular crop. A recipe photo and an album cover both get the same full-width 16:9 treatment.

### Media and Density Interaction

Media slots adapt to density:

```css
/* Compact: smaller portraits, smaller thumbnails */
[data-density="compact"] [data-media="portrait"] {
  --media-portrait-size: 3rem;
}

[data-density="compact"] [data-media="cover"] {
  aspect-ratio: 3 / 1;
}

/* Minimal: no media */
[data-density="minimal"] [data-media] {
  display: none;
}
```

At compact density, portraits shrink and cover images become wider and shorter. At minimal density, all media is hidden — only text metadata remains.

---

## Checklist

Controls the visual treatment of checkbox-style list items — the `[x]`/`[ ]` pattern common in acceptance criteria, progress tracking, and status lists. Today this pattern is styled independently in each rune that uses it (plot beats, comparison rows) or not styled at all (work/bug acceptance criteria). A universal checklist treatment eliminates the duplication and ensures every rune with checkbox items gets consistent styling for free.

### Values

|Value      |Marker|Meaning                    |Visual treatment                                  |
|-----------|------|---------------------------|--------------------------------------------------|
|`checked`  |`[x]` |Complete / done / included |Filled indicator (checkmark), muted text           |
|`unchecked`|`[ ]` |Pending / todo / excluded  |Empty indicator (hollow circle or empty box)       |
|`active`   |`[>]` |In progress / current      |Primary-coloured indicator with emphasis ring       |
|`skipped`  |`[-]` |Abandoned / excluded / N/A |Muted indicator, strikethrough text                |

### How It Works

The identity transform detects checkbox markers at the start of list item text content. When found, it:

1. Strips the marker text (`[x] `, `[ ] `, `[>] `, `[-] `) from the rendered output
2. Sets `data-checked` on the `<li>` element with the resolved value (`checked`, `unchecked`, `active`, `skipped`)

This is a **content-level** pattern, not a rune-config-level dimension. Any list item in any rune's body content that starts with a checkbox marker gets the attribute automatically. Runes don't need to declare anything — the transform handles it generically.

### Opt-in via Rune Config

Runes that want checkbox detection on specific structural lists (not just body content) can declare it in their config:

```typescript
Work: {
  block: 'work',
  checklist: true,  // enable checkbox detection on all lists within this rune
  // ...
}
```

When `checklist` is not set, checkbox detection still applies to standard Markdown task list items (which Markdoc may already parse with a `checked` attribute on the AST node). The `checklist: true` flag extends detection to all lists, including those inside content model fields.

### Identity Transform Output

**Work item acceptance criteria:**

```html
<div class="rf-work__body" data-section="body">
  <section data-name="acceptance-criteria">
    <h2>Acceptance Criteria</h2>
    <ul>
      <li data-checked="checked">First criterion — done</li>
      <li data-checked="unchecked">Second criterion — pending</li>
      <li data-checked="unchecked">Third criterion — pending</li>
    </ul>
  </section>
</div>
```

**Plot beats (rune-specific styling still applies via BEM):**

```html
<li class="rf-beat rf-beat--complete" data-checked="checked">
  <span data-field="label">Completed step</span>
</li>
<li class="rf-beat rf-beat--active" data-checked="active">
  <span data-field="label">Active step</span>
</li>
```

Plot beats get both the universal `data-checked` attribute and their rune-specific BEM modifier. The theme can style beats with the BEM classes for the dot/timeline treatment, while the universal `data-checked` rules provide the baseline text treatment (muted for checked, strikethrough for skipped). The two layers compose — specific overrides generic.

### Theme CSS

```css
/* === Checklist: universal checkbox item styling === */

/* All checklist items get left padding for the indicator */
[data-checked] {
  position: relative;
  padding-left: 1.75rem;
  list-style: none;
}

/* Indicator base — positioned left of text */
[data-checked]::before {
  content: '';
  position: absolute;
  left: 0.125rem;
  top: 0.5em;
  width: 1rem;
  height: 1rem;
  border-radius: var(--radius-sm, 0.25rem);
  border: 2px solid var(--color-border);
  background: transparent;
}

/* Checked — filled with checkmark */
[data-checked="checked"]::before {
  background: var(--color-success);
  border-color: var(--color-success);
  /* checkmark via CSS mask or content */
}

[data-checked="checked"] {
  color: var(--color-text-muted);
}

/* Active — primary colour with emphasis */
[data-checked="active"]::before {
  border-color: var(--color-primary);
  background: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--color-primary) 20%, transparent);
}

[data-checked="active"] {
  color: var(--color-primary);
  font-weight: 600;
}

/* Skipped — muted with strikethrough */
[data-checked="skipped"]::before {
  background: var(--color-text-muted);
  border-color: var(--color-text-muted);
}

[data-checked="skipped"] {
  text-decoration: line-through;
  color: var(--color-text-muted);
}

/* Unchecked — empty indicator (default styling from base rules) */
```

Six rules for the checklist. Every rune with checkbox-style list items gets consistent visual treatment. Plot beats can override with their dot/timeline treatment via BEM specificity. Work acceptance criteria, comparison feature lists, and any community rune with checklists all work automatically.

### Checklist and Density Interaction

```css
/* Compact: tighter spacing */
[data-density="compact"] [data-checked] {
  padding-left: 1.5rem;
}

[data-density="compact"] [data-checked]::before {
  width: 0.75rem;
  height: 0.75rem;
}

/* Minimal: indicators only, no text */
[data-density="minimal"] [data-checked] {
  font-size: 0;        /* hide text */
  padding-left: 0;
  display: inline-block;
  width: 1rem;
  height: 1rem;
}
```

### Existing Rune Migration

| Package | Rune | Current approach | Migration |
|---------|------|-----------------|-----------|
| storytelling | Plot (beats) | Marker regex → status modifier → BEM classes + custom dot CSS | Add `data-checked` alongside existing BEM. Dot styling stays via BEM; text treatment from universal rules |
| marketing | Comparison | Marker regex → row type → per-rune styling | Add `data-checked` for check/cross rows. Row-specific layout stays via BEM |
| plan | Work/Bug | Pipeline counts `[x]`/`[ ]` for progress badges; no visual styling on items | Add `data-checked` to list items. Acceptance criteria get checkbox indicators for free |
| plan | Backlog | Displays progress counts from pipeline | No change — still reads counts from entity data |

Migration is additive. Existing BEM styling continues to work. The universal `data-checked` rules layer underneath.

---

## Complete Theme Baseline

A theme implementing all universal dimensions writes approximately this many rules:

|Dimension      |Rules                        |Coverage                       |Declared by          |
|---------|-------------------|-------------------|-------------|
|Meta types     |6                            |Every metadata badge shape     |Rune config          |
|Meta sentiments|4                            |Every badge colour             |Rune config          |
|Meta ranks     |2                            |Every badge size               |Rune config          |
|Surfaces       |4 + assignments              |Every container treatment      |**Theme**            |
|Densities      |3 (× section interactions)   |Every detail level             |Rune config + context|
|Sections       |6                            |Every structural element       |Rune config          |
|States         |6                            |Every interactive state        |Behaviour script     |
|Media slots    |5                            |Every image treatment          |Rune config          |
|Checklist      |6                            |Every checkbox-style list item |Content detection    |
|**Total**      |**~46 + surface assignments**|**Every rune in the ecosystem**|                     |

The surface assignments are the one per-rune cost — the theme lists which runes get which surface treatment. This is typically 4 selector groups (one per surface type) totalling maybe 10 additional lines. Everything else is universal.

A theme author’s workflow becomes:

1. Style the 8 rune-declared dimensions (~42 rules) for universal coverage
1. Assign surfaces to runes (~4 selector groups)
1. Customise specific runes where the generic treatment isn’t sufficient
1. The generic rules handle every rune they haven’t specifically customised — including community runes they’ve never seen

---

## Rune Config Summary

The full config for a rune with all dimensions:

```typescript
Recipe: {
  block: 'recipe',
  
  // Universal dimensions (rune-declared)
  defaultDensity: 'full',
  sections: {
    header: 'header',
    title: 'title',
    description: 'description',
    content: 'body',
    tips: 'footer',
  },
  mediaSlots: {
    image: 'cover',
  },
  
  // Metadata (from Metadata System Specification)
  refs: {
    prepTime: { metaType: 'temporal', metaRank: 'primary' },
    cookTime: { metaType: 'temporal', metaRank: 'primary' },
    difficulty: {
      metaType: 'category',
      metaRank: 'primary',
      sentimentMap: { easy: 'positive', medium: 'neutral', hard: 'caution' },
    },
    servings: { metaType: 'quantity', metaRank: 'primary' },
  },

  // Existing config (modifiers, contentWrapper, etc.)
  modifiers: { difficulty: { source: 'meta', default: 'medium' } },
  contentWrapper: { ref: 'content' },
  
  // Note: surface is NOT declared here — the theme owns it
}
```

All dimensions are optional. A rune that doesn’t declare `sections` renders without `data-section` attributes. A rune that doesn’t declare `mediaSlots` renders images without `data-media` attributes. Migration is per-field, per-rune, at whatever pace makes sense.

---

## Dimension Map

The following tables map every rune across all packages to its proposed universal theming dimension values, derived from the actual rune configs (`structure`, `contentWrapper`, `autoLabel`, `modifiers`, and interactive behaviour).

### Table 1: Section Anatomy Map

Maps each container-level rune's structural refs to the standard `data-section` roles. The cell value is the actual ref name used in config; "---" means the rune has no equivalent section.

| Package | Rune | header | title | description | body | footer | media |
|---------|------|--------|-------|-------------|------|--------|-------|
| core | Hint | header (icon + title) | --- | --- | (content children) | --- | --- |
| core | Accordion | header (eyebrow, headline, blurb via autoLabel) | headline | blurb | (panels) | --- | --- |
| core | Details | --- | summary | --- | (content children) | --- | --- |
| core | CodeGroup | topbar (dots + title) | title | --- | (panels) | --- | --- |
| core | Grid | --- | --- | --- | (cells) | --- | --- |
| core | Tabs | header (eyebrow, headline, blurb via autoLabel) | headline | blurb | (tab panels) | --- | --- |
| core | DataTable | --- | --- | --- | table | --- | --- |
| core | Form | --- | --- | --- | body | --- | --- |
| core | Reveal | header (eyebrow, headline, blurb via autoLabel) | headline | blurb | (steps) | --- | --- |
| core | Compare | --- | --- | --- | (panels) | --- | --- |
| core | Conversation | --- | --- | --- | (messages) | --- | --- |
| core | Annotate | --- | --- | --- | body | --- | --- |
| core | Sidenote | --- | --- | --- | body | --- | --- |
| core | Figure | --- | --- | caption | (image content) | --- | --- |
| core | Gallery | --- | --- | --- | (items) | --- | --- |
| core | PullQuote | --- | --- | --- | body | --- | --- |
| core | TextBlock | --- | --- | --- | body | --- | --- |
| core | MediaText | --- | --- | --- | body | --- | media |
| core | Showcase | --- | --- | --- | viewport | --- | --- |
| core | Embed | --- | --- | --- | fallback | --- | --- |
| core | Diagram | --- | title (figcaption) | --- | container | --- | --- |
| core | Chart | --- | title (figcaption) | --- | container | legend | --- |
| core | Blog | header (eyebrow, headline, blurb via autoLabel) | headline | blurb | content | --- | --- |
| core | Budget | header (title + meta) | title | --- | (categories) | footer (totals) | --- |
| core | Breadcrumb | --- | --- | --- | items | --- | --- |
| core | Nav | --- | --- | --- | (groups/items) | --- | --- |
| core | Juxtapose | --- | --- | --- | (panels) | --- | --- |
| core | Sandbox | --- | --- | --- | source | --- | --- |
| core | Diff | --- | --- | --- | (lines) | --- | --- |
| marketing | Hero | header (eyebrow, headline, blurb via autoLabel) | headline | blurb | (actions) | --- | media |
| marketing | CallToAction | header (eyebrow, headline, blurb via autoLabel) | headline | blurb | (actions) | --- | --- |
| marketing | Bento | header (eyebrow, headline, blurb via autoLabel) | headline | blurb | (cells) | --- | --- |
| marketing | Feature | header (eyebrow, headline, blurb via autoLabel) | headline | blurb | (definitions) | --- | image |
| marketing | Steps | header (eyebrow, headline, blurb via autoLabel) | headline | blurb | (step items) | --- | --- |
| marketing | Pricing | header (eyebrow, headline, blurb via autoLabel) | headline | blurb | (tiers) | --- | --- |
| marketing | Testimonial | --- | --- | --- | content | --- | avatar |
| marketing | Comparison | header (eyebrow, headline, blurb via autoLabel) | headline | blurb | table/cards | verdict | --- |
| docs | Api | header (method + path + auth) | --- | --- | body | --- | --- |
| docs | Symbol | header (kind, lang, since, deprecated, source) | headline | --- | body | --- | --- |
| docs | Changelog | header (eyebrow, headline via autoLabel) | headline | --- | (releases) | --- | --- |
| learning | HowTo | meta (estimatedTime + difficulty) | headline | blurb | content | --- | --- |
| learning | Recipe | meta (prep, cook, servings, difficulty) | headline | blurb | (ingredients + steps) | --- | media |
| storytelling | Character | badge (role + status) | name | --- | content | --- | portrait |
| storytelling | Realm | badge (type + scale) | name | --- | (sections) | --- | scene |
| storytelling | Lore | badge (category) | title | --- | content | --- | --- |
| storytelling | Faction | badge (type + alignment + size) | name | --- | (sections) | --- | --- |
| storytelling | Plot | badge (type + structure) | title | --- | (beats) | --- | --- |
| storytelling | Bond | --- | --- | --- | body | --- | --- |
| storytelling | Storyboard | --- | --- | --- | (panels) | --- | --- |
| business | Cast | header (eyebrow, headline, blurb via autoLabel) | headline | blurb | (members) | --- | --- |
| business | Organization | header (eyebrow, headline, blurb via autoLabel) | headline | blurb | body | --- | --- |
| business | Timeline | header (eyebrow, headline, blurb via autoLabel) | headline | blurb | (entries) | --- | --- |
| places | Event | details (date, location, register) | headline | blurb | content | --- | --- |
| places | Itinerary | header (eyebrow, headline, blurb via autoLabel) | headline | blurb | (days) | --- | --- |
| places | Map | --- | --- | --- | container | --- | --- |
| media | Playlist | header (type-badge) | title | --- | (tracks) | --- | media |
| media | Audio | --- | --- | description | (audio content) | --- | --- |
| design | Swatch | --- | --- | --- | chip | --- | --- |
| design | Palette | --- | --- | --- | grid/scale | --- | --- |
| design | Typography | --- | title | --- | specimens | --- | --- |
| design | Spacing | --- | title | --- | scale/radii/shadows | --- | --- |
| design | DesignContext | --- | title | --- | (sections) | --- | --- |
| design | Preview | --- | --- | --- | source | --- | --- |
| design | Mockup | --- | label | --- | frame (viewport) | --- | --- |
| plan | Spec | header (id, status, version, supersedes) | --- | --- | body | --- | --- |
| plan | Work | header (id, status, priority, complexity, assignee, milestone) | --- | --- | body | --- | --- |
| plan | Bug | header (id, status, severity, assignee, milestone) | --- | --- | body | --- | --- |
| plan | Decision | header (id, status, date, supersedes) | --- | --- | body | --- | --- |
| plan | Milestone | header (name, status, target) | --- | --- | body | --- | --- |
| plan | Backlog | --- | --- | --- | (work items) | --- | --- |
| plan | DecisionLog | --- | --- | --- | (decisions) | --- | --- |

### Table 2: Media Slots Map

Runes that have image or media refs in their config, mapped to the proposed `data-media` slot type.

| Package | Rune | Slot ref | Media type |
|---------|------|----------|-----------|
| core | MediaText | media | cover |
| core | Figure | (image content) | cover |
| marketing | Hero | media | hero |
| marketing | Feature | image | cover |
| marketing | Testimonial | avatar | portrait |
| marketing | Step | media | cover |
| learning | Recipe | media | cover |
| storytelling | Character | portrait | portrait |
| storytelling | Realm | scene | cover |
| storytelling | Storyboard (panel) | image | cover |
| media | Playlist | media | cover |
| business | Cast (member) | (avatar via content) | portrait |
| design | Mockup | viewport | hero |
| design | Preview | (rendered content) | hero |

### Table 3: Interactive State Map

Runes that have interactive behaviour (toggling, selecting, expanding).

| Package | Rune | States used | Mechanism |
|---------|------|------------|-----------|
| core | Accordion | `open` / `closed`, `active` / `inactive` | `@refrakt-md/behaviors` accordion script; panels toggle open/closed, triggers toggle active/inactive |
| core | Details | `open` / `closed` | Native `<details>` element or behaviours script |
| core | Tabs | `active` / `inactive` | `@refrakt-md/behaviors` tabs script; tabs and panels toggle active/inactive |
| core | DataTable | `selected` (rows) | `@refrakt-md/behaviors` datatable script; sortable columns, searchable rows |
| core | Form | `disabled` (fields) | `@refrakt-md/behaviors` form script; field validation states |
| core | Reveal | `open` / `closed`, `active` / `inactive` | `@refrakt-md/behaviors` reveal script; steps toggle through sequentially |
| core | Juxtapose | `active` / `inactive` | `@refrakt-md/behaviors` juxtapose script; slider or animation toggle |
| core | Gallery | `selected` (lightbox) | `@refrakt-md/behaviors` gallery lightbox; selected image in overlay |
| core | Nav | `active` / `inactive` | Web component `<rf-nav>`; active state tracks current page |
| core | CodeGroup | `active` / `inactive` | `@refrakt-md/behaviors` tabs script (reused); panels toggle |
| core | Sandbox | `active` / `inactive` | Web component `<rf-sandbox>`; live/source toggle |
| core | Diagram | --- | Web component `<rf-diagram>`; renders on client, no toggle state |
| places | Map | --- | Web component `<rf-map>`; interactive map, no discrete states |

### Table 4: Default Density

Proposed default density for every container-level rune. Child/item runes are excluded (they inherit from their parent).

| Package | Rune | Default density |
|---------|------|----------------|
| core | Hint | `compact` |
| core | Accordion | `full` |
| core | Details | `compact` |
| core | CodeGroup | `compact` |
| core | Grid | `full` |
| core | Tabs | `full` |
| core | DataTable | `compact` |
| core | Form | `full` |
| core | Reveal | `full` |
| core | Compare | `full` |
| core | Conversation | `compact` |
| core | Annotate | `full` |
| core | Sidenote | `minimal` |
| core | Figure | `compact` |
| core | Gallery | `full` |
| core | PullQuote | `compact` |
| core | TextBlock | `full` |
| core | MediaText | `full` |
| core | Showcase | `compact` |
| core | Embed | `compact` |
| core | Diagram | `compact` |
| core | Chart | `compact` |
| core | Blog | `full` |
| core | Budget | `full` |
| core | Breadcrumb | `minimal` |
| core | Nav | `compact` |
| core | Juxtapose | `compact` |
| core | Sandbox | `compact` |
| core | Diff | `compact` |
| marketing | Hero | `full` |
| marketing | CallToAction | `full` |
| marketing | Bento | `full` |
| marketing | Feature | `full` |
| marketing | Steps | `full` |
| marketing | Pricing | `full` |
| marketing | Testimonial | `compact` |
| marketing | Comparison | `full` |
| docs | Api | `full` |
| docs | Symbol | `full` |
| docs | Changelog | `full` |
| learning | HowTo | `full` |
| learning | Recipe | `full` |
| storytelling | Character | `full` |
| storytelling | Realm | `full` |
| storytelling | Lore | `full` |
| storytelling | Faction | `full` |
| storytelling | Plot | `full` |
| storytelling | Bond | `compact` |
| storytelling | Storyboard | `full` |
| business | Cast | `full` |
| business | Organization | `full` |
| business | Timeline | `full` |
| places | Event | `full` |
| places | Itinerary | `full` |
| places | Map | `compact` |
| media | Playlist | `full` |
| media | Audio | `compact` |
| design | Swatch | `minimal` |
| design | Palette | `full` |
| design | Typography | `full` |
| design | Spacing | `full` |
| design | DesignContext | `full` |
| design | Preview | `compact` |
| design | Mockup | `compact` |
| plan | Spec | `full` |
| plan | Work | `full` |
| plan | Bug | `full` |
| plan | Decision | `full` |
| plan | Milestone | `full` |
| plan | Backlog | `full` |
| plan | DecisionLog | `full` |

### Child and Item Runes

Child runes --- AccordionItem, Tab/TabPanel, BentoCell, ComparisonColumn/ComparisonRow, Step, Tier/FeaturedTier, RevealStep, JuxtaposePanel, ConversationMessage, AnnotateNote, BreadcrumbItem, NavGroup/NavItem, FormField, Definition, BudgetCategory/BudgetLineItem, Track, MapPin, ItineraryDay/ItineraryStop, CastMember, TimelineEntry, Beat, CharacterSection, RealmSection, FactionSection, SymbolGroup/SymbolMember, ChangelogRelease, StoryboardPanel, RecipeIngredient, etc. --- do **not** independently declare density, section anatomy, or media slot dimensions. They inherit their parent rune's density and render within the parent's structural context. The parent rune's config determines the overall anatomy; child runes contribute to the parent's `body` section content.

The one exception is media refs on child runes (e.g., StoryboardPanel has an `image` ref, CastMember may contain an avatar). These inherit the parent's density for sizing but declare their own `data-media` slot so the theme can apply the correct media treatment (portrait, cover, thumbnail) regardless of nesting depth.

---

## Inspector Audit

```bash
$ refrakt inspect --audit-dimensions

  Surface assignments (theme-owned):
  card       18 runes assigned
  inline      6 runes assigned
  banner      4 runes assigned
  inset       3 runes assigned
  (unassigned) 2 runes   ⚠ no surface in theme (wine-tasting, stat-block)

  Density coverage:
  full       24 runes   ✓ themed
  compact    24 runes   ✓ themed
  minimal    24 runes   ✓ themed

  Section anatomy:
  header     22 runes   ✓ themed
  title      24 runes   ✓ themed
  description 18 runes  ✓ themed
  body       24 runes   ✓ themed
  footer     12 runes   ✓ themed
  media       8 runes   ✓ themed

  Interactive state:
  open/closed  4 runes  ✓ themed (accordion, details, reveal, exercise)
  active/inactive 2 runes ✓ themed (tabs, accordion)
  selected     2 runes  ✓ themed (quiz, datatable)

  Media slots:
  portrait    3 runes   ✓ themed
  cover       5 runes   ✓ themed
  thumbnail   4 runes   ✓ themed
  hero        2 runes   ✓ themed
  icon        1 rune    ✓ themed

  Community runes:
  @refrakt-community/wine — wine-tasting:
    ✓ metadata, density, sections themed via dimensions
    ⚠ no surface assigned — add to theme surface selectors
  @refrakt-community/dnd-5e — stat-block:
    ✓ metadata, density, sections themed via dimensions
    ⚠ no surface assigned — add to theme surface selectors
```

The inspector verifies that every dimension value in use has theme CSS, and flags runes — especially community runes — that could benefit from declaring dimensions they’re missing.

{% /spec %}