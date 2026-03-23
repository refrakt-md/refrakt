{% spec id="SPEC-009" status="accepted" tags="editor, runes" %}

# Rune Editor Compatibility Spec

This spec covers all remaining runes that need updates for editor compatibility. Three runes have already been updated: **recipe**, **hero**, and **feature**. This document covers everything else.

## Background

The block editor needs three things from each rune to support visual editing:

1. **`data-name` on structural elements** — set via `refs` in `createComponentRenderable` (not `data-field`, which is for modifier properties consumed by the engine)
2. **`editHints` in engine config** — maps each `data-name` value to an edit mode (`inline`, `link`, `code`, `image`, `icon`, `none`)
3. **No incorrect attribute usage** — no manual `data-field` where `data-name` should be used; no manual `data-rune` on children (root gets it automatically via `createComponentRenderable`)

### Reference: Edit Modes

| Mode | Behavior | Typical Use |
|------|----------|-------------|
| `inline` | Contenteditable with formatting toolbar | Headlines, blurbs, body text, list items |
| `link` | URL + display text fields | Action buttons, CTA links |
| `code` | Code editor popover | Terminal commands, code snippets |
| `image` | File picker + alt text | Media, cover images, avatars |
| `icon` | Icon picker gallery | Feature icons, decorative icons |
| `none` | Not directly editable | Generated content, decorative elements |

### Reference: Updated Rune Patterns

See the already-updated runes for canonical examples:
- **Recipe** (`runes/learning/src/tags/recipe.ts` + `runes/learning/src/config.ts`) — editHints for inline content, images, structure badges
- **Hero** (`runes/marketing/src/tags/hero.ts` + `runes/marketing/src/config.ts`) — editHints for actions (link), commands (code), media (image)
- **Feature** (`runes/marketing/src/tags/feature.ts` + `runes/marketing/src/config.ts`) — editHints for definition items (icon, title, description)

---

## Package: `@refrakt-md/marketing`

### CTA (`runes/marketing/src/tags/cta.ts`)

**Current state:** Has editHints and autoLabel in config already. Well-structured.

**Changes needed:**
- None — already has `editHints: { headline: 'inline', eyebrow: 'inline', blurb: 'inline', action: 'link', command: 'code' }` and `autoLabel` with pageSectionAutoLabel

**Status: DONE** ✓

---

### Bento (`runes/marketing/src/tags/bento.ts`)

**Current state:** Has editHints and autoLabel for section-level fields. But manually creates meta tags with `data-field` for gap, columns, sizing (lines 191-193).

**Changes needed:**
- [x] Replace manual `data-field` on meta tags (lines 191-193) with proper `properties` in `createComponentRenderable` so they flow through the standard modifier pipeline
- [x] Verify editHints coverage is complete

**Config editHints (already present):** `{ headline: 'inline', eyebrow: 'inline', blurb: 'inline' }`

**Status: DONE** ✓

---

### BentoCell (nested in `runes/marketing/src/tags/bento.ts`)

**Current state:** No editHints, no autoLabel (only `autoLabel: { name: 'title' }` in config). Properties include `name`, `size`, `span`, `icon`. Refs include `body`, `icon`.

**Changes needed:**
- [x] Add editHints: `{ title: 'inline', icon: 'icon' }`
- [x] Verify `body` ref has appropriate data-name

**Status: DONE** ✓

---

### Steps (`runes/marketing/src/tags/steps.ts`)

**Current state:** Has editHints and autoLabel for section-level fields.

**Changes needed:**
- None at section level — already has pageSectionAutoLabel and editHints for headline, eyebrow, blurb

**Status: DONE** ✓

---

### Step (nested in `runes/marketing/src/tags/steps.ts`)

**Current state:** No editHints. Manually sets `data-name='content'` and `data-name='media'` on wrapper divs. Uses `SplitLayoutModel`.

**Changes needed:**
- [x] Move manual `data-name` assignments to `refs` in `createComponentRenderable`
- [x] Add editHints: `{ content: 'none', media: 'image' }`

**Status: DONE** ✓

---

### Pricing (`runes/marketing/src/tags/pricing.ts`)

**Current state:** Has editHints and autoLabel for section-level fields. Manually sets `data-layout` and `data-columns` on ul element.

**Changes needed:**
- [x] Review whether `data-layout` and `data-columns` on the tiersList ul should be standard modifiers/properties
- [x] Verify section-level editHints coverage

**Status: DONE** ✓

---

### Tier / FeaturedTier (nested in `runes/marketing/src/tags/pricing.ts`)

**Current state:** No editHints. Properties include `name` (h1), `description`, `price` (p), `currency` (meta), `url` (anchor). Refs include `body`.

**Changes needed:**
- [x] Move visible elements (`name`, `price`) from `properties` to `refs` so they get `data-name` instead of `data-field`
- [x] Add editHints: `{ name: 'inline', price: 'inline' }`

**Status: DONE** ✓

---

### Testimonial (`runes/marketing/src/tags/testimonial.ts`)

**Current state:** No editHints, no autoLabel. **Critical issues:**
- Manually sets `data-field='author-name'` and `data-field='author-role'` on created spans (lines 44, 55) — should use `refs` / `data-name`
- No refs defined at all — everything is in properties

**Changes needed:**
- [x] Move `quote`, `authorName`, `authorRole`, `avatar` from properties to refs
- [x] Remove manual `data-field` assignments (lines 44, 55) — let `createComponentRenderable` handle via refs
- [x] Keep `rating` as property (modifier/meta value)
- [x] Add editHints: `{ 'author-name': 'inline', 'author-role': 'inline', avatar: 'image', quote: 'inline' }`
- [x] Add autoLabel for blockquote → quote mapping

**Status: DONE** ✓

---

### Comparison (`runes/marketing/src/tags/comparison.ts`)

**Current state:** No editHints. Has pageSectionProperties for header. Complex postTransform.

**Changes needed:**
- [x] Add editHints for section-level fields: `{ headline: 'inline', eyebrow: 'inline', blurb: 'inline' }`
- [x] Add autoLabel with pageSectionAutoLabel

**Status: DONE** ✓

---

### ComparisonColumn (nested in `runes/marketing/src/tags/comparison.ts`)

**Current state:** No editHints. Properties include `name` (span), `highlighted` (meta), `row` items. Refs include `body`.

**Changes needed:**
- [x] Move `name` from properties to refs so it gets `data-name`
- [x] Add editHints: `{ name: 'inline' }`

**Status: DONE** ✓

---

### ComparisonRow (nested in `runes/marketing/src/tags/comparison.ts`)

**Current state:** No editHints. Properties include `label` (span), `rowType` (meta). Refs include `body`.

**Changes needed:**
- [x] Move `label` from properties to refs
- [x] Add editHints: `{ label: 'inline', body: 'inline' }`

**Status: DONE** ✓

---

## Package: `@refrakt-md/docs`

### Api (`runes/docs/src/tags/api.ts`)

**Current state:** Has editHints. Properties include `method`, `path`, `auth` (meta tags). Refs include `body`. Config has structure with `method` (span), `path` (code), `auth` (span) structure entries.

**Changes needed:**
- [x] Add editHints: `{ body: 'none', method: 'none', path: 'none', auth: 'none' }` — structure elements are attribute-driven, not directly editable

**Status: DONE** ✓

---

### Symbol (`runes/docs/src/tags/symbol.ts`)

**Current state:** Has editHints and autoLabel. Properties include `kind`, `lang`, `since`, `deprecated`, `source`. Refs include `body`, `headline` (via pageSectionProperties). Config has rich structure with `kind-badge`, `lang-badge`, `since-badge`, `deprecated-badge`, `source-link`.

**Changes needed:**
- [x] Add editHints: `{ headline: 'inline', body: 'none', 'kind-badge': 'none', 'lang-badge': 'none', 'since-badge': 'none', 'deprecated-badge': 'none', 'source-link': 'link' }`
- [x] Add autoLabel with pageSectionAutoLabel

**Status: DONE** ✓

---

### SymbolGroup (nested in `runes/docs/src/tags/symbol.ts`)

**Current state:** Has editHints. `label` in refs. Refs include `label`, `body`.

**Changes needed:**
- [x] Move `label` from properties to refs
- [x] Add editHints: `{ label: 'inline', body: 'none' }`

**Status: DONE** ✓

---

### SymbolMember (nested in `runes/docs/src/tags/symbol.ts`)

**Current state:** Has editHints. `name` in refs. Refs include `name`, `body`.

**Changes needed:**
- [x] Move `name` from properties to refs
- [x] Add editHints: `{ name: 'inline', body: 'none' }`

**Status: DONE** ✓

---

### Changelog (`runes/docs/src/tags/changelog.ts`)

**Current state:** Has editHints and autoLabel. Properties include `project`, `release` items. Refs include `releases`.

**Changes needed:**
- [x] Add editHints: `{ headline: 'inline', releases: 'none' }`
- [x] Add autoLabel with pageSectionAutoLabel

**Status: DONE** ✓

---

### ChangelogRelease (nested in `runes/docs/src/tags/changelog.ts`)

**Current state:** Has editHints. `version` moved to refs. Properties include `date`. Refs include `version`, `body`.

**Changes needed:**
- [x] Move `version` from properties to refs
- [x] Add editHints: `{ version: 'inline', body: 'none' }`

**Status: DONE** ✓

---

## Package: `@refrakt-md/design`

### Swatch (`runes/design/src/tags/swatch.ts`)

**Current state:** No editHints. Inline rune (attributes only). Refs include `chip`, `value`. Properties include `color`, `label`, `showValue`.

**Changes needed:**
- [x] Add editHints: `{ chip: 'none', value: 'none' }` — attribute-driven, not content-editable
- [x] This is an inline rune with minimal editor surface

**Status: DONE** ✓

---

### Palette (`runes/design/src/tags/palette.ts`)

**Current state:** No editHints. Uses `data-name` extensively on generated elements for groups, swatches, scales. Properties include `title`, `showContrast`, `showA11y`, `columns`.

**Changes needed:**
- [x] Add editHints for generated `data-name` elements: `{ 'group-title': 'none', 'swatch-color': 'none', 'swatch-name': 'none', 'swatch-value': 'none', grid: 'none', scale: 'none' }`
- [x] Most content is generated from list parsing — editor should mark these as `'none'`

**Status: DONE** ✓

---

### Typography (`runes/design/src/tags/typography.ts`)

**Current state:** No editHints. Uses `data-name` extensively on generated specimens, sizes, weights. Properties include `title`, `showSizes`, `showWeights`, `showCharset`.

**Changes needed:**
- [x] Add editHints: `{ title: 'none', specimen: 'none', specimens: 'none', sizes: 'none', weights: 'none', charset: 'none' }`
- [x] All content is generated from definition list parsing — entirely non-editable inline

**Status: DONE** ✓

---

### Spacing (`runes/design/src/tags/spacing.ts`)

**Current state:** No editHints. Uses `data-name` extensively on generated scale items, radii, shadows. Properties include `title`.

**Changes needed:**
- [x] Add editHints: `{ title: 'none', section: 'none', scale: 'none', radii: 'none', shadows: 'none' }`
- [x] All content is generated from list parsing — entirely non-editable inline

**Status: DONE** ✓

---

### Preview (`runes/design/src/tags/preview.ts`)

**Current state:** No editHints. **Legacy issue:** postTransform in config reads `data-field` attributes (`data-field="source"`, `data-field="themed-source"`) on lines 52, 59, 68 of `runes/design/src/config.ts`.

**Changes needed:**
- [x] Migrate `data-field` usage in postTransform to `data-name` pattern
- [x] Add editHints: `{ source: 'code' }` — the preview source should be code-editable
- [x] Update test expectations that check for `data-field` on `pre` elements
- [x] Move `source` and `htmlSource` from properties to refs in schema

**Status: DONE** ✓

---

### Mockup (`runes/design/src/tags/mockup.ts`)

**Current state:** No editHints. Refs include `viewport`. Properties include `device`, `color`, `statusBar`, `label`, `url`, `scale`, `fit`. PostTransform generates device chrome.

**Changes needed:**
- [x] Add editHints: `{ viewport: 'none' }` — content is the child markup
- [x] Device chrome is postTransform-generated, not directly editable

**Status: DONE** ✓

---

### DesignContext (`runes/design/src/tags/design-context.ts`)

**Current state:** No editHints. Uses `data-name="title"` and `data-name="sections"` manually. Properties include `title`, `tokens`, `scope`.

**Changes needed:**
- [x] Add editHints: `{ title: 'none', sections: 'none' }` — container for child design runes
- [x] Move manual `data-name` assignments to refs in `createComponentRenderable`

**Status: DONE** ✓

---

## Package: `@refrakt-md/storytelling`

### Character (`runes/storytelling/src/tags/character.ts`)

**Current state:** No editHints. Properties include `name`, `role`, `status`, `aliases`, `tags`. Refs include `portrait` (optional), `sections`/`body`.

**Changes needed:**
- [x] Move `name` from properties to refs (visible span should use `data-name`)
- [x] Add editHints: `{ name: 'inline', portrait: 'image', body: 'none', sections: 'none' }`
- [x] Add autoLabel for section headers

**Status: DONE** ✓

---

### CharacterSection (nested)

**Current state:** No editHints. AutoLabel `{ span: 'header' }`. Properties include `name`. Refs include `body`.

**Changes needed:**
- [x] Move `name` from properties to refs
- [x] Add editHints: `{ header: 'inline', name: 'inline', body: 'none' }`

**Status: DONE** ✓

---

### Realm (`runes/storytelling/src/tags/realm.ts`)

**Current state:** No editHints. Properties include `name`, `realmType`, `scale`, `tags`, `parent`. Refs include `scene` (optional), `sections`/`body`.

**Changes needed:**
- [x] Move `name` from properties to refs
- [x] Add editHints: `{ name: 'inline', scene: 'image', body: 'none', sections: 'none' }`

**Status: DONE** ✓

---

### RealmSection (nested)

**Current state:** No editHints. AutoLabel `{ span: 'header' }`. Properties include `name`. Refs include `body`.

**Changes needed:**
- [x] Move `name` from properties to refs
- [x] Add editHints: `{ header: 'inline', name: 'inline', body: 'none' }`

**Status: DONE** ✓

---

### Faction (`runes/storytelling/src/tags/faction.ts`)

**Current state:** No editHints. Properties include `name`, `factionType`, `alignment`, `size`, `tags`. Refs include `sections`/`body`.

**Changes needed:**
- [x] Move `name` from properties to refs
- [x] Add editHints: `{ name: 'inline', body: 'none', sections: 'none' }`

**Status: DONE** ✓

---

### FactionSection (nested)

**Current state:** No editHints. AutoLabel `{ span: 'header' }`. Properties include `name`. Refs include `body`.

**Changes needed:**
- [x] Move `name` from properties to refs
- [x] Add editHints: `{ header: 'inline', name: 'inline', body: 'none' }`

**Status: DONE** ✓

---

### Lore (`runes/storytelling/src/tags/lore.ts`)

**Current state:** No editHints. Properties include `title`, `category`, `spoiler`, `tags`. Refs include `body`.

**Changes needed:**
- [x] Move `title` from properties to refs (visible span should use `data-name`)
- [x] Add editHints: `{ title: 'inline', body: 'none' }`

**Status: DONE** ✓

---

### Plot (`runes/storytelling/src/tags/plot.ts`)

**Current state:** No editHints. Properties include `title`, `plotType`, `structure`, `tags`, `beat` items. Refs include `beats`.

**Changes needed:**
- [x] Move `title` from properties to refs
- [x] Add editHints: `{ title: 'inline', beats: 'none' }`

**Status: DONE** ✓

---

### Beat (nested in `runes/storytelling/src/tags/plot.ts`)

**Current state:** No editHints. Properties include `label`, `status`, `id`, `track`, `follows`. Refs include `body`.

**Changes needed:**
- [x] Move `label` from properties to refs
- [x] Add editHints: `{ label: 'inline', body: 'none' }`

**Status: DONE** ✓

---

### Bond (`runes/storytelling/src/tags/bond.ts`)

**Current state:** No editHints. Uses `data-name="connector"` and `data-name="arrow"` manually. Properties include `from`, `to`, `bondType`, `status`, `bidirectional`. Refs include `connector`, `body`.

**Changes needed:**
- [x] Move `from`, `to` from properties to refs (visible spans)
- [x] Add editHints: `{ from: 'inline', to: 'inline', connector: 'none', arrow: 'none', body: 'none' }`

**Status: DONE** ✓

---

### Storyboard (`runes/storytelling/src/tags/storyboard.ts`)

**Current state:** No editHints. Properties include `panel` items, `variant`, `columns`. Refs include `panels`.

**Changes needed:**
- [x] Add editHints: `{ panels: 'none' }`

**Status: DONE** ✓

---

### StoryboardPanel (nested)

**Current state:** No editHints. Properties include `image`, `caption`. Refs include `body`.

**Changes needed:**
- [x] Move `image` from properties to refs
- [x] Move `caption` from properties to refs
- [x] Add editHints: `{ image: 'image', caption: 'inline', body: 'none' }`

**Status: DONE** ✓

---

## Package: `@refrakt-md/learning`

### HowTo (`runes/learning/src/tags/howto.ts`)

**Current state:** No editHints. Properties include `estimatedTime`, `difficulty`. Refs include header elements (via pageSectionProperties), `tools`, `steps`. Config has structure with `meta-item` entries.

**Changes needed:**
- [x] Add autoLabel with pageSectionAutoLabel
- [x] Add editHints: `{ headline: 'inline', eyebrow: 'inline', blurb: 'inline', tool: 'inline', step: 'inline' }`
- [x] Set `data-name` on tool and step list items in schema (following recipe pattern)

**Status: DONE** ✓

---

## Package: `@refrakt-md/business`

### Cast (`runes/business/src/tags/cast.ts`)

**Current state:** No editHints. Uses pageSectionProperties for header. Properties include `member` items, `layout`. Refs include `header`, `members`.

**Changes needed:**
- [x] Add autoLabel with pageSectionAutoLabel
- [x] Add editHints: `{ headline: 'inline', eyebrow: 'inline', blurb: 'inline', members: 'none' }`

**Status: DONE** ✓

---

### CastMember (nested)

**Current state:** No editHints. Properties include `name` (span), `role` (span). Refs include `body`.

**Changes needed:**
- [x] Move `name`, `role` from properties to refs
- [x] Add editHints: `{ name: 'inline', role: 'inline', body: 'none' }`

**Status: DONE** ✓

---

### Organization (`runes/business/src/tags/organization.ts`)

**Current state:** No editHints. Uses pageSectionProperties. Properties include `type`. Refs include `headline`, `blurb`, `body`.

**Changes needed:**
- [x] Add autoLabel with pageSectionAutoLabel
- [x] Add editHints: `{ headline: 'inline', blurb: 'inline', body: 'none' }`

**Status: DONE** ✓

---

### Timeline (`runes/business/src/tags/timeline.ts`)

**Current state:** No editHints. Uses pageSectionProperties. Properties include `direction`, `entry` items. Refs include `headline`, `blurb`, `entries`.

**Changes needed:**
- [x] Add autoLabel with pageSectionAutoLabel
- [x] Add editHints: `{ headline: 'inline', blurb: 'inline', entries: 'none' }`

**Status: DONE** ✓

---

### TimelineEntry (nested)

**Current state:** No editHints. Properties include `date` (time tag), `label` (span). Refs include `body`.

**Changes needed:**
- [x] Move `date`, `label` from properties to refs (visible elements)
- [x] Add editHints: `{ date: 'inline', label: 'inline', body: 'none' }`

**Status: DONE** ✓

---

## Package: `@refrakt-md/places`

### Event (`runes/places/src/tags/event.ts`)

**Current state:** No editHints. Uses pageSectionProperties. Properties include `date`, `endDate`, `location`, `url`. Config has rich structure with `detail`, `label`, `value`, `end-date`, `register` refs.

**Changes needed:**
- [x] Add autoLabel with pageSectionAutoLabel
- [x] Add editHints: `{ headline: 'inline', blurb: 'inline', body: 'none', detail: 'none', label: 'none', value: 'none', 'end-date': 'none', register: 'link' }`

**Status: DONE** ✓

---

### Itinerary (`runes/places/src/tags/itinerary.ts`)

**Current state:** No editHints. Uses pageSectionProperties. Properties include `variant`, `direction`, `day` items. Refs include `headline`, `blurb`, `days`.

**Changes needed:**
- [x] Add autoLabel with pageSectionAutoLabel
- [x] Add editHints: `{ headline: 'inline', blurb: 'inline', days: 'none' }`

**Status: DONE** ✓

---

### ItineraryDay (nested)

**Current state:** No editHints. AutoLabel `{ label: 'header' }`. Properties include `label`, `date`, `stop` items. Refs include `stops`.

**Changes needed:**
- [x] Add editHints: `{ header: 'inline', stops: 'none' }`

**Status: DONE** ✓

---

### ItineraryStop (nested)

**Current state:** No editHints. AutoLabel `{ time: 'time', location: 'location' }`. Properties include `time`, `location`, `duration`, `activity`, `lat`, `lng`. Refs include `body`.

**Changes needed:**
- [x] Add editHints: `{ time: 'none', location: 'none', body: 'none' }`

**Status: DONE** ✓

---

### Map (`runes/places/src/tags/map.ts`)

**Current state:** No editHints. **Legacy issue:** Config postTransform reads `data-field` attribute on children (line 84 of `runes/places/src/config.ts`). Properties include `zoom`, `center`, `variant`, `height`, `provider`, `interactive`, `route`, `cluster`, `pin` items. Refs include `pins`.

**Changes needed:**
- [x] Replace `data-field` reads in config postTransform with `findMeta` helper pattern
- [x] Add editHints: `{ pins: 'none' }` — map is web component–rendered
- [x] Update tests that check for `data-field` on meta children

**Status: DONE** ✓

---

### MapPin (nested)

**Current state:** No editHints. Purely attribute-driven via `parseLocationItem()`. Properties include `name`, `description`, `lat`, `lng`, `address`, `url`, `group`. No refs.

**Changes needed:**
- [x] Move `name`, `description` from properties to refs (visible spans)
- [x] Add editHints: `{ name: 'inline', description: 'inline' }`
- [x] Update tests that check for `data-field` on name/description spans

**Status: DONE** ✓

---

## Package: `@refrakt-md/media`

### Audio (`runes/media/src/tags/audio.ts`)

**Current state:** No editHints. Uses `data-name='description'` manually on div. Properties include `waveform`. Custom web component rendering.

**Changes needed:**
- [x] Move manual `data-name` to refs in `createComponentRenderable`
- [x] Add editHints: `{ description: 'inline' }`

**Status: DONE** ✓

---

### Playlist (`runes/media/src/tags/playlist.ts`)

**Current state:** No editHints. **Legacy issues:**
- Uses `data-field: 'id'` on meta tag (line 190) — should use `property` attribute
- Sets `data-rune: 'track'` on child track elements (line 131) — children should not have manual `data-rune`

Uses `data-name` for `header`, `title`, `tracks`, `player`.

**Changes needed:**
- [x] Replace `data-field: 'id'` with `data-name: 'id'` on meta
- [x] Remove manual `data-rune: 'track'` on children — let identity transform handle typeof dispatch
- [x] Add editHints: `{ title: 'inline', header: 'none', tracks: 'none', player: 'none' }`

**Status: DONE** ✓

---

### Track (`runes/media/src/tags/track.ts`)

**Current state:** No editHints. Uses `data-name` for `track-name`, `track-artist`, `track-duration`, `track-meta`, `track-description`. Properties include `name`, `artist`, `duration`, `url`, `position`, `datePublished`, `type`.

**Changes needed:**
- [x] Add editHints: `{ 'track-name': 'inline', 'track-artist': 'inline', 'track-description': 'inline', 'track-duration': 'none', 'track-meta': 'none' }`

**Status: DONE** ✓

---

## Package: `@refrakt-md/runes` (Core)

### Hint (`packages/runes/src/tags/hint.ts`)

**Current state:** No editHints. Config has structure with `icon` (ref) and `title` (ref, metaText) in header. Modifier: `hintType`.

**Changes needed:**
- [x] Add editHints: `{ icon: 'none', title: 'none' }` — structure-injected, attribute-driven

**Status: DONE** ✓

---

### Details (`packages/runes/src/tags/details.ts`)

**Current state:** No editHints. AutoLabel `{ summary: 'summary' }`. Refs include `body`.

**Changes needed:**
- [x] Add editHints: `{ summary: 'inline', body: 'none' }`

**Status: DONE** ✓

---

### Accordion (`packages/runes/src/tags/accordion.ts`)

**Current state:** No editHints. AutoLabel includes pageSectionAutoLabel. Sections contentModel converts headings to accordion-item tags.

**Changes needed:**
- [x] Add editHints: `{ headline: 'inline', eyebrow: 'inline', blurb: 'inline' }`

**Status: DONE** ✓

---

### AccordionItem (nested)

**Current state:** No editHints. AutoLabel `{ name: 'header' }`. Refs include `body`.

**Changes needed:**
- [x] Add editHints: `{ header: 'inline', body: 'none' }`

**Status: DONE** ✓

---

### TabGroup (`packages/runes/src/tags/tabs.ts`)

**Current state:** AutoLabel includes pageSectionAutoLabel. No explicit editHints.

**Changes needed:**
- [x] Add editHints: `{ headline: 'inline', eyebrow: 'inline', blurb: 'inline' }`

**Status: DONE** ✓

---

### Tab (nested)

**Current state:** No editHints. `name` already in refs (tabs.ts). `image` in properties.

**Changes needed:**
- [x] Add editHints: `{ name: 'inline' }`

**Status: DONE** ✓

---

### CodeGroup (`packages/runes/src/tags/codegroup.ts`)

**Current state:** Has `editHints: { panel: 'code' }`. Structure includes topbar with `title` ref.

**Changes needed:**
- [x] Add `title: 'none'` to editHints (structure-injected from attribute)

**Status: DONE** ✓

---

### Grid (`packages/runes/src/tags/grid.ts`)

**Current state:** No editHints, no autoLabel. Modifiers: mode, collapse, aspect, gap, columns, padding, maxWidth, valign. Refs include `cell`.

**Changes needed:**
- [x] Add editHints: `{ cell: 'none' }` — cells contain other runes

**Status: DONE** ✓

---

### Figure (`packages/runes/src/tags/figure.ts`)

**Current state:** No editHints. Properties include `caption`, `size`, `align`. No refs.

**Changes needed:**
- [x] Move `caption` from properties to refs
- [x] Add editHints: `{ caption: 'inline' }`

**Status: DONE** ✓

---

### Gallery (in config)

**Current state:** No editHints. Modifiers: layout, lightbox, gap, columns. Refs include `items`.

**Changes needed:**
- [x] Add editHints: `{ items: 'none' }` — items are figure elements

**Status: DONE** ✓

---

### Showcase (`packages/runes/src/tags/showcase.ts`)

**Current state:** No editHints. Properties include `shadow`, `bleed`, `aspect`, `offset`, `place`. Refs include `viewport`.

**Changes needed:**
- [x] Add editHints: `{ viewport: 'none' }` — viewport wraps child content

**Status: DONE** ✓

---

### Embed (`packages/runes/src/tags/embed.ts`)

**Current state:** No editHints. PostTransform handles URL detection and iframe generation. Refs include `fallback`.

**Changes needed:**
- [x] Add editHints: `{ fallback: 'none' }` — postTransform-generated

**Status: DONE** ✓

---

### PullQuote (in config)

**Current state:** No editHints. Modifiers: align, variant. Properties set in schema.

**Changes needed:**
- [x] Add editHints: `{ body: 'inline' }`

**Status: DONE** ✓

---

### TextBlock (in config)

**Current state:** No editHints. Modifiers: dropcap, columns, lead, align. Refs include `body`.

**Changes needed:**
- [x] Add editHints: `{ body: 'none' }` — content is the child text

**Status: DONE** ✓

---

### MediaText (in config)

**Current state:** No editHints. Modifiers: align, ratio, wrap. Refs include `media`, `body`.

**Changes needed:**
- [x] Add editHints: `{ media: 'image', body: 'none' }`

**Status: DONE** ✓

---

### Sidenote (in config)

**Current state:** No editHints. Modifier: variant. Refs include `body`.

**Changes needed:**
- [x] Add editHints: `{ body: 'inline' }`

**Status: DONE** ✓

---

### Compare (in config)

**Current state:** No editHints. Modifier: layout. Refs include `panels`.

**Changes needed:**
- [x] Add editHints: `{ panels: 'none' }` — panels contain child runes

**Status: DONE** ✓

---

### Conversation (in config)

**Current state:** No editHints. Custom contentModel converts blockquotes to messages. Refs include `messages`.

**Changes needed:**
- [x] Add editHints: `{ messages: 'none' }`

**Status: DONE** ✓

---

### ConversationMessage (nested)

**Current state:** No editHints. Modifier: align. Refs include `body`.

**Changes needed:**
- [x] Add editHints: `{ body: 'inline' }`

**Status: DONE** ✓

---

### Annotate (in config)

**Current state:** No editHints. Modifier: variant. Refs include `body`, `notes`.

**Changes needed:**
- [x] Add editHints: `{ body: 'none', notes: 'none' }`

**Status: DONE** ✓

---

### AnnotateNote (nested)

**Current state:** No editHints. Refs include `body`.

**Changes needed:**
- [x] Add editHints: `{ body: 'inline' }`

**Status: DONE** ✓

---

### DataTable (`packages/runes/src/tags/datatable.ts`)

**Current state:** No editHints. Modifiers: searchable, sortable, pageSize, defaultSort. Refs include `table`.

**Changes needed:**
- [x] Add editHints: `{ table: 'none' }` — table is standard markdown table

**Status: DONE** ✓

---

### Form (`packages/runes/src/tags/form.ts`)

**Current state:** No editHints. Complex custom contentModel with type inference. Modifiers: variant, action, method, success, error, honeypot. Refs include `body`. PostTransform generates footer.

**Changes needed:**
- [x] Add editHints: `{ body: 'none' }` — form fields are complex custom contentModel

**Status: DONE** ✓

---

### Reveal (in config)

**Current state:** No editHints. AutoLabel includes pageSectionAutoLabel. Sections contentModel. Refs include `steps`.

**Changes needed:**
- [x] Add editHints: `{ headline: 'inline', eyebrow: 'inline', blurb: 'inline', steps: 'none' }`

**Status: DONE** ✓

---

### RevealStep (nested)

**Current state:** No editHints. Refs include `body`.

**Changes needed:**
- [x] Add editHints: `{ body: 'none' }`

**Status: DONE** ✓

---

### Diff (in config)

**Current state:** No editHints. Entirely postTransform-generated with `data-name` elements (line, gutter-num, gutter-prefix, line-content).

**Changes needed:**
- [x] Add editHints: `{ line: 'none', 'gutter-num': 'none', 'gutter-prefix': 'none', 'line-content': 'none' }` — all generated

**Status: DONE** ✓

---

### Chart (in config)

**Current state:** No editHints. Entirely postTransform-generated SVG.

**Changes needed:**
- [x] Add editHints: `{ data: 'none' }` — chart is generated from table data

**Status: DONE** ✓

---

### Diagram (in config)

**Current state:** No editHints. PostTransform-generated.

**Changes needed:**
- [x] Add editHints: `{ source: 'code' }` — diagram source should be code-editable

**Status: DONE** ✓

---

### Sandbox (in config)

**Current state:** No editHints. PostTransform-generated source panels.

**Changes needed:**
- [x] Add editHints: `{ source: 'code' }`

**Status: DONE** ✓

---

### Budget (in config)

**Current state:** No editHints. Structure includes `header` with `title`, `meta`, `meta-item` refs. PostTransform generates footer.

**Changes needed:**
- [x] Add editHints: `{ title: 'none', meta: 'none', 'meta-item': 'none' }` — all structure/attribute-driven

**Status: DONE** ✓

---

### BudgetCategory / BudgetLineItem (nested)

**Current state:** No editHints. Processed entirely in postTransform.

**Changes needed:**
- [x] Add editHints to BudgetCategory: `{ label: 'none', subtotal: 'none' }`
- BudgetLineItem left unchanged (entirely postTransform-built)

**Status: DONE** ✓

---

### Nav / NavGroup / NavItem

**Current state:** No editHints. Complex custom processing with headingsToList. NavItem uses `data-field: 'slug'` in schema.

**Changes needed:**
- Nav/NavGroup/NavItem left unchanged — `data-field: 'slug'` is consumed by postTransform and removed from DOM (not a visible structural element); no editor benefit from changing

**Status: DONE** ✓ (no changes needed)

---

### Breadcrumb / BreadcrumbItem

**Current state:** No editHints. Auto mode uses sentinel. Primarily generated content.

**Changes needed:**
- [x] Add editHints to Breadcrumb: `{ items: 'none' }`
- BreadcrumbItem left unchanged (auto-generated)

**Status: DONE** ✓

---

## Cross-Cutting Issues

### 1. `data-field` in `createComponentRenderable`

The `createComponentRenderable` function itself (at `packages/runes/src/lib/component.ts:34`) sets `data-field` on properties. This is the standard behavior — properties are modifier/meta values consumed by the engine. The issue is when runes put **visible, structural elements** in `properties` instead of `refs`. The fix for each rune is to move visible elements to `refs`.

### 2. `data-field` in `packages/runes/src/config.ts`

The core config uses `data-field` reads in several postTransform helpers (lines 66, 147, 355, 772, 804, 873, 905). These are internal engine patterns for reading property metadata and may need separate assessment for whether they should migrate to a different attribute.

### 3. Test Updates

Many tests across all packages assert on `data-field` values. When runes are updated to use `refs`/`data-name`, corresponding tests must be updated. This is a significant portion of the work.

### 4. Priority Order

Recommended implementation order:
1. ~~**Marketing** (Testimonial, Bento, Tier, Comparison*)~~ — **DONE** ✓
2. ~~**Core** (Hint, Details, Accordion, Tabs, Figure, Grid, etc.)~~ — **DONE** ✓
3. ~~**Docs** (Api, Symbol, Changelog)~~ — **DONE** ✓
4. ~~**Learning** (HowTo) — follows recipe pattern closely~~ — **DONE** ✓
5. ~~**Business** (Cast, Organization, Timeline) — straightforward~~ — **DONE** ✓
6. ~~**Places** (Event, Itinerary, Map) — Map has legacy `data-field` issue~~ — **DONE** ✓
7. ~~**Storytelling** (Character, Realm, Faction, Lore, Plot, Bond, Storyboard) — many runes, consistent pattern~~ — **DONE** ✓
8. **Design** (Palette, Typography, Spacing, Preview, Mockup) — mostly generated content
9. ~~**Media** (Playlist, Track, Audio) — legacy issues in Playlist~~ — **DONE** ✓

{% /spec %}
