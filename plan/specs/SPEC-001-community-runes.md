{% spec id="SPEC-001" status="accepted" tags="packages, ecosystem" %}

# Community Runes — Specification

Package system, namespacing, rune extension, ecosystem architecture

---

## Overview

Community runes are published packages that add domain-specific content types to refrakt.md. They go through the full rendering pipeline — parsing, rune transform, identity transform, theming — and are treated identically to core runes by the system. The only difference is where the rune definition comes from.

Community runes exist because some content types are too domain-specific for the core library but too widely shared to be local rune declarations. A D&D 5e stat block is used by thousands of game masters. A screenplay scene heading is used by thousands of screenwriters. These deserve proper packages with transforms, theme integration, inspector fixtures, and documentation.

---

## Rune Tiers

| Tier | Scope | Maintained by | Install | Examples |
|---|---|---|---|---|
| Core | Universal primitives, ships with refrakt.md | refrakt.md team | Built-in, always available | hint, tabs, figure, datatable, budget |
| Official packages | Domain-specific rune sets, maintained by refrakt.md | refrakt.md team | `npm install @refrakt-md/...` | `@refrakt-md/landing`, `@refrakt-md/storytelling` |
| Community packages | Domain-specific rune sets, maintained by third parties | Community authors | `npm install @refrakt-community/...` | `@refrakt-community/dnd-5e`, `@refrakt-community/screenplay` |
| Local | Per-project declarations | Project author | Config only | A custom product card, a pricing calculator |

All tiers produce runes that are indistinguishable to the rendering pipeline. A `{% stat-block %}` from a community package goes through the same parse → rune transform → identity transform → render chain as a `{% hint %}` from the core.

The `@refrakt-md/` namespace signals official packages maintained by the refrakt.md team. `@refrakt-community/` signals third-party packages. Both go through the same pipeline. The distinction is trust and maintenance commitment, not technical capability.

### New Project Defaults

New projects include official packages relevant to their use case. "Starting a landing page" pre-installs `@refrakt-md/landing`. "Starting a docs site" pre-installs `@refrakt-md/docs`. Users can remove packages they don't need or add community packages. Core runes are always available and cannot be removed.

---

## Package Inventory

### Core (~27 runes, built-in)

Runes that nearly every refrakt.md project uses regardless of domain. These are content-type primitives — tools for structuring and presenting information, not tied to any specific audience.

**Prose & Formatting**

| Rune | Aliases | Purpose |
|---|---|---|
| `hint` | `callout`, `alert` | Contextual message (note, warning, caution, check) |
| `details` | — | Collapsible content with summary label |
| `figure` | — | Image with caption |
| `sidenote` | `footnote`, `marginnote` | Margin note content |
| `annotate` | — | Main content with margin annotations |
| `pullquote` | — | Styled excerpt for visual emphasis |
| `textblock` | — | Styled block of text (lead, aside, boxed) |
| `mediatext` | — | Text alongside media layout |
| `reveal` | — | Progressive disclosure steps |
| `conversation` | `dialogue`, `chat` | Speaker-attributed dialogue |
| `embed` | — | Auto-detected media embeds (YouTube, Vimeo, Twitter, CodePen, Spotify) |
| `gallery` | — | Multi-image container with grid/carousel layout and lightbox |
| `stat` | `metric` | Key metric display — big number with label and optional trend indicator |

**Navigation & Structure**

| Rune | Aliases | Purpose |
|---|---|---|
| `grid` | `columns` | Multi-column layout |
| `tabs` | — | Tabbed content panels |
| `accordion` | `faq` | Collapsible sections (FAQ support) |
| `toc` | `table-of-contents` | Auto-generated table of contents |
| `breadcrumb` | — | Breadcrumb navigation path |
| `nav` | — | Navigation groups with page references |
| `layout` / `region` | — | Page layout definitions and named content blocks |
| `icon` | — | Inline SVG from theme icon registry |

**Data & Code**

| Rune | Aliases | Purpose |
|---|---|---|
| `datatable` | `data-table` | Interactive table with sorting, filtering, pagination |
| `chart` | — | Data visualization from table data |
| `diagram` | — | Mermaid, PlantUML, ASCII art diagrams |
| `math` | `equation`, `formula` | Mathematical notation via KaTeX/LaTeX syntax |
| `budget` | — | 3-level cost breakdown with auto-calculated totals |
| `codegroup` | — | Language-tabbed code blocks |
| `compare` | — | Side-by-side comparison panels |
| `diff` | — | Before/after code comparison |
| `sandbox` | — | Isolated HTML/CSS/JS with optional framework loading |
| `form` | `contact-form` | Interactive form from list-based field definitions |

### `@refrakt-md/marketing` (8 runes)

Marketing sites, product pages, landing pages. If you're building a website that needs to sell, convert, or present a business, you need these. If you're writing docs or a blog, you don't.

| Rune | Aliases | Purpose |
|---|---|---|
| `hero` | — | Hero section with title, subtitle, action buttons |
| `cta` | `call-to-action` | Call-to-action block with headline and buttons |
| `bento` | — | Bento grid layout with sized cells |
| `feature` | — | Feature section with icon/name/description items |
| `steps` | — | Step-by-step process visualization |
| `pricing` | — | Pricing tiers with feature lists |
| `testimonial` | `review` | Customer testimonials with attribution |
| `comparison` | `versus`, `vs` | Feature comparison grid with positive/negative indicators |

### `@refrakt-md/docs` (3 runes)

Developer documentation. API references, code documentation, changelogs.

| Rune | Aliases | Purpose |
|---|---|---|
| `api` | `endpoint` | API endpoint with method, parameters, request/response |
| `symbol` | — | Code construct documentation (functions, classes, types) |
| `changelog` | — | Versioned change history with categorized entries |

### `@refrakt-md/learning` (8 runes)

Structured educational and instructional content. Courses, tutorials, training materials, how-to guides, recipes.

| Rune | Aliases | Purpose | Schema.org |
|---|---|---|---|
| `howto` | `how-to` | Step-by-step instructions with tools/materials | `HowTo` |
| `recipe` | — | Ingredients, steps, chef tips — a specialised instructional format for food | `Recipe` |
| `concept` | `definition` | Term definition with explanation and related concepts | `DefinedTerm` |
| `exercise` | — | Practice problem with prompt, hints, and revealable solution | — |
| `quiz` | — | Assessment with questions, answer options, and scoring | `Quiz` |
| `glossary` | — | Collection of terms with definitions, auto-linked across the site | `DefinedTermSet` |
| `prerequisite` | — | Declares dependencies between content ("complete X before this lesson") | — |
| `objective` | `learning-outcome` | Learning outcome statement ("after this lesson you will be able to...") | — |

**Audience:** Online course creators, tutorial authors, technical educators, bootcamp instructors, corporate training teams, cooking course sites, documentation teams writing getting-started guides.

**Implementation note:** `glossary` (auto-linking terms across the site) and `prerequisite` (dependency graph between content) require build pipeline integration beyond standard rune transforms. These runes are simple to render individually but their full power — site-wide term linking and learning path visualisation — depends on cross-page awareness at build time.

Runes compose naturally within a lesson page: `objective` at the top declares what the student will learn, `concept` runes introduce new terminology, `howto` or `recipe` runes teach procedures, `exercise` runes provide practice, and a `quiz` at the end tests retention. A `glossary` page collects all `concept` definitions and auto-links terms wherever they appear across the site. `prerequisite` runes build a dependency graph between lessons that themes can render as a learning path.

### `@refrakt-md/storytelling` (7 runes)

Writers, game masters, TTRPG players, worldbuilders. See the Storytelling Runes specification for full details.

| Rune | Purpose |
|---|---|
| `character` | Structured character profiles scaling from NPC sketch to full protagonist |
| `realm` | Place cards with atmosphere and sensory detail |
| `faction` | Groups with goals, resources, and relationships |
| `lore` | Worldbuilding knowledge with spoiler support |
| `plot` | Narrative structure with trackable story beats |
| `bond` | Connections between entities, relationship map data |
| `storyboard` | Visual panels with captions for sequential storytelling |

### `@refrakt-md/places` (3 runes)

Places, events, and journeys. Geographic and time-based real-world content.

| Rune | Aliases | Purpose | Schema.org |
|---|---|---|---|
| `event` | — | Event with speakers, agenda, venue, registration | `Event` |
| `map` | — | Map pins with locations and descriptions | `Place` |
| `itinerary` | — | Travel/schedule planning with stops and timing | — |

**Audience:** Travel bloggers, city guide creators, event organisers, tourism sites, conference sites. Future candidates for this package: `accommodation` (hotel/Airbnb card with amenities), `venue` (restaurant or bar with hours and atmosphere).

### `@refrakt-md/business` (5 runes)

Professional and organisational content. Company sites, agency portfolios, nonprofit pages, careers pages.

| Rune | Aliases | Purpose | Schema.org |
|---|---|---|---|
| `cast` | `team` | People entries with roles and photos | `Person` |
| `organization` | `business` | Organization with logo, links, profiles | `Organization` |
| `timeline` | — | Dated milestones with descriptions | `ItemList` |
| `partner` | `client` | Logo grid of partners, clients, or investors with optional links | — |
| `job` | `posting` | Job listing with title, department, location, type, requirements | `JobPosting` |

**Audience:** Company about pages, agency portfolios, nonprofit sites, startup pitch sites, careers pages, investor relations. Team page, company history, partner logos, job listings.

### `@refrakt-md/design` (5 runes)

Design systems and component libraries. For teams documenting their visual language.

| Rune | Aliases | Purpose |
|---|---|---|
| `swatch` | — | Inline color chip |
| `palette` | — | Color system with groups and scales |
| `typography` | — | Font specimens with weights |
| `spacing` | — | Spacing, radius, and shadow tokens |
| `preview` | `showcase` | Component preview with theme toggle, viewport simulation, source view |

### `@refrakt-md/media` (6 runes)

Time-based media content: music, podcasts, audiobooks, video, talks. Covers both metadata (describing media that lives on external platforms) and playback (embedding self-hosted media). `embed` in core handles third-party player widgets (YouTube, Spotify embeds). This package handles everything else.

**Metadata runes** — describe media with structured cards and schema.org output:

| Rune | Purpose | Schema.org (varies by `type` attribute) |
|---|---|---|
| `track` | Single media item — song, podcast episode, audiobook chapter, talk | `MusicRecording` / `PodcastEpisode` / `AudioObject` / `VideoObject` |
| `playlist` | Ordered collection — album tracklist, podcast feed, video series, audiobook | `MusicPlaylist` / `PodcastSeries` / `ItemList` |
| `album` | Grouped release — music album, podcast season, video season, lecture series | `MusicAlbum` / `PodcastSeason` / `TVSeason` |
| `artist` | Creator profile — musician, podcaster, narrator, filmmaker, speaker | `MusicGroup` / `Person` |

The `type` attribute on `track`, `playlist`, and `album` determines which schema.org type is generated and which attributes the AI suggests. A `track` with `type="episode"` generates `PodcastEpisode` schema and expects show, season, and episode number. The same rune with `type="song"` generates `MusicRecording` and expects artist and album.

**Player runes** — embed self-hosted media directly in the page:

| Rune | Purpose | Schema.org |
|---|---|---|
| `video` | Self-hosted video with poster image, captions, subtitles, responsive sizing | `VideoObject` |
| `audio` | Self-hosted audio with waveform visualization, chapters, transcript | `AudioObject` |

The distinction: you *reference* a track (metadata card with links to where you listen), you *play* a video or audio (embedded player in the page).

**Audience:** Band and artist sites, podcast sites, audiobook publishers, video creators, conference talk archives, record label catalogues, film portfolios, sound design showcases, DJ mix archives.

### Summary

| Package | Runes | Audience |
|---|---|---|
| **Core** (built-in) | ~30 | Everyone |
| `@refrakt-md/marketing` | 8 | Marketing sites, product pages |
| `@refrakt-md/docs` | 3 | Developer documentation |
| `@refrakt-md/learning` | 8 | Courses, tutorials, training materials |
| `@refrakt-md/storytelling` | 7 | Writers, game masters, worldbuilders |
| `@refrakt-md/places` | 3 | Travel, events, local guides |
| `@refrakt-md/business` | 5 | Company sites, agency portfolios |
| `@refrakt-md/design` | 5 | Design systems, component libraries |
| `@refrakt-md/media` | 6 | Music, podcasts, video, audio content |
| **Total** | **~75** | |

---

## Package Structure

A community rune package is a standard npm package with a defined structure:

```
@refrakt-community/dnd-5e/
  package.json
  index.ts              ← rune registration and exports
  runes/
    item.ts             ← rune transform for {% item %}
    item.schema.ts      ← attribute validation schema
    stat-block.ts       ← rune transform for {% stat-block %}
    stat-block.schema.ts
    spell.ts
    spell.schema.ts
    encounter.ts
    encounter.schema.ts
  theme/
    dnd-5e.config.ts    ← identity transform config for all runes
    dnd-5e.css          ← default visual styling
    assets/
      icons/            ← SVG icons (damage types, schools of magic, etc.)
  behaviors/
    initiative.ts       ← interactive behaviors (encounter tracker, dice roller)
  fixtures/
    item.md             ← inspector fixtures for each rune
    stat-block.md
    spell.md
    encounter.md
  prompt/                ← optional: for third-party chat products
    rune-descriptions.md ← AI prompt descriptions for third-party chat integration
  README.md
```

### Registration

The package exports a registration function that the refrakt.md pipeline calls:

```typescript
// index.ts
import type { RunePackage } from '@refrakt-md/types';

import { itemTransform, itemSchema } from './runes/item';
import { statBlockTransform, statBlockSchema } from './runes/stat-block';
import { spellTransform, spellSchema } from './runes/spell';
import { encounterTransform, encounterSchema } from './runes/encounter';
import { themeConfig } from './theme/dnd-5e.config';
import { behaviors } from './behaviors';

export const dnd5e: RunePackage = {
  name: 'dnd-5e',
  displayName: 'D&D 5th Edition',
  version: '1.0.0',
  
  runes: {
    'item': {
      transform: itemTransform,
      schema: itemSchema,
    },
    'stat-block': {
      transform: statBlockTransform,
      schema: statBlockSchema,
    },
    'spell': {
      transform: spellTransform,
      schema: spellSchema,
    },
    'encounter': {
      transform: encounterTransform,
      schema: encounterSchema,
    },
  },

  // Extensions to core runes (does not replace them)
  extends: {
    'character': {
      schema: {
        class: { type: 'string' },
        level: { type: 'number' },
        race: { type: 'string' },
        hp: { type: 'number' },
      }
    }
  },
  
  theme: themeConfig,
  behaviors,
};
```

### Installation

```bash
npm install @refrakt-community/dnd-5e
```

Then register in the project config:

```json
{
  "packages": ["@refrakt-community/dnd-5e"]
}
```

The pipeline discovers the package, registers its runes, merges schema extensions, loads its theme config and behaviors, and makes its fixtures available to the inspector.

---

## Namespacing

### Markdoc Parser Constraint

Markdoc's parser uses the dot (`.`) character for class shorthand syntax (`{% .my-class %}` equals `{% class="my-class" %}`), and for variable access (`$markdoc.frontmatter.title`). This means dots cannot appear in tag names — `{% dnd-5e.item %}` would be parsed as tag `dnd-5e` with class `item`, not as a namespaced rune.

This constraint shapes the namespacing design: **collision resolution happens in project config, not in Markdoc syntax.** Authors always write clean, unqualified rune names in their content. The project config determines which package provides each rune.

### Resolution Order

When the pipeline encounters a rune tag, it resolves the name in this order:

```
1. Local runes      (project-level, highest priority)
2. Community runes  (installed packages)
3. Core runes       (built-in, lowest priority)
```

Local runes override everything — the project author is explicitly saying "I want my own version." A build warning alerts them to the shadow.

### No Collision (Common Case)

Most projects install one community package per domain. The runes it defines don't collide with core runes or each other. Authors write short names with no prefix:

```markdoc
{% item name="Resonance Staff" rarity="legendary" %}
...
{% /item %}

{% character name="Veshra" role="antagonist" class="Warlock" level="12" %}
...
{% /character %}
```

`{% item %}` resolves to `dnd-5e:item` because it's the only package defining that rune. `{% character %}` resolves to the core character rune, extended with 5e attributes. No disambiguation needed.

### Collision (Edge Case)

If two packages define the same rune name, the build fails with a clear error:

```
Error: Rune name 'item' is ambiguous.
  Found in: @refrakt-community/dnd-5e, @refrakt-community/pathfinder-2e
  
  Resolve by setting a preference in refrakt.config.json:
  
    "runes": {
      "prefer": {
        "item": "dnd-5e"
      }
    }
```

#### Project-Level Preference (Only Resolution Mechanism)

```json
{
  "packages": [
    "@refrakt-community/dnd-5e",
    "@refrakt-community/pathfinder-2e"
  ],
  "runes": {
    "prefer": {
      "item": "dnd-5e",
      "spell": "dnd-5e"
    }
  }
}
```

Now `{% item %}` resolves to `dnd-5e:item`. The Pathfinder item rune is not available in this project — the preference is exclusive. If an author genuinely needs both packages' versions of the same rune in a single project, they should use local runes to alias one:

```json
{
  "runes": {
    "prefer": {
      "item": "dnd-5e"
    },
    "aliases": {
      "pf-item": "pathfinder-2e:item"
    }
  }
}
```

Now `{% item %}` is the D&D version and `{% pf-item %}` is the Pathfinder version. The alias creates a new short name that maps to a specific package's rune. The aliased name is a first-class tag name — it works in Markdoc, in the inspector, and in theme selectors.

This keeps the Markdoc content clean:

```markdoc
{% item name="Longsword +1" %}
...
{% /item %}

{% pf-item name="Longsword +1" %}
...
{% /pf-item %}
```

No dots, no special syntax, no parser modifications. Just short names resolved by config.

### Internal Qualified Identifiers

Every rune has an internal fully qualified name used by the pipeline, inspector, schema generation, and error messages:

```
core:callout
core:character
core:realm
dnd-5e:item
dnd-5e:stat-block
pathfinder-2e:item
local:pricing-calculator
```

The colon separator is used only internally — it never appears in Markdoc content. Authors never write these identifiers. They exist for tooling, error messages, and config references (like the `aliases` map above).

The inspector uses them in output:

```
$ refrakt inspect item --theme=dnd-beyond

Rune: dnd-5e:item (resolved from 'item')
...
```

---

## Extending Core Runes

Community packages can extend core runes without replacing them. Extensions are additive — they add attributes, identity transform structure, and AI prompt suggestions. They never modify the core rune's transform code.

### Extension Mechanism

Extension operates on three layers, none of which touch core rune transform code:

| Layer | What it does | Mechanism |
|---|---|---|
| Schema | Adds valid attributes | Config merge at registration |
| Identity | Uses new attributes in HTML output | ThemeConfig extension |
| AI prompt | Suggests new sections and vocabulary | Prompt layer addition |

### Schema Extension

The core character schema says "name is required, role is optional." The 5e package adds additional attributes:

```typescript
// In package registration
extends: {
  'character': {
    schema: {
      class: { type: 'string' },
      level: { type: 'number' },
      race: { type: 'string' },
      hp: { type: 'number' },
      ac: { type: 'number' },
      alignment: { type: 'string' },
    }
  }
}
```

At registration time, the schemas are merged. The core transform runs exactly as before — it produces the same AST node with the same typeof and meta. Extra attributes pass through as data on the node. The core transform doesn't reject unknown attributes.

### Identity Transform Extension

The community package provides ThemeConfig entries that use the extended attributes:

```typescript
// dnd-5e.config.ts — extending character identity transform
character: {
  modifiers: {
    class: { source: 'attribute' },
    level: { source: 'attribute' },
  },
  structure: {
    statsBar: {
      tag: 'div',
      ref: 'stats-bar',
      before: true,
      condition: 'class',
      children: [
        { tag: 'span', ref: 'class-badge', metaText: 'class' },
        { tag: 'span', ref: 'level-badge', metaText: 'level', textPrefix: 'Lvl ' },
        { tag: 'span', ref: 'race-badge', metaText: 'race', condition: 'race' },
      ]
    },
    hpBar: {
      tag: 'div',
      ref: 'hp-bar',
      condition: 'hp',
      attrs: {
        'data-hp': { fromModifier: 'hp' },
        'data-ac': { fromModifier: 'ac' },
      }
    }
  }
}
```

A character with `class="Warlock" level="12"` gets a stats bar with class and level badges. A character without those attributes renders exactly as the core defines — the condition checks skip the injection.

The identity transform merges the community config with the core config for that rune. Community additions are appended, never replacing core structure:

```
Core config:       block, modifiers, contentWrapper
+ Community config: additional modifiers, additional structure
= Merged config:   everything, community additions layered on top
```

### AI Prompt Extension

The community package provides additional rune descriptions for the chat AI:

```markdown
<!-- prompt/rune-descriptions.md -->

When the dnd-5e package is installed:

For {% character %}, also consider these sections:
- **Stats** — Ability scores (STR, DEX, CON, INT, WIS, CHA)
- **Class Features** — Abilities from their class and level
- **Equipment** — Items they carry (can reference {% item %} runes)
- **Spells Known** — For spellcasters (can reference {% spell %} runes)

Use the `class`, `level`, `race`, `hp`, and `ac` attributes when 
the character is a game-playable entity with mechanical stats.
Omit them for narrative-only characters.
```

These additions are appended to the character rune's description in the mode prompt. The AI knows to generate Stats and Class Features sections when appropriate and to use the extended attributes.

### What Extension Cannot Do

- **Modify core transform logic** — the core rune transform is untouched
- **Remove core attributes** — extensions only add, never subtract
- **Override core identity config** — community structure is appended, not merged destructively
- **Change core rendering** — the base rendering of the rune is unchanged; extensions add to it

The core rune is closed for modification and open for extension, through configuration rather than code inheritance.

---

## Theme Integration

Community packages can include theme contributions at two levels:

### Default Theme

A minimal CSS file that makes the package's runes look acceptable with any theme. Provides basic layout and structure without strong aesthetic opinions:

```
theme/
  dnd-5e.css          ← structural styling for stat blocks, item cards, etc.
```

This CSS uses the design token custom properties so it adapts to whatever theme the project uses. Blue accent tokens in a corporate theme, parchment tones in a fantasy theme — the community rune's default styling follows the active design tokens.

### Theme Packs

Separate packages that provide opinionated styling for community runes within a specific aesthetic:

```
@refrakt-community/theme-dndbeyond-style/
  theme.config.ts    ← identity config targeting core + dnd-5e BEM classes
  theme.css          ← full visual styling
  assets/            ← icons, decorative SVGs
```

A theme pack can target both core runes and community runes in a single package. A "D&D Beyond-style" theme styles character cards, realm cards, and faction cards (core) alongside stat blocks, item cards, and spell cards (community) in a cohesive visual language.

### Inspector Integration

The inspector automatically discovers community rune fixtures and includes them in audits:

```bash
$ refrakt inspect --all --theme=dnd-beyond --audit

  CORE RUNES
  callout          8/8   selectors   ✓ complete
  character        15/18 selectors   ⚠ 3 unstyled (dnd-5e extensions)
  ...

  COMMUNITY RUNES (dnd-5e)
  item             12/12 selectors   ✓ complete
  stat-block       20/20 selectors   ✓ complete
  spell            9/14  selectors   ⚠ 5 unstyled
  encounter        0/16  selectors   ✗ not started
```

The audit distinguishes between core and community rune coverage and identifies which unstyled selectors come from community extensions to core runes.

---

## Behavior Integration

Community packages can register additional behaviors for the vanilla JS behavior library:

```typescript
// behaviors/index.ts
import type { BehaviorRegistry } from '@refrakt-md/behaviors';

export const behaviors: BehaviorRegistry = {
  'encounter': (el) => {
    // Initiative tracker, round counter
    const tracker = el.querySelector('[data-name="initiative"]');
    // ... wire up interactive encounter management
  },
  'spell': (el) => {
    // Spell slot tracker, concentration indicator
    // ...
  },
};
```

These behaviors are registered alongside the base behaviors at startup. The same detection mechanism applies — if a theme has injected Alpine or Stimulus attributes for these runes, the community behaviors step aside.

---

## Product Boundaries

### The refrakt.md Chat — Core Runes Only

The refrakt.md chat product (chat.refrakt.md) supports core runes exclusively. It does not load, render, or generate community rune content. This is a deliberate product decision, not a technical limitation.

The chat is a curated experience. Every rune the AI can generate has been tested for prompt reliability, rendering quality, and user experience. The mode prompts are tuned to specific rune vocabularies. The rendering pipeline in the chat is optimised for the known set of core runes. Opening this to arbitrary community packages would introduce untested prompt interactions, rendering edge cases, and quality variance that undermines the product.

Community runes live in the project system and site editor, where content is authored manually or imported — not generated by AI in real-time.

### The Site Editor & Project System — All Tiers

The site editor and project system support all three rune tiers: core, community, and local. A refrakt.md project can install any combination of community packages. The rendering pipeline handles them identically. The inspector, audit, and theme tooling work across all tiers.

Content flows one direction: from the chat (core runes) into the site editor (all runes). A user builds a story bible with core storytelling runes in the chat, imports it into the editor, then enriches it with community runes (D&D stat blocks, items, spells) in the editor using Markdoc directly.

### Third-Party Chat Products

If a domain community wants an AI-driven chat experience with their community runes — a D&D worldbuilding assistant that generates stat blocks and encounters, a screenwriting tool that generates scenes and dialogue — they build that themselves as a separate product.

The refrakt.md rendering pipeline, identity transform, theme system, and base layer are all available as infrastructure. A third party can build their own chat product using:

- `@refrakt-md/transform` — the rune and identity transform pipeline
- `@refrakt-md/behaviors` — the vanilla JS behavior library
- `@refrakt-md/base` — base config and structural CSS
- Their own community rune package — domain-specific transforms
- Their own AI prompts — tuned to their rune vocabulary and domain

The refrakt.md chat is the reference implementation that demonstrates what's possible. Third parties build domain-specific chat experiences on the same foundation, with their own quality control over prompt engineering and rune generation.

This is a stronger ecosystem play than opening the chat to arbitrary packages. Every third-party chat product built on refrakt.md infrastructure validates the platform and expands the ecosystem without diluting the quality of the core product.

---

## Publishing

### Package Requirements

A community rune package must include:

| Requirement | Purpose |
|---|---|
| Rune transforms | The actual content transforms |
| Attribute schemas | Validation for each rune's attributes |
| Inspector fixtures | Sample content for every rune with all variants |
| Default theme CSS | Minimal styling that works with any theme |
| README | Documentation, usage examples, attribute reference |

Optional but recommended:

| Optional | Purpose |
|---|---|
| Behaviors | Interactive features for the runes |
| Theme config | Identity transform structural additions |
| Core extensions | Schema and identity additions for core runes |
| Prompt descriptions | AI rune descriptions for third-party chat products building on the refrakt.md pipeline |

### Naming Convention

```
@refrakt-community/[domain]          ← rune packages
@refrakt-community/theme-[name]      ← theme packages
```

Examples:
- `@refrakt-community/dnd-5e`
- `@refrakt-community/pathfinder-2e`
- `@refrakt-community/screenplay`
- `@refrakt-community/music-theory`
- `@refrakt-community/recipe-extended`
- `@refrakt-community/theme-dndbeyond-style`
- `@refrakt-community/theme-parchment`
- `@refrakt-community/theme-cyberpunk`

### Validation

Before publishing, packages should pass:

```bash
# Validate package structure and requirements
refrakt package validate

# Run inspector tests against all fixtures
refrakt inspect --all --package=. --test

# Audit default theme coverage
refrakt inspect --all --package=. --audit
```

The `refrakt package validate` command checks for required files, valid schemas, correct export structure, and fixture coverage.

---

## Example: D&D 5e Package

### Runes Provided

| Rune | Purpose |
|---|---|
| `{% item %}` | Magic items and equipment with stats, rarity, properties |
| `{% stat-block %}` | Creature/NPC stat blocks with abilities, actions, legendary actions |
| `{% spell %}` | Spell cards with level, school, components, duration, description |
| `{% encounter %}` | Combat scenarios with enemies, terrain, tactics, difficulty |
| `{% class-feature %}` | Class and subclass abilities with level requirements |

### Core Extensions

| Core Rune | Added Attributes | Added Sections |
|---|---|---|
| `{% character %}` | class, level, race, hp, ac, alignment | Stats, Class Features, Equipment, Spells Known |
| `{% realm %}` | difficulty, encounter-table | Encounters, Treasure, Traps |
| `{% faction %}` | base-of-operations, ally-dc, enemy-dc | NPC Roster, Quest Hooks |
| `{% lore %}` | dc (knowledge check DC) | — |

### Sample Usage

```markdoc
{% character name="Veshra" role="antagonist" class="Warlock" level="14" 
   race="Human" hp="87" ac="15" alignment="Neutral Evil" %}

![Ancient woman, white hair, dark robes, bone staff](/images/veshra.png)

## Overview
High priestess of the Waking Choir and warlock of the Sleeper.

## Stats
| STR | DEX | CON | INT | WIS | CHA |
|-----|-----|-----|-----|-----|-----|
| 8   | 12  | 14  | 16  | 18  | 20  |

## Class Features
- **Pact of the Old One** — her patron is the Sleeper itself
- **Resonance Conduit** — can channel the Sleeper's heartbeat as thunder damage
- **Tremor Sense** — 60ft, always active near the Sleeper's body

## Equipment
- {% item name="Resonance Staff" /%} (attuned)
- Robes of the Choir (no mechanical benefit)
- Component pouch

## Spells Known
- {% spell name="Eldritch Blast" /%}
- {% spell name="Thunder Step" /%}
- {% spell name="Earthquake" /%} (1/day, Sleeper patron gift)

{% /character %}
```

The character rune is the core rune, extended with 5e attributes and sections. The `{% item %}` and `{% spell %}` references are community runes that can render as inline links or compact cards depending on the context.

---

## Example: Screenplay Package

### Runes Provided

| Rune | Purpose |
|---|---|
| `{% scene %}` | Scene heading with INT/EXT, location, time of day |
| `{% dialogue %}` | Character dialogue with parentheticals and cues |
| `{% action %}` | Action/description lines in screenplay format |
| `{% transition %}` | Scene transitions (CUT TO, FADE IN, DISSOLVE) |
| `{% montage %}` | Montage sequence with individual shots |

### Core Extensions

| Core Rune | Added Attributes | Added Sections |
|---|---|---|
| `{% character %}` | first-appearance (scene number) | Voice, Physicality, Casting Notes |
| `{% realm %}` | set-requirements | Production Notes, Shooting Location |
| `{% plot %}` | format=`"episode"` added to type options | — |

This demonstrates that the community package system serves domains far beyond gaming — any structured content domain with shared conventions can benefit.

---

## Ecosystem Vision

```
refrakt.md products (controlled experience)
├── Chat product (chat.refrakt.md)
│   └── Core runes only — curated AI experience
├── Site editor
│   └── Core + official + community + local runes — full authoring
└── Published sites
    └── Core + official + community + local runes — full rendering

refrakt.md infrastructure (available to all)
├── @refrakt-md/transform    ← rune + identity transform pipeline
├── @refrakt-md/behaviors    ← vanilla JS behavior library
├── @refrakt-md/base         ← base config + structural CSS
├── @refrakt-md/cli          ← inspector, audit, scaffold tooling
└── Theme system             ← identity transform, BEM contract

Official packages (maintained by refrakt.md team)
├── @refrakt-md/marketing       ← hero, cta, bento, feature, steps, pricing, testimonial, comparison
├── @refrakt-md/docs            ← api, symbol, changelog
├── @refrakt-md/learning        ← howto, recipe, concept, exercise, quiz, glossary, prerequisite, objective
├── @refrakt-md/storytelling    ← character, realm, faction, lore, plot, bond, storyboard
├── @refrakt-md/places          ← event, map, itinerary
├── @refrakt-md/business        ← cast, organization, timeline, partner, job
├── @refrakt-md/design          ← swatch, palette, typography, spacing, preview
└── @refrakt-md/media           ← track, playlist, album, artist, video, audio

Community packages (npm ecosystem)
├── Domain rune sets (dnd-5e, pathfinder-2e, screenplay, music-theory, ...)
├── Theme packs (dndbeyond-style, parchment, cyberpunk, ...)
├── Rune + theme bundles (complete domain experiences)
└── Core/official extensions (enriching built-in runes per domain)

Third-party products (built on refrakt.md infrastructure)
├── Domain-specific chat products (D&D worldbuilder, screenwriting assistant, ...)
├── Custom editors and tools
└── Specialised publishing platforms

Local runes (per-project)
└── Custom one-off runes for specific project needs
```

The refrakt.md chat demonstrates what's possible with AI-driven rune generation. The infrastructure makes it possible for anyone to build on the same foundation. Official packages provide curated domain rune sets maintained to the same quality standard as core. Community packages extend the ecosystem into domains that the refrakt.md team doesn't serve directly. Third-party products build independent experiences on the shared infrastructure.

The core provides the foundation. Official packages cover the common domains. The community builds everything else.

{% /spec %}
