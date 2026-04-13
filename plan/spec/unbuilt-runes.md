{% spec id="SPEC-008" status="review" tags="runes" %}

# Unbuilt Runes — High-Level Spec

Runes listed in `plan/spec/community-runes.md` that do not yet have schemas in `packages/runes/src/tags/`

---

## Overview

17 runes are referenced in the community runes spec that have no implementation. This document defines each rune's purpose, attributes, content model, and target package so they can be built out incrementally.

Conventions follow existing rune patterns:
- Attributes are declared via `@attribute` decorators on the Model class
- Content is reinterpreted using `@group` decorators to split header/body sections
- Output uses `createComponentRenderable` with properties (meta tags) and refs (structural elements)
- Schema.org extractors are added when a matching type exists

---

## Core Runes (3)

These are universal primitives that belong in the built-in core, not in a package.

### `gallery`

**Purpose:** Multi-image container with grid, carousel, or masonry layout and optional lightbox overlay.

**Aliases:** —

**Attributes:**

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `layout` | String | `'grid'` | No | Display mode: `grid`, `carousel`, `masonry` |
| `columns` | Number | `3` | No | Grid column count (grid/masonry only) |
| `lightbox` | Boolean | `true` | No | Enable click-to-enlarge overlay |
| `gap` | String | `'md'` | No | Spacing between items: `sm`, `md`, `lg` |
| `caption` | String | — | No | Gallery-level caption |

**Content model:**
- Images (`![alt](src)`) become gallery items
- Image alt text becomes the item caption
- Paragraphs of text between images are ignored (or treated as section breaks in masonry)
- Headings become gallery section titles (for grouped galleries)

**Transform output:**
- typeof: `Gallery`
- Tag: `<figure>`
- Properties: `layout`, `columns`, `lightbox`, `gap`, `caption`
- Refs: `items` (list of figure elements), `caption` (figcaption)

**Behavior:** Carousel mode needs JS for navigation (prev/next, swipe). Lightbox needs JS for overlay. Both are `@refrakt-md/behaviors` candidates.

---

### `stat`

**Purpose:** Key metric display — a prominent number with label and optional trend indicator. Used for dashboards, KPI sections, and data highlights.

**Aliases:** `metric`

**Attributes:**

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `value` | String | — | Yes | The metric value (e.g., `"99.9%"`, `"$4.2M"`, `"1,247"`) |
| `label` | String | — | Yes | What the metric measures |
| `trend` | String | — | No | Trend direction: `up`, `down`, `flat` |
| `change` | String | — | No | Change amount (e.g., `"+12%"`, `"-3 pts"`) |
| `icon` | String | — | No | Icon name from theme icon registry |

**Content model:**
- Self-closing or minimal content. Most data comes from attributes.
- Optional paragraph child becomes a description/context line.

**Transform output:**
- typeof: `Stat`
- Tag: `<div>`
- Properties: `value` (span), `label` (span), `trend`, `change` (span), `icon`
- Refs: `description` (p, if content provided)

**Identity transform:** Mostly declarative — modifiers for `trend`, structure injection for value/label/change display. No JS needed.

---

### `math`

**Purpose:** Mathematical notation rendered from LaTeX/KaTeX syntax. Supports both inline and block (display) mode.

**Aliases:** `equation`, `formula`

**Attributes:**

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `display` | Boolean | `true` | No | Block display mode (centered, full-width) vs inline |
| `label` | String | — | No | Equation label for cross-referencing |

**Content model:**
- The text content inside the tag is treated as raw LaTeX/KaTeX source — not parsed as Markdown.
- Similar to how `{% diagram %}` treats content as Mermaid source.

**Transform output:**
- typeof: `Math`
- Tag: `<div>` (display) or `<span>` (inline)
- Properties: `source` (the raw LaTeX string), `label`
- The actual rendering (LaTeX → MathML/SVG) happens either at build time (preferred, via a KaTeX transform similar to Shiki for code) or at runtime via a behavior/web component.

**Implementation note:** Rendering strategy mirrors the Diagram rune — either a build-time transform (like `@refrakt-md/highlight` does for code blocks) or a web component that initializes from the source attribute. Build-time is preferred for performance and SSR.

---

## @refrakt-md/learning (6)

Educational and instructional content. These compose within a lesson page: objective at the top, concept runes introduce terminology, howto/recipe teach procedures, exercise provides practice, quiz tests retention.

### `concept`

**Purpose:** Term definition with explanation, examples, and related concepts. The building block for glossaries and knowledge bases.

**Aliases:** `definition`

**Schema.org:** `DefinedTerm`

**Attributes:**

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `term` | String | — | Yes | The term being defined |
| `id` | String | — | No | Unique identifier for cross-referencing (auto-derived from `term` if omitted) |

**Content model:**
- First paragraph → the definition
- `## Examples` heading → examples section
- `## Related` heading → list of related term references
- Other headings → additional sections (etymology, usage notes, etc.)

**Transform output:**
- typeof: `Concept`
- Tag: `<article>`
- Properties: `term` (dt), `id`
- Refs: `definition` (dd), `examples` (div), `related` (ul of links)

**Glossary integration:** The `glossary` rune (below) collects all `concept` definitions and the build pipeline auto-links term occurrences across the site.

---

### `exercise`

**Purpose:** Practice problem with a prompt, optional hints, and a revealable solution. Encourages active learning.

**Aliases:** —

**Attributes:**

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `difficulty` | String | `'medium'` | No | `easy`, `medium`, `hard` |
| `points` | Number | — | No | Point value (for graded contexts) |
| `type` | String | `'open'` | No | `open` (free response), `code` (expects code), `multiple-choice` |

**Content model:**
- First paragraph/section → the problem prompt
- `## Hints` or `## Hint` heading → progressive hints (each child is one hint, revealed sequentially)
- `## Solution` heading → the solution (hidden by default, revealed on click)
- Code fences in the solution section get syntax highlighting

**Transform output:**
- typeof: `Exercise`
- Tag: `<article>`
- Properties: `difficulty`, `points`, `type`
- Refs: `prompt` (div), `hints` (ol, each li is a hint), `solution` (div, initially hidden)

**Behavior:** Hint revelation (show one at a time) and solution toggle. Candidate for `@refrakt-md/behaviors`.

---

### `quiz`

**Purpose:** Assessment with multiple questions, answer options, and scoring. Supports multiple-choice, true/false, and fill-in-the-blank.

**Aliases:** —

**Schema.org:** `Quiz`

**Attributes:**

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `title` | String | — | No | Quiz title |
| `passingScore` | Number | — | No | Minimum score to pass (percentage) |
| `shuffle` | Boolean | `false` | No | Randomize question order |

**Content model:**
- Each `##` heading → a question
- Unordered list under a question → answer options
- List items starting with `*` or marked with `[x]` → correct answer(s)
- Blockquotes under a question → explanation shown after answering
- Paragraphs → question context

Example:
```markdoc
{% quiz title="Module 1 Assessment" passingScore=70 %}

## What does the identity transform produce?

- [ ] React components
- [x] BEM-classed HTML elements
- [ ] Raw Markdown
- [ ] JSON data

> The identity transform adds BEM classes, data attributes, and structural elements to produce framework-agnostic HTML.

## True or false: Runes modify the Markdoc parser.

- [ ] True
- [x] False

> Runes work within the standard Markdoc tag system. They reinterpret Markdown children, not the parser itself.

{% /quiz %}
```

**Transform output:**
- typeof: `Quiz`
- Tag: `<form>`
- Properties: `title`, `passingScore`, `shuffle`
- Refs: `questions` (ol), each containing `prompt`, `options` (ul of radio/checkbox inputs), `explanation` (blockquote)

**Behavior:** Interactive form with score calculation, answer checking, and result display. Significant JS — likely a web component or full behavior.

---

### `glossary`

**Purpose:** Collection of terms with definitions, rendered as a navigable index. At build time, auto-links term occurrences across the site.

**Aliases:** —

**Schema.org:** `DefinedTermSet`

**Attributes:**

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `autoLink` | Boolean | `true` | No | Enable site-wide auto-linking of terms |
| `groupBy` | String | `'letter'` | No | Grouping: `letter` (alphabetical), `category`, `none` |

**Content model:**
- Child `{% concept %}` runes → individual terms
- Or: definition list (`term\n: definition`) syntax → auto-converted to concept entries
- Headings → category group labels (when `groupBy="category"`)

**Transform output:**
- typeof: `Glossary`
- Tag: `<section>`
- Properties: `autoLink`, `groupBy`
- Refs: `terms` (dl or grouped divs), `index` (alphabetical jump links)

**Implementation note:** The auto-linking feature requires build pipeline integration beyond standard rune transforms. During the content build, the pipeline collects all glossary terms and rewrites matching text nodes across other pages into links. This is similar to how `toc` collects headings — but cross-page. This should be implemented as a post-build pass in `@refrakt-md/content`.

---

### `prerequisite`

**Purpose:** Declares dependencies between content pages. "Complete X before starting this lesson." Themes can render these as a learning path or dependency graph.

**Aliases:** —

**Attributes:**

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `path` | String | — | Yes | Path to the prerequisite page (relative URL) |
| `label` | String | — | No | Display label (defaults to the target page's title) |
| `required` | Boolean | `true` | No | Whether this is a hard requirement or a recommendation |

**Content model:**
- Self-closing tag (no children). All data comes from attributes.
- Multiple `{% prerequisite %}` tags can appear on a page.

**Transform output:**
- typeof: `Prerequisite`
- Tag: `<a>` or `<div>`
- Properties: `path`, `label`, `required`

**Implementation note:** Like `glossary`, the full power of this rune comes from cross-page awareness at build time. The content pipeline collects all prerequisite declarations and builds a dependency graph. Themes can render this as a progress tracker, learning path visualization, or simple prerequisite list. The rune itself is simple — the complexity is in the build pipeline integration.

---

### `objective`

**Purpose:** Learning outcome statement. "After this lesson, you will be able to..." Typically placed at the top of a lesson page.

**Aliases:** `learning-outcome`

**Attributes:**

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `verb` | String | — | No | Bloom's taxonomy verb (e.g., `understand`, `apply`, `analyze`) — used for metadata, not rendering |

**Content model:**
- Unordered list → individual learning objectives
- Paragraphs → introductory context

Example:
```markdoc
{% objective %}
After completing this lesson, you will be able to:

- Explain the difference between core and community runes
- Install and configure a community rune package
- Write a custom local rune for your project
{% /objective %}
```

**Transform output:**
- typeof: `Objective`
- Tag: `<aside>` (semantic — this is supplementary info about the lesson)
- Properties: `verb`
- Refs: `objectives` (ul)

**Identity transform:** Declarative — block, optional icon injection (target/goal icon), content wrapper.

---

## @refrakt-md/business (2)

### `partner`

**Purpose:** Logo grid of partners, clients, investors, or sponsors with optional links. Common on company about pages and landing pages.

**Aliases:** `client`

**Attributes:**

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `layout` | String | `'grid'` | No | `grid` (fixed columns) or `marquee` (scrolling) |
| `columns` | Number | `4` | No | Grid column count |
| `grayscale` | Boolean | `true` | No | Display logos in grayscale (color on hover) |

**Content model:**
- Images → partner logos. Alt text becomes the partner name.
- Links wrapping images → partner logos with clickthrough URLs.
- Headings → section titles (for grouping: "Platinum Sponsors", "Gold Sponsors")
- Header group: heading + paragraph → section eyebrow/headline/blurb

Example:
```markdoc
{% partner columns=5 %}

## Our Partners

[![Acme Corp](/logos/acme.svg)](https://acme.com)
[![Globex](/logos/globex.svg)](https://globex.com)
[![Initech](/logos/initech.svg)](https://initech.com)

{% /partner %}
```

**Transform output:**
- typeof: `Partner`
- Tag: `<section>` with `property: 'contentSection'`
- Properties: `eyebrow`, `headline`, `blurb`, `layout`, `columns`, `grayscale`
- Refs: `logos` (ul of li elements, each containing an img or a>img)

---

### `job`

**Purpose:** Job listing with structured metadata. For careers pages and job boards.

**Aliases:** `posting`

**Schema.org:** `JobPosting`

**Attributes:**

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `title` | String | — | Yes | Job title |
| `department` | String | — | No | Department or team |
| `location` | String | — | No | Location (e.g., "Remote", "San Francisco, CA") |
| `type` | String | `'full-time'` | No | `full-time`, `part-time`, `contract`, `internship` |
| `salary` | String | — | No | Salary range (e.g., "$120k–$160k") |
| `applyUrl` | String | — | No | Application URL |
| `posted` | String | — | No | Date posted (ISO 8601) |

**Content model:**
- First paragraph → job summary/description
- `## Responsibilities` or `## What You'll Do` heading → responsibilities list
- `## Requirements` or `## Qualifications` heading → requirements list
- `## Nice to Have` or `## Preferred` heading → preferred qualifications list
- `## Benefits` heading → benefits list

**Transform output:**
- typeof: `Job`
- Tag: `<article>`
- Properties: `title` (h-element), `department` (span), `location` (span), `type`, `salary` (span), `applyUrl`, `posted`
- Refs: `description` (div), `responsibilities` (ul), `requirements` (ul), `preferred` (ul), `benefits` (ul), `applyButton` (a)

**SEO extractor:** Generates `schema.org/JobPosting` with `title`, `datePosted`, `employmentType`, `jobLocation`, `baseSalary`, `description`.

---

## @refrakt-md/media (6)

Time-based media content. The existing `music-playlist` and `music-recording` runes are music-specific. The spec generalizes them into type-polymorphic runes that handle music, podcasts, audiobooks, video, and talks via a `type` attribute.

### Migration from existing runes

| Existing | New | Attribute changes |
|----------|-----|-------------------|
| `music-recording` | `track` with `type="song"` | `byArtist` → `artist`, `copyrightYear` → `year`. `listItem` stays. |
| `music-playlist` | `playlist` with `type="album"` | Remove `trackFields`, `split`, `mirror`. Add `artist`. `audio` stays. |

The existing runes continue to work as aliases during the transition period. New content should use `track` and `playlist`.

### Design notes: compact list syntax

Playlists support two ways to define tracks:

1. **Explicit tags** — `{% track artist="Queen" duration="PT5M55S" %}` for full control
2. **Compact list syntax** — pipe-delimited list items parsed into track attributes

The compact syntax uses the playlist's `type` to determine field order. The **first pipe segment is always the track name**; subsequent segments are type-dependent:

| Type | Pipe order after name | Example |
|------|----------------------|---------|
| `album` (default) | `duration` | `- Bohemian Rhapsody \| PT5M55S` |
| `mix` | `artist, duration` | `- Bohemian Rhapsody \| Queen \| PT5M55S` |
| `podcast` | `duration, date` | `- The Pilot \| PT45M00S \| 2024-01-15` |
| `audiobook` | `duration` | `- Chapter 1 \| PT32M00S` |
| `series` | `duration, date` | `- Episode 1 \| PT22M00S \| 2024-03-01` |

This follows the same pattern as `budget` (hardcoded `description | $amount` regex) and `cast` (hardcoded `name — role` regex) — the rune defines the parsing, not the author. The `type` attribute provides just enough flexibility for different media domains without introducing a novel `fields` configuration convention.

> **Why not `fields`?** The original `music-playlist` had a `trackFields` attribute letting authors declare the pipe-segment mapping. This was unique to one rune, positional (fragile to reorder), and misleadingly named. Type-derived defaults are simpler, discoverable, and consistent with how other runes work. For non-standard field needs, use explicit `{% track %}` child tags with named attributes.

### `track`

**Purpose:** Single media item — a song, podcast episode, audiobook chapter, talk, or video.

**Aliases:** —

**Schema.org:** Varies by `type`: `MusicRecording`, `PodcastEpisode`, `AudioObject`, `VideoObject`

**Attributes:**

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `type` | String | `'song'` | No | `song`, `episode`, `chapter`, `talk`, `video` |
| `artist` | String | — | No | Creator/performer name |
| `album` | String | — | No | Parent collection (album, show, book) |
| `duration` | String | — | No | ISO 8601 duration (e.g., `PT3M45S`) — formatted to `3:45` display |
| `year` | Number | — | No | Release year |
| `number` | Number | — | No | Track/episode/chapter number |
| `url` | String | — | No | Link to the media (streaming service, host platform) |
| `date` | String | — | No | Publication date (ISO 8601, for episodes/series) |
| `listItem` | Boolean | `false` | No | Render as `<li>` instead of `<div>` |

**Content model:**
- Heading → track name/title
- Other children ignored (data comes from attributes)

**Transform output:**
- typeof: `Track`
- Tag: `<div>` or `<li>`
- Properties: `name` (h-element), `artist` (span), `album` (span), `duration` (span, formatted), `year` (span), `number` (span), `url` (a), `date` (span), `type`

**Identity transform:** Declarative — modifiers for `type`, structure injection for metadata display (artist, duration, number). Presence-based conditional display (same pattern as `event`): fields only render when non-empty.

---

### `playlist`

**Purpose:** Ordered collection of tracks — an album tracklist, podcast feed, video series, audiobook table of contents.

**Aliases:** —

**Schema.org:** Varies by `type`: `MusicPlaylist`, `PodcastSeries`, `ItemList`

**Attributes:**

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `type` | String | `'album'` | No | `album`, `podcast`, `audiobook`, `series`, `mix` |
| `artist` | String | — | No | Default artist inherited by all child tracks |
| `audio` | String | — | No | Audio file URL for embedded playback |

**Content model:**
- Header group: heading, paragraphs, images (cover art, description)
- Body: `{% track %}` children **or** list items parsed via compact syntax (pipe-delimited, type-derived field order)
- When `artist` is set on the playlist, parsed list-item tracks inherit it as their default artist

**Examples:**

```markdoc
{% playlist type="album" artist="Pink Floyd" %}
# The Dark Side of the Moon
![Cover](/images/dsotm.jpg)

- Speak to Me | PT1M13S
- Breathe | PT2M43S
- On the Run | PT3M36S
{% /playlist %}
```

```markdoc
{% playlist type="mix" %}
# Road Trip Mix

- Bohemian Rhapsody | Queen | PT5M55S
- Hotel California | Eagles | PT6M30S
- Stairway to Heaven | Led Zeppelin | PT8M02S
{% /playlist %}
```

```markdoc
{% playlist type="podcast" %}
# Tech Weekly
![Podcast Art](/images/techweekly.jpg)

A weekly podcast about emerging technology.

- The AI Revolution | PT45M00S | 2024-01-15
- Quantum Computing 101 | PT38M00S | 2024-01-22
{% /playlist %}
```

**Transform output:**
- typeof: `Playlist`
- Tag: `<section>`
- Properties: `eyebrow`, `headline`, `image`, `blurb`, `type`, `artist` (span)
- Refs: `tracks` (ol of track items)

---

### `album`

**Purpose:** Grouped release — a music album, podcast season, video season, lecture series. Higher-level grouping than playlist.

**Aliases:** —

**Schema.org:** Varies by `type`: `MusicAlbum`, `PodcastSeason`, `TVSeason`

**Attributes:**

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `type` | String | `'music'` | No | `music`, `podcast`, `video`, `lectures` |
| `artist` | String | — | No | Primary creator |
| `year` | Number | — | No | Release year |
| `label` | String | — | No | Record label, network, or publisher |
| `genre` | String | — | No | Genre or category |

**Content model:**
- Header group: heading (album title), paragraph (description), image (cover art)
- Body: `{% playlist %}` or `{% track %}` children, or list items for tracks
- Headings in body → disc/side/part separators

**Transform output:**
- typeof: `Album`
- Tag: `<article>` with `property: 'contentSection'`
- Properties: `eyebrow`, `headline`, `image`, `blurb`, `artist` (span), `year` (span), `label` (span), `genre` (span), `type`
- Refs: `tracklist` (ol or grouped ols)

---

### `artist`

**Purpose:** Creator profile — musician, podcaster, narrator, filmmaker, speaker. Structured biography with discography/body of work.

**Aliases:** —

**Schema.org:** `MusicGroup` or `Person` (based on content)

**Attributes:**

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `name` | String | — | Yes | Artist/creator name |
| `genre` | String | — | No | Primary genre or field |
| `active` | String | — | No | Active years (e.g., `"2015–present"`) |
| `origin` | String | — | No | Location/origin |

**Content model:**
- Header group: heading (name, auto-extracted), image (photo/avatar), paragraphs (bio)
- `## Discography` or `## Works` heading → list of works (links to album/playlist pages)
- `## Links` heading → external links (streaming profiles, website, social)
- Other headings → additional bio sections

**Transform output:**
- typeof: `Artist`
- Tag: `<article>` with `property: 'contentSection'`
- Properties: `eyebrow`, `headline`, `image`, `blurb`, `name`, `genre` (span), `active` (span), `origin` (span)
- Refs: `works` (ul), `links` (ul), `bio` (div)

---

### `video`

**Purpose:** Self-hosted video player with poster image, captions, subtitles, and responsive sizing. For video that you host yourself — use `embed` for YouTube/Vimeo.

**Aliases:** —

**Schema.org:** `VideoObject`

**Attributes:**

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `src` | String | — | Yes | Video file URL |
| `poster` | String | — | No | Poster/thumbnail image URL |
| `captions` | String | — | No | WebVTT captions file URL |
| `subtitles` | String | — | No | WebVTT subtitles file URL (if different from captions) |
| `aspect` | String | `'16:9'` | No | Aspect ratio: `16:9`, `4:3`, `1:1`, `9:16` (vertical) |
| `autoplay` | Boolean | `false` | No | Autoplay (muted) |
| `loop` | Boolean | `false` | No | Loop playback |
| `title` | String | — | No | Video title |
| `duration` | String | — | No | ISO 8601 duration |

**Content model:**
- Paragraph → video description/caption
- Self-closing is common: `{% video src="/video.mp4" poster="/thumb.jpg" /%}`

**Transform output:**
- typeof: `Video`
- Tag: `<figure>`
- Properties: `src`, `poster`, `captions`, `subtitles`, `aspect`, `autoplay`, `loop`, `title`, `duration`
- Refs: `player` (video element), `caption` (figcaption)

**Implementation:** Web component (`rf-video`) similar to the Diagram/Sandbox/Map migration pattern. Handles play controls, caption track loading, and responsive sizing.

---

### `audio`

**Purpose:** Self-hosted audio player with waveform visualization, chapters, and transcript. For podcasts, music, audiobooks, and sound design hosted on your own server.

**Aliases:** —

**Schema.org:** `AudioObject`

**Attributes:**

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `src` | String | — | Yes | Audio file URL |
| `title` | String | — | No | Track title |
| `artist` | String | — | No | Artist/speaker name |
| `duration` | String | — | No | ISO 8601 duration |
| `waveform` | Boolean | `true` | No | Show waveform visualization |
| `chapters` | String | — | No | WebVTT chapters file URL |

**Content model:**
- Paragraph → description/show notes
- Ordered list → chapter markers (if no WebVTT file): `1. 00:00 — Introduction`
- Blockquotes → transcript excerpts

**Transform output:**
- typeof: `Audio`
- Tag: `<figure>`
- Properties: `src`, `title`, `artist` (span), `duration` (span, formatted), `waveform`, `chapters`
- Refs: `player` (audio element), `chapterList` (ol), `transcript` (div), `caption` (figcaption)

**Implementation:** Web component (`rf-audio`). Waveform visualization requires either a pre-computed waveform data file or client-side Web Audio API analysis. Chapter markers sync with playback position.

{% /spec %}
